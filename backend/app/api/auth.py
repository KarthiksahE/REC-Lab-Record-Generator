from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.services.auth_service import get_current_user
from app.services.supabase_service import supabase_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/sync")
async def sync_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Syncs the authenticated Firebase user profile details into the Supabase database.
    """
    uid = current_user.get("uid")
    email = current_user.get("email")
    name = current_user.get("name")
    
    if not uid or not email:
        raise HTTPException(status_code=400, detail="Invalid user token payload")
        
    try:
        user_record = supabase_service.sync_user(uid, email, name)
        return {"status": "success", "user": user_record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database synchronization failed: {str(e)}")

@router.get("/profile")
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieves the profile of the currently logged-in user.
    """
    uid = current_user.get("uid")
    
    if not supabase_service.is_configured():
        return {"status": "success", "user": {"id": uid, "email": current_user.get("email"), "display_name": current_user.get("name")}}
        
    try:
        # Fetch from our database
        user_data = supabase_service.sync_user(uid, current_user.get("email"), current_user.get("name"))
        return {"status": "success", "user": user_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")
