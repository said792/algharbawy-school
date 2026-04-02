'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === السطر السحري لإصلاح مشكلة البناء ===
export const dynamic = 'force-dynamic';

// === 1. مكون المحتوى (داخل Suspense) ===
function ItemsBalanceContent() {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();

    // === منطق قراءة المعرفات (دعم الرابط والمستخدم العادي) ===
    const externalSchoolId = searchParams.get('schoolId');
    const externalSchoolName = searchParams.get('schoolName');
    const targetSchoolId = externalSchoolId || user?.schoolId || 0;
    const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة';

    const [items, setItems] = useState<any[]>([]); 
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    // === التحقق من تسجيل الدخول (تم الإصلاح) ===
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAuthChecked(true);
            if (!user) {
                window.location.href = '/login'; 
            }
        }, 500); 

        return () => clearTimeout(timer);
    }, [user]);

    // === 1. ألوان قوية ومتناسقة ===
    const cardColors = [
        'linear-gradient(135deg, #6e00ff 0%, #00d4ff 100%)',
        'linear-gradient(135deg, #ff0055 0%, #ff7e5f 100%)',
        'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
        'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
        'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
        'linear-gradient(135deg, #02aab0 0%, #00cdac 100%)',
        'linear-gradient(135deg, #d31027 0%, #ea384d 100%)',
        'linear-gradient(135deg, #0052D4 0%, #65C7F7 100%)',
    ];

    const getColorByName = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % cardColors.length;
        return cardColors[index];
    };

    // === جلب البيانات ===
    useEffect(() => {
        const fetchItems = async () => {
            if (!targetSchoolId) return;
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/getData1/37?id=${targetSchoolId}`);
                const json = await res.json();
                if (json.success && json.data) {
                    setItems(json.data);
                }
            } catch (err) {
                console.error('Error fetching items:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [targetSchoolId]);

    const filteredItems = items.filter(item =>
        item['اسم الصنف']?.includes(search) ||
        item['كود الصنف']?.toString().includes(search)
    );

    // === Styles ===
    const containerStyle: React.CSSProperties = {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        direction: 'rtl',
        fontFamily: 'Tajawal',
        background: '#f0f2f5',
        minHeight: '100vh'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px',
        padding: '0 10px'
    };

    const searchStyle: React.CSSProperties = {
        padding: '15px 25px',
        borderRadius: '50px',
        border: 'none',
        width: '300px',
        fontSize: '16px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        outline: 'none'
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '25px'
    };

    const cardStyle = (color: string): React.CSSProperties => ({
        background: color,
        borderRadius: '20px',
        padding: '25px',
        color: 'white',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.1)',
        transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
        position: 'relative',
        overflow: 'hidden',
        height: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
    });

    const cardTitleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '15px',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        zIndex: 1
    };

    const balanceContainerStyle: React.CSSProperties = {
        textAlign: 'center',
        zIndex: 1
    };

    const balanceTextStyle: React.CSSProperties = {
        fontSize: '42px',
        fontWeight: '900',
        lineHeight: 1,
        textShadow: '0 4px 8px rgba(0,0,0,0.3)',
        marginBottom: '5px'
    };

    const unitStyle: React.CSSProperties = {
        fontSize: '14px',
        background: 'rgba(255,255,255,0.25)',
        padding: '4px 12px',
        borderRadius: '20px',
        display: 'inline-block',
        backdropFilter: 'blur(5px)',
        fontWeight: 'bold'
    };

    const footerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        opacity: 0.9,
        borderTop: '1px solid rgba(255,255,255,0.2)',
        paddingTop: '10px',
        zIndex: 1
    };

    const iconStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '-20px',
        left: '-20px',
        fontSize: '120px',
        opacity: 0.1,
        transform: 'rotate(-20deg)'
    };

    if (!isAuthChecked) {
        return <div style={{ textAlign: 'center', padding: 50, direction: 'rtl', fontFamily: 'Tajawal' }}>جاري التحقق من الصلاحيات...</div>;
    }
    if (!user) {
        return <div style={{ textAlign: 'center', padding: 50, direction: 'rtl', fontFamily: 'Tajawal' }}>جاري تحويلك لصفحة الدخول...</div>;
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b', fontSize: '28px' }}>📦 رصيد الأصناف</h1>
                    <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>
                        عرض المخزون الحالي لـ: {externalSchoolId ? displaySchoolName : 'المدرسة'}
                    </p>
                </div>
                <input
                    type="text"
                    placeholder="🔍 بحث باسم الصنف أو الكود..."
                    style={searchStyle}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', fontSize: '18px' }}>جاري تحميل بيانات المخزون...</div>
            ) : (
                <div style={gridStyle}>
                    {filteredItems.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', fontSize: '18px', padding: '40px', background: 'white', borderRadius: '16px' }}>
                            لا توجد بيانات رصيد متاحة
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => (
                            <div
                                key={item['كود الصنف'] || idx}
                                style={cardStyle(getColorByName(item['اسم الصنف']))}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.25)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
                                }}
                            >
                                <div style={iconStyle}>📦</div>

                                <div style={cardTitleStyle}>{item['اسم الصنف']}</div>

                                <div style={balanceContainerStyle}>
                                    {/* ✅ التعديل هنا: تم تغيير 'الرصيد' إلى 'الرصيد المتاح' */}
                                    <div style={balanceTextStyle}>{item['الرصيد المتاح']}</div>
                                    <div style={unitStyle}>{item['الوحدة']}</div>
                                </div>

                                <div style={footerStyle}>
                                    <span>كود: {item['كود الصنف']}</span>
                                    {/* ملاحظة: اسم المخزن لا يظهر لأن الـ SQL لا يرجعه، إذا أردت إظهاره يجب تعديل الـ SQL */}
                                    {item['اسم المخزن'] && <span>{item['اسم المخزن']}</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default function ItemsBalancePage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 50, direction: 'rtl', fontFamily: 'Tajawal', color: '#64748b' }}>جاري التحميل...</div>}>
            <ItemsBalanceContent />
        </Suspense>
    );
}