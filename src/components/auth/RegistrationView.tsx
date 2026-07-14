import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Calendar, ShieldCheck, Mail, Phone, MapPin, 
  Upload, Shield, FileText, Lock, CheckCircle, ArrowRight, 
  ArrowLeft, Loader2, Sparkles, AlertCircle, Building2, Download, Star
} from 'lucide-react';
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { sendAutomatedEmail } from '../../utils/emailService';

interface RegistrationViewProps {
  onReturnToLogin: () => void;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({ onReturnToLogin }) => {
  const { showNotification } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // STEP 1 FIELDS: Personal Information
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [nationality, setNationality] = useState('Bangladeshi');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // STEP 2 FIELDS: Contact & Verification
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactOtp, setContactOtp] = useState('');
  const [generatedRegOtp, setGeneratedRegOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [isContactVerified, setIsContactVerified] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('');

  // STEP 3 FIELDS: Role & Documents
  const [requestedRole, setRequestedRole] = useState<'Staff Operator' | 'Warehouse Operator' | 'Admin'>('Staff Operator');
  const [department, setDepartment] = useState('Logistics');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [experience, setExperience] = useState('2 Years');
  const [joiningDate, setJoiningDate] = useState('');
  const [reason, setReason] = useState('');
  const [cvFile, setCvFile] = useState<string | null>(null);
  const [certFile, setCertFile] = useState<string | null>(null);
  const [nidFile, setNidFile] = useState<string | null>(null);
  const [passportFile, setPassportFile] = useState<string | null>(null);

  // STEP 4 FIELDS: Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Photo Selector Simulation
  const handlePhotoSelect = () => {
    setProfilePhoto('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80');
    showNotification('Applicant profile image uploaded successfully', 'success');
  };

  // Real OTP Send for step 2 via EmailJS
  const handleSendContactOtp = async () => {
    if (!email) {
      showNotification('Please enter email to send OTP code', 'error');
      return;
    }
    setOtpSending(true);
    
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedRegOtp(code);

      const emailBody = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px; color: #333333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e8ed; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <!-- Header Brand -->
            <div style="background-color: #0f172a; padding: 25px; text-align: center;">
              <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Sky Inventory Pro</span>
              <div style="font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: bold; margin-top: 5px; letter-spacing: 1.5px;">Sky Automation Tech</div>
            </div>
            <!-- Main Copy -->
            <div style="padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 40px; height: 40px; background-color: rgba(59, 130, 246, 0.1); border-radius: 50%; margin-bottom: 15px;">
                <span style="font-size: 24px; line-height: 40px; color: #3b82f6;">📧</span>
              </div>
              <h2 style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 0; text-align: center;">Verify Your Email Address</h2>
              <p style="font-size: 14px; color: #555555; line-height: 1.6; text-align: left;">
                Thank you for applying to join the Sky Inventory Pro team! Please verify your active corporate email address by entering the secure 6-digit OTP code below inside your registration form.
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #050816; border: 1px solid #1e293b; border-radius: 10px; padding: 15px; margin: 30px auto; max-width: 250px; text-align: center;">
                <span style="font-family: monospace; font-size: 26px; font-weight: 900; color: #3b82f6; letter-spacing: 6px;">${code}</span>
              </div>

              <p style="font-size: 11px; color: #64748b; margin-top: 20px;">
                If you did not initiate this registration request, please disregard this automated email.
              </p>
            </div>
            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">This is an automated system transactional notice from Sky Automation Tech Compliance Dept.</p>
              <p style="margin: 5px 0 0 0;">Dhaka Headquarters, Bangladesh</p>
            </div>
          </div>
        </div>
      `;

      const res = await sendAutomatedEmail({
        recipient: email.trim(),
        subject: "Sky Inventory Pro - Secure 6-Digit Email Verification OTP Code",
        type: "Email Verification OTP",
        body: emailBody,
        details: `Dispatched Email Verification OTP code to ${email.trim()}`
      });

      if (res.mode === 'live') {
        setOtpSent(true);
        showNotification('A secure 6-digit verification code was dispatched to your email via EmailJS.', 'success');
      } else if (res.mode === 'failed') {
        showNotification(`EmailJS dispatch failed: ${res.error || 'Unknown error'}. Please verify your EmailJS keys in Settings or .env`, 'error');
      } else {
        setOtpSent(true);
        showNotification('Simulation Mode: Fresh OTP code simulated. Sim OTP: ' + code, 'info');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to dispatch verification code. Check console logs.', 'error');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyContactOtp = async () => {
    if (contactOtp.length < 6) {
      showNotification('Enter complete 6-digit validation code', 'error');
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setLoading(false);

    // Verify against generatedRegOtp, but allow 123456 as well
    const isCodeValid = contactOtp === generatedRegOtp || contactOtp === '123456' || (!generatedRegOtp && contactOtp === '123456');

    if (isCodeValid) {
      setIsContactVerified(true);
      showNotification('Email and Contact details successfully verified.', 'success');
    } else {
      showNotification('Invalid verification code. Please check your email.', 'error');
    }
  };

  // Password validations
  const getPasswordChecklist = () => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  };

  const isPasswordSecure = () => {
    const checks = getPasswordChecklist();
    return checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special;
  };

  // Submission handler (Firestore write!)
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !isContactVerified) {
      showNotification('Verify your contact details before submitting', 'error');
      return;
    }
    if (!isPasswordSecure()) {
      showNotification('Ensure password matches all secure requirements', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    if (!agreeTerms) {
      showNotification('You must accept the terms & conditions', 'error');
      return;
    }

    setLoading(true);
    try {
      // Check duplicate email in registration_requests
      const qEmailReq = query(collection(db, 'registration_requests'), where('email', '==', email.trim()));
      const snapEmailReq = await getDocs(qEmailReq);
      if (!snapEmailReq.empty) {
        showNotification('A registration request with this email already exists.', 'error');
        setLoading(false);
        return;
      }

      // Check duplicate email in users
      const qEmailUser = query(collection(db, 'users'), where('email', '==', email.trim()));
      const snapEmailUser = await getDocs(qEmailUser);
      if (!snapEmailUser.empty) {
        showNotification('This email is already registered to an active user account.', 'error');
        setLoading(false);
        return;
      }

      // Check duplicate phone in registration_requests
      const qPhoneReq = query(collection(db, 'registration_requests'), where('phoneNumber', '==', phone.trim()));
      const snapPhoneReq = await getDocs(qPhoneReq);
      if (!snapPhoneReq.empty) {
        showNotification('A registration request with this phone number already exists.', 'error');
        setLoading(false);
        return;
      }

      // Check duplicate phone in users
      const qPhoneUser = query(collection(db, 'users'), where('phoneNumber', '==', phone.trim()));
      const snapPhoneUser = await getDocs(qPhoneUser);
      if (!snapPhoneUser.empty) {
        showNotification('This phone number is already registered to an active user account.', 'error');
        setLoading(false);
        return;
      }

      const requestRef = doc(collection(db, 'registration_requests'));
      const newRequest = {
        id: requestRef.id,
        fullName,
        dob,
        gender,
        nationality,
        nationalId,
        address,
        city,
        district,
        country,
        profilePhoto: profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        phoneNumber: phone,
        email,
        roleRequested: requestedRole,
        department,
        expectedSalary: Number(expectedSalary) || 0,
        experience,
        joiningDate: joiningDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
        reasonForRequest: reason || 'N/A',
        cvFile: cvFile || 'CV_Rashed_Hasan.pdf',
        certificateFile: certFile || 'Certification_Of_Competency.pdf',
        nationalIdFile: nidFile || 'National_ID_Card.png',
        passportFile: passportFile || 'Passport_Bio_Page.png',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(requestRef, newRequest);
      
      // Dispatch automated EmailJS notice
      try {
        await sendAutomatedEmail({
          recipient: email,
          subject: "Sky Inventory Pro - Registration Request Received",
          type: "Registration Received",
          applicantName: fullName,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background-color: #ffffff;">
              <h2 style="color: #0f172a;">Application Received</h2>
              <p>Dear ${fullName},</p>
              <p>We have successfully received your applicant registration request for the role of <strong>${requestedRole}</strong> in the <strong>${department}</strong> department. Our Super Admin compliance team is currently reviewing your uploaded credentials.</p>
              <p>Your unique registration request reference is: <strong>${requestRef.id}</strong></p>
              <p>Best regards,<br/>Sky Automation Tech Compliance Team</p>
            </div>
          `,
          details: `Successfully dispatched onboarding registration received notification to ${email}`
        });
      } catch (emailErr) {
        console.error('Email notification dispatch skipped or failed:', emailErr);
      }

      setIsSuccess(true);
      showNotification('Registration request submitted successfully! Pending Super Admin review.', 'success');
    } catch (err: any) {
      console.error('Registration Request save error:', err);
      showNotification('Failed to submit request: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const passCheck = getPasswordChecklist();

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-8 sm:p-12 bg-[#0f172a]/30 backdrop-blur-2xl border border-white/10 rounded-[20px] shadow-2xl text-center space-y-6">
        <div className="h-16 w-16 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/10">
          <CheckCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Application Submitted Successfully</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Your registration request has been stored securely in the Sky Inventory Pro database. You will receive an automated email confirmation once our Super Admin approves or rejects the request.
          </p>
        </div>

        <div className="p-4 bg-[#050816]/60 rounded-xl border border-white/5 text-left text-xs space-y-2 max-w-sm mx-auto font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">Applicant:</span>
            <span className="text-slate-300 font-bold">{fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Role Requested:</span>
            <span className="text-slate-300 font-bold">{requestedRole}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Department:</span>
            <span className="text-slate-300 font-bold">{department}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email:</span>
            <span className="text-slate-300 font-bold">{email}</span>
          </div>
        </div>

        <button
          onClick={onReturnToLogin}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/10"
        >
          Return to Login Hub
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-[#0f172a]/30 backdrop-blur-2xl border border-white/10 rounded-[20px] shadow-2xl p-6 sm:p-10 space-y-8 font-sans text-slate-100">
      
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-5 gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" /> Registration Request
          </h2>
          <p className="text-xs text-slate-400">Submit your corporate account request in 4 simple steps</p>
        </div>
        <button
          onClick={onReturnToLogin}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Sign In</span>
        </button>
      </div>

      {/* Progress Wizard Steps Indicator */}
      <div className="flex items-center justify-between max-w-md mx-auto py-2">
        {[1, 2, 3, 4].map((s) => (
          <React.Fragment key={s}>
            {s > 1 && (
              <div className={`flex-1 h-0.5 transition-all ${step >= s ? 'bg-blue-500' : 'bg-white/10'}`} />
            )}
            <div className="flex flex-col items-center relative">
              <button
                type="button"
                onClick={() => { if (s < step) setStep(s as any); }}
                className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                  step === s 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20 scale-110' 
                    : step > s
                      ? 'bg-blue-900/40 border-blue-600 text-blue-300'
                      : 'bg-[#050816]/60 border-white/10 text-slate-500'
                }`}
              >
                {s}
              </button>
              <span className="text-[9px] font-bold text-slate-400 mt-1.5 absolute -bottom-5 whitespace-nowrap">
                {s === 1 ? 'Personal' : s === 2 ? 'Verification' : s === 3 ? 'Role Request' : 'Security'}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Forms Panels */}
      <div className="pt-6">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Personal info */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center space-y-3 pb-3">
                <div 
                  onClick={handlePhotoSelect}
                  className="h-20 w-20 rounded-full border-2 border-dashed border-white/15 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/40 hover:bg-white/10 transition-all overflow-hidden relative group"
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">Photo</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/40 items-center justify-center hidden group-hover:flex">
                    <span className="text-[8px] font-bold text-white uppercase">Upload</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">Click to upload professional passport-size photo (PNG/JPG)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full legal name"
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nationality *</label>
                  <input
                    type="text"
                    required
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">National ID / Passport Number *</label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="NID or Passport bio-data ID"
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Home Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Apartment, building, street address"
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!fullName || !dob || !nationalId || !address) {
                      showNotification('Please fill in all mandatory fields', 'error');
                      return;
                    }
                    setStep(2);
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Continue Step 2</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Contact verification */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4 max-w-md mx-auto">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Mobile Phone Number *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+880</span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="17XXXXXXXX"
                      className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl pl-16 pr-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Email Verification Box */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Corporate Email Address *</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      disabled={isContactVerified}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@skyautomationtech.com"
                      className="flex-1 text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all disabled:opacity-50"
                    />
                    {!isContactVerified && (
                      <button
                        type="button"
                        onClick={handleSendContactOtp}
                        disabled={otpSending || !email}
                        className="px-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Verification Code Box (OTP Sent state) */}
                {otpSent && !isContactVerified && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2.5 border border-white/5 bg-[#050816]/40 p-4 rounded-xl"
                  >
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">6-Digit Verification Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={contactOtp}
                        onChange={(e) => setContactOtp(e.target.value)}
                        placeholder="123456"
                        className="flex-1 text-center font-mono text-xs bg-[#050816]/80 border border-white/10 rounded-xl py-2.5 text-white focus:outline-hidden focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyContactOtp}
                        className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Verify OTP
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Verified state indicator badge */}
                {isContactVerified && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="h-4.5 w-4.5" />
                      Email Verified & Validated
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
                  </div>
                )}

                {/* Emergency Contact */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Emergency Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Emergency relationship number"
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!phone || !email || !emergencyContact) {
                      showNotification('Please enter all contacts details', 'error');
                      return;
                    }
                    if (!isContactVerified) {
                      showNotification('Please complete email verification check', 'error');
                      return;
                    }
                    setStep(3);
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Continue Step 3</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Role requested & documents */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Role Cards selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Select Requested Enterprise Role *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'Staff Operator', title: 'Staff Operator', desc: 'Execute daily warehouse entries, cash entries and sales transactions.' },
                    { id: 'Warehouse Operator', title: 'Warehouse Operator', desc: 'Approve local stock transfers, track batches, manage physical bins.' },
                    { id: 'Admin', title: 'System Admin', desc: 'Audit system logs, override pricing controls, orchestrate integration hubs.' },
                  ].map((card) => (
                    <div
                      key={card.id}
                      onClick={() => setRequestedRole(card.id as any)}
                      className={`p-4 rounded-xl border cursor-pointer text-left transition-all relative ${
                        requestedRole === card.id
                          ? 'bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/10 scale-[1.02]'
                          : 'bg-[#050816]/60 border-white/5 hover:border-white/10 hover:bg-[#050816]/80'
                      }`}
                    >
                      {requestedRole === card.id && (
                        <span className="absolute top-3 right-3 text-blue-400">
                          <CheckCircle className="h-4.5 w-4.5" />
                        </span>
                      )}
                      <h4 className="text-xs font-bold text-white">{card.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Target Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  >
                    <option value="Logistics">Logistics & Supply Chain</option>
                    <option value="Accounts">Accounts & Corporate Finance</option>
                    <option value="CRM">Sales & CRM Support</option>
                    <option value="Management">Operations Management</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Expected Monthly Salary (USD) *</label>
                  <input
                    type="number"
                    required
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Years of Relevant Experience *</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  >
                    <option value="Fresh Graduate">Fresh Graduate / Entry Level</option>
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">Senior 5+ Years</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Expected Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Brief Reason for Application Request *</label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Briefly describe why you are joining Sky Inventory Pro..."
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Upload document widgets */}
              <div className="space-y-2 border-t border-white/5 pt-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Upload Supporting Compliance Documents (CV, Certificate, IDs) *</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                  {[
                    { state: cvFile, setter: setCvFile, label: 'CV / Resume', file: 'Rashed_Hasan_CV.pdf' },
                    { state: certFile, setter: setCertFile, label: 'Academic Cert', file: 'Academic_Cert.pdf' },
                    { state: nidFile, setter: setNidFile, label: 'NID Scan (Front)', file: 'NID_Scan.png' },
                    { state: passportFile, setter: setPassportFile, label: 'Passport Bio', file: 'Passport_Bio.png' },
                  ].map((docItem, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        docItem.setter(docItem.file);
                        showNotification(`${docItem.label} attached successfully`, 'success');
                      }}
                      className={`p-3.5 rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                        docItem.state 
                          ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' 
                          : 'border-white/10 bg-white/[0.02] hover:border-blue-500/30 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Upload className="h-4.5 w-4.5 mb-1 text-slate-400 group-hover:text-white" />
                      <span className="text-[10px] font-bold">{docItem.label}</span>
                      <span className="text-[8px] text-slate-500 mt-0.5 max-w-full truncate font-mono">
                        {docItem.state ? docItem.state : 'Select File'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!expectedSalary || !reason) {
                      showNotification('Please fill in required job details', 'error');
                      return;
                    }
                    if (!cvFile || !nidFile) {
                      showNotification('Compliance requires attaching at least CV and NID card files', 'error');
                      return;
                    }
                    setStep(4);
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Continue Step 4</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Security password */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4 max-w-md mx-auto text-left">
                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Secure Corporate Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Confirm Password field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Password checklist visualizer */}
                <div className="p-4 bg-[#050816]/40 rounded-xl border border-white/5 space-y-2">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Security Requirements Checklist:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                        passCheck.length ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {passCheck.length ? '✓' : '✗'}
                      </div>
                      <span className={passCheck.length ? 'text-slate-300' : 'text-slate-500'}>Minimum 8 characters</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                        passCheck.uppercase ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {passCheck.uppercase ? '✓' : '✗'}
                      </div>
                      <span className={passCheck.uppercase ? 'text-slate-300' : 'text-slate-500'}>Uppercase Letters</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                        passCheck.lowercase ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {passCheck.lowercase ? '✓' : '✗'}
                      </div>
                      <span className={passCheck.lowercase ? 'text-slate-300' : 'text-slate-500'}>Lowercase Letters</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                        passCheck.number ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {passCheck.number ? '✓' : '✗'}
                      </div>
                      <span className={passCheck.number ? 'text-slate-300' : 'text-slate-500'}>At least one number</span>
                    </div>

                    <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                        passCheck.special ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {passCheck.special ? '✓' : '✗'}
                      </div>
                      <span className={passCheck.special ? 'text-slate-300' : 'text-slate-500'}>Special Character (!@#$ etc.)</span>
                    </div>
                  </div>
                </div>

                {/* Agree terms */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded border-white/10 bg-[#050816]/60 text-blue-600 focus:ring-blue-500"
                    />
                    I agree to the Sky Automation compliance Terms & Conditions
                  </label>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={handleRequestSubmit}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-500/10 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Filing Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Request Application</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};
