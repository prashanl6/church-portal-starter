'use client';
import useSWR from 'swr';
import { useState, useEffect, useMemo } from 'react';

const fetcher = (url:string) => fetch(url).then(r=>r.json());

// Format number with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format number for input (without decimal places requirement)
const formatNumberInput = (num: number): string => {
  if (num === 0) return '';
  // Check if it's a whole number or has decimals
  const parts = num.toString().split('.');
  const wholePart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${wholePart}.${parts[1]}` : wholePart;
};

// Parse formatted number back to number
const parseFormattedNumber = (str: string): number => {
  const cleaned = str.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export default function AssetsPage() {
  const { data, mutate } = useSWR('/api/admin/assets', fetcher);
  const { data: categoriesData } = useSWR('/api/admin/assets/categories', fetcher);
  const { data: referencesData } = useSWR('/api/admin/assets/references', fetcher);
  const [form, setForm] = useState({ reference:'', value:0, quantity:0, labelCategory:'', notes:'' });
  const [valueDisplay, setValueDisplay] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [referenceSuggestions, setReferenceSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const categories = categoriesData?.categories || ['Furniture', 'Sound Equipment', 'AV Equipment', 'Cutlery and Dishware'];
  const allReferences = referencesData?.references || [];
  
  // Filter references based on input
  useEffect(() => {
    if (form.reference.trim()) {
      const filtered = allReferences.filter((ref: string) => 
        ref.toLowerCase().includes(form.reference.toLowerCase())
      );
      setReferenceSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setReferenceSuggestions([]);
      setShowSuggestions(false);
    }
  }, [form.reference, allReferences]);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-reference-input]') && !target.closest('[data-suggestions]')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  
  // Group assets by category and reference
  const groupedAssets = useMemo(() => {
    if (!data?.list) return { grouped: {}, pendingAssets: [] };
    
    const grouped: { [category: string]: { [reference: string]: any[] } } = {};
    const pendingAssets: any[] = [];
    
    data.list.forEach((asset: any) => {
      // Skip rejected assets
      if (asset.approvalStatus === 'REJECTED') return;
      
      // Separate pending assets
      if (asset.approvalStatus === 'SUBMITTED') {
        pendingAssets.push(asset);
        return;
      }
      
      // Group approved assets by category and reference
      const category = asset.labelCategory || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = {};
      }
      if (!grouped[category][asset.reference]) {
        grouped[category][asset.reference] = [];
      }
      grouped[category][asset.reference].push(asset);
    });
    
    return { grouped, pendingAssets };
  }, [data?.list]);
  
  // Sum up assets with same reference
  const summedAssets = useMemo(() => {
    const { grouped, pendingAssets } = groupedAssets;
    const summed: { [category: string]: any[] } = {};
    
    if (grouped) {
      Object.keys(grouped).forEach(category => {
        summed[category] = Object.keys(grouped[category]).map(reference => {
          const assets = grouped[category][reference];
          const totalQuantity = assets.reduce((sum: number, a: any) => sum + a.quantity, 0);
          const totalValue = assets.reduce((sum: number, a: any) => sum + (a.value * a.quantity), 0);
          const firstAsset = assets[0];
          
          return {
            reference,
            quantity: totalQuantity,
            value: totalValue,
            labelCategory: category,
            notes: firstAsset.notes,
            ids: assets.map((a: any) => a.id)
          };
        });
      });
    }
    
    return { summed, pendingAssets: pendingAssets || [] };
  }, [groupedAssets]);

  const submit = async (e:any) => {
    e.preventDefault();
    if (!form.reference.trim() || !form.labelCategory) {
      alert('Reference and Category are required');
      return;
    }
    const url = editingId ? `/api/admin/assets/${editingId}` : '/api/admin/assets';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)});
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) { 
      alert(editingId ? 'Asset update submitted for approval' : 'Asset created and submitted for approval'); 
      setForm({ reference:'', value:0, quantity:0, labelCategory:'', notes:'' });
      setValueDisplay('');
      setEditingId(null);
      mutate(); 
    } else {
      let errorMsg = 'Failed to submit';
      try {
        const errorData = await res.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        try {
          errorMsg = await res.text() || errorMsg;
        } catch {
          // Use default
        }
      }
      alert(errorMsg);
    }
  };
  
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // If empty, clear both
    if (inputValue === '') {
      setForm({ ...form, value: 0 });
      setValueDisplay('');
      return;
    }
    
    // Remove all non-numeric characters except decimal point
    const cleaned = inputValue.replace(/[^\d.]/g, '');
    
    // Handle multiple decimal points - keep only the first one
    const parts = cleaned.split('.');
    let validInput = parts[0];
    if (parts.length > 1) {
      // Keep only the first decimal point and up to 2 decimal places
      validInput = parts[0] + '.' + parts.slice(1).join('').substring(0, 2);
    }
    
    // Parse to number
    const numValue = parseFloat(validInput) || 0;
    
    // Format with commas for display
    const formatted = formatNumberInput(numValue);
    
    setForm({ ...form, value: numValue });
    setValueDisplay(formatted);
  };
  
  const handleValueBlur = () => {
    // Format on blur
    if (form.value > 0) {
      setValueDisplay(formatNumberInput(form.value));
    } else {
      setValueDisplay('');
    }
  };
  
  const edit = (asset: any) => {
    setForm({ 
      reference: asset.reference, 
      value: asset.value, 
      quantity: asset.quantity, 
      labelCategory: asset.labelCategory, 
      notes: asset.notes || '' 
    });
    setValueDisplay(formatNumberInput(asset.value));
    setEditingId(asset.id);
  };
  
  const cancelEdit = () => {
    setForm({ reference:'', value:0, quantity:0, labelCategory:'', notes:'' });
    setValueDisplay('');
    setEditingId(null);
  };
  
  const handleDelete = async (assetId: number, assetReference: string) => {
    if (!window.confirm(`Are you sure you want to request deletion of asset "${assetReference}"? This will require approval before the asset is deleted.`)) {
      return;
    }
    
    const res = await fetch(`/api/admin/assets/${assetId}`, { method: 'DELETE' });
    if (res.status === 401 || res.status === 403) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      alert('Delete request submitted for approval');
      mutate();
    } else {
      let errorMsg = 'Failed to submit delete request';
      try {
        const errorData = await res.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        try {
          errorMsg = await res.text() || errorMsg;
        } catch {
          // Use default
        }
      }
      alert(errorMsg);
    }
  };
  
  const selectReference = (ref: string) => {
    setForm({ ...form, reference: ref });
    setShowSuggestions(false);
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Assets</h1>
      <form onSubmit={submit} className="card grid gap-2">
        <div style={{ position: 'relative' }}>
          <label className="label">Reference <span style={{ color: 'red' }}>*</span></label>
          <input 
            className="input"
            data-reference-input
            value={form.reference} 
            onChange={e=>setForm({...form, reference:e.target.value})}
            onFocus={() => form.reference && setShowSuggestions(true)}
            required
          />
          {showSuggestions && referenceSuggestions.length > 0 && (
            <div 
              data-suggestions
              style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              backgroundColor: 'white',
              border: '1px solid rgb(226, 232, 240)',
              borderRadius: '0.5rem',
              marginTop: '0.25rem',
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              {referenceSuggestions.map((ref: string, idx: number) => (
                <div
                  key={idx}
                  onClick={() => selectReference(ref)}
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    borderBottom: idx < referenceSuggestions.length - 1 ? '1px solid rgb(226, 232, 240)' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(241, 245, 249)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  {ref}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Value</label>
            <input 
              className="input" 
              type="text" 
              value={valueDisplay} 
              onChange={handleValueChange}
              onBlur={handleValueBlur}
              placeholder="0.00"
              required 
            />
          </div>
          <div><label className="label">Quantity</label><input className="input" type="number" value={form.quantity} onChange={e=>setForm({...form, quantity:Number(e.target.value)})} required min="1"/></div>
          <div>
            <label className="label">Category <span style={{ color: 'red' }}>*</span></label>
            <input
              className="input"
              list="categories-list"
              value={form.labelCategory}
              onChange={e=>setForm({...form, labelCategory:e.target.value})}
              placeholder="Select or type a category"
              required
            />
            <datalist id="categories-list">
              {categories.map((cat: string) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </div>
        <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}/></div>
        <div className="flex gap-2">
          <button className="btn w-fit" type="submit">{editingId ? 'Update (needs approval)' : 'Save (needs approval)'}</button>
          {editingId && (
            <button type="button" className="btn w-fit" onClick={cancelEdit} style={{ backgroundColor: 'rgb(239, 68, 68)' }}>Cancel</button>
          )}
        </div>
      </form>
      
      {/* Pending Assets */}
      {summedAssets.pendingAssets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Pending Approval</h2>
          <div className="grid gap-2">
            {summedAssets.pendingAssets.map((a: any) => {
              const isPendingDelete = a.approvalAction === 'delete';
              const isPendingCreate = a.approvalAction === 'create';
              const isPendingUpdate = a.approvalAction === 'update';
              
              return (
                <div key={a.id} className="card" style={{ borderLeft: `4px solid ${isPendingDelete ? 'rgb(239, 68, 68)' : 'rgb(251, 191, 36)'}` }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold">{a.reference}</div>
                      <div className="text-sm">Qty {a.quantity.toLocaleString()} · LKR {formatNumber(a.value)} · {a.labelCategory}</div>
                      {a.notes && <div className="text-sm text-gray-500 mt-1">{a.notes}</div>}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        isPendingDelete 
                          ? 'bg-red-100 text-red-800' 
                          : isPendingUpdate
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {isPendingDelete 
                          ? 'Pending Deletion' 
                          : isPendingUpdate
                          ? 'Pending Update'
                          : 'Pending Approval'}
                      </span>
                      {!isPendingDelete && (
                        <>
                          {!isPendingUpdate && (
                            <button 
                              onClick={() => edit(a)}
                              className="btn btn-sm"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                            >
                              Edit
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(a.id, a.reference)}
                            className="btn btn-sm"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'rgb(239, 68, 68)', color: 'white' }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Approved Assets by Category */}
      {Object.keys(summedAssets.summed).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Approved Assets</h2>
          {Object.keys(summedAssets.summed).sort().map(category => (
            <div key={category} className="mb-6">
              <h3 className="text-base font-semibold mb-2" style={{ color: 'rgb(99, 102, 241)' }}>{category}</h3>
              <div className="grid gap-2">
                {summedAssets.summed[category].map((asset: any, idx: number) => {
                  // Find the first approved asset with this reference to get full details for editing
                  const firstAsset = data?.list?.find((a: any) => 
                    a.reference === asset.reference && 
                    a.labelCategory === category && 
                    a.approvalStatus !== 'SUBMITTED' && 
                    a.approvalStatus !== 'REJECTED'
                  );
                  
                  // Get all asset IDs with this reference in this category for deletion
                  const assetIds = data?.list?.filter((a: any) => 
                    a.reference === asset.reference && 
                    a.labelCategory === category && 
                    a.approvalStatus !== 'SUBMITTED' && 
                    a.approvalStatus !== 'REJECTED'
                  ).map((a: any) => a.id) || [];
                  
                  const handleDeleteSummed = async () => {
                    const count = assetIds.length;
                    if (!window.confirm(
                      `Are you sure you want to request deletion of all ${count} asset record${count > 1 ? 's' : ''} with reference "${asset.reference}" in category "${category}"? This will require approval before the assets are deleted.`
                    )) {
                      return;
                    }
                    
                    // Submit delete requests for all assets with this reference
                    try {
                      const results = await Promise.all(assetIds.map((id: number) => 
                        fetch(`/api/admin/assets/${id}`, { method: 'DELETE' })
                      ));
                      
                      const failed = results.filter(r => !r.ok).length;
                      if (failed === 0) {
                        alert(`Delete requests submitted for ${count} asset record${count > 1 ? 's' : ''}. Awaiting approval.`);
                      } else {
                        alert(`Submitted delete requests for ${count - failed} asset record${count - failed > 1 ? 's' : ''}. ${failed} request${failed > 1 ? 's' : ''} failed.`);
                      }
                      mutate();
                    } catch (error) {
                      alert('Failed to submit some delete requests. Please try again.');
                    }
                  };
                  
                  return (
                    <div key={`${category}-${asset.reference}-${idx}`} className="card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">{asset.reference}</div>
                          <div className="text-sm">Total Qty: {asset.quantity.toLocaleString()} · Total Value: LKR {formatNumber(asset.value)}</div>
                          {asset.notes && <div className="text-sm text-gray-500 mt-1">{asset.notes}</div>}
                        </div>
                        <div className="flex gap-2">
                          {firstAsset && (
                            <button 
                              onClick={() => edit(firstAsset)}
                              className="btn btn-sm"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                            >
                              Edit
                            </button>
                          )}
                          {assetIds.length > 0 && (
                            <button 
                              onClick={handleDeleteSummed}
                              className="btn btn-sm"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'rgb(239, 68, 68)', color: 'white' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {Object.keys(summedAssets.summed).length === 0 && summedAssets.pendingAssets.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-500">No assets yet. Create your first asset above.</p>
        </div>
      )}
    </div>
  );
}
