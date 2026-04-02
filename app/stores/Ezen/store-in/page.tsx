'use client';

import React, { useState, useEffect, Suspense } from 'react'; // 1. إضافة Suspense
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

interface Store { 'الرقم': number; 'اسم المخزن': string; }
interface Item { 'كود الصنف': number; 'اسم الصنف': string; 'الوحدة': string; }

interface DetailRow {
    tempId: number;
    ItemID: number | null; ItemName: string; Unit: string;
    StoreID: number | null;
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
    isExisting?: boolean;
}

// === 1. مكون المحتوى (الداخلي) ===
function StoreInContent() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const searchParams = useSearchParams(); // <-- آمن هنا داخل المحتوى

    // Header State
    const [invoiceNumber, setInvoiceNumber] = useState<string>('');
    const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [supplierName, setSupplierName] = useState<string>('');
    const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [orderId, setOrderId] = useState<number>(1);
    
    // Details State
    const [rows, setRows] = useState<DetailRow[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Styles
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' };
    const thStyle: React.CSSProperties = { padding: '8px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'center', fontSize: '12px' };
    const tdStyle: React.CSSProperties = { padding: '4px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontSize: '12px' };
    const btn: React.CSSProperties = { padding: '8px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: 'white' };

    // === Initialization ===
    useEffect(() => {
        const init = async () => {
            // Fetch Lookups
            const resStores = await fetch(`${API_URL}/api/getData1/19?id=${schoolId}`);
            if (resStores.ok) { const j = await resStores.json(); if (j.success) setStores(j.data); }
            const resItems = await fetch(`${API_URL}/api/getData1/20?id=${schoolId}`);
            if (resItems.ok) { const j = await resItems.json(); if (j.success) setItems(j.data); }

            // Check Edit Mode
            const editId = searchParams.get('editId');
            if (editId) {
                setIsEditing(true);
                loadOrderData(Number(editId));
            } else {
                getNextId();
            }
        };
        if (schoolId) init();
    }, [schoolId, searchParams]);

    // === Load Data for Edit ===
    const loadOrderData = async (id: number) => {
        setLoading(true);
        setOrderId(id);
        try {
            const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${schoolId}&sch2=${id}&inpot=1`);
            const json = await res.json();
            if (json.success) {
                if (json.data && json.data[0]) {
                    const h = json.data[0];
                    setSupplierName(h.SupplierName || '');
                    setInvoiceNumber(String(h.fatwra_naber || ''));
                    setInvoiceDate(h.fatwera_date ? h.fatwera_date.split('T')[0] : '');
                    setOrderDate(h.PurchaseDate ? h.PurchaseDate.split('T')[0] : '');
                }
                if (json.data2) {
                    const loadedRows = json.data2.map((r: any) => ({
                        tempId: Date.now() + r.SanefID,
                        ItemID: r.SanefID,
                        ItemName: r['اسم الصنف'],
                        StoreID: r.MagzaenID,
                        Quantity: r.Quantity,
                        UnitPrice: r.UnitPrice,
                        TotalPrice: r.TotalPrice,
                        Unit: r.Unit,
                        isExisting: true
                    }));
                    setRows(loadedRows);
                }
            }
        } catch (e) { console.error(e); alert('خطأ في تحميل البيانات'); } 
        finally { setLoading(false); }
    };

    const getNextId = async () => {
        try {
            const res = await fetch(`${API_URL}/api/getData/44`);
            const json = await res.json();
            if (json.success && json.data?.[0]) {
                const id = json.data[0]['NextID'] || Object.values(json.data[0])[0];
                setOrderId(Number(id) || 1);
            }
        } catch {}
    };

    // === Logic ===
    const addRow = () => setRows(prev => [...prev, { tempId: Date.now(), ItemID: null, ItemName: '', Unit: '', StoreID: null, Quantity: 1, UnitPrice: 0, TotalPrice: 0, isExisting: false }]);
    const removeRow = (tempId: number) => setRows(prev => prev.filter(r => r.tempId !== tempId));

    const handleRowChange = (tempId: number, field: string, value: any) => {
        setRows(prev => prev.map(row => {
            if (row.tempId === tempId) {
                let updated = { ...row, [field]: value };
                if (field === 'ItemID') {
                    const item = items.find(i => i['كود الصنف'] == value);
                    updated.ItemName = item ? item['اسم الصنف'] : '';
                    updated.Unit = item ? item['الوحدة'] : '';
                }
                if (field === 'Quantity' || field === 'UnitPrice') {
                    const qty = field === 'Quantity' ? Number(value) : row.Quantity;
                    const price = field === 'UnitPrice' ? Number(value) : row.UnitPrice;
                    updated.TotalPrice = qty * price;
                }
                return updated;
            }
            return row;
        }));
    };

    const grandTotal = rows.reduce((sum, r) => sum + r.TotalPrice, 0);

    // === Save ===
    const handleSave = async () => {
        if (!supplierName || rows.length === 0) return alert('أدخل اسم المورد والأصناف');
        setLoading(true);

        try {
            if (!isEditing) {
                const headerRes = await fetch(`${API_URL}/api/purchase-orders/manage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        purchaseOrderId: orderId, purchaseDate: orderDate, supplierName, schoolId,
                        invoiceNum: invoiceNumber, invoiceDate, inpout: 1
                    })
                });
                const headerJson = await headerRes.json();
                if (!headerJson.success) throw new Error(headerJson.error);
            }

            for (const row of rows) {
                if (row.ItemID && row.StoreID && row.Quantity > 0) {
                    const operation = isEditing && row.isExisting ? 3 : 2; 

                    await fetch(`${API_URL}/api/purchase-orders/manage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            purchaseOrderId: orderId, sanefId: row.ItemID, magzaenId: row.StoreID,
                            quantity: row.Quantity, unitPrice: row.UnitPrice, inpout: operation
                        })
                    });
                }
            }

            alert(`✅ تم حفظ الإذن رقم ${orderId}`);
            if (!isEditing) {
                setOrderId(prev => prev + 1);
                setRows([]);
                setSupplierName('');
            }
        } catch (e: any) { alert(e.message || 'خطأ'); } 
        finally { setLoading(false); }
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{ margin: 0 }}>📥 {isEditing ? 'تعديل إذن إضافة' : 'تسجيل إذن إضافة'}</h2>
                <p>رقم الإذن: <strong>{orderId}</strong></p>
            </div>

            <div style={cardStyle} className="no-print">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>رقم الفاتورة</label>
                        <input style={inputStyle} type="number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>تاريخ الفاتورة</label>
                        <input style={inputStyle} type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>اسم المورد</label>
                        <input style={inputStyle} type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>تاريخ الإذن</label>
                        <input style={inputStyle} type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                    </div>
                </div>
            </div>

            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>قائمة الأصناف</h3>
                    <button onClick={addRow} style={{...btn, background: '#2563eb'}}>➕ إضافة صنف</button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>الصنف</th><th style={thStyle}>المخزن</th>
                            <th style={thStyle}>الكمية</th><th style={thStyle}>سعر الوحدة</th>
                            <th style={thStyle}>الإجمالي</th><th style={thStyle}>حذف</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.tempId}>
                                <td style={tdStyle}>
                                    <select value={row.ItemID || ''} onChange={e => handleRowChange(row.tempId, 'ItemID', e.target.value)} style={inputStyle}>
                                        <option value="">اختر</option>
                                        {items.map(i => <option key={i['كود الصنف']} value={i['كود الصنف']}>{i['اسم الصنف']}</option>)}
                                    </select>
                                </td>
                                <td style={tdStyle}>
                                    <select value={row.StoreID || ''} onChange={e => handleRowChange(row.tempId, 'StoreID', e.target.value)} style={inputStyle}>
                                        <option value="">اختر المخزن</option>
                                        {stores.map(s => <option key={s['الرقم']} value={s['الرقم']}>{s['اسم المخزن']}</option>)}
                                    </select>
                                </td>
                                <td style={tdStyle}>
                                    <input type="number" value={row.Quantity} onChange={e => handleRowChange(row.tempId, 'Quantity', e.target.value)} style={{...inputStyle, width:'70px'}} />
                                </td>
                                <td style={tdStyle}>
                                    <input type="number" step="0.01" value={row.UnitPrice} onChange={e => handleRowChange(row.tempId, 'UnitPrice', e.target.value)} style={{...inputStyle, width:'100px'}} />
                                </td>
                                <td style={{...tdStyle, fontWeight:'bold', color:'#059669'}}>{row.TotalPrice.toFixed(2)}</td>
                                <td style={tdStyle}>
                                    <button onClick={() => removeRow(row.tempId)} style={{color:'red'}}>X</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ marginTop: '15px', textAlign: 'left', fontWeight: 'bold', fontSize: '18px' }}>
                    الإجمالي الكلي: {grandTotal.toFixed(2)} ج.م
                </div>
            </div>

            <button onClick={handleSave} disabled={loading} style={{...btn, background: '#16a34a', width:'100%', padding:'15px', fontSize:'16px'}}>
                {loading ? 'جاري الحفظ...' : '💾 حفظ الإذن'}
            </button>
        </div>
    );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function StoreInPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحميل صفحة الإضافة...</div>}>
            <StoreInContent />
        </Suspense>
    );
}