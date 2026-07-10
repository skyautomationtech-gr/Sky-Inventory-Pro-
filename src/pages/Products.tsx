import React, { useState, useEffect } from 'react';
import { openFeedbackForm } from '../utils/feedback';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Category, Brand, Supplier, Unit } from '../types';
import { uploadFile, deleteFile } from '../utils/storage';
import { recalculateAndSyncStats } from '../utils/stats';
import { 
  generateBarcodeDataURL, generateQRDataURL, 
  generateUniqueSKU, generateUniqueBarcode 
} from '../utils/barcodes';
import { 
  Plus, Search, Edit2, Trash2, X, Boxes, Image as ImageIcon, 
  Loader2, AlertCircle, Calendar, Eye, Download, Printer, 
  EyeOff, SlidersHorizontal, ChevronLeft, ChevronRight, Barcode as BarcodeIcon,
  QrCode, Percent, ArrowUpDown, Sparkles, Check, CheckCircle2, History, ShoppingCart, 
  DollarSign, Package, Compass, Tag, Trash
} from 'lucide-react';

export const Products: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  
  // Real-time Collections States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low Stock' | 'Out of Stock' | 'Normal'>('All');

  // Sorting State
  const [sortField, setSortField] = useState<keyof Product>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    image: true,
    name: true,
    sku: true,
    barcode: true,
    brand: true,
    category: true,
    supplier: true,
    purchasePrice: true,
    sellingPrice: true,
    stock: true,
    status: true,
    actions: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Active overlays
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Fields
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [minSellingPrice, setMinSellingPrice] = useState<number | ''>('');
  const [profitMargin, setProfitMargin] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [lowStockLimit, setLowStockLimit] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [weight, setWeight] = useState('');
  const [warranty, setWarranty] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Draft'>('Active');
  const [featuredProduct, setFeaturedProduct] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [thumbnailImage, setThumbnailImage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete Overlay within table rows
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // RBAC checks
  const canManage = profile ? ['Super Admin', 'Admin', 'Manager'].includes(profile.role) : false;

  // Sync products and reference catalogs in real-time
  useEffect(() => {
    const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snap) => {
      const items: Product[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Product));
      setProducts(items);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setNotification({ type: 'error', title: 'Sync Error', message: 'Unable to stream live products.' });
      setLoading(false);
    });

    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('name', 'asc')), (snap) => {
      const items: Category[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Category));
      setCategories(items);
    });

    const unsubBrands = onSnapshot(query(collection(db, 'brands'), orderBy('name', 'asc')), (snap) => {
      const items: Brand[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Brand));
      setBrands(items);
    });

    const unsubSups = onSnapshot(query(collection(db, 'suppliers'), orderBy('companyName', 'asc')), (snap) => {
      const items: Supplier[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Supplier));
      setSuppliers(items);
    });

    const unsubUnits = onSnapshot(query(collection(db, 'units'), orderBy('name', 'asc')), (snap) => {
      const items: Unit[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as Unit));
      setUnits(items);
    });

    return () => {
      unsubProducts();
      unsubCats();
      unsubBrands();
      unsubSups();
      unsubUnits();
    };
  }, [setNotification]);

  // Handle SKU & Barcode Generation
  const triggerAutoIdentifiers = () => {
    const prefix = category ? category.slice(0, 4).toUpperCase() : 'SKU';
    const newSku = generateUniqueSKU(prefix);
    const newBarcode = generateUniqueBarcode();
    setSku(newSku);
    setBarcode(newBarcode);
    setQrCode(`SKYP-PROD-${newSku}`);
  };

  // Profit Margin calculation
  useEffect(() => {
    const cost = Number(purchasePrice) || 0;
    const sell = Number(sellingPrice) || 0;
    if (sell > 0) {
      const margin = ((sell - cost) / sell) * 100;
      setProfitMargin(Math.round(margin * 100) / 100);
    } else {
      setProfitMargin(0);
    }
  }, [purchasePrice, sellingPrice]);

  // Image Upload handler (multiple supported)
  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadProgress(0);
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        
        const path = `products/${Date.now()}_${i}_${file.name}`;
        const url = await uploadFile(path, file, (prog) => {
          setUploadProgress(Math.round(((i + prog / 100) / files.length) * 100));
        });
        uploadedUrls.push(url);
      }

      const combinedImages = [...productImages, ...uploadedUrls];
      setProductImages(combinedImages);
      if (!thumbnailImage && combinedImages.length > 0) {
        setThumbnailImage(combinedImages[0]);
      }
      setUploadProgress(null);
      setNotification({
        type: 'success',
        title: 'Upload Completed',
        message: `Successfully uploaded ${uploadedUrls.length} product images.`
      });
    } catch (error) {
      console.error(error);
      setUploadProgress(null);
      setNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Could not upload files to Firebase Storage.'
      });
    }
  };

  const removeProductImage = async (index: string, url: string) => {
    try {
      await deleteFile(url);
      const filtered = productImages.filter(img => img !== url);
      setProductImages(filtered);
      if (thumbnailImage === url) {
        setThumbnailImage(filtered.length > 0 ? filtered[0] : '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setBarcode('');
    setQrCode('');
    setBrand('');
    setCategory('');
    setSubCategory('');
    setSupplier('');
    setPurchasePrice('');
    setSellingPrice('');
    setWholesalePrice('');
    setMinSellingPrice('');
    setProfitMargin(0);
    setStockQuantity('');
    setLowStockLimit('');
    setUnit('');
    setColor('');
    setSize('');
    setWeight('');
    setWarranty('');
    setCountryOfOrigin('');
    setDescription('');
    setShortDescription('');
    setTags([]);
    setTagsInput('');
    setStatus('Active');
    setFeaturedProduct(false);
    setProductImages([]);
    setThumbnailImage('');
    setUploadProgress(null);
    setFormOpen(true);
  };

  const openEditForm = (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setBarcode(prod.barcode);
    setQrCode(prod.qrCode);
    setBrand(prod.brand);
    setCategory(prod.category);
    setSubCategory(prod.subCategory || '');
    setSupplier(prod.supplier);
    setPurchasePrice(prod.purchasePrice);
    setSellingPrice(prod.sellingPrice);
    setWholesalePrice(prod.wholesalePrice || '');
    setMinSellingPrice(prod.minSellingPrice || '');
    setProfitMargin(prod.profitMargin || 0);
    setStockQuantity(prod.stockQuantity);
    setLowStockLimit(prod.lowStockLimit);
    setUnit(prod.unit);
    setColor(prod.color || '');
    setSize(prod.size || '');
    setWeight(prod.weight || '');
    setWarranty(prod.warranty || '');
    setCountryOfOrigin(prod.countryOfOrigin || '');
    setDescription(prod.description);
    setShortDescription(prod.shortDescription || '');
    setTags(prod.tags || []);
    setTagsInput('');
    setStatus(prod.status);
    setFeaturedProduct(prod.featuredProduct || false);
    setProductImages(prod.images || []);
    setThumbnailImage(prod.thumbnail || '');
    setUploadProgress(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setNotification({ type: 'error', title: 'Action Unauthorized', message: 'Read-only users cannot modify catalog products.' });
      return;
    }

    if (!name.trim() || !sku.trim() || !barcode.trim()) {
      setNotification({ type: 'error', title: 'Validation Warning', message: 'Product Name, SKU, and Barcode are required identifiers.' });
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        qrCode: qrCode.trim() || `SKYP-PROD-${sku}`,
        brand,
        category,
        subCategory: subCategory.trim(),
        supplier,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        wholesalePrice: Number(wholesalePrice) || Number(sellingPrice) || 0,
        minSellingPrice: Number(minSellingPrice) || Number(sellingPrice) || 0,
        profitMargin,
        stockQuantity: Number(stockQuantity) || 0,
        lowStockLimit: Number(lowStockLimit) || 0,
        unit,
        color: color.trim(),
        size: size.trim(),
        weight: weight.trim(),
        warranty: warranty.trim(),
        countryOfOrigin: countryOfOrigin.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        tags,
        status,
        featuredProduct,
        images: productImages,
        thumbnail: thumbnailImage || (productImages.length > 0 ? productImages[0] : ''),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'Unknown'
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), payload);
        
        // Log custom activity log
        await addDoc(collection(db, 'activity_logs'), {
          id: `log_${Date.now()}`,
          uid: user?.uid || '',
          userName: profile?.fullName || 'Operator',
          userRole: profile?.role || 'Staff',
          action: 'Product Edited',
          details: `Modified product identifier SKU ${sku} "${name}"`,
          timestamp: new Date().toISOString()
        });

        setNotification({ type: 'success', title: 'Product Saved', message: `Product "${name}" successfully updated.` });
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: new Date().toISOString()
        });

        // Log activity log
        await addDoc(collection(db, 'activity_logs'), {
          id: `log_${Date.now()}`,
          uid: user?.uid || '',
          userName: profile?.fullName || 'Operator',
          userRole: profile?.role || 'Staff',
          action: 'Product Created',
          details: `Registered new product SKU ${sku} "${name}"`,
          timestamp: new Date().toISOString()
        });

        setNotification({ type: 'success', title: 'Product Created', message: `Product "${name}" registered into catalog.` });
      }

      setFormOpen(false);
      // Recalculate global statistics asynchronously
      recalculateAndSyncStats();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', title: 'Save Failed', message: 'An error occurred saving product details.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleProductDelete = async (id: string, name: string, sku: string, images: string[]) => {
    if (!canManage) return;

    try {
      // Clear Storage files
      if (images && images.length > 0) {
        for (const imgUrl of images) {
          await deleteFile(imgUrl);
        }
      }

      await deleteDoc(doc(db, 'products', id));

      // Audit trail
      await addDoc(collection(db, 'activity_logs'), {
        id: `log_${Date.now()}`,
        uid: user?.uid || '',
        userName: profile?.fullName || 'Operator',
        userRole: profile?.role || 'Staff',
        action: 'Product Deleted',
        details: `Deleted product SKU ${sku} "${name}" from catalog`,
        timestamp: new Date().toISOString()
      });

      setNotification({ type: 'success', title: 'Product Deleted', message: `Permanently removed SKU ${sku}.` });
      setDeleteConfirmId(null);
      // Sync Dashboard
      recalculateAndSyncStats();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', title: 'Delete Failed', message: 'Could not delete product document.' });
    }
  };

  // Add Tags
  const handleAddTag = () => {
    if (tagsInput.trim() && !tags.includes(tagsInput.trim())) {
      setTags([...tags, tagsInput.trim()]);
      setTagsInput('');
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter(tag => tag !== t));
  };

  // Column visibility toggle
  const toggleColumnVisibility = (col: string) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  // Multi-column Global Product Search & Filtering
  const processedProducts = products.filter((prod) => {
    const searchStr = `${prod.name} ${prod.sku} ${prod.barcode} ${prod.brand} ${prod.category} ${prod.supplier} ${prod.tags?.join(' ') || ''}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' ? true : prod.category === categoryFilter;
    const matchesBrand = brandFilter === 'All' ? true : prod.brand === brandFilter;
    const matchesSupplier = supplierFilter === 'All' ? true : prod.supplier === supplierFilter;
    const matchesStatus = statusFilter === 'All' ? true : prod.status === statusFilter;
    
    let matchesStock = true;
    if (stockFilter === 'Out of Stock') {
      matchesStock = prod.stockQuantity <= 0;
    } else if (stockFilter === 'Low Stock') {
      matchesStock = prod.stockQuantity > 0 && prod.stockQuantity <= prod.lowStockLimit;
    } else if (stockFilter === 'Normal') {
      matchesStock = prod.stockQuantity > prod.lowStockLimit;
    }

    return matchesSearch && matchesCategory && matchesBrand && matchesSupplier && matchesStatus && matchesStock;
  });

  // Sorting Handler
  const sortedProducts = [...processedProducts].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string') {
      valA = (valA as string).toLowerCase();
      valB = (valB as string || '').toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const triggerSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Pagination Handler
  const totalItems = sortedProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ['SKU', 'Product Name', 'Barcode', 'Brand', 'Category', 'Supplier', 'Purchase Cost', 'Selling Price', 'Stock Level', 'Status', 'Registration Date'];
    const rows = processedProducts.map(p => [
      p.sku,
      p.name,
      p.barcode,
      p.brand,
      p.category,
      p.supplier,
      p.purchasePrice,
      p.sellingPrice,
      p.stockQuantity,
      p.status,
      new Date(p.createdAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SkyInventory_ProductsExport_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel (.xls HTML table style) Exporter
  const handleExportExcel = () => {
    let excelTemplate = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    excelTemplate += `<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Products Inventory</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
    excelTemplate += `<table border="1"><thead><tr style="background-color:#1e3a8a;color:white;font-weight:bold;">`;
    excelTemplate += `<th>SKU</th><th>Product Name</th><th>Barcode</th><th>Brand</th><th>Category</th><th>Supplier</th><th>Purchase Price</th><th>Selling Price</th><th>Stock</th><th>Status</th>`;
    excelTemplate += `</tr></thead><tbody>`;
    
    processedProducts.forEach(p => {
      excelTemplate += `<tr>`;
      excelTemplate += `<td>${p.sku}</td><td>${p.name}</td><td>'${p.barcode}</td><td>${p.brand}</td><td>${p.category}</td><td>${p.supplier}</td><td>${p.purchasePrice}</td><td>${p.sellingPrice}</td><td>${p.stockQuantity}</td><td>${p.status}</td>`;
      excelTemplate += `</tr>`;
    });

    excelTemplate += `</tbody></table></body></html>`;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `SkyInventory_Catalog_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print list
  const handlePrintCatalog = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let html = `<html><head><title>Sky Inventory Pro - Product Catalog</title>`;
    html += `<style>body{font-family:sans-serif;padding:30px;color:#333;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:11px;} th{background-color:#f4f4f4;} .header{text-align:center;} .barcode{font-family:monospace;letter-spacing:1px;}</style></head><body>`;
    html += `<div class="header"><h2>SKY INVENTORY PRO</h2><p>Operational Product Catalog Report - ${new Date().toLocaleDateString()}</p></div>`;
    html += `<table><thead><tr><th>SKU</th><th>Product Name</th><th>Barcode</th><th>Brand</th><th>Category</th><th>Supplier</th><th>Cost</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead><tbody>`;
    
    processedProducts.forEach(p => {
      html += `<tr><td>${p.sku}</td><td><strong>${p.name}</strong></td><td class="barcode">${p.barcode}</td><td>${p.brand}</td><td>${p.category}</td><td>${p.supplier}</td><td>$${p.purchasePrice}</td><td>$${p.sellingPrice}</td><td>${p.stockQuantity}</td><td>${p.status}</td></tr>`;
    });

    html += `</tbody></table></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const openBarcodeModal = (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(prod);
    setBarcodeModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise Product Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">Unified corporate registry managing comprehensive fields, barcode, and pricing pipelines.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Excel
          </button>

          <button
            onClick={handlePrintCatalog}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" /> Print Catalog
          </button>

          {canManage && (
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* 2. Filters & Actions Rail */}
      <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs space-y-4">
        
        {/* Search & Visibility Toggles */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, SKU, barcode, brand, category, tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex gap-2 relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Columns Visibility
            </button>
            
            {showColumnDropdown && (
              <div className="absolute right-0 top-11 z-30 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-2 space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Select Columns</p>
                {Object.keys(visibleColumns).map((col) => (
                  <label key={col} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns[col]} 
                      onChange={() => toggleColumnVisibility(col)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span className="capitalize">{col.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories, Brands, Suppliers dropdown filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-1">
          {/* Category */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Brand</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Brands</option>
              {brands.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Supplier</label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.companyName}>{s.companyName}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          {/* Stock Metrics */}
          <div className="col-span-2 md:col-span-1 space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Stock Levels</label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Stocks</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Normal">Normal levels</option>
            </select>
          </div>
        </div>

      </div>

      {/* 3. Products List / Grid Data Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-400 mt-2 font-mono">Synchronizing real-time catalog matrix...</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="text-center p-16 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-3">
          <Boxes className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Catalog Products Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">No products correspond to the current filters or query search keywords.</p>
          </div>
          <div className="pt-2">
            <button
              onClick={openFeedbackForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              <span>Need assistance? Report Data Issue</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          
          {/* Scrollable container */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/80">
                  {visibleColumns.image && <th className="p-4 w-16">Image</th>}
                  
                  {visibleColumns.name && (
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => triggerSort('name')}>
                      <div className="flex items-center gap-1">Product Name <ArrowUpDown className="h-3 w-3" /></div>
                    </th>
                  )}
                  
                  {visibleColumns.sku && (
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => triggerSort('sku')}>
                      <div className="flex items-center gap-1">SKU <ArrowUpDown className="h-3 w-3" /></div>
                    </th>
                  )}

                  {visibleColumns.barcode && <th className="p-4">Barcode</th>}
                  {visibleColumns.brand && <th className="p-4">Brand</th>}
                  {visibleColumns.category && <th className="p-4">Category</th>}
                  {visibleColumns.supplier && <th className="p-4">Supplier</th>}
                  
                  {visibleColumns.purchasePrice && (
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => triggerSort('purchasePrice')}>
                      <div className="flex items-center gap-1">Purchase <ArrowUpDown className="h-3 w-3" /></div>
                    </th>
                  )}

                  {visibleColumns.sellingPrice && (
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => triggerSort('sellingPrice')}>
                      <div className="flex items-center gap-1">Selling <ArrowUpDown className="h-3 w-3" /></div>
                    </th>
                  )}

                  {visibleColumns.stock && (
                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => triggerSort('stockQuantity')}>
                      <div className="flex items-center gap-1">Stock <ArrowUpDown className="h-3 w-3" /></div>
                    </th>
                  )}

                  {visibleColumns.status && <th className="p-4">Status</th>}
                  {visibleColumns.actions && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {paginatedProducts.map((p) => {
                  const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.lowStockLimit;
                  const isOut = p.stockQuantity <= 0;
                  
                  return (
                    <tr 
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setDetailOpen(true);
                      }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all cursor-pointer relative group"
                    >
                      {/* Image */}
                      {visibleColumns.image && (
                        <td className="p-4">
                          <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.thumbnail ? (
                              <img src={p.thumbnail} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Boxes className="h-4 w-4 text-slate-300" />
                            )}
                          </div>
                        </td>
                      )}

                      {/* Name */}
                      {visibleColumns.name && (
                        <td className="p-4 font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                          {p.name}
                        </td>
                      )}

                      {/* SKU */}
                      {visibleColumns.sku && (
                        <td className="p-4 font-mono font-bold text-[11px] text-slate-500">
                          {p.sku}
                        </td>
                      )}

                      {/* Barcode */}
                      {visibleColumns.barcode && (
                        <td className="p-4 font-mono text-[11px] text-slate-400">
                          {p.barcode}
                        </td>
                      )}

                      {/* Brand */}
                      {visibleColumns.brand && (
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {p.brand || 'None'}
                        </td>
                      )}

                      {/* Category */}
                      {visibleColumns.category && (
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {p.category || 'None'}
                        </td>
                      )}

                      {/* Supplier */}
                      {visibleColumns.supplier && (
                        <td className="p-4 text-slate-600 dark:text-slate-300 max-w-[120px] truncate">
                          {p.supplier || 'Unassigned'}
                        </td>
                      )}

                      {/* Purchase */}
                      {visibleColumns.purchasePrice && (
                        <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                          ${Number(p.purchasePrice).toFixed(2)}
                        </td>
                      )}

                      {/* Selling */}
                      {visibleColumns.sellingPrice && (
                        <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                          ${Number(p.sellingPrice).toFixed(2)}
                        </td>
                      )}

                      {/* Stock */}
                      {visibleColumns.stock && (
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className={`font-bold font-mono ${
                              isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-slate-800 dark:text-slate-100'
                            }`}>
                              {p.stockQuantity} <span className="text-[10px] text-slate-400 font-normal">{p.unit}</span>
                            </span>
                            
                            <div className="text-[9px]">
                              {isOut ? (
                                <span className="text-rose-500 font-bold bg-rose-500/5 px-1 rounded">Out of Stock</span>
                              ) : isLow ? (
                                <span className="text-amber-500 font-bold bg-amber-500/5 px-1 rounded">Low Limit</span>
                              ) : (
                                <span className="text-emerald-500 bg-emerald-500/5 px-1 rounded">In Stock</span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="p-4">
                          <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            p.status === 'Active' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                              : p.status === 'Draft' 
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1 items-center">
                            
                            <button
                              onClick={(e) => openBarcodeModal(p, e)}
                              className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md"
                              title="Print Barcode Label"
                            >
                              <BarcodeIcon className="h-4 w-4" />
                            </button>

                            {canManage ? (
                              <>
                                <button
                                  onClick={(e) => openEditForm(p, e)}
                                  className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md"
                                  title="Edit Product"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                
                                <button
                                  onClick={() => setDeleteConfirmId(p.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md"
                                  title="Delete Product"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono px-2">Read Only</span>
                            )}
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination footer */}
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> matching products</span>
              
              <div className="flex items-center gap-1.5">
                <span>Show</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>rows</span>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-500 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    currentPage === i + 1 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-500 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Row Delete confirmation inside main viewport */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setDeleteConfirmId(null)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center shadow-2xl animate-scale-up space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto animate-bounce" />
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Delete catalog item permanently?</h3>
              <p className="text-xs text-slate-500">This action will delete all product details, images, and barcodes. This operation is permanent.</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const target = products.find(p => p.id === deleteConfirmId);
                  if (target) {
                    handleProductDelete(target.id, target.name, target.sku, target.images || []);
                  }
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add / Edit Full-Screen Panel Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={() => setFormOpen(false)} />
          
          {/* Sidebar Drawer Container */}
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-slide-left border-l border-slate-200 dark:border-slate-800">
            
            {/* Header */}
            <div className="px-6 h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="h-5 w-5 text-blue-500" />
                {editingProduct ? `Edit Product SKU: ${sku}` : 'Register Enterprise Product'}
              </h3>
              
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* SECTION: BASIC INFO */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Basic Nomenclature</h4>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UltraHD Smart LED TV 55 Inch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category Dropdown (Connected to Live categories) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Category Classification *</label>
                    <select
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Sub-Category */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Sub-Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Smart LED, Accessories"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Brand Dropdown (Connected to Live brands) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Manufacturer Brand *</label>
                    <select
                      required
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select Manufacturer</option>
                      {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>

                  {/* Supplier Dropdown (Connected to Live suppliers) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Default Trade Supplier *</label>
                    <select
                      required
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select Vendor</option>
                      {suppliers.map(s => <option key={s.id} value={s.companyName}>{s.companyName}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION: IDENTIFIERS & BARCODE */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKU & Barcode Generation</h4>
                  <button
                    type="button"
                    onClick={triggerAutoIdentifiers}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-850 dark:hover:bg-blue-950/20 text-blue-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-blue-500/20"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Auto-Generate Barcode & SKU
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Unique SKU Identifier *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ELEC-202607-R4X"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">UPC/EAN Barcode *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 7412589630"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">QR Code Target</label>
                    <input
                      type="text"
                      placeholder="Auto-derived on save"
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: PRICING PIPELINE */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Financial Pipeline & Pricing</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Purchase Price *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Cost"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-2.5 py-2.5 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Retail selling Price *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Sell Price"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-2.5 py-2.5 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Wholesale Price</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="B2B price"
                        value={wholesalePrice}
                        onChange={(e) => setWholesalePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-2.5 py-2.5 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Minimum Price Limit</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Floor Limit"
                        value={minSellingPrice}
                        onChange={(e) => setMinSellingPrice(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-2.5 py-2.5 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-bold">
                  <span className="flex items-center gap-1"><Percent className="h-4 w-4" /> Calculated Margin</span>
                  <span className="font-mono text-sm">{profitMargin}%</span>
                </div>
              </div>

              {/* SECTION: STOCK & WAREHOUSE */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Physical Stock & Dimensions</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Active Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      placeholder="Current Units"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value !== '' ? Number(e.target.value) : '')}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Low Stock Alert Limit *</label>
                    <input
                      type="number"
                      required
                      placeholder="Safety Buffer"
                      value={lowStockLimit}
                      onChange={(e) => setLowStockLimit(e.target.value !== '' ? Number(e.target.value) : '')}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Measurement Unit *</label>
                    <select
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                    >
                      <option value="">Select Unit</option>
                      {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Country of Origin</label>
                    <input
                      type="text"
                      placeholder="e.g. South Korea"
                      value={countryOfOrigin}
                      onChange={(e) => setCountryOfOrigin(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Color/Finish</label>
                    <input
                      type="text"
                      placeholder="e.g. Matte Black"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Physical Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 55-Inch, Large"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Unit Weight</label>
                    <input
                      type="text"
                      placeholder="e.g. 15.4 kg"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Warranty Period</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Years Manufacturer"
                      value={warranty}
                      onChange={(e) => setWarranty(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: DESCRIPTIONS & TAGS */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Descriptive Profile & Tags</h4>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Short Summary Description</label>
                  <input
                    type="text"
                    placeholder="Brief 1-sentence sales slogan pitch"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Full Tech/Item Description</label>
                  <textarea
                    placeholder="Enter comprehensive detailed technical specifications, packaging inclusions..."
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 resize-none"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">SEO/Operational Tags</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Press Enter or Add Tag"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                      className="flex-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                  
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                          {t}
                          <button type="button" onClick={() => removeTag(t)} className="hover:text-rose-500 font-bold">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: STORAGE IMAGES */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Firebase Storage Gallery</h4>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Product Media Cover Cards</label>
                  
                  {/* Image Grid with Thumbnails */}
                  {productImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {productImages.map((imgUrl) => {
                        const isPrimary = thumbnailImage === imgUrl;
                        return (
                          <div key={imgUrl} className="relative aspect-square bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                            <img src={imgUrl} alt="Product preview" className="h-full w-full object-cover" />
                            
                            {/* Overlay control flags */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setThumbnailImage(imgUrl)}
                                className={`p-1.5 rounded-lg text-white ${isPrimary ? 'bg-emerald-600' : 'bg-slate-800 hover:bg-slate-750'}`}
                                title={isPrimary ? 'Primary Thumbnail' : 'Set as Thumbnail'}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeProductImage(imgUrl, imgUrl)}
                                className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
                                title="Delete Image"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {isPrimary && (
                              <span className="absolute bottom-1.5 left-1.5 text-[8px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded uppercase">
                                Thumbnail
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Drag & Drop Area */}
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-2xl p-6 text-center space-y-1 relative bg-slate-50/50 dark:bg-slate-950/20">
                    <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Drag and drop images here or select files</p>
                      <p className="text-[10px] text-slate-400">PNG or JPG up to 5MB. Automatic canvas compression applied.</p>
                    </div>
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultipleImagesUpload}
                        className="hidden"
                      />
                    </label>

                    {uploadProgress !== null && (
                      <div className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center text-xs font-bold text-white">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400 mb-2" />
                        <span>Uploading Media Gallery... {uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STATUS & CONFIG */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Product Release Status</label>
                    <div className="flex gap-4 pt-1">
                      {(['Active', 'Inactive', 'Draft'] as const).map((s) => (
                        <label key={s} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="productStatus"
                            checked={status === s}
                            onChange={() => setStatus(s)}
                            className="rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Featured Spot</label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={featuredProduct}
                        onChange={(e) => setFeaturedProduct(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      Highlight on Featured Product Dashboard Spot
                    </label>
                  </div>
                </div>
              </div>

              {/* Panel Action footer */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={formSubmitting || uploadProgress !== null}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-55"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Product Catalog'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. Product Interactive Detail Overlay Page */}
      {detailOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={() => setDetailOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-scale-up z-10">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Product Specsheet Report</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Central product reference profile data.</p>
              </div>
              <button onClick={() => setDetailOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Container */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Product Profile Intro */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Images view */}
                <div className="w-full md:w-2/5 space-y-3">
                  <div className="aspect-square bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden flex items-center justify-center">
                    {selectedProduct.thumbnail ? (
                      <img src={selectedProduct.thumbnail} alt={selectedProduct.name} className="h-full w-full object-cover" />
                    ) : (
                      <Boxes className="h-12 w-12 text-slate-300" />
                    )}
                  </div>
                  
                  {/* Media Grid Preview */}
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedProduct.images.map((img, i) => (
                        <div key={i} className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-200/50 overflow-hidden flex-shrink-0 cursor-pointer">
                          <img src={img} alt="Thumb" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Main Information */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedProduct.status === 'Active' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {selectedProduct.status}
                      </span>
                      {selectedProduct.featuredProduct && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <Sparkles className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Featured Item
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedProduct.name}</h2>
                    <p className="text-xs text-slate-500 italic font-medium">{selectedProduct.shortDescription || 'No quick description tagline.'}</p>
                  </div>

                  {/* Pricing Matrix details */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/45">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Purchase Cost</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">${selectedProduct.purchasePrice.toFixed(2)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Selling Price (Retail)</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">${selectedProduct.sellingPrice.toFixed(2)}</p>
                    </div>
                    <div className="space-y-0.5 pt-2 border-t border-slate-200/50 dark:border-slate-850">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Wholesale Price (B2B)</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">${(selectedProduct.wholesalePrice || selectedProduct.sellingPrice).toFixed(2)}</p>
                    </div>
                    <div className="space-y-0.5 pt-2 border-t border-slate-200/50 dark:border-slate-850">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Estimated Profit Margin</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{selectedProduct.profitMargin || 0}%</p>
                    </div>
                  </div>

                  {/* SKU & Brand/Supplier Tags */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="text-slate-400 font-semibold">SKU Code:</p>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedProduct.sku}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-semibold">UPC Barcode:</p>
                      <p className="font-mono text-slate-500">{selectedProduct.barcode}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-semibold">Category Classification:</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedProduct.category}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-semibold">Manufacturer Brand:</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedProduct.brand}</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Physical specifications and Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Specifications</h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                      <p className="text-slate-400">Stock Capacity:</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{selectedProduct.stockQuantity} {selectedProduct.unit}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Low Stock Limit:</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{selectedProduct.lowStockLimit} {selectedProduct.unit}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
                      <p className="text-slate-400">Country of Origin:</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{selectedProduct.countryOfOrigin || 'Not Specified'}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
                      <p className="text-slate-400">Color Finish:</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{selectedProduct.color || 'N/A'}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
                      <p className="text-slate-400">Physical Size:</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{selectedProduct.size || 'N/A'}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
                      <p className="text-slate-400">Weight Metric:</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{selectedProduct.weight || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full item description</h4>
                  <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl min-h-[140px] text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {selectedProduct.description || 'No descriptive specifications recorded.'}
                    
                    {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-4">
                        {selectedProduct.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MOCK PLACEHOLDERS FOR FUTURE MODULES */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Pipeline Integrations</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Future Inventory & Warehouse Placeholder */}
                  <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
                    <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-blue-500" /> Future Inventory & Warehouse tracking
                    </h5>
                    <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center p-4">
                      <p className="text-[10px] text-slate-400 leading-normal">
                        <strong>Future Inventory Placeholder</strong><br />
                        Physical bins, shelf locations, and warehouse transit paths will stream in this view.
                      </p>
                    </div>
                  </div>

                  {/* Future Sales & Invoicing Ledger Placeholder */}
                  <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
                    <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-500" /> Future Sales Ledger tracking
                    </h5>
                    <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center p-4">
                      <p className="text-[10px] text-slate-400 leading-normal">
                        <strong>Future Sales Placeholder</strong><br />
                        Daily invoice registers, customer invoices, and POS volume tracking will map in this panel.
                      </p>
                    </div>
                  </div>

                  {/* Future Purchase Orders Pipeline */}
                  <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
                    <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart className="h-4 w-4 text-indigo-500" /> Future Purchase Pipeline tracking
                    </h5>
                    <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center p-4">
                      <p className="text-[10px] text-slate-400 leading-normal">
                        <strong>Future Purchase Placeholder</strong><br />
                        Inbound container pipelines, active supplier PO ledgers, and delivery logs will render here.
                      </p>
                    </div>
                  </div>

                  {/* Activity Log Audit Trails Placeholder */}
                  <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
                    <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="h-4 w-4 text-purple-500" /> Product Mutation Activity History
                    </h5>
                    <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center p-4">
                      <p className="text-[10px] text-slate-400 leading-normal">
                        <strong>Activity History Placeholder</strong><br />
                        Audit logs representing SKU modifications and catalog pricing logs will register in this box.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950 flex-shrink-0">
              <button
                onClick={() => setDetailOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Close Specsheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Printable Barcode & QR Labels Modal */}
      {barcodeModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setBarcodeModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl animate-scale-up z-10 flex flex-col">
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <BarcodeIcon className="h-4.5 w-4.5 text-blue-500" /> Printable Barcode Labels
              </h3>
              <button onClick={() => setBarcodeModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Label Print preview body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-center" id="printable-label-content">
              
              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-850 flex flex-col items-center space-y-4 max-w-[280px] mx-auto shadow-xs">
                {/* Brand and name */}
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedProduct.brand}</p>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{selectedProduct.name}</h4>
                  <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">SKU: {selectedProduct.sku}</p>
                </div>

                {/* Live Barcode */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 max-w-full overflow-hidden">
                  <img 
                    src={generateBarcodeDataURL(selectedProduct.barcode)} 
                    alt="CODE128 Barcode" 
                    className="mx-auto max-h-[80px]"
                  />
                  <p className="text-[10px] font-mono font-bold text-slate-900 mt-1">{selectedProduct.barcode}</p>
                </div>

                {/* QR Code */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 w-32 h-32 flex flex-col justify-center items-center">
                  {/* Since generateQRDataURL returns a promise, we can directly fetch it using a simple hook or state,
                      but a simple inline canvas or beautiful QR server image is extremely robust and guaranteed to load instantly without rendering race conditions */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedProduct.qrCode || selectedProduct.sku)}`} 
                    alt="Product QR" 
                    className="h-24 w-24 object-contain"
                  />
                  <p className="text-[8px] font-mono text-slate-400 mt-1 uppercase">Scan QR spec</p>
                </div>
              </div>

              <div className="bg-blue-500/5 p-3.5 rounded-xl text-[11px] text-slate-500 text-left leading-relaxed">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Unified barcode compliance:</p>
                <p className="mt-1">The CODE128 barcode format and custom 2D QR Code will remain unique forever. Use this label block to print adhesive item tags.</p>
              </div>

            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                onClick={() => setBarcodeModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (!printWin) return;
                  const labelHtml = `
                    <html>
                    <head>
                      <title>Print Product Label - ${selectedProduct.sku}</title>
                      <style>
                        body { font-family: monospace; text-align: center; padding: 40px; color: #000; }
                        .label-box { border: 2px solid #000; padding: 20px; display: inline-block; max-width: 300px; border-radius: 10px; }
                        .barcode-img { max-height: 80px; width: auto; margin: 15px 0; }
                        .qr-img { height: 100px; width: 100px; margin: 15px auto; display: block; }
                        h2 { margin: 0; font-size: 16px; }
                        h4 { margin: 5px 0 0 0; font-size: 12px; }
                        .sku { font-size: 10px; font-weight: bold; margin-top: 5px; }
                        @media print { body { padding: 0; } .label-box { border: none; } }
                      </style>
                    </head>
                    <body>
                      <div class="label-box">
                        <h2>${selectedProduct.brand.toUpperCase()}</h2>
                        <h4>${selectedProduct.name}</h4>
                        <div class="sku">SKU: ${selectedProduct.sku}</div>
                        <img class="barcode-img" src="${generateBarcodeDataURL(selectedProduct.barcode)}" />
                        <div class="sku">BARCODE: ${selectedProduct.barcode}</div>
                        <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedProduct.qrCode || selectedProduct.sku)}" />
                        <div class="sku">SPECIFICATION QR</div>
                      </div>
                      <script>window.onload = function() { window.print(); window.close(); }</script>
                    </body>
                    </html>
                  `;
                  printWin.document.write(labelHtml);
                  printWin.document.close();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Labels
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
