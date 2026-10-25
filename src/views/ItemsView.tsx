import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Boxes, Plus, Search, Edit2, Trash2, ShieldAlert, Sparkles, Hash } from 'lucide-react';
import { Item, ItemType, Unit } from '../types';
import { api } from '../services/api';

export const ItemsView: React.FC = () => {
  const { items, refreshAll, isAdmin } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form State
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Small Arms Ammunition');
  const [subCategory, setSubCategory] = useState('');
  const [type, setType] = useState<ItemType>('AMMUNITION');
  const [unit, setUnit] = useState<Unit>('ROUNDS');
  const [batchNumber, setBatchNumber] = useState('');
  const [serialTracking, setSerialTracking] = useState(false);
  const [minStock, setMinStock] = useState('100');
  const [maxStock, setMaxStock] = useState('50000');
  const [unitCost, setUnitCost] = useState('0');
  const [shelfLife, setShelfLife] = useState('120');
  const [storageCond, setStorageCond] = useState('Dry Magazine (< 60% RH, Temp 15-25°C)');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingItem(null);
    setItemCode('');
    setItemName('');
    setCategory('Small Arms Ammunition');
    setSubCategory('');
    setType('AMMUNITION');
    setUnit('ROUNDS');
    setBatchNumber('');
    setSerialTracking(false);
    setMinStock('100');
    setMaxStock('50000');
    setUnitCost('0');
    setShelfLife('120');
    setStorageCond('Dry Magazine (< 60% RH, Temp 15-25°C)');
    setStatus('ACTIVE');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setItemCode(item.itemCode);
    setItemName(item.itemName);
    setCategory(item.category);
    setSubCategory(item.subCategory || '');
    setType(item.type);
    setUnit(item.unit);
    setBatchNumber(item.batchNumber || '');
    setSerialTracking(item.serialNumberTracking);
    setMinStock(item.minimumStockLevel.toString());
    setMaxStock(item.maximumStockLevel.toString());
    setUnitCost(item.unitCost.toString());
    setShelfLife(item.shelfLifeMonths ? item.shelfLifeMonths.toString() : '');
    setStorageCond(item.storageConditions || '');
    setStatus(item.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!itemCode.trim() || !itemName.trim() || !category) {
      setError('Item code, nomenclature, and category are mandatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        itemCode: itemCode.trim().toUpperCase(),
        itemName: itemName.trim(),
        category,
        subCategory: subCategory.trim() || undefined,
        type,
        unit,
        batchNumber: batchNumber.trim() || undefined,
        serialNumberTracking: serialTracking,
        minimumStockLevel: Number(minStock) || 0,
        maximumStockLevel: Number(maxStock) || 10000,
        unitCost: Number(unitCost) || 0,
        currency: 'INR',
        shelfLifeMonths: shelfLife ? Number(shelfLife) : undefined,
        storageConditions: storageCond || undefined,
        status
      };

      if (editingItem) {
        await api.updateItem(editingItem.id, payload);
      } else {
        await api.createItem(payload);
      }
      await refreshAll();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Delete item [${code}]? Action will fail if stock or inspection records exist.`)) {
      return;
    }
    try {
      await api.deleteItem(id);
      await refreshAll();
    } catch (err: any) {
      alert(`Deletion rejected: ${err.message}`);
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Boxes className="w-5 h-5" />
            </div>
            Technical Item Master (Ammunition & Store Catalog)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Definitive inventory specifications, shelf-life surveillance rules, and serial tracking requirements.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item Specification</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Item Code, Nomenclature (e.g. 5.56mm INSAS, 84mm Carl Gustaf)..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Nomenclature & Type</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4 text-center">Serial Tracking</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-center">Shelf Life</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {item.itemCode}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{item.itemName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Type: {item.type} • Unit: {item.unit}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.serialNumberTracking ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                        <Hash className="w-3 h-3" /> Mandatory
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">Lot/Batch Only</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                    {formatINR(item.unitCost)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-700">
                    {item.shelfLifeMonths ? `${item.shelfLifeMonths} Mos` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded font-bold border ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          title="Edit Item"
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.itemCode)}
                          title="Delete Item"
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No technical store items found matching search filters.
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl my-8">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600" />
              {editingItem ? 'Edit Item Master Specification' : 'Register Technical Store Item'}
            </h2>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Item / Ordnance Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="e.g. AMN-556-BALL"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Store Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ItemType)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="AMMUNITION">Ammunition</option>
                    <option value="EXPLOSIVE">High Explosives</option>
                    <option value="WEAPON_SPARES">Weapon Spares</option>
                    <option value="OPTICS">Optics / Night Vision</option>
                    <option value="ELECTRONICS">Electronics / Avionics</option>
                    <option value="GENERAL_STORE">General Technical Store</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Item Nomenclature / Technical Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Cartridge SA 5.56mm Ball MK 1Z INSAS"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Category Classification <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Small Arms Ammunition"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Unit of Measurement
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as Unit)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="ROUNDS">ROUNDS</option>
                    <option value="PCS">PCS</option>
                    <option value="BOXES">BOXES</option>
                    <option value="CRATES">CRATES</option>
                    <option value="KG">KG</option>
                    <option value="SETS">SETS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Unit Cost (INR ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Shelf Life (Months)
                  </label>
                  <input
                    type="number"
                    value={shelfLife}
                    onChange={(e) => setShelfLife(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Prescribed Storage Atmosphere / Conditions
                </label>
                <input
                  type="text"
                  value={storageCond}
                  onChange={(e) => setStorageCond(e.target.value)}
                  placeholder="e.g. Dry Magazine (< 60% RH, Temp 15-25°C)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="serialTracking"
                  checked={serialTracking}
                  onChange={(e) => setSerialTracking(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="serialTracking" className="text-xs text-slate-700 select-none cursor-pointer">
                  <span className="font-semibold text-slate-900">Enable Individual Serial Number Tracking</span> (Mandatory for missiles, optics, high-value launcher components)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingItem ? 'Update Specification' : 'Save Item Specification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
