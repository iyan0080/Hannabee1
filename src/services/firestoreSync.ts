import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Product,
  Transaction,
  Expense,
  Customer,
  StoreSettings,
  AppUser,
  ManualJournalEntry,
  CashClosingRecord,
  ShoppingItem,
} from '../types';

// Collection references
export const COLLECTIONS = {
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  EXPENSES: 'expenses',
  CUSTOMERS: 'customers',
  MANUAL_JOURNALS: 'manual_journals',
  CASH_CLOSINGS: 'cash_closings',
  STORE_SETTINGS: 'store_settings',
  USERS: 'users',
  SHOPPING_ITEMS: 'shopping_items',
};

// ==========================================
// REAL-TIME LISTENERS (Multi-device Sync)
// ==========================================

export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTIONS.PRODUCTS);
    return onSnapshot(
      colRef,
      snapshot => {
        const items: Product[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as Product);
        });
        onUpdate(items);
      },
      err => {
        console.warn('Products sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up products listener:', err);
    return () => {};
  }
}

export function subscribeToTransactions(
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTIONS.TRANSACTIONS);
    return onSnapshot(
      colRef,
      snapshot => {
        const items: Transaction[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as Transaction);
        });
        // Sort newest first
        items.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        onUpdate(items);
      },
      err => {
        console.warn('Transactions sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up transactions listener:', err);
    return () => {};
  }
}

export function subscribeToExpenses(
  onUpdate: (expenses: Expense[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTIONS.EXPENSES);
    return onSnapshot(
      colRef,
      snapshot => {
        const items: Expense[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as Expense);
        });
        // Sort newest first
        items.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        onUpdate(items);
      },
      err => {
        console.warn('Expenses sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up expenses listener:', err);
    return () => {};
  }
}

export function subscribeToCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTIONS.CUSTOMERS);
    return onSnapshot(
      colRef,
      snapshot => {
        const items: Customer[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as Customer);
        });
        onUpdate(items);
      },
      err => {
        console.warn('Customers sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up customers listener:', err);
    return () => {};
  }
}

export function subscribeToManualJournals(
  onUpdate: (entries: ManualJournalEntry[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTIONS.MANUAL_JOURNALS);
    return onSnapshot(
      colRef,
      snapshot => {
        const items: ManualJournalEntry[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as ManualJournalEntry);
        });
        items.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        onUpdate(items);
      },
      err => {
        console.warn('Manual journals sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up manual journals listener:', err);
    return () => {};
  }
}

export function subscribeToCashClosings(
  onUpdate: (records: CashClosingRecord[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTIONS.CASH_CLOSINGS);
    return onSnapshot(
      colRef,
      snapshot => {
        const items: CashClosingRecord[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as CashClosingRecord);
        });
        items.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        onUpdate(items);
      },
      err => {
        console.warn('Cash closings sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up cash closings listener:', err);
    return () => {};
  }
}

export function subscribeToStoreSettings(
  onUpdate: (settings: StoreSettings) => void,
  onError?: (err: Error) => void
) {
  try {
    const docRef = doc(db, COLLECTIONS.STORE_SETTINGS, 'current');
    return onSnapshot(
      docRef,
      docSnap => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as StoreSettings);
        }
      },
      err => {
        console.warn('Store settings sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up store settings listener:', err);
    return () => {};
  }
}

export function subscribeToUsers(
  onUpdate: (users: AppUser[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTIONS.USERS);
    return onSnapshot(
      colRef,
      snapshot => {
        const items: AppUser[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as AppUser);
        });
        if (items.length > 0) {
          onUpdate(items);
        }
      },
      err => {
        console.warn('Users sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up users listener:', err);
    return () => {};
  }
}

export function subscribeToShoppingItems(
  onUpdate: (items: ShoppingItem[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, COLLECTIONS.SHOPPING_ITEMS);
    return onSnapshot(
      colRef,
      snapshot => {
        const items: ShoppingItem[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as ShoppingItem);
        });
        items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        onUpdate(items);
      },
      err => {
        console.warn('Shopping items sync snapshot listener notice:', err);
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up shopping items listener:', err);
    return () => {};
  }
}

// ==========================================
// DIRECT FIRESTORE MUTATIONS
// ==========================================

export async function saveProductToFirestore(product: Product): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(product)), { merge: true });
  } catch (err) {
    console.error('Error saving product to Firestore:', err);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting product from Firestore:', err);
  }
}

export async function saveTransactionToFirestore(transaction: Transaction): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transaction.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(transaction)), { merge: true });
  } catch (err) {
    console.error('Error saving transaction to Firestore:', err);
  }
}

export async function deleteTransactionFromFirestore(transactionId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting transaction from Firestore:', err);
  }
}

export async function saveExpenseToFirestore(expense: Expense): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expense.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(expense)), { merge: true });
  } catch (err) {
    console.error('Error saving expense to Firestore:', err);
  }
}

export async function deleteExpenseFromFirestore(expenseId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expenseId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting expense from Firestore:', err);
  }
}

export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(customer)), { merge: true });
  } catch (err) {
    console.error('Error saving customer to Firestore:', err);
  }
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting customer from Firestore:', err);
  }
}

export async function saveManualJournalToFirestore(entry: ManualJournalEntry): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MANUAL_JOURNALS, entry.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(entry)), { merge: true });
  } catch (err) {
    console.error('Error saving manual journal to Firestore:', err);
  }
}

export async function deleteManualJournalFromFirestore(entryId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MANUAL_JOURNALS, entryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting manual journal from Firestore:', err);
  }
}

export async function saveCashClosingToFirestore(record: CashClosingRecord): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CASH_CLOSINGS, record.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(record)), { merge: true });
  } catch (err) {
    console.error('Error saving cash closing to Firestore:', err);
  }
}

export async function deleteCashClosingFromFirestore(recordId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CASH_CLOSINGS, recordId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting cash closing from Firestore:', err);
  }
}

export async function saveStoreSettingsToFirestore(settings: StoreSettings): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.STORE_SETTINGS, 'current');
    await setDoc(docRef, JSON.parse(JSON.stringify(settings)), { merge: true });
  } catch (err) {
    console.error('Error saving store settings to Firestore:', err);
  }
}

export async function saveUserToFirestore(user: AppUser): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, user.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(user)), { merge: true });
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
  }
}

export async function saveShoppingItemToFirestore(item: ShoppingItem): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SHOPPING_ITEMS, item.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(item)), { merge: true });
  } catch (err) {
    console.error('Error saving shopping item to Firestore:', err);
  }
}

export async function deleteShoppingItemFromFirestore(itemId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SHOPPING_ITEMS, itemId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting shopping item from Firestore:', err);
  }
}

// Clear all operational documents in cloud Firestore
export async function clearAllFirestoreDocuments(): Promise<void> {
  try {
    const collectionsToClear = [
      COLLECTIONS.PRODUCTS,
      COLLECTIONS.TRANSACTIONS,
      COLLECTIONS.EXPENSES,
      COLLECTIONS.CUSTOMERS,
      COLLECTIONS.MANUAL_JOURNALS,
      COLLECTIONS.CASH_CLOSINGS,
      COLLECTIONS.SHOPPING_ITEMS,
    ];

    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      snap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error clearing Firestore documents:', err);
  }
}

// Batch Sync all local state to Firestore
export async function pushFullDatabaseToFirestore(data: {
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  customers: Customer[];
  manualJournals: ManualJournalEntry[];
  cashClosings: CashClosingRecord[];
  storeSettings: StoreSettings;
  users: AppUser[];
  shoppingItems?: ShoppingItem[];
}): Promise<boolean> {
  try {
    // 1. Products
    for (const p of data.products) {
      await saveProductToFirestore(p);
    }
    // 2. Transactions
    for (const t of data.transactions) {
      await saveTransactionToFirestore(t);
    }
    // 3. Expenses
    for (const e of data.expenses) {
      await saveExpenseToFirestore(e);
    }
    // 4. Customers
    for (const c of data.customers) {
      await saveCustomerToFirestore(c);
    }
    // 5. Manual Journals
    for (const j of data.manualJournals) {
      await saveManualJournalToFirestore(j);
    }
    // 6. Cash Closings
    for (const cl of data.cashClosings) {
      await saveCashClosingToFirestore(cl);
    }
    // 7. Store Settings
    await saveStoreSettingsToFirestore(data.storeSettings);
    // 8. Users
    for (const u of data.users) {
      await saveUserToFirestore(u);
    }
    // 9. Shopping Items
    if (data.shoppingItems) {
      for (const s of data.shoppingItems) {
        await saveShoppingItemToFirestore(s);
      }
    }

    return true;
  } catch (err) {
    console.error('Error pushing full database to Firestore:', err);
    return false;
  }
}
