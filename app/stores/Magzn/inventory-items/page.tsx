'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === السطر السحري لإصلاح مشكلة البناء ===
export const dynamic = 'force-dynamic';

// Interfaces
interface Store { 'الرقم': number; 'اسم المخزن': string; }
interface Item { 
    'كود الصنف': number; 
    'اسم المخزن': string; 
    'اسم الصنف': string; 
    'الوحدة': string; 
    'الرصيد': number; 
}

// === 1. مكون المحتوى (داخل Suspense) ===
function ItemCodingContent() {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();

    // === منطق قراءة المعرفات (دعم الرابط والمستخدم العادي) ===
    const externalSchoolId = searchParams.get('schoolId');
    const externalSchoolName = searchParams.get('schoolName');
    const targetSchoolId = externalSchoolId || user?.schoolId || 0;
    const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة';

    // States
    const [itemId, setItemId] = useState<number>(1);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [itemName, setItemName] = useState<string>('');
    const [unit, setUnit] = useState<string>('');
    const [balance, setBalance] = useState<string>('0');

    const [stores, setStores] = useState<Store[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    // === التحقق من تسجيل الدخول (تم الإصلاح) ===
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAuthChecked(true);
            if (!user) {
                window.location.href = '/login'; 
            }
        }, 500); // مهلة 500ms

        return () => clearTimeout(timer);
    }, [user]);

    // === 1. قائمة الوحدات ===
    const unitsList = [
        'العدد',
        'المتر',
        'المترمربع',
        'كرتونة',
        'رابطة',
        'كيلو جرام'
    ];

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0f766e, #14b8a6)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(15, 118, 110, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
    const formGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '15px' };
    const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
    const labelStyle: React.CSSProperties = { fontWeight: 'bold', fontSize: '14px', color: '#334155' };
    const inputStyle: React.CSSProperties = { padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', transition: 'all 0.3s', outline: 'none' };
    const btnStyle: React.CSSProperties = { padding: '12px 20px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' };
    const thStyle: React.CSSProperties = { padding: '12px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'center', fontSize: '13px', color: '#475569', fontWeight: '700' };
    const tdStyle: React.CSSProperties = { padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '14px', color: '#334155' };

    // === Data Fetching Logic (استخدام targetSchoolId) ===
    useEffect(() => {
        if (!targetSchoolId) return;
        const fetchStores = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData1/19?id=${targetSchoolId}`);
                const json = await res.json();
                if (json.success) setStores(json.data || []);
            } catch (e) { console.error(e); }
        };
        fetchStores();
    }, [targetSchoolId]);

    const fetchItems = async () => {
        if (!targetSchoolId) return;
        try {
            const res = await fetch(`${API_URL}/api/getData1/20?id=${targetSchoolId}`);
            const json = await res.json();
            if (json.success) setItems(json.data || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchItems();
    }, [targetSchoolId]);

    const getNextId = async (): Promise<number> => {
        try {
            const res = await fetch(`${API_URL}/api/getData/53`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                const row = data.data[0];
                const id = row[''] || row['الرقم'] || Object.values(row)[0];
                return Number(id) || 1;
            }
            return 1;
        } catch (err) {
            if (items.length > 0) return Math.max(...items.map(item => item['كود الصنف'] || 0)) + 1;
            return 1;
        }
    };

    useEffect(() => {
        const updateId = async () => {
            const nextId = await getNextId();
            setItemId(nextId);
        };
        updateId();
    }, [items]);

    // === Save & Edit Logic ===
    const handleSave = async () => {
        if (!itemName.trim() || !selectedStoreId) {
            return alert('من فضلك اختر المخزن وأدخل اسم الصنف');
        }

        setLoading(true);
        const operation = isEditing ? 2 : 1;

        try {
            const res = await fetch(`${API_URL}/api/items/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: itemId,
                    magzaenId: selectedStoreId,
                    schoolId: targetSchoolId, // استخدام targetSchoolId
                    unit: unit,
                    name: itemName,
                    balance: parseFloat(balance) || 0,
                    operation: operation
                })
            });

            const json = await res.json();
            if (json.success) {
                alert(isEditing ? 'تم التعديل بنجاح ✏️' : 'تم الحفظ بنجاح 💾');
                resetForm();
                fetchItems();
            } else {
                alert('حدث خطأ: ' + (json.error || 'غير معروف'));
            }
        } catch (e) {
            console.error(e);
            alert('خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: Item) => {
        setItemId(item['كود الصنف']);
        setItemName(item['اسم الصنف']);
        setUnit(item['الوحدة']);
        setBalance(String(item['الرصيد'] || 0));
        
        const store = stores.find(s => s['اسم المخزن'] === item['اسم المخزن']);
        setSelectedStoreId(store ? store['الرقم'] : null);

        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;

        try {
            const res = await fetch(`${API_URL}/api/items/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    magzaenId: 0, 
                    schoolId: targetSchoolId, // استخدام targetSchoolId
                    unit: '',
                    name: '',
                    balance: 0,
                    operation: 3
                })
            });

            const json = await res.json();
            if (json.success) {
                alert('تم الحذف 🗑️');
                fetchItems();
            } else {
                alert('فشل الحذف');
            }
        } catch (e) { console.error(e); }
    };

    const resetForm = () => {
        setIsEditing(false);
        setItemName('');
        setUnit('');
        setBalance('0');
        setSelectedStoreId(null);
        getNextId().then(setItemId);
    };

    // === فحص الحالة قبل العرض ===
    if (!isAuthChecked) {
        return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal' }}>جاري التحقق من الصلاحيات...</div>;
    }
    if (!user) {
        return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal' }}>جاري تحويلك لصفحة الدخول...</div>;
    }

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '24px' }}>📦 تكويد الأصناف</h2>
                    <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>
                        إدارة أصناف ومخزون: {externalSchoolId ? displaySchoolName : 'المدرسة'}
                    </p>
                </div>
                {/* يمكن إضافة أيقونة أو معلومات إضافية هنا */}
            </div>

            {/* فورم الإضافة */}
            <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
                    {isEditing ? '✏️ تعديل بيانات الصنف' : '➕ إضافة صنف جديد'}
                </h3>
                <div style={formGridStyle}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>رقم الصنف</label>
                        <input type="number" value={itemId} readOnly style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }} />
                    </div>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>المخزن التابع له</label>
                        <select value={selectedStoreId || ''} onChange={e => setSelectedStoreId(Number(e.target.value))} style={inputStyle}>
                            <option value="">اختر المخزن</option>
                            {stores.map(s => <option key={s['الرقم']} value={s['الرقم']}>{s['اسم المخزن']}</option>)}
                        </select>
                    </div>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>اسم الصنف</label>
                        <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="مثال: كرة قدم" style={inputStyle} />
                    </div>
                    
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>الوحدة</label>
                        <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
                            <option value="">اختر الوحدة</option>
                            {unitsList.map((u, idx) => (
                                <option key={idx} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>الرصيد الافتتاحي</label>
                        <input type="number" value={balance} onChange={e => setBalance(e.target.value)} style={inputStyle} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleSave} disabled={loading} style={{ ...btnStyle, background: loading ? '#94a3b8' : (isEditing ? '#eab308' : '#0d9488') }}>
                        {loading ? 'جاري...' : (isEditing ? '💾 تعديل' : '💾 حفظ')}
                    </button>
                    {isEditing && (
                        <button onClick={resetForm} style={{ ...btnStyle, background: '#94a3b8' }}>إلغاء</button>
                    )}
                </div>
            </div>

            {/* جدول الأصناف */}
            <div style={cardStyle}>
                <h3 style={{ margin: 0, color: '#0f766e', marginBottom: '20px' }}>📋 قائمة الأصناف</h3>
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>كود الصنف</th>
                                <th style={thStyle}>المخزن</th>
                                <th style={thStyle}>اسم الصنف</th>
                                <th style={thStyle}>الوحدة</th>
                                <th style={thStyle}>الرصيد</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا توجد أصناف مسجلة</td></tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item['كود الصنف']} style={{ background: items.indexOf(item) % 2 === 0 ? 'white' : '#f8fafc' }}>
                                        <td style={tdStyle}>{item['كود الصنف']}</td>
                                        <td style={tdStyle}>{item['اسم المخزن']}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold', color: '#0f766e' }}>{item['اسم الصنف']}</td>
                                        <td style={tdStyle}>{item['الوحدة']}</td>
                                        <td style={{ ...tdStyle, color: '#0d9488', fontWeight: 'bold' }}>{item['الرصيد']}</td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                <button onClick={() => handleEdit(item)} style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>تعديل</button>
                                                <button onClick={() => handleDelete(item['كود الصنف'])} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>حذف</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// === 2. المكون الرئيسي (ال Wrapper مع Suspense) ===
export default function ItemCodingPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal', color: '#64748b' }}>جاري التحميل...</div>}>
            <ItemCodingContent />
        </Suspense>
    );
}