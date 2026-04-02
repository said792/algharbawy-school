'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface InventoryItem {
    'كود الصنف': number;
    'اسم الصنف': string;
    'الوحدة': string;
    'الموجود من واقع الجرد': number;
    'حالة الصنف ': string; // لاحظ المسافة في اسم العمود
    'الرصيد الدفتري': number;
    'الزيادة': number;
    'العجز': number;
    'سعر الوحدة': number;
    'الإجمالي': number;
}

export default function InventoryFormPage() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId || 0;

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [savingIds, setSavingIds] = useState<number[]>([]); // للأصناف اللي بتتsave حالياً

    // === 1. جلب البيانات ===
    const fetchData = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            // هنستخدم التاريخ الحالي أو تاريخ الجرد المحدد
            const res = await fetch(`${API_URL}/api/scher1int1dat?sch=${schoolId}&SCHER2=${date}&inpot=5`);
            const json = await res.json();
            if (json.success && json.data) {
                setItems(json.data);
            } else {
                setItems([]);
            }
        } catch (err) {
            console.error(err);
            alert('خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [schoolId]); // نحدث لما المدرسة تتغير

    // === 2. تعديل البيانات محلياً (Local Update) ===
    const handleLocalChange = (index: number, field: string, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            
            // إعادة حساب الزيادة والعجز تلقائياً
            const actual = field === 'الموجود من واقع الجرد' ? Number(value) : updated[index]['الموجود من واقع الجرد'];
            const book = updated[index]['الرصيد الدفتري'];
            
            if (actual > book) {
                updated[index]['الزيادة'] = actual - book;
                updated[index]['العجز'] = 0;
            } else if (actual < book) {
                updated[index]['الزيادة'] = 0;
                updated[index]['العجز'] = book - actual;
            } else {
                updated[index]['الزيادة'] = 0;
                updated[index]['العجز'] = 0;
            }
            
            return updated;
        });
    };

    // === 3. حفظ التعديلات (Update Item) ===
    const handleSaveItem = async (item: InventoryItem) => {
        setSavingIds(prev => [...prev, item['كود الصنف']]);
        try {
            const res = await fetch(`${API_URL}/api/inventory/update-actual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sanefId: item['كود الصنف'],
                    actualQty: item['الموجود من واقع الجرد'],
                    itemStatus: item['حالة الصنف ']
                })
            });
            const json = await res.json();
            if (json.success) {
                alert(`تم تحديث الصنف: ${item['اسم الصنف']}`);
            } else {
                alert('فشل الحفظ');
            }
        } catch (e) {
            alert('خطأ');
        } finally {
            setSavingIds(prev => prev.filter(id => id !== item['كود الصنف']));
        }
    };

    // Styles
    const containerStyle: React.CSSProperties = {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        direction: 'rtl',
        fontFamily: 'Tajawal',
        background: '#fff'
    };

    const thStyle: React.CSSProperties = {
        padding: '12px', background: '#1e293b', color: 'white', textAlign: 'center', fontSize: '13px', position: 'sticky', top: 0, zIndex: 10
    };

    const tdStyle: React.CSSProperties = {
        padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '14px'
    };

    const inputStyle: React.CSSProperties = {
        width: '80px', padding: '5px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px'
    };

    // لحساب الإجمالي الكلي
    const grandTotal = items.reduce((acc, item) => acc + (item['الإجمالي'] || 0), 0);

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }} className="no-print">
                <h2>📝 نموذج جرد الأصناف</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '5px' }} />
                    <button onClick={fetchData} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>
                        تحميل / تحديث
                    </button>
                    <button onClick={() => window.print()} style={{ background: '#64748b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>
                        🖨️ طباعة
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', maxHeight: '80vh' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>م</th>
                            <th style={thStyle}>كود الصنف</th>
                            <th style={thStyle}>اسم الصنف</th>
                            <th style={thStyle}>الوحدة</th>
                            <th style={thStyle}>الرصيد الدفتري</th>
                            <th style={{...thStyle, background: '#059669'}}>الموجود من واقع الجرد</th>
                            <th style={{...thStyle, background: '#059669'}}>حالة الصنف</th>
                            <th style={{...thStyle, background: '#d97706'}}>الزيادة</th>
                            <th style={{...thStyle, background: '#dc2626'}}>العجز</th>
                            <th style={thStyle}>سعر الوحدة</th>
                            <th style={thStyle}>الإجمالي</th>
                            <th style={thStyle} className="no-print">إجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={12} style={{ textAlign: 'center', padding: '20px' }}>جاري التحميل...</td></tr>
                        ) : (
                            items.map((item, idx) => (
                                <tr key={item['كود الصنف']}>
                                    <td style={tdStyle}>{idx + 1}</td>
                                    <td style={tdStyle}>{item['كود الصنف']}</td>
                                    <td style={{...tdStyle, textAlign: 'right', fontWeight: 'bold'}}>{item['اسم الصنف']}</td>
                                    <td style={tdStyle}>{item['الوحدة']}</td>
                                    <td style={{...tdStyle, fontWeight: 'bold'}}>{item['الرصيد الدفتري']}</td>
                                    
                                    {/* حقول قابلة للتعديل */}
                                    <td style={{...tdStyle, background: '#f0fdf4'}}>
                                        <input 
                                            type="number" 
                                            style={inputStyle}
                                            value={item['الموجود من واقع الجرد']}
                                            onChange={e => handleLocalChange(idx, 'الموجود من واقع الجرد', Number(e.target.value))}
                                        />
                                    </td>
                                    <td style={{...tdStyle, background: '#f0fdf4'}}>
                                        <select 
                                            style={{...inputStyle, width: '100px'}}
                                            value={item['حالة الصنف ']}
                                            onChange={e => handleLocalChange(idx, 'حالة الصنف ', e.target.value)}
                                        >
                                            <option value="جديد">جديد</option>
                                            <option value="جيد">جيد</option>
                                            <option value="متوسط">متوسط</option>
                                            <option value="تالف">تالف</option>
                                        </select>
                                    </td>

                                    {/* نتائج الحساب */}
                                    <td style={{...tdStyle, color: item['الزيادة'] > 0 ? '#d97706' : 'inherit', fontWeight: 'bold'}}>
                                        {item['الزيادة']}
                                    </td>
                                    <td style={{...tdStyle, color: item['العجز'] > 0 ? '#dc2626' : 'inherit', fontWeight: 'bold'}}>
                                        {item['العجز']}
                                    </td>

                                    <td style={tdStyle}>{item['سعر الوحدة']}</td>
                                    <td style={{...tdStyle, fontWeight: 'bold'}}>{item['الإجمالي'].toFixed(2)}</td>
                                    
                                    <td style={tdStyle} className="no-print">
                                        <button 
                                            onClick={() => handleSaveItem(item)}
                                            disabled={savingIds.includes(item['كود الصنف'])}
                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            {savingIds.includes(item['كود الصنف']) ? '...جاري' : 'حفظ'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {/* Footer Total */}
                    <tfoot>
                        <tr style={{ background: '#f1f5f9' }}>
                            <td colSpan={10} style={{...tdStyle, fontWeight: 'bold', textAlign: 'left'}}>الإجمالي الكلي:</td>
                            <td style={{...tdStyle, fontWeight: 'bold', fontSize: '16px'}}>{grandTotal.toFixed(2)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}