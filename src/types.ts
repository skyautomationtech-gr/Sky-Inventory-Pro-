export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Staff';

export type AccountStatus = 'Active' | 'Pending' | 'Suspended';

export interface UserPermissions {
  viewDashboard: boolean;
  manageProducts: boolean;
  manageInventory: boolean;
  manageCategories: boolean;
  manageSuppliers: boolean;
  manageSales: boolean;
  manageAccounting: boolean;
  manageEmployees: boolean;
  manageSettings: boolean;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  profilePhoto: string | null;
  email: string;
  phoneNumber: string;
  employeeId: string;
  role: UserRole;
  department: string;
  accountStatus: AccountStatus;
  lastLogin: string | null;
  createdDate: string;
  companyId?: string;
  branchId?: string;
  warehouseId?: string;
}

export interface SystemStatus {
  databaseConnected: boolean;
  storageConnected: boolean;
  authConnected: boolean;
  lastChecked: string;
}

export interface ActivityLog {
  id: string;
  uid: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface QuickStats {
  totalProducts: number;
  stockValue: number;
  outOfStock: number;
  lowStockCount: number;
  dailySalesCount: number;
  dailyRevenue: number;
}

// Default Permission Matrix by Role
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  'Super Admin': {
    viewDashboard: true,
    manageProducts: true,
    manageInventory: true,
    manageCategories: true,
    manageSuppliers: true,
    manageSales: true,
    manageAccounting: true,
    manageEmployees: true,
    manageSettings: true,
  },
  'Admin': {
    viewDashboard: true,
    manageProducts: true,
    manageInventory: true,
    manageCategories: true,
    manageSuppliers: true,
    manageSales: true,
    manageAccounting: false,
    manageEmployees: true,
    manageSettings: false,
  },
  'Manager': {
    viewDashboard: true,
    manageProducts: true,
    manageInventory: true,
    manageCategories: true,
    manageSuppliers: true,
    manageSales: true,
    manageAccounting: false,
    manageEmployees: false,
    manageSettings: false,
  },
  'Staff': {
    viewDashboard: true,
    manageProducts: false,
    manageInventory: true,
    manageCategories: false,
    manageSuppliers: false,
    manageSales: true,
    manageAccounting: false,
    manageEmployees: false,
    manageSettings: false,
  },
};

// Phase 2: Enterprise Product Management Types

export interface Category {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  image: string | null;
  parentCategory: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Brand {
  id: string;
  name: string;
  logo: string | null;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  supplierName: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  country: string;
  tradeLicense: string;
  taxNumber: string;
  notes: string;
  status: 'Active' | 'Inactive';
  logo: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  qrCode: string;
  brand: string; // Brand Name or ID
  category: string; // Category Name or ID
  subCategory: string;
  supplier: string; // Supplier Name or ID
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  minSellingPrice: number;
  profitMargin: number; // Stored margin percentage (e.g. 20)
  stockQuantity: number;
  lowStockLimit: number;
  unit: string; // Piece, Box, Kg, etc.
  color: string;
  size: string;
  weight: string;
  warranty: string;
  countryOfOrigin: string;
  description: string;
  shortDescription: string;
  tags: string[];
  status: 'Active' | 'Inactive' | 'Draft';
  featuredProduct: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  images: string[];
  thumbnail: string;
}

// Phase 3: Enterprise Inventory Management Types

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface InventoryRecord {
  id: string; // matches product.id
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  supplier: string;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  damagedStock: number;
  returnedStock: number;
  warehouseStock: Record<string, number>; // warehouseId -> stock qty
  minStockLevel: number;
  maxStockLevel: number;
  reorderLevel: number;
  safetyStock: number;
  lastStockUpdate: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Critical Stock' | 'Out of Stock';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Active' | 'Inactive';
  referenceNumber?: string;
  auditInfo?: string;
}

export interface InventoryTransaction {
  id: string;
  referenceNumber: string;
  transactionType: 'Stock In' | 'Stock Out' | 'Adjustment' | 'Transfer';
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  supplierId?: string;
  supplierName?: string;
  purchaseCost?: number;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  warehouseId: string;
  warehouseName: string;
  reason?: 'Sales' | 'Sample' | 'Damage' | 'Adjustment' | 'Transfer' | 'Other';
  requestedBy: string;
  approvedBy: string;
  receivedBy?: string;
  remarks: string;
  user: string;
  userId: string;
  role: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed';
}

export interface StockAdjustment {
  id: string;
  referenceNumber: string;
  productId: string;
  productName: string;
  sku: string;
  reason: string;
  approval: string;
  notes: string;
  beforeQuantity: number;
  afterQuantity: number;
  difference: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Approved';
}

export interface InventoryNotification {
  id: string;
  type: 'low_stock' | 'critical_stock' | 'out_of_stock' | 'adjustment' | 'large_movement';
  productId: string;
  productName: string;
  sku: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Active';
}

// Phase 4: Enterprise Purchase Management Types

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  receivedQuantity: number; // For partial/full receipt tracking
  unit: string;
  purchasePrice: number;
  discount: number; // percentage
  vat: number; // percentage
  tax: number; // fixed or percentage other taxes
  subtotal: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  purchaseDate: string;
  expectedDeliveryDate: string;
  referenceNumber: string;
  purchaseStatus: 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Partial' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
  currency: string;
  notes: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number; // Grand Total
  paidAmount: number;
  dueAmount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  approvedBy: string;
  approvedByName?: string;
  status: 'Active' | 'Inactive';
}

export interface PurchaseItemDoc {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  receivedQuantity: number;
  unit: string;
  purchasePrice: number;
  discount: number;
  vat: number;
  tax: number;
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Active';
}

export interface PurchaseReceiptItem {
  productId: string;
  productName: string;
  sku: string;
  quantityReceivedNow: number;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
}

export interface PurchaseReceipt {
  id: string;
  receiptNumber: string; // GRN-XXXXXX
  purchaseOrderId: string;
  poNumber: string;
  warehouseId: string;
  warehouseName: string;
  items: PurchaseReceiptItem[];
  receiverName: string;
  receiveDate: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed';
  referenceNumber: string;
}

export interface PurchasePayment {
  id: string;
  paymentNumber: string; // PAY-XXXXXX
  purchaseOrderId: string;
  poNumber: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Banking' | 'Cheque';
  paymentType: 'Partial' | 'Full' | 'Advance';
  amount: number;
  transactionReference: string;
  paymentDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed';
  referenceNumber: string;
}

export interface PurchaseReturnItem {
  productId: string;
  productName: string;
  sku: string;
  quantityReturned: number;
  purchasePrice: number;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string; // RET-XXXXXX
  purchaseOrderId: string;
  poNumber: string;
  referenceNumber: string;
  items: PurchaseReturnItem[];
  reason: string;
  refundStatus: 'Pending' | 'Refunded' | 'Store Credit' | 'Rejected';
  approvedBy: string;
  approvedByName: string;
  returnDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed';
}

export interface PurchaseHistoryEntry {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  action: 'Purchase Created' | 'Purchase Updated' | 'Goods Received' | 'Payment Added' | 'Purchase Returned' | 'Purchase Cancelled' | 'Approval Changes';
  details: string;
  operatorName: string;
  operatorId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Active';
}

// Phase 5: Enterprise Sales & POS Types

export interface Customer {
  id: string;
  customerId: string; // Auto-generated CUST-XXXXXX
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  customerType: 'Retail' | 'Wholesale' | 'VIP' | 'Corporate';
  creditLimit: number;
  openingBalance: number;
  currentBalance: number;
  loyaltyPoints: number;
  notes: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastPurchaseDate?: string;
  lastPurchaseAmount?: number;
}

export interface SalesOrderItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  unit: string;
  sellingPrice: number;
  discount: number; // percentage
  vat: number; // percentage
  tax: number; // percentage or fixed
  subtotal: number;
}

export interface SalesOrder {
  id: string;
  salesNumber: string; // SO-XXXXXX
  invoiceNumber: string; // INV-XXXXXX
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  salesDate: string;
  salesStatus: 'Draft' | 'Pending' | 'Completed' | 'Cancelled' | 'Returned';
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
  salesperson: string;
  salespersonName: string;
  referenceNumber: string;
  notes: string;
  items: SalesOrderItem[];
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  grossProfit: number;
  netProfit: number;
  couponCode?: string;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Mobile Banking' | 'Cheque' | 'Split';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  status: 'Active' | 'Inactive';
}

export interface SalesPayment {
  id: string;
  paymentNumber: string; // SPAY-XXXXXX
  salesOrderId: string;
  salesNumber: string;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Mobile Banking' | 'Cheque' | 'Split';
  splitDetails?: { method: string; amount: number }[];
  paymentType: 'Partial' | 'Full' | 'Advance';
  amount: number;
  transactionReference: string;
  paymentDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed';
}

export interface SalesReturnItem {
  productId: string;
  productName: string;
  sku: string;
  returnQuantity: number;
  sellingPrice: number;
  subtotal: number;
}

export interface SalesReturn {
  id: string;
  returnNumber: string; // SRET-XXXXXX
  salesOrderId: string;
  salesNumber: string;
  customerId: string;
  customerName: string;
  items: SalesReturnItem[];
  returnQuantity: number;
  reason: string;
  refundMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Store Credit';
  approvedBy: string;
  approvedByName: string;
  returnDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed';
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  transactionType: 'Sale' | 'Payment' | 'Return' | 'Opening Balance';
  referenceId: string;
  referenceNumber: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SalesHistoryEntry {
  id: string;
  salesOrderId: string;
  salesNumber: string;
  action: 'Sale Created' | 'Sale Completed' | 'Payment Added' | 'Sale Returned' | 'Sale Cancelled' | 'Approval Changes';
  details: string;
  operatorName: string;
  operatorId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Active';
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  group: 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'Expenses';
  parentAccount?: string;
  description: string;
  balance: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface GeneralLedgerEntry {
  id: string;
  referenceNumber: string;
  transactionType: 'Sales' | 'Purchases' | 'Payments' | 'Receipts' | 'Expenses' | 'Inventory Adjustments' | 'Returns' | 'Transfers' | 'Journal';
  debitAccount: string;
  debitAccountName: string;
  creditAccount: string;
  creditAccountName: string;
  amount: number;
  narration: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed' | 'Pending';
}

export interface CashBookEntry {
  id: string;
  referenceNumber: string;
  transactionType: 'Cash In' | 'Cash Out';
  amount: number;
  previousBalance: number;
  currentBalance: number;
  narration: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed';
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  openingBalance: number;
  currentBalance: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ExpenseRecord {
  id: string;
  expenseNumber: string;
  category: string;
  amount: number;
  vendor: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque' | 'Mobile Banking';
  bankAccountId?: string;
  bankAccountName?: string;
  invoice: string;
  attachment?: string;
  notes?: string;
  approvedBy?: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
}

export interface IncomeRecord {
  id: string;
  incomeNumber: string;
  incomeSource: string;
  amount: number;
  reference: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque' | 'Mobile Banking';
  bankAccountId?: string;
  bankAccountName?: string;
  notes?: string;
  receivedDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Completed' | 'Pending';
}

export interface JournalEntry {
  id: string;
  journalNumber: string;
  date: string;
  reference?: string;
  narration: string;
  debitAccount: string;
  debitAccountName: string;
  creditAccount: string;
  creditAccountName: string;
  amount: number;
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AccountReceivable {
  id: string;
  customerId: string;
  customerName: string;
  outstandingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  creditLimit: number;
  collectionStatus: 'Good' | 'Overdue' | 'Collection Agency';
  lastPaymentDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AccountPayable {
  id: string;
  supplierId: string;
  supplierName: string;
  outstandingBalance: number;
  totalBilled: number;
  totalPaid: number;
  lastPaymentDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  profilePhoto: string | null;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  nationalId: string;
  passport: string;
  phone: string;
  email: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  permanentAddress: string;
  presentAddress: string;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationName: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  joiningDate: string;
  salaryStructure: {
    basicSalary: number;
    allowance: number;
    bonus: number;
    commission: number;
    providentFund: number;
    taxRate: number;
  };
  managerId: string;
  managerName: string;
  status: 'Active' | 'Inactive';
  documents: {
    name: string;
    url: string;
    type: string;
  }[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Department {
  id: string;
  departmentName: string;
  departmentCode: string;
  managerId: string;
  managerName: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Designation {
  id: string;
  designationName: string;
  departmentId: string;
  departmentName: string;
  salaryGrade: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  workingHours: number;
  lateEntry: boolean;
  overtime: number;
  status: 'Present' | 'Absent' | 'On Leave' | 'Late';
  correctionRequest?: {
    checkIn: string;
    checkOut: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approvedBy?: string;
  };
  locationPlaceholder?: string;
  biometricPlaceholder?: string;
  qrAttendancePlaceholder?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'Annual Leave' | 'Casual Leave' | 'Sick Leave' | 'Maternity Leave' | 'Emergency Leave' | 'Half-Day Leave';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PayrollRecord {
  id: string;
  payrollNumber: string;
  employeeId: string;
  employeeName: string;
  month: string;
  basicSalary: number;
  allowance: number;
  bonus: number;
  commission: number;
  overtime: number;
  tax: number;
  providentFund: number;
  loanDeduction: number;
  advanceDeduction: number;
  otherDeductions: number;
  netSalary: number;
  status: 'Draft' | 'Approved' | 'Paid';
  paymentDate: string | null;
  approvedBy?: string;
  approvedByName?: string;
  accountingJournalId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  documentType: 'Employment Contract' | 'National ID' | 'Passport' | 'Certificates' | 'Resume' | 'Photo' | 'Other Documents';
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Active' | 'Expired';
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewDate: string;
  performanceRating: number;
  goals: string;
  promotionHistory: {
    date: string;
    fromDesignation: string;
    toDesignation: string;
    notes: string;
  }[];
  trainingRecords: {
    courseName: string;
    completionDate: string;
    status: string;
  }[];
  warnings: {
    date: string;
    reason: string;
    issuedBy: string;
  }[];
  rewards: {
    date: string;
    awardName: string;
    details: string;
  }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Active';
}

// Phase 8: Enterprise CRM & Support Types

export type LeadSource = 'Website' | 'Cold Call' | 'Referral' | 'Exhibition' | 'Social Media' | 'Partner' | 'Other';
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Nurturing' | 'Lost' | 'Converted';

export interface CRMLead {
  id: string;
  leadId: string; // LEAD-XXXXXX
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  source: LeadSource;
  assignedTo: string; // Employee ID
  assignedName: string; // Employee Name
  status: LeadStatus;
  expectedValue: number;
  expectedClosingDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type PipelineStage = 'Qualification' | 'Discovery' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface CRMOpportunity {
  id: string;
  opportunityId: string; // OPP-XXXXXX
  title: string;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  leadName?: string;
  pipelineStage: PipelineStage;
  expectedRevenue: number;
  probability: number; // percentage
  expectedClosingDate: string;
  ownerId: string; // Employee ID
  ownerName: string;
  notes: string;
  reminders: { date: string; note: string; done: boolean }[];
  activities: { date: string; type: string; notes: string }[];
  files: { name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'Active' | 'Completed' | 'Cancelled';
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketCategory = 'Billing' | 'Product Defect' | 'Logistics' | 'Technical Support' | 'General Query' | 'Other';
export type TicketStatus = 'Open' | 'Assigned' | 'In Progress' | 'Waiting for Customer' | 'Resolved' | 'Closed' | 'Reopened';

export interface SupportTicket {
  id: string;
  ticketNumber: string; // TKT-XXXXXX
  customerId: string;
  customerName: string;
  priority: TicketPriority;
  category: TicketCategory;
  department: string;
  assignedTo: string; // Employee ID
  assignedName: string;
  status: TicketStatus;
  description: string;
  resolutionNotes?: string;
  attachments?: { name: string; url: string }[];
  createdDate: string;
  closedDate?: string;
  responseTime?: number; // in hours
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  auditHistory: { timestamp: string; status: string; updatedBy: string; remarks: string }[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'Employee' | 'Customer';
  message: string;
  attachments?: { name: string; url: string }[];
  isInternalNote: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CRMFollowup {
  id: string;
  followupId: string; // FLW-XXXXXX
  title: string;
  description: string;
  targetType: 'Customer' | 'Lead' | 'Opportunity';
  targetId: string;
  targetName: string;
  followupDate: string;
  assignedTo: string; // Employee ID
  assignedName: string;
  priority: 'Low' | 'Medium' | 'High';
  completionStatus: 'Pending' | 'Completed' | 'Cancelled';
  isRecurring: boolean;
  recurrencePattern?: 'Daily' | 'Weekly' | 'Monthly';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CustomerFeedback {
  id: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  review: string;
  type: 'Complaint' | 'Suggestion' | 'Compliment' | 'Other';
  satisfactionScore: number; // 1-10
  responseNotes?: string;
  responseStatus: 'Pending' | 'Addressed' | 'Ignored';
  respondedBy?: string;
  respondedByName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  customerName: string;
  pointsEarned: number;
  pointsRedeemed: number;
  type: 'Earn' | 'Redeem' | 'Adjustment';
  salesOrderId?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type CommChannel = 'Email' | 'WhatsApp' | 'SMS' | 'Phone Call' | 'Internal Note';

export interface CommunicationLog {
  id: string;
  customerId: string;
  customerName: string;
  channel: CommChannel;
  direction: 'Incoming' | 'Outgoing' | 'Internal';
  agentId: string; // Employee ID
  agentName: string;
  summary: string;
  details: string;
  attachments?: { name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type MembershipLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface CRMCustomer {
  id: string; // Matches normal Customer ID
  customerId: string; // CUST-XXXXXX
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  customerType: 'Retail' | 'Wholesale' | 'VIP' | 'Corporate';
  creditLimit: number;
  currentBalance: number;
  loyaltyPoints: number;
  membershipLevel: MembershipLevel;
  notes: string;
  status: 'Active' | 'Inactive';
  preferredPaymentMethod?: string;
  preferredProducts?: string[]; // list of productSku or productNames or IDs
  preferredProductNames?: string[];
  internalNotes?: string;
  attachments?: { name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Phase 9: Multi-Company, Multi-Branch & Enterprise Administration Types

export interface Company {
  id: string; // companyId
  companyId: string;
  companyName: string;
  legalName: string;
  businessType: string;
  tradeLicense: string;
  taxNumber: string;
  vatNumber: string;
  registrationNumber: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  city: string;
  address: string;
  logo: string | null;
  currency: string;
  timezone: string;
  language: string;
  fiscalYear: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Branch {
  id: string; // branchId
  branchId: string;
  companyId: string;
  branchCode: string;
  branchName: string;
  manager: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  openingDate: string;
  status: 'Active' | 'Inactive';
  workingHours: string;
  gpsPlaceholder?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BranchTransfer {
  id: string;
  transferNumber: string; // TRF-XXXXXX
  companyId: string;
  sourceBranchId: string;
  sourceBranchName: string;
  targetBranchId: string;
  targetBranchName: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  targetWarehouseId: string;
  targetWarehouseName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  reason: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: string;
  approvedByName?: string;
  remarks?: string;
  transferDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ApprovalWorkflow {
  id: string;
  workflowId: string;
  companyId: string;
  module: 'Purchases' | 'Sales Discounts' | 'Inventory Adjustments' | 'Payroll' | 'Expenses' | 'Journal Entries' | 'Branch Transfers';
  description: string;
  minAmount?: number; // Condition for triggering approval
  approvalLevels: {
    level: number;
    approverRole: UserRole;
    approverId?: string; // Specific employee/user
  }[];
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SystemSettings {
  id: string; // Typically "global" or company-specific ID
  companyId: string;
  documentNumberFormats: {
    purchaseOrderPrefix: string;
    salesInvoicePrefix: string;
    receiptPrefix: string;
    transferPrefix: string;
    ticketPrefix: string;
  };
  taxConfiguration: {
    defaultVatRate: number;
    taxEnabled: boolean;
    vatNumber: string;
  };
  currencyConfiguration: {
    defaultCurrency: string;
    currencySymbol: string;
    decimalPlaces: number;
  };
  fiscalYearSettings: {
    startMonth: string;
    endMonth: string;
    currentFiscalYear: string;
  };
  holidayCalendar: {
    id: string;
    date: string;
    name: string;
    type: 'National' | 'Company';
  }[];
  workingDays: string[]; // ['Monday', 'Tuesday', ...]
  businessHours: {
    start: string; // "09:00"
    end: string; // "18:00"
  };
  status: 'Active';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EnterpriseAuditLog {
  id: string;
  uid: string;
  userName: string;
  userRole: UserRole;
  action: string;
  ipAddress: string;
  device: string;
  browser: string;
  location: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  companyId?: string;
  branchId?: string;
}

export interface BackupHistory {
  id: string;
  backupId: string;
  companyId: string;
  backupType: 'Manual' | 'Scheduled';
  fileName: string;
  fileSize: string;
  recordCount: number;
  downloadUrl?: string;
  status: 'Completed' | 'Failed';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}






