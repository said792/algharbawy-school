'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function StudentResultsPage() {
    const { user } = useAuthStore();
    const studentId = user?.personId;
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'Homework' | 'Test'>('all');

    useEffect(() => {
        const fetchResults = async () => {
            if (!studentId) return;
            try {
                // ✅ التصحيح: تم إزالة الحرف الزائد (aapi -> api)
                const res = await fetch(`${API_URL}/api/getData1/1?id=${studentId}`);
                const data = await res.json();
                console.log("Result Data:", data); // لمراجعة البيانات في الـ Console
                if (data.success) setResults(data.data);
            } catch(e) { 
                console.error("Fetch error:", e);
            } 
            finally { setLoading(false); }
        };
        fetchResults();
    }, [studentId]);

    const filtered = results.filter(r => activeTab === 'all' || r.Type === activeTab);

    // حساب الإحصائيات
    const avgScore = results.length > 0 
        ? Math.round((results.reduce((sum, r) => sum + (r.Score / r.Total) * 100, 0) / results.length)) 
        : 0;

    if (loading) return <div style={styles.center}>جاري تحميل نتائجك...</div>;

    return (
        <div style={styles.container}>
         <div style={styles.headerCard}>
                <div>
                    <h1 style={styles.headerTitle}>📊 لوحة النتائج</h1>
                    <p style={styles.headerSub}>تابع تقدمك الدراسي ودرجاتك</p>
                </div>
                <div style={styles.statBox}>
                    <h2 style={{margin: 0, color: '#fff'}}>{avgScore}%</h2>
                    <small style={{color: '#e0e0e0'}}>معدل النجاح العام</small>
                </div>
            </div>

            {/* الفلتر */}
            <div style={styles.tabs}>
                <button onClick={() => setActiveTab('all')} style={activeTab === 'all' ? styles.tabActive : styles.tab}>الكل</button>
                <button onClick={() => setActiveTab('Homework')} style={activeTab === 'Homework' ? styles.tabActive : styles.tab}>واجبات</button>
                <button onClick={() => setActiveTab('Test')} style={activeTab === 'Test' ? styles.tabActive : styles.tab}>اختبارات</button>
            </div>

            {filtered.length === 0 ? (
                <div style={styles.noData}>لا توجد نتائج لعرضها حالياً</div>
            ) : (
                <div style={styles.grid}>
                    {filtered.map((item, idx) => {
                        const percent = Math.round((item.Score / item.Total) * 100);
                        const color = percent >= 50 ? '#10b981' : '#ef4444';
                        const typeColor = item.Type === 'Test' ? '#8b5cf6' : '#3b82f6';
                        const bgGradient = item.Type === 'Test' 
                            ? 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' 
                            : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';

                        return (
                            <div key={idx} style={{...styles.card, background: bgGradient}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                    <span style={{...styles.badge, background: typeColor, color: '#fff'}}>
                                        {item.Type === 'Test' ? 'اختبار' : 'واجب'}
                                    </span>
                                    <span style={{fontSize: '12px', color: '#64748b'}}>{item.CourseName}</span>
                                </div>
                                
                                <h3 style={{margin: '0 0 10px', color: '#1e293b'}}>{item.Title}</h3>
                                
                                <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginTop: '20px'}}>
                                    {/* الدائرة */}
                                    <div style={{
                                        ...styles.circleProgress,
                                        background: `conic-gradient(${color} ${percent}%, #e2e8f0 ${percent}%)`
                                    }}>
                                        <div style={styles.innerCircle}>{percent}%</div>
                                    </div>

                                    <div>
                                        <div style={{fontSize: '24px', fontWeight: '800', color: color}}>
                                            {item.Score} / {item.Total}
                                        </div>
                                        <small style={{color: '#94a3b8'}}>درجة</small>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const styles: {[key: string]: React.CSSProperties} = {
    container: { padding: '20px', maxWidth: '1000px', margin: '0 auto' },
    center: { padding: '50px', textAlign: 'center', color: '#64748b' },
    headerCard: {
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        borderRadius: '20px',
        padding: '30px',
        color: 'white',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 20px rgba(30, 60, 114, 0.3)'
    },
    headerTitle: { margin: 0, fontSize: '28px' },
    headerSub: { margin: '5px 0 0', opacity: 0.8 },
    statBox: { textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px' },
    tabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
    tab: { padding: '10px 20px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#64748b' },
    tabActive: { padding: '10px 20px', border: 'none', background: '#1e3c72', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: 'white' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
    card: {
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s',
        border: '1px solid rgba(255,255,255,0.5)'
    },
    badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
    circleProgress: { width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    innerCircle: { width: '46px', height: '46px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#333' },
    noData: { textAlign: 'center', padding: '40px', color: '#94a3b8', background: 'white', borderRadius: '12px' }
};