'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface Store {
    'الرقم': number;
    'اسم المخزن': string;
}

export default function AddStorePage() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId || 0;

    const [storeId, setStoreId] = useState<number>(1);
    const [storeName, setStoreName] = useState<string>('');
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '800px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal' };
    const headerStyle: React.CSSProperties = { marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const formRowStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'flex-end' };
    const inputGroupStyle: React.CSSProperties = { flex: 1 };
    const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };
    const btnStyle: React.CSSProperties = { padding: '9px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
    const thStyle: React.CSSProperties = { padding: '10px', background: '#f3f4f6', borderBottom: '2px solid #e5e7eb', textAlign: 'center' };
    const tdStyle: React.CSSProperties = { padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' };

    // === 1. جلب المخازن ===
    const fetchStores = async () => {
        if (!schoolId) return;
        try {
            // استخدام INPOT 19 للعرض كما طلبت
            const res = await fetch(`${API_URL}/api/getData1/19?id=${schoolId}`);
            const json = await res.json();
            if (json.success) {
                setStores(json.data || []);
            }
        } catch (e) {
            console.error('خطأ في جلب المخازن', e);
        }
    };

    // === 2. جلب الرقم التلقائي ===
    const getNextId = async (): Promise<number> => {
        try {
            // استخدام INPOT 30 لجلب آخر رقم
            const res = await fetch(`${API_URL}/api/getData/52`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                const row = data.data[0];
                const id = row[''] || row['الرقم'] || Object.values(row)[0];
                return Number(id) || 1;
            }
            return 1;
        } catch (err) {
            if (stores.length > 0) {
                return Math.max(...stores.map(item => item['الرقم'] || 0)) + 1;
            }
            return 1;
        }
    };

    useEffect(() => {
        fetchStores();
    }, [schoolId]);

    useEffect(() => {
        const updateId = async () => {
            const nextId = await getNextId();
            setStoreId(nextId);
        };
        updateId();
    }, [stores]);

    // === 3. الحفظ أو التعديل (تم الإصلاح هنا) ===
    const handleSave = async () => {
        if (!storeName.trim()) {
            alert('من فضلك أدخل اسم المخزن');
            return;
        }

        setLoading(true);

        // ✅ التعديل هنا: الحفظ برقم 10 (بدل 52) | التعديل برقم 11 | الحذف برقم 12
        const operation = isEditing ? 11 : 10;

        try {
            const res = await fetch(`${API_URL}/api/saveWithParent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: storeId,          // sch1 -> MagzaenID
                    parentId: schoolId,   // sch2 -> SchoolID
                    name: storeName,      // sch3 -> MagzaenNam
                    operation: operation  // INPOT -> 10 or 11
                })
            });

            const json = await res.json();
            if (json.success) {
                alert(isEditing ? 'تم التعديل بنجاح' : 'تم الحفظ بنجاح');
                setStoreName('');
                setIsEditing(false);
                fetchStores(); 
            } else {
                alert('حدث خطأ أثناء الحفظ');
            }
        } catch (e) {
            console.error(e);
            alert('خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    // === 4. تحضير التعديل ===
    const handleEdit = (store: Store) => {
        setStoreId(store['الرقم']);
        setStoreName(store['اسم المخزن']);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // === 5. الحذف (برقم 12) ===
    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا المخزن؟')) return;

        try {
            const res = await fetch(`${API_URL}/api/saveWithParent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    parentId: schoolId, // يفضل إرساله حتى لو لم يستخدمه الـ SP
                    name: '',
                    operation: 12 // كود الحذف
                })
            });

            const json = await res.json();
            if (json.success) {
                alert('تم الحذف');
                fetchStores();
            } else {
                alert('فشل الحذف');
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{ margin: 0 }}>🗄️ إضافة مخزن جديد</h2>
            </div>

            {/* فورم الإضافة */}
            <div style={cardStyle}>
                <div style={formRowStyle}>
                    <div style={{ ...inputGroupStyle, flex: '0 0 100px' }}>
                        <label style={labelStyle}>رقم المخزن</label>
                        <input 
                            type="number" 
                            value={storeId} 
                            readOnly 
                            style={{ ...inputStyle, background: '#f3f4f6' }} 
                        />
                    </div>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>اسم المخزن</label>
                        <input 
                            type="text" 
                            value={storeName} 
                            onChange={(e) => setStoreName(e.target.value)} 
                            placeholder="مثال: مخزن الأدوات الرياضية" 
                            style={inputStyle} 
                        />
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleSave} disabled={loading} style={btnStyle}>
                        {loading ? 'جاري الحفظ...' : (isEditing ? '💾 تعديل' : '💾 حفظ')}
                    </button>
                    {isEditing && (
                        <button 
                            onClick={() => { setIsEditing(false); setStoreName(''); getNextId().then(setStoreId); }} 
                            style={{ ...btnStyle, background: '#64748b' }}
                        >
                            إلغاء التعديل
                        </button>
                    )}
                </div>
            </div>

            {/* جدول المخازن */}
            <div style={cardStyle}>
                <h3 style={{ marginTop: 0 }}>قائمة المخازن</h3>
                {stores.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#888' }}>لا توجد مخازن مسجلة</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>الرقم</th>
                                <th style={thStyle}>اسم المخزن</th>
                                <th style={thStyle}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stores.map((store) => (
                                <tr key={store['الرقم']}>
                                    <td style={tdStyle}>{store['الرقم']}</td>
                                    <td style={tdStyle}>{store['اسم المخزن']}</td>
                                    <td style={tdStyle}>
                                        <button 
                                            onClick={() => handleEdit(store)} 
                                            style={{ ...btnStyle, padding: '4px 10px', background: '#3b82f6', marginLeft: '5px' }}
                                        >
                                            تعديل
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(store['الرقم'])} 
                                            style={{ ...btnStyle, padding: '4px 10px', background: '#ef4444' }}
                                        >
                                            حذف
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}