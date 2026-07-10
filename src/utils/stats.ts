import { collection, doc, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QuickStats, Product } from '../types';

/**
 * Aggregates all products in the database and recalculates the global dashboard statistics.
 * Persists the updated numbers back to `system_stats/global` in Firestore, triggers live dashboard re-renders.
 */
export async function recalculateAndSyncStats(): Promise<void> {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    const products: Product[] = [];
    productsSnap.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() } as Product);
    });

    let totalProducts = 0;
    let stockValue = 0;
    let outOfStock = 0;
    let lowStockCount = 0;

    products.forEach((prod) => {
      // Catalog items (Active and Inactive, draft could be omitted or counted)
      if (prod.status !== 'Draft') {
        totalProducts++;
      }
      
      const qty = Number(prod.stockQuantity) || 0;
      const purchasePrice = Number(prod.purchasePrice) || 0;
      stockValue += purchasePrice * qty;

      if (qty <= 0) {
        outOfStock++;
      } else if (qty <= (Number(prod.lowStockLimit) || 0)) {
        lowStockCount++;
      }
    });

    const statsDocRef = doc(db, 'system_stats', 'global');
    const statsDocSnap = await getDoc(statsDocRef);
    
    let dailySalesCount = 0;
    let dailyRevenue = 0;

    if (statsDocSnap.exists()) {
      const currentData = statsDocSnap.data();
      dailySalesCount = currentData.dailySalesCount || 0;
      dailyRevenue = currentData.dailyRevenue || 0;
    }

    const updatedStats: QuickStats = {
      totalProducts,
      stockValue: Math.round(stockValue * 100) / 100, // Round to cents
      outOfStock,
      lowStockCount,
      dailySalesCount,
      dailyRevenue
    };

    // Use setDoc to create or overwrite to avoid document-not-found failures
    await setDoc(statsDocRef, updatedStats);
    console.log('Global inventory dashboard stats successfully synced:', updatedStats);
  } catch (error) {
    console.error('Failed to aggregate and sync dashboard statistics:', error);
  }
}
