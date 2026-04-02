'use client';

import React, { useState, useEffect, CSSProperties, Suspense } from 'react';
import { useAuthStore, WorkData } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import Link from 'next/link';

type StudentStats = {
    MyCoursesCount: number;
    SolvedHomeworks: number;
    PendingPayments: number; // الآن يجمع الكورسات + المصروفات
    AverageGrade: number;
};

// === 1. المكون الداخلي ===
function StudentDashboardContent() {
    const { user, work, setWorkData } = useAuthStore();
    const studentId = user?.personId || user?.userId;
    const schoolId = user?.schoolId;

    const [stats, setStats] = useState<StudentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    // Modal States
    const [modalOpen, setModalOpen] = useState(false);
    const [years, setYears] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState(work?.yearId?.toString() ?? '');
    const [selectedStage, setSelectedStage] = useState(work?.stageId?.toString() ?? '');
    const [saving, setSaving] = useState(false);

    // Helpers
    const getId = (item: any) => item['الرقم'] ?? item.id ?? Object.values(item).find(v => typeof v === 'number');
    const getName = (item: any) => item['العام الدراسي'] ?? item['المرحلة'] ?? item.name ?? Object.values(item).find(v => typeof v === 'string');

    // Effects
    useEffect(() => {
        const timeout = setTimeout(() => setIsAuthChecked(true), 0);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!isAuthChecked || !studentId) return;
        const fetchStats = async () => {
            setLoading(true);
            try {
                // استدعاء الإجراء رقم 7
                const res = await fetch(`${API_URL}/api/GETTKARERALLSCHOOL/7?id=${studentId}`);
                const data = await res.json();
                if (data.success && data.data?.length > 0) setStats(data.data[0]);
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchStats();
    }, [studentId, isAuthChecked]);

    useEffect(() => {
        if (!schoolId) return;
        const fetchData = async () => {
            try {
                const resY = await fetch(`${API_URL}/api/getData/13`);
                const y = await resY.json();
                if (y.success) setYears(y.data || []);

                const resS = await fetch(`${API_URL}/api/getData1/2?id=${schoolId}`);
                const s = await resS.json();
                if (s.success) setStages(s.data || []);
            } catch (e) { console.error(e); }
        };
        fetchData();
    }, [schoolId]);

    const saveWorkData = async () => {
        if (!selectedYear || !selectedStage) { alert('اختر المرحلة والعام'); return; }
        setSaving(true);
        try {
            const yearObj = years.find(y => getId(y).toString() === selectedYear);
            const stageObj = stages.find(s => getId(s).toString() === selectedStage);

            const newWork: WorkData = {
                yearId: parseInt(selectedYear),
                yearName: getName(yearObj),
                stageId: parseInt(selectedStage),
                stageName: getName(stageObj)
            };

            const payload = {
                userId: user?.userId || user?.personId,
                schoolId: schoolId,
                mrahelId: newWork.stageId,
                yerId: newWork.yearId
            };

            const res = await fetch(`${API_URL}/api/save-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!result.success) { alert('فشل الحفظ'); return; }
            setWorkData(newWork);
            setModalOpen(false);
        } catch (e) { console.error(e); alert('خطأ في الاتصال'); } 
        finally { setSaving(false); }
    };

    if (!isAuthChecked || loading) {
        return <div style={styles.loading}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>;
    }

    return (
        <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
            
            {/* Header */}
            <div style={styles.headerStyle}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800' }}>🎓 لوحة تحكم الطالب</h1>
                    <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>مرحباً بك في منظومتك التعليمية</p>
                </div>
                <button onClick={() => setModalOpen(true)} style={styles.settingsBtn}>
                    ⚙️ إعدادات العام الدراسي
                </button>
            </div>

            {/* Stats Grid */}
            <div style={styles.grid}>
                <StatCard title="كورساتي" value={stats?.MyCoursesCount || 0} icon="📚" color="#3b82f6" />
                <StatCard title="الواجبات المحلولة" value={stats?.SolvedHomeworks || 0} icon="📝" color="#10b981" />
                {/* تم تحديث هذا الكارت ليعبر عن المصروفات المعلقة بأنواعها */}
                <StatCard title="التزامات مالية معلقة" value={stats?.PendingPayments || 0} icon="💸" color="#f59e0b" />
                <StatCard title="متوسط الدرجات" value={stats?.AverageGrade || 0} icon="📊" color="#8b5cf6" />
            </div>

            {/* Quick Actions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <QuickLink href="/BABSTUDWNS/lessons-video?tab=video" icon="fa-video" label="مشاهدة فيديو" color="#3b82f6" />
                <QuickLink href="/BABSTUDWNS/lessons-video?tab=audio" icon="fa-headphones" label="استماع صوتي" color="#8b5cf6" />
                <QuickLink href="/BABSTUDWNS/grades" icon="fa-chart-simple" label="درجاتي" color="#10b981" />
                <QuickLink href="/BABSTUDWNS/payments" icon="fa-wallet" label="الحضور و الغياب" color="#f59e0b" />
            </div>

            {/* Modal */}
            {modalOpen && (
                <div style={styles.modalOverlay} onClick={() => setModalOpen(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>تغيير المرحلة والعام الدراسي</h3>
                        <div style={{ marginTop: '20px' }}>
                            <label style={styles.label}>العام الدراسي</label>
                            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={styles.select}>
                                <option value="">اختر...</option>
                                {years.map((y, i) => <option key={i} value={getId(y)}>{getName(y)}</option>)}
                            </select>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <label style={styles.label}>المرحلة</label>
                            <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} style={styles.select}>
                                <option value="">اختر...</option>
                                {stages.map((s, i) => <option key={i} value={getId(s)}>{getName(s)}</option>)}
                            </select>
                        </div>
                        <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                            <button onClick={saveWorkData} disabled={saving} style={styles.saveBtn}>
                                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                            </button>
                            <button onClick={() => setModalOpen(false)} style={styles.cancelBtn}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// === 2. المكونات الفرعية ===

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px', borderRight: `5px solid ${color}` }}>
            <div style={{ fontSize: '32px' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{value}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>{title}</div>
            </div>
        </div>
    );
}

function QuickLink({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
    return (
        <Link href={href} style={{ textDecoration: 'none' }}>
            <div style={{
                background: 'white', padding: '25px', borderRadius: '16px', textAlign: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: '0.2s', cursor: 'pointer', border: '1px solid #f1f5f9'
            }}>
                <div style={{ fontSize: '30px', color: color, marginBottom: '10px' }}>
                    <i className={`fa-solid ${icon}`}></i>
                </div>
                <div style={{ fontWeight: '700', color: '#334155', fontSize: '16px' }}>{label}</div>
            </div>
        </Link>
    );
}

// === 3. التصدير ===
export default function StudentDashboard() {
    return (
        <Suspense fallback={<div style={styles.loading}>جاري تحميل لوحة التحكم...</div>}>
            <StudentDashboardContent />
        </Suspense>
    );
}

// === 4. الأنماط (Styles) ===
const styles: { [key: string]: CSSProperties } = {
    loading: { textAlign: 'center', padding: '80px', color: '#64748b', fontSize: '18px' },
    
    headerStyle: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        borderRadius: '20px', padding: '30px', color: 'white', marginBottom: '30px',
        boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    
    settingsBtn: {
        background: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px 20px', borderRadius: '10px',
        color: 'white', cursor: 'pointer', fontWeight: '600'
    },
    
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px'
    },
    
    modalOverlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)'
    },
    
    modal: {
        background: 'white', padding: '30px', borderRadius: '20px', width: '450px', maxWidth: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
    },
    
    select: {
        width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '15px'
    },
    
    label: {
        display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569'
    },
    
    saveBtn: {
        flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '16px'
    },
    
    cancelBtn: {
        flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '16px'
    }
};