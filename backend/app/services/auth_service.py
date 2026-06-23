from jose import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import time
import logging
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

# Security scheme helper
security_scheme = HTTPBearer()

class FirebaseAuthService:
    def __init__(self):
        self.project_id = settings.FIREBASE_PROJECT_ID
        self.certs_url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken-system@system.gserviceaccount.com"
        self.certs_cache: Dict[str, str] = {}
        self.certs_expire_time: float = 0.0

    async def _get_public_keys(self) -> Dict[str, str]:
        """
        Fetches Google's public certificates used to sign Firebase ID tokens.
        Caches them to avoid hitting the endpoint on every request.
        """
        now = time.time()
        if self.certs_cache and now < self.certs_expire_time:
            return self.certs_cache

        logger.info("Fetching Google Firebase certificates...")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.certs_url)
                if response.status_code != 200:
                    raise Exception(f"Failed to fetch certs, status: {response.status_code}")
                
                # Retrieve cache control headers to calculate expiration time
                cache_control = response.headers.get("cache-control", "")
                max_age = 3600 # Default fallback cache time: 1 hour
                for part in cache_control.split(","):
                    if "max-age" in part:
                        try:
                            max_age = int(part.split("=")[1].strip())
                        except Exception:
                            pass
                
                self.certs_cache = response.json()
                self.certs_expire_time = now + max_age
                return self.certs_cache
            except Exception as e:
                logger.error(f"Error fetching Firebase public certificates: {str(e)}")
                # If we have stale cache, reuse it on network failure rather than crashing
                if self.certs_cache:
                    return self.certs_cache
                raise HTTPException(
                    status_code=500,
                    detail="Authentication service unavailable (could not fetch certificates)"
                )

    async def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verifies the Firebase JWT ID token signature, issuer, audience, and expiration.
        """
        if not self.project_id or self.project_id == "your-firebase-project-id":
            # For testing/offline mode, bypass verification if mock token is passed
            if settings.DEBUG and token.startswith("mock_token_"):
                uid = token.replace("mock_token_", "")
                return {"uid": uid, "email": f"{uid}@example.com", "name": f"Mock User {uid}"}
            logger.warning("Firebase Project ID not configured! Token verification will fail.")
            raise HTTPException(status_code=500, detail="Firebase Authentication is misconfigured on the server")
            
        try:
            # 1. Fetch public certificates
            public_keys = await self._get_public_keys()
            
            # 2. Decode the header to retrieve the Key ID (kid)
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            if not kid or kid not in public_keys:
                raise HTTPException(status_code=401, detail="Invalid token header: 'kid' not found or invalid")
                
            # 3. Verify signature using public key corresponding to 'kid'
            public_key = public_keys[kid]
            
            # Google certificates are in PEM (x509) format. python-jose handles PEM keys directly.
            claims = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.project_id,
                issuer=f"https://securetoken.google.com/{self.project_id}"
            )
            
            # Validate subject (uid) exists
            uid = claims.get("sub")
            if not uid:
                raise HTTPException(status_code=401, detail="Invalid token: subject 'sub' claim missing")
                
            # Form clean user object
            return {
                "uid": uid,
                "email": claims.get("email"),
                "name": claims.get("name"),
                "email_verified": claims.get("email_verified", False)
            }
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.JWTClaimsError as jce:
            raise HTTPException(status_code=401, detail=f"Token claim verification failed: {str(jce)}")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Token verification unexpected error: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid authentication token")

# Instantiate singleton
auth_service = FirebaseAuthService()

# FastAPI Dependency
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts the Bearer token and verifies it.
    Returns user dict: {uid, email, name, email_verified}
    """
    token = credentials.credentials
    return await auth_service.verify_token(token)
