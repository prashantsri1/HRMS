import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx'; // 📦 Excel Library
import { useFirestore } from '../../hooks/useFirestore';
import { useCollection } from '../../hooks/useCollection'; // ⚡ Real-time Sync ke liye Import
import { 
  Package, Search, AlertTriangle, ArrowUp, ArrowDown, 
  TrendingUp, DollarSign, Archive, MapPin, Filter, 
  Plus, FileSpreadsheet, X, Save, Edit, Trash2, Eye 
} from 'lucide-react';

const initialItemState = {
  name: '',
  sku: '', // Manual Entry
  category: '',
  brand: '',
  description: '',
  
  qty: 0,
  minLevel: 5,
  maxLevel: 100,
  
  costPrice: 0,
  sellingPrice: 0,
  taxRate: 18, // GST %
  hsnCode: '',
  
  location: '', // Warehouse A
  rackNo: '',   // A-12
  supplier: '',
};

const InventoryManager = () => {
  // 1. Fetch Data Real-time (Synced with Invoices)
  const { documents: inventory } = useCollection('inventory');

  // 2. Database Actions (Add/Edit/Delete)
  const { addDocument, updateDocument, deleteDocument } = useFirestore('inventory');
  
  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Modal States
  const [showModal, setShowModal] = useState(false); // For Add/Edit
  const [showDetailModal, setShowDetailModal] = useState(false); // For View Details
  
  const [newItem, setNewItem] = useState(initialItemState);
  const [isEditing, setIsEditing] = useState(false); // Track edit mode
  const [currentId, setCurrentId] = useState(null); // Track ID for edit/delete
  const [selectedDetailItem, setSelectedDetailItem] = useState(null); // For detail view

  // --- 📊 ANALYTICS ---
  const stats = useMemo(() => {
    if (!inventory) return { totalItems: 0, totalValue: 0, lowStock: 0 };
    return inventory.reduce((acc, item) => {
      acc.totalItems += 1;
      acc.totalValue += (Number(item.qty) * Number(item.costPrice));
      if (Number(item.qty) <= Number(item.minLevel)) acc.lowStock += 1;
      return acc;
    }, { totalItems: 0, totalValue: 0, lowStock: 0 });
  }, [inventory]);

  // --- 🔍 FILTERING ---
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesFilter = true;
      if (filterType === 'low_stock') matchesFilter = Number(item.qty) <= Number(item.minLevel);
      return matchesSearch && matchesFilter;
    });
  }, [inventory, searchTerm, filterType]);

  // --- 📥 EXCEL EXPORT ---
  const exportToExcel = () => {
    if (!inventory || inventory.length === 0) return alert("No data to export");

    const worksheet = XLSX.utils.json_to_sheet(inventory.map(item => ({
      "Product Name": item.name,
      "SKU": item.sku,
      "Category": item.category,
      "Brand": item.brand,
      "Quantity": item.qty,
      "Cost Price": item.costPrice,
      "Selling Price": item.sellingPrice,
      "Total Value": item.qty * item.costPrice,
      "Location": `${item.location} (${item.rackNo})`,
      "Supplier": item.supplier
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory_Report");
    XLSX.writeFile(workbook, `Inventory_Stock_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // --- 📝 FORM HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  // Open Modal for Create
  const openAddModal = () => {
    setNewItem(initialItemState);
    setIsEditing(false);
    setCurrentId(null);
    setShowModal(true);
  };

  // Open Modal for Edit
  const openEditModal = (e, item) => {
    e.stopPropagation(); // Prevent row click
    setNewItem(item);
    setIsEditing(true);
    setCurrentId(item.id);
    setShowModal(true);
  };

  // Open Modal for View Details
  const openDetailModal = (item) => {
    setSelectedDetailItem(item);
    setShowDetailModal(true);
  };

  // Save (Create or Update)
  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.sku) return alert("Name and SKU are required!");
    
    const itemData = {
      ...newItem,
      qty: Number(newItem.qty),
      costPrice: Number(newItem.costPrice),
      sellingPrice: Number(newItem.sellingPrice),
      minLevel: Number(newItem.minLevel),
      maxLevel: Number(newItem.maxLevel),
      taxRate: Number(newItem.taxRate),
      lastUpdated: new Date().toISOString()
    };

    if (isEditing && currentId) {
      // UPDATE Logic
      await updateDocument(currentId, itemData);
      alert("Product Updated Successfully!");
    } else {
      // CREATE Logic
      // Check for duplicate SKU (Basic Check) - only on create
      const exists = inventory && inventory.find(i => i.sku === newItem.sku);
      if(exists) return alert("SKU already exists! Use a unique SKU.");

      await addDocument({
        ...itemData,
        createdAt: new Date().toISOString()
      });
      alert("Product Added Successfully!");
    }

    setNewItem(initialItemState);
    setShowModal(false);
  };

  // Delete Item
  const handleDeleteItem = async (e, id) => {
    e.stopPropagation(); // Prevent row click
    if (window.confirm("Are you sure you want to delete this product? This cannot be undone.")) {
      await deleteDocument(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-gray-900 dark:text-white">
              <Package className="text-blue-600" size={32} /> Global Inventory
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enterprise Grade Stock Management System
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
              <FileSpreadsheet size={18} /> Export Excel
            </button>
            <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        {/* --- KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Inventory Value" value={`₹${stats.totalValue.toLocaleString()}`} icon={<DollarSign size={24} className="text-emerald-500"/>} bg="bg-emerald-50 dark:bg-emerald-900/20" border="border-emerald-200 dark:border-emerald-800"/>
          <StatCard title="Total SKUs" value={stats.totalItems} icon={<Archive size={24} className="text-blue-500"/>} bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-200 dark:border-blue-800"/>
          <StatCard title="Critical Stock" value={stats.lowStock} icon={<AlertTriangle size={24} className="text-red-500"/>} bg="bg-red-50 dark:bg-red-900/20" border="border-red-200 dark:border-red-800" textColor="text-red-600"/>
        </div>

        {/* --- TABLE --- */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50 dark:bg-gray-700/20">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input type="text" placeholder="Search SKU, Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-1">
                {['all', 'low_stock'].map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === type ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700'}`}>
                    {type === 'all' ? 'All' : 'Low Stock'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4 text-right">Value</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredInventory.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => openDetailModal(item)} // Tap on row to view details
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                      <div className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded inline-block mt-1">{item.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{item.category} <span className="text-xs text-gray-400">({item.brand})</span></td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300"><MapPin size={12} className="inline mr-1"/>{item.location} ({item.rackNo})</td>
                    <td className="px-6 py-4 text-right"><div className="font-bold text-gray-800 dark:text-gray-200">₹{item.sellingPrice}</div><div className="text-xs text-gray-400">CP: ₹{item.costPrice}</div></td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-lg">{item.qty}</td>
                    <td className="px-6 py-4 text-center">
                      {Number(item.qty) <= Number(item.minLevel) ? <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold animate-pulse">Low</span> : <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">OK</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={(e) => openEditModal(e, item)} 
                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded" 
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteItem(e, item.id)} 
                          className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded" 
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 🔥 ADD / EDIT PRODUCT MODAL --- */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 rounded-t-2xl">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Package className="text-blue-500" /> {isEditing ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  
                  {/* SECTION 1: BASIC INFO */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider border-b pb-1">1. Product Identity</h3>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Product Name *</label>
                      <input type="text" name="name" value={newItem.name} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none" placeholder="e.g. Dell XPS 13" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">SKU (Manual) *</label>
                        <input type="text" name="sku" value={newItem.sku} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none font-mono" placeholder="DL-XPS-001" disabled={isEditing} /> {/* Disable SKU on Edit */}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Brand</label>
                        <input type="text" name="brand" value={newItem.brand} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none" placeholder="Dell" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Category</label>
                      <select name="category" value={newItem.category} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none">
                        <option value="">Select Category</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Stationery">Stationery</option>
                        <option value="Raw Material">Raw Material</option>
                      </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Description</label>
                        <textarea name="description" value={newItem.description} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none h-20 resize-none" placeholder="Detailed specs..."></textarea>
                    </div>
                  </div>

                  {/* SECTION 2: PRICING & TAX */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider border-b pb-1">2. Pricing & Financials</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cost Price (Buy)</label>
                        <input type="number" name="costPrice" value={newItem.costPrice} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Selling Price</label>
                        <input type="number" name="sellingPrice" value={newItem.sellingPrice} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tax Rate (GST %)</label>
                            <select name="taxRate" value={newItem.taxRate} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none">
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">HSN Code</label>
                            <input type="text" name="hsnCode" value={newItem.hsnCode} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none" />
                        </div>
                    </div>
                  </div>

                  {/* SECTION 3: INVENTORY RULES */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider border-b pb-1">3. Inventory Logic</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Current Qty</label>
                            <input type="number" name="qty" value={newItem.qty} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Min Level</label>
                            <input type="number" name="minLevel" value={newItem.minLevel} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none text-red-500" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Max Level</label>
                            <input type="number" name="maxLevel" value={newItem.maxLevel} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none text-green-500" />
                        </div>
                    </div>
                  </div>

                  {/* SECTION 4: LOCATION & SUPPLIER */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider border-b pb-1">4. Logistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Warehouse Location</label>
                            <input type="text" name="location" value={newItem.location} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none" placeholder="e.g. Zone A" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Rack / Shelf</label>
                            <input type="text" name="rackNo" value={newItem.rackNo} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none" placeholder="e.g. R-101" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Primary Supplier</label>
                        <input type="text" name="supplier" value={newItem.supplier} onChange={handleInputChange} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none" placeholder="Vendor Name" />
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer Buttons */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 bg-gray-50 dark:bg-gray-700/30 rounded-b-2xl">
                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveItem} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
                    <Save size={18} /> {isEditing ? 'Update Product' : 'Save Product'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* --- 👁️ DETAIL VIEW MODAL --- */}
        {showDetailModal && selectedDetailItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
              
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 rounded-t-2xl">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Eye className="text-emerald-500" /> Product Details: {selectedDetailItem.sku}
                </h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                
                {/* Header Info */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedDetailItem.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedDetailItem.brand} | {selectedDetailItem.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">₹{selectedDetailItem.sellingPrice}</div>
                    <p className="text-xs text-gray-400">Excl. {selectedDetailItem.taxRate}% GST</p>
                  </div>
                </div>

                <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <DetailBox label="Current Stock" value={selectedDetailItem.qty} />
                  <DetailBox label="Cost Price" value={`₹${selectedDetailItem.costPrice}`} />
                  <DetailBox label="Min Level" value={selectedDetailItem.minLevel} color="text-red-500" />
                  <DetailBox label="Max Level" value={selectedDetailItem.maxLevel} color="text-green-500" />
                  
                  <DetailBox label="Location" value={selectedDetailItem.location} />
                  <DetailBox label="Rack No" value={selectedDetailItem.rackNo} />
                  <DetailBox label="HSN Code" value={selectedDetailItem.hsnCode} />
                  <DetailBox label="Supplier" value={selectedDetailItem.supplier} />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Description</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedDetailItem.description || "No description available."}
                  </p>
                </div>

              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-700/30 rounded-b-2xl">
                <button onClick={() => setShowDetailModal(false)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg">Close</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// UI Helper
const StatCard = ({ title, value, icon, bg, border, textColor = "text-gray-900 dark:text-white" }) => (
  <div className={`p-6 rounded-2xl border ${border} ${bg} flex flex-col justify-between h-32`}>
    <div className="flex justify-between items-start">
      <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h4>
      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">{icon}</div>
    </div>
    <div className={`text-3xl font-extrabold ${textColor}`}>{value}</div>
  </div>
);

const DetailBox = ({ label, value, color = "text-gray-900 dark:text-white" }) => (
  <div>
    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
    <p className={`text-lg font-bold ${color}`}>{value || '-'}</p>
  </div>
);

export default InventoryManager;