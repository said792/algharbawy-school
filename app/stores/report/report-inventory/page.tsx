'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface Store { 'الرقم': number; 'اسم المخزن': string; }
interface MovementRow {
    'نوع الحركة': string;
    'نوع العنصر': string;
    'الكمية': number;
    'التاريخ': string;
    'صنف': string;
    'الرصيد بعد العملية': number;
}

export default function StoreInventoryPage() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId || 0;

    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [rawMovements, setRawMovements] = useState<MovementRow[]>([]);
    const [search, setSearch] = useState('');
    
    const [loading, setLoading] = useState(false);

    // === 1. جلب قائمة المخازن ===
    useEffect(() => {
        const fetchStores = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData1/19?id=${schoolId}`);
                const json = await res.json();
                if (json.success) setStores(json.data);
            } catch (err) { console.error(err); }
        };
        if (schoolId) fetchStores();
    }, [schoolId]);

    // === 2. جلب بيانات الجرد ===
    useEffect(() => {
        const fetchInventory = async () => {
            if (!selectedStoreId) return;
            
            setLoading(true);
            setRawMovements([]);
            
            try {
                // sch1 = MagzaenID, sch2 = SchoolID, inpot = 31
                const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedStoreId}&sch2=${schoolId}&inpot=31`);
                const json = await res.json();

                if (json.success && json.data) {
                    setRawMovements(json.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchInventory();
    }, [selectedStoreId, schoolId]);

    // === 3. معالجة البيانات (Grouping & Filtering) ===
    // تجميع البيانات حسب اسم الصنف
    const groupedData = React.useMemo(() => {
        const groups: { [key: string]: MovementRow[] } = {};
        
        rawMovements.forEach(m => {
            const name = m['صنف'];
            if (!groups[name]) groups[name] = [];
            groups[name].push(m);
        });

        // فلترة حسب البحث
        if (search) {
            const filtered: { [key: string]: MovementRow[] } = {};
            Object.keys(groups).forEach(key => {
                if (key.includes(search)) filtered[key] = groups[key];
            });
            return filtered;
        }
        
        return groups;
    }, [rawMovements, search]);

    // حساب بعض الإحصائيات
    const stats = React.useMemo(() => {
        const itemsCount = Object.keys(groupedData).length;
        const lastDate = rawMovements.length > 0 ? rawMovements[rawMovements.length - 1]['التاريخ'] : null;
        return { itemsCount, lastDate };
    }, [groupedData, rawMovements]);

    // Styles
    const containerStyle: React.CSSProperties = {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        direction: 'rtl',
        fontFamily: 'Tajawal',
        background: '#f1f5f9',
        minHeight: '100vh'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px',
        background: 'white',
        padding: '20px',
        borderRadius: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    };

    const selectStyle: React.CSSProperties = {
        padding: '10px 15px',
        borderRadius: '8px',
        border: '2px solid #cbd5e1',
        fontSize: '16px',
        fontWeight: 'bold',
        minWidth: '250px'
    };

    const inputStyle: React.CSSProperties = {
        padding: '10px 15px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        width: '250px'
    };

    const cardStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
        marginBottom: '20px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
    };

    const thStyle: React.CSSProperties = {
        padding: '12px',
        background: '#f8fafc',
        borderBottom: '2px solid #e2e8f0',
        color: '#475569',
        fontSize: '13px',
        fontWeight: 'bold'
    };

    const tdStyle: React.CSSProperties = {
        padding: '10px',
        borderBottom: '1px solid #f1f5f9',
        fontSize: '14px',
        color: '#334155'
    };

    return (
        <div style={containerStyle}>
            {/* Header Section */}
            <div style={headerStyle} className="no-print">
                <div>
                    <h2 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>📋 جرد المخزن</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select 
                            style={selectStyle} 
                            value={selectedStoreId || ''} 
                            onChange={e => setSelectedStoreId(Number(e.target.value))}
                        >
                            <option value="">اختر المخزن...</option>
                            {stores.map(s => (
                                <option key={s['الرقم']} value={s['الرقم']}>{s['اسم المخزن']}</option>
                            ))}
                        </select>
                        <input 
                            type="text" 
                            placeholder="بحث باسم الصنف..." 
                            style={inputStyle}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            disabled={!selectedStoreId}
                        />
                    </div>
                </div>

                {selectedStoreId && (
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                         <button 
                            onClick={() => window.print()}
                            style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                         >
                             🖨️ طباعة
                         </button>
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            {selectedStoreId && rawMovements.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ background: '#4f46e5', color: 'white', padding: '20px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>عدد الأصناف بال مخزن</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.itemsCount}</div>
                    </div>
                    <div style={{ background: '#10b981', color: 'white', padding: '20px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>اسم المخزن</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                            {stores.find(s => s['الرقم'] === selectedStoreId)?.['اسم المخزن']}
                        </div>
                    </div>
                    <div style={{ background: '#f59e0b', color: 'white', padding: '20px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>آخر حركة</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                            {stats.lastDate ? stats.lastDate.split('T')[0] : '-'}
                        </div>
                    </div>
                </div>
            )}

            {/* Loading & Empty State */}
            {loading && <div style={{ textAlign: 'center', padding: '50px' }}>جاري تحميل بيانات الجرد...</div>}
            
            {!loading && selectedStoreId && rawMovements.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '50px', background: 'white', padding: '40px', borderRadius: '10px' }}>
                    لا توجد حركات مسجلة في هذا المخزن.
                </div>
            )}

            {/* Content - Grouped by Item */}
            {Object.keys(groupedData).map((itemName, idx) => {
                const movements = groupedData[itemName];
                const lastBalance = movements[movements.length - 1]['الرصيد بعد العملية'];
                
                return (
                    <div key={idx} style={cardStyle}>
                        {/* Card Header */}
                        <div style={{ 
                            padding: '15px 20px', 
                            borderBottom: '1px solid #e2e8f0', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <h3 style={{ margin: 0, color: '#1e293b' }}>📦 {itemName}</h3>
                            <span style={{ 
                                background: lastBalance > 0 ? '#dcfce7' : '#fee2e2', 
                                color: lastBalance > 0 ? '#166534' : '#991b1b', 
                                padding: '5px 15px', 
                                borderRadius: '20px', 
                                fontWeight: 'bold' 
                            }}>
                                الرصيد الحالي: {lastBalance}
                            </span>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>التاريخ</th>
                                        <th style={thStyle}>نوع الحركة</th>
                                        <th style={thStyle}>وارد</th>
                                        <th style={thStyle}>منصرف</th>
                                        <th style={thStyle}>الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map((row, i) => {
                                        const isAdd = row['الكمية'] > 0;
                                        return (
                                            <tr key={i}>
                                                <td style={tdStyle}>{row['التاريخ']?.split('T')[0]}</td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        background: isAdd ? '#e0f2fe' : '#fef2f2',
                                                        color: isAdd ? '#0369a1' : '#b91c1c'
                                                    }}>
                                                        {row['نوع الحركة']}
                                                    </span>
                                                </td>
                                                <td style={{...tdStyle, color: '#16a34a', fontWeight: 'bold', textAlign: 'center'}}>
                                                    {isAdd ? `+${row['الكمية']}` : '-'}
                                                </td>
                                                <td style={{...tdStyle, color: '#dc2626', fontWeight: 'bold', textAlign: 'center'}}>
                                                    {!isAdd ? Math.abs(row['الكمية']) : '-'}
                                                </td>
                                                <td style={{...tdStyle, fontWeight: 'bold', background: '#f8fafc'}}>
                                                    {row['الرصيد بعد العملية']}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}