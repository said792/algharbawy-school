// app/components/dashboards/TeacherDashboard.tsx
'use client';

import React, { useState, useEffect, Suspense, CSSProperties } from 'react';
import { useAuthStore, WorkData } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import Link from 'next/link';

// --- Types القديمة ---
type Course = {
  الرقم: number;
  'اسم الكورس': string;
  المادة: string;
  السعر: number;
};

type Enrollment = {
  EnrollmentID: number;
  CourseID: number;
  ArbStudName: string;
  CourseName: string;
  Status: string;
};

type PaymentRecord = {
  الرقم: number;
  'المبلغ المدفوع': number;
  'حالة الدفع': boolean;
};

// --- Types الجديدة للجدول المدرسي ---
type TimetableRow = {
  DayID: number;
  PeriodID: number;
  ClasesID: number;
  EmploeID: number;
  SabgektID: number;
  'اسم الحصة': string;
  'اسم المعلم': string;
  'اسم الفصل': string;
  'اسم المادة': string;
};

// === 1. المكون الداخلي ===
function TeacherDashboardContent() {
  const { user, work, setWorkData } = useAuthStore();
  
  const employeeId = user?.personId ?? 0;
  const schoolId = user?.schoolId || 0;
  
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- States القديمة ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  
  // --- States الجديدة ---
  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  const [periods, setPeriods] = useState<{ id: number; name: string }[]>([]);
  
  // --- Modal States ---
  const [modalOpen, setModalOpen] = useState(false);
  const [years, setYears] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(work?.yearId?.toString() ?? '');
  const [selectedStage, setSelectedStage] = useState(work?.stageId?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  // --- Helpers ---
  const getId = (item: any) => item['الرقم'] ?? item.id ?? Object.values(item).find(v => typeof v === 'number');
  const getName = (item: any) => item['العام الدراسي'] ?? item['المرحلة'] ?? item.name ?? Object.values(item).find(v => typeof v === 'string');
  
  const daysMap: Record<number, string> = { 1: 'الأحد', 2: 'الاثنين', 3: 'الثلاثاء', 4: 'الأربعاء', 5: 'الخميس' };
  
  const getTodayId = () => {
      const jsDay = new Date().getDay(); 
      return jsDay === 0 ? 1 : jsDay + 1; 
  };
  const todayId = getTodayId();

  // --- Effects ---
  
  useEffect(() => {
    const timeout = setTimeout(() => setIsAuthChecked(true), 0);
    return () => clearTimeout(timeout);
  }, [user, work]);

  // جلب كل البيانات (القديمة والجديدة معاً)
  useEffect(() => {
    if (!isAuthChecked || !employeeId) return;
    
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // === البيانات القديمة ===
        const coursesRes = await fetch(`${API_URL}/api/getData1/39?id=${employeeId}`).then(r => r.json());
        if (coursesRes.success) setCourses(coursesRes.data || []);

        const enrollRes = await fetch(`${API_URL}/api/getData1/40?id=${employeeId}`).then(r => r.json());
        if (enrollRes.success && enrollRes.data) {
            const formatted = enrollRes.data.map((e: any) => ({
                EnrollmentID: e['الرقم'], CourseID: e.CourseID, ArbStudName: e['الطالب'], CourseName: e['الكورس'], Status: e['حالة الطالب'] || 'نشط'
            }));
            setEnrollments(formatted);
        }

        const payRes = await fetch(`${API_URL}/api/getData1/41?id=${employeeId}`).then(r => r.json());
        if (payRes.success) setPayments(payRes.data || []);

        // === البيانات الجديدة (الجدول المدرسي) ===
        const res = await fetch(`${API_URL}/api/getData/85`);
        const json = await res.json();
        const data = json.success ? json.data : json.data;
        
        if (data && data.length > 0) {
          const mySchedule = data.filter((row: TimetableRow) => row.EmploeID === employeeId);
          setTimetable(mySchedule);

          const uniquePeriods = [...new Map(mySchedule.map((item: TimetableRow) => [item.PeriodID, { id: item.PeriodID, name: item['اسم الحصة'] }])).values()]
          uniquePeriods.sort((a: any, b: any) => a.id - b.id);
          setPeriods(uniquePeriods as { id: number; name: string }[]); // Fix TS Error
        }

      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };

    fetchAllData();
  }, [employeeId, isAuthChecked]);

  useEffect(() => {
    if (!schoolId) return;
    const fetchDropdowns = async () => {
      try {
        const resY = await fetch(`${API_URL}/api/getData/13`); const y = await resY.json(); if (y.success) setYears(y.data || []);
        const resS = await fetch(`${API_URL}/api/getData1/2?id=${schoolId}`); const s = await resS.json(); if (s.success) setStages(s.data || []);
      } catch (e) { console.error(e); }
    };
    fetchDropdowns();
  }, [schoolId]);

  // --- Calculations ---
  const totalStudents = enrollments.length;
  const totalRevenue = payments.reduce((sum, p) => sum + (p['المبلغ المدفوع'] || 0), 0);
  const todayClasses = timetable.filter(row => row.DayID === todayId);
  const totalPeriodsWeek = timetable.length;

  // --- Handlers ---
  const saveWorkData = async () => {
    if (!selectedYear || !selectedStage) { alert('اختر المرحلة والعام'); return; }
    setSaving(true);
    try {
      const yearObj = years.find(y => getId(y).toString() === selectedYear);
      const stageObj = stages.find(s => getId(s).toString() === selectedStage);
      const newWork: WorkData = { yearId: parseInt(selectedYear), yearName: getName(yearObj), stageId: parseInt(selectedStage), stageName: getName(stageObj) };
      
      await fetch(`${API_URL}/api/save-settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.userId || user?.personId, schoolId: schoolId, mrahelId: newWork.stageId, yerId: newWork.yearId })
      }).then(r => r.json()).then(result => {
        if (!result.success) { alert('فشل الحفظ'); return; }
        setWorkData(newWork); setModalOpen(false);
      });
    } catch (e) { console.error(e); alert('خطأ في الاتصال'); }
    finally { setSaving(false); }
  };

  // --- Styles ---
  const thStyle: React.CSSProperties = { padding: '12px 10px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '13px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' };
  const tdStyle: React.CSSProperties = { padding: '12px 8px', textAlign: 'center', color: '#334155', fontSize: '13px', borderBottom: '1px solid #f1f5f9' };
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' };

  if (!isAuthChecked) return <div style={styles.loading}>جاري التحميل...</div>;

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
        borderRadius: '20px', padding: '30px', color: 'white', marginBottom: '30px',
        boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>👨‍🏫 لوحة تحكم المعلم</h1>
          <p style={{ opacity: 0.9, marginTop: '5px' }}>مرحباً بك، يمكنك إدارة كورساتك ومتابعة طلابك وجدولك من هنا</p>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px 20px', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
          ⚙️ إعدادات العام الدراسي
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>جاري تحميل البيانات...</div>
      ) : (
        <>
          {/* Stats Grid (مزج بين القديم والجديد) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <StatCard title="كورساتي" value={courses.length} icon="📚" color="#3b82f6" />
            <StatCard title="عدد الطلاب الكلي" value={totalStudents} icon="👥" color="#8b5cf6" />
            <StatCard title="إجمالي الإيرادات" value={`${totalRevenue.toLocaleString()} ج.م`} icon="💰" color="#10b981" />
            <StatCard title="حصص اليوم" value={todayClasses.length} icon="📅" color="#f59e0b" />
            <StatCard title="إجمالي حصص الأسبوع" value={totalPeriodsWeek} icon="🗓️" color="#ef4444" />
          </div>

          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            
            {/* الجدول الجديد (جدول المدرسة بدل الكورسات) */}
            <div style={cardStyle}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📅 جدول الحصص الأسبوعي
                </h3>
                <div style={{ fontSize: '13px', color: '#64748b', background: 'white', padding: '4px 10px', borderRadius: 20, border: '1px solid #cbd5e1' }}>
                  اليوم: <strong style={{color: '#059669'}}>{daysMap[todayId]}</strong>
                </div>
              </div>
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {timetable.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <div style={{fontSize: '40px', marginBottom: '10px'}}>📋</div>
                    لم يتم تسجيل جدول حصص لك بعد
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{...thStyle, position: 'sticky', top: 0, zIndex: 1}}>الحصة / اليوم</th>
                        {Object.entries(daysMap).map(([id, name]) => (
                          <th key={id} style={{
                            ...thStyle, position: 'sticky', top: 0, zIndex: 1,
                            color: Number(id) === todayId ? '#059669' : '#475569',
                            background: Number(id) === todayId ? '#ecfdf5' : '#f8fafc',
                            fontWeight: Number(id) === todayId ? '800' : '600'
                          }}>{name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map(p => (
                        <tr key={p.id}>
                          <td style={{...tdStyle, fontWeight: '700', background: '#f8fafc', position: 'sticky', left: 0, zIndex: 1}}>{p.name}</td>
                          {Object.keys(daysMap).map(dayId => {
                            const cell = timetable.find(r => r.DayID === Number(dayId) && r.PeriodID === p.id);
                            const isToday = Number(dayId) === todayId;
                            return (
                              <td key={dayId} style={{
                                ...tdStyle, background: isToday ? '#f0fdf4' : 'white', fontWeight: isToday ? '600' : 'normal',
                                boxShadow: isToday ? 'inset 0 0 0 1px #bbf7d0' : 'none'
                              }}>
                                {cell ? (
                                  <div style={{ lineHeight: '1.5' }}>
                                    <div style={{ fontSize: '13px', color: '#1e293b' }}>{cell['اسم المادة']}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{cell['اسم الفصل']}</div>
                                  </div>
                                ) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* القائمة الجانبية القديمة (الإجراءات السريعة + آخر الإيرادات) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={cardStyle}>
                    <div style={{padding: '20px'}}>
                        <h3 style={{margin:'0 0 15px', color: '#1e293b'}}>🚀 إجراءات سريعة</h3>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                            <Link href="/teacher/report/payments" style={styles.linkBtn}>📚 إدارة كورساتي</Link>
                            <Link href="/teacher/report/absence" style={styles.linkBtn}>👥 عرض الطلاب</Link>
                            <Link href="/teacher/homeworkes/grades-view" style={styles.linkBtn}>📝 متابعة الواجبات</Link>
                        </div>
                    </div>
                </div>

                <div style={cardStyle}>
                     <div style={{padding: '20px'}}>
                        <h3 style={{margin:'0 0 15px', color: '#1e293b'}}>💡 آخر الإيرادات</h3>
                        {payments.slice(0, 3).map((p, i) => (
                            <div key={i} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#475569'}}>
                                <span>دفعة جديدة</span>
                                <span style={{color: '#059669', fontWeight: '700'}}>{p['المبلغ المدفوع']} ج.م</span>
                            </div>
                        ))}
                        {payments.length === 0 && <div style={{color: '#94a3b8', fontSize: '14px'}}>لا توجد إيرادات حديثة</div>}
                     </div>
                </div>
            </div>

          </div>
        </>
      )}

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

// === 2. المكونات والأنماط المساعدة ===

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
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

// === 3. التصدير ===
export default function TeacherDashboard() {
  return (
    <Suspense fallback={<div style={styles.loading}>جاري تحميل لوحة التحكم...</div>}>
      <TeacherDashboardContent />
    </Suspense>
  );
}

const styles: { [key: string]: CSSProperties } = {
  loading: { textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '18px' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' },
  modal: { background: 'white', padding: '30px', borderRadius: '20px', width: '450px', maxWidth: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  select: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '15px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' },
  saveBtn: { flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '16px' },
  cancelBtn: { flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '16px' },
  linkBtn: { 
      display: 'block', padding: '12px 15px', background: '#f8fafc', borderRadius: '10px', textDecoration: 'none', 
      color: '#334155', fontWeight: '600', textAlign: 'center', border: '1px solid #e2e8f0', transition: '0.2s'
  }
};