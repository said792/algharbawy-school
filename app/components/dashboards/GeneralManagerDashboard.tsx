'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';
import { useAuthStore, WorkData } from '@/store/authStore';

// --- الأنواع (Types) ---
type School = { 'الرقم': number; 'المدرسة': string };
type StatData = { [key: string]: number | string };

export default function GeneralManagerDashboard() {
    const router = useRouter();
    const { user, work, setWorkData } = useAuthStore();

    // حالات البيانات الأساسية
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    
    // حالات الإحصائيات
    const [overviewStats, setOverviewStats] = useState<StatData | null>(null);
    const [detailedStats, setDetailedStats] = useState<StatData | null>(null);
    const [activeSection, setActiveSection] = useState<number | null>(null);
    
    // حالات التحميل
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [schoolsLoading, setSchoolsLoading] = useState(true);

    // === حالات إعدادات العام والمرحلة ===
    const [modalOpen, setModalOpen] = useState(false);
    const [years, setYears] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState(work?.yearId?.toString() ?? '');
    const [selectedStage, setSelectedStage] = useState(work?.stageId?.toString() ?? '');
    const [saving, setSaving] = useState(false);

    // === الدوال المساعدة ===
   const getId = (item: any) => item['الرقم'] ?? item.id ?? Object.values(item).find(v => typeof v === 'number');
  const getName = (item: any) => item['العام الدراسي'] ?? item['المرحلة'] ?? item.name ?? Object.values(item).find(v => typeof v === 'string');
  
    // 1. جلب قائمة المدارس
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData/5`);
                const data = await res.json();
                setSchools(data.data || []);
            } catch (e) { console.error("خطأ في جلب المدارس", e); } 
            finally { setSchoolsLoading(false); }
        };
        fetchSchools();
    }, []);

    // 2. جلب السنوات
    useEffect(() => {
        const fetchYears = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData/13`);
                const data = await res.json();
                if (data.success) setYears(data.data || []);
            } catch (e) { console.error(e); }
        };
        fetchYears();
    }, []);

    // 3. جلب المراحل (تم إصلاح الخطأ هنا بإضافة الشرط في البداية)
    useEffect(() => {
        if (!selectedSchool) return; // <--- إصلاح الخطأ: التحقق قبل الاستخدام
        
        const fetchStages = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData1/2?id=${selectedSchool['الرقم']}`);
                const data = await res.json();
                if (data.success) setStages(data.data || []);
            } catch (e) { console.error(e); }
        };
        fetchStages();
    }, [selectedSchool]);

    // جلب الإحصائيات الإجمالية
    const handleSchoolClick = async (school: School) => {
        setSelectedSchool(school);
        setLoading(true);
        setOverviewStats(null);
        setDetailedStats(null);
        setActiveSection(null);
        
        try {
            const res = await fetch(`${API_URL}/api/GETTKARERALLSCHOOL/3?id=${school['الرقم']}`);
            const data = await res.json();
            if (data.success) setOverviewStats(data.data[0]);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // جلب تفاصيل قسم محدد
    const handleSectionClick = async (inpot: number) => {
        if (!selectedSchool) return;
        if (activeSection === inpot) { setActiveSection(null); setDetailedStats(null); return; }

        setActiveSection(inpot);
        setDetailLoading(true);
        setDetailedStats(null);

        try {
            const res = await fetch(`${API_URL}/api/GETTKARERALLSCHOOL/${inpot}?id=${selectedSchool['الرقم']}`);
            const data = await res.json();
            if (data.success) setDetailedStats(data.data[0]);
        } catch (e) { console.error(e); } 
        finally { setDetailLoading(false); }
    };

    // حفظ إعدادات العمل
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
                schoolId: selectedSchool ? selectedSchool['الرقم'] : null,
                mrahelId: newWork.stageId,
                yerId: newWork.yearId
            };
            
            await fetch(`${API_URL}/api/save-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            setWorkData(newWork);
            setModalOpen(false);
        } catch (e) { alert('خطأ في الحفظ'); }
        finally { setSaving(false); }
    };

    const handleNavigation = (path: string, params: Record<string, any> = {}) => {
        if (!selectedSchool) return;
        const query = new URLSearchParams({
            schoolId: String(selectedSchool['الرقم']),
            schoolName: selectedSchool['المدرسة'],
            yearId: selectedYear,
            stageId: selectedStage,
            ...params
        }).toString();
        router.push(`${path}?${query}`);
    };

    // تعريف الأقسام
    const sections = [
        { id: 1, title: 'الموظفين', icon: 'fa-users', color: '#3b82f6' },
        { id: 2, title: 'الطلاب', icon: 'fa-user-graduate', color: '#10b981' },
        { id: 4, title: 'الكنترول', icon: 'fa-clipboard-list', color: '#f59e0b' },
        { id: 5, title: 'المخازن', icon: 'fa-boxes-stacked', color: '#6b7280' },
        { id: 6, title: 'المعلمين', icon: 'fa-chalkboard-user', color: '#8b5cf6' },
    ];

    if (schoolsLoading) return <Loader message="جاري تحميل المدارس..." />;

    if (!selectedSchool) {
        return (
            <div style={styles.page}>
                <div style={styles.headerCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={styles.avatarCircle}>{schools.length}</div>
                        <div>
                            <h1 style={styles.mainTitle}>لوحة تحكم المدير العام</h1>
                            <p style={styles.subTitle}>نظرة شاملة على جميع المدارس التابعة</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {schools.map((school) => (
                        <div key={school['الرقم']} style={styles.schoolCard} onClick={() => handleSchoolClick(school)}>
                            <div style={styles.schoolIconContainer}>
                                <i className="fa-solid fa-school" style={{ fontSize: '24px', color: '#2563eb' }}></i>
                            </div>
                            <h3 style={styles.schoolNameText}>{school['المدرسة']}</h3>
                            <div style={styles.actionBadge}>
                                عرض الإحصائيات <i className="fa-solid fa-arrow-left" style={{ marginRight: '5px' }}></i>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={{...styles.detailHeader, background: 'linear-gradient(135deg, #b91c1c, #dc2626)'}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => setSelectedSchool(null)} style={styles.backBtn}>
                        <i className="fa-solid fa-arrow-right"></i>
                    </button>
                    <div>
                        <h1 style={styles.schoolDetailTitle}>{selectedSchool['المدرسة']}</h1>
                        <p style={styles.subTitleDark}>إحصائيات تفصيلية وتحليل أداء</p>
                    </div>
                </div>
                <button onClick={() => setModalOpen(true)} style={styles.settingsBtn}>
                    <i className="fa-solid fa-gear"></i> إعدادات العمل
                </button>
            </div>

            {/* Stats Overview */}
            {loading ? <Loader message="تحميل الإجماليات..." /> : overviewStats && (
                <div style={styles.statsGrid}>
                    {/* تم استخدام Number() لإصلاح خطأ النوع */}
                    <StatCard 
                        label="الموظفين" 
                        value={Number(overviewStats.TotalEmployees || 0)} 
                        icon="fa-users" color="#3b82f6" 
                        onClick={() => handleNavigation('/Emples/employees/view')} 
                    />
                    <StatCard 
                        label="الطلاب" 
                        value={Number(overviewStats.TotalStudents || 0)} 
                        icon="fa-user-graduate" color="#10b981" 
                        onClick={() => handleNavigation('/students/registration/lists')} 
                    />
                    <StatCard 
                        label="الحضور اليوم" 
                        value={Number(overviewStats.PresentStudents || 0)} 
                        icon="fa-check-circle" color="#8b5cf6" 
                        onClick={() => handleNavigation('/attendance/search/absences', { tab: 1 })} 
                    />
                    <StatCard 
                        label="الغياب اليوم" 
                        value={Number(overviewStats.AbsentStudents || 0)} 
                        icon="fa-times-circle" color="#ef4444" 
                        onClick={() => handleNavigation('/attendance/search/absences', { tab: 2 })} 
                    />
                </div>
            )}

            {/* Tabs */}
            <div style={styles.tabsWrapper}>
                {sections.map((sec) => (
                    <button
                        key={sec.id}
                        onClick={() => handleSectionClick(sec.id)}
                        style={{
                            ...styles.tab,
                            background: activeSection === sec.id ? sec.color : '#fff',
                            color: activeSection === sec.id ? '#fff' : '#475569',
                            border: activeSection === sec.id ? 'none' : '1px solid #e2e8f0'
                        }}
                    >
                        <i className={`fa-solid ${sec.icon}`} style={{ marginLeft: '8px' }}></i>
                        {sec.title}
                    </button>
                ))}
            </div>

            {/* Detailed Stats */}
            {detailLoading ? <Loader message="تحميل التفاصيل..." /> : detailedStats && (
                <div style={styles.detailsGrid}>
                    {/* الموظفين */}
                    {activeSection === 1 && (
                        <>
                            <DetailCard label="الحاضرين" value={Number(detailedStats.PresentEmployees || 0)} />
                            <DetailCard label="الغائبين" value={Number(detailedStats.AbsentEmployees || 0)} color="#ef4444" onClick={() => handleNavigation('/Emples/leave/view-leaves')} />
                            <DetailCard label="إجازات مؤكدة" value={Number(detailedStats.ConfirmedVacation || 0)} onClick={() => handleNavigation('/Emples/leave/view-leaves')} />
                            <DetailCard label="إجازات معلقة" value={Number(detailedStats.PendingVacation || 0)} color="#f59e0b" onClick={() => handleNavigation('/Emples/leave/request')} />
                            <DetailCard 
                                label="أذونات" 
                                value={Number(detailedStats.LatePermission || 0) + Number(detailedStats.DuringDayPermission || 0)} 
                                onClick={() => handleNavigation('/Emples/permission/view-permissions')} 
                            />
                            <DetailCard label="جزاءات" value={Number(detailedStats.ConfirmedPenalty || 0)} color="#ef4444" onClick={() => handleNavigation('/Emples/penalty/view-penalties')} />
                        </>
                    )}

                    {/* الطلاب */}
                    {activeSection === 2 && (
                        <>
                            <DetailCard label="الحاضرين" value={Number(detailedStats.PresentStudents || 0)} />
                            <DetailCard label="الغائبين" value={Number(detailedStats.AbsentStudents || 0)} color="#ef4444" onClick={() => handleNavigation('/attendance/search/absences', { tab: 2 })} />
                            <DetailCard label="غائب بعذر" value={Number(detailedStats.AbsentWithExcuse || 0)} color="#10b981" onClick={() => handleNavigation('/attendance/search/absences', { tab: 3 })} />
                            <DetailCard label="متأخرين" value={Number(detailedStats.LateStudents || 0)} color="#f59e0b" onClick={() => handleNavigation('/attendance/search/absences', { tab: 4 })} />
                            <DetailCard label="المخالفات" value={Number(detailedStats.ViolationsCount || 0)} color="#ef4444" onClick={() => handleNavigation('/attendance/search/penalties')} />
                            <DetailCard label="الانذارات" value={Number(detailedStats.WarningsCount || 0)} onClick={() => handleNavigation('/attendance/search/warnings')} />
                            <DetailCard label="مصروفات حكومية (مسدد)" value={Number(detailedStats.GovPaid || 0)} color="#10b981" onClick={() => handleNavigation('/fees/expenses/view', { tab: 10 })} />
                            <DetailCard label="مصروفات خاصة (مستحق)" value={Number(detailedStats.PrivateUnpaid || 0)} color="#ef4444" onClick={() => handleNavigation('/fees/expenses/view', { tab: 13 })} />
                        </>
                    )}

                    {/* المخازن */}
                    {activeSection === 5 && (
                        <>
                            <DetailCard label="إجمالي الأصناف" value={Number(detailedStats.TotalItems || 0)} onClick={() => handleNavigation('/stores/Magzn/inventory-items')} />
                            <DetailCard label="نفذ من المخزون" value={Number(detailedStats.LowStockItems || 0)} color="#ef4444" onClick={() => handleNavigation('/stores/report/report-balance')} />
                            <DetailCard label="أذونات إضافة" value={Number(detailedStats.StoreInPermissions || 0)} color="#10b981" onClick={() => handleNavigation('/stores/Ezen/store-in')} />
                            <DetailCard label="أذونات صرف" value={Number(detailedStats.StoreOutPermissions || 0)} color="#f59e0b" onClick={() => handleNavigation('/stores/Ezen/store-out')} />
                        </>
                    )}

                    {/* المعلمين */}
                    {activeSection === 6 && (
                        <>
                            <DetailCard label="الكورسات النشطة" value={Number(detailedStats.TotalCourses || 0)} onClick={() => handleNavigation('/system/majmueati-kursat/reporets1')} />
                            <DetailCard label="الواجبات" value={Number(detailedStats.TotalHomeworks || 0)} onClick={() => handleNavigation('/teacher/homeworkes/grades-view')} />
                            <DetailCard label="الاختبارات" value={Number(detailedStats.TotalQuizzes || 0)} onClick={() => handleNavigation('/teacher/homeworkes/grades-view')} />
                        </>
                    )}
                </div>
            )}

            {/* Modal الإعدادات */}
            {modalOpen && (
                <div style={styles.modalOverlay} onClick={() => setModalOpen(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 20px', color: '#1e293b', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            <i className="fa-solid fa-gear" style={{ marginLeft: '10px' }}></i>
                            إعدادات العمل الحالية
                        </h3>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={styles.label}>العام الدراسي</label>
                            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={styles.select}>
                                <option value="">اختر...</option>
                                {years.map((y, i) => <option key={i} value={getId(y)}>{getName(y)}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={styles.label}>المرحلة الدراسية</label>
                            <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} style={styles.select}>
                                <option value="">اختر...</option>
                                {stages.map((s, i) => <option key={i} value={getId(s)}>{getName(s)}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={saveWorkData} disabled={saving} style={styles.saveBtn}>
                                {saving ? 'جاري الحفظ...' : 'حفظ وتفعيل'}
                            </button>
                            <button onClick={() => setModalOpen(false)} style={styles.cancelBtn}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// === المكونات المساعدة ===

function Loader({ message }: { message: string }) {
    return <div style={styles.loading}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i><br/>{message}</div>;
}

function StatCard({ label, value, icon, color, onClick }: { label: string; value: number; icon: string; color: string; onClick?: () => void }) {
    return (
        <div style={{ ...styles.statCardBase, borderRightColor: color, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={styles.statValue}>{value}</div>
                    <div style={styles.statLabel}>{label}</div>
                </div>
                <div style={{ ...styles.statIconBg, background: `${color}15`, color: color }}>
                    <i className={`fa-solid ${icon}`}></i>
                </div>
            </div>
        </div>
    );
}

function DetailCard({ label, value, color, onClick }: { label: string; value: number; color?: string; onClick?: () => void }) {
    return (
        <div style={{ ...styles.detailCardBase, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>{label}</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: color || '#1e293b' }}>{value}</span>
        </div>
    );
}

// === التنسيقات (Styles) ===
const styles: { [key: string]: React.CSSProperties } = {
    page: { padding: '20px', background: '#f8fafc', minHeight: '100vh', direction: 'rtl' },
    loading: { textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '16px' },
    
    headerCard: { marginBottom: '30px', background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    avatarCircle: { width: '60px', height: '60px', background: 'linear-gradient(135deg, #b91c1c, #ef4444)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)' },
    mainTitle: { margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: '800' },
    subTitle: { margin: '5px 0 0', color: '#94a3b8', fontSize: '14px' },
    subTitleDark: { margin: '5px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '14px' },

    schoolCard: { background: 'white', borderRadius: '20px', padding: '25px', cursor: 'pointer', transition: 'all 0.3s', border: '1px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' },
    schoolIconContainer: { width: '50px', height: '50px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' },
    schoolNameText: { margin: '0 0 15px', color: '#334155', fontSize: '18px', fontWeight: '700' },
    actionBadge: { display: 'inline-flex', alignItems: 'center', padding: '8px 16px', background: '#eff6ff', color: '#2563eb', borderRadius: '8px', fontSize: '13px', fontWeight: '600' },

    detailHeader: { padding: '25px 30px', borderRadius: '20px', color: 'white', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px rgba(185, 28, 28, 0.2)' },
    schoolDetailTitle: { margin: 0, fontSize: '22px', fontWeight: '700' },
    backBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', width: '40px', height: '40px', borderRadius: '10px', color: 'white', cursor: 'pointer', fontSize: '16px' },
    settingsBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px 20px', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },

    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' },
    detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' },

    statCardBase: { background: 'white', padding: '20px', borderRadius: '16px', borderRight: '4px solid', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    statValue: { fontSize: '32px', fontWeight: '800', color: '#1e293b' },
    statLabel: { fontSize: '14px', color: '#64748b', marginTop: '5px' },
    statIconBg: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },

    tabsWrapper: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    tab: { padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },

    detailCardBase: { background: 'white', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.03)', transition: 'transform 0.2s' },

    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: 'white', width: '500px', maxWidth: '90%', padding: '30px', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' },
    select: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px' },
    saveBtn: { flex: 1, background: '#1d4ed8', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' },
    cancelBtn: { flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' },
};