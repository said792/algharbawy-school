'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// بيانات أرقام التحويل
const PAYMENT_ACCOUNTS = {
    'فودافون كاش': '01012345678 - اسم المحفظة: أحمد محمد',
    'انستاباي': 'InstaPay: ahmed.mohamed@instapay',
    'البريد': 'رقم الحساب البريدي: 987654321'
};

interface Course {
  CourseID?: number | string; // دعم النصوص والأرقام
  CourseName?: string;
  EnrollmentID?: number; 
  Price?: number;
  [key: string]: any;
}

interface CoursePrice {
    Price: number;
    Status: string;
}

interface Student {
    StudentID: number;
    ArbStudName: string;
}

export default function PaymentsPage() {
  const { user, work } = useAuthStore();
  
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearName = work?.yearName;

  // Filters
  const [grades, setGrades] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedGradeName, setSelectedGradeName] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');

  // Payment Logic
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [coursePrice, setCoursePrice] = useState<CoursePrice | null>(null);
  
  const [paymentMethod, setPaymentMethod] = useState('كاش');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [saving, setSaving] = useState(false);

  // Styles
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px', color: '#475569' };
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '20px', marginBottom: '20px' };
  const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer' };

  // 1. جلب الصفوف والفصول
  useEffect(() => {
    if(schoolName && stageName) {
        fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`)
            .then(res => res.json())
            .then(json => { if(json.success) setGrades(json.data); });
    }
  }, [schoolName, stageName]);

  // جلب الفصول
  useEffect(() => {
    if(selectedGradeName && schoolName && stageName) {
        fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`)
            .then(res => res.json())
            .then(json => { if(json.success) setClasses(json.data); });
    }
  }, [selectedGradeName, schoolName, stageName]);

  // جلب الطلاب
  useEffect(() => {
    if(selectedClassName && schoolName && stageName && yearName && selectedGradeName) {
        fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedClassName}&inpot=4`)
            .then(res => res.json())
            .then(json => {
                if(json.success && json.data) {
                    setStudents(json.data.map((s: any) => ({
                        StudentID: s['الرقم'] || s.StudentID,
                        ArbStudName: s['الاسم بالعربى'] || s.ArbStudName
                    })));
                }
            });
    }
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  // 2. جلب الكورسات (مع اكتشاف أسماء الأعمدة تلقائياً)
  useEffect(() => {
    if(selectedStudentName) {
        setCourses([]);
        setSelectedCourse(null);
        setCoursePrice(null);
        
        fetch(`${API_URL}/api/search?scher=${selectedStudentName}&inpot=35`)
            .then(res => res.json())
            .then(json => {
                if(json.success && json.data && json.data.length > 0) {
                    
                    // === خطوة التصحيح (Debug) ===
                    // هذا السطر سيظهر لك في الـ Console هيكل البيانات القادمة
                    console.log("Structire of first course from API:", json.data[0]);
                    console.log("Available Keys:", Object.keys(json.data[0]));
                    
                    const formattedCourses = json.data.map((c: any, index: number) => {
                        // محاولة استخراج الـ ID بأي اسم محتمل
                        const id = c.CourseID || c['الرقم'] || c['كود الكورس'] || c.id || c.ID || c['كود'] || c.Course_ID;
                        
                        const name = c.CourseName || c['اسم الكورس'] || c.Name;

                        // إذا لم يتم العثور على ID، نستخدم الـ index مؤقتاً لمنع الكراش
                        return {
                            ...c,
                            CourseID: id !== undefined ? id : `fallback-${index}`, 
                            CourseName: name
                        };
                    });

                    setCourses(formattedCourses);
                } else {
                    setCourses([]);
                }
            });
    }
  }, [selectedStudentName]);

  // 3. عند اختيار كورس
  const handleCourseSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const courseObj = courses.find(c => String(c.CourseID) === selectedId);

    if(courseObj) {
        setSelectedCourse(courseObj);
        
        if (!selectedStudentId) {
            alert("خطأ: لم يتم تحديد رقم الطالب بشكل صحيح");
            return;
        }

        // إذا كان الـ ID مؤقت (fallback)، لا نرسل للسيرفر
        if(String(courseObj.CourseID).startsWith('fallback-')) {
            alert("خطأ: لم يتم التعرف على كود الكورس من قاعدة البيانات. راجع الـ Console.");
            return;
        }

        try {
            const url = `${API_URL}/api/search/scher2int?sch1=${selectedId}&sch2=${selectedStudentId}&inpot=33`;
            
            const res = await fetch(url);
            const json = await res.json();
            
            if(json.success && json.data && json.data.length > 0) {
                const data = json.data[0];
                const enrollmentId = data['كود التسجيل'] || data.EnrollmentID;
                
                setSelectedCourse(prev => prev ? { ...prev, EnrollmentID: enrollmentId } : null);
                setCoursePrice({
                    Price: data['السعر'] || 0,
                    Status: data['حالة الدفع'] || 'غير معروف'
                });
                setAmount(String(data['السعر'] || 0)); 
            } else {
                alert("لم يتم العثور على بيانات تسجيل لهذا الكورس.");
                setCoursePrice(null);
                setAmount('');
            }
        } catch(err) {
            console.error("Error:", err);
            alert("حدث خطأ في الاتصال");
        }
    }
  };

  // 4. حفظ المدفوعات
  const handleSubmit = async () => {
      if(!selectedCourse || !amount) {
          alert('الرجاء اختيار الكورس وتحديد المبلغ');
          return;
      }
      
      if(!selectedCourse.EnrollmentID) {
          alert('لا يوجد كود تسجيل لهذا الطالب في هذا الكورس، لا يمكن حفظ الدفع.');
          return;
      }

      let isConfirmed = 1; 

      if(paymentMethod !== 'كاش') {
          isConfirmed = 0;
          const accountInfo = PAYMENT_ACCOUNTS[paymentMethod as keyof typeof PAYMENT_ACCOUNTS] || 'رقم الحساب غير محدد';
          alert(`سيتم تسجيل الدفع كـ "معلق".\n\nبرجاء التحويل على:\n${accountInfo}`);
      }

      setSaving(true);
      try {
          const body = {
              paymentId: 0, 
              enrollmentId: selectedCourse.EnrollmentID,
              paymentDate: paymentDate,
              amount: parseFloat(amount),
              paymentMethod: paymentMethod,
              isConfirmed: isConfirmed,
              notes: notes,
              action: 1 
          };

          const res = await fetch(`${API_URL}/api/payments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
          });
          const data = await res.json();
          if(data.success) {
              alert(isConfirmed === 1 ? 'تم تسجيل الدفع بنجاح!' : 'تم إرسال طلب الدفع بنجاح.');
              setSelectedStudentId(null);
              setSelectedStudentName('');
              setSelectedCourse(null);
              setCoursePrice(null);
              setAmount('');
          } else {
              alert(data.error || 'حدث خطأ');
          }
      } catch(e) { alert('فشل الاتصال'); }
      finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '16px', padding: '24px', marginBottom: '20px', color: 'white' }}>
        <h2 style={{margin: 0}}>💳 تسجيل المدفوعات</h2>
      </div>

      <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                  <label style={labelStyle}>الصف</label>
                  <select onChange={(e) => {
                      const opt = grades.find(g => g['الرقم'] == e.target.value);
                      setSelectedGradeName(opt ? opt['الصف الدراسى'] : '');
                  }} style={inputStyle}>
                      <option value="">اختر الصف</option>
                      {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                  </select>
              </div>
              <div>
                  <label style={labelStyle}>الفصل</label>
                  <select onChange={(e) => setSelectedClassName(e.target.value)} style={inputStyle} disabled={!selectedGradeName}>
                      <option value="">اختر الفصل</option>
                      {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                  </select>
              </div>
              <div>
                  <label style={labelStyle}>الطالب</label>
                  <select onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedStudentId(id);
                      const stu = students.find(s => s.StudentID === id);
                      setSelectedStudentName(stu?.ArbStudName || '');
                  }} style={inputStyle} disabled={!selectedClassName}>
                      <option value="">اختر الطالب</option>
                      {students.map(s => <option key={s.StudentID} value={s.StudentID}>{s.ArbStudName}</option>)}
                  </select>
              </div>
          </div>

          {selectedStudentId && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
                  <h3 style={{margin: '0 0 15px', color: '#1e293b'}}>بيانات الدفع للطالب: {selectedStudentName}</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                     <div>
                        <label style={labelStyle}>الكورس</label>
                        <select onChange={handleCourseSelect} style={inputStyle}>
                            <option value="">اختر الكورس</option>
                            {courses.map((c, index) => (
                                // الحل النهائي: نستخدم String لضمان وجود قيمة للـ key
                                <option 
                                    key={String(c.CourseID || `course-${index}`)} 
                                    value={String(c.CourseID)}
                                >
                                    {c.CourseName}
                                </option>
                            ))}
                        </select>
                     </div>
                      
                      <div>
                          <label style={labelStyle}>سعر الكورس</label>
                          <input 
                              type="text" 
                              value={coursePrice ? `${coursePrice.Price} جنيه` : ''} 
                              readOnly 
                              style={{...inputStyle, background: '#f1f5f9'}} 
                              placeholder="سيظهر تلقائياً" 
                          />
                      </div>

                      <div>
                          <label style={labelStyle}>حالة الدفع السابقة</label>
                          <input 
                              type="text" 
                              value={coursePrice?.Status || ''} 
                              readOnly 
                              style={{...inputStyle, background: '#f1f5f9'}} 
                          />
                      </div>
                  </div>

                  {selectedCourse && (
                      <div style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                              <div>
                                  <label style={labelStyle}>المبلغ المدفوع</label>
                                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />
                              </div>
                              <div>
                                  <label style={labelStyle}>تاريخ الدفع</label>
                                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={inputStyle} />
                              </div>
                              <div>
                                  <label style={labelStyle}>طريقة الدفع</label>
                                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
                                      <option value="كاش">كاش (مباشر)</option>
                                      <option value="فودافون كاش">فودافون كاش</option>
                                      <option value="انستاباي">انستاباي</option>
                                      <option value="البريد">البريد</option>
                                  </select>
                              </div>
                              <div style={{gridColumn: 'span 2'}}>
                                  <label style={labelStyle}>ملاحظات</label>
                                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} placeholder="ملاحظة (اختياري)" />
                              </div>
                          </div>

                          <div style={{marginTop: '20px', textAlign: 'left'}}>
                              <button onClick={handleSubmit} disabled={saving} style={{...primaryBtn, opacity: saving ? 0.5 : 1}}>
                                  {saving ? 'جاري...' : 'تأكيد الدفع'}
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
}