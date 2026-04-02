'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useRouter } from 'next/navigation';

// === السطر السحري لإصلاح مشكلة البناء ===
export const dynamic = 'force-dynamic';

// Interfaces
interface OrderOption { 
    PurchaseOrderID?: number; IssuanceOrderID?: number; 
    PurchaseDate?: string; IssuanceDate?: string; 
    SupplierName?: string; n_ahdea?: string; 
}
interface HeaderData { [key: string]: any; }
interface DetailRow { [key: string]: any; }

// === 1. مكون المحتوى (داخل Suspense) ===
function StoreEditContent() {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();
    const router = useRouter();

    // === منطق قراءة المعرفات (دعم الرابط والمستخدم العادي) ===
    const externalSchoolId = searchParams.get('schoolId');
    const externalSchoolName = searchParams.get('schoolName');
    const targetSchoolId = externalSchoolId || user?.schoolId || 0;
    const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة';

    const [activeTab, setActiveTab] = useState<'add' | 'issue' | 'dist'>('add');
    
    // Data States
    const [ordersList, setOrdersList] = useState<OrderOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [header, setHeader] = useState<HeaderData | null>(null);
    const [details, setDetails] = useState<DetailRow[]>([]);
    
    const [loading, setLoading] = useState(false);
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

    // === Styles (تم تحديثها لتتماشى مع النظام) ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(79, 70, 229, 0.2)' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'all 0.3s' };
    const thStyle: React.CSSProperties = { padding: '12px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'center', fontSize: '13px', color: '#475569', fontWeight: '700' };
    const tdStyle: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontSize: '13px', color: '#334155' };
    const btn: React.CSSProperties = { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'white', transition: '0.2s' };

    // === 1. جلب قائمة الأذونات (Lists) ===
    useEffect(() => {
        if (!targetSchoolId) return;
        
        const fetchList = async () => {
            setSelectedOrderId(null);
            setHeader(null);
            setDetails([]);
            setOrdersList([]);
            
            let inpot = 0;
            if (activeTab === 'add') inpot = 23;       // قائمة أذونات الإضافة
            else if (activeTab === 'issue') inpot = 29; // قائمة أذونات الصرف
            else if (activeTab === 'dist') inpot = 28;  // قائمة اذونات كشوف التوزيع

            try {
                const res = await fetch(`${API_URL}/api/getData1/${inpot}?id=${targetSchoolId}`); // استخدام targetSchoolId
                const json = await res.json();
                if (json.success) setOrdersList(json.data);
            } catch (e) { console.error(e); }
        };
        fetchList();
    }, [activeTab, targetSchoolId]);

    // === 2. جلب تفاصيل الإذن (Details) ===
    useEffect(() => {
        if (!selectedOrderId) { setHeader(null); setDetails([]); return; }

        const fetchDetails = async () => {
            setLoading(true);
            let inpot = 0;
            
            if (activeTab === 'add') {
                inpot = 1;       // تفاصيل إذن إضافة
            } else if (activeTab === 'issue') {
                inpot = 3;       // تفاصيل إذن صرف (عادي)
            } else if (activeTab === 'dist') {
                inpot = 29;      // تفاصيل كشف توزيع
            }

            try {
                // استخدام targetSchoolId في البحث
                const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${targetSchoolId}&sch2=${selectedOrderId}&inpot=${inpot}`);
                const json = await res.json();

                if (json.success) {
                    if (json.data && json.data.length > 0) setHeader(json.data[0]);
                    if (json.data2) setDetails(json.data2);
                    else setDetails([]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [selectedOrderId, activeTab, targetSchoolId]);

    // === 3. الحذف ===
    const handleDelete = async () => {
        if (!selectedOrderId) return;
        if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        try {
            let url = '';
            if (activeTab === 'add') url = `${API_URL}/api/purchase-orders/delete`;
            else url = `${API_URL}/api/issuance-orders/delete`; 

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: selectedOrderId })
            });
            const json = await res.json();
            if (json.success) {
                alert('تم الحذف بنجاح 🗑️');
                setSelectedOrderId(null);
                setOrdersList(prev => prev.filter(o => (o.PurchaseOrderID || o.IssuanceOrderID) !== selectedOrderId));
            } else {
                alert(json.error || 'فشل الحذف');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        }
    };

    // === 4. التعديل ===
    const handleEdit = () => {
        if (!selectedOrderId) return;
        
        // تمرير schoolId في الرابط عند التوجيه للتعديل للحفاظ على السياق
        const schoolParam = externalSchoolId ? `&schoolId=${externalSchoolId}` : '';

        if (activeTab === 'add') {
            router.push(`/stores/Ezen/store-in?editId=${selectedOrderId}${schoolParam}`);
        } else if (activeTab === 'issue') {
            router.push(`/stores/Ezen/store-out?editId=${selectedOrderId}&tab=issuance${schoolParam}`);
        } else if (activeTab === 'dist') {
            router.push(`/stores/Ezen/store-out?editId=${selectedOrderId}&tab=distribution${schoolParam}`);
        }
    };

    const renderOptionLabel = (o: OrderOption) => {
        const id = o.PurchaseOrderID || o.IssuanceOrderID;
        const date = o.PurchaseDate || o.IssuanceDate;
        const name = o.SupplierName || o.n_ahdea;
        return `#${id} - ${date?.split('T')[0]} ${name ? `(${name})` : ''}`;
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
                    <h2 style={{ margin: 0, fontSize: '24px' }}>⚙️ تعديل وحذف الأذونات</h2>
                    <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>
                        إدارة أذونات المخازن لـ: {externalSchoolId ? displaySchoolName : 'المدرسة'}
                    </p>
                </div>
            </div>

            {/* التبويبات */}
            <div style={{ display: 'flex', marginBottom: '25px', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => setActiveTab('add')} style={{...btn, background: activeTab === 'add' ? '#16a34a' : '#e2e8f0', color: activeTab === 'add' ? 'white' : '#475569', minWidth: '150px'}}>
                    📥 أذونات الإضافة
                </button>
                <button onClick={() => setActiveTab('issue')} style={{...btn, background: activeTab === 'issue' ? '#dc2626' : '#e2e8f0', color: activeTab === 'issue' ? 'white' : '#475569', minWidth: '150px'}}>
                    📤 أذونات الصرف
                </button>
                <button onClick={() => setActiveTab('dist')} style={{...btn, background: activeTab === 'dist' ? '#2563eb' : '#e2e8f0', color: activeTab === 'dist' ? 'white' : '#475569', minWidth: '150px'}}>
                    👥 كشوف التوزيع
                </button>
            </div>

            {/* اختيار الإذن */}
            <div style={cardStyle}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#334155', fontSize: '14px' }}>اختر رقم الإذن:</label>
                <select 
                    value={selectedOrderId || ''} 
                    onChange={e => setSelectedOrderId(Number(e.target.value))}
                    style={{ ...inputStyle, maxWidth: '500px' }}
                >
                    <option value="">-- اختر إذن للعرض --</option>
                    {ordersList.map((o, idx) => {
                        const id = o.PurchaseOrderID || o.IssuanceOrderID;
                        return (
                            <option key={id || idx} value={id}>
                                {renderOptionLabel(o)}
                            </option>
                        );
                    })}
                </select>
            </div>

            {/* عرض البيانات */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>جاري تحميل تفاصيل الإذن...</div>
            ) : header && (
                <>
                    {/* الهيدر */}
                    <div style={cardStyle}>
                        <h3 style={{ margin: '0 0 15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#4f46e5' }}>📝 بيانات الإذن</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            {Object.entries(header).map(([key, val]) => (
                                <div key={key} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{key}</label>
                                    <div style={{ fontWeight: 'bold', color: '#334155' }}>{String(val)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* التفاصيل */}
                    {details.length > 0 && (
                        <div style={cardStyle}>
                            <h3 style={{ margin: '0 0 15px', color: '#4f46e5' }}>📦 التفاصيل</h3>
                            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {Object.keys(details[0]).map(h => <th key={h} style={thStyle}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {details.map((row, idx) => (
                                            <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                                {Object.values(row).map((val, i) => <td key={i} style={tdStyle}>{String(val)}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* أزرار الإجراءات */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px', padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <button onClick={handleEdit} style={{ ...btn, background: '#3b82f6', minWidth: '150px' }}>✏️ تعديل الإذن</button>
                        <button onClick={handleDelete} style={{ ...btn, background: '#ef4444', minWidth: '150px' }}>🗑️ حذف الإذن</button>
                    </div>
                </>
            )}
        </div>
    );
}

// === 2. المكون الرئيسي (ال Wrapper مع Suspense) ===
export default function StoreEditPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal', color: '#64748b' }}>جاري التحميل...</div>}>
            <StoreEditContent />
        </Suspense>
    );
}