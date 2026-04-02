'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface Course {
  CourseID: number;
  CourseName?: string;
  'اسم الكورس'?: string;
  'الرقم'?: number;
}

interface EnrolledStudent {
  'كود الطالب': number; // EnrollmentID
  'اسم الطالب': string;
  'الكورس': string;
  'حالة الطالب': string;
  // حالات محلية للتعديل
  attendanceStatus?: string;
  notes?: string;
}

export default function AttendancePage() {
  const { user, work } = useAuthStore();
  
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const yearName = work?.yearName;

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Styles
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px', color: '#475569' };
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' };
  const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };

  // 1. جلب الكورسات
  useEffect(() => {
    const fetchCourses = async () => {
        if(schoolId) {
            try {
                const res = await fetch(`${API_URL}/api/getData1/10?id=${schoolId}`);
                const json = await res.json();
                if (json.success) setCourses(json.data || []);
            } catch(e) { console.error(e); }
        }
    };
    fetchCourses();
  }, [schoolId]);

  // 2. جلب الطلاب عند اختيار الكورس
  useEffect(() => {
    const fetchStudents = async () => {
        if (!selectedCourseName || !schoolName || !yearName) {
            setStudents([]);
            return;
        }

        setLoading(true);
        try {
            // استخدام search3 مع inpot=8 كما طلبت
            // SCHER1=SchoolName, SCHER2=CourseName, SCHER3=YearName
            const res = await fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${selectedCourseName}&SCHER3=${yearName}&inpot=8`);
            const json = await res.json();

            if (json.success && json.data) {
                // تجهيز البيانات مع قيم افتراضية للحضور
                const initialized = json.data.map((s: EnrolledStudent) => ({
                    ...s,
                    attendanceStatus: 'حاضر', // افتراضي
                    notes: ''
                }));
                setStudents(initialized);

                // (اختياري) التحقق من الحضور المسجل مسبقاً لهذا اليوم
                checkExistingAttendance(initialized);
            } else {
                setStudents([]);
            }
        } catch (e) { 
            console.error(e); 
            setStudents([]); 
        } finally { 
            setLoading(false); 
        }
    };

    // جلب الحضور المسجل للتاريخ المحدد
    const checkExistingAttendance = async (studs: EnrolledStudent[]) => {
        if (studs.length === 0) return;
        
        // هنمر على كل طالب ونشوف له سجل ولا لأ (ممكن نعمله batch لاحقاً)
        // للتبسيط هنسيب الافتراضي "حاضر" والمستخدم يعدله
    };

    fetchStudents();
  }, [selectedCourseName, schoolName, yearName]);

  // تحديث حالة طالب واحد
  const handleStatusChange = (enrollmentId: number, status: string) => {
    setStudents(prev => 
        prev.map(s => s['كود الطالب'] === enrollmentId ? { ...s, attendanceStatus: status } : s)
    );
  };

  const handleNotesChange = (enrollmentId: number, notes: string) => {
    setStudents(prev => 
        prev.map(s => s['كود الطالب'] === enrollmentId ? { ...s, notes: notes } : s)
    );
  };

  // 3. حفظ الحضور
  const handleSaveAttendance = async () => {
      if(students.length === 0) return;

      setSaving(true);
      let savedCount = 0;

      try {
          // إرسال طلب لكل طالب
          const requests = students.map(s => 
              fetch(`${API_URL}/api/attendance`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      enrollmentId: s['كود الطالب'],
                      attendanceDate: attendanceDate,
                      status: s.attendanceStatus,
                      notes: s.notes,
                      inpout: 1 // 1 = حفظ
                  })
              })
          );

          await Promise.all(requests);
          alert(`تم تسجيل حضور/غياب ${students.length} طالب بنجاح`);
      } catch(e) {
          alert('حدث خطأ أثناء الحفظ');
      } finally {
          setSaving(false);
      }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '16px', padding: '24px', marginBottom: '20px', color: 'white' }}>
        <h2 style={{margin: 0}}>📝 تسجيل الحضور والغياب</h2>
        <p style={{margin: '5px 0 0', opacity: 0.9}}>اختر الكورس والتاريخ لتسجيل حالة الطلاب</p>
      </div>

      <div style={cardStyle}>
          {/* Filters */}
          <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', background: '#f8fafc' }}>
              <div>
                  <label style={labelStyle}>الكورس</label>
                  <select 
                    value={selectedCourseName} 
                    onChange={(e) => setSelectedCourseName(e.target.value)} 
                    style={inputStyle}
                  >
                      <option value="">اختر الكورس</option>
                      {courses.map((c, i) => (
                          <option key={i} value={c.CourseName || c['اسم الكورس']}>
                              {c.CourseName || c['اسم الكورس']}
                          </option>
                      ))}
                  </select>
              </div>
              <div>
                  <label style={labelStyle}>التاريخ</label>
                  <input 
                    type="date" 
                    value={attendanceDate} 
                    onChange={(e) => setAttendanceDate(e.target.value)} 
                    style={inputStyle} 
                  />
              </div>
          </div>

          {/* Table */}
          <div style={{ padding: '20px' }}>
              {loading ? (
                  <div style={{textAlign: 'center', padding: '40px'}}><i className="fa-solid fa-spinner fa-spin fa-2x" style={{color: '#f59e0b'}}></i></div>
              ) : students.length === 0 ? (
                  <div style={{textAlign: 'center', color: '#999', padding: '40px'}}>
                      {selectedCourseName ? 'لا يوجد طلاب مسجلين في هذا الكورس' : 'يرجى اختيار الكورس لعرض الطلاب'}
                  </div>
              ) : (
                  <>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                  <th style={{padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right'}}>اسم الطالب</th>
                                  <th style={{padding: '12px', borderBottom: '1px solid #eee'}}>الحالة</th>
                                  <th style={{padding: '12px', borderBottom: '1px solid #eee'}}>ملاحظات</th>
                              </tr>
                          </thead>
                          <tbody>
                              {students.map((s, i) => (
                                  <tr key={i} style={{borderBottom: '1px solid #f1f5f9'}}>
                                      <td style={{padding: '12px', fontWeight: '500'}}>{s['اسم الطالب']}</td>
                                      <td style={{padding: '12px', textAlign: 'center'}}>
                                          <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                              <button 
                                                  onClick={() => handleStatusChange(s['كود الطالب'], 'حاضر')}
                                                  style={{
                                                      padding: '6px 12px', 
                                                      borderRadius: '20px', 
                                                      border: '1px solid #10b981',
                                                      background: s.attendanceStatus === 'حاضر' ? '#10b981' : 'white',
                                                      color: s.attendanceStatus === 'حاضر' ? 'white' : '#10b981',
                                                      cursor: 'pointer',
                                                      fontWeight: '600'
                                                  }}
                                              >
                                                  حاضر
                                              </button>
                                              <button 
                                                  onClick={() => handleStatusChange(s['كود الطالب'], 'غائب')}
                                                  style={{
                                                      padding: '6px 12px', 
                                                      borderRadius: '20px', 
                                                      border: '1px solid #ef4444',
                                                      background: s.attendanceStatus === 'غائب' ? '#ef4444' : 'white',
                                                      color: s.attendanceStatus === 'غائب' ? 'white' : '#ef4444',
                                                      cursor: 'pointer',
                                                      fontWeight: '600'
                                                  }}
                                              >
                                                  غائب
                                              </button>
                                          </div>
                                      </td>
                                      <td style={{padding: '12px'}}>
                                          <input 
                                              type="text" 
                                              placeholder="ملاحظة..." 
                                              value={s.notes}
                                              onChange={(e) => handleNotesChange(s['كود الطالب'], e.target.value)}
                                              style={{...inputStyle, padding: '5px 10px', fontSize: '13px'}} 
                                          />
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>

                      <div style={{marginTop: '20px', textAlign: 'left'}}>
                          <button 
                              onClick={handleSaveAttendance} 
                              disabled={saving}
                              style={{...primaryBtn, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', opacity: saving ? 0.7 : 1}}
                          >
                              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                              <span>حفظ الحضور</span>
                          </button>
                      </div>
                  </>
              )}
          </div>
      </div>
    </div>
  );
}