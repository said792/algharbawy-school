// app/components/dashboards/ExamDashboard.tsx
'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { useAuthStore, WorkData } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import Link from 'next/link';

type ExamStats = {
    TotalSubjects: number;
    TotalCommittees: number;
    ExamsToday: number;
};

export default function ExamDashboard() {
    // تم إضافة work و setWorkData
    const { user, work, setWorkData } = useAuthStore();
    const schoolId = user?.schoolId;
    
    const [stats, setStats] = useState<ExamStats | null>(null);
    const [loading, setLoading] = useState(true);

    // ===== متغيرات المودال =====
    const [modalOpen, setModalOpen] = useState(false);
    const [years, setYears] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState(work?.yearId?.toString() ?? '');
    const [selectedStage, setSelectedStage] = useState(work?.stageId?.toString() ?? '');
    const [saving, setSaving] = useState(false);

    const getId = (item: any) => item['الرقم'] ?? Object.values(item).find(v => typeof v === 'number');
    const getName = (item: any) => item['العام الدراسي'] ?? item['المرحلة'] ?? Object.values(item).find(v => typeof v === 'string');

    // ===== جلب الإحصائيات (دالة رقم 4) =====
    useEffect(() => {
        const fetchStats = async () => {
            if (!schoolId) return;
            try {
                setLoading(true);
                // استخدام الدالة رقم 4
                const res = await fetch(`${API_URL}/api/GETTKARERALLSCHOOL/4?id=${schoolId}`);
                const data = await res.json();
                
                const resultData = data.data && data.data.length > 0 ? data.data[0] : (data.length > 0 ? data[0] : null);
                if (resultData) {
                    setStats(resultData);
                }
            } catch (e) {
                console.error("Error fetching exam stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [schoolId]);

    // ===== جلب السنوات والمراحل =====
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

    // ===== دالة الحفظ =====
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

    if (loading) return <div style={styles.centerScreen}>جاري تحميل بيانات الكنترول...</div>;
    if (!stats) return <div style={styles.centerScreen}>لا توجد بيانات</div>;

    return (
        <div style={styles.container}>
            <div style={styles.headerRow}>
                <h1 style={styles.header}>📝 لوحة تحكم الكنترول</h1>
                {work && <span style={styles.termBadge}>الفصل: {work.yearName || 'غير محدد'}</span>}
            </div>

            <div style={styles.grid}>
                <Card 
                    title="اختبارات اليوم" 
                    value={stats.ExamsToday} 
                    icon="fa-calendar-day" 
                    color="#2563eb" 
                    bg="#eff6ff"
                />
                <Card 
                    title="إجمالي اللجان" 
                    value={stats.TotalCommittees} 
                    icon="fa-users-rectangle" 
                    color="#ca8a04" 
                    bg="#fefce8"
                />
                <Card 
                    title="إجمالي المواد" 
                    value={stats.TotalSubjects} 
                    icon="fa-book" 
                    color="#16a34a" 
                    bg="#f0fdf4"
                />
            </div>

            {/* إجراءات سريعة */}
            <div style={styles.actionsBox}>
                <h3>🚀 إجراءات سريعة</h3>
                <div style={styles.actionsGrid}>
                    <button
                        onClick={() => setModalOpen(true)}
                        style={{ ...styles.actionBtn, background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', cursor: 'pointer' }}
                    >
                        اختر المرحلة و العام
                    </button>
                    <Link href="/control/results/certificates" style={styles.actionBtn}>طباعة الشهادات</Link>
                </div>
            </div>

            {/* مودال اختيار المرحلة والعام */}
            {modalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h3>تغيير المرحلة والعام</h3>
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={styles.select}>
                            <option value="">اختر العام</option>
                            {years.map((y, i) => <option key={i} value={getId(y)}>{getName(y)}</option>)}
                        </select>
                        <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} style={styles.select}>
                            <option value="">اختر المرحلة</option>
                            {stages.map((s, i) => <option key={i} value={getId(s)}>{getName(s)}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={saveWorkData} style={styles.saveBtn}>
                                {saving ? 'جارى الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => setModalOpen(false)} style={styles.cancelBtn}>
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Card({ title, value, icon, color, bg }: { title: string; value: number; icon: string; color: string; bg: string }) {
    return (
        <div style={{ ...styles.card, background: bg, borderTop: `4px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{title}</h3>
                    <h1 style={{ margin: '10px 0 0', color: color }}>{value || 0}</h1>
                </div>
                <div style={{ ...styles.iconCircle, background: 'white', color: color }}>
                    <i className={`fa-solid ${icon}`}></i>
                </div>
            </div>
        </div>
    );
}

const styles: { [key: string]: CSSProperties } = {
    centerScreen: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#64748b' },
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    header: { margin: 0, color: '#1e293b' },
    termBadge: { background: '#f1f5f9', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', color: '#475569' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },
    card: { padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' },
    iconCircle: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
    
    actionsBox: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    actionsGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    actionBtn: { background: '#f8fafc', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', color: '#334155', fontWeight: '600', border: '1px solid #e2e8f0' },

    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modal: { background: 'white', padding: '20px', borderRadius: '10px', width: '300px', display: 'flex', flexDirection: 'column', gap: '10px' },
    select: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' },
    saveBtn: { flex: 1, background: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' },
    cancelBtn: { flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }
};