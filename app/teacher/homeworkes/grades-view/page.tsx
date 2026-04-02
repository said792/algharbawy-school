'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function TeacherResultsPage() {
    const { user } = useAuthStore();
    const empId = user?.personId;

    const [type, setType] = useState<'homework' | 'test'>('homework');
    const [items, setItems] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState('');
    const [grades, setGrades] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [loadingGrades, setLoadingGrades] = useState(false);

    // 1. جلب القائمة (الواجبات أو الاختبارات)
    useEffect(() => {
        const fetchItems = async () => {
            setLoadingItems(true);
            setItems([]);
            setSelectedItem('');
            setGrades([]);
            try {
                // نرسل رقم المعلم (empId) لجلب قائمة أعماله
                const res = await fetch(`${API_URL}/api/search/complex?sch1=${empId}&sch2=null&sch3=${type}&inpout=18`);
                const data = await res.json();
                if (data.success) setItems(data.data);
            } catch(e) {} 
            finally { setLoadingItems(false); }
        };
        if (empId) fetchItems();
    }, [type, empId]);

    // 2. جلب الدرجات عند اختيار عنصر
    useEffect(() => {
        if (!selectedItem) return;
        const fetchGrades = async () => {
            setLoadingGrades(true);
            try {
                // ✅ التصحيح: نرسل selectedItem (رقم الواجب/الاختبار) بدلاً من empId
                const res = await fetch(`${API_URL}/api/search/complex?sch1=${selectedItem}&sch2=null&sch3=${type}&inpout=19`);
                const data = await res.json();
                if (data.success) setGrades(data.data);
            } catch(e) {} 
            finally { setLoadingGrades(false); }
        };
        fetchGrades();
    }, [selectedItem, type]);

    // حساب الإحصائيات
    const stats = {
        total: grades.length,
        avg: grades.length > 0 ? Math.round(grades.reduce((sum, g) => sum + g.Score, 0) / grades.length) : 0,
        success: grades.filter(g => g.Status === 'ناجح').length
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>📊 متابعة نتائج الطلاب</h1>

            <div style={styles.controls}>
                <div style={styles.switchGroup}>
                    <button onClick={() => setType('homework')} style={type === 'homework' ? styles.switchActive : styles.switch}>الواجبات</button>
                    <button onClick={() => setType('test')} style={type === 'test' ? styles.switchActive : styles.switch}>الاختبارات</button>
                </div>

                <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={styles.select}>
                    <option value="">اختر {type === 'test' ? 'الاختبار' : 'الواجب'}...</option>
                    {/* ✅ التصحيح: استخدام item.Id بدلاً من item.ID ليتطابق مع SQL */}
                    {items.map(item => <option key={item.Id} value={item.Id}>{item.Title}</option>)}
                </select>
            </div>

            {loadingGrades ? (
                <div style={styles.loading}>جاري تحميل الدرجات...</div>
            ) : grades.length > 0 ? (
                <>
                    {/* كروت الإحصائيات */}
                    <div style={styles.statsGrid}>
                        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                            <span style={styles.statValue}>{stats.total}</span>
                            <span style={styles.statLabel}>عدد الطلاب</span>
                        </div>
                        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
                            <span style={styles.statValue}>{stats.avg}%</span>
                            <span style={styles.statLabel}>المتوسط العام</span>
                        </div>
                        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
                            <span style={styles.statValue}>{stats.success}</span>
                            <span style={styles.statLabel}>عدد الناجحين</span>
                        </div>
                    </div>

                    {/* جدول الدرجات */}
                    <div style={styles.tableCard}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>الطالب</th>
                                    <th style={styles.th}>الدرجة</th>
                                    <th style={styles.th}>الحالة</th>
                                    <th style={styles.th}>التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grades.map((g, i) => (
                                    <tr key={i} style={styles.row}>
                                        <td style={styles.td}>{g.StudentName || g.ArbStudName}</td>
                                        <td style={{...styles.td, fontWeight: '700', color: '#1e293b'}}>
                                            {g.Score} / {g.Total}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                background: g.Status === 'ناجح' ? '#dcfce7' : '#fee2e2',
                                                color: g.Status === 'ناجح' ? '#16a34a' : '#dc2626'
                                            }}>
                                                {g.Status}
                                            </span>
                                        </td>
                                        <td style={{...styles.td, color: '#94a3b8', fontSize: '12px'}}>{g.Date || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                selectedItem === '' && <div style={styles.placeholder}>اختر {type === 'test' ? 'اختبار' : 'واجب'} لعرض النتائج</div>
            )}
        </div>
    );
}

const styles: {[key: string]: React.CSSProperties} = {
    container: { padding: '20px', maxWidth: '1000px', margin: '0 auto' },
    title: { margin: '0 0 30px', color: '#1e293b', fontSize: '24px' },
    controls: { display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    switchGroup: { display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' },
    switch: { padding: '8px 20px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', fontWeight: '600', color: '#64748b' },
    switchActive: { padding: '8px 20px', border: 'none', background: '#1e3c72', color: 'white', cursor: 'pointer', borderRadius: '6px', fontWeight: '600' },
    select: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' },
    
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { padding: '20px', borderRadius: '16px', color: 'white', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    statValue: { display: 'block', fontSize: '32px', fontWeight: '800', marginBottom: '5px' },
    statLabel: { fontSize: '14px', opacity: 0.9 },

    tableCard: { background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'right', padding: '15px', background: '#f8fafc', color: '#475569', fontSize: '13px', fontWeight: '700', borderBottom: '1px solid #e2e8f0' },
    row: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
    td: { padding: '15px', color: '#334155', fontSize: '14px' },
    statusBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
    
    loading: { textAlign: 'center', padding: '40px', color: '#64748b' },
    placeholder: { textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'white', borderRadius: '12px', border: '2px dashed #e2e8f0' }
};