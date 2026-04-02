'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function SchoolManagerDashboard() {
    const router = useRouter();
    const { user, work, setWorkData } = useAuthStore();
    
    // البيانات الأساسية
    const schoolId = user?.schoolId || 0;
    const schoolName = user?.schoolName || 'مدرستي';

    // حالات الإحصائيات (نفس نظام اللوحة الأولى)
    const [overviewStats, setOverviewStats] = useState<any>(null);
    const [detailedStats, setDetailedStats] = useState<any>(null);
    const [activeSection, setActiveSection] = useState<number | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);

    // حالات المودال (اختيار المرحلة والعام)
    const [modalOpen, setModalOpen] = useState(false);
    const [years, setYears] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>(work?.yearId?.toString() ?? '');
    const [selectedStage, setSelectedStage] = useState<string>(work?.stageId?.toString() ?? '');
    const [saving, setSaving] = useState(false);

    // === Helper Functions ===
    const getId = (item: any) => {
        if (!item) return 0;
        return item['الرقم'] || item['الرقم '] || Object.values(item).find((v: any) => typeof v === 'number') || 0;
    };

    const getName = (item: any) => {
        if (!item) return '';
        return item['العام الدراسي'] || item['العام الدراسى'] || item['المرحلة'] || item['اسم المرحلة'] || 
               Object.values(item).find((v: any) => typeof v === 'string' && v.length > 1) || 'غير معروف';
    };

    // 1. تحميل البيانات الأولية (الإحصائيات + قوائم السنوات والمراحل)
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!schoolId) return;
            setLoading(true);

            try {
                // جلب الإحصائيات الإجمالية (INPOT 3)
                const resStats = await fetch(`${API_URL}/api/GETTKARERALLSCHOOL/3?id=${schoolId}`);
                const dataStats = await resStats.json();
                if (dataStats.success) setOverviewStats(dataStats.data[0]);

                // جلب السنوات والمراحل للمودال
                const resYears = await fetch(`${API_URL}/api/getData/13`);
                const dataYears = await resYears.json();
                if (dataYears.success) setYears(dataYears.data || []);

                const resStages = await fetch(`${API_URL}/api/getData1/2?id=${schoolId}`);
                const dataStages = await resStages.json();
                if (dataStages.success) setStages(dataStages.data || []);

            } catch (e) {
                console.error("خطأ في تحميل البيانات", e);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [schoolId]);

    // 2. جلب تفاصيل القسم المحدد
    const handleSectionClick = async (inpot: number) => {
        if (!schoolId) return;

        if (activeSection === inpot) {
            setActiveSection(null);
            setDetailedStats(null);
            return;
        }

        setActiveSection(inpot);
        setDetailLoading(true);
        setDetailedStats(null);

        try {
            const res = await fetch(`${API_URL}/api/GETTKARERALLSCHOOL/${inpot}?id=${schoolId}`);
            const data = await res.json();
            if (data.success) setDetailedStats(data.data[0]);
        } catch (e) {
            console.error("خطأ في جلب التفاصيل", e);
        } finally {
            setDetailLoading(false);
        }
    };

    // 3. حفظ إعدادات العمل (المرحلة والعام)
    const handleSaveWorkData = async () => {
        if (!selectedYear || !selectedStage) {
            alert('اختر العام والمرحلة');
            return;
        }
        if (!user?.userId && !user?.personId) {
            alert('UserId غير موجود');
            return;
        }

        setSaving(true);
        try {
            const yearObj = years.find(y => getId(y).toString() === selectedYear);
            const stageObj = stages.find(s => getId(s).toString() === selectedStage);

            const newWork = {
                yearId: parseInt(selectedYear),
                yearName: getName(yearObj),
                stageId: parseInt(selectedStage),
                stageName: getName(stageObj)
            };

            const payload = {
                userId: user.userId || user.personId,
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
            if (result.success) {
                setWorkData(newWork);
                setModalOpen(false);
            } else {
                alert('فشل الحفظ');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // 4. التنقل للصفحات التفصيلية
    const handleNavigation = (path: string, params: Record<string, any> = {}) => {
        const query = new URLSearchParams({
            schoolId: String(schoolId),
            schoolName: schoolName,
            ...params
        }).toString();
        router.push(`${path}?${query}`);
    };

    // تعريف الأقسام
    const sections = [
        { id: 1, title: '👥 الموظفين', icon: 'fa-users' },
        { id: 2, title: '🎓 الطلاب', icon: 'fa-user-graduate' },
        { id: 4, title: '📋 الكنترول', icon: 'fa-clipboard-list' },
        { id: 5, title: '📦 المخازن', icon: 'fa-boxes-stacked' },
        { id: 6, title: '📚 المعلمين', icon: 'fa-chalkboard-user' },
    ];

    if (loading) {
        return <div style={styles.loadingContainer}>جاري تحميل بيانات المدرسة...</div>;
    }

    return (
        <div style={styles.pageContainer}>
            {/* === Header === */}
            <div style={styles.detailHeader}>
                <div>
                    <h1 style={styles.schoolDetailTitle}>🏫 {schoolName}</h1>
                    <p style={styles.subTitle}>لوحة تحكم مدير المدرسة | العام: {work?.yearName || 'غير محدد'} - المرحلة: {work?.stageName || 'غير محدد'}</p>
                </div>
                {/* زر فتح المودال */}
                <button onClick={() => setModalOpen(true)} style={styles.settingsBtn}>
                    🎯 تغيير المرحلة/العام
                </button>
            </div>

            {/* === الإحصائيات الإجمالية === */}
            {overviewStats && (
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={styles.sectionTitle}>📊 نظرة عامة</h2>
                    <div style={styles.gridContainer}>
                        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}} >
                            <h3>👥 الموظفين</h3>
                            <p style={styles.bigNum}>{overviewStats.TotalEmployees || 0}</p>
                        </div>
                        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'}} >
                            <h3>🎓 الطلاب</h3>
                            <p style={styles.bigNum}>{overviewStats.TotalStudents || 0}</p>
                        </div>
                        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}} >
                            <h3>✅ الحضور اليوم</h3>
                            <p style={styles.bigNum}>{overviewStats.PresentStudents || 0}</p>
                        </div>
                        <div style={{...styles.statCard, background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', color: '#831843'}} >
                            <h3>❌ الغياب اليوم</h3>
                            <p style={{...styles.bigNum, color: '#831843'}}>{overviewStats.AbsentStudents || 0}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* === أزرار الأقسام === */}
            <div style={styles.tabsContainer}>
                {sections.map((sec) => (
                    <button
                        key={sec.id}
                        onClick={() => handleSectionClick(sec.id)}
                        style={{
                            ...styles.tabBtn,
                            background: activeSection === sec.id ? '#2563eb' : '#f1f5f9',
                            color: activeSection === sec.id ? 'white' : '#475569'
                        }}
                    >
                        <i className={`fa-solid ${sec.icon}`} style={{ marginLeft: '8px' }}></i>
                        {sec.title}
                    </button>
                ))}
            </div>

            {/* === قسم عرض التفاصيل === */}
            {detailLoading ? (
                <div style={styles.loadingContainer}>جاري تحميل التفاصيل...</div>
            ) : detailedStats && (
                <div style={styles.detailsSection}>
                    
                    {/* 1. الموظفين */}
                    {activeSection === 1 && (
                        <>
                            <h3 style={styles.detailsTitle}>تفاصيل قسم الموظفين</h3>
                            <div style={styles.gridContainer}>
                                <ClickableCard label="الحاضرين" value={detailedStats.PresentEmployees} />
                                <ClickableCard label="الغائبين" value={detailedStats.AbsentEmployees} onClick={() => handleNavigation('/Emples/leave/view-leaves', { status: 'absent' })} color="#ef4444" />
                                <ClickableCard label="إجازات مؤكدة" value={detailedStats.ConfirmedVacation} onClick={() => handleNavigation('/Emples/leave/view-leaves')} />
                                <ClickableCard label="إجازات معلقة" value={detailedStats.PendingVacation} onClick={() => handleNavigation('/Emples/leave/request')} />
                                <ClickableCard label="أذونات تأخير" value={detailedStats.LatePermission} onClick={() => handleNavigation('/Emples/permission/view-permissions')} />
                                <ClickableCard label="أذونات خروج" value={detailedStats.DuringDayPermission} onClick={() => handleNavigation('/Emples/permission/view-permissions')} />
                               <ClickableCard label="أذونات معلقة" value={detailedStats.PendingPermission} onClick={() => handleNavigation('/Emples/permission/request-permission')} />
                              <ClickableCard label="جزاءات منتظرة" value={detailedStats.PendingPenalty} onClick={() => handleNavigation('/Emples/penalty/record-penalty')} color="#ef4444" />
                             <ClickableCard label="جزاءات مؤكدة" value={detailedStats.ConfirmedPenalty} onClick={() => handleNavigation('/Emples/penalty/view-penalties')} color="#ef4444" />
                                <ClickableCard label="التدريبات" value={detailedStats.TrainingCount} onClick={() => handleNavigation('/Emples/training/view-trainings')} />
                            </div>
                        </>
                    )}

                    {/* 2. الطلاب */}
                    {activeSection === 2 && (
                        <>
                            <h3 style={styles.detailsTitle}>تفاصيل شؤون الطلاب</h3>
                            
                            <div style={styles.gridContainer}>
                                <ClickableCard 
                                    label="الحاضرين" 
                                    value={detailedStats.PresentStudents} 
                                />

                                <ClickableCard 
                                    label="الغائبين" 
                                    value={detailedStats.AbsentStudents} 
                                    onClick={() => handleNavigation('/attendance/search/absences', { tab: 1 })} 
                                    color="#ef4444" 
                                />

                                <ClickableCard 
                                    label="غائب بعذر" 
                                    value={detailedStats.AbsentWithExcuse} 
                                    onClick={() => handleNavigation('/attendance/search/absences', { tab: 3 })} 
                                    color="#10b981" 
                                />

                                <ClickableCard 
                                    label="غائب بدون عذر" 
                                    value={detailedStats.AbsentWithoutExcuse} 
                                    onClick={() => handleNavigation('/attendance/search/absences', { tab: 2 })} 
                                    color="#ef4444" 
                                />

                                <ClickableCard 
                                    label="متأخرين" 
                                    value={detailedStats.LateStudents} 
                                    onClick={() => handleNavigation('/attendance/search/absences', { tab: 4 })} 
                                    color="#f59e0b" 
                                />

                                <ClickableCard label="المخالفات" value={detailedStats.ViolationsCount} onClick={() => handleNavigation('/attendance/search/penalties')} color="#ef4444" />
                                <ClickableCard label="الاذونات" value={detailedStats.EzenCount} onClick={() => handleNavigation('/fees/allowances/view')} />
                                <ClickableCard label="الانذارات" value={detailedStats.WarningsCount} onClick={() => handleNavigation('/attendance/search/warnings')} />
                            </div>

                            {/* === تعديل قسم المصروفات === */}
                            <h4 style={styles.subSectionTitle}>المصروفات الحكومية</h4>
                            <div style={styles.gridContainer}>
                                <ClickableCard 
                                    label="مسددين" 
                                    value={detailedStats.GovPaid} 
                                    color="#10b981"
                                    onClick={() => handleNavigation('/fees/expenses/view', { tab: 10 })} 
                                />
                                <ClickableCard 
                                    label="غير مسددين" 
                                    value={detailedStats.GovUnpaid} 
                                    color="#ef4444"
                                    onClick={() => handleNavigation('/fees/expenses/view', { tab: 16 })} 
                                />
                            </div>

                            <h4 style={styles.subSectionTitle}>المصروفات الخاصة</h4>
                            <div style={styles.gridContainer}>
                                <ClickableCard 
                                    label="مسدد كامل" 
                                    value={detailedStats.PrivatePaid} 
                                    color="#10b981"
                                    onClick={() => handleNavigation('/fees/expenses/view', { tab: 11 })} 
                                />
                                <ClickableCard 
                                    label="سدد أقساط" 
                                    value={detailedStats.PrivateInstallments} 
                                    color="#f59e0b"
                                    onClick={() => handleNavigation('/fees/expenses/view', { tab: 14 })} 
                                />
                                <ClickableCard 
                                    label="لم يسدد" 
                                    value={detailedStats.PrivateUnpaid} 
                                    color="#ef4444"
                                    onClick={() => handleNavigation('/fees/expenses/view', { tab: 13 })} 
                                />
                            </div>
                        </>
                    )}

                    {/* 4. الكنترول */}
                    {activeSection === 4 && (
                        <>
                            <h3 style={styles.detailsTitle}>تفاصيل الكنترول والامتحانات</h3>
                            <div style={styles.gridContainer}>
                                <ClickableCard label="إجمالي المواد" value={detailedStats.TotalSubjects} onClick={() => handleNavigation('/system/hikal-dirasaa/subject')} />
                                <ClickableCard label="اللجان" value={detailedStats.TotalCommittees} onClick={() => handleNavigation('/control/teghez/committees')} />
                                <ClickableCard label="امتحانات اليوم" value={detailedStats.ExamsToday} onClick={() => handleNavigation('/control/G-T/exam-schedule')} color="#3b82f6" />
                            </div>
                        </>
                    )}

                    {/* 5. المخازن */}
                    {activeSection === 5 && (
                        <>
                            <h3 style={styles.detailsTitle}>تفاصيل المخازن</h3>
                            <div style={styles.gridContainer}>
                                <ClickableCard label="إجمالي الأصناف" value={detailedStats.TotalItems} onClick={() => handleNavigation('/stores/Magzn/inventory-items')} />
                                <ClickableCard label="نفذ من المخزون" value={detailedStats.LowStockItems} onClick={() => handleNavigation('/stores/report/report-balance', { filter: 'low' })} color="#ef4444" />
                                <ClickableCard label="أذونات إضافة اليوم" value={detailedStats.StoreInPermissions} onClick={() => handleNavigation('/stores/Ezen/store-edit', { type: 'in' })} color="#10b981" />
                                <ClickableCard label="أذونات صرف اليوم" value={detailedStats.StoreOutPermissions} onClick={() => handleNavigation('/stores/Ezen/store-edit', { type: 'out' })} color="#f59e0b" />
                            </div>
                        </>
                    )}

                    {/* 6. المعلمين */}
                    {activeSection === 6 && (
                        <>
                            <h3 style={styles.detailsTitle}>تفاصيل بوابة المعلم</h3>
                            <div style={styles.gridContainer}>
                                <ClickableCard label="الكورسات" value={detailedStats.TotalCourses} onClick={() => handleNavigation('/system/majmueati-kursat/reporets1')} />
                                <ClickableCard label="الواجبات" value={detailedStats.TotalHomeworks} onClick={() => handleNavigation('/dashboard/teachers/homeworks')} />
                                <ClickableCard label="الاختبارات" value={detailedStats.TotalQuizzes} onClick={() => handleNavigation('/dashboard/teachers/quizzes')} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* === المودال (اختيار المرحلة والعام) === */}
            {modalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={{textAlign: 'center', marginBottom: '20px'}}>🎯 اختيار المرحلة والعام</h3>

                        <div style={{marginBottom: '15px'}}>
                            <label style={styles.labelStyle}>العام الدراسي</label>
                            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={styles.selectStyle}>
                                <option value="">-- اختر --</option>
                                {years.map((y, i) => (
                                    <option key={i} value={getId(y)}>{getName(y)}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{marginBottom: '20px'}}>
                            <label style={styles.labelStyle}>المرحلة الدراسية</label>
                            <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} style={styles.selectStyle}>
                                <option value="">-- اختر --</option>
                                {stages.map((s, i) => (
                                    <option key={i} value={getId(s)}>{getName(s)}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleSaveWorkData} style={styles.saveBtn} disabled={saving}>
                                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                            </button>

                            <button onClick={() => setModalOpen(false)} style={styles.cancelBtn}>
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS للتأثيرات */}
            <style jsx>{`
                .clickable-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 15px rgba(0,0,0,0.1);
                    opacity: 0.9;
                }
            `}</style>
        </div>
    );
}

// === مكون كارت قابل للنقر ===
function ClickableCard({ label, value, onClick, color }: { label: string, value: number, onClick?: () => void, color?: string }) {
    return (
        <div 
            style={{
                ...styles.smallCard, 
                borderRightColor: color || '#3b82f6',
                cursor: onClick ? 'pointer' : 'default',
                opacity: onClick ? 1 : 0.7
            }} 
            onClick={onClick}
        >
            {label}
            <p style={{color: color || '#3b82f6', margin: 0, fontWeight: 'bold'}}>{value || 0}</p>
        </div>
    );
}

// === التنسيقات (Styles) ===
const styles = {
    pageContainer: {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        direction: 'rtl' as const,
    },
    loadingContainer: {
        textAlign: 'center' as const,
        marginTop: '50px',
        fontSize: '18px',
        color: '#64748b',
    },
    sectionTitle: {
        marginBottom: '20px',
        color: '#334155',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '10px',
    },
    subSectionTitle: {
        marginTop: '25px',
        marginBottom: '10px',
        color: '#475569',
        fontSize: '16px',
        fontWeight: '600',
        borderRight: '4px solid #94a3b8',
        paddingRight: '10px',
    },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '20px',
    },
    statCard: {
        borderRadius: '16px', padding: '20px', color: 'white',
        boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', textAlign: 'center' as const,
        cursor: 'pointer',
        transition: 'transform 0.2s'
    },
    bigNum: {
        fontSize: '36px', fontWeight: '800', margin: '5px 0',
    },
    detailHeader: {
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: '20px', 
        marginBottom: '30px',
        flexWrap: 'wrap' as const
    },
    schoolDetailTitle: {
        margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: '700',
    },
    subTitle: {
        color: '#64748b',
        margin: '5px 0 0 0',
    },
    settingsBtn: {
        background: '#2563eb',
        color: '#fff',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)'
    },
    tabsContainer: {
        display: 'flex', gap: '10px', flexWrap: 'wrap' as const, marginBottom: '20px',
        padding: '10px', background: '#f8fafc', borderRadius: '12px',
    },
    tabBtn: {
        padding: '10px 20px', borderRadius: '8px', border: 'none',
        fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
        fontSize: '14px',
    },
    detailsSection: {
        marginTop: '20px',
    },
    detailsTitle: {
        marginBottom: '15px', color: '#1e293b',
    },
    smallCard: {
        background: 'white', padding: '15px', borderRadius: '10px',
        borderRight: '4px solid #3b82f6', boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '14px', fontWeight: '500', color: '#475569',
    },
    modalOverlay: {
        position: 'fixed' as const,
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modalContent: {
        background: '#fff',
        padding: '30px',
        borderRadius: '12px',
        width: '400px',
        maxWidth: '90%',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
    },
    selectStyle: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        fontSize: '14px'
    },
    labelStyle: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#475569'
    },
    saveBtn: {
        flex: 1,
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        background: '#10b981',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    cancelBtn: {
        flex: 1,
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        background: '#ef4444',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer'
    }
};