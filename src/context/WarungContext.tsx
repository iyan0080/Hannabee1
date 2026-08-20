import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  Product,
  Transaction,
  Expense,
  Customer,
  StoreSettings,
  CartItem,
  ProductVariant,
  PaymentMethod,
  ProfitLossSummary,
  ExpenseCategory,
  CloudSyncState,
  DepositRecord,
  AppUser,
  DiscountType,
  ManualJournalEntry,
  JournalEntryItem,
  CashClosingRecord,
  CashFlowSummary,
  CashAccountType,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
  INITIAL_EXPENSES,
  INITIAL_CUSTOMERS,
  INITIAL_STORE_SETTINGS,
  INITIAL_USERS,
  INITIAL_MANUAL_JOURNALS,
  INITIAL_CASH_CLOSINGS,
} from '../utils/initialData';
import {
  subscribeToProducts,
  subscribeToTransactions,
  subscribeToExpenses,
  subscribeToCustomers,
  subscribeToManualJournals,
  subscribeToCashClosings,
  subscribeToStoreSettings,
  subscribeToUsers,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveTransactionToFirestore,
  saveExpenseToFirestore,
  deleteExpenseFromFirestore,
  saveCustomerToFirestore,
  deleteCustomerFromFirestore,
  saveManualJournalToFirestore,
  deleteManualJournalFromFirestore,
  saveCashClosingToFirestore,
  deleteCashClosingFromFirestore,
  saveStoreSettingsToFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  clearAllFirestoreDocuments,
  pushFullDatabaseToFirestore,
} from '../services/firestoreSync';

interface WarungContextType {
  // Authentication & Users
  users: AppUser[];
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  registerUser: (userData: { name: string; email: string; password: string; phone?: string }) => { success: boolean; message?: string; user?: AppUser };
  addUser: (userData: Omit<AppUser, 'id' | 'createdAt' | 'lastLogin'>) => { success: boolean; message?: string; user?: AppUser };
  updateUser: (id: string, userData: Partial<AppUser>) => { success: boolean; message?: string };
  deleteUser: (id: string) => { success: boolean; message?: string };
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string, newPassword: string) => void;

  // Master Data
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  customers: Customer[];
  storeSettings: StoreSettings;
  syncState: CloudSyncState;

  // Bookkeeping / Pembukuan
  manualJournals: ManualJournalEntry[];
  cashClosings: CashClosingRecord[];
  addManualJournalEntry: (entry: Omit<ManualJournalEntry, 'id'>) => ManualJournalEntry;
  deleteManualJournalEntry: (id: string) => void;
  addCashClosingRecord: (record: Omit<CashClosingRecord, 'id'>) => CashClosingRecord;
  deleteCashClosingRecord: (id: string) => void;
  getAllJournalEntries: (startDate?: Date, endDate?: Date, accountFilter?: CashAccountType | 'ALL') => JournalEntryItem[];
  calculateCashFlow: (startDate: Date, endDate: Date, periodLabel: string) => CashFlowSummary;

  // POS Cart State
  cart: CartItem[];
  selectedCustomer: Customer | null;
  paymentMethod: PaymentMethod;
  cashGiven: number;
  discountType: DiscountType;
  discountInput: number;
  discountAmount: number;
  cartNotes: string;
  
  // Cart Actions
  addToCart: (product: Product, selectedVariants?: ProductVariant[], quantity?: number, notes?: string) => void;
  updateCartItemQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashGiven: (amount: number) => void;
  setDiscountType: (type: DiscountType) => void;
  setDiscountInput: (value: number) => void;
  setDiscountAmount: (discount: number) => void;
  applyResellerDiscount: (customer: Customer) => void;
  setCartNotes: (notes: string) => void;
  processCheckout: () => Transaction | null;

  // Product CRUD
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateStock: (productId: string, newStock: number) => void;
  toggleArchiveProduct: (productId: string) => void;

  // Expense CRUD
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Customer CRUD
  addCustomer: (customer: Omit<Customer, 'id' | 'totalTransactions' | 'totalSpent' | 'totalDebt' | 'createdAt' | 'depositBalance' | 'depositHistory'> & { depositBalance?: number; depositHistory?: DepositRecord[] }) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  settleCustomerDebt: (customerId: string, amount: number, notes?: string) => void;
  topUpCustomerDeposit: (customerId: string, amount: number, paymentMethod?: 'TUNAI' | 'TRANSFER' | 'QRIS', notes?: string) => void;

  // Store Settings & Cloud Sync
  updateStoreSettings: (settings: Partial<StoreSettings>) => void;
  syncWithCloud: () => Promise<boolean>;
  clearAllDatabase: () => void;
  resetToSampleData: () => void;
  importAllData: (jsonData: any) => boolean;

  // Financial Calculations
  calculateProfitLoss: (startDate: Date, endDate: Date, periodLabel: string) => ProfitLossSummary;
}

const WarungContext = createContext<WarungContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'warung_users_v2',
  CURRENT_USER: 'warung_current_user_v2',
  PRODUCTS: 'warung_products_v2',
  TRANSACTIONS: 'warung_transactions_v2',
  EXPENSES: 'warung_expenses_v2',
  CUSTOMERS: 'warung_customers_v2',
  SETTINGS: 'warung_settings_v2',
  MANUAL_JOURNALS: 'warung_manual_journals_v2',
  CASH_CLOSINGS: 'warung_cash_closings_v2',
};

// Clean legacy demo v1 keys on load
try {
  [
    'warung_users_v1',
    'warung_current_user_v1',
    'warung_products_v1',
    'warung_transactions_v1',
    'warung_expenses_v1',
    'warung_customers_v1',
    'warung_settings_v1',
    'warung_manual_journals_v1',
    'warung_cash_closings_v1',
  ].forEach(k => localStorage.removeItem(k));
} catch {
  // ignore
}

export const WarungProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Users state
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : null;
  });

  // Master Data state
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_STORE_SETTINGS;
  });

  const [manualJournals, setManualJournals] = useState<ManualJournalEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MANUAL_JOURNALS);
    return saved ? JSON.parse(saved) : INITIAL_MANUAL_JOURNALS;
  });

  const [cashClosings, setCashClosings] = useState<CashClosingRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH_CLOSINGS);
    return saved ? JSON.parse(saved) : INITIAL_CASH_CLOSINGS;
  });

  // POS Cart Active State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomerState] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [discountType, setDiscountType] = useState<DiscountType>('NOMINAL');
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [cartNotes, setCartNotes] = useState<string>('');

  // Track initial snapshot loads so we don't overwrite local storage prematurely
  const isLoadedFromCloud = useRef(false);

  // Derived discount amount
  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const rawDiscount = discountType === 'PERCENTAGE'
    ? Math.round((cartSubtotal * (Number(discountInput) || 0)) / 100)
    : (Number(discountInput) || 0);
  const discountAmount = Math.min(cartSubtotal, Math.max(0, rawDiscount));

  const setDiscountAmount = useCallback((discount: number) => {
    setDiscountType('NOMINAL');
    setDiscountInput(Math.max(0, discount));
  }, []);

  const applyResellerDiscount = useCallback((customer: Customer) => {
    if (customer.customerType === 'RESELLER' && customer.resellerDiscountValue !== undefined && customer.resellerDiscountValue > 0) {
      setDiscountType(customer.resellerDiscountType || 'PERCENTAGE');
      setDiscountInput(customer.resellerDiscountValue);
    }
  }, []);

  const setSelectedCustomer = useCallback((customer: Customer | null) => {
    setSelectedCustomerState(customer);
    if (customer && customer.customerType === 'RESELLER' && customer.resellerDiscountValue !== undefined && customer.resellerDiscountValue > 0) {
      setDiscountType(customer.resellerDiscountType || 'PERCENTAGE');
      setDiscountInput(customer.resellerDiscountValue);
    }
  }, []);

  // Sync state
  const [syncState, setSyncState] = useState<CloudSyncState>({
    isSyncing: false,
    lastSyncedAt: new Date().toISOString(),
    status: navigator.onLine ? 'synced' : 'offline',
  });

  // Local storage synchronization (fast local caching)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(storeSettings));
  }, [storeSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MANUAL_JOURNALS, JSON.stringify(manualJournals));
  }, [manualJournals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASH_CLOSINGS, JSON.stringify(cashClosings));
  }, [cashClosings]);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    };
    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, status: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // =========================================================================
  // REAL-TIME FIRESTORE MULTI-DEVICE SYNC LISTENERS
  // =========================================================================
  useEffect(() => {
    // 1. Subscribe to Products
    const unsubProducts = subscribeToProducts(cloudProducts => {
      setProducts(cloudProducts);
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    });

    // 2. Subscribe to Transactions
    const unsubTransactions = subscribeToTransactions(cloudTransactions => {
      setTransactions(cloudTransactions);
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    });

    // 3. Subscribe to Expenses
    const unsubExpenses = subscribeToExpenses(cloudExpenses => {
      setExpenses(cloudExpenses);
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    });

    // 4. Subscribe to Customers
    const unsubCustomers = subscribeToCustomers(cloudCustomers => {
      setCustomers(cloudCustomers);
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    });

    // 5. Subscribe to Manual Journals
    const unsubJournals = subscribeToManualJournals(cloudJournals => {
      setManualJournals(cloudJournals);
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    });

    // 6. Subscribe to Cash Closings
    const unsubClosings = subscribeToCashClosings(cloudClosings => {
      setCashClosings(cloudClosings);
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    });

    // 7. Subscribe to Store Settings
    const unsubSettings = subscribeToStoreSettings(cloudSettings => {
      setStoreSettings(prev => ({ ...prev, ...cloudSettings }));
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    });

    // 8. Subscribe to Users
    const unsubUsers = subscribeToUsers(cloudUsers => {
      if (cloudUsers.length > 0) {
        setUsers(cloudUsers);
      }
      setSyncState(prev => ({ ...prev, status: 'synced', lastSyncedAt: new Date().toISOString() }));
    });

    isLoadedFromCloud.current = true;

    return () => {
      unsubProducts();
      unsubTransactions();
      unsubExpenses();
      unsubCustomers();
      unsubJournals();
      unsubClosings();
      unsubSettings();
      unsubUsers();
    };
  }, []);

  // Manual Force Sync function
  const syncWithCloud = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setSyncState(prev => ({ ...prev, status: 'offline' }));
      return false;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      await pushFullDatabaseToFirestore({
        products,
        transactions,
        expenses,
        customers,
        manualJournals,
        cashClosings,
        storeSettings,
        users,
      });

      setSyncState({
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        status: 'synced',
      });
      return true;
    } catch (err: any) {
      console.warn('Sync notice:', err.message);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        status: 'error',
        errorMessage: err.message,
      }));
      return false;
    }
  }, [products, transactions, expenses, customers, manualJournals, cashClosings, storeSettings, users]);

  // User Auth & Management Methods
  const login = useCallback((email: string, password: string): { success: boolean; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    const foundUser = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!foundUser) {
      return {
        success: false,
        message: 'Akun dengan email Gmail ini belum terdaftar. Silakan periksa kembali atau daftar baru.',
      };
    }

    if (!foundUser.isActive) {
      return {
        success: false,
        message: 'Akun ini dinonaktifkan oleh administrator. Silakan hubungi pengelola warung.',
      };
    }

    if (foundUser.password !== cleanPass) {
      return {
        success: false,
        message: 'Password yang Anda masukkan salah. Silakan coba lagi.',
      };
    }

    const updatedUser: AppUser = {
      ...foundUser,
      lastLogin: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    saveUserToFirestore(updatedUser);
    return { success: true };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }, []);

  const registerUser = useCallback((userData: { name: string; email: string; password: string; phone?: string }) => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanPass = userData.password.trim();

    if (!cleanEmail) {
      return { success: false, message: 'Email Gmail wajib diisi.' };
    }
    if (!cleanPass || cleanPass.length < 4) {
      return { success: false, message: 'Password minimal 4 karakter.' };
    }

    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: 'Email Gmail ini sudah terdaftar. Silakan langsung masuk/login.' };
    }

    const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600', 'bg-rose-600', 'bg-indigo-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: AppUser = {
      id: 'usr-' + Date.now(),
      name: userData.name.trim() || 'Pengguna Warung',
      email: cleanEmail,
      password: cleanPass,
      phone: userData.phone?.trim() || '',
      avatarColor: randomColor,
      role: 'Pengguna Warung',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    saveUserToFirestore(newUser);
    return { success: true, user: newUser };
  }, [users]);

  const addUser = useCallback((userData: Omit<AppUser, 'id' | 'createdAt' | 'lastLogin'>) => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanPass = userData.password.trim();

    if (!cleanEmail) {
      return { success: false, message: 'Email Gmail wajib diisi.' };
    }
    if (!cleanPass) {
      return { success: false, message: 'Password wajib ditentukan.' };
    }

    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: 'Email Gmail ini sudah digunakan oleh pengguna lain.' };
    }

    const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600', 'bg-rose-600', 'bg-indigo-600'];
    const randomColor = userData.avatarColor || colors[Math.floor(Math.random() * colors.length)];

    const newUser: AppUser = {
      ...userData,
      id: 'usr-' + Date.now(),
      email: cleanEmail,
      password: cleanPass,
      avatarColor: randomColor,
      role: 'Pengguna Warung',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      createdAt: new Date().toISOString(),
      lastLogin: undefined,
    };

    setUsers(prev => [newUser, ...prev]);
    saveUserToFirestore(newUser);
    return { success: true, user: newUser };
  }, [users]);

  const updateUser = useCallback((id: string, updatedData: Partial<AppUser>) => {
    if (updatedData.email) {
      const cleanEmail = updatedData.email.trim().toLowerCase();
      const duplicate = users.find(u => u.id !== id && u.email.toLowerCase() === cleanEmail);
      if (duplicate) {
        return { success: false, message: 'Email Gmail tersebut sudah dipakai oleh pengguna lain.' };
      }
    }

    let userToSave: AppUser | null = null;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === id) {
          const updated = { ...u, ...updatedData };
          userToSave = updated;
          if (currentUser && currentUser.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );

    if (userToSave) {
      saveUserToFirestore(userToSave);
    }
    return { success: true };
  }, [users, currentUser]);

  const deleteUser = useCallback((id: string) => {
    if (currentUser && currentUser.id === id) {
      return { success: false, message: 'Anda tidak dapat menghapus akun yang sedang Anda gunakan.' };
    }
    if (users.length <= 1) {
      return { success: false, message: 'Harus ada minimal 1 akun pengguna aktif di sistem.' };
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    deleteUserFromFirestore(id);
    return { success: true };
  }, [currentUser, users.length]);

  const toggleUserStatus = useCallback((id: string) => {
    let userToSave: AppUser | null = null;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === id) {
          const newStatus = !u.isActive;
          const updated = { ...u, isActive: newStatus };
          userToSave = updated;
          if (currentUser && currentUser.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    if (userToSave) {
      saveUserToFirestore(userToSave);
    }
  }, [currentUser]);

  const resetUserPassword = useCallback((id: string, newPassword: string) => {
    let userToSave: AppUser | null = null;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === id) {
          const updated = { ...u, password: newPassword };
          userToSave = updated;
          if (currentUser && currentUser.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    if (userToSave) {
      saveUserToFirestore(userToSave);
    }
  }, [currentUser]);

  // Cart operations
  const addToCart = useCallback((
    product: Product, 
    selectedVariants: ProductVariant[] = [], 
    quantity = 1, 
    notes = ''
  ) => {
    const variantKey = selectedVariants.map(v => v.id).sort().join('_');
    const cartItemId = `${product.id}-${variantKey || 'base'}`;

    const additionalPrice = selectedVariants.reduce((sum, v) => sum + (v.priceAdjustment || 0), 0);
    const additionalCost = selectedVariants.reduce((sum, v) => sum + (v.costAdjustment || 0), 0);

    const finalPricePerUnit = Math.max(0, product.basePrice + additionalPrice);
    const finalCostPerUnit = Math.max(0, product.baseCost + additionalCost);

    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map(item =>
          item.id === cartItemId
            ? {
                ...item,
                quantity: newQty,
                subtotal: newQty * item.finalPricePerUnit,
                subtotalCost: newQty * item.finalCostPerUnit,
                notes: notes || item.notes,
              }
            : item
        );
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          productId: product.id,
          productName: product.name,
          basePrice: product.basePrice,
          baseCost: product.baseCost,
          selectedVariants,
          finalPricePerUnit,
          finalCostPerUnit,
          quantity,
          subtotal: quantity * finalPricePerUnit,
          subtotalCost: quantity * finalCostPerUnit,
          notes,
        };
        return [...prev, newItem];
      }
    });
  }, []);

  const updateCartItemQuantity = useCallback((cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.finalPricePerUnit,
              subtotalCost: newQty * item.finalCostPerUnit,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomerState(null);
    setPaymentMethod('TUNAI');
    setCashGiven(0);
    setDiscountType('NOMINAL');
    setDiscountInput(0);
    setCartNotes('');
  }, []);

  // Process POS checkout
  const processCheckout = useCallback((): Transaction | null => {
    if (cart.length === 0) return null;

    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const totalCost = cart.reduce((sum, item) => sum + item.subtotalCost, 0);
    
    // Tax calculation if enabled
    const tax = storeSettings.enableTax ? (subtotal * storeSettings.taxRate) / 100 : 0;
    const finalAmount = Math.max(0, subtotal - discountAmount + tax);
    const grossProfit = finalAmount - totalCost;

    const isDeposit = paymentMethod === 'SALDO_DEPOSIT';
    const isKasbon = paymentMethod === 'KASBON';
    const amountPaid = isKasbon ? 0 : (paymentMethod === 'TUNAI' ? (cashGiven || finalAmount) : finalAmount);
    const change = (paymentMethod === 'TUNAI' && cashGiven > finalAmount) ? cashGiven - finalAmount : 0;

    let remainingDepositAfter = undefined;
    if (isDeposit && selectedCustomer) {
      remainingDepositAfter = Math.max(0, (selectedCustomer.depositBalance || 0) - finalAmount);
    }

    const invoiceDate = new Date();
    const dateFormatted = invoiceDate.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `WRG-${dateFormatted}-${randCode}`;

    const newTransaction: Transaction = {
      id: 'trx-' + Date.now(),
      invoiceNumber,
      timestamp: invoiceDate.toISOString(),
      items: [...cart],
      subtotal,
      discount: discountAmount,
      discountType,
      discountRate: discountInput,
      tax,
      finalAmount,
      totalCost,
      grossProfit,
      amountPaid,
      change,
      paymentMethod,
      cashierName: currentUser?.name || storeSettings.cashierName || 'Kasir',
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || 'Pelanggan Umum',
      customerPhone: selectedCustomer?.phone,
      customerType: selectedCustomer?.customerType || 'UMUM',
      status: isKasbon ? 'BELUM_LUNAS' : 'LUNAS',
      depositUsed: isDeposit ? finalAmount : undefined,
      remainingDeposit: remainingDepositAfter,
      notes: cartNotes,
    };

    // 1. Add Transaction locally & in Firestore
    setTransactions(prev => [newTransaction, ...prev]);
    saveTransactionToFirestore(newTransaction);

    // 2. Reduce stock for products locally & in Firestore
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const itemPurchased = cart.find(ci => ci.productId === p.id);
        if (itemPurchased) {
          const remainingStock = Math.max(0, p.stock - itemPurchased.quantity);
          const updatedProd = { ...p, stock: remainingStock };
          saveProductToFirestore(updatedProd);
          return updatedProd;
        }
        return p;
      });
    });

    // 3. Update Customer records (totalSpent, debt, deposit, transactions count)
    if (selectedCustomer) {
      setCustomers(prevCustomers => {
        return prevCustomers.map(c => {
          if (c.id === selectedCustomer.id) {
            let newDeposit = c.depositBalance || 0;
            const newHistory = c.depositHistory ? [...c.depositHistory] : [];

            if (isDeposit) {
              newDeposit = Math.max(0, newDeposit - finalAmount);
              newHistory.unshift({
                id: 'dep-' + Date.now(),
                timestamp: invoiceDate.toISOString(),
                type: 'PAYMENT',
                amount: finalAmount,
                invoiceNumber,
                notes: `Pembayaran pesanan nota ${invoiceNumber}`,
                remainingBalance: newDeposit,
              });
            }

            const updatedCust: Customer = {
              ...c,
              totalTransactions: c.totalTransactions + 1,
              totalSpent: c.totalSpent + finalAmount,
              totalDebt: isKasbon ? c.totalDebt + finalAmount : c.totalDebt,
              depositBalance: newDeposit,
              depositHistory: newHistory,
            };
            saveCustomerToFirestore(updatedCust);
            return updatedCust;
          }
          return c;
        });
      });
    }

    return newTransaction;
  }, [
    cart,
    discountAmount,
    discountType,
    discountInput,
    storeSettings,
    paymentMethod,
    cashGiven,
    selectedCustomer,
    cartNotes,
    currentUser,
  ]);

  // Product CRUD
  const addProduct = useCallback((newProdData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: 'prod-' + Date.now(),
    };
    setProducts(prev => [newProduct, ...prev]);
    saveProductToFirestore(newProduct);
  }, []);

  const updateProduct = useCallback((id: string, updatedData: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...updatedData };
          saveProductToFirestore(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    deleteProductFromFirestore(id);
  }, []);

  const updateStock = useCallback((productId: string, newStock: number) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          const updated = { ...p, stock: Math.max(0, newStock) };
          saveProductToFirestore(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  const toggleArchiveProduct = useCallback((productId: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          const newArchived = !p.isArchived;
          const updated = {
            ...p,
            isArchived: newArchived,
            isAvailable: newArchived ? false : p.isAvailable,
          };
          saveProductToFirestore(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  // Expense CRUD
  const addExpense = useCallback((expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now(),
    };
    setExpenses(prev => [newExpense, ...prev]);
    saveExpenseToFirestore(newExpense);
  }, []);

  const updateExpense = useCallback((id: string, updatedData: Partial<Expense>) => {
    setExpenses(prev =>
      prev.map(e => {
        if (e.id === id) {
          const updated = { ...e, ...updatedData };
          saveExpenseToFirestore(updated);
          return updated;
        }
        return e;
      })
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    deleteExpenseFromFirestore(id);
  }, []);

  // Customer CRUD
  const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'totalTransactions' | 'totalSpent' | 'totalDebt' | 'createdAt' | 'depositHistory'> & { depositHistory?: DepositRecord[] }): Customer => {
    const initDeposit = customerData.depositBalance || 0;
    const initHistory: DepositRecord[] = customerData.depositHistory || (initDeposit > 0 ? [{
      id: 'dep-' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'TOPUP',
      amount: initDeposit,
      paymentMethod: 'TUNAI',
      notes: 'Saldo Deposit Awal Registrasi Pelanggan',
      remainingBalance: initDeposit,
    }] : []);

    const newCust: Customer = {
      ...customerData,
      id: 'cust-' + Date.now(),
      customerType: customerData.customerType || 'UMUM',
      totalTransactions: 0,
      totalSpent: 0,
      totalDebt: 0,
      depositBalance: initDeposit,
      depositHistory: initHistory,
      createdAt: new Date().toISOString(),
    };
    setCustomers(prev => [newCust, ...prev]);
    saveCustomerToFirestore(newCust);
    return newCust;
  }, []);

  const updateCustomer = useCallback((id: string, updatedData: Partial<Customer>) => {
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, ...updatedData };
          saveCustomerToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    deleteCustomerFromFirestore(id);
  }, []);

  const topUpCustomerDeposit = useCallback((
    customerId: string,
    amount: number,
    paymentMethod: 'TUNAI' | 'TRANSFER' | 'QRIS' = 'TUNAI',
    notes?: string
  ) => {
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === customerId) {
          const newDeposit = (c.depositBalance || 0) + amount;
          const record: DepositRecord = {
            id: 'dep-' + Date.now(),
            timestamp: new Date().toISOString(),
            type: 'TOPUP',
            amount,
            paymentMethod,
            notes: notes || 'Top-Up Saldo Deposit Pelanggan',
            remainingBalance: newDeposit,
          };
          const updatedCust: Customer = {
            ...c,
            depositBalance: newDeposit,
            depositHistory: [record, ...(c.depositHistory || [])],
          };
          saveCustomerToFirestore(updatedCust);
          return updatedCust;
        }
        return c;
      })
    );
  }, []);

  const settleCustomerDebt = useCallback((customerId: string, amount: number, notes?: string) => {
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === customerId) {
          const newDebt = Math.max(0, c.totalDebt - amount);
          const updatedCust = { ...c, totalDebt: newDebt };
          saveCustomerToFirestore(updatedCust);
          return updatedCust;
        }
        return c;
      })
    );

    // Also mark unpaid transactions of this customer as paid if fully settled
    setTransactions(prev => {
      let remainingToSettle = amount;
      return prev.map(trx => {
        if (trx.customerId === customerId && trx.status === 'BELUM_LUNAS' && remainingToSettle > 0) {
          if (remainingToSettle >= trx.finalAmount) {
            remainingToSettle -= trx.finalAmount;
            const updatedTrx: Transaction = {
              ...trx,
              status: 'LUNAS',
              paymentHistory: [
                ...(trx.paymentHistory || []),
                {
                  id: 'pay-' + Date.now(),
                  date: new Date().toISOString(),
                  amount: trx.finalAmount,
                  notes: notes || 'Pelunasan Kasbon',
                },
              ],
            };
            saveTransactionToFirestore(updatedTrx);
            return updatedTrx;
          }
        }
        return trx;
      });
    });
  }, []);

  // Bookkeeping CRUD
  const addManualJournalEntry = useCallback((entryData: Omit<ManualJournalEntry, 'id'>): ManualJournalEntry => {
    const newEntry: ManualJournalEntry = {
      ...entryData,
      id: 'jnl-' + Date.now(),
    };
    setManualJournals(prev => [newEntry, ...prev]);
    saveManualJournalToFirestore(newEntry);
    return newEntry;
  }, []);

  const deleteManualJournalEntry = useCallback((id: string) => {
    setManualJournals(prev => prev.filter(j => j.id !== id));
    deleteManualJournalFromFirestore(id);
  }, []);

  const addCashClosingRecord = useCallback((recordData: Omit<CashClosingRecord, 'id'>): CashClosingRecord => {
    const newRecord: CashClosingRecord = {
      ...recordData,
      id: 'close-' + Date.now(),
    };
    setCashClosings(prev => [newRecord, ...prev]);
    saveCashClosingToFirestore(newRecord);
    return newRecord;
  }, []);

  const deleteCashClosingRecord = useCallback((id: string) => {
    setCashClosings(prev => prev.filter(c => c.id !== id));
    deleteCashClosingFromFirestore(id);
  }, []);

  // Aggregate All Journal Entries (POS, Kasbon Settlement, Deposit Topup, Expenses, Manual)
  const getAllJournalEntries = useCallback((
    startDate?: Date,
    endDate?: Date,
    accountFilter: CashAccountType | 'ALL' = 'ALL'
  ): JournalEntryItem[] => {
    const rawItems: Omit<JournalEntryItem, 'runningBalance'>[] = [];

    // 1. Transactions (Penjualan Kasir)
    transactions.forEach(t => {
      if (t.status === 'BATAL') return;
      if (t.finalAmount <= 0) return;

      let account: CashAccountType = 'KAS_TUNAI';
      let accountLabel = 'Kas Tunai (Laci)';
      if (t.paymentMethod === 'QRIS') {
        account = 'QRIS';
        accountLabel = 'QRIS';
      } else if (t.paymentMethod === 'TRANSFER') {
        account = 'BANK_TRANSFER';
        accountLabel = 'Rekening Bank';
      } else if (t.paymentMethod === 'SALDO_DEPOSIT') {
        account = 'SALDO_DEPOSIT';
        accountLabel = 'Saldo Deposit';
      } else if (t.paymentMethod === 'KASBON') {
        if (t.amountPaid <= 0) return;
      }

      const amountToRecord = t.paymentMethod === 'KASBON' ? t.amountPaid : t.finalAmount;

      rawItems.push({
        id: `trx-${t.id}`,
        timestamp: t.timestamp,
        dateStr: t.timestamp.slice(0, 10),
        type: 'KAS_MASUK',
        category: 'Penjualan Kasir',
        title: `Penjualan Nota ${t.invoiceNumber} (${t.customerName || 'Pelanggan Umum'})`,
        amount: amountToRecord,
        account,
        accountLabel,
        referenceType: 'TRANSACTION',
        referenceId: t.id,
        notes: t.items.map(i => `${i.productName} (${i.quantity}x)`).join(', '),
        actorName: t.cashierName || 'Kasir',
      });
    });

    // 2. Customer Debt Payments (Pelunasan Kasbon)
    transactions.forEach(t => {
      if (t.paymentHistory && t.paymentHistory.length > 0) {
        t.paymentHistory.forEach(p => {
          rawItems.push({
            id: `pay-${p.id}`,
            timestamp: p.date,
            dateStr: p.date.slice(0, 10),
            type: 'KAS_MASUK',
            category: 'Pelunasan Kasbon',
            title: `Pelunasan Kasbon Nota ${t.invoiceNumber} - ${t.customerName || 'Pelanggan'}`,
            amount: p.amount,
            account: 'KAS_TUNAI',
            accountLabel: 'Kas Tunai (Laci)',
            referenceType: 'DEBT_SETTLEMENT',
            referenceId: t.id,
            notes: p.notes || `Pelunasan piutang/kasbon untuk ${t.customerName || 'Pelanggan'}`,
            actorName: 'Kasir',
          });
        });
      }
    });

    // 3. Customer Deposit Top-Ups
    customers.forEach(c => {
      if (c.depositHistory && c.depositHistory.length > 0) {
        c.depositHistory.forEach(dep => {
          if (dep.type === 'TOPUP') {
            let account: CashAccountType = 'KAS_TUNAI';
            let accountLabel = 'Kas Tunai (Laci)';
            if (dep.paymentMethod === 'QRIS') {
              account = 'QRIS';
              accountLabel = 'QRIS';
            } else if (dep.paymentMethod === 'TRANSFER') {
              account = 'BANK_TRANSFER';
              accountLabel = 'Rekening Bank';
            }

            rawItems.push({
              id: `dep-${dep.id}`,
              timestamp: dep.timestamp,
              dateStr: dep.timestamp.slice(0, 10),
              type: 'KAS_MASUK',
              category: 'Deposit Masuk',
              title: `Top-up Saldo Deposit - ${c.name}`,
              amount: dep.amount,
              account,
              accountLabel,
              referenceType: 'DEPOSIT_TOPUP',
              referenceId: dep.id,
              notes: dep.notes || `Top up saldo deposit pelanggan ${c.name}`,
              actorName: 'Kasir',
            });
          }
        });
      }
    });

    // 4. Expenses (Beban Pengeluaran)
    expenses.forEach(e => {
      let account: CashAccountType = 'KAS_TUNAI';
      let accountLabel = 'Kas Tunai (Laci)';
      if (e.paymentMethod === 'TRANSFER') {
        account = 'BANK_TRANSFER';
        accountLabel = 'Rekening Bank';
      }

      rawItems.push({
        id: `exp-${e.id}`,
        timestamp: e.timestamp,
        dateStr: e.timestamp.slice(0, 10),
        type: 'KAS_KELUAR',
        category: e.category,
        title: e.title + (e.recipient ? ` (${e.recipient})` : ''),
        amount: e.amount,
        account,
        accountLabel,
        referenceType: 'EXPENSE',
        referenceId: e.id,
        notes: e.notes,
        actorName: e.cashierName || 'Kasir',
      });
    });

    // 5. Manual Journals
    manualJournals.forEach(j => {
      let account: CashAccountType = 'KAS_TUNAI';
      let accountLabel = 'Kas Tunai (Laci)';
      if (j.sourceAccount === 'QRIS' || j.targetAccount === 'QRIS') {
        account = 'QRIS';
        accountLabel = 'QRIS';
      } else if (j.sourceAccount === 'BANK_TRANSFER' || j.targetAccount === 'BANK_TRANSFER') {
        account = 'BANK_TRANSFER';
        accountLabel = 'Rekening Bank';
      }

      rawItems.push({
        id: `jnl-${j.id}`,
        timestamp: j.timestamp,
        dateStr: j.date,
        type: j.type,
        category: j.category,
        title: j.description,
        amount: j.amount,
        account,
        accountLabel,
        referenceType: 'MANUAL',
        referenceId: j.id,
        notes: j.notes,
        actorName: j.createdBy || 'Owner',
      });
    });

    // Sort chronologically ascending for accurate running balance
    rawItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate Running Balance across all entries
    let currentBalance = 0;
    const allCalculated: JournalEntryItem[] = rawItems.map(item => {
      if (item.type === 'KAS_MASUK') {
        currentBalance += item.amount;
      } else {
        currentBalance -= item.amount;
      }
      return {
        ...item,
        runningBalance: currentBalance,
      };
    });

    // Filter by Date Range and Account
    let filtered = allCalculated;
    if (startDate) {
      const startMs = startDate.getTime();
      filtered = filtered.filter(item => new Date(item.timestamp).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = endDate.getTime();
      filtered = filtered.filter(item => new Date(item.timestamp).getTime() <= endMs);
    }
    if (accountFilter !== 'ALL') {
      filtered = filtered.filter(item => item.account === accountFilter);
    }

    // Return in reverse chronological order (newest on top) for table views
    return filtered.reverse();
  }, [transactions, customers, expenses, manualJournals]);

  // Calculate Cash Flow Statement (SAK EMKM)
  const calculateCashFlow = useCallback((
    startDate: Date,
    endDate: Date,
    periodLabel: string
  ): CashFlowSummary => {
    const allEntriesAsc = getAllJournalEntries().reverse();
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    // 1. Initial Cash Balance (Saldo Kas Awal Periode)
    const priorEntries = allEntriesAsc.filter(e => new Date(e.timestamp).getTime() < startMs);
    const initialBalance = priorEntries.reduce((bal, e) => {
      return e.type === 'KAS_MASUK' ? bal + e.amount : bal - e.amount;
    }, 0);

    // 2. Entries within Period
    const periodEntries = allEntriesAsc.filter(e => {
      const ms = new Date(e.timestamp).getTime();
      return ms >= startMs && ms <= endMs;
    });

    // Breakdown aggregators matching CashFlowSummary interface
    const operatingInflows = {
      salesCash: 0,
      salesNonCash: 0,
      debtSettlements: 0,
      depositTopUps: 0,
      otherOperating: 0,
      total: 0,
    };

    const operatingOutflows = {
      materials: 0,
      operationalUtilities: 0,
      salaries: 0,
      rent: 0,
      packaging: 0,
      otherExpenses: 0,
      total: 0,
    };

    const investingOutflows = {
      assetsAndEquipment: 0,
      total: 0,
    };

    const financingInflows = {
      capitalInjections: 0,
      total: 0,
    };

    const financingOutflows = {
      ownerDrawingsPrive: 0,
      total: 0,
    };

    periodEntries.forEach(entry => {
      if (entry.type === 'KAS_MASUK') {
        if (entry.referenceType === 'TRANSACTION') {
          if (entry.account === 'KAS_TUNAI') {
            operatingInflows.salesCash += entry.amount;
          } else {
            operatingInflows.salesNonCash += entry.amount;
          }
        } else if (entry.referenceType === 'DEBT_SETTLEMENT') {
          operatingInflows.debtSettlements += entry.amount;
        } else if (entry.referenceType === 'DEPOSIT_TOPUP') {
          operatingInflows.depositTopUps += entry.amount;
        } else if (entry.category === 'Setor Modal Pemilik') {
          financingInflows.capitalInjections += entry.amount;
        } else {
          operatingInflows.otherOperating += entry.amount;
        }
      } else {
        // KAS KELUAR
        if (entry.category === 'Belanja Bahan Baku') {
          operatingOutflows.materials += entry.amount;
        } else if (entry.category === 'Operasional & Listrik') {
          operatingOutflows.operationalUtilities += entry.amount;
        } else if (entry.category === 'Sewa Tempat & Bangunan') {
          operatingOutflows.rent += entry.amount;
        } else if (entry.category === 'Gaji & Uang Makan Karyawan') {
          operatingOutflows.salaries += entry.amount;
        } else if (entry.category === 'Peralatan & Kemasan') {
          operatingOutflows.packaging += entry.amount;
        } else if (entry.category === 'Prive / Penarikan Pemilik') {
          financingOutflows.ownerDrawingsPrive += entry.amount;
        } else if (entry.category === 'Pembelian Aset / Alat') {
          investingOutflows.assetsAndEquipment += entry.amount;
        } else {
          operatingOutflows.otherExpenses += entry.amount;
        }
      }
    });

    operatingInflows.total =
      operatingInflows.salesCash +
      operatingInflows.salesNonCash +
      operatingInflows.debtSettlements +
      operatingInflows.depositTopUps +
      operatingInflows.otherOperating;

    operatingOutflows.total =
      operatingOutflows.materials +
      operatingOutflows.operationalUtilities +
      operatingOutflows.rent +
      operatingOutflows.salaries +
      operatingOutflows.packaging +
      operatingOutflows.otherExpenses;

    investingOutflows.total = investingOutflows.assetsAndEquipment;
    financingInflows.total = financingInflows.capitalInjections;
    financingOutflows.total = financingOutflows.ownerDrawingsPrive;

    const netOperatingCashFlow = operatingInflows.total - operatingOutflows.total;
    const netInvestingCashFlow = -investingOutflows.total;
    const netFinancingCashFlow = financingInflows.total - financingOutflows.total;

    const netCashChange = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;
    const endingCashBalance = initialBalance + netCashChange;

    return {
      periodLabel,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      initialCashBalance: initialBalance,
      operatingInflows,
      operatingOutflows,
      netOperatingCashFlow,
      investingOutflows,
      netInvestingCashFlow,
      financingInflows,
      financingOutflows,
      netFinancingCashFlow,
      netCashChange,
      endingCashBalance,
    };
  }, [getAllJournalEntries]);

  // Store Settings
  const updateStoreSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setStoreSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveStoreSettingsToFirestore(updated);
      return updated;
    });
  }, []);

  // Clear all demo/test database data
  const clearAllDatabase = useCallback(() => {
    setProducts([]);
    setTransactions([]);
    setExpenses([]);
    setCustomers([]);
    setManualJournals([]);
    setCashClosings([]);
    setCart([]);
    setSelectedCustomerState(null);
    setDiscountInput(0);
    setCartNotes('');

    // Clear operational storage keys
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.MANUAL_JOURNALS);
    localStorage.removeItem(STORAGE_KEYS.CASH_CLOSINGS);

    // Clear Cloud Firestore documents in real time
    clearAllFirestoreDocuments();
  }, []);

  const resetToSampleData = useCallback(() => {
    clearAllDatabase();
  }, [clearAllDatabase]);

  const importAllData = useCallback((jsonData: any): boolean => {
    try {
      if (jsonData.products) setProducts(jsonData.products);
      if (jsonData.transactions) setTransactions(jsonData.transactions);
      if (jsonData.expenses) setExpenses(jsonData.expenses);
      if (jsonData.customers) setCustomers(jsonData.customers);
      if (jsonData.storeSettings) setStoreSettings(jsonData.storeSettings);
      
      pushFullDatabaseToFirestore({
        products: jsonData.products || [],
        transactions: jsonData.transactions || [],
        expenses: jsonData.expenses || [],
        customers: jsonData.customers || [],
        manualJournals: jsonData.manualJournals || [],
        cashClosings: jsonData.cashClosings || [],
        storeSettings: jsonData.storeSettings || INITIAL_STORE_SETTINGS,
        users: jsonData.users || INITIAL_USERS,
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  // Financial calculations helper for any date interval
  const calculateProfitLoss = useCallback(
    (startDate: Date, endDate: Date, periodLabel: string): ProfitLossSummary => {
      const startMs = startDate.getTime();
      const endMs = endDate.getTime();

      // Filter transactions within period
      const periodTransactions = transactions.filter(t => {
        const tMs = new Date(t.timestamp).getTime();
        return tMs >= startMs && tMs <= endMs && t.status !== 'BATAL';
      });

      // Filter expenses within period
      const periodExpenses = expenses.filter(e => {
        const eMs = new Date(e.timestamp).getTime();
        return eMs >= startMs && eMs <= endMs;
      });

      const totalSales = periodTransactions.reduce((sum, t) => sum + t.finalAmount, 0);
      const totalCostOfGoods = periodTransactions.reduce((sum, t) => sum + t.totalCost, 0);
      const grossProfit = totalSales - totalCostOfGoods;
      const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

      const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;
      const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      const transactionCount = periodTransactions.length;
      const averageTransactionValue = transactionCount > 0 ? totalSales / transactionCount : 0;

      const unpaidDebtTotal = periodTransactions
        .filter(t => t.status === 'BELUM_LUNAS')
        .reduce((sum, t) => sum + t.finalAmount, 0);

      const expenseBreakdown: { [key in ExpenseCategory]?: number } = {};
      periodExpenses.forEach(e => {
        expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
      });

      return {
        periodLabel,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalSales,
        totalCostOfGoods,
        grossProfit,
        grossMargin,
        totalExpenses,
        netProfit,
        netMargin,
        transactionCount,
        averageTransactionValue,
        unpaidDebtTotal,
        expenseBreakdown,
      };
    },
    [transactions, expenses]
  );

  return (
    <WarungContext.Provider
      value={{
        users,
        currentUser,
        isAuthenticated: Boolean(currentUser),
        login,
        logout,
        registerUser,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        products,
        transactions,
        expenses,
        customers,
        storeSettings,
        syncState,
        manualJournals,
        cashClosings,
        addManualJournalEntry,
        deleteManualJournalEntry,
        addCashClosingRecord,
        deleteCashClosingRecord,
        getAllJournalEntries,
        calculateCashFlow,
        cart,
        selectedCustomer,
        paymentMethod,
        cashGiven,
        discountType,
        discountInput,
        discountAmount,
        cartNotes,
        addToCart,
        updateCartItemQuantity,
        removeFromCart,
        clearCart,
        setSelectedCustomer,
        setPaymentMethod,
        setCashGiven,
        setDiscountType,
        setDiscountInput,
        setDiscountAmount,
        applyResellerDiscount,
        setCartNotes,
        processCheckout,
        addProduct,
        updateProduct,
        deleteProduct,
        updateStock,
        toggleArchiveProduct,
        addExpense,
        updateExpense,
        deleteExpense,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        settleCustomerDebt,
        topUpCustomerDeposit,
        updateStoreSettings,
        syncWithCloud,
        clearAllDatabase,
        resetToSampleData,
        importAllData,
        calculateProfitLoss,
      }}
    >
      {children}
    </WarungContext.Provider>
  );
};

export const useWarung = () => {
  const context = useContext(WarungContext);
  if (!context) {
    throw new Error('useWarung must be used within a WarungProvider');
  }
  return context;
};
