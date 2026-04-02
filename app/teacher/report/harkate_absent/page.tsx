'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// إجبار الصفحة أن تكون ديناميكية
export const dynamic = 'force-dynamic';

// --- Types ---
type Course = {
  الرقم: number;
  "اسم الكورس": string;
};

type Student = {
  StudentID: number;
  StudentName: string;
  Status?: 'present' | 'absent' | 'late' | 'leave'; // حالة الطالب
  TimeIn?: string;
  TimeOut?: string;
  Notes?: string;
};

// === 1. المكون الداخلي ===
function TeacherAttendanceContent() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const employeeId = user?.personId ?? 0;

  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // --- States ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Effects ---
  
  // التحقق من تسجيل الدخول
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAuthChecked(true);
      if (!user || !work) {
        window.location.href = '/login';
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [user, work]);

  // تحميل الكورسات الخاصة بالمعلم
  useEffect(() => {
    if (!isAuthChecked || !employeeId) return;
    fetchTeacherCourses();
  }, [employeeId, isAuthChecked]);

  // --- Fetch Functions ---

  const fetchTeacherCourses = async () => {
    setLoadingCourses(true);
    try {
      // نفس الـ API المستخدم في الصفحة السابقة لجلب كورسات المعلم
      const res = await fetch(`${API_URL}/api/getData1/39?id=${employeeId}`);
      const data = await res.json();
      if (data.success) setCourses(data.data || []);
    } catch (e) { console.error(e); } 
    finally { setLoadingCourses(false); }
  };

  const loadStudentsForAttendance = async () => {
    if (!selectedCourseId) {
        alert('الرجاء اختيار الكورس أولاً');
        return;
    }
    setLoadingStudents(true);
    setStudents([]);
    try {
        // TODO: استبدل الرابط بالإجراء الخاص بجلب طلاب كورس محدد
        // مثال: api/getData1/44?id={CourseID}
        const res = await fetch(`${API_URL}/api/getData1/44?id=${selectedCourseId}`);
        const data = await res.json();
        
        if (data.success && data.data) {
            // نحتاج لدمج بيانات الطلاب مع سجل الحضور لليوم المحدد (لو موجود)
            // هنا نفترض أن الـ API يعيد قائمة الطلاب فقط، ونقوم بعمل Initial State
            const initialStudents = data.data.map((s: any) => ({
                StudentID: s.StudentID || s['رقم الطالب'],
                StudentName: s.StudentName || s['اسم الطالب'],
                Status: 'present', // افتراضياً حاضر
                TimeIn: '',
                TimeOut: '',
                Notes: ''
            }));
            setStudents(initialStudents);
        } else {
            setStudents([]);
        }
    } catch (e) {
        console.error(e);
        alert('فشل تحميل قائمة الطلاب');
    } finally {
        setLoadingStudents(false);
    }
  };

  // --- Handlers ---

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late' | 'leave') => {
    setStudents(prev => prev.map(s => 
        s.StudentID === studentId ? { ...s, Status: status } : s
    ));
  };

  const handleTimeChange = (studentId: number, field: 'TimeIn' | 'TimeOut', value: string) => {
    setStudents(prev => prev.map(s => 
        s.StudentID === studentId ? { ...s, [field]: value } : s
    ));
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    
    setSaving(true);
    try {
        // تجهيز البيانات للإرسال
        const payload = {
            schoolId: schoolId,
            courseId: Number(selectedCourseId),
            date: selectedDate,
            records: students.map(s => ({
                studentId: s.StudentID,
                status: s.Status,
                timeIn: s.TimeIn,
                timeOut: s.TimeOut,
                notes: s.Notes
            }))
        };

        // TODO: استبدل الرابط بـ API حفظ الحضور
        const res = await fetch(`${API_URL}/api/saveAttendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(data.success) {
            alert('تم حفظ الحضور بنجاح');
        } else {
            alert(data.error || 'حدث خطأ');
        }
    } catch (e) {
        alert('فشل الاتصال بالخادم');
    } finally {
        setSaving(false);
    }
  };

  // Protection Checks
  if (!isAuthChecked) return <div style={centerStyle}>جاري التحميل...</div>;
  if (!user || !work) return <div style={centerStyle}>جاري التحويل...</div>;

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>إدارة الحضور والانصراف</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>تسجيل حركة الطلاب اليومية</p>
        </div>
      </div>

      {/* Filters Card */}
      <div style={{ ...cardStyle, marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
            
            <div>
                <label style={labelStyle}>اختر الكورس</label>
                <select 
                    value={selectedCourseId} 
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    style={inputStyle}
                    disabled={loadingCourses}
                >
                    <option value="">{loadingCourses ? 'جاري التحميل...' : 'اختر كورس...'}</option>
                    {courses.map((c) => (
                        <option key={c['الرقم']} value={c['الرقم']}>{c['اسم الكورس']}</option>
                    ))}
                </select>
            </div>

            <div>
                <label style={labelStyle}>التاريخ</label>
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={inputStyle}
                />
            </div>

            <div>
                <button 
                    onClick={loadStudentsForAttendance} 
                    style={{ ...addBtnStyle, background: '#3b82f6', width: '100%', textAlign: 'center' }}
                    disabled={!selectedCourseId || loadingStudents}
                >
                    {loadingStudents ? <i className="fa-solid fa-spinner fa-spin"></i> : 'تحميل الطلاب'}
                </button>
            </div>
        </div>
      </div>

      {/* Students Table */}
      {students.length > 0 && (
        <div style={cardStyle}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{margin: 0, color: '#334155'}}>قائمة الطلاب ({students.length})</h3>
                <button 
                    onClick={handleSaveAttendance} 
                    disabled={saving}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                    {saving ? 'جاري الحفظ...' : 'حفظ الحضور'}
                </button>
            </div>
            
            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thStyle}>#</th>
                        <th style={{...thStyle, textAlign: 'right'}}>اسم الطالب</th>
                        <th style={thStyle}>الحالة</th>
                        <th style={thStyle}>وقت الحضور</th>
                        <th style={thStyle}>وقت الانصراف</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((student, index) => (
                        <tr key={student.StudentID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={tdStyle}>{index + 1}</td>
                            <td style={{...tdStyle, textAlign: 'right', fontWeight: '600'}}>{student.StudentName}</td>
                            <td style={tdStyle}>
                                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                    <StatusBtn label="حاضر" color="#10b981" active={student.Status === 'present'} onClick={() => handleStatusChange(student.StudentID, 'present')} />
                                    <StatusBtn label="غائب" color="#ef4444" active={student.Status === 'absent'} onClick={() => handleStatusChange(student.StudentID, 'absent')} />
                                    <StatusBtn label="متأخر" color="#f59e0b" active={student.Status === 'late'} onClick={() => handleStatusChange(student.StudentID, 'late')} />
                                </div>
                            </td>
                            <td style={tdStyle}>
                                <input 
                                    type="time" 
                                    style={{...inputStyle, padding: '5px', width: '100px', margin: '0 auto', display: 'block'}}
                                    value={student.TimeIn}
                                    onChange={(e) => handleTimeChange(student.StudentID, 'TimeIn', e.target.value)}
                                    disabled={student.Status === 'absent'}
                                />
                            </td>
                            <td style={tdStyle}>
                                <input 
                                    type="time" 
                                    style={{...inputStyle, padding: '5px', width: '100px', margin: '0 auto', display: 'block'}}
                                    value={student.TimeOut}
                                    onChange={(e) => handleTimeChange(student.StudentID, 'TimeOut', e.target.value)}
                                    disabled={student.Status === 'absent'}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
      
      {/* Empty State */}
      {students.length === 0 && !loadingStudents && (
         <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'white', borderRadius: '16px' }}>
            <i className="fa-solid fa-users" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
            <p>الرجاء اختيار الكورس وتاريخ اليوم لعرض قائمة الطلاب</p>
         </div>
      )}
    </div>
  );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={<div style={centerStyle}>جاري تحميل الصفحة...</div>}>
      <TeacherAttendanceContent />
    </Suspense>
  );
}

// --- Helper Components ---

const StatusBtn = ({ label, color, active, onClick }: { label: string, color: string, active: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        style={{
            padding: '6px 12px',
            border: `1px solid ${color}`,
            borderRadius: '6px',
            background: active ? color : 'white',
            color: active ? 'white' : color,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.2s'
        }}
    >
        {label}
    </button>
);

// --- Styles ---
const centerStyle: React.CSSProperties = { textAlign: 'center', padding: 40, direction: 'rtl' };

const headerStyle: React.CSSProperties = { 
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // أزرق للتمييز عن صفحة الكورسات
    borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', 
    boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)', color: 'white', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
};

const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { padding: '12px 10px', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '13px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' };
const tdStyle: React.CSSProperties = { padding: '12px 10px', textAlign: 'center', color: '#475569', fontSize: '14px' };

const inputStyle: React.CSSProperties = { 
    width: '100%', padding: '10px', border: '1px solid #e2e8f0', 
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    transition: 'border 0.2s'
};

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' };
const addBtnStyle: React.CSSProperties = { background: '#10b981', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: 'white', border: 'none' };