import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  User, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole, UserPermissions, ROLE_PERMISSIONS, ActivityLog } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  permissions: UserPermissions | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  notification: { message: string; type: 'success' | 'error' | 'info'; title?: string } | null;
  setNotification: React.Dispatch<React.SetStateAction<{ message: string; type: 'success' | 'error' | 'info'; title?: string } | null>>;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (
    email: string, 
    password: string, 
    fullName: string, 
    phoneNumber: string, 
    employeeId: string, 
    role: UserRole, 
    department: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  logSystemActivity: (action: string, details: string) => Promise<void>;
  activeCompanyId: string | null;
  activeBranchId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  setActiveBranchId: (id: string | null) => void;
  logEnterpriseAudit: (action: string, oldValue: any, newValue: any, customCompanyId?: string, customBranchId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; title?: string } | null>(null);

  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (!activeCompanyId) setActiveCompanyId(profile.companyId || 'default-company');
      if (!activeBranchId) setActiveBranchId(profile.branchId || 'default-branch');
    } else {
      setActiveCompanyId(null);
      setActiveBranchId(null);
    }
  }, [profile]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
  };

  const clearNotification = () => {
    setNotification(null);
  };

  // Helper to log activities securely in Firestore
  const logSystemActivity = async (action: string, details: string) => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    const userName = profile?.fullName || auth.currentUser.email || 'Unknown User';
    const userRole = profile?.role || 'Staff';

    const logRef = doc(collection(db, 'activity_logs'));
    const newLog: ActivityLog = {
      id: logRef.id,
      uid: currentUid,
      userName,
      userRole,
      action,
      details,
      timestamp: new Date().toISOString()
    };

    try {
      await setDoc(logRef, newLog);
    } catch (err) {
      console.error('Failed to log activity:', err);
      // We don't crash the app if log failing, but we log the handleFirestoreError
      try {
        handleFirestoreError(err, OperationType.CREATE, `activity_logs/${logRef.id}`);
      } catch (inner) {
        // Suppress to avoid UI interruption
      }
    }
  };

  const logEnterpriseAudit = async (
    action: string, 
    oldValue: any, 
    newValue: any, 
    customCompanyId?: string, 
    customBranchId?: string
  ) => {
    if (!auth.currentUser) return;
    
    // Parse User Agent
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let device = "Desktop";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
    else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
    else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    if (/Mobi|Android|iPhone|iPad/i.test(ua)) {
      device = "Mobile/Tablet";
    }

    let ipAddress = "127.0.0.1";
    let location = "Localhost, Dev";

    try {
      const response = await fetch('https://ipapi.co/json/').then(r => r.json());
      if (response && response.ip) {
        ipAddress = response.ip;
        location = `${response.city || 'Unknown'}, ${response.country_name || 'Unknown'}`;
      }
    } catch (e) {
      // Non-blocking fallback
    }

    const logRef = doc(collection(db, 'audit_logs'));
    const auditRecord = {
      id: logRef.id,
      uid: auth.currentUser.uid,
      userName: profile?.fullName || auth.currentUser.email || 'Unknown User',
      userRole: profile?.role || 'Staff',
      action,
      ipAddress,
      device,
      browser,
      location,
      oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      timestamp: new Date().toISOString(),
      companyId: customCompanyId || activeCompanyId || profile?.companyId || 'default-company',
      branchId: customBranchId || activeBranchId || profile?.branchId || 'default-branch'
    };

    try {
      await setDoc(logRef, auditRecord);
    } catch (err) {
      console.error('Audit logging failed:', err);
    }
  };

  // Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setError(null);

      if (currentUser) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            setPermissions(ROLE_PERMISSIONS[data.role]);

            // Update lastLogin timestamp
            await updateDoc(userDocRef, {
              lastLogin: new Date().toISOString()
            });
          } else {
            // Self-healing check for default Super Admin profile document in Firestore
            if (currentUser.email === 'skyautomationtech@gmail.com') {
              const initialProfile: UserProfile = {
                uid: currentUser.uid,
                fullName: 'Sky Automation Tech',
                profilePhoto: null,
                email: 'skyautomationtech@gmail.com',
                phoneNumber: '',
                employeeId: 'SAT-0001',
                role: 'Super Admin',
                department: 'Management',
                accountStatus: 'Active',
                lastLogin: new Date().toISOString(),
                createdDate: new Date().toISOString()
              };

              const docData = {
                ...initialProfile,
                status: 'Active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              await setDoc(userDocRef, docData);
              setProfile(initialProfile);
              setPermissions(ROLE_PERMISSIONS['Super Admin']);
            } else {
              // Profile does not exist yet (could be during registration process)
              setProfile(null);
              setPermissions(null);
            }
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setError("Failed to sync user profile from database.");
          showNotification("Failed to load user profile. Check security rules.", "error");
        }
      } else {
        setProfile(null);
        setPermissions(null);

        // Robust, secure background bootstrap of Super Admin on app startup if no user is logged in
        if (localStorage.getItem('sky_admin_bootstrapped') !== 'true' && !(window as any).__sky_bootstrapping) {
          (window as any).__sky_bootstrapping = true;

          const bootstrapSuperAdmin = async () => {
            try {
              const email = 'skyautomationtech@gmail.com';
              const password = '12Asdf@2';

              const cred = await createUserWithEmailAndPassword(auth, email, password);
              const newUser = cred.user;

              const initialProfile: UserProfile = {
                uid: newUser.uid,
                fullName: 'Sky Automation Tech',
                profilePhoto: null,
                email: email,
                phoneNumber: '',
                employeeId: 'SAT-0001',
                role: 'Super Admin',
                department: 'Management',
                accountStatus: 'Active',
                lastLogin: new Date().toISOString(),
                createdDate: new Date().toISOString()
              };

              const docData = {
                ...initialProfile,
                status: 'Active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              // Write to Firestore users collection
              await setDoc(doc(db, 'users', newUser.uid), docData);
              console.log('Default Super Admin account successfully bootstrapped.');
              localStorage.setItem('sky_admin_bootstrapped', 'true');

              // Automatically sign out immediately to prevent forced login on startup
              await signOut(auth);
            } catch (authErr: any) {
              if (authErr.code === 'auth/email-already-in-use' || authErr.code === 'auth/invalid-credential') {
                localStorage.setItem('sky_admin_bootstrapped', 'true');
                console.log('Super Admin account already exists or is configured. Bootstrap marked complete.');
              } else {
                console.log('Bootstrap info (not an error):', authErr.message || authErr);
              }
            } finally {
              (window as any).__sky_bootstrapping = false;
            }
          };

          bootstrapSuperAdmin();
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login
  const login = async (email: string, password: string, rememberMe: boolean) => {
    setActionLoading(true);
    setError(null);
    try {
      // Set persistence
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (signInErr: any) {
        // Safe check: if this is the default Super Admin, and sign in failed,
        // try to self-heal by creating the user (in case they don't exist in Auth yet)
        if (email.trim() === 'skyautomationtech@gmail.com' && password === '12Asdf@2') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const newUser = userCredential.user;

            const initialProfile: UserProfile = {
              uid: newUser.uid,
              fullName: 'Sky Automation Tech',
              profilePhoto: null,
              email: email.trim(),
              phoneNumber: '',
              employeeId: 'SAT-0001',
              role: 'Super Admin',
              department: 'Management',
              accountStatus: 'Active',
              lastLogin: new Date().toISOString(),
              createdDate: new Date().toISOString()
            };

            const docData = {
              ...initialProfile,
              status: 'Active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', newUser.uid), docData);
            localStorage.setItem('sky_admin_bootstrapped', 'true');
          } catch (createErr) {
            // If creation also fails, throw the original sign-in error
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }

      const loggedUser = userCredential.user;

      // Log activity
      const userDocRef = doc(db, 'users', loggedUser.uid);
      const userDoc = await getDoc(userDocRef);
      let userRole: UserRole = 'Staff';
      let fullName = loggedUser.email || 'User';

      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setProfile(data);
        setPermissions(ROLE_PERMISSIONS[data.role]);
        userRole = data.role;
        fullName = data.fullName;
        
        await updateDoc(userDocRef, {
          lastLogin: new Date().toISOString()
        });
      } else if (loggedUser.email === 'skyautomationtech@gmail.com') {
        // Self-heal profile document if it doesn't exist in Firestore
        const initialProfile: UserProfile = {
          uid: loggedUser.uid,
          fullName: 'Sky Automation Tech',
          profilePhoto: null,
          email: 'skyautomationtech@gmail.com',
          phoneNumber: '',
          employeeId: 'SAT-0001',
          role: 'Super Admin',
          department: 'Management',
          accountStatus: 'Active',
          lastLogin: new Date().toISOString(),
          createdDate: new Date().toISOString()
        };

        const docData = {
          ...initialProfile,
          status: 'Active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(userDocRef, docData);
        setProfile(initialProfile);
        setPermissions(ROLE_PERMISSIONS['Super Admin']);
        userRole = 'Super Admin';
        fullName = 'Sky Automation Tech';
      }

      showNotification(`Welcome back, ${fullName}!`, 'success');
      
      // Save logs
      const logRef = doc(collection(db, 'activity_logs'));
      const newLog: ActivityLog = {
        id: logRef.id,
        uid: loggedUser.uid,
        userName: fullName,
        userRole,
        action: 'User Login',
        details: `Successful login using email: ${loggedUser.email}. Remember me: ${rememberMe}`,
        timestamp: new Date().toISOString()
      };
      await setDoc(logRef, newLog);

    } catch (err: any) {
      console.error(err);
      let errMsg = 'Login failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        errMsg = 'Too many login attempts. Please try again later.';
      }
      setError(errMsg);
      showNotification(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Register
  const register = async (
    email: string, 
    password: string, 
    fullName: string, 
    phoneNumber: string, 
    employeeId: string, 
    role: UserRole, 
    department: string
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Handle bootstrapped super admin or admin matching the requirement
      let assignedRole = role;
      if (email.toLowerCase() === 'skyautomationtech@gmail.com') {
        assignedRole = 'Super Admin';
      }

      // Create profile object
      const initialProfile: UserProfile = {
        uid: newUser.uid,
        fullName,
        profilePhoto: null,
        email,
        phoneNumber,
        employeeId,
        role: assignedRole,
        department,
        accountStatus: 'Active', // Active by default for developer preview ease
        lastLogin: new Date().toISOString(),
        createdDate: new Date().toISOString()
      };

      // Write to Firestore users collection
      const userDocRef = doc(db, 'users', newUser.uid);
      try {
        await setDoc(userDocRef, initialProfile);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, `users/${newUser.uid}`);
      }

      // Update local states
      setProfile(initialProfile);
      setPermissions(ROLE_PERMISSIONS[assignedRole]);

      // Log system activity
      const logRef = doc(collection(db, 'activity_logs'));
      const newLog: ActivityLog = {
        id: logRef.id,
        uid: newUser.uid,
        userName: fullName,
        userRole: assignedRole,
        action: 'Account Created',
        details: `Registered new user with email ${email} and role ${assignedRole}.`,
        timestamp: new Date().toISOString()
      };
      try {
        await setDoc(logRef, newLog);
      } catch (logErr) {
        // Non-blocking
      }

      // Send verification email
      try {
        await sendEmailVerification(newUser);
        showNotification('Account created! Please check your email for verification.', 'success');
      } catch (verificationErr) {
        console.warn('Verification email send error:', verificationErr);
        showNotification('Account created successfully!', 'success');
      }

    } catch (err: any) {
      console.error(err);
      let errMsg = 'Registration failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email is already registered.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password is too weak.';
      }
      setError(errMsg);
      showNotification(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setActionLoading(true);
    try {
      if (user) {
        await logSystemActivity('User Logout', `User ${user.email} logged out safely.`);
      }
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setPermissions(null);
      showNotification('Logged out successfully.', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Logout failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Forgot Password
  const forgotPassword = async (email: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification('Password reset link sent! Check your inbox.', 'success');
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        errMsg = 'No account found with this email.';
      }
      setError(errMsg);
      showNotification(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Resend Verification Email
  const sendVerificationEmail = async () => {
    if (!auth.currentUser) {
      showNotification('No active user session found.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      showNotification('Verification email sent! Check your inbox.', 'success');
      await logSystemActivity('Verification Resent', 'Requested a new email verification code.');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to send verification email. Try again later.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Profile Data
  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) {
      showNotification('You must be logged in to update profile.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Update database
      try {
        await updateDoc(userDocRef, data);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `users/${user.uid}`);
      }

      // Update local state
      const updatedProfile = { ...profile, ...data } as UserProfile;
      setProfile(updatedProfile);
      setPermissions(ROLE_PERMISSIONS[updatedProfile.role]);

      showNotification('Profile updated successfully!', 'success');
      await logSystemActivity('Profile Update', `Updated profile fields: ${Object.keys(data).join(', ')}`);
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to update profile.', 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      permissions,
      loading,
      actionLoading,
      error,
      notification,
      setNotification,
      showNotification,
      clearNotification,
      login,
      register,
      logout,
      forgotPassword,
      sendVerificationEmail,
      updateProfileData,
      logSystemActivity,
      activeCompanyId,
      activeBranchId,
      setActiveCompanyId,
      setActiveBranchId,
      logEnterpriseAudit
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
