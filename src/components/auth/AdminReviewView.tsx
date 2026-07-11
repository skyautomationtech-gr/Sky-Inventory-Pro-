import React, { useState, useEffect } from 'react';
import { 
  Users, Check, X, Search, Filter, Download, FileText, 
  UserCheck, HelpCircle, ArrowUpRight, ArrowDownRight, 
  Calendar, Building2, MapPin, Loader2, RefreshCw, Eye
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export interface RegistrationRequest {
  id: string;
  fullName: string;
  dob: string;
  gender: string;
  nationality: string;
  nationalId: string;
  address: string;
  city: string;
  district: string;
  country: string;
  profilePhoto: string;
  phoneNumber: string;
  email: string;
  roleRequested: string;
  department: string;
  expectedSalary: number;
  experience: string;
  joiningDate: string;
  reasonForRequest: string;
  cvFile: string;
  certificateFile: string;
  nationalIdFile: string;
  passportFile: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_MOCK_REQUESTS: RegistrationRequest[] = [
  {
    id: "SAT-REQ-1001",
    fullName: "Md. Rashed Hasan",
    dob: "1994-04-12",
    gender: "Male",
    nationality: "Bangladeshi",
    nationalId: "NID-7845129532",
    address: "House 24, Road 5, Dhanmondi",
    city: "Dhaka",
    district: "Dhaka",
    country: "Bangladesh",
    profilePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    phoneNumber: "1712345678",
    email: "rashed.hasan@skyautomationtech.com",
    roleRequested: "Warehouse Operator",
    department: "Logistics",
    expectedSalary: 1200,
    experience: "3-5 Years",
    joiningDate: "2026-08-01",
    reasonForRequest: "I want to leverage my 4 years of supply chain and warehouse handling skills to streamline operations at Sky Inventory's multi-entity facilities.",
    cvFile: "Rashed_Hasan_CV.pdf",
    certificateFile: "Dhanmondi_College_Degree.pdf",
    nationalIdFile: "NID_Front_Scan.png",
    passportFile: "Passport_Bio_Page.png",
    status: "Pending",
    createdAt: "2026-07-11T09:12:00.000Z",
    updatedAt: "2026-07-11T09:12:00.000Z"
  },
  {
    id: "SAT-REQ-1002",
    fullName: "Sarah L. Jenkins",
    dob: "1991-08-25",
    gender: "Female",
    nationality: "American",
    nationalId: "US-PAS-99214452",
    address: "505 Broadway Ave, Apt 12B",
    city: "New York",
    district: "Manhattan",
    country: "United States",
    profilePhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    phoneNumber: "1928445102",
    email: "sarah.jenkins@skyautomationtech.com",
    roleRequested: "Admin",
    department: "Accounts",
    expectedSalary: 2500,
    experience: "5+ Years",
    joiningDate: "2026-07-20",
    reasonForRequest: "Experienced Corporate CPA looking to establish double-entry rules and audit compliance systems for parent/branch holds.",
    cvFile: "Sarah_Jenkins_CPA.pdf",
    certificateFile: "CPA_License_NYS.pdf",
    nationalIdFile: "US_Driver_License.png",
    passportFile: "US_Passport.png",
    status: "Pending",
    createdAt: "2026-07-10T14:30:00.000Z",
    updatedAt: "2026-07-10T14:30:00.000Z"
  },
  {
    id: "SAT-REQ-1003",
    fullName: "David J. Vance",
    dob: "1997-11-03",
    gender: "Male",
    nationality: "Canadian",
    nationalId: "CAN-NID-882194",
    address: "412 Oakridge Trail",
    city: "Toronto",
    district: "Ontario",
    country: "Canada",
    profilePhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    phoneNumber: "1611223344",
    email: "david.vance@skyautomationtech.com",
    roleRequested: "Staff Operator",
    department: "CRM",
    expectedSalary: 1100,
    experience: "1 Year",
    joiningDate: "2026-07-15",
    reasonForRequest: "Eager to contribute high-energy customer support, lead logging, and POS transaction management.",
    cvFile: "David_Vance_Resume.pdf",
    certificateFile: "Humber_College_Diploma.pdf",
    nationalIdFile: "Ontario_ID_Card.png",
    passportFile: "Canada_Passport.png",
    status: "Approved",
    createdAt: "2026-07-08T10:15:00.000Z",
    updatedAt: "2026-07-09T08:00:00.000Z"
  },
  {
    id: "SAT-REQ-1004",
    fullName: "Zahra Al-Fayed",
    dob: "1995-02-14",
    gender: "Female",
    nationality: "Emirati",
    nationalId: "UAE-ID-442144512",
    address: "Marina Heights, Tower A, Flat 9",
    city: "Dubai",
    district: "Dubai",
    country: "United Arab Emirates",
    profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
    phoneNumber: "155998822",
    email: "zahra.fayed@skyautomationtech.com",
    roleRequested: "Warehouse Operator",
    department: "Logistics",
    expectedSalary: 1800,
    experience: "2 Years",
    joiningDate: "2026-08-15",
    reasonForRequest: "Keen interest in logistics scheduling and inventory tracking workflows.",
    cvFile: "Zahra_AlFayed_Logistics.pdf",
    certificateFile: "Dubai_Aviation_Academy_Diploma.pdf",
    nationalIdFile: "Emirates_ID.png",
    passportFile: "UAE_Passport_Bio.png",
    status: "Rejected",
    rejectReason: "Expected salary exceeds regional holding bracket for this job level.",
    createdAt: "2026-07-07T16:00:00.000Z",
    updatedAt: "2026-07-08T11:00:00.000Z"
  }
];

export const AdminReviewView: React.FC = () => {
  const { showNotification, profile } = useAuth();
  
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Setup live listeners & bootstrap mock records if Firestore is blank
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'registration_requests'), async (snap) => {
      let list: RegistrationRequest[] = [];
      snap.forEach(doc => {
        list.push({ ...doc.data() } as RegistrationRequest);
      });

      // Seeding helper: If collection is empty, bootstrap realistic dummy records
      if (list.length === 0) {
        try {
          for (const req of INITIAL_MOCK_REQUESTS) {
            await setDoc(doc(db, 'registration_requests', req.id), req);
          }
          // The onSnapshot will re-trigger with newly added records automatically
        } catch (err) {
          console.error("Failed to seed initial requests:", err);
        }
      } else {
        // Sort by createdAt descending
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(list);
        
        // Auto select first request if none selected
        if (!selectedRequest && list.length > 0) {
          // Find first pending or simply first item
          const firstPending = list.find(r => r.status === 'Pending') || list[0];
          setSelectedRequest(firstPending);
        } else if (selectedRequest) {
          // Sync currently selected request data
          const updatedSelected = list.find(r => r.id === selectedRequest.id);
          if (updatedSelected) setSelectedRequest(updatedSelected);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedRequest]);

  const handleApprove = async (reqId: string) => {
    try {
      const docRef = doc(db, 'registration_requests', reqId);
      await updateDoc(docRef, {
        status: 'Approved',
        updatedAt: new Date().toISOString()
      });
      showNotification('Applicant application request approved successfully.', 'success');
    } catch (err: any) {
      showNotification('Failed to update request: ' + err.message, 'error');
    }
  };

  const handleOpenRejectModal = () => {
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      showNotification('Please specify a rejection reason for compliance auditing.', 'error');
      return;
    }

    try {
      const docRef = doc(db, 'registration_requests', selectedRequest.id);
      await updateDoc(docRef, {
        status: 'Rejected',
        rejectReason: rejectionReason.trim(),
        updatedAt: new Date().toISOString()
      });
      setIsRejectModalOpen(false);
      showNotification('Application rejected. Rejection reasons recorded in applicant log.', 'info');
    } catch (err: any) {
      showNotification('Failed to reject: ' + err.message, 'error');
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
    const matchesRole = roleFilter === 'All' || req.roleRequested === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Calculate statistics
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const rejectedCount = requests.filter(r => r.status === 'Rejected').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* Counters cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0f172a]/30 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Requests</p>
            <h3 className="text-xl font-extrabold text-white mt-1">{totalCount}</h3>
          </div>
          <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/15">
            <Users className="h-5 w-5" />
          </span>
        </div>

        <div className="p-4 bg-[#0f172a]/30 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">Pending Approval</p>
            <h3 className="text-xl font-extrabold text-amber-400 mt-1">{pendingCount}</h3>
          </div>
          <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/15">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </span>
        </div>

        <div className="p-4 bg-[#0f172a]/30 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Approved Profiles</p>
            <h3 className="text-xl font-extrabold text-emerald-400 mt-1">{approvedCount}</h3>
          </div>
          <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
            <Check className="h-5 w-5" />
          </span>
        </div>

        <div className="p-4 bg-[#0f172a]/30 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest font-mono">Rejected Requests</p>
            <h3 className="text-xl font-extrabold text-red-400 mt-1">{rejectedCount}</h3>
          </div>
          <span className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/15">
            <X className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Applicants List queue (8 columns) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Controls Bar */}
          <div className="p-4 bg-[#0f172a]/30 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search legal name, request ID, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2.5 bg-[#050816]/60 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs p-2.5 bg-[#050816]/60 border border-white/5 rounded-xl text-white focus:outline-hidden focus:border-blue-500 font-bold"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending Only</option>
                <option value="Approved">Approved Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs p-2.5 bg-[#050816]/60 border border-white/5 rounded-xl text-white focus:outline-hidden focus:border-blue-500 font-bold"
              >
                <option value="All">All Roles</option>
                <option value="Staff Operator">Staff Operator</option>
                <option value="Warehouse Operator">Warehouse Operator</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Tabular List */}
          <div className="bg-[#0f172a]/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-[#050816]/40 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">
                    <th className="p-4">Applicant ID</th>
                    <th className="p-4">Legal Name</th>
                    <th className="p-4">Role Requested</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500 italic text-xs">
                        No registration requests matching filters found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`text-xs cursor-pointer transition-colors ${
                          selectedRequest?.id === req.id 
                            ? 'bg-blue-500/10 hover:bg-blue-500/15' 
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="p-4 font-mono font-bold text-[11px] text-blue-400">{req.id}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <img src={req.profilePhoto} alt="" className="h-7 w-7 rounded-full object-cover border border-white/10 flex-shrink-0" />
                            <span className="font-bold text-white">{req.fullName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300">{req.roleRequested}</td>
                        <td className="p-4 text-slate-400 font-medium">{req.department}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-mono font-black text-[9px] uppercase border ${
                            req.status === 'Approved'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : req.status === 'Rejected'
                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Applicant details Master-detail (5 columns) */}
        <div className="lg:col-span-5 bg-[#0f172a]/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative space-y-6">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono border-b border-white/5 pb-3">
            Application Details Review
          </h3>

          {selectedRequest ? (
            <div className="space-y-6">
              
              {/* Profile Card Header */}
              <div className="flex gap-4 items-center">
                <img 
                  src={selectedRequest.profilePhoto} 
                  alt={selectedRequest.fullName} 
                  className="h-16 w-16 rounded-full object-cover border-2 border-white/10 shadow-lg shadow-blue-500/10 flex-shrink-0"
                />
                <div>
                  <h4 className="text-md font-bold text-white leading-tight">{selectedRequest.fullName}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">{selectedRequest.email}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">{selectedRequest.phoneNumber}</p>
                </div>
              </div>

              {/* Status and Details parameters */}
              <div className="p-4 bg-[#050816]/60 rounded-xl border border-white/5 space-y-3 font-medium text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Role Requested</span>
                    <strong className="text-white font-bold">{selectedRequest.roleRequested}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Target Department</span>
                    <strong className="text-white font-bold">{selectedRequest.department}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Nationality</span>
                    <strong>{selectedRequest.nationality}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Gender / DOB</span>
                    <strong>{selectedRequest.gender} / {selectedRequest.dob}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Expected Salary</span>
                    <strong className="text-emerald-400 font-bold">${selectedRequest.expectedSalary} / mo</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Experience</span>
                    <strong>{selectedRequest.experience}</strong>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Home Address</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{selectedRequest.address}, {selectedRequest.city}, {selectedRequest.district}, {selectedRequest.country}</p>
                </div>
              </div>

              {/* Cover Letter/Reason */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Statement of Motivation</span>
                <p className="text-[11px] leading-relaxed text-slate-300 bg-[#050816]/30 border border-white/5 p-3 rounded-lg italic">
                  "{selectedRequest.reasonForRequest}"
                </p>
              </div>

              {/* Supporting files triggers */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Compliance Files Attached</span>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div 
                    onClick={() => showNotification(`Simulating download of CV: ${selectedRequest.cvFile}`, 'success')}
                    className="p-2.5 bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-lg flex items-center justify-between text-[10px] cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-bold text-slate-300 truncate">
                      <FileText className="h-4 w-4 text-blue-400" />
                      {selectedRequest.cvFile}
                    </span>
                    <Download className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  </div>

                  <div 
                    onClick={() => showNotification(`Simulating download of Academic Certificate: ${selectedRequest.certificateFile}`, 'success')}
                    className="p-2.5 bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-lg flex items-center justify-between text-[10px] cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-bold text-slate-300 truncate">
                      <FileText className="h-4 w-4 text-blue-400" />
                      {selectedRequest.certificateFile}
                    </span>
                    <Download className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  </div>
                </div>
              </div>

              {/* Rejection log notice if rejected */}
              {selectedRequest.status === 'Rejected' && selectedRequest.rejectReason && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 space-y-1">
                  <span className="font-bold block font-mono text-[9px] uppercase tracking-widest text-red-300">Rejection Reason:</span>
                  <p className="leading-normal italic">"{selectedRequest.rejectReason}"</p>
                </div>
              )}

              {/* Approved status notice */}
              {selectedRequest.status === 'Approved' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400">
                  <UserCheck className="h-5 w-5" />
                  <div>
                    <span className="font-bold">Application Approved</span>
                    <p className="text-[10px] text-emerald-500/80 leading-tight">Account profile activated and database logs updated.</p>
                  </div>
                </div>
              )}

              {/* Action buttons (only if Pending) */}
              {selectedRequest.status === 'Pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve Application</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenRejectModal}
                    className="flex-1 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/25 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject Request</span>
                  </button>
                </div>
              )}

              {/* Timeline Log */}
              <div className="border-t border-white/5 pt-4 space-y-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Workflow Review Timeline</span>
                <div className="relative border-l border-white/5 pl-4 space-y-3 text-[10px]">
                  <div className="relative">
                    <div className="absolute -left-[20px] top-0.5 h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-slate-400 block font-bold font-mono text-[9px]">{new Date(selectedRequest.createdAt).toLocaleDateString()}</span>
                    <span className="text-slate-200">Application request registered via onboarding portal.</span>
                  </div>

                  {selectedRequest.status !== 'Pending' && (
                    <div className="relative">
                      <div className={`absolute -left-[20px] top-0.5 h-2 w-2 rounded-full ${
                        selectedRequest.status === 'Approved' ? 'bg-emerald-500' : 'bg-red-500'
                      }`} />
                      <span className="text-slate-400 block font-bold font-mono text-[9px]">{new Date(selectedRequest.updatedAt).toLocaleDateString()}</span>
                      <span className="text-slate-200">
                        {selectedRequest.status === 'Approved' 
                          ? 'Review finalized. Corporate profile activated in database.' 
                          : 'Review finalized. Rejected based on compliance check.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs italic">
              Please select an applicant from the registration list.
            </div>
          )}

        </div>
      </div>

      {/* Reject Reason input dialog modal */}
      {isRejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <X className="h-4 w-4 text-red-500" />
                <span>Specify Rejection Reason</span>
              </h4>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                You are rejecting the registration application of <strong className="text-white">{selectedRequest.fullName}</strong>.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Rejection Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Expected salary exceeds regional limits / CV does not match holding requirements..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-hidden focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
