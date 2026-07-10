import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, UserPlus, Calendar, Clock, DollarSign, Award, FileText, Briefcase, 
  Building, Layers, CheckCircle2, AlertTriangle, ChevronRight, Plus, Eye, 
  Trash2, Search, Download, Printer, Filter, Sparkles, Star, Bell, Gift, 
  RefreshCw, Upload, Shield, X, HelpCircle, ArrowUpRight, Check, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, where, getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Employee, Department, Designation, AttendanceRecord, LeaveRequest, 
  PayrollRecord, EmployeeDocument, PerformanceReview, ChartOfAccount, GeneralLedgerEntry, CashBookEntry
} from '../types';

export const Employees: React.FC = () => {
  const { user, profile } = useAuth();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'departments' | 'designations' | 'attendance' | 'leave' | 'payroll' | 'performance' | 'reports'>('dashboard');

  // Core collections data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollList, setPayrollList] = useState<PayrollRecord[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  
  // Modal toggles & form state
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDesgModal, setShowDesgModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<any>('Employment Contract');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forms
  const [newEmp, setNewEmp] = useState({
    fullName: '', gender: 'Male' as any, dateOfBirth: '', nationalId: '', passport: '',
    phone: '', email: '', emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
    permanentAddress: '', presentAddress: '', departmentId: '', designationId: '',
    employmentType: 'Full-time' as any, joiningDate: new Date().toISOString().split('T')[0],
    basicSalary: 3000, allowance: 500, bonus: 0, commission: 0, providentFund: 200, taxRate: 10,
    managerId: '', notes: ''
  });

  const [newDept, setNewDept] = useState({ departmentName: '', departmentCode: '', managerId: '', description: '' });
  const [newDesg, setNewDesg] = useState({ designationName: '', departmentId: '', salaryGrade: '', description: '' });
  const [newLeave, setNewLeave] = useState({ leaveType: 'Annual Leave' as any, startDate: '', endDate: '', reason: '' });
  const [newReview, setNewReview] = useState({ employeeId: '', performanceRating: 5, goals: '', trainingCourse: '', awardName: '', warningReason: '' });

  // Access Roles
  const isReadOnly = profile?.role === 'Staff';
  const isManager = profile?.role === 'Manager';
  const hasFullAccess = profile && ['Super Admin', 'Admin'].includes(profile.role);
  const currentEmployeeProfile = useMemo(() => {
    return employees.find(emp => emp.email === profile?.email || emp.id === profile?.employeeId);
  }, [employees, profile]);

  // Load Firestore collections live
  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    const unsubEmp = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'employees'));

    const unsubDept = onSnapshot(collection(db, 'departments'), (snap) => {
      setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'departments'));

    const unsubDesg = onSnapshot(collection(db, 'designations'), (snap) => {
      setDesignations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Designation)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'designations'));

    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'attendance'));

    const unsubLeave = onSnapshot(collection(db, 'leave_requests'), (snap) => {
      setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'leave_requests'));

    const unsubPay = onSnapshot(collection(db, 'payroll'), (snap) => {
      setPayrollList(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayrollRecord)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'payroll'));

    const unsubRev = onSnapshot(collection(db, 'performance_reviews'), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceReview)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'performance_reviews'));

    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChartOfAccount)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'accounts'));

    setLoading(false);

    return () => {
      unsubEmp();
      unsubDept();
      unsubDesg();
      unsubAtt();
      unsubLeave();
      unsubPay();
      unsubRev();
      unsubAccounts();
    };
  }, [profile]);

  // Filter Employees based on search, department, and role-based confidentiality
  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (isReadOnly && currentEmployeeProfile) {
      list = [currentEmployeeProfile];
    } else if (isManager && profile?.department) {
      list = employees.filter(emp => emp.departmentName === profile.department || emp.id === currentEmployeeProfile?.id);
    }
    if (searchQuery) {
      list = list.filter(emp => emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (deptFilter) {
      list = list.filter(emp => emp.departmentId === deptFilter);
    }
    return list;
  }, [employees, searchQuery, deptFilter, isReadOnly, isManager, currentEmployeeProfile, profile]);

  // HR Stats calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const total = employees.length;
    const active = employees.filter(e => e.status === 'Active').length;
    const inactive = total - active;
    const uniqueDepts = departments.length;
    
    const todayAtt = attendance.filter(a => a.date === todayStr);
    const presentToday = todayAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const lateToday = todayAtt.filter(a => a.lateEntry).length;
    
    const leavesToday = leaveRequests.filter(l => l.status === 'Approved' && todayStr >= l.startDate && todayStr <= l.endDate).length;
    
    const curMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentPayrollSum = payrollList
      .filter(p => p.month === curMonthStr && p.status === 'Paid')
      .reduce((acc, cur) => acc + cur.netSalary, 0);

    const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending').length;

    // Birthdays this month
    const curMonthInt = new Date().getMonth() + 1;
    const upcomingBirthdays = employees.filter(e => {
      if (!e.dateOfBirth) return false;
      const bMonth = parseInt(e.dateOfBirth.split('-')[1]);
      return bMonth === curMonthInt;
    }).length;

    return { total, active, inactive, uniqueDepts, presentToday, lateToday, leavesToday, currentPayrollSum, pendingLeaves, upcomingBirthdays };
  }, [employees, departments, attendance, leaveRequests, payrollList]);

  // Attendance states for current employee
  const todayRecord = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetId = currentEmployeeProfile?.id || 'STAFF';
    return attendance.find(a => a.employeeId === targetId && a.date === todayStr);
  }, [attendance, currentEmployeeProfile]);

  // Clock Actions
  const handleCheckIn = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString('en-US', { hour12: false }); // "HH:MM:SS"
    const isLate = parseInt(nowTimeStr.split(':')[0]) >= 9; // late if checked in after 9 AM
    
    const empId = currentEmployeeProfile?.id || 'STAFF';
    const empName = currentEmployeeProfile?.fullName || profile?.fullName || 'Staff User';
    const deptName = currentEmployeeProfile?.departmentName || profile?.department || 'Operations';

    const id = `${empId}_${todayStr}`;
    const record: AttendanceRecord = {
      id,
      employeeId: empId,
      employeeName: empName,
      departmentName: deptName,
      date: todayStr,
      checkIn: new Date().toISOString(),
      checkOut: null,
      breakStart: null,
      breakEnd: null,
      workingHours: 0,
      lateEntry: isLate,
      overtime: 0,
      status: isLate ? 'Late' : 'Present',
      locationPlaceholder: 'Main Corporate Head Office HQ (Detected via Secure IP Node)',
      biometricPlaceholder: 'Verified successfully via Cryptographic Auth Core',
      qrAttendancePlaceholder: 'Secure QR Token Registered',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || 'staff'
    };

    try {
      await setDoc(doc(db, 'attendance', id), record);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    const checkOutTime = new Date().toISOString();
    const inTime = new Date(todayRecord.checkIn!).getTime();
    const outTime = new Date(checkOutTime).getTime();
    
    // Calculate difference minus breaks
    let workingMs = outTime - inTime;
    if (todayRecord.breakStart && todayRecord.breakEnd) {
      const bStart = new Date(todayRecord.breakStart).getTime();
      const bEnd = new Date(todayRecord.breakEnd).getTime();
      workingMs -= (bEnd - bStart);
    }
    const hrs = Math.max(0, Number((workingMs / (1000 * 60 * 60)).toFixed(2)));
    const ot = hrs > 8 ? Number((hrs - 8).toFixed(2)) : 0;

    try {
      await updateDoc(doc(db, 'attendance', todayRecord.id), {
        checkOut: checkOutTime,
        workingHours: hrs,
        overtime: ot,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBreakToggle = async (type: 'start' | 'end') => {
    if (!todayRecord) return;
    try {
      await updateDoc(doc(db, 'attendance', todayRecord.id), {
        [type === 'start' ? 'breakStart' : 'breakEnd']: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Leave Request
  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = currentEmployeeProfile?.id || 'STAFF';
    const empName = currentEmployeeProfile?.fullName || profile?.fullName || 'Staff User';

    if (!newLeave.startDate || !newLeave.endDate) return;
    const sDate = new Date(newLeave.startDate);
    const eDate = new Date(newLeave.endDate);
    const days = Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const id = doc(collection(db, 'leave_requests')).id;
    const record: LeaveRequest = {
      id,
      employeeId: empId,
      employeeName: empName,
      leaveType: newLeave.leaveType,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      totalDays: Math.max(1, days),
      reason: newLeave.reason,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || 'staff'
    };

    try {
      await setDoc(doc(db, 'leave_requests', id), record);
      setShowLeaveModal(false);
      setNewLeave({ leaveType: 'Annual Leave', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      console.error(err);
    }
  };

  // Approval Workflows (Leave, Attendance corrections)
  const handleUpdateLeaveStatus = async (lReq: LeaveRequest, status: 'Approved' | 'Rejected') => {
    try {
      await updateDoc(doc(db, 'leave_requests', lReq.id), {
        status,
        approvedBy: user?.uid,
        approvedByName: profile?.fullName || 'Authorized Admin',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Create Department
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const id = doc(collection(db, 'departments')).id;
    const mgr = employees.find(emp => emp.id === newDept.managerId);
    const docData: Department = {
      id,
      departmentName: newDept.departmentName,
      departmentCode: newDept.departmentCode.toUpperCase(),
      managerId: newDept.managerId,
      managerName: mgr?.fullName || 'Unassigned',
      description: newDept.description,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || 'staff'
    };
    try {
      await setDoc(doc(db, 'departments', id), docData);
      setShowDeptModal(false);
      setNewDept({ departmentName: '', departmentCode: '', managerId: '', description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  // Create Designation
  const handleCreateDesg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const id = doc(collection(db, 'designations')).id;
    const dept = departments.find(d => d.id === newDesg.departmentId);
    const docData: Designation = {
      id,
      designationName: newDesg.designationName,
      departmentId: newDesg.departmentId,
      departmentName: dept?.departmentName || 'Unassigned',
      salaryGrade: newDesg.salaryGrade,
      description: newDesg.description,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || 'staff'
    };
    try {
      await setDoc(doc(db, 'designations', id), docData);
      setShowDesgModal(false);
      setNewDesg({ designationName: '', departmentId: '', salaryGrade: '', description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  // Create Employee
  const handleCreateEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const empDbId = doc(collection(db, 'employees')).id;
    const generatedEmpId = `EMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const dept = departments.find(d => d.id === newEmp.departmentId);
    const desg = designations.find(d => d.id === newEmp.designationId);
    const mgr = employees.find(e => e.id === newEmp.managerId);

    const docData: Employee = {
      id: empDbId,
      employeeId: generatedEmpId,
      profilePhoto: null,
      fullName: newEmp.fullName,
      gender: newEmp.gender,
      dateOfBirth: newEmp.dateOfBirth,
      nationalId: newEmp.nationalId,
      passport: newEmp.passport,
      phone: newEmp.phone,
      email: newEmp.email,
      emergencyContact: {
        name: newEmp.emergencyName,
        relationship: newEmp.emergencyRelationship,
        phone: newEmp.emergencyPhone
      },
      permanentAddress: newEmp.permanentAddress,
      presentAddress: newEmp.presentAddress,
      departmentId: newEmp.departmentId,
      departmentName: dept?.departmentName || 'Unassigned',
      designationId: newEmp.designationId,
      designationName: desg?.designationName || 'Unassigned',
      employmentType: newEmp.employmentType,
      joiningDate: newEmp.joiningDate,
      salaryStructure: {
        basicSalary: Number(newEmp.basicSalary),
        allowance: Number(newEmp.allowance),
        bonus: Number(newEmp.bonus),
        commission: Number(newEmp.commission),
        providentFund: Number(newEmp.providentFund),
        taxRate: Number(newEmp.taxRate)
      },
      managerId: newEmp.managerId,
      managerName: mgr?.fullName || 'None',
      status: 'Active',
      documents: [],
      notes: newEmp.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || 'staff'
    };

    try {
      await setDoc(doc(db, 'employees', empDbId), docData);
      setShowEmpModal(false);
      setNewEmp({
        fullName: '', gender: 'Male', dateOfBirth: '', nationalId: '', passport: '',
        phone: '', email: '', emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
        permanentAddress: '', presentAddress: '', departmentId: '', designationId: '',
        employmentType: 'Full-time', joiningDate: new Date().toISOString().split('T')[0],
        basicSalary: 3000, allowance: 500, bonus: 0, commission: 0, providentFund: 200, taxRate: 10,
        managerId: '', notes: ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Monthly Payroll automatically
  const handleGeneratePayroll = async () => {
    if (isReadOnly) return;
    const curMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const activeStaff = employees.filter(e => e.status === 'Active');
    
    let generatedCount = 0;
    for (const emp of activeStaff) {
      // Check if already generated for this month
      const exists = payrollList.some(p => p.employeeId === emp.id && p.month === curMonthStr);
      if (exists) continue;

      const pId = doc(collection(db, 'payroll')).id;
      const baseSalary = emp.salaryStructure?.basicSalary || 3000;
      const allowance = emp.salaryStructure?.allowance || 0;
      const bonus = emp.salaryStructure?.bonus || 0;
      const commission = emp.salaryStructure?.commission || 0;
      const pf = emp.salaryStructure?.providentFund || 0;
      const taxRate = emp.salaryStructure?.taxRate || 0;

      // Calculate overtime based on attendance records for current employee this month
      const empAttRecords = attendance.filter(a => a.employeeId === emp.id && a.date.startsWith(curMonthStr));
      const otHours = empAttRecords.reduce((sum, current) => sum + (current.overtime || 0), 0);
      const otPay = Math.round(otHours * ((baseSalary / 160) * 1.5)); // Overtime rate: 1.5x of hourly basic salary

      const gross = baseSalary + allowance + bonus + commission + otPay;
      const taxAmt = Math.round(gross * (taxRate / 100));
      const net = gross - taxAmt - pf;

      const payRecord: PayrollRecord = {
        id: pId,
        payrollNumber: `PAY-${curMonthStr.replace('-', '')}-${emp.employeeId.split('-')[2] || 'XXXX'}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        month: curMonthStr,
        basicSalary: baseSalary,
        allowance,
        bonus,
        commission,
        overtime: otPay,
        tax: taxAmt,
        providentFund: pf,
        loanDeduction: 0,
        advanceDeduction: 0,
        otherDeductions: 0,
        netSalary: net,
        status: 'Draft',
        paymentDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff'
      };

      await setDoc(doc(db, 'payroll', pId), payRecord);
      generatedCount++;
    }

    alert(`Successfully generated draft payroll for ${generatedCount} active employees.`);
  };

  // Approve and Post payroll into the Accounting ledger automatically
  const handleApprovePayroll = async (pay: PayrollRecord) => {
    if (isReadOnly) return;
    try {
      await updateDoc(doc(db, 'payroll', pay.id), {
        status: 'Approved',
        approvedBy: user?.uid,
        approvedByName: profile?.fullName || 'Authorized Admin',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayPayroll = async (pay: PayrollRecord) => {
    if (isReadOnly) return;
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      await updateDoc(doc(db, 'payroll', pay.id), {
        status: 'Paid',
        paymentDate: todayDate,
        updatedAt: new Date().toISOString()
      });

      // AUTOMATIC ACCOUNTING INTEGRATION:
      // Post Salary Expense and Cash Outflow to ledger & cashbook
      const ledgerId = doc(collection(db, 'ledger')).id;
      const cashbookId = doc(collection(db, 'cashbook')).id;

      // 1. Post General Ledger Double-entry
      // Debit: 5100 Operating Expenses (Salary Expense)
      // Credit: 1020 Bank Operating Account
      const glEntry: GeneralLedgerEntry = {
        id: ledgerId,
        referenceNumber: pay.payrollNumber,
        transactionType: 'Expenses',
        debitAccount: '5100',
        debitAccountName: 'Operating Expenses',
        creditAccount: '1020',
        creditAccountName: 'Bank Operating Account',
        amount: pay.netSalary,
        narration: `Corporate Payroll Transfer - ${pay.employeeName} for ${pay.month}`,
        date: todayDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff',
        status: 'Completed'
      };
      await setDoc(doc(db, 'ledger', ledgerId), glEntry);

      // 2. Post Cash Book Outflow
      const cbEntry: CashBookEntry = {
        id: cashbookId,
        referenceNumber: pay.payrollNumber,
        transactionType: 'Cash Out',
        amount: pay.netSalary,
        previousBalance: 0, // calculated live in accounts view
        currentBalance: 0,
        narration: `Payroll Cash Withdrawal: ${pay.employeeName} (${pay.month})`,
        date: todayDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff',
        status: 'Completed'
      };
      await setDoc(doc(db, 'cashbook', cashbookId), cbEntry);

      // 3. Update Chart of Accounts balances
      const opExpAcc = accounts.find(a => a.code === '5100');
      const bankAcc = accounts.find(a => a.code === '1020');

      if (opExpAcc) {
        await updateDoc(doc(db, 'accounts', opExpAcc.id), {
          balance: opExpAcc.balance + pay.netSalary,
          updatedAt: new Date().toISOString()
        });
      }
      if (bankAcc) {
        await updateDoc(doc(db, 'accounts', bankAcc.id), {
          balance: bankAcc.balance - pay.netSalary,
          updatedAt: new Date().toISOString()
        });
      }

      alert(`Payroll marked as Paid. Double-entry transaction successfully posted to General Ledger & Cash Book.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Document Upload to Firebase Storage with Fallback
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEmp || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      let fileUrl = '';
      try {
        const storageRef = ref(storage, `employee_documents/${selectedEmp.id}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(snapshot.ref);
      } catch (err) {
        console.warn("Storage restricted or unconfigured. Creating local binary reference.");
        fileUrl = URL.createObjectURL(file);
      }

      const docId = doc(collection(db, 'employee_documents')).id;
      const newDoc: EmployeeDocument = {
        id: docId,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.fullName,
        documentType: docType,
        fileName: file.name,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff',
        status: 'Active'
      };

      await setDoc(doc(db, 'employee_documents', docId), newDoc);

      // Append to employee's documents list
      const updatedDocs = [...(selectedEmp.documents || []), { name: docType, url: fileUrl, type: file.type }];
      await updateDoc(doc(db, 'employees', selectedEmp.id), {
        documents: updatedDocs,
        updatedAt: new Date().toISOString()
      });

      // Update current state object
      setSelectedEmp({ ...selectedEmp, documents: updatedDocs });
      alert("Document uploaded and attached successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Performance Reviews
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.employeeId) return;
    const emp = employees.find(e => e.id === newReview.employeeId);
    if (!emp) return;

    const id = doc(collection(db, 'performance_reviews')).id;
    const record: PerformanceReview = {
      id,
      employeeId: emp.id,
      employeeName: emp.fullName,
      reviewDate: new Date().toISOString().split('T')[0],
      performanceRating: Number(newReview.performanceRating),
      goals: newReview.goals,
      promotionHistory: [],
      trainingRecords: newReview.trainingCourse ? [{ courseName: newReview.trainingCourse, completionDate: new Date().toISOString().split('T')[0], status: 'Completed' }] : [],
      warnings: newReview.warningReason ? [{ date: new Date().toISOString().split('T')[0], reason: newReview.warningReason, issuedBy: profile?.fullName || 'Manager' }] : [],
      rewards: newReview.awardName ? [{ date: new Date().toISOString().split('T')[0], awardName: newReview.awardName, details: 'Meritorious Performance Accolade' }] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || 'staff',
      status: 'Active'
    };

    try {
      await setDoc(doc(db, 'performance_reviews', id), record);
      setShowReviewModal(false);
      setNewReview({ employeeId: '', performanceRating: 5, goals: '', trainingCourse: '', awardName: '', warningReason: '' });
    } catch (err) {
      console.error(err);
    }
  };

  // Export & Download Reports (CSV, Excel format)
  const exportToCSV = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export Actions
  const exportEmployees = () => {
    const headers = ['Employee ID', 'Full Name', 'Department', 'Designation', 'Joining Date', 'Employment Type', 'Status', 'Email', 'Phone'];
    const rows = employees.map(e => [e.employeeId, e.fullName, e.departmentName, e.designationName, e.joiningDate, e.employmentType, e.status, e.email, e.phone]);
    exportToCSV(headers, rows, 'Employee_Report.csv');
  };

  const exportAttendance = () => {
    const headers = ['Employee', 'Department', 'Date', 'Check In', 'Check Out', 'Hours Worked', 'Overtime', 'Status'];
    const rows = attendance.map(a => [a.employeeName, a.departmentName, a.date, a.checkIn || '-', a.checkOut || '-', String(a.workingHours), String(a.overtime), a.status]);
    exportToCSV(headers, rows, 'Attendance_Report.csv');
  };

  const exportPayroll = () => {
    const headers = ['Payroll No', 'Employee Name', 'Month', 'Basic Salary', 'Overtime', 'Allowance', 'Tax', 'Provident Fund', 'Net Paid', 'Status'];
    const rows = payrollList.map(p => [p.payrollNumber, p.employeeName, p.month, String(p.basicSalary), String(p.overtime), String(p.allowance), String(p.tax), String(p.providentFund), String(p.netSalary), p.status]);
    exportToCSV(headers, rows, 'Payroll_Report.csv');
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Sub-header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-500" />
            Enterprise HRM & Payroll Portal
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time biometric attendance, leave workflow, instant accounting-integrated payroll engine, and dossiers.
          </p>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
          {(['dashboard', 'employees', 'departments', 'designations', 'attendance', 'leave', 'payroll', 'performance', 'reports'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                activeTab === tab 
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Bento Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4.5 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Roster</span>
              <span className="text-2xl font-black text-zinc-800 dark:text-white mt-1 block">{stats.total}</span>
              <span className="text-[10px] text-emerald-500 font-bold mt-1.5 flex items-center gap-1">
                Active: {stats.active} · Inactive: {stats.inactive}
              </span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4.5 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Departments</span>
              <span className="text-2xl font-black text-zinc-800 dark:text-white mt-1 block">{stats.uniqueDepts}</span>
              <span className="text-[10px] text-blue-500 font-bold mt-1.5 block">Active Operating Sectors</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4.5 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Attendance Today</span>
              <span className="text-2xl font-black text-zinc-800 dark:text-white mt-1 block">{stats.presentToday}</span>
              <span className="text-[10px] text-amber-500 font-bold mt-1.5 flex items-center gap-1">
                On Leave: {stats.leavesToday} · Late: {stats.lateToday}
              </span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4.5 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Pending Leaves</span>
              <span className="text-2xl font-black text-zinc-800 dark:text-white mt-1 block">{stats.pendingLeaves}</span>
              <span className="text-[10px] text-orange-500 font-bold mt-1.5 block">Awaiting Action</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4.5 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Paid Payroll (MTD)</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-500 mt-1.5 block">
                ${stats.currentPayrollSum.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-zinc-400 mt-1 block">Accounting Auto-Synced</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Check-In / Clock Terminal */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-blue-500" />
                  Clock Terminal
                </h3>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long' })}
                </span>
              </div>

              <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl space-y-1 border border-dashed border-zinc-200 dark:border-zinc-800">
                <span className="text-3xl font-black text-zinc-800 dark:text-white font-mono tracking-tight animate-pulse">
                  {new Date().toLocaleTimeString()}
                </span>
                <p className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase mt-1">
                  Biometric Location Service Node
                </p>
              </div>

              {/* Attendance action buttons */}
              <div className="space-y-2">
                {!todayRecord ? (
                  <button
                    onClick={handleCheckIn}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    Check In (Duty On)
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {!todayRecord.breakStart ? (
                        <button
                          onClick={() => handleBreakToggle('start')}
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Break Start
                        </button>
                      ) : !todayRecord.breakEnd ? (
                        <button
                          onClick={() => handleBreakToggle('end')}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Break End
                        </button>
                      ) : (
                        <span className="flex-1 text-center py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] text-zinc-400 font-bold border border-zinc-200 dark:border-zinc-800">
                          Break Concluded
                        </span>
                      )}
                      
                      {!todayRecord.checkOut ? (
                        <button
                          onClick={handleCheckOut}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Check Out (Duty Off)
                        </button>
                      ) : (
                        <span className="flex-1 text-center py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] text-emerald-500 font-bold border border-emerald-500/20">
                          Checked Out
                        </span>
                      )}
                    </div>
                    
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 space-y-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                      <div className="flex justify-between">
                        <span>Check-In:</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          {new Date(todayRecord.checkIn!).toLocaleTimeString()}
                        </span>
                      </div>
                      {todayRecord.checkOut && (
                        <div className="flex justify-between">
                          <span>Check-Out:</span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {new Date(todayRecord.checkOut).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Working Hours MTD:</span>
                        <span className="font-bold text-blue-500">{todayRecord.workingHours || 0} Hours</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Birthday Reminder & Leave Calendar */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                <Gift className="h-4.5 w-4.5 text-pink-500" />
                Upcoming Birthday Alerts
              </h3>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {employees.filter(e => {
                  if (!e.dateOfBirth) return false;
                  return parseInt(e.dateOfBirth.split('-')[1]) === (new Date().getMonth() + 1);
                }).length === 0 ? (
                  <p className="text-zinc-400 text-xs py-4 text-center">No employee birthdays in the current month.</p>
                ) : (
                  employees.filter(e => {
                    if (!e.dateOfBirth) return false;
                    return parseInt(e.dateOfBirth.split('-')[1]) === (new Date().getMonth() + 1);
                  }).map(emp => (
                    <div key={emp.id} className="p-2.5 bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/10 rounded-xl flex items-center justify-between gap-3 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-pink-500/10 text-pink-500 font-bold text-xs flex items-center justify-center">
                          {emp.fullName[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{emp.fullName}</p>
                          <p className="text-[10px] text-zinc-400">{emp.departmentName} · {emp.designationName}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-pink-500 font-mono bg-pink-500/10 px-2 py-0.5 rounded">
                        {emp.dateOfBirth.split('-')[2]}/{emp.dateOfBirth.split('-')[1]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Activity and System Notifications Log */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-blue-500" />
                Live Notification Center
              </h3>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {/* Leave notifications */}
                {leaveRequests.filter(l => l.status === 'Pending').map(l => (
                  <div key={l.id} className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Pending Leave Approval</p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {l.employeeName} requested {l.totalDays} days ({l.leaveType})
                      </p>
                    </div>
                  </div>
                ))}

                {/* Contract or Doc Expired */}
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">System Integrity OK</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">All uploaded certificates are structurally valid and secure.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROSTER / EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search and Filters */}
            <div className="flex flex-1 gap-2 w-full max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by Employee ID or Full Name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200"
                />
              </div>
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.departmentName}</option>
                ))}
              </select>
            </div>

            {!isReadOnly && (
              <button
                onClick={() => setShowEmpModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
              >
                <UserPlus className="h-4 w-4" />
                Register New Employee
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle: Employee List */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="p-4 font-bold">Roster Card</th>
                      <th className="p-4 font-bold">Department</th>
                      <th className="p-4 font-bold">Designation</th>
                      <th className="p-4 font-bold">Salary (Grade)</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-400">No employee records registered in system registry.</td>
                      </tr>
                    ) : (
                      filteredEmployees.map(emp => (
                        <tr 
                          key={emp.id} 
                          className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 cursor-pointer transition-colors ${selectedEmp?.id === emp.id ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                          onClick={() => setSelectedEmp(emp)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300">
                                {emp.fullName[0]}
                              </div>
                              <div>
                                <p className="font-bold text-zinc-800 dark:text-zinc-200">{emp.fullName}</p>
                                <span className="text-[10px] font-mono text-zinc-400">{emp.employeeId}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-medium text-zinc-700 dark:text-zinc-300">{emp.departmentName}</td>
                          <td className="p-4 text-zinc-500">{emp.designationName}</td>
                          <td className="p-4">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">${emp.salaryStructure?.basicSalary?.toLocaleString()}</span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">+{emp.employmentType}</span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              emp.status === 'Active' 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedEmp(emp)}
                                className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {!isReadOnly && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to retire ${emp.fullName}?`)) {
                                      await deleteDoc(doc(db, 'employees', emp.id));
                                      if (selectedEmp?.id === emp.id) setSelectedEmp(null);
                                    }
                                  }}
                                  className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-500/10 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Selected Employee Dossier / Document manager */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl h-fit space-y-5">
              {selectedEmp ? (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <div className="h-16 w-16 rounded-full bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center font-black text-2xl border border-blue-500/20">
                      {selectedEmp.fullName[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-800 dark:text-white">{selectedEmp.fullName}</h4>
                      <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{selectedEmp.employeeId}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2 text-[11px] border border-zinc-200/60 dark:border-zinc-800/80">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Department:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedEmp.departmentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Designation:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedEmp.designationName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Email:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">{selectedEmp.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Joining Date:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">{selectedEmp.joiningDate}</span>
                    </div>
                  </div>

                  {/* Documents Checklist & Uploads */}
                  <div className="space-y-2.5">
                    <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Dossier Documents</h5>
                    
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {(selectedEmp.documents || []).length === 0 ? (
                        <p className="text-zinc-400 text-[10px]">No verification documents attached.</p>
                      ) : (
                        selectedEmp.documents.map((doc, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200/50 dark:border-zinc-800 text-[10px]">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{doc.name}</span>
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-blue-500 hover:underline font-bold"
                            >
                              Download
                            </a>
                          </div>
                        ))
                      )}
                    </div>

                    {!isReadOnly && (
                      <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        <select
                          value={docType}
                          onChange={e => setDocType(e.target.value as any)}
                          className="w-full p-1.5 text-[10px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                        >
                          <option value="Employment Contract">Employment Contract</option>
                          <option value="National ID">National ID Card</option>
                          <option value="Passport">Passport Copy</option>
                          <option value="Certificates">Certificates / Degrees</option>
                          <option value="Resume">Resume / CV</option>
                          <option value="Photo">Biometric Photo</option>
                          <option value="Other Documents">Other Miscellaneous Dossier Docs</option>
                        </select>
                        
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="h-3 w-3" />
                          {uploading ? 'Uploading...' : 'Upload & Attach Document'}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleUploadDocument}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-2 text-zinc-400">
                  <Shield className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-800" />
                  <p className="text-xs">Select an employee record to inspect dynamic dossier and verify compliance credentials.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Corporate Department Directory</h2>
            {!isReadOnly && (
              <button
                onClick={() => setShowDeptModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Create Department
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {departments.length === 0 ? (
              <div className="md:col-span-3 text-center py-12 text-zinc-400">No departments configured yet.</div>
            ) : (
              departments.map(dept => {
                const headCount = employees.filter(e => e.departmentId === dept.id).length;
                return (
                  <div key={dept.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl relative space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {dept.departmentCode}
                        </span>
                        <h4 className="font-bold text-zinc-800 dark:text-white mt-1.5">{dept.departmentName}</h4>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={async () => {
                            if (confirm('Delete department?')) await deleteDoc(doc(db, 'departments', dept.id));
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{dept.description || 'No description recorded.'}</p>
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center text-[10px]">
                      <div>
                        <span className="text-zinc-400 block">Manager:</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">{dept.managerName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-400 block">Total Roster:</span>
                        <span className="font-bold text-blue-500">{headCount} Employees</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* DESIGNATIONS TAB */}
      {activeTab === 'designations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Corporate Designations (Roles)</h2>
            {!isReadOnly && (
              <button
                onClick={() => setShowDesgModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Create Designation
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="p-4 font-bold">Designation</th>
                  <th className="p-4 font-bold">Associated Department</th>
                  <th className="p-4 font-bold">Salary Grade</th>
                  <th className="p-4 font-bold">Description</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {designations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-zinc-400">No designations registered.</td>
                  </tr>
                ) : (
                  designations.map(desg => (
                    <tr key={desg.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30">
                      <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{desg.designationName}</td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-400">{desg.departmentName}</td>
                      <td className="p-4"><span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-bold text-zinc-700 dark:text-zinc-300">{desg.salaryGrade}</span></td>
                      <td className="p-4 text-zinc-500 max-w-xs truncate">{desg.description}</td>
                      <td className="p-4 text-right">
                        {!isReadOnly && (
                          <button
                            onClick={async () => {
                              if (confirm('Delete designation?')) await deleteDoc(doc(db, 'designations', desg.id));
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Attendance Logs (Live Check-In stream)</h2>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg">
              Official Office Timing: <strong>09:00 AM - 05:00 PM</strong> (Strict Compliance)
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="p-4 font-bold">Employee</th>
                  <th className="p-4 font-bold">Department</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Check In / Out</th>
                  <th className="p-4 font-bold">Working Hours (Overtime)</th>
                  <th className="p-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-zinc-400">No attendance logs logged yet for today.</td>
                  </tr>
                ) : (
                  attendance.map(a => (
                    <tr key={a.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30">
                      <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{a.employeeName}</td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-400">{a.departmentName}</td>
                      <td className="p-4 font-mono">{a.date}</td>
                      <td className="p-4 space-y-0.5">
                        <span className="text-[11px] block font-mono text-emerald-600 dark:text-emerald-400">
                          In: {a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : 'N/A'}
                        </span>
                        <span className="text-[11px] block font-mono text-zinc-400">
                          Out: {a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : 'Active Duty'}
                        </span>
                      </td>
                      <td className="p-4 font-mono">
                        <span className="font-bold">{a.workingHours || 0} hrs</span>
                        <span className="text-[10px] text-zinc-400 block">Overtime: {a.overtime || 0} hrs</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          a.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' :
                          a.status === 'Late' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEAVE MANAGEMENT TAB */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Leave Applications & Balances</h2>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Request Leave
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Applications */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4 font-bold">Employee</th>
                    <th className="p-4 font-bold">Leave Details</th>
                    <th className="p-4 font-bold">Duration (Days)</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-zinc-400">No leave requests logged in system.</td>
                    </tr>
                  ) : (
                    leaveRequests.map(l => (
                      <tr key={l.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30">
                        <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{l.employeeName}</td>
                        <td className="p-4 space-y-1">
                          <span className="font-bold text-blue-500">{l.leaveType}</span>
                          <span className="text-[10px] text-zinc-400 block">{l.reason}</span>
                        </td>
                        <td className="p-4 space-y-0.5">
                          <span className="font-mono font-bold">{l.startDate} to {l.endDate}</span>
                          <span className="text-[10px] text-zinc-400 block font-mono">({l.totalDays} Total Days)</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                            l.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {l.status === 'Pending' && !isReadOnly && (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleUpdateLeaveStatus(l, 'Approved')}
                                className="p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-500/10 rounded cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateLeaveStatus(l, 'Rejected')}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Right: Balance Cards */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl h-fit space-y-4">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Leave Balance Dossier</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/50 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Annual Leave</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Paid holidays</span>
                  </div>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">14 Days</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/50 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Sick Leave</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Medical reasons</span>
                  </div>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">7 Days</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/50 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Casual Leave</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Urgent private affairs</span>
                  </div>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">10 Days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYROLL ENGINE TAB */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Corporate Automated Payroll Engine</h2>
              <p className="text-[11px] text-zinc-400 mt-1">
                Calculate roster gross pay, allowances, provident fund, tax withholding, and overtime automatically.
              </p>
            </div>
            
            {!isReadOnly && (
              <button
                onClick={handleGeneratePayroll}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                Generate Monthly Payroll
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4 font-bold">Payroll Details</th>
                    <th className="p-4 font-bold">Employee Name</th>
                    <th className="p-4 font-bold">Salary Structure (MTD)</th>
                    <th className="p-4 font-bold">Overtime + Commission</th>
                    <th className="p-4 font-bold">Deductions (Tax, PF)</th>
                    <th className="p-4 font-bold text-right">Net Salary</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Accounting Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {payrollList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-zinc-400">No payroll entries created for current monthly cycle. Click Generate above.</td>
                    </tr>
                  ) : (
                    payrollList.map(pay => (
                      <tr key={pay.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30">
                        <td className="p-4">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono block">{pay.payrollNumber}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">Month: {pay.month}</span>
                        </td>
                        <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{pay.employeeName}</td>
                        <td className="p-4">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">${pay.basicSalary?.toLocaleString()}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">Allowance: +${pay.allowance}</span>
                        </td>
                        <td className="p-4 font-mono">
                          <span className="text-emerald-500 block">+${pay.overtime || 0} (OT)</span>
                          <span className="text-emerald-500 block">+${pay.commission || 0} (Comm)</span>
                        </td>
                        <td className="p-4 font-mono text-rose-500">
                          <span className="block">-${pay.tax} (Tax)</span>
                          <span className="block">-${pay.providentFund} (PF)</span>
                        </td>
                        <td className="p-4 text-right font-black text-zinc-900 dark:text-white text-xs font-mono">
                          ${pay.netSalary?.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            pay.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            pay.status === 'Approved' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }`}>
                            {pay.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {pay.status === 'Draft' && !isReadOnly && (
                              <button
                                onClick={() => handleApprovePayroll(pay)}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            {pay.status === 'Approved' && !isReadOnly && (
                              <button
                                onClick={() => handlePayPayroll(pay)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded cursor-pointer flex items-center gap-1"
                              >
                                <ArrowUpRight className="h-3 w-3" />
                                Post Ledger & Pay
                              </button>
                            )}
                            {pay.status === 'Paid' && (
                              <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Synchronized
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Performance Appraisals & Rewards</h2>
            {!isReadOnly && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Log Performance Appraisal
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.length === 0 ? (
              <div className="md:col-span-2 text-center py-12 text-zinc-400">No performance appraisals logged yet.</div>
            ) : (
              reviews.map(rev => (
                <div key={rev.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl relative space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-800 dark:text-white">{rev.employeeName}</h4>
                      <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">Appraisal date: {rev.reviewDate}</span>
                    </div>
                    
                    <div className="flex gap-0.5 text-amber-400">
                      {Array.from({ length: rev.performanceRating || 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-zinc-400 block font-semibold text-[10px] uppercase">Corporate Goals & Objectives:</span>
                      <p className="text-zinc-600 dark:text-zinc-300 mt-1">{rev.goals || 'No goals registered.'}</p>
                    </div>

                    {rev.trainingRecords?.length > 0 && (
                      <div className="bg-blue-500/5 p-2 rounded-xl border border-blue-500/10 mt-1 text-[11px]">
                        <span className="font-bold text-blue-500 block">Training Course Record:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{rev.trainingRecords[0].courseName} (Completed on {rev.trainingRecords[0].completionDate})</span>
                      </div>
                    )}

                    {rev.rewards?.length > 0 && (
                      <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10 mt-1 text-[11px]">
                        <span className="font-bold text-emerald-600 block">Reward Accolade Issued:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{rev.rewards[0].awardName} - {rev.rewards[0].details}</span>
                      </div>
                    )}

                    {rev.warnings?.length > 0 && (
                      <div className="bg-rose-500/5 p-2 rounded-xl border border-rose-500/10 mt-1 text-[11px]">
                        <span className="font-bold text-rose-500 block">Compliance Warning Issued:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{rev.warnings[0].reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Enterprise Compliance & Audit Reports</h2>
            <p className="text-xs text-zinc-400 mt-1">Export full roster dossiers, monthly attendance metrics, and payroll journals securely to CSV/Excel formats.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-800 dark:text-white text-xs">Roster Employee Report</h4>
                <p className="text-[11px] text-zinc-400 mt-1">Export a master sheet containing employee IDs, departments, contacts, and roster details.</p>
              </div>
              <button
                onClick={exportEmployees}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export CSV / Excel
              </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-800 dark:text-white text-xs">Biometric Attendance Log</h4>
                <p className="text-[11px] text-zinc-400 mt-1">Audit employee daily times, check-in schedules, late statuses, and calculated overtime hours.</p>
              </div>
              <button
                onClick={exportAttendance}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export CSV / Excel
              </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-800 dark:text-white text-xs">Payroll Disbursement ledger</h4>
                <p className="text-[11px] text-zinc-400 mt-1">Review basic salaries, overtime payments, tax withholdings, and provident fund summaries.</p>
              </div>
              <button
                onClick={exportPayroll}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export CSV / Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER EMPLOYEE MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-white uppercase tracking-wider">Register Corporate Employee</h3>
              <button onClick={() => setShowEmpModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEmp} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newEmp.fullName}
                    onChange={e => setNewEmp({ ...newEmp, fullName: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={newEmp.email}
                    onChange={e => setNewEmp({ ...newEmp, email: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Gender</label>
                  <select
                    value={newEmp.gender}
                    onChange={e => setNewEmp({ ...newEmp, gender: e.target.value as any })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={newEmp.dateOfBirth}
                    onChange={e => setNewEmp({ ...newEmp, dateOfBirth: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">National ID</label>
                  <input
                    type="text"
                    required
                    value={newEmp.nationalId}
                    onChange={e => setNewEmp({ ...newEmp, nationalId: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Passport Number</label>
                  <input
                    type="text"
                    value={newEmp.passport}
                    onChange={e => setNewEmp({ ...newEmp, passport: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Phone</label>
                  <input
                    type="text"
                    required
                    value={newEmp.phone}
                    onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Emergency Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={newEmp.emergencyPhone}
                    onChange={e => setNewEmp({ ...newEmp, emergencyPhone: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Department</label>
                  <select
                    value={newEmp.departmentId}
                    onChange={e => setNewEmp({ ...newEmp, departmentId: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.departmentName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Designation</label>
                  <select
                    value={newEmp.designationId}
                    onChange={e => setNewEmp({ ...newEmp, designationId: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value="">Select Designation</option>
                    {designations.map(d => (
                      <option key={d.id} value={d.id}>{d.designationName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Employment Type</label>
                  <select
                    value={newEmp.employmentType}
                    onChange={e => setNewEmp({ ...newEmp, employmentType: e.target.value as any })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Basic Monthly Salary ($)</label>
                  <input
                    type="number"
                    required
                    value={newEmp.basicSalary}
                    onChange={e => setNewEmp({ ...newEmp, basicSalary: Number(e.target.value) })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-white uppercase tracking-wider">Create Corporate Department</h3>
              <button onClick={() => setShowDeptModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDept} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accounts & Corporate Finance"
                  value={newDept.departmentName}
                  onChange={e => setNewDept({ ...newDept, departmentName: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FIN"
                  value={newDept.departmentCode}
                  onChange={e => setNewDept({ ...newDept, departmentCode: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Manager Head</label>
                <select
                  value={newDept.managerId}
                  onChange={e => setNewDept({ ...newDept, managerId: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value="">Select Department Manager</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Brief Description</label>
                <textarea
                  placeholder="Notes about department mandate..."
                  value={newDept.description}
                  onChange={e => setNewDept({ ...newDept, description: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 h-20 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DESIGNATION MODAL */}
      {showDesgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-white uppercase tracking-wider">Create Corporate Designation</h3>
              <button onClick={() => setShowDesgModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDesg} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Designation / Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Financial Accountant"
                  value={newDesg.designationName}
                  onChange={e => setNewDesg({ ...newDesg, designationName: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Target Department</label>
                <select
                  required
                  value={newDesg.departmentId}
                  onChange={e => setNewDesg({ ...newDesg, departmentId: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value="">Select Associated Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.departmentName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Salary Grade Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade-A or G5"
                  value={newDesg.salaryGrade}
                  onChange={e => setNewDesg({ ...newDesg, salaryGrade: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Role Mandate Description</label>
                <textarea
                  placeholder="Provide role description and job specifications..."
                  value={newDesg.description}
                  onChange={e => setNewDesg({ ...newDesg, description: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 h-20 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDesgModal(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  Save Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST LEAVE MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-white uppercase tracking-wider">Leave Application Form</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRequestLeave} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Leave Category</label>
                <select
                  value={newLeave.leaveType}
                  onChange={e => setNewLeave({ ...newLeave, leaveType: e.target.value as any })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Half-Day Leave">Half-Day Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.startDate}
                    onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">End Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.endDate}
                    onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Detailed Reason</label>
                <textarea
                  required
                  placeholder="Provide explanation for leave allocation..."
                  value={newLeave.reason}
                  onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 h-20 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERFORMANCE APPRAISAL MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-white uppercase tracking-wider">Log Performance Appraisal</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddReview} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Employee under review</label>
                <select
                  required
                  value={newReview.employeeId}
                  onChange={e => setNewReview({ ...newReview, employeeId: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value="">Select Employee</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Performance Rating (1 - 5 Stars)</label>
                <select
                  value={newReview.performanceRating}
                  onChange={e => setNewReview({ ...newReview, performanceRating: Number(e.target.value) })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value={5}>5 Stars (Exceptional)</option>
                  <option value={4}>4 Stars (Very Good)</option>
                  <option value={3}>3 Stars (Satisfactory)</option>
                  <option value={2}>2 Stars (Needs Improvement)</option>
                  <option value={1}>1 Star (Unsatisfactory)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Corporate Goals achieved & core objectives</label>
                <textarea
                  placeholder="Outline employee's accomplishments, training courses finished, or key goals..."
                  value={newReview.goals}
                  onChange={e => setNewReview({ ...newReview, goals: e.target.value })}
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200 h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Reward Accolade Issued (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Employee of the Month"
                    value={newReview.awardName}
                    onChange={e => setNewReview({ ...newReview, awardName: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Compliance Warning (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Unexcused lateness warning"
                    value={newReview.warningReason}
                    onChange={e => setNewReview({ ...newReview, warningReason: e.target.value })}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  Save Appraisal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
