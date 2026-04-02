'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface Item { 'كود الصنف': number; 'اسم الصنف': string; 'الوحدة': string; }

// التعديل: مطابقة الأسماء اللي راجعة من الـ SQL
interface MovementRow {
    'نوع الحركة': string;   // إضافة / صرف
    'نوع العنصر': string;   // مشتريات / صنف
    'الكمية': number;
    'التاريخ': string;
    'الرصيد بعد العملية': number;
}

export default function ItemMovementPage() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId || 0;

    const [items, setItems] = useState<Item[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [movements, setMovements] = useState<MovementRow[]>([]);
    
    const [loading, setLoading] = useState(false);

    // === 1. جلب قائمة الأصناف ===
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData1/20?id=${schoolId}`);
                const json = await res.json();
                if (json.success) setItems(json.data);
            } catch (err) { console.error(err); }
        };
        if (schoolId) fetchItems();
    }, [schoolId]);

    // === 2. جلب حركة الصنف ===
    useEffect(() => {
        const fetchMovement = async () => {
            if (!selectedItemId) return;
            
            setLoading(true);
            setMovements([]);
            
            try {
                //sch1 = رقم الصنف, sch2 = رقم المدرسة, inpot = 30
                const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedItemId}&sch2=${schoolId}&inpot=30`);
                const json = await res.json();

                if (json.success && json.data) {
                    setMovements(json.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchMovement();
    }, [selectedItemId, schoolId]);

    // Styles
    const containerStyle: React.CSSProperties = {
        padding: '20px',
        maxWidth: '1000px',
        margin: '0 auto',
        direction: 'rtl',
        fontFamily: 'Tajawal',
        background: '#f8fafc',
        minHeight: '100vh'
    };

    const headerCardStyle: React.CSSProperties = {
        background: 'white',
        padding: '20px',
        borderRadius: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
    };

    const selectStyle: React.CSSProperties = {
        padding: '12px 20px',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
        minWidth: '300px',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#334155'
    };

    const balanceDisplayStyle: React.CSSProperties = {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '15px 30px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
        textAlign: 'center'
    };

    const timelineContainerStyle: React.CSSProperties = {
        position: 'relative',
        padding: '20px 0'
    };

    const verticalLineStyle: React.CSSProperties = {
        position: 'absolute',
        right: '50%',
        top: '0',
        bottom: '0',
        width: '4px',
        background: '#e2e8f0',
        transform: 'translateX(50%)',
        borderRadius: '2px'
    };

    const getCardStyle = (type: string): React.CSSProperties => {
        const isAdd = type.includes('إضافة'); // يشوف هل الكلمة فيها 'إضافة'
        return {
            background: 'white',
            padding: '15px 25px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            borderRight: `6px solid ${isAdd ? '#10b981' : '#ef4444'}`,
            marginBottom: '20px',
            width: '45%',
            position: 'relative',
            transition: 'transform 0.2s',
            [isAdd ? 'marginRight' : 'marginLeft']: 'auto',
            [isAdd ? 'marginLeft' : 'marginRight']: '5%',
            textAlign: isAdd ? 'right' : 'left'
        };
    };

    const dotStyle = (type: string): React.CSSProperties => {
        const isAdd = type.includes('إضافة');
        return {
            position: 'absolute',
            top: '20px',
            [isAdd ? 'left' : 'right']: '-18px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: isAdd ? '#10b981' : '#ef4444',
            border: '3px solid white',
            boxShadow: '0 0 0 2px ' + (isAdd ? '#10b981' : '#ef4444')
        };
    };

    return (
        <div style={containerStyle}>
            {/* Header Section */}
            <div style={headerCardStyle}>
                <div>
                    <h2 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>📊 حركة رصيد صنف</h2>
                    <select 
                        style={selectStyle} 
                        value={selectedItemId || ''} 
                        onChange={e => setSelectedItemId(Number(e.target.value))}
                    >
                        <option value="">اختر الصنف لعرض حركته...</option>
                        {items.map(item => (
                            <option key={item['كود الصنف']} value={item['كود الصنف']}>
                                {item['اسم الصنف']}
                            </option>
                        ))}
                    </select>
                </div>

                {movements.length > 0 && (
                    <div style={balanceDisplayStyle}>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>الرصيد الحالي</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                            {/* نعرض آخر رصيد في الجدول */}
                            {movements[movements.length - 1]['الرصيد بعد العملية']}
                        </div>
                    </div>
                )}
            </div>

            {/* Loading & Empty State */}
            {loading && <div style={{ textAlign: 'center', color: '#64748b' }}>جاري تحميل الحركات...</div>}
            
            {!loading && selectedItemId && movements.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '50px' }}>
                    لا توجد حركات مسجلة لهذا الصنف.
                </div>
            )}

            {/* Timeline Section */}
            {movements.length > 0 && (
                <div style={timelineContainerStyle}>
                    <div style={verticalLineStyle}></div>

                    {movements.map((move, index) => {
                        const type = move['نوع الحركة']; // إضافة أو صرف
                        const isAdd = type.includes('إضافة');
                        // الكمية في الـ SQL جاية موجبة للإضافة وسالبة للصرف
                        const qtyDisplay = move['الكمية']; 
                        
                        return (
                            <div 
                                key={index} 
                                style={getCardStyle(type)}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={dotStyle(type)}></div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ 
                                        background: isAdd ? '#dcfce7' : '#fee2e2', 
                                        color: isAdd ? '#166534' : '#991b1b', 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '12px', 
                                        fontWeight: 'bold' 
                                    }}>
                                        {type} {/* نوع الحركة */}
                                    </span>
                                    <span style={{ color: '#64748b', fontSize: '12px' }}>
                                        {move['التاريخ'] ? move['التاريخ'].split('T')[0] : '-'}
                                    </span>
                                </div>

                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '10px 0' }}>
                                    {isAdd ? `+${Math.abs(qtyDisplay)}` : Math.abs(qtyDisplay)}
                                    <span style={{fontSize: '12px', color: '#94a3b8', marginRight: '5px'}}>{move['نوع العنصر']}</span>
                                </div>

                                <div style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>
                                    الرصيد: {move['الرصيد بعد العملية']}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}