import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

// Vite loads env variables prefixed with VITE_
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isFirebaseConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your_api_key_here" &&
  firebaseConfig.projectId;

let firebaseApp = null;
let firebaseAuth = null;
const googleProvider = new GoogleAuthProvider();

if (isFirebaseConfigured) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    console.log("Firebase Auth client initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase Auth config is missing or incomplete. Operating in Mock Authentication mode.");
}

// ==========================================
// MOCK AUTHENTICATION SYSTEM (LOCAL STORAGE)
// ==========================================
class MockAuth {
  constructor() {
    this.listeners = [];
    this.currentUser = this._loadUser();
    
    // Auto login if session exists
    const storedUser = localStorage.getItem("mock_user_session");
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }
  }

  _loadUser() {
    return null;
  }

  async signIn(email, password) {
    // Basic verification
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const user = users.find(u => u.email === email);
    
    if (!user || password !== "password123") { // Accept standard passwords for easy testing
      if (user && user.password !== password) {
        throw new Error("Invalid password (try 'password123' or the password you registered with)");
      }
      if (!user) {
        throw new Error("User not found. Try creating an account or login with any password if email is registered.");
      }
    }
    
    const loggedUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "Student User",
      emailVerified: true,
      getIdToken: async () => `mock_token_${user.uid}`
    };
    
    this.currentUser = loggedUser;
    localStorage.setItem("mock_user_session", JSON.stringify(loggedUser));
    this._notifyListeners();
    return loggedUser;
  }

  async signUp(email, password, displayName) {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    if (users.find(u => u.email === email)) {
      throw new Error("Email already registered in local mock db");
    }
    
    const uid = "mock_uid_" + Math.random().toString(36).substring(2, 9);
    const newUser = { uid, email, password, displayName };
    users.push(newUser);
    localStorage.setItem("mock_users", JSON.stringify(users));
    
    return this.signIn(email, password);
  }

  async signInWithGoogle() {
    const email = "google.student@mock.edu";
    const displayName = "Google Student";
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    
    let user = users.find(u => u.email === email);
    if (!user) {
      const uid = "mock_google_uid_" + Math.random().toString(36).substring(2, 9);
      user = { uid, email, displayName };
      users.push(user);
      localStorage.setItem("mock_users", JSON.stringify(users));
    }
    
    const loggedUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: true,
      getIdToken: async () => `mock_token_${user.uid}`
    };
    
    this.currentUser = loggedUser;
    localStorage.setItem("mock_user_session", JSON.stringify(loggedUser));
    this._notifyListeners();
    return loggedUser;
  }

  async sendPasswordReset(email) {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error("Email not registered in local mock db");
    }
    alert(`[MOCK MODE] Password reset email link sent to: ${email}`);
    return true;
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem("mock_user_session");
    this._notifyListeners();
    return true;
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  _notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }
}

const mockAuthInstance = new MockAuth();

// ==========================================
// EXPORTED AUTH SERVICE INTERFACES
// ==========================================

export const auth = isFirebaseConfigured ? firebaseAuth : null;

export const signInUser = async (email, password) => {
  if (isFirebaseConfigured) {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return userCredential.user;
  } else {
    return await mockAuthInstance.signIn(email, password);
  }
};

export const signUpUser = async (email, password, displayName) => {
  if (isFirebaseConfigured) {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } else {
    return await mockAuthInstance.signUp(email, password, displayName);
  }
};

export const signInWithGoogle = async () => {
  if (isFirebaseConfigured) {
    const userCredential = await signInWithPopup(firebaseAuth, googleProvider);
    return userCredential.user;
  } else {
    return await mockAuthInstance.signInWithGoogle();
  }
};

export const resetPassword = async (email) => {
  if (isFirebaseConfigured) {
    await sendPasswordResetEmail(firebaseAuth, email);
    return true;
  } else {
    return await mockAuthInstance.sendPasswordReset(email);
  }
};

export const signOutUser = async () => {
  if (isFirebaseConfigured) {
    await signOut(firebaseAuth);
    return true;
  } else {
    return await mockAuthInstance.signOut();
  }
};

export const subscribeToAuthChanges = (callback) => {
  if (isFirebaseConfigured) {
    return onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        // Inject token helper wrapper same as mock format
        user.getIdTokenWrapper = async () => await user.getIdToken();
      }
      callback(user);
    });
  } else {
    return mockAuthInstance.onAuthStateChanged((user) => {
      if (user) {
        user.getIdTokenWrapper = user.getIdToken;
      }
      callback(user);
    });
  }
};
