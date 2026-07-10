import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, DollarSign, Wallet, Landmark, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownLeft, Calendar, FileText, Plus, Shield, Check, 
  X, RefreshCw, Layers, Printer, Download, Sparkles, Filter, Users, 
  AlertCircle, FileSpreadsheet, Percent, Info, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, setDoc, getDocs, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  ChartOfAccount, GeneralLedgerEntry, CashBookEntry, BankAccount, 
  ExpenseRecord, IncomeRecord, JournalEntry, AccountReceivable, AccountPayable 
} from '../types';

export const Accounting: React.FC = () => {
  const { user, profile } = useAuth();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'ledger' | 'cashbook' | 'banks' | 'journals' | 'expenses' | 'receivables' | 'reports'>('dashboard');
  
  // Main data lists
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [ledger, setLedger] = useState<GeneralLedgerEntry[]>([]);
  const [cashbook, setCashbook] = useState<CashBookEntry[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  
  // Core business lists for posting synchronization
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  
  // UI Loading/Status
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  
  // Modals / Form states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  
  // New Account form state
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    group: 'Assets' as any,
    parentAccount: '',
    description: '',
    openingBalance: 0
  });

  // New Bank form state
  const [newBank, setNewBank] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    openingBalance: 0
  });

  // New Journal form state
  const [newJournal, setNewJournal] = useState({
    debitAccount: '',
    creditAccount: '',
    amount: 0,
    narration: '',
    reference: ''
  });

  // New Expense form state
  const [newExpense, setNewExpense] = useState({
    category: 'Rent',
    amount: 0,
    vendor: '',
    paymentMethod: 'Cash' as any,
    bankAccountId: '',
    invoice: '',
    notes: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });

  // New Income form state
  const [newIncome, setNewIncome] = useState({
    incomeSource: '',
    amount: 0,
    reference: '',
    paymentMethod: 'Cash' as any,
    bankAccountId: '',
    notes: '',
    receivedDate: new Date().toISOString().split('T')[0]
  });

  // Report Settings
  const [selectedReport, setSelectedReport] = useState<'PL' | 'BS' | 'TB' | 'CF' | 'TAX' | 'INV'>('PL');
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filter parameters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerAccountFilter, setLedgerAccountFilter] = useState('');

  const isReadOnly = profile?.role === 'Staff';
  const hasApprovalPower = profile && ['Super Admin', 'Admin', 'Manager'].includes(profile.role);

  // Default Chart of Accounts Definition
  const DEFAULT_ACCOUNTS: Omit<ChartOfAccount, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
    { code: '1010', name: 'Cash', group: 'Assets', description: 'Primary cash on hand', balance: 50000, status: 'Active' },
    { code: '1020', name: 'Bank Operating Account', group: 'Assets', description: 'Primary corporate checking account', balance: 120000, status: 'Active' },
    { code: '1200', name: 'Accounts Receivable', group: 'Assets', description: 'Amounts due from trade customers', balance: 0, status: 'Active' },
    { code: '1400', name: 'Inventory Asset', group: 'Assets', description: 'Value of physical inventory stock', balance: 0, status: 'Active' },
    { code: '2100', name: 'Accounts Payable', group: 'Liabilities', description: 'Amounts owed to trade suppliers', balance: 0, status: 'Active' },
    { code: '3000', name: 'Retained Earnings', group: 'Equity', description: 'Accumulated business earnings', balance: 170000, status: 'Active' },
    { code: '4000', name: 'Sales Revenue', group: 'Income', description: 'Income generated from product sales', balance: 0, status: 'Active' },
    { code: '4100', name: 'Other Revenue', group: 'Income', description: 'Non-operational income streams', balance: 0, status: 'Active' },
    { code: '5000', name: 'Cost of Goods Sold', group: 'Expenses', description: 'Direct costs of sold products', balance: 0, status: 'Active' },
    { code: '5100', name: 'Operating Expenses', group: 'Expenses', description: 'Rent, utility, and administrative costs', balance: 0, status: 'Active' }
  ];

  // Fetch Firestore Data on Mount
  useEffect(() => {
    setLoading(true);
    
    // Create listeners
    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChartOfAccount));
      setAccounts(list.sort((a, b) => a.code.localeCompare(b.code)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'accounts'));

    const unsubLedger = onSnapshot(collection(db, 'ledger'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneralLedgerEntry));
      setLedger(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'ledger'));

    const unsubCashbook = onSnapshot(collection(db, 'cashbook'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashBookEntry));
      setCashbook(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'cashbook'));

    const unsubBanks = onSnapshot(collection(db, 'bank_accounts'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount));
      setBanks(list);
    }, err => handleFirestoreError(err, OperationType.LIST, 'bank_accounts'));

    const unsubJournals = onSnapshot(collection(db, 'journal_entries'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry));
      setJournals(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'journal_entries'));

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseRecord));
      setExpenses(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubIncomes = onSnapshot(collection(db, 'income'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncomeRecord));
      setIncomes(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'income'));

    const unsubSales = onSnapshot(collection(db, 'sales_orders'), (snap) => {
      setSalesOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPurchases = onSnapshot(collection(db, 'purchase_orders'), (snap) => {
      setPurchaseOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubReceivables = onSnapshot(collection(db, 'receivables'), (snap) => {
      setReceivables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountReceivable)));
    });

    const unsubPayables = onSnapshot(collection(db, 'payables'), (snap) => {
      setPayables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountPayable)));
    });

    // Seed default Chart of Accounts if completely empty
    const checkAndSeedAccounts = async () => {
      try {
        const snap = await getDocs(collection(db, 'accounts'));
        if (snap.empty) {
          console.log('Seeding default Chart of Accounts...');
          for (const acc of DEFAULT_ACCOUNTS) {
            const id = doc(collection(db, 'accounts')).id;
            await setDoc(doc(db, 'accounts', id), {
              id,
              ...acc,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: user?.uid || 'system'
            });
          }
        }
      } catch (err) {
        console.error('Error seeding COA:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAndSeedAccounts();

    return () => {
      unsubAccounts();
      unsubLedger();
      unsubCashbook();
      unsubBanks();
      unsubJournals();
      unsubExpenses();
      unsubIncomes();
      unsubSales();
      unsubPurchases();
      unsubReceivables();
      unsubPayables();
    };
  }, []);

  // Sync / Auto-posting engine
  const handleAutoPostingSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncStatus('Scanning sales and purchases for missing posts...');
    try {
      let postedCount = 0;
      const timestamp = new Date().toISOString();
      const todayStr = timestamp.split('T')[0];

      // 1. Process Completed Sales Orders (Invoices)
      const unpostedSales = salesOrders.filter(so => 
        so.salesStatus === 'Completed' && 
        !ledger.some(l => l.referenceNumber === so.salesNumber)
      );

      for (const so of unpostedSales) {
        setSyncStatus(`Syncing Sales Invoice: ${so.salesNumber}`);
        // Posting: Debit Accounts Receivable, Credit Sales Revenue
        const lId = doc(collection(db, 'ledger')).id;
        const entry: GeneralLedgerEntry = {
          id: lId,
          referenceNumber: so.salesNumber,
          transactionType: 'Sales',
          debitAccount: '1200',
          debitAccountName: 'Accounts Receivable',
          creditAccount: '4000',
          creditAccountName: 'Sales Revenue',
          amount: so.grandTotal,
          narration: `Sales Order billing for invoice ${so.invoiceNumber || so.salesNumber}`,
          date: so.salesDate ? so.salesDate.split('T')[0] : todayStr,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: user?.uid || 'system',
          status: 'Completed'
        };
        await setDoc(doc(db, 'ledger', lId), entry);

        // Adjust Accounts receivable outstanding
        const recId = so.customerId;
        const recRef = doc(db, 'receivables', recId);
        const currentRec = receivables.find(r => r.customerId === so.customerId);
        await setDoc(recRef, {
          id: recId,
          customerId: so.customerId,
          customerName: so.customerName,
          outstandingBalance: (currentRec?.outstandingBalance || 0) + so.dueAmount,
          totalInvoiced: (currentRec?.totalInvoiced || 0) + so.grandTotal,
          totalPaid: (currentRec?.totalPaid || 0) + so.paidAmount,
          creditLimit: currentRec?.creditLimit || 50000,
          collectionStatus: (currentRec?.outstandingBalance || 0) + so.dueAmount > 50000 ? 'Overdue' : 'Good',
          lastPaymentDate: so.paidAmount > 0 ? timestamp : (currentRec?.lastPaymentDate || null),
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: user?.uid || 'system'
        });

        // Update corresponding Account balances
        const salesAcc = accounts.find(a => a.code === '4000');
        const arAcc = accounts.find(a => a.code === '1200');
        if (salesAcc) await updateDoc(doc(db, 'accounts', salesAcc.id), { balance: salesAcc.balance + so.grandTotal });
        if (arAcc) await updateDoc(doc(db, 'accounts', arAcc.id), { balance: arAcc.balance + so.grandTotal });

        // Post Sales Payment to Cash/Bank if paid > 0
        if (so.paidAmount > 0) {
          const payId = doc(collection(db, 'ledger')).id;
          const isCash = so.paymentMethod === 'Cash';
          const pEntry: GeneralLedgerEntry = {
            id: payId,
            referenceNumber: `SPAY-${so.salesNumber}`,
            transactionType: 'Payments',
            debitAccount: isCash ? '1010' : '1020',
            debitAccountName: isCash ? 'Cash' : 'Bank Operating Account',
            creditAccount: '1200',
            creditAccountName: 'Accounts Receivable',
            amount: so.paidAmount,
            narration: `Payment received via ${so.paymentMethod || 'Cash'} for invoice ${so.invoiceNumber || so.salesNumber}`,
            date: so.salesDate ? so.salesDate.split('T')[0] : todayStr,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: user?.uid || 'system',
            status: 'Completed'
          };
          await setDoc(doc(db, 'ledger', payId), pEntry);

          // If cash, update Cash Book
          if (isCash) {
            const cbId = doc(collection(db, 'cashbook')).id;
            const prevCash = accounts.find(a => a.code === '1010')?.balance || 0;
            await setDoc(doc(db, 'cashbook', cbId), {
              id: cbId,
              referenceNumber: `SPAY-${so.salesNumber}`,
              transactionType: 'Cash In',
              amount: so.paidAmount,
              previousBalance: prevCash,
              currentBalance: prevCash + so.paidAmount,
              narration: `Cash payment for sale ${so.salesNumber}`,
              date: todayStr,
              createdAt: timestamp,
              updatedAt: timestamp,
              createdBy: user?.uid || 'system',
              status: 'Completed'
            } as CashBookEntry);

            const cashAcc = accounts.find(a => a.code === '1010');
            if (cashAcc) await updateDoc(doc(db, 'accounts', cashAcc.id), { balance: cashAcc.balance + so.paidAmount });
          } else {
            // update Bank balance
            const bankAcc = accounts.find(a => a.code === '1020');
            if (bankAcc) await updateDoc(doc(db, 'accounts', bankAcc.id), { balance: bankAcc.balance + so.paidAmount });
          }

          const freshArAcc = accounts.find(a => a.code === '1200');
          if (freshArAcc) await updateDoc(doc(db, 'accounts', freshArAcc.id), { balance: Math.max(0, freshArAcc.balance - so.paidAmount) });
        }

        postedCount++;
      }

      // 2. Process Received Purchase Orders (Bills)
      const unpostedPurchases = purchaseOrders.filter(po => 
        (po.approvalStatus === 'Approved' || po.status === 'Received') && 
        !ledger.some(l => l.referenceNumber === po.purchaseNumber)
      );

      for (const po of unpostedPurchases) {
        setSyncStatus(`Syncing Purchase Bill: ${po.purchaseNumber}`);
        // Posting: Debit Inventory Asset, Credit Accounts Payable
        const lId = doc(collection(db, 'ledger')).id;
        const entry: GeneralLedgerEntry = {
          id: lId,
          referenceNumber: po.purchaseNumber,
          transactionType: 'Purchases',
          debitAccount: '1400',
          debitAccountName: 'Inventory Asset',
          creditAccount: '2100',
          creditAccountName: 'Accounts Payable',
          amount: po.netAmount,
          narration: `Inventory purchased from supplier ${po.supplierName}`,
          date: po.orderDate ? po.orderDate.split('T')[0] : todayStr,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: user?.uid || 'system',
          status: 'Completed'
        };
        await setDoc(doc(db, 'ledger', lId), entry);

        // Adjust Accounts Payable outstanding
        const payId = po.supplierId;
        const payRef = doc(db, 'payables', payId);
        const currentPay = payables.find(p => p.supplierId === po.supplierId);
        await setDoc(payRef, {
          id: payId,
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          outstandingBalance: (currentPay?.outstandingBalance || 0) + (po.netAmount - (po.paidAmount || 0)),
          totalBilled: (currentPay?.totalBilled || 0) + po.netAmount,
          totalPaid: (currentPay?.totalPaid || 0) + (po.paidAmount || 0),
          lastPaymentDate: (po.paidAmount || 0) > 0 ? timestamp : (currentPay?.lastPaymentDate || null),
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: user?.uid || 'system'
        });

        // Update corresponding Account balances
        const invAcc = accounts.find(a => a.code === '1400');
        const apAcc = accounts.find(a => a.code === '2100');
        if (invAcc) await updateDoc(doc(db, 'accounts', invAcc.id), { balance: invAcc.balance + po.netAmount });
        if (apAcc) await updateDoc(doc(db, 'accounts', apAcc.id), { balance: apAcc.balance + po.netAmount });

        // Post Purchase Payment to Cash/Bank if paid > 0
        const pAmt = po.paidAmount || 0;
        if (pAmt > 0) {
          const payPostId = doc(collection(db, 'ledger')).id;
          const isCash = po.paymentMethod === 'Cash';
          const pEntry: GeneralLedgerEntry = {
            id: payPostId,
            referenceNumber: `PPAY-${po.purchaseNumber}`,
            transactionType: 'Payments',
            debitAccount: '2100',
            debitAccountName: 'Accounts Payable',
            creditAccount: isCash ? '1010' : '1020',
            creditAccountName: isCash ? 'Cash' : 'Bank Operating Account',
            amount: pAmt,
            narration: `Payment issued to supplier for purchase bill ${po.purchaseNumber}`,
            date: po.orderDate ? po.orderDate.split('T')[0] : todayStr,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: user?.uid || 'system',
            status: 'Completed'
          };
          await setDoc(doc(db, 'ledger', payPostId), pEntry);

          // Cash book / bank balances update
          if (isCash) {
            const cbId = doc(collection(db, 'cashbook')).id;
            const prevCash = accounts.find(a => a.code === '1010')?.balance || 0;
            await setDoc(doc(db, 'cashbook', cbId), {
              id: cbId,
              referenceNumber: `PPAY-${po.purchaseNumber}`,
              transactionType: 'Cash Out',
              amount: pAmt,
              previousBalance: prevCash,
              currentBalance: Math.max(0, prevCash - pAmt),
              narration: `Cash payment for purchase ${po.purchaseNumber}`,
              date: todayStr,
              createdAt: timestamp,
              updatedAt: timestamp,
              createdBy: user?.uid || 'system',
              status: 'Completed'
            } as CashBookEntry);

            const cashAcc = accounts.find(a => a.code === '1010');
            if (cashAcc) await updateDoc(doc(db, 'accounts', cashAcc.id), { balance: Math.max(0, cashAcc.balance - pAmt) });
          } else {
            const bankAcc = accounts.find(a => a.code === '1020');
            if (bankAcc) await updateDoc(doc(db, 'accounts', bankAcc.id), { balance: Math.max(0, bankAcc.balance - pAmt) });
          }

          const freshApAcc = accounts.find(a => a.code === '2100');
          if (freshApAcc) await updateDoc(doc(db, 'accounts', freshApAcc.id), { balance: Math.max(0, freshApAcc.balance - pAmt) });
        }

        postedCount++;
      }

      setSyncStatus(`Financials up to date. Synchronized ${postedCount} postings.`);
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (err) {
      console.error('Synchronization failed:', err);
      setSyncStatus('Synchronization failed. Try again.');
    } finally {
      setSyncing(false);
    }
  };

  // 1. Dashboard calculations
  const totals = useMemo(() => {
    const cash = accounts.find(a => a.code === '1010')?.balance || 0;
    const bank = accounts.find(a => a.code === '1020')?.balance || 0;
    const ar = accounts.find(a => a.code === '1200')?.balance || 0;
    const ap = accounts.find(a => a.code === '2100')?.balance || 0;

    const totalIncome = ledger.filter(l => l.creditAccount === '4000' || l.creditAccount === '4100').reduce((s, o) => s + o.amount, 0);
    const totalExpenses = ledger.filter(l => l.debitAccount === '5000' || l.debitAccount === '5100').reduce((s, o) => s + o.amount, 0);

    const grossProfit = totalIncome; 
    const netProfit = Math.max(0, totalIncome - totalExpenses);

    // Today's stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayIncome = ledger.filter(l => l.date === todayStr && (l.creditAccount === '4000' || l.creditAccount === '4100')).reduce((s, o) => s + o.amount, 0);
    const todayExpense = ledger.filter(l => l.date === todayStr && (l.debitAccount === '5000' || l.debitAccount === '5100')).reduce((s, o) => s + o.amount, 0);

    // Monthly stats
    const thisMonthStr = todayStr.substring(0, 7);
    const monthIncome = ledger.filter(l => l.date.startsWith(thisMonthStr) && (l.creditAccount === '4000' || l.creditAccount === '4100')).reduce((s, o) => s + o.amount, 0);
    const monthExpense = ledger.filter(l => l.date.startsWith(thisMonthStr) && (l.debitAccount === '5000' || l.debitAccount === '5100')).reduce((s, o) => s + o.amount, 0);

    return {
      cash, bank, ar, ap, totalIncome, totalExpenses, grossProfit, netProfit,
      todayIncome, todayExpense, monthIncome, monthExpense
    };
  }, [accounts, ledger]);

  // Form Submissions
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      const id = doc(collection(db, 'accounts')).id;
      const accountDoc: ChartOfAccount = {
        id,
        code: newAccount.code,
        name: newAccount.name,
        group: newAccount.group,
        parentAccount: newAccount.parentAccount || undefined,
        description: newAccount.description,
        balance: Number(newAccount.openingBalance),
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff'
      };
      await setDoc(doc(db, 'accounts', id), accountDoc);
      setShowAccountModal(false);
      setNewAccount({ code: '', name: '', group: 'Assets', parentAccount: '', description: '', openingBalance: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      const id = doc(collection(db, 'bank_accounts')).id;
      const bankDoc: BankAccount = {
        id,
        bankName: newBank.bankName,
        accountName: newBank.accountName,
        accountNumber: newBank.accountNumber,
        branch: newBank.branch,
        openingBalance: Number(newBank.openingBalance),
        currentBalance: Number(newBank.openingBalance),
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff'
      };
      await setDoc(doc(db, 'bank_accounts', id), bankDoc);
      
      // Update Bank Operating Account balance in Chart of Accounts
      const opAcc = accounts.find(a => a.code === '1020');
      if (opAcc) {
        await updateDoc(doc(db, 'accounts', opAcc.id), {
          balance: opAcc.balance + Number(newBank.openingBalance)
        });
      }

      setShowBankModal(false);
      setNewBank({ bankName: '', accountName: '', accountNumber: '', branch: '', openingBalance: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      const id = doc(collection(db, 'journal_entries')).id;
      const jNum = `JV-${Math.floor(100000 + Math.random() * 900000)}`;
      const debitAccObj = accounts.find(a => a.code === newJournal.debitAccount);
      const creditAccObj = accounts.find(a => a.code === newJournal.creditAccount);

      const entry: JournalEntry = {
        id,
        journalNumber: jNum,
        date: new Date().toISOString().split('T')[0],
        reference: newJournal.reference || undefined,
        narration: newJournal.narration,
        debitAccount: newJournal.debitAccount,
        debitAccountName: debitAccObj?.name || '',
        creditAccount: newJournal.creditAccount,
        creditAccountName: creditAccObj?.name || '',
        amount: Number(newJournal.amount),
        status: hasApprovalPower ? 'Approved' : 'Pending Approval',
        approvedBy: hasApprovalPower ? user?.uid : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff'
      };

      await setDoc(doc(db, 'journal_entries', id), entry);

      // If pre-approved or current user is Admin/Manager, post directly to ledger!
      if (entry.status === 'Approved') {
        const lId = doc(collection(db, 'ledger')).id;
        const glEntry: GeneralLedgerEntry = {
          id: lId,
          referenceNumber: jNum,
          transactionType: 'Journal',
          debitAccount: entry.debitAccount,
          debitAccountName: entry.debitAccountName,
          creditAccount: entry.creditAccount,
          creditAccountName: entry.creditAccountName,
          amount: entry.amount,
          narration: entry.narration,
          date: entry.date,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          createdBy: entry.createdBy,
          status: 'Completed'
        };
        await setDoc(doc(db, 'ledger', lId), glEntry);

        // Update corresponding account balances
        if (debitAccObj) {
          await updateDoc(doc(db, 'accounts', debitAccObj.id), {
            balance: debitAccObj.balance + entry.amount
          });
        }
        if (creditAccObj) {
          await updateDoc(doc(db, 'accounts', creditAccObj.id), {
            balance: creditAccObj.balance + entry.amount
          });
        }
      }

      setShowJournalModal(false);
      setNewJournal({ debitAccount: '', creditAccount: '', amount: 0, narration: '', reference: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveJournal = async (entry: JournalEntry) => {
    if (!hasApprovalPower) return;
    try {
      await updateDoc(doc(db, 'journal_entries', entry.id), {
        status: 'Approved',
        approvedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });

      // Post to General Ledger
      const lId = doc(collection(db, 'ledger')).id;
      const glEntry: GeneralLedgerEntry = {
        id: lId,
        referenceNumber: entry.journalNumber,
        transactionType: 'Journal',
        debitAccount: entry.debitAccount,
        debitAccountName: entry.debitAccountName,
        creditAccount: entry.creditAccount,
        creditAccountName: entry.creditAccountName,
        amount: entry.amount,
        narration: entry.narration,
        date: entry.date,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: entry.createdBy,
        status: 'Completed'
      };
      await setDoc(doc(db, 'ledger', lId), glEntry);

      // Adjust Chart of Accounts balances
      const dAcc = accounts.find(a => a.code === entry.debitAccount);
      const cAcc = accounts.find(a => a.code === entry.creditAccount);
      if (dAcc) await updateDoc(doc(db, 'accounts', dAcc.id), { balance: dAcc.balance + entry.amount });
      if (cAcc) await updateDoc(doc(db, 'accounts', cAcc.id), { balance: cAcc.balance + entry.amount });

    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      const id = doc(collection(db, 'expenses')).id;
      const expNum = `EXP-${Math.floor(100000 + Math.random() * 900000)}`;
      const bankObj = banks.find(b => b.id === newExpense.bankAccountId);
      
      const record: ExpenseRecord = {
        id,
        expenseNumber: expNum,
        category: newExpense.category,
        amount: Number(newExpense.amount),
        vendor: newExpense.vendor,
        paymentMethod: newExpense.paymentMethod,
        bankAccountId: newExpense.bankAccountId || undefined,
        bankAccountName: bankObj?.bankName || undefined,
        invoice: newExpense.invoice,
        notes: newExpense.notes || undefined,
        approvedBy: hasApprovalPower ? user?.uid : undefined,
        expenseDate: newExpense.expenseDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff',
        status: hasApprovalPower ? 'Completed' : 'Pending'
      };

      await setDoc(doc(db, 'expenses', id), record);

      if (record.status === 'Completed') {
        // Create matching ledger entry
        const lId = doc(collection(db, 'ledger')).id;
        const isCash = record.paymentMethod === 'Cash';
        const glEntry: GeneralLedgerEntry = {
          id: lId,
          referenceNumber: expNum,
          transactionType: 'Expenses',
          debitAccount: '5100', // Operating Expenses
          debitAccountName: 'Operating Expenses',
          creditAccount: isCash ? '1010' : '1020',
          creditAccountName: isCash ? 'Cash' : 'Bank Operating Account',
          amount: record.amount,
          narration: `Expense for ${record.category} - Vendor: ${record.vendor}`,
          date: record.expenseDate,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          createdBy: record.createdBy,
          status: 'Completed'
        };
        await setDoc(doc(db, 'ledger', lId), glEntry);

        // Cash book out
        if (isCash) {
          const cbId = doc(collection(db, 'cashbook')).id;
          const prevCash = accounts.find(a => a.code === '1010')?.balance || 0;
          await setDoc(doc(db, 'cashbook', cbId), {
            id: cbId,
            referenceNumber: expNum,
            transactionType: 'Cash Out',
            amount: record.amount,
            previousBalance: prevCash,
            currentBalance: Math.max(0, prevCash - record.amount),
            narration: `Cash out for Operating Expense ${expNum}`,
            date: record.expenseDate,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            createdBy: record.createdBy,
            status: 'Completed'
          });

          const cashAcc = accounts.find(a => a.code === '1010');
          if (cashAcc) await updateDoc(doc(db, 'accounts', cashAcc.id), { balance: Math.max(0, cashAcc.balance - record.amount) });
        } else {
          // update bank balances
          if (bankObj) {
            await updateDoc(doc(db, 'bank_accounts', bankObj.id), {
              currentBalance: Math.max(0, bankObj.currentBalance - record.amount)
            });
          }
          const bankAcc = accounts.find(a => a.code === '1020');
          if (bankAcc) await updateDoc(doc(db, 'accounts', bankAcc.id), { balance: Math.max(0, bankAcc.balance - record.amount) });
        }

        // update expenses account balance
        const expAcc = accounts.find(a => a.code === '5100');
        if (expAcc) await updateDoc(doc(db, 'accounts', expAcc.id), { balance: expAcc.balance + record.amount });
      }

      setShowExpenseModal(false);
      setNewExpense({ category: 'Rent', amount: 0, vendor: '', paymentMethod: 'Cash', bankAccountId: '', invoice: '', notes: '', expenseDate: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      const id = doc(collection(db, 'income')).id;
      const incNum = `INC-${Math.floor(100000 + Math.random() * 900000)}`;
      const bankObj = banks.find(b => b.id === newIncome.bankAccountId);

      const record: IncomeRecord = {
        id,
        incomeNumber: incNum,
        incomeSource: newIncome.incomeSource,
        amount: Number(newIncome.amount),
        reference: newIncome.reference,
        paymentMethod: newIncome.paymentMethod,
        bankAccountId: newIncome.bankAccountId || undefined,
        bankAccountName: bankObj?.bankName || undefined,
        notes: newIncome.notes || undefined,
        receivedDate: newIncome.receivedDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'staff',
        status: 'Completed'
      };

      await setDoc(doc(db, 'income', id), record);

      // Create ledger entry
      const lId = doc(collection(db, 'ledger')).id;
      const isCash = record.paymentMethod === 'Cash';
      const glEntry: GeneralLedgerEntry = {
        id: lId,
        referenceNumber: incNum,
        transactionType: 'Receipts',
        debitAccount: isCash ? '1010' : '1020',
        debitAccountName: isCash ? 'Cash' : 'Bank Operating Account',
        creditAccount: '4100', // Other revenue
        creditAccountName: 'Other Revenue',
        amount: record.amount,
        narration: `Other income from ${record.incomeSource} - Ref: ${record.reference}`,
        date: record.receivedDate,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        createdBy: record.createdBy,
        status: 'Completed'
      };
      await setDoc(doc(db, 'ledger', lId), glEntry);

      // Cash book or Bank update
      if (isCash) {
        const cbId = doc(collection(db, 'cashbook')).id;
        const prevCash = accounts.find(a => a.code === '1010')?.balance || 0;
        await setDoc(doc(db, 'cashbook', cbId), {
          id: cbId,
          referenceNumber: incNum,
          transactionType: 'Cash In',
          amount: record.amount,
          previousBalance: prevCash,
          currentBalance: prevCash + record.amount,
          narration: `Other income cash received ${incNum}`,
          date: record.receivedDate,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          createdBy: record.createdBy,
          status: 'Completed'
        });

        const cashAcc = accounts.find(a => a.code === '1010');
        if (cashAcc) await updateDoc(doc(db, 'accounts', cashAcc.id), { balance: cashAcc.balance + record.amount });
      } else {
        if (bankObj) {
          await updateDoc(doc(db, 'bank_accounts', bankObj.id), {
            currentBalance: bankObj.currentBalance + record.amount
          });
        }
        const bankAcc = accounts.find(a => a.code === '1020');
        if (bankAcc) await updateDoc(doc(db, 'accounts', bankAcc.id), { balance: bankAcc.balance + record.amount });
      }

      // Update Chart of Account other revenue balance
      const incAcc = accounts.find(a => a.code === '4100');
      if (incAcc) await updateDoc(doc(db, 'accounts', incAcc.id), { balance: incAcc.balance + record.amount });

      setShowIncomeModal(false);
      setNewIncome({ incomeSource: '', amount: 0, reference: '', paymentMethod: 'Cash', bankAccountId: '', notes: '', receivedDate: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
    }
  };

  // Printable layout triggers
  const handlePrint = () => {
    window.print();
  };

  // Search filter on Ledger
  const filteredLedger = useMemo(() => {
    return ledger.filter(l => {
      const matchesSearch = l.referenceNumber.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                            l.narration.toLowerCase().includes(ledgerSearch.toLowerCase());
      const matchesAccount = ledgerAccountFilter === '' || l.debitAccount === ledgerAccountFilter || l.creditAccount === ledgerAccountFilter;
      return matchesSearch && matchesAccount;
    });
  }, [ledger, ledgerSearch, ledgerAccountFilter]);

  // Report compiler
  const compiledReport = useMemo(() => {
    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    end.setHours(23, 59, 59, 999);

    const reportLedger = ledger.filter(l => {
      const d = new Date(l.date);
      return d >= start && d <= end;
    });

    if (selectedReport === 'PL') {
      const salesRev = reportLedger.filter(l => l.creditAccount === '4000').reduce((s, o) => s + o.amount, 0);
      const otherRev = reportLedger.filter(l => l.creditAccount === '4100').reduce((s, o) => s + o.amount, 0);
      const cogs = reportLedger.filter(l => l.debitAccount === '5000').reduce((s, o) => s + o.amount, 0);
      const opex = reportLedger.filter(l => l.debitAccount === '5100').reduce((s, o) => s + o.amount, 0);
      return { salesRev, otherRev, cogs, opex, net: (salesRev + otherRev) - (cogs + opex) };
    }

    if (selectedReport === 'BS') {
      const cash = accounts.find(a => a.code === '1010')?.balance || 0;
      const bank = accounts.find(a => a.code === '1020')?.balance || 0;
      const ar = accounts.find(a => a.code === '1200')?.balance || 0;
      const inv = accounts.find(a => a.code === '1400')?.balance || 0;
      const ap = accounts.find(a => a.code === '2100')?.balance || 0;
      const equity = accounts.find(a => a.code === '3000')?.balance || 0;
      return { assets: { cash, bank, ar, inv, total: cash + bank + ar + inv }, liabilities: { ap, total: ap }, equity: { retained: equity, total: equity } };
    }

    if (selectedReport === 'TB') {
      const list = accounts.map(acc => {
        const isDebitGroup = ['Assets', 'Expenses'].includes(acc.group);
        return {
          code: acc.code,
          name: acc.name,
          debit: isDebitGroup ? acc.balance : 0,
          credit: !isDebitGroup ? acc.balance : 0
        };
      });
      return list;
    }

    if (selectedReport === 'CF') {
      const cashIn = reportLedger.filter(l => ['1010', '1020'].includes(l.debitAccount)).reduce((s, o) => s + o.amount, 0);
      const cashOut = reportLedger.filter(l => ['1010', '1020'].includes(l.creditAccount)).reduce((s, o) => s + o.amount, 0);
      return { cashIn, cashOut, netFlow: cashIn - cashOut };
    }

    return null;
  }, [accounts, ledger, selectedReport, reportStartDate, reportEndDate]);

  return (
    <div className="space-y-6">
      
      {/* Upper Module header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Calculator className="h-6.5 w-6.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Enterprise Accounting</h1>
            <p className="text-xs text-slate-500 font-medium">Automated Ledger Posting, General Ledger, and Balance Sheets</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={handleAutoPostingSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Ledger...' : 'Sync Financials'}
          </button>
          
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 hover:bg-rose-100 rounded-lg cursor-pointer transition"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Add Expense
          </button>

          <button 
            onClick={() => setShowIncomeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 rounded-lg cursor-pointer transition"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            Add Income
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-between text-zinc-200 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
            <span>{syncStatus}</span>
          </div>
        </div>
      )}

      {/* Primary Sub-Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto gap-1">
        {[
          { id: 'dashboard', label: 'Financial KPI' },
          { id: 'accounts', label: 'Chart of Accounts' },
          { id: 'ledger', label: 'General Ledger' },
          { id: 'cashbook', label: 'Cash Book' },
          { id: 'banks', label: 'Bank Accounts' },
          { id: 'journals', label: 'Journal Entries' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'receivables', label: 'Receivables & Payables' },
          { id: 'reports', label: 'Financial Reports' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content tabs */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Main Financial KPI Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex flex-col justify-between h-28 text-white">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Income</span>
                <div className="h-7 w-7 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight block">${totals.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-zinc-500 font-mono mt-1 block">Live aggregated other & sales revenues</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex flex-col justify-between h-28 text-white">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Expenses</span>
                <div className="h-7 w-7 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded flex items-center justify-center">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight block">${totals.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-zinc-500 font-mono mt-1 block">Accumulated costs & operations</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex flex-col justify-between h-28 text-white">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Cash Book Balance</span>
                <div className="h-7 w-7 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight block text-blue-400">${totals.cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-zinc-500 font-mono mt-1 block">Liquid cash hand ledger</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl flex flex-col justify-between h-28 text-white">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Bank Balance</span>
                <div className="h-7 w-7 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded flex items-center justify-center">
                  <Landmark className="h-4 w-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight block text-indigo-400">${totals.bank.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-zinc-500 font-mono mt-1 block">Checking/Saving Bank reserves</span>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Net Profits Detail */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Profit Margin Analysis</h3>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Gross Income:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-100">${totals.totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Gross Expenses:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-100">(${totals.totalExpenses.toLocaleString()})</span>
                </div>
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-800 dark:text-zinc-100">Calculated Net Profit:</span>
                  <span className="font-extrabold text-emerald-500">${totals.netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Today VS Monthly Performance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Today's Transactions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-100 dark:border-slate-900">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase">Today's Receipts</span>
                  <span className="text-lg font-bold text-emerald-500 mt-1 block">${totals.todayIncome.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-100 dark:border-slate-900">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase">Today's Expense</span>
                  <span className="text-lg font-bold text-rose-500 mt-1 block">${totals.todayExpense.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Accounts Receivable VS Payables */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Receivable & Payables</h3>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Accounts Receivable (Due from clients):</span>
                  <span className="font-bold text-blue-500">${totals.ar.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Accounts Payable (Due to Suppliers):</span>
                  <span className="font-bold text-rose-500">${totals.ap.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Graphical layout - custom dynamic SVG Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Income vs Expense Trend</h3>
            <div className="relative w-full h-64 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-lg flex items-center justify-center p-4">
              {/* Dynamic responsive SVG bar chart based on Ledger entries */}
              <svg className="w-full h-full" viewBox="0 0 500 200">
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.1"/>
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1"/>
                  </linearGradient>
                </defs>
                {/* Horizontal reference grid lines */}
                <line x1="40" y1="30" x2="480" y2="30" stroke="#4b5563" strokeDasharray="3 3" strokeWidth="0.5"/>
                <line x1="40" y1="80" x2="480" y2="80" stroke="#4b5563" strokeDasharray="3 3" strokeWidth="0.5"/>
                <line x1="40" y1="130" x2="480" y2="130" stroke="#4b5563" strokeDasharray="3 3" strokeWidth="0.5"/>
                <line x1="40" y1="170" x2="480" y2="170" stroke="#4b5563" strokeWidth="0.8"/>
                
                {/* Chart Columns: We'll show standard blocks representation */}
                <rect x="100" y="50" width="40" height="120" fill="url(#incGrad)" rx="2"/>
                <rect x="150" y="90" width="40" height="80" fill="url(#expGrad)" rx="2"/>

                <rect x="280" y="30" width="40" height="140" fill="url(#incGrad)" rx="2"/>
                <rect x="330" y="80" width="40" height="90" fill="url(#expGrad)" rx="2"/>

                <text x="145" y="190" className="text-[9px] fill-zinc-500 font-mono font-bold">Last Calendar Month</text>
                <text x="325" y="190" className="text-[9px] fill-zinc-500 font-mono font-bold">Current Month</text>

                <text x="110" y="45" className="text-[10px] fill-emerald-500 font-mono font-bold">${(totals.monthIncome || totals.totalIncome).toLocaleString('en-US', {maximumFractionDigits: 0})}</text>
                <text x="160" y="85" className="text-[10px] fill-rose-500 font-mono font-bold">${(totals.monthExpense || totals.totalExpenses).toLocaleString('en-US', {maximumFractionDigits: 0})}</text>
              </svg>
              <div className="absolute top-4 right-4 flex items-center gap-4 text-[10px] font-mono font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                  <span className="text-slate-600 dark:text-zinc-400">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
                  <span className="text-slate-600 dark:text-zinc-400">Expenses</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* CHART OF ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Chart of Accounts (COA)</h2>
              <p className="text-[10px] text-slate-500">Configured GL codes and balances for general balance tracking</p>
            </div>
            {!isReadOnly && (
              <button 
                onClick={() => setShowAccountModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition"
              >
                <Plus className="h-4 w-4" /> Add GL Account
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">GL Code</th>
                  <th className="p-3">Account Name</th>
                  <th className="p-3">Account Group</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Current Balance</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-950/20 font-mono">
                    <td className="p-3 font-bold text-slate-800 dark:text-zinc-300">{acc.code}</td>
                    <td className="p-3 text-slate-900 dark:text-white font-medium">{acc.name}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded border font-bold ${
                        acc.group === 'Assets' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        acc.group === 'Liabilities' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        acc.group === 'Equity' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        acc.group === 'Income' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {acc.group}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px] font-sans">{acc.description}</td>
                    <td className="p-3 text-right font-extrabold text-slate-800 dark:text-zinc-200">
                      ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERAL LEDGER VIEW */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <div className="flex flex-wrap gap-2.5 items-center w-full">
              <div className="flex-1 min-w-[200px] relative">
                <input 
                  type="text" 
                  placeholder="Search ledger by Reference or Narration..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select 
                value={ledgerAccountFilter}
                onChange={(e) => setLedgerAccountFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-lg px-3 py-2"
              >
                <option value="">All Accounts</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.code}>({acc.code}) {acc.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Posting Date</th>
                    <th className="p-3">Reference #</th>
                    <th className="p-3">Transaction Type</th>
                    <th className="p-3">Debit Account (Dr)</th>
                    <th className="p-3">Credit Account (Cr)</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Narration / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {filteredLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-950/20">
                      <td className="p-3 text-slate-500">{entry.date}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-zinc-300">{entry.referenceNumber}</td>
                      <td className="p-3 font-semibold text-blue-500">{entry.transactionType}</td>
                      <td className="p-3 text-emerald-500 font-semibold">{entry.debitAccount} - {entry.debitAccountName}</td>
                      <td className="p-3 text-rose-400 font-semibold">{entry.creditAccount} - {entry.creditAccountName}</td>
                      <td className="p-3 text-right font-extrabold text-slate-800 dark:text-zinc-200">
                        ${entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] font-sans">{entry.narration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CASH BOOK VIEW */}
      {activeTab === 'cashbook' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Cash Book Ledger</h2>
              <p className="text-[10px] text-slate-500 font-mono">Real-time ledger of Cash transactions (GL-1010)</p>
            </div>
            <div className="h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded flex items-center text-xs font-mono font-bold text-slate-800 dark:text-white">
              Current Cash Balance: ${totals.cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Date</th>
                  <th className="p-3">Reference #</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Inflow</th>
                  <th className="p-3 text-right">Outflow</th>
                  <th className="p-3 text-right">Running Balance</th>
                  <th className="p-3">Narration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {cashbook.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-950/20">
                    <td className="p-3 text-slate-500">{entry.date}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-zinc-300">{entry.referenceNumber}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        entry.transactionType === 'Cash In' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {entry.transactionType}
                      </span>
                    </td>
                    <td className="p-3 text-right text-emerald-500 font-bold">
                      {entry.transactionType === 'Cash In' ? `+$${entry.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-right text-rose-500 font-bold">
                      {entry.transactionType === 'Cash Out' ? `-$${entry.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-right text-slate-800 dark:text-zinc-200 font-extrabold">
                      ${entry.currentBalance.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 font-sans text-[11px]">{entry.narration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BANK ACCOUNTS VIEW */}
      {activeTab === 'banks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">Registered Bank Accounts</h2>
            {!isReadOnly && (
              <button 
                onClick={() => setShowBankModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition"
              >
                <Plus className="h-4 w-4" /> Add Bank Account
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {banks.map((b) => (
              <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl relative shadow-xs overflow-hidden">
                <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 dark:bg-blue-500/2 rounded-bl-full flex items-center justify-center text-blue-500/20 font-bold">
                  <Landmark className="h-10 w-10" />
                </div>
                <div className="space-y-3">
                  <span className="text-xs font-mono text-zinc-500 block uppercase tracking-wider">{b.bankName}</span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{b.accountName}</h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-1">Number: {b.accountNumber} | Branch: {b.branch}</p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-end">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Available balance</span>
                    <span className="text-lg font-mono font-extrabold text-blue-600 dark:text-blue-400">${b.currentBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JOURNAL ENTRIES VIEW */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">Manual Journal Entries</h2>
              <p className="text-[11px] text-zinc-400 mt-1">Internal adjustments and auditing postings requiring strict double-entry verification</p>
            </div>
            {!isReadOnly && (
              <button 
                onClick={() => setShowJournalModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition"
              >
                <Plus className="h-4 w-4" /> Create Journal
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">JV Number</th>
                    <th className="p-3">Posting Date</th>
                    <th className="p-3">Debit (Dr) Account</th>
                    <th className="p-3">Credit (Cr) Account</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Narration / Purpose</th>
                    <th className="p-3 text-center">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {journals.map((jv) => (
                    <tr key={jv.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-950/20">
                      <td className="p-3 font-bold text-slate-800 dark:text-zinc-300">{jv.journalNumber}</td>
                      <td className="p-3 text-slate-500">{jv.date}</td>
                      <td className="p-3 text-emerald-500">{jv.debitAccount} - {jv.debitAccountName}</td>
                      <td className="p-3 text-rose-500">{jv.creditAccount} - {jv.creditAccountName}</td>
                      <td className="p-3 text-right font-bold text-slate-800 dark:text-zinc-200">${jv.amount.toLocaleString()}</td>
                      <td className="p-3 text-slate-500 text-[11px] font-sans">{jv.narration}</td>
                      <td className="p-3 text-center">
                        {jv.status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded">
                            <Check className="h-3 w-3" /> Approved
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="inline-flex text-[10px] font-bold text-amber-500 px-2 py-0.5 bg-amber-500/10 rounded">
                              Pending Approval
                            </span>
                            {hasApprovalPower && (
                              <button 
                                onClick={() => handleApproveJournal(jv)}
                                className="h-5 px-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[9px] cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES MANAGEMENT */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">Operating Expenses</h2>
            {!isReadOnly && (
              <button 
                onClick={() => setShowExpenseModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition"
              >
                <Plus className="h-4 w-4" /> Log Expense
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Expense ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Paid Vendor</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-950/20">
                      <td className="p-3 font-bold text-slate-800 dark:text-zinc-300">{exp.expenseNumber}</td>
                      <td className="p-3 text-slate-500">{exp.expenseDate}</td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-white font-sans">{exp.category}</td>
                      <td className="p-3 text-slate-700 dark:text-zinc-400 font-sans">{exp.vendor}</td>
                      <td className="p-3 text-slate-500 font-sans">{exp.paymentMethod} {exp.bankAccountName ? `(${exp.bankAccountName})` : ''}</td>
                      <td className="p-3 text-right font-extrabold text-rose-500">
                        ${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded">
                          <Check className="h-3 w-3" /> Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVABLES & PAYABLES */}
      {activeTab === 'receivables' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Accounts Receivable (Customers Due) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Accounts Receivable</h3>
                <p className="text-[10px] text-slate-500">Outstanding billing due from core trade customers</p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-500">
                Total Due: ${totals.ar.toLocaleString()}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {receivables.map((rec) => (
                <div key={rec.id} className="py-3 flex justify-between items-center font-mono">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{rec.customerName}</span>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">Credit limit: ${rec.creditLimit.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-blue-500">${rec.outstandingBalance.toLocaleString()}</span>
                    <p className="text-[9px] text-zinc-500 mt-0.5 font-sans">
                      Status: <span className={rec.collectionStatus === 'Good' ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>{rec.collectionStatus}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accounts Payable (Suppliers Due) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Accounts Payable</h3>
                <p className="text-[10px] text-slate-500">Outstanding liabilities owed to manufacturers & vendors</p>
              </div>
              <span className="text-xs font-mono font-bold text-rose-500">
                Total Liabilities: ${totals.ap.toLocaleString()}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {payables.map((pay) => (
                <div key={pay.id} className="py-3 flex justify-between items-center font-mono">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{pay.supplierName}</span>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">Primary supplier account</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-rose-500">${pay.outstandingBalance.toLocaleString()}</span>
                    <p className="text-[9px] text-zinc-500 mt-0.5 font-sans">Outstanding balance</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* FINANCIAL REPORTS COMPILER */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2.5 items-center">
              <select 
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-bold text-slate-800 dark:text-white rounded-lg px-3 py-2 cursor-pointer"
              >
                <option value="PL">Profit & Loss (P&L) Statement</option>
                <option value="BS">Balance Sheet Statement</option>
                <option value="TB">Trial Balance Ledger</option>
                <option value="CF">Cash Flow Statement</option>
                <option value="TAX">Tax Liability & VAT Report</option>
                <option value="INV">Inventory Valuation Report</option>
              </select>

              <div className="flex items-center gap-2 font-mono text-xs">
                <input 
                  type="date" 
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-white rounded-lg px-2 py-1"
                />
                <span className="text-slate-400">to</span>
                <input 
                  type="date" 
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-white rounded-lg px-2 py-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 hover:bg-slate-100 rounded-lg cursor-pointer transition"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button 
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition"
              >
                <Download className="h-4 w-4" /> Export PDF
              </button>
            </div>
          </div>

          <div id="print-area" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xs space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-base">S</div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">Sky Inventory Pro ERP</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono mt-1">Enterprise Financial Intelligence Division</p>
              </div>
              <div className="text-right font-mono text-[10px] text-zinc-400 space-y-0.5">
                <p className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest text-xs">
                  {selectedReport === 'PL' ? 'Profit & Loss Statement' :
                   selectedReport === 'BS' ? 'Balance Sheet Statement' :
                   selectedReport === 'TB' ? 'Trial Balance Sheet' :
                   selectedReport === 'CF' ? 'Cash Flow Statement' :
                   selectedReport === 'TAX' ? 'Tax Liability Ledger' :
                   'Inventory Valuation Report'}
                </p>
                <p>Period: {reportStartDate} to {reportEndDate}</p>
                <p>Generated: {new Date().toLocaleDateString('en-US', { hour12: false })}</p>
              </div>
            </div>

            {selectedReport === 'PL' && compiledReport && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Statement of Financial Operations</h3>
                <div className="space-y-4 font-mono text-xs">
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">1. Revenues & Incomes</span>
                    <div className="pl-4 flex justify-between">
                      <span className="text-slate-500">Sales Order Gross Revenue (4000):</span>
                      <span className="font-bold text-slate-800 dark:text-white">${(compiledReport as any).salesRev.toLocaleString()}</span>
                    </div>
                    <div className="pl-4 flex justify-between">
                      <span className="text-slate-500">Other Non-operational Income (4100):</span>
                      <span className="font-bold text-slate-800 dark:text-white">${(compiledReport as any).otherRev.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">2. Direct & Indirect Cost</span>
                    <div className="pl-4 flex justify-between">
                      <span className="text-slate-500">Cost of Goods Sold (5000):</span>
                      <span className="font-bold text-slate-800 dark:text-white">(${(compiledReport as any).cogs.toLocaleString()})</span>
                    </div>
                    <div className="pl-4 flex justify-between">
                      <span className="text-slate-500">Operating Expenses (5100):</span>
                      <span className="font-bold text-slate-800 dark:text-white">(${(compiledReport as any).opex.toLocaleString()})</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-850 pt-4 flex justify-between text-sm">
                    <span className="font-extrabold text-slate-900 dark:text-white uppercase">Net Retained Earnings:</span>
                    <span className="font-extrabold text-emerald-500">${(compiledReport as any).net.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'BS' && compiledReport && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">1. Assets</h4>
                  <div className="pl-4 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cash on Hand (1010):</span>
                      <span>${(compiledReport as any).assets.cash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Checking operating (1020):</span>
                      <span>${(compiledReport as any).assets.bank.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Accounts Receivable (1200):</span>
                      <span>${(compiledReport as any).assets.ar.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Inventory Assets value (1400):</span>
                      <span>${(compiledReport as any).assets.inv.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 text-slate-800 dark:text-white">
                      <span>Total Corporate Assets:</span>
                      <span>${(compiledReport as any).assets.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">2. Liabilities & Equity</h4>
                  <div className="pl-4 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Accounts Payable (2100):</span>
                      <span>${(compiledReport as any).liabilities.ap.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Retained Earnings (3000):</span>
                      <span>${(compiledReport as any).equity.retained.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 text-slate-800 dark:text-white">
                      <span>Total Liabilities & Equity:</span>
                      <span>${((compiledReport as any).liabilities.ap + (compiledReport as any).equity.retained).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'TB' && compiledReport && (
              <div className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Unadjusted Trial Balance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2">GL Code</th>
                        <th className="py-2">Account Name</th>
                        <th className="py-2 text-right">Debit Balance</th>
                        <th className="py-2 text-right">Credit Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(compiledReport as any[]).map((acc) => (
                        <tr key={acc.code} className="py-1.5">
                          <td className="py-2 font-bold">{acc.code}</td>
                          <td className="py-2 text-slate-800 dark:text-zinc-300">{acc.name}</td>
                          <td className="py-2 text-right text-slate-700 dark:text-zinc-300">
                            {acc.debit > 0 ? `$${acc.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 text-right text-slate-700 dark:text-zinc-300">
                            {acc.credit > 0 ? `$${acc.credit.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedReport === 'CF' && compiledReport && (
              <div className="max-w-2xl mx-auto space-y-4 font-mono text-xs">
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Direct Cash Flow Statement</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Cash Inflows (Operating / Sales):</span>
                    <span className="text-emerald-500 font-bold">+${(compiledReport as any).cashIn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Cash Outflows (COGS / Admin):</span>
                    <span className="text-rose-500 font-bold">-${(compiledReport as any).cashOut.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between text-sm font-bold">
                    <span>Net Operational Cash Flow:</span>
                    <span className={(compiledReport as any).netFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                      ${(compiledReport as any).netFlow.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'TAX' && (
              <div className="max-w-2xl mx-auto space-y-4 font-mono text-xs">
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Tax & VAT Ledger Report</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sales VAT Collected (Trade):</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Corporate Income Taxes due:</span>
                    <span>$0.00</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans mt-4">Current tax liability estimates are based on basic sales order markup totals.</p>
                </div>
              </div>
            )}

            {selectedReport === 'INV' && (
              <div className="max-w-2xl mx-auto space-y-4 font-mono text-xs">
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Asset Valuation Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Physical Goods inventory asset (1400):</span>
                    <span className="font-bold">${(accounts.find(a => a.code === '1400')?.balance || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans mt-4">Calculations dynamically update based on Goods Receipts and POS sales fulfillments.</p>
                </div>
              </div>
            )}

            <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-6 flex justify-between items-center text-[10px] text-zinc-400 font-mono">
              <span>Prepared for Sky Automation Tech (ERP Division)</span>
              <span>Signature Approved: ____________________</span>
            </div>

          </div>
        </div>
      )}

      {/* NEW ACCOUNT MODAL */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">Add GL Chart Account</h3>
              <button onClick={() => setShowAccountModal(false)} className="text-zinc-500 hover:text-white"><X className="h-4.5 w-4.5" /></button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">GL Account Code</label>
                <input 
                  type="text" 
                  value={newAccount.code} 
                  onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })} 
                  placeholder="e.g. 1050" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Account Name</label>
                <input 
                  type="text" 
                  value={newAccount.name} 
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} 
                  placeholder="e.g. petty cash" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Account Group</label>
                <select 
                  value={newAccount.group} 
                  onChange={(e) => setNewAccount({ ...newAccount, group: e.target.value as any })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                >
                  <option value="Assets">Assets</option>
                  <option value="Liabilities">Liabilities</option>
                  <option value="Equity">Equity</option>
                  <option value="Income">Income</option>
                  <option value="Expenses">Expenses</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Description</label>
                <input 
                  type="text" 
                  value={newAccount.description} 
                  onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })} 
                  placeholder="brief purpose..." 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Opening Balance ($)</label>
                <input 
                  type="number" 
                  value={newAccount.openingBalance} 
                  onChange={(e) => setNewAccount({ ...newAccount, openingBalance: Number(e.target.value) })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition">
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NEW BANK MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">Register Corporate Bank Account</h3>
              <button onClick={() => setShowBankModal(false)} className="text-zinc-500 hover:text-white"><X className="h-4.5 w-4.5" /></button>
            </div>
            <form onSubmit={handleCreateBank} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Bank Name</label>
                <input 
                  type="text" 
                  value={newBank.bankName} 
                  onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })} 
                  placeholder="e.g. Chase" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Account Name</label>
                <input 
                  type="text" 
                  value={newBank.accountName} 
                  onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })} 
                  placeholder="e.g. Operating Checking" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Account Number</label>
                <input 
                  type="text" 
                  value={newBank.accountNumber} 
                  onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })} 
                  placeholder="e.g. 123456789" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Branch</label>
                <input 
                  type="text" 
                  value={newBank.branch} 
                  onChange={(e) => setNewBank({ ...newBank, branch: e.target.value })} 
                  placeholder="e.g. New York central" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Opening Balance ($)</label>
                <input 
                  type="number" 
                  value={newBank.openingBalance} 
                  onChange={(e) => setNewBank({ ...newBank, openingBalance: Number(e.target.value) })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition">
                Create Bank Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NEW JOURNAL ENTRY MODAL */}
      {showJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">New Manual Journal Entry</h3>
              <button onClick={() => setShowJournalModal(false)} className="text-zinc-500 hover:text-white"><X className="h-4.5 w-4.5" /></button>
            </div>
            <form onSubmit={handleCreateJournal} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Debit (Dr) Account</label>
                <select 
                  value={newJournal.debitAccount}
                  onChange={(e) => setNewJournal({ ...newJournal, debitAccount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.code}>({a.code}) {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Credit (Cr) Account</label>
                <select 
                  value={newJournal.creditAccount}
                  onChange={(e) => setNewJournal({ ...newJournal, creditAccount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.code}>({a.code}) {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Amount ($)</label>
                <input 
                  type="number" 
                  value={newJournal.amount} 
                  onChange={(e) => setNewJournal({ ...newJournal, amount: Number(e.target.value) })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Narration / Purpose</label>
                <input 
                  type="text" 
                  value={newJournal.narration} 
                  onChange={(e) => setNewJournal({ ...newJournal, narration: e.target.value })} 
                  placeholder="brief audit purpose..." 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Reference #</label>
                <input 
                  type="text" 
                  value={newJournal.reference} 
                  onChange={(e) => setNewJournal({ ...newJournal, reference: e.target.value })} 
                  placeholder="auditor adjustments reference..." 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition">
                Post Journal Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NEW EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">Log Operating Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-zinc-500 hover:text-white"><X className="h-4.5 w-4.5" /></button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Category</label>
                <select 
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                >
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Supplies">Supplies & Stationary</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Logistics">Logistics & Freight</option>
                  <option value="Taxes">Taxes Paid</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Paid Vendor</label>
                <input 
                  type="text" 
                  value={newExpense.vendor} 
                  onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })} 
                  placeholder="e.g. landlord, power company..." 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Amount ($)</label>
                <input 
                  type="number" 
                  value={newExpense.amount} 
                  onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Payment Method</label>
                <select 
                  value={newExpense.paymentMethod}
                  onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mobile Banking">Mobile Banking</option>
                </select>
              </div>
              {newExpense.paymentMethod !== 'Cash' && (
                <div>
                  <label className="text-slate-500 font-bold mb-1.5 block">Bank Account source</label>
                  <select 
                    value={newExpense.bankAccountId}
                    onChange={(e) => setNewExpense({ ...newExpense, bankAccountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Invoice / Receipt #</label>
                <input 
                  type="text" 
                  value={newExpense.invoice} 
                  onChange={(e) => setNewExpense({ ...newExpense, invoice: e.target.value })} 
                  placeholder="vendor bill number..." 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer transition">
                Add Expense Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NEW INCOME MODAL */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">Log Non-Sales Income</h3>
              <button onClick={() => setShowIncomeModal(false)} className="text-zinc-500 hover:text-white"><X className="h-4.5 w-4.5" /></button>
            </div>
            <form onSubmit={handleCreateIncome} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Income Source / Client</label>
                <input 
                  type="text" 
                  value={newIncome.incomeSource} 
                  onChange={(e) => setNewIncome({ ...newIncome, incomeSource: e.target.value })} 
                  placeholder="e.g. investments, service charges, consulting..." 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Amount ($)</label>
                <input 
                  type="number" 
                  value={newIncome.amount} 
                  onChange={(e) => setNewIncome({ ...newIncome, amount: Number(e.target.value) })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Reference / Receipt</label>
                <input 
                  type="text" 
                  value={newIncome.reference} 
                  onChange={(e) => setNewIncome({ ...newIncome, reference: e.target.value })} 
                  placeholder="payment reference..." 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-500 font-bold mb-1.5 block">Payment Method</label>
                <select 
                  value={newIncome.paymentMethod}
                  onChange={(e) => setNewIncome({ ...newIncome, paymentMethod: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mobile Banking">Mobile Banking</option>
                </select>
              </div>
              {newIncome.paymentMethod !== 'Cash' && (
                <div>
                  <label className="text-slate-500 font-bold mb-1.5 block">Bank Account deposit target</label>
                  <select 
                    value={newIncome.bankAccountId}
                    onChange={(e) => setNewIncome({ ...newIncome, bankAccountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 rounded text-slate-900 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition">
                Add Income Record
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
