'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

interface ClassItem {
  'الرقم': number;
  'الفصل': string;
}

interface Student {
  StudentID: number;
  ArbStudName: string;
}

interface Course {
  CourseID: number;
  CourseName?: string;
  'اسم الكورس'?: string; 
  'الرقم'?: number;
}

interface Enrollment {
  EnrollmentID: number;
  StudentID: number;
  CourseID: number;
  StudentName: string;
  CourseName: string;
  EnrollmentDate: string;
  Status: string;
}

export default function EnrollStudentsPage() {
  const { user, work } = useAuthStore();
  
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearId = work?.yearId; // <--- استخدام الـ yearId من الـ Store مباشرة
  const personId = user?.personId ;

  // === State ===
  const [activeTab, setActiveTab] = useState('single');
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [editData, setEditData] = useState<any>({});

  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const [formCourseId, setFormCourseId] = useState('');
  // تم حذف formYearId因为我们 سنستخدم yearId مباشرة من الـ Store
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState('نشط');

  // === Effects ===
  useEffect(() => {
    const fetchInitial = async () => {
        if (schoolName && stageName) {
            setLoadingGrades(true);
            try {
                const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                const json = await res.json();
                if (json.success) setGrades(json.data);
            } catch(e) {} finally { setLoadingGrades(false); }
        }

        if(personId) {
            try {
                const res = await fetch(`${API_URL}/api/getData1/17?id=${personId}`);
                const json = await res.json();
                if (json.success) setCourses(json.data || []);
            } catch(e) {}
        }

        if(personId) fetchEnrollments();
    };
    fetchInitial();
  }, [schoolId, schoolName, stageName,personId]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
        const res = await fetch(`${API_URL}/api/getData1/18?id=${personId}`);
        const json = await res.json();
        if(json.success && json.data) {
            const mappedData = json.data.map((item: any) => ({
                EnrollmentID: item['الرقم'],
                StudentID: item.StudentID,
                CourseID: item.CourseID,
                StudentName: item['الطالب'],
                CourseName: item['الكورس'],
                EnrollmentDate: item['تاريخ الانضمام'],
                Status: item['حالة الطالب']
            }));
            setEnrollments(mappedData);
        }
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    const fetchClasses = async () => {
        if (!selectedGradeName || !schoolName || !stageName) { setClasses([]); return; }
        setLoadingClasses(true);
        try {
            const res = await fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`);
            const json = await res.json();
            if (json.success) setClasses(json.data);
        } catch (err) { console.error(err); setClasses([]); }
        finally { setLoadingClasses(false); }
    };
    
    if(selectedGradeName) fetchClasses();
    setSelectedClassName('');
    setClassStudents([]);
    setSelectedStudentId(null);
    setSelectedStudentIds([]);
    
  }, [selectedGradeName, schoolName, stageName]);

  useEffect(() => {
    const fetchStudents = async () => {
        if (!selectedClassName || !schoolName || !stageName || !work?.yearName || !selectedGradeName) {
            setClassStudents([]);
            return;
        }
        setLoadingStudents(true);
        try {
            const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${work.yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedClassName}&inpot=4`);
            const json = await res.json();
            
            if (json.success && json.data) {
                setClassStudents(json.data.map((s: any) => ({
                    StudentID: s['الرقم'] || s.StudentID,
                    ArbStudName: s['الاسم بالعربى'] || s.ArbStudName
                })));
            } else {
                setClassStudents([]);
            }
        } catch (err) { console.error(err); setClassStudents([]); } 
        finally { setLoadingStudents(false); }
    };

    if(selectedClassName) fetchStudents();
    setSelectedStudentId(null);
    setSelectedStudentIds([]);
    
  }, [selectedClassName, selectedGradeName, schoolName, stageName, work?.yearName]);

  // === Handlers ===
  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedGradeId(id);
    const gradeObj = grades.find(g => g['الرقم'] === id);
    if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
  };

  const openModal = (mode: 'add' | 'edit' | 'delete', item?: Enrollment) => {
    setModalMode(mode);
    
    if (mode === 'add') {
        setSelectedGradeId(null);
        setSelectedGradeName('');
        setSelectedClassName('');
        setClassStudents([]);
        setSelectedStudentId(null);
        setFormCourseId('');
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormStatus('نشط');
    } else if (item) {
        setEditData(item);
        setFormCourseId(String(item.CourseID));
        setFormDate(item.EnrollmentDate ? item.EnrollmentDate.split('T')[0] : '');
        setFormStatus(item.Status);
    }
    setIsModalOpen(true);
  };

  // دالة التحقق من التكرار
  const checkDuplicate = (studentId: number, courseId: number) => {
      return enrollments.some(e => 
          e.StudentID === studentId && 
          e.CourseID === courseId
          // ممكن نضيف شرط العام لو لازم: && e.YearID === yearId (محتاجين نضيف YearID في الـ Interface والـ Fetch)
      );
  };

  const handleSingleSubmit = async () => {
      if((modalMode === 'add' && !selectedStudentId) || !formCourseId) {
          alert('اختر الطالب والكورس');
          return;
      }

      // التحقق من وجود العام الدراسي
      if (!yearId) {
          alert('لا يوجد عام دراسي محدد في إعدادات العمل');
          return;
      }

      // التحقق من التكرار
      if (modalMode === 'add' && checkDuplicate(selectedStudentId as number, Number(formCourseId))) {
          alert('هذا الطالب مسجل بالفعل في هذا الكورس!');
          return;
      }

      setFormLoading(true);
      try {
          const res = await fetch(`${API_URL}/api/enrollments`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  sch1: editData.EnrollmentID || 0,
                  sch2: schoolId,
                  sch3: modalMode === 'add' ? selectedStudentId : editData.StudentID,
                  sch4: Number(formCourseId),
                  sch5: yearId, // <--- إرسال الـ YearID من الـ Store
                  sch6: formDate,
                  sch7: formStatus,
                  INPOT: modalMode === 'add' ? 1 : 2
              })
          });
          const data = await res.json();
          if(data.success) {
              alert('تم الحفظ بنجاح');
              setIsModalOpen(false);
              fetchEnrollments();
          } else {
              alert(data.error || 'خطأ');
          }
      } catch(e) { alert('فشل الاتصال'); }
      finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
      if(!editData.EnrollmentID) return;
      setFormLoading(true);
      try {
          const res = await fetch(`${API_URL}/api/enrollments`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  sch1: editData.EnrollmentID,
                  INPOT: 3
              })
          });
          const data = await res.json();
          if(data.success) {
              alert('تم الحذف');
              setIsModalOpen(false);
              fetchEnrollments();
          } else {
              alert(data.error || 'خطأ');
          }
      } catch(e) { alert('فشل الاتصال'); }
      finally { setFormLoading(false); }
  };

  const toggleStudentSelection = (id: number) => {
      setSelectedStudentIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const selectAllStudents = () => {
      if (selectedStudentIds.length === classStudents.length) {
          setSelectedStudentIds([]);
      } else {
          setSelectedStudentIds(classStudents.map(s => s.StudentID));
      }
  };

  const handleBulkSubmit = async () => {
      if(selectedStudentIds.length === 0 || !formCourseId) {
          alert('اختر الكورس وطالب واحد على الأقل');
          return;
      }
      
      if (!yearId) {
          alert('لا يوجد عام دراسي محدد');
          return;
      }

      // تصفية الطلاب اللي مسجلين بالفعل
      const alreadyEnrolled = selectedStudentIds.filter(id => checkDuplicate(id, Number(formCourseId)));
      if (alreadyEnrolled.length > 0) {
          const names = classStudents.filter(s => alreadyEnrolled.includes(s.StudentID)).map(s => s.ArbStudName).join(', ');
          alert(`الطلاب التالية أسماؤهم مسجلون بالفعل وسيتم تخطيهم: ${names}`);
      }

      const studentsToRegister = selectedStudentIds.filter(id => !checkDuplicate(id, Number(formCourseId)));
      
      if (studentsToRegister.length === 0) {
          alert('جميع الطلاب المختارين مسجلون بالفعل');
          return;
      }

      setFormLoading(true);
      const requests = studentsToRegister.map(stuId => 
          fetch(`${API_URL}/api/enrollments`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  sch1: 0, sch2: schoolId, sch3: stuId, sch4: Number(formCourseId),
                  sch5: yearId, sch6: formDate, sch7: formStatus, INPOT: 1
              })
          })
      );

      try {
          await Promise.all(requests);
          alert(`تم تسجيل ${studentsToRegister.length} طالب بنجاح`);
          setSelectedStudentIds([]);
          fetchEnrollments();
      } catch(e) { alert('حدث خطأ'); }
      finally { setFormLoading(false); }
  };

  // === Styles ===
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px', color: '#475569' };
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' };
  const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '16px', padding: '24px', marginBottom: '20px', color: 'white' }}>
        <h2 style={{margin: 0}}>تسجيل الطلاب في الكورسات</h2>
      </div>

      {/* Tabs - تم تعديل هذا الجزء */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <button 
            onClick={() => setActiveTab('single')} 
            style={activeTab === 'single' ? {
                color: '#6366f1', 
                background: 'transparent', 
                padding: '10px 20px', 
                fontWeight: '600',
                // استخدام الخصائص التفصيلية بدلاً من border: 'none'
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '3px solid #6366f1',
                cursor: 'pointer',
                outline: 'none'
            } : {
                background: 'transparent', 
                border: 'none', 
                padding: '10px 20px', 
                color: '#666',
                cursor: 'pointer',
                outline: 'none'
            }}
        >
            تسجيل فردي
        </button>
        
        <button 
            onClick={() => setActiveTab('bulk')} 
            style={activeTab === 'bulk' ? {
                color: '#6366f1', 
                background: 'transparent', 
                padding: '10px 20px', 
                fontWeight: '600',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '3px solid #6366f1',
                cursor: 'pointer',
                outline: 'none'
            } : {
                background: 'transparent', 
                border: 'none', 
                padding: '10px 20px', 
                color: '#666',
                cursor: 'pointer',
                outline: 'none'
            }}
        >
            تسجيل جماعي
        </button>
      </div>

      {/* === Tab 1: Single === */}
      {activeTab === 'single' && (
          <div style={cardStyle}>
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
                  <h3>سجل التسجيلات</h3>
                  <button onClick={() => openModal('add')} style={primaryBtn}><i className="fa-solid fa-plus"></i> تسجيل جديد</button>
              </div>
              <table style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                      <tr>
                          <th style={{padding: '12px', borderBottom: '1px solid #eee'}}>الطالب</th>
                          <th style={{padding: '12px', borderBottom: '1px solid #eee'}}>الكورس</th>
                          <th style={{padding: '12px', borderBottom: '1px solid #eee'}}>التاريخ</th>
                          <th style={{padding: '12px', borderBottom: '1px solid #eee'}}>الحالة</th>
                          <th style={{padding: '12px', borderBottom: '1px solid #eee'}}>إجراءات</th>
                      </tr>
                  </thead>
                  <tbody>
                      {loading ? <tr><td colSpan={5}><i className="fa-solid fa-spinner fa-spin"></i></td></tr> :
                       enrollments.map((e, i) => (
                           <tr key={e.EnrollmentID || i} style={{borderBottom: '1px solid #f1f5f9'}}>
                               <td style={{padding: '12px'}}>{e.StudentName}</td>
                               <td style={{padding: '12px'}}>{e.CourseName}</td>
                               <td style={{padding: '12px'}}>{e.EnrollmentDate?.split('T')[0]}</td>
                               <td style={{padding: '12px'}}>{e.Status}</td>
                               <td style={{padding: '12px'}}>
                                   <button onClick={() => openModal('edit', e)} style={{color: '#2563eb', marginLeft: '5px', cursor: 'pointer', background: 'none', border: 'none'}}><i className="fa-solid fa-pen"></i></button>
                                   <button onClick={() => openModal('delete', e)} style={{color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none'}}><i className="fa-solid fa-trash"></i></button>
                               </td>
                           </tr>
                       ))
                      }
                  </tbody>
              </table>
          </div>
      )}

      {/* === Tab 2: Bulk === */}
      {activeTab === 'bulk' && (
          <div style={cardStyle}>
              <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', background: '#f8fafc' }}>
                  <div>
                      <label style={labelStyle}>الصف الدراسي</label>
                      <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle} disabled={loadingGrades}>
                          <option value="">{loadingGrades ? 'جاري...' : 'اختر الصف'}</option>
                          {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                      </select>
                  </div>
                  <div>
                      <label style={labelStyle}>الفصل</label>
                      <select value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)} style={inputStyle} disabled={!selectedGradeId || loadingClasses}>
                          <option value="">{loadingClasses ? 'جاري...' : 'اختر الفصل'}</option>
                          {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                      </select>
                  </div>
                  <div>
                      <label style={labelStyle}>الكورس</label>
                      <select value={formCourseId} onChange={(e) => setFormCourseId(e.target.value)} style={inputStyle}>
                          <option value="">اختر الكورس</option>
                          {courses.map((c, i) => <option key={c.CourseID || c['الرقم'] || i} value={c.CourseID || c['الرقم']}>{c.CourseName || c['اسم الكورس']}</option>)}
                      </select>
                  </div>
                  <div>
                      <label style={labelStyle}>تاريخ التسجيل</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inputStyle} />
                  </div>
              </div>

              <div style={{ padding: '20px' }}>
                  {loadingStudents ? <div style={{textAlign: 'center'}}><i className="fa-solid fa-spinner fa-spin"></i></div> :
                   selectedClassName && classStudents.length > 0 ? (
                       <>
                        <div style={{marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <span>عدد الطلاب: {classStudents.length}</span>
                            <button onClick={selectAllStudents} style={{fontSize: '12px', color: '#6366f1', border: '1px solid #6366f1', background: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer'}}>
                                {selectedStudentIds.length === classStudents.length ? 'إلغاء الكل' : 'اختيار الكل'}
                            </button>
                        </div>
                        <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px'}}>
                            {classStudents.map(s => (
                                <div key={s.StudentID} 
                                     onClick={() => toggleStudentSelection(s.StudentID)}
                                     style={{ padding: '10px', borderBottom: '1px solid #f1f1f1', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: selectedStudentIds.includes(s.StudentID) ? '#eef2ff' : 'white' }}>
                                    <input type="checkbox" checked={selectedStudentIds.includes(s.StudentID)} readOnly />
                                    <span>{s.ArbStudName}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{marginTop: '20px', textAlign: 'left'}}>
                            <button onClick={handleBulkSubmit} disabled={formLoading || selectedStudentIds.length === 0} style={{...primaryBtn, opacity: selectedStudentIds.length === 0 ? 0.5 : 1}}>
                                {formLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                                تسجيل {selectedStudentIds.length} طلاب
                            </button>
                        </div>
                       </>
                   ) : selectedClassName ? <div style={{textAlign: 'center', color: '#999', padding: '20px'}}>لا يوجد طلاب في هذا الفصل</div> : 
                   <div style={{textAlign: 'center', color: '#999', padding: '40px'}}>اختر الصف والفصل لعرض الطلاب</div>
                  }
              </div>
          </div>
      )}

      {/* === Modal === */}
      {isModalOpen && (
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'}} onClick={() => setIsModalOpen(false)}>
              <div style={{
                  background: 'white', 
                  borderRadius: '15px', 
                  width: '500px', 
                  maxWidth: '100%', 
                  maxHeight: '90vh', 
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
              }} onClick={e => e.stopPropagation()}>
                  
                  <div style={{background: modalMode === 'delete' ? '#ef4444' : '#6366f1', color: 'white', padding: '15px', borderRadius: '15px 15px 0 0', flexShrink: 0}}>
                      <h3 style={{margin: 0}}>{modalMode === 'add' ? 'تسجيل طالب جديد' : modalMode === 'edit' ? 'تعديل بيانات' : 'تأكيد الحذف'}</h3>
                  </div>

                  <div style={{padding: '20px', overflowY: 'auto', flex: 1}}>
                      {modalMode === 'delete' ? (
                          <p style={{textAlign: 'center', fontSize: '16px'}}>هل أنت متأكد من حذف هذا التسجيل؟</p>
                      ) : (
                          <>
                              {modalMode === 'add' && (
                                  <>
                                      <div style={{marginBottom: '15px'}}>
                                          <label style={labelStyle}>الصف</label>
                                          <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle}>
                                              <option value="">اختر الصف</option>
                                              {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                                          </select>
                                      </div>
                                      <div style={{marginBottom: '15px'}}>
                                          <label style={labelStyle}>الفصل</label>
                                          <select value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)} style={inputStyle} disabled={!selectedGradeId}>
                                              <option value="">اختر الفصل</option>
                                              {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                                          </select>
                                      </div>
                                      <div style={{marginBottom: '15px'}}>
                                          <label style={labelStyle}>الطالب</label>
                                          <select value={selectedStudentId || ''} onChange={(e) => setSelectedStudentId(Number(e.target.value))} style={inputStyle} disabled={!selectedClassName}>
                                              <option value="">اختر الطالب</option>
                                              {classStudents.map(s => <option key={s.StudentID} value={s.StudentID}>{s.ArbStudName}</option>)}
                                          </select>
                                      </div>
                                  </>
                              )}
                              
                              <div style={{marginBottom: '15px'}}>
                                  <label style={labelStyle}>الكورس</label>
                                  <select value={formCourseId} onChange={(e) => setFormCourseId(e.target.value)} style={inputStyle}>
                                      <option value="">اختر الكورس</option>
                                      {courses.map((c, i) => <option key={c.CourseID || c['الرقم'] || i} value={c.CourseID || c['الرقم']}>{c.CourseName || c['اسم الكورس']}</option>)}
                                  </select>
                              </div>
                              <div style={{marginBottom: '15px'}}>
                                  <label style={labelStyle}>تاريخ التسجيل</label>
                                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inputStyle} />
                              </div>
                              <div style={{marginBottom: '15px'}}>
                                  <label style={labelStyle}>الحالة</label>
                                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} style={inputStyle}>
                                      <option value="نشط">نشط</option>
                                      <option value="معلق">معلق</option>
                                      <option value="منتهي">منتهي</option>
                                  </select>
                              </div>
                          </>
                      )}
                  </div>

                  <div style={{padding: '15px', textAlign: 'left', borderTop: '1px solid #eee', background: '#f9fafb', borderRadius: '0 0 15px 15px', flexShrink: 0}}>
                      <button onClick={() => setIsModalOpen(false)} style={{background: '#e5e7eb', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}>إلغاء</button>
                      <button onClick={modalMode === 'delete' ? handleDelete : handleSingleSubmit} style={{...primaryBtn, marginRight: '10px', border: 'none'}} disabled={formLoading}>
                          {formLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                          <span>{modalMode === 'delete' ? 'حذف' : 'حفظ'}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}