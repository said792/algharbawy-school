'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// إجبار الصفحة أن تكون ديناميكية
export const dynamic = 'force-dynamic';

// --- Types ---
type Course = {
  الرقم: number;
  SubjectID: number;
  EmploeID: number;
  السنتر: string;
  المادة: string;
  المحاضر: string;
  "اسم الكورس": string;
  السعر: number;
  "عدد الحصص": number;
};

type ScheduleItem = {
    ScheduleID: number;
    CourseID: number;
    CourseName?: string; 
    DayOfWeek: string;
    StartTime: string;
    EndTime: string;
};

// === 1. المكون الداخلي ===
function TeacherCoursesManagementContent() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  
  // معرف الموظف الحالي
  const employeeId = user?.personId ?? 0; 

  // حالة التحقق من الدخول
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // --- Shared States ---
  const [activeTab, setActiveTab] = useState('courses');
  
  // --- Courses States ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // --- Courses Modal ---
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [courseForm, setCourseForm] = useState({ id: 0, name: '', price: '', sessions: '', subjectId: '', employeeId: '' });
  const [courseLoading, setCourseLoading] = useState(false);

  // --- Schedules States ---
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  // تم إضافة 'add' للـ Mode
  const [scheduleModalMode, setScheduleModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [scheduleForm, setScheduleForm] = useState({ id: 0, courseId: '', day: '', start: '', end: '' });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // --- Effects ---
  
  // 0. التحقق من تسجيل الدخول
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAuthChecked(true);
      if (!user || !work) {
        window.location.href = '/login';
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [user, work]);

  // 1. تحميل البيانات الأولية
  useEffect(() => {
    if (!isAuthChecked) return;
    if (!schoolId || !employeeId) return;
    fetchCourses();
    fetchDropdowns();
    fetchSchedules();
  }, [schoolId, employeeId, isAuthChecked]);

  // --- Fetch Functions ---
  
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await fetch(`${API_URL}/api/getData1/39?id=${employeeId}`);
      const data = await res.json();
      if (data.success) setCourses(data.data || []);
      else setCourses([]);
    } catch (e) { console.error(e); setCourses([]); } 
    finally { setLoadingCourses(false); }
  };

  const fetchDropdowns = async () => {
    try {
        const resSub = await fetch(`${API_URL}/api/getData/35`);
        const jsonSub = await resSub.json();
        if (jsonSub.success) setSubjects(jsonSub.data || []);

        // جلب قائمة الموظفين لاختيار المحاضر (اختياري)
        const resEmp = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
        const jsonEmp = await resEmp.json();
        if (jsonEmp.success) setEmployees(jsonEmp.data || []);
    } catch(e) { console.error(e); }
  };

    const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
        const res = await fetch(`${API_URL}/api/getData1/42?id=${employeeId}`); 
        const data = await res.json();
        
        if (data.success && data.data) {
            // تعديل أسماء الحقول لتطابق الـ TypeScript Type
            const formatted = data.data.map((s: any) => ({
                ScheduleID: s['الرقم'],
                CourseID: s.CourseID, // هذا الاسم إنجليزي في SQL لذا فهو صحيح
                CourseName: s['اسم الكورس'],
                DayOfWeek: s['اليوم'],      // تحويل من "اليوم" إلى DayOfWeek
                StartTime: s['من'],         // تحويل من "من" إلى StartTime
                EndTime: s['إلى']           // تحويل من "إلى" إلى EndTime
            }));
            setSchedules(formatted);
        } else {
            setSchedules([]);
        }
    } catch (e) { 
        console.error(e); 
        setSchedules([]); 
    }
    finally { setLoadingSchedules(false); }
  };

  // --- Course Handlers ---
  const openCourseModal = (mode: 'add' | 'edit' | 'delete', item?: Course) => {
    setCourseModalMode(mode);
    if (mode === 'add') {
        // تعيين المحاضر الافتراضي كالموظف الحالي
        setCourseForm({ id: 0, name: '', price: '', sessions: '', subjectId: '', employeeId: String(employeeId) });
    } else if (item) {
        setCourseForm({
            id: item['الرقم'],
            name: item['اسم الكورس'],
            price: String(item['السعر']),
            sessions: String(item['عدد الحصص']),
            subjectId: String(item.SubjectID || ''),
            employeeId: String(item.EmploeID || '')
        });
    }
    setIsCourseModalOpen(true);
  };

  const handleCourseSubmit = async () => {
      setCourseLoading(true);
      try {
          const processType = courseModalMode === 'add' ? 1 : courseModalMode === 'edit' ? 2 : 3;
          const body: any = { courseId: courseForm.id, schoolId: schoolId, processType };

          if (courseModalMode !== 'delete') {
              if(!courseForm.name || !courseForm.subjectId) { alert('البيانات ناقصة'); setCourseLoading(false); return; }
              body.courseName = courseForm.name;
              body.price = parseFloat(courseForm.price);
              body.sessions = parseInt(courseForm.sessions);
              body.subjectId = Number(courseForm.subjectId);
              body.employeeId = Number(courseForm.employeeId);
          }

          const res = await fetch(`${API_URL}/api/courses`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
          });
          const data = await res.json();
          if(data.success) {
              setIsCourseModalOpen(false);
              fetchCourses();
              alert(courseModalMode === 'delete' ? 'تم الحذف' : 'تم الحفظ');
          } else { alert(data.error || 'خطأ'); }
      } catch(e) { alert('فشل الاتصال'); }
      finally { setCourseLoading(false); }
  };

  // --- Schedule Handlers ---
   const openScheduleModal = (mode: 'add' | 'edit' | 'delete', item?: ScheduleItem) => {
    setScheduleModalMode(mode);
    if (mode === 'add') {
        setScheduleForm({ id: 0, courseId: '', day: '', start: '', end: '' });
    } else if (item) {
        setScheduleForm({
            id: item.ScheduleID,
            courseId: String(item.CourseID),
            day: item.DayOfWeek,
            // التعامل مع الوقت بشكل آمن
            start: item.StartTime?.includes('T') ? item.StartTime.substring(11, 16) : item.StartTime || '',
            end: item.EndTime?.includes('T') ? item.EndTime.substring(11, 16) : item.EndTime || ''
        });
    }
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async () => {
      setScheduleLoading(true);
      try {
          // 1: اضافة, 2: تعديل, 3: حذف
          const processType = scheduleModalMode === 'add' ? 1 : scheduleModalMode === 'edit' ? 2 : 3;
          
          const body: any = {
              sch1: scheduleForm.id, // الرقم (0 للإضافة)
              sch2: schoolId,
              sch3: Number(scheduleForm.courseId),
              sch4: scheduleForm.day,
              sch5: scheduleForm.start,
              sch6: scheduleForm.end,
              INPOT: processType
          };

          const res = await fetch(`${API_URL}/api/courseSchedule`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
          });
          const data = await res.json();
          if(data.success) {
              setIsScheduleModalOpen(false);
              fetchSchedules();
              alert('تمت العملية بنجاح');
          } else { alert(data.error || 'خطأ'); }
      } catch(e) { alert('فشل الاتصال'); }
      finally { setScheduleLoading(false); }
  };

  // Protection Checks
  if (!isAuthChecked) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>;
  }

  if (!user || !work) {
     return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحويلك لصفحة الدخول...</div>;
  }

  // Tabs Config
  const tabs = [
    { id: 'courses', label: 'الكورسات', icon: 'fa-chalkboard-user' },
    { id: 'schedules', label: 'المواعيد', icon: 'fa-calendar-days' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>إدارة كورساتي ومواعيدي</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>التحكم الكامل في بياناتك</p>
        </div>
        
        {/* زر الإضافة يتغير حسب التبويب */}
        {activeTab === 'courses' && (
            <div style={addBtnStyle} onClick={() => openCourseModal('add')}>
                <i className="fa-solid fa-plus" style={{ marginLeft: '8px' }}></i> إضافة كورس جديد
            </div>
        )}
        {activeTab === 'schedules' && (
            <div style={addBtnStyle} onClick={() => openScheduleModal('add')}>
                <i className="fa-solid fa-plus" style={{ marginLeft: '8px' }}></i> إضافة موعد جديد
            </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px', border: 'none', background: 'transparent',
              borderBottom: activeTab === tab.id ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === tab.id ? '#10b981' : '#64748b', fontWeight: '600', fontSize: '15px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
            <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Courses Tab */}
      {activeTab === 'courses' && (
        <div style={cardStyle}>
            {loadingCourses ? <Loader /> : (
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>الرقم</th>
                            <th style={thStyle}>اسم الكورس</th>
                            <th style={thStyle}>المادة</th>
                            <th style={thStyle}>السعر</th>
                            <th style={thStyle}>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.length === 0 ? (
                             <tr><td colSpan={5} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>لا توجد كورسات مسجلة لك</td></tr>
                        ) : courses.map((item, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={tdStyle}><span style={badgeStyle}>{item['الرقم']}</span></td>
                                <td style={{...tdStyle, fontWeight: '600'}}>{item['اسم الكورس']}</td>
                                <td style={tdStyle}>{item['المادة']}</td>
                                <td style={tdStyle}>{item['السعر']}</td>
                                <td style={tdStyle}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button onClick={() => openCourseModal('edit', item)} style={editBtnStyle}><i className="fa-solid fa-pen"></i></button>
                                        <button onClick={() => openCourseModal('delete', item)} style={deleteBtnStyle}><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      )}

      {/* 2. Schedules Tab */}
      {activeTab === 'schedules' && (
        <div style={cardStyle}>
            {loadingSchedules ? <Loader /> : (
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>الكورس</th>
                            <th style={thStyle}>اليوم</th>
                            <th style={thStyle}>من</th>
                            <th style={thStyle}>إلى</th>
                            <th style={thStyle}>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedules.length === 0 ? (
                            <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>لا توجد مواعيد مسجلة</td></tr>
                        ) : (
                            schedules.map((sch, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={tdStyle}>{sch.CourseName || courses.find(c => c['الرقم'] === sch.CourseID)?.['اسم الكورس'] || '-'}</td>
                                    <td style={tdStyle}><span style={{...badgeStyle, background: '#e0f2fe', color: '#0369a1'}}>{sch.DayOfWeek}</span></td>
                                    <td style={tdStyle}>{sch.StartTime}</td>
                                    <td style={tdStyle}>{sch.EndTime}</td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button onClick={() => openScheduleModal('edit', sch)} style={editBtnStyle}><i className="fa-solid fa-pen"></i></button>
                                            <button onClick={() => openScheduleModal('delete', sch)} style={deleteBtnStyle}><i className="fa-solid fa-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
        </div>
      )}

      {/* Modals */}
      
      {/* Course Modal */}
      {isCourseModalOpen && (
          <Modal 
            title={courseModalMode === 'add' ? 'إضافة كورس' : courseModalMode === 'edit' ? 'تعديل كورس' : 'حذف كورس'}
            onClose={() => setIsCourseModalOpen(false)}
            onSubmit={handleCourseSubmit}
            loading={courseLoading}
            mode={courseModalMode}
          >
              {courseModalMode === 'delete' ? (
                  <p style={{textAlign: 'center', fontSize: '18px'}}>هل أنت متأكد من حذف <strong>{courseForm.name}</strong>؟</p>
              ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      <Input label="اسم الكورس" value={courseForm.name} onChange={(v: string) => setCourseForm({...courseForm, name: v})} />
                      <Select label="المادة" value={courseForm.subjectId} onChange={(v: string) => setCourseForm({...courseForm, subjectId: v})} options={subjects.map((s: any) => ({value: s.SubjectID || s['الرقم'], label: s.SubjectName || s['المادة']}))} />
                      
                      {/* اختيار المحاضر - افتراضياً المعلم الحالي */}
                      <Select 
                          label="المحاضر" 
                          value={courseForm.employeeId} 
                          onChange={(v: string) => setCourseForm({...courseForm, employeeId: v})} 
                          options={employees.map((e: any) => ({value: e.EmployeeID || e['id'], label: e.EmploeArName || e['name']}))} 
                      />
                      
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <Input label="السعر" type="number" value={courseForm.price} onChange={(v: string) => setCourseForm({...courseForm, price: v})} />
                          <Input label="عدد الحصص" type="number" value={courseForm.sessions} onChange={(v: string) => setCourseForm({...courseForm, sessions: v})} />
                      </div>
                  </div>
              )}
          </Modal>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
          <Modal 
            title={scheduleModalMode === 'add' ? 'إضافة موعد' : scheduleModalMode === 'edit' ? 'تعديل موعد' : 'حذف موعد'}
            onClose={() => setIsScheduleModalOpen(false)}
            onSubmit={handleScheduleSubmit}
            loading={scheduleLoading}
            mode={scheduleModalMode}
          >
              {scheduleModalMode === 'delete' ? (
                  <p style={{textAlign: 'center', fontSize: '18px'}}>حذف موعد <strong>{scheduleForm.day}</strong>؟</p>
              ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      <Select 
                          label="الكورس" 
                          value={scheduleForm.courseId} 
                          onChange={(v: string) => setScheduleForm({...scheduleForm, courseId: v})} 
                          options={courses.map((c: Course) => ({ value: String(c['الرقم']), label: c['اسم الكورس'] }))} 
                      />
                      <Select 
                          label="اليوم" 
                          value={scheduleForm.day} 
                          onChange={(v: string) => setScheduleForm({...scheduleForm, day: v})} 
                          options={['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'].map((d: string) => ({value: d, label: d}))} 
                      />
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                          <Input label="من الساعة" type="time" value={scheduleForm.start} onChange={(v: string) => setScheduleForm({...scheduleForm, start: v})} />
                          <Input label="إلى الساعة" type="time" value={scheduleForm.end} onChange={(v: string) => setScheduleForm({...scheduleForm, end: v})} />
                      </div>
                  </div>
              )}
          </Modal>
      )}
    </div>
  );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function TeacherCoursesPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحميل لوحة التحكم...</div>}>
      <TeacherCoursesManagementContent />
    </Suspense>
  );
}

// --- Styles & Components ---

const Loader = () => <div style={{ textAlign: 'center', padding: '60px' }}><i className="fa-solid fa-spinner fa-spin fa-2x" style={{color: '#10b981'}}></i></div>;

const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '14px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' };
const tdStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'center', color: '#475569', fontSize: '14px' };
const badgeStyle: React.CSSProperties = { background: '#d1fae5', color: '#047857', padding: '4px 12px', borderRadius: '6px', fontWeight: '600' };
const editBtnStyle: React.CSSProperties = { background: '#eff6ff', color: '#2563eb', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer' };
const deleteBtnStyle: React.CSSProperties = { background: '#fef2f2', color: '#dc2626', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer' };
const addBtnStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: 'white' };

const Modal = ({ title, children, onClose, onSubmit, loading, mode }: { title: string, children: React.ReactNode, onClose: () => void, onSubmit: () => void, loading: boolean, mode: string }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
        <div style={{ background: 'white', borderRadius: '20px', width: '500px', maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: mode === 'delete' ? '#ef4444' : '#10b981', padding: '20px', color: 'white', borderRadius: '20px 20px 0 0' }}>
                <h3 style={{margin: 0}}>{title}</h3>
            </div>
            <div style={{ padding: '20px' }}>{children}</div>
            <div style={{ padding: '15px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={onClose} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>إلغاء</button>
                <button onClick={onSubmit} disabled={loading} style={{ padding: '10px 20px', background: mode === 'delete' ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : mode === 'delete' ? 'حذف' : 'حفظ'}
                </button>
            </div>
        </div>
    </div>
);

const Input = ({ label, value, onChange, type = 'text' }: { label: string, value: string | number, onChange: (value: string) => void, type?: string }) => (
    <div>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px' }} 
        />
    </div>
);

const Select = ({ label, options, value, onChange }: { label: string, options: {value: string, label: string}[], value: string, onChange: (value: string) => void }) => (
    <div>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>{label}</label>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', background: 'white' }}
        >
            <option value="">اختر...</option>
            {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);