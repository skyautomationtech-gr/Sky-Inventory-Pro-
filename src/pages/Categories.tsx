import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Category } from '../types';
import { uploadFile, deleteFile } from '../utils/storage';
import { 
  Plus, Search, Edit2, Trash2, X, Folder, Image, 
  Loader2, Check, AlertCircle, Calendar, Eye 
} from 'lucide-react';

export const Categories: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [parentCategory, setParentCategory] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete confirm modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // RBAC checks
  const canManage = profile ? ['Super Admin', 'Admin', 'Manager'].includes(profile.role) : false;

  // Sync Categories in real-time
  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Category);
      });
      setCategories(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching categories:', error);
      setNotification({
        type: 'error',
        title: 'Sync Error',
        message: 'Unable to stream real-time categories'
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [setNotification]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please choose a valid image file.'
      });
      return;
    }

    try {
      setUploadProgress(0);
      const storagePath = `categories/${Date.now()}_${file.name}`;
      const url = await uploadFile(storagePath, file, (progress) => {
        setUploadProgress(progress);
      });
      setImageUrl(url);
      setUploadProgress(null);
      setNotification({
        type: 'success',
        title: 'Upload Successful',
        message: 'Category image successfully uploaded and compressed.'
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadProgress(null);
      setNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Could not upload category image to Storage.'
      });
    }
  };

  const handleRemoveImage = async () => {
    if (imageUrl) {
      try {
        await deleteFile(imageUrl);
        setImageUrl(null);
      } catch (err) {
        console.error('Image deletion failed:', err);
      }
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setStatus('Active');
    setParentCategory('');
    setImageUrl(null);
    setUploadProgress(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description);
    setStatus(cat.status);
    setParentCategory(cat.parentCategory || '');
    setImageUrl(cat.image);
    setUploadProgress(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setNotification({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Your role does not permit modifying categories.'
      });
      return;
    }

    if (!name.trim()) return;

    setFormSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
        parentCategory: parentCategory || null,
        image: imageUrl,
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'Unknown'
      };

      if (editingCategory) {
        // Update
        const docRef = doc(db, 'categories', editingCategory.id);
        await updateDoc(docRef, payload);
        setNotification({
          type: 'success',
          title: 'Category Updated',
          message: `Category "${name}" successfully saved.`
        });
      } else {
        // Create
        await addDoc(collection(db, 'categories'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setNotification({
          type: 'success',
          title: 'Category Created',
          message: `Category "${name}" successfully registered.`
        });
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
      setNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'An error occurred while saving the category.'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string, catImageUrl: string | null) => {
    if (!canManage) {
      setNotification({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Your role does not permit deleting categories.'
      });
      return;
    }

    try {
      if (catImageUrl) {
        await deleteFile(catImageUrl);
      }
      await deleteDoc(doc(db, 'categories', id));
      setNotification({
        type: 'success',
        title: 'Category Deleted',
        message: 'The category was permanently deleted.'
      });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      setNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'An error occurred while deleting the category.'
      });
    }
  };

  // Filter categories based on search & status
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          cat.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : cat.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Quick Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Category Management</h1>
          <p className="text-xs text-slate-500 mt-1">Organize and structure inventory products hierarchical tiers.</p>
        </div>
        
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search category name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          {(['All', 'Active', 'Inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === filter 
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30' 
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200/30 dark:border-slate-800/50 hover:bg-slate-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main categories listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-400 mt-2 font-mono">Streaming categories database...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-3">
          <Folder className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Categories Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Try resetting filters or adding a new category to construct your inventory structures.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const hasParent = cat.parentCategory;
            return (
              <div 
                key={cat.id} 
                className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between hover:shadow transition-all relative overflow-hidden"
              >
                {/* Image & Main Info */}
                <div className="space-y-4">
                  <div className="flex gap-4">
                    {/* Category Image */}
                    <div className="h-14 w-14 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {cat.image ? (
                        <img 
                          src={cat.image} 
                          alt={cat.name} 
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Folder className="h-6 w-6 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          cat.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {cat.status}
                        </span>
                        
                        {hasParent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-500 truncate max-w-[120px]">
                            Child Category
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{cat.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed min-h-[54px]">{cat.description || 'No description provided.'}</p>
                </div>

                {/* Meta details & Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(cat.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {canManage ? (
                      <>
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Read Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Confirmation Overlay inside card */}
                {deleteConfirmId === cat.id && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col justify-center items-center p-4 text-center z-10 animate-fade-in">
                    <AlertCircle className="h-8 w-8 text-rose-500 animate-bounce" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-2">Permanently delete category?</h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">This will delete the category structure. Associated products will lose their category classification.</p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleDelete(cat.id, cat.image)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingCategory ? 'Modify Category' : 'Register Category'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Image Upload Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Category Cover Image</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="h-full w-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Image className="h-6 w-6 text-slate-400" />
                    )}
                    {uploadProgress !== null && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-[10px] font-bold text-white">
                        <Loader2 className="h-4 w-4 animate-spin mb-1 text-blue-400" />
                        <span>{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-all block">
                        Choose Cover
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="hidden" 
                        />
                      </label>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-[10px] font-bold text-rose-500 hover:bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-500/20"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">PNG, JPG or JPEG up to 3MB. Compressed automatically.</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electronics, Raw Materials"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Parent Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Parent Category (Optional)</label>
                <select
                  value={parentCategory}
                  onChange={(e) => setParentCategory(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 transition-all"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories
                    .filter(c => c.id !== editingCategory?.id && !c.parentCategory)
                    .map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Description</label>
                <textarea
                  placeholder="Explain what products fit into this category..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Category Status</label>
                <div className="flex gap-4">
                  {(['Active', 'Inactive'] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="status"
                        checked={status === s}
                        onChange={() => setStatus(s)}
                        className="rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                    'Save Category'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
