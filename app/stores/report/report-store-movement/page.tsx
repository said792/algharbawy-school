'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import Link from 'next/link';

// Interfaces
interface Store { 'الرقم': number; 'اسم المخزن': string; }
interface BalanceItem { 'اسم الصنف': string; 'الرصيد': number; }
interface LastOrder { 
    PurchaseOrderID?: number; IssuanceOrderID?: number; 
    PurchaseDate?: string; IssuanceDate?: string; 
    SupplierName?: string; n_ahdea?: string; 
}

export default function StoresDashboard() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId || 0;

    // State
    const [totalStores, setTotalStores] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [totalQuantity, setTotalQuantity] = useState(0);
    const [lowStockItems, setLowStockItems] = useState<BalanceItem[]>([]);
    const [lastPurchases, setLastPurchases] = useState<LastOrder[]>([]);
    const [lastIssuances, setLastIssuances] = useState<LastOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // === 1. جلب البيانات ===
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!schoolId) return;
            setLoading(true);

            try {
                // 1. المخازن
                const resStores = await fetch(`${API_URL}/api/getData1/19?id=${schoolId}`);
                if (resStores.ok) {
                    const json = await resStores.json();
                    if (json.success) setTotalStores(json.data.length);
                }

                // 2. الأصناف
                const resItems = await fetch(`${API_URL}/api/getData1/20?id=${schoolId}`);
                if (resItems.ok) {
                    const json = await resItems.json();
                    if (json.success) setTotalItems(json.data.length);
                }

                // 3. الأرصدة
                const resBalances = await fetch(`${API_URL}/api/getData1/37?id=${schoolId}`);
                if (resBalances.ok) {
                    const json = await resBalances.json();
                    if (json.success && json.data) {
                        const totalQty = json.data.reduce((sum: number, item: any) => sum + (item['الرصيد'] || 0), 0);
                        setTotalQuantity(totalQty);
                        
                        const critical = json.data
                            .filter((item: any) => item['الرصيد'] < 5 && item['الرصيد'] >= 0)
                            .slice(0, 5);
                        setLowStockItems(critical);
                    }
                }

                // 4. آخر الإضافات
                const resPurch = await fetch(`${API_URL}/api/getData1/23?id=${schoolId}`);
                if (resPurch.ok) {
                    const json = await resPurch.json();
                    if (json.success) setLastPurchases(json.data.slice(0, 5));
                }

                // 5. آخر الصرف
                const resIssue = await fetch(`${API_URL}/api/getData1/29?id=${schoolId}`);
                if (resIssue.ok) {
                    const json = await resIssue.json();
                    if (json.success) setLastIssuances(json.data.slice(0, 5));
                }

            } catch (err) {
                console.error("Dashboard Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [schoolId]);

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

    // دالة الألوان (هنا التصحيح)
    const statCardStyle = (color: string): React.CSSProperties => ({
        background: color,
        borderRadius: '15px',
        padding: '20px',
        color: 'white',
        boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
        transition: 'transform 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
    });

    const gridBoxStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '15px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '20px'
    };

    const thStyle: React.CSSProperties = { padding: '10px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center', fontSize: '13px' };
    const tdStyle: React.CSSProperties = { padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '13px' };

    if (loading) return <div style={{textAlign:'center', padding:'50px'}}>جاري تحميل لوحة التحكم...</div>;

    return (
        <div style={containerStyle}>
            <h1 style={{ marginBottom: '30px', color: '#1e293b' }}>📊 لوحة تحكم المخازن</h1>

            {/* === Section 1: Stats Cards === */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                
                {/* Card 1 */}
                <div style={statCardStyle('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')}>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>عدد المخازن</div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{totalStores}</div>
                </div>

                {/* Card 2 */}
                <div style={statCardStyle('linear-gradient(135deg, #f093fb 0%, #f5576c 100%)')}>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>أنواع الأصناف</div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{totalItems}</div>
                </div>

                {/* Card 3 */}
                <div style={statCardStyle('linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)')}>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>إجمالي الكميات</div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{totalQuantity}</div>
                </div>
            </div>

            {/* === Section 2: Quick Actions === */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <Link href="/stores/Ezen/store-in" style={{...gridBoxStyle, textDecoration:'none', color:'#333', background:'#dcfce7'}}>➕ إذن إضافة</Link>
                <Link href="/stores/Ezen/store-out" style={{...gridBoxStyle, textDecoration:'none', color:'#333', background:'#fee2e2'}}>📤 إذن صرف</Link>
                <Link href="/stores/Magzn/items-balance" style={{...gridBoxStyle, textDecoration:'none', color:'#333', background:'#e0f2fe'}}>📦 رصيد الأصناف</Link>
                <Link href="/stores/report/inventory-form" style={{...gridBoxStyle, textDecoration:'none', color:'#333', background:'#fef3c7'}}>📝 نموذج الجرد</Link>
            </div>

            {/* === Section 3: Tables Grid === */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                
                {/* Low Stock Table */}
                <div style={gridBoxStyle}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#dc2626' }}>⚠️ تنبيه نقص الأصناف</h3>
                    <table style={{ width: '100%' }}>
                        <thead><tr><th style={thStyle}>الصنف</th><th style={thStyle}>الرصيد</th></tr></thead>
                        <tbody>
                            {lowStockItems.map((item, i) => (
                                <tr key={i}>
                                    <td style={tdStyle}>{item['اسم الصنف']}</td>
                                    <td style={{...tdStyle, color:'red', fontWeight:'bold'}}>{item['الرصيد']}</td>
                                </tr>
                            ))}
                            {lowStockItems.length === 0 && <tr><td colSpan={2} style={tdStyle}>لا يوجد تنبيهات</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Last Issuances Table */}
                <div style={gridBoxStyle}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#334155' }}>📤 آخر حركات الصرف</h3>
                    <table style={{ width: '100%' }}>
                        <thead><tr><th style={thStyle}>رقم الإذن</th><th style={thStyle}>التاريخ</th><th style={thStyle}>جهة الصرف</th></tr></thead>
                        <tbody>
                            {lastIssuances.map((item, i) => (
                                <tr key={i}>
                                    <td style={tdStyle}>{item.IssuanceOrderID}</td>
                                    <td style={tdStyle}>{item.IssuanceDate?.split('T')[0]}</td>
                                    <td style={tdStyle}>{item.n_ahdea}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Last Purchases Table */}
                <div style={gridBoxStyle}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#334155' }}>📥 آخر حركات الإضافة</h3>
                    <table style={{ width: '100%' }}>
                        <thead><tr><th style={thStyle}>رقم الإذن</th><th style={thStyle}>التاريخ</th><th style={thStyle}>المورد</th></tr></thead>
                        <tbody>
                            {lastPurchases.map((item, i) => (
                                <tr key={i}>
                                    <td style={tdStyle}>{item.PurchaseOrderID}</td>
                                    <td style={tdStyle}>{item.PurchaseDate?.split('T')[0]}</td>
                                    <td style={tdStyle}>{item.SupplierName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}