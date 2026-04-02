// app/components/dashboards/HrDashboard.tsx
'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { useAuthStore, WorkData } from '@/store/authStore'; // تم إضافة WorkData
import { API_URL } from '@/lib/config';
import Link from 'next/link';

export default function HrDashboard() {
    // تم إضافة work و setWorkData
    const { user, work, setWorkData } = useAuthStore();
    const schoolId = user?.schoolId;
    const studentId = user?.personId || user?.userId; // للحفظ

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ===== متغيرات المودال =====
    const [modalOpen, setModalOpen] = useState(false);
    const [years, setYears] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState(work?.yearId?.toString() ?? '');
    const [selectedStage, setSelectedStage] = useState(work?.stageId?.toString() ?? '');
    const [saving, setSaving] = useState(false);

    // دوال مساعدة
    const getId = (item: any) => item['الرقم'] ?? Object.values(item).find(v => typeof v === 'number');
    const getName = (item: any) => item['العام الدراسي'] ?? item['المرحلة'] ?? Object.values(item).find(v => typeof v === 'string');

    // ===== جلب الإحصائيات =====
    useEffect(() => {
        const fetchStats = async () => {
            if (!schoolId) return;
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`${API_URL}/api/GETTKARERALLSCHOOL/1?id=${schoolId}`);
                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`);
                }
                const data = await res.json();
                const resultData = data.data && data.data.length > 0 ? data.data[0] : (data.length > 0 ? data[0] : null);
                if (resultData) {
                    setStats(resultData);
                } else {
                    setStats(null);
                }
            } catch (e: any) {
                console.error("Error fetching HR stats", e);
                setError("فشل تحميل البيانات");
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

    if (loading) return <div style={styles.centerScreen}>جاري تحميل البيانات...</div>;
    if (error) return <div style={styles.centerScreen}>({error}) حاول تحديث الصفحة</div>;
    if (!stats) return <div style={styles.centerScreen}>لا توجد بيانات</div>;

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>👥 لوحة تحكم شئون العاملين</h1>

            {/* === قسم الموظفين والحضور === */}
            <div style={styles.sectionTitle}>إحصائيات الموظفين</div>
            <div style={styles.grid}>
                <Card title="إجمالي الموظفين" value={stats.TotalEmployees} icon="fa-users" color="#3b82f6" />
                <Card title="الحاضرون اليوم" value={stats.PresentEmployees} icon="fa-user-check" color="#10b981" />
                <Card title="الغائبون (إجازة)" value={stats.AbsentEmployees} icon="fa-user-xmark" color="#ef4444" />
            </div>

            {/* === قسم الإجازات === */}
            <div style={styles.sectionTitle}>طلبات الإجازات</div>
            <div style={styles.grid}>
                <Card
                    title="إجازات معلقة"
                    value={stats.PendingVacation || 0}
                    icon="fa-calendar-clock"
                    color="#f59e0b"
                    alert={stats.PendingVacation > 0}
                    link="/Emples/leave/request"
                />
                <Card
                    title="إجازات مؤكدة"
                    value={stats.ConfirmedVacation || 0}
                    icon="fa-calendar-check"
                    color="#22c55e"
                />
            </div>

            {/* === قسم الأذونات === */}
            <div style={styles.sectionTitle}>طلبات الأذونات</div>
            <div style={styles.grid}>
                <Card
                    title="أذونات معلقة"
                    value={stats.PendingPermission || 0}
                    icon="fa-hourglass-half"
                    color="#f97316"
                    alert={stats.PendingPermission > 0}
                    link="/Emples/permission/view-permissions"
                />
                <Card
                    title="أذونات مؤكدة"
                    value={stats.ConfirmedPermission || 0}
                    icon="fa-check-double"
                    color="#0ea5e9"
                />
            </div>

            {/* === قسم الجزاءات والتدريب === */}
            <div style={styles.sectionTitle}>المتابعة والتطوير</div>
            <div style={styles.grid}>
                <Card
                    title="جزاءات معلقة"
                    value={stats.PendingPenalty || 0}
                    icon="fa-gavel"
                    color="#eab308"
                    alert={stats.PendingPenalty > 0}
                />
                <Card
                    title="جزاءات مؤكدة"
                    value={stats.ConfirmedPenalty || 0}
                    icon="fa-scale-balanced"
                    color="#64748b"
                />
                <Card
                    title="التدريبات"
                    value={stats.TrainingCount || 0}
                    icon="fa-chalkboard-user"
                    color="#8b5cf6"
                />
            </div>

            {/* === إجراءات سريعة === */}
            <div style={styles.actionsBox}>
                <h3>🚀 إجراءات سريعة</h3>
                <div style={styles.actionsGrid}>
                    {/* تمت إضافة زر فتح المودال هنا */}
                    <button
                        onClick={() => setModalOpen(true)}
                        style={{ ...styles.actionBtn, background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', cursor: 'pointer' }}
                    >
                        اختر المرحلة و العام
                    </button>
                    <Link href="/Emples/employees/add" style={styles.actionBtn}>إضافة موظف جديد</Link>
                    <Link href="/Emples/leave/view-leaves" style={styles.actionBtn}>مراجعة الإجازات</Link>
                    <Link href="/Emples/report/report-comprehensive" style={styles.actionBtn}>تقرير شامل</Link>
                </div>
            </div>

            {/* ===== المودال ===== */}
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

function Card({ title, value, icon, color, alert, link }: { title: string; value: number; icon: string; color: string; alert?: boolean; link?: string }) {
    return (
        <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{title}</h3>
                    <h2 style={{ margin: '10px 0 0', fontSize: '32px', color: color }}>{value || 0}</h2>
                </div>
                <div style={{ ...styles.iconCircle, background: `${color}20`, color: color }}>
                    <i className={`fa-solid ${icon}`}></i>
                </div>
            </div>

            {link && (
                <div style={{ marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <Link href={link} style={{ fontSize: '13px', color: color, fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        عرض التفاصيل <i className="fa-solid fa-arrow-left"></i>
                    </Link>
                </div>
            )}

            {alert && value > 0 && <span style={styles.alertBadge}>بحاجة لمراجعة</span>}
        </div>
    );
}

const styles: { [key: string]: CSSProperties } = {
    centerScreen: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#64748b', fontSize: '18px' },
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' },
    header: { marginBottom: '20px', color: '#1e293b', fontSize: '24px' },

    sectionTitle: {
        marginTop: '30px',
        marginBottom: '15px',
        color: '#475569',
        fontSize: '18px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '5px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '10px' },
    card: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative', transition: 'transform 0.2s' },
    iconCircle: { width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
    alertBadge: { position: 'absolute', bottom: '10px', left: '10px', fontSize: '11px', background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px' },

    actionsBox: { background: 'white', padding: '20px', borderRadius: '12px', marginTop: '40px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    actionsGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    actionBtn: { background: '#f8fafc', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', color: '#334155', fontWeight: '600', border: '1px solid #e2e8f0' },

    // ستايلات المودال
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modal: { background: 'white', padding: '20px', borderRadius: '10px', width: '300px', display: 'flex', flexDirection: 'column', gap: '10px' },
    select: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' },
    saveBtn: { flex: 1, background: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' },
    cancelBtn: { flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }
};