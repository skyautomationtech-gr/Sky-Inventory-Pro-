import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  User, Mail, Phone, Hash, Shield, Briefcase, Calendar, 
  Activity, Upload, Save, Eye, Loader2, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { UserRole } from '../types';

export const ProfileEdit: React.FC = () => {
  const { profile, updateProfileData, actionLoading, showNotification } = useAuth();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [employeeId, setEmployeeId] = useState(profile?.employeeId || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(profile?.profilePhoto || '');
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadPhotoToStorage = async (file: File) => {
    if (!profile?.uid) return;
    
    // Size check (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFileError('File size exceeds the 2MB limit.');
      showNotification('Profile picture must be under 2MB.', 'error');
      return;
    }

    // Type check
    if (!file.type.startsWith('image/')) {
      setFileError('File must be an image.');
      showNotification('Only image files are allowed.', 'error');
      return;
    }

    setUploadingFile(true);
    setFileError(null);

    try {
      const storageRef = ref(storage, `profile_photos/${profile.uid}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      setProfilePhotoUrl(downloadUrl);
      // Automatically update profile data with new photo URL
      await updateProfileData({ profilePhoto: downloadUrl });
      showNotification('Profile picture updated successfully!', 'success');
    } catch (err: any) {
      console.error("Storage upload failed:", err);
      // Graceful fallback for environments where Storage bucket is unprovisioned or rules are restricted
      setFileError('Cloud upload restricted. Using local preview.');
      const localUrl = URL.createObjectURL(file);
      setProfilePhotoUrl(localUrl);
      await updateProfileData({ profilePhoto: localUrl });
      showNotification('Profile photo saved locally (Storage bucket unprovisioned).', 'info');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadPhotoToStorage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadPhotoToStorage(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (fullName.trim().length < 2) {
      showNotification('Name must be at least 2 characters.', 'error');
      return;
    }

    try {
      await updateProfileData({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        employeeId: employeeId.trim(),
        department: department.trim(),
        profilePhoto: profilePhotoUrl || null
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return 'Never';
    return new Date(isoStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 px-2">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          My Enterprise Profile
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your enterprise profile parameters and credential declarations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Picture & System Info */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Photo Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs text-center space-y-6">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Profile Photo
            </h3>

            {/* Avatar Container */}
            <div className="mx-auto h-28 w-28 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center relative shadow-sm group">
              {profilePhotoUrl ? (
                <img 
                  src={profilePhotoUrl} 
                  alt="Avatar Preview" 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-3xl font-bold text-zinc-400 dark:text-zinc-500">
                  {profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SI'}
                </span>
              )}

              {uploadingFile && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              )}
            </div>

            {/* Drag & Drop File Area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/10' 
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/20'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <Upload className="h-5 w-5 text-zinc-400 mx-auto mb-2" />
              <p className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                Drag and drop image here
              </p>
              <p className="text-[9px] text-zinc-400 mt-1">
                or click to browse (Max 2MB)
              </p>
            </div>

            {fileError && (
              <p className="text-[10px] font-medium text-rose-500 flex items-center gap-1 justify-center">
                <AlertCircle className="h-3 w-3" />
                {fileError}
              </p>
            )}
          </div>

          {/* Read Only System Metadata */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Account Security Log
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-zinc-400" /> Account Status
                </span>
                <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                  profile?.accountStatus === 'Active' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30' 
                    : 'bg-zinc-500/10 text-zinc-500'
                }`}>
                  {profile?.accountStatus}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-zinc-400" /> Security Role
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {profile?.role}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Member Since
                </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {formatDate(profile?.createdDate || null)}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-zinc-400" /> Last Login
                </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {formatDate(profile?.lastLogin || null)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Profile Fields Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Account Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-zinc-400" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" /> Primary Email (Read Only)
                </label>
                <div className="w-full text-xs bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-zinc-500 dark:text-zinc-400 font-mono select-none">
                  {profile?.email}
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Employee ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-zinc-400" /> Employee ID
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  placeholder="EMP-XXXXX"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-zinc-400" /> Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="e.g. Sales, Inventory, Logistics"
                />
              </div>

              {/* Role Display (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-zinc-400" /> Privilege Role (Read Only)
                </label>
                <div className="w-full text-xs bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-zinc-500 dark:text-zinc-400 font-semibold select-none">
                  {profile?.role}
                </div>
              </div>

            </div>

            {/* Note on access control */}
            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Role Escalation Guard</p>
                <p className="mt-0.5 text-[11px] text-amber-700/90 dark:text-amber-400/80">
                  Role assignments and authorization configurations are immutable from the profile form. 
                  Any level adjustments must be validated and executed by a Super Admin to prevent session privilege escalation.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end border-t border-zinc-100 dark:border-zinc-800 pt-5">
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition-all disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
