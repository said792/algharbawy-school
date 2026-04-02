'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- Types ---
interface StudentTsgel {
  'رقم الطالب': number;
  'كود الطالب': string;
  'اسم الطالب': string;
  'الرقم القومى': string;
  'نوع الاعدادية': string;
  'المدرسة الاعدادية': string;
  'درجة الاعدادية': string;
  'سنه الحصول': string;
  'اسم ولى الامر': string;
  'رقم العاتف': string;
  'الايميل': string;
  YerID?: number;
}

export default function NewStudentAdmissionPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const yearId = work?.yearId;

  const [formData, setFormData] = useState<Partial<StudentTsgel>>({
    'رقم الطالب': 0,
    'كود الطالب': '',
    'اسم الطالب': '',
    'الرقم القومى': '',
    'نوع الاعدادية': '',
    'المدرسة الاعدادية': '',
    'درجة الاعدادية': '',
    'سنه الحصول': '',
    'اسم ولى الامر': '',
    'رقم العاتف': '',
    'الايميل': '',
    YerID: yearId,
  });

  const [students, setStudents] = useState<StudentTsgel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refresh, setRefresh] = useState(0);

  // ==========================================
  // === 1. جلب الرقم التالي (Logic 41) ===
  // ==========================================
  useEffect(() => {
    const getNextId = async () => {
      try {
        // استخدام الرقم 41 لجلب الرقم التالي
        const res = await fetch(`${API_URL}/api/getData/21`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const id = data.data[0][''] || Object.values(data.data[0])[0];
          setFormData(prev => ({ ...prev, 'رقم الطالب': Number(id) || 1 }));
        }
      } catch (err) {
        console.error('Error fetching next ID:', err);
      }
    };
    
    // نشغل دالة الرقم التالي فقط إذا لم نكن في وضع التعديل
    if (!isEditing) {
      getNextId();
    }
  }, [refresh, isEditing]);

  // ==========================================
  // === 2. مزامنة العام (Logic Standard) ===
  // ==========================================
  useEffect(() => {
    if (yearId) {
      setTimeout(() => {
        setFormData(prev => {
          if (prev.YerID !== yearId) {
            return { ...prev, YerID: yearId };
          }
          return prev;
        });
      }, 0);
    }
  }, [yearId]);

  // ==========================================
  // === 3. جلب البيانات المسجلة (Logic 30) ===
  // ==========================================
  const fetchStudents = async () => {
    if (!schoolId || !yearId) return;

    let isMounted = true;
    const doFetch = async () => {
      try {
        // استخدام الرقم 30 لجلب البيانات
       const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=30`);
        const data = await res.json();
        if (isMounted && data.success) {
          setStudents(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    doFetch();
    return () => { isMounted = false; };
  };

  useEffect(() => {
    fetchStudents();
  }, [schoolId, yearId, refresh]);

  // ==========================================
  // === دوال الحفظ / التعديل / الحذف ===
  // ==========================================

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !yearId) return;

    setLoading(true);
    setMessage(null);

    try {
      // تحويل البيانات لتناسب الإجراء المخزن (INSER_UPDAT_DELETTAB12)
      const payload = {
        StudentID1: formData['رقم الطالب'],
        StudentCode: formData['كود الطالب'],
        StudName: formData['اسم الطالب'],
        NationalNumber: formData['الرقم القومى'],
        NaweiatAlaedadia: formData['نوع الاعدادية'],
        MiddleSchool: formData['المدرسة الاعدادية'],
         DarajatAlaedadia: formData['درجة الاعدادية'],
        YearObtained: formData['سنه الحصول'],
        StudFazer: formData['اسم ولى الامر'],
        TeleFazer: formData['رقم العاتف'],
        EmailFazer: formData['الايميل'],
        SchoolID: schoolId,
        YerID: yearId,
        INPOT: isEditing ? 2 : 1, // 2 تعديل، 1 إضافة
      };

      const res = await fetch(`${API_URL}/api/students/tsgel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        resetForm();
        setRefresh(r => r + 1); // تحديث البيانات والرقم
      } else {
     setMessage({ text: result.message, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'حدث خطأ في الاتصال', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;

    try {
      const res = await fetch(`${API_URL}/api/students/tsgel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          StudentID1: id,
          SchoolID: schoolId,
          YerID: yearId,
          INPOT: 3 // 3 حذف
        }),
      });

      const result = await res.json();
      if (result.success) {
        setRefresh(r => r + 1);
        alert('تم الحذف بنجاح');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (student: StudentTsgel) => {
    setFormData(student);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
  setFormData({
    'رقم الطالب': 0,
    'كود الطالب': '',
    'اسم الطالب': '',
    'الرقم القومى': '',
    'نوع الاعدادية': '',
    'المدرسة الاعدادية': '',
    'درجة الاعدادية': '',
    'سنه الحصول': '',
    'اسم ولى الامر': '',
    'رقم العاتف': '',
    'الايميل': '',
    YerID: yearId,
  });
  setIsEditing(false);
  setMessage(null);
};
  // ==========================================
  // === Styles (تصميم ناري نظيف وأنيق) ===
  // ==========================================
  const containerStyle: React.CSSProperties = {
    padding: '30px',
    maxWidth: '1400px',
    margin: '0 auto',
    direction: 'rtl',
    fontFamily: 'Tajawal, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
  };

  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #dc2626, #ef4444)', // أحمر ناري
    color: 'white',
    padding: '30px',
    borderRadius: '20px',
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)',
    border: '2px solid #b91c1c'
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    padding: '35px',
    borderRadius: '20px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    marginBottom: '30px',
    border: '1px solid #fee2e2',
    borderTop: '5px solid #dc2626'
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#4b5563',
    fontSize: '14px'
  };

  const inputStyle: React.CSSProperties = {
    padding: '12px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    outline: 'none',
    transition: 'all 0.3s',
    fontSize: '14px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '14px 30px',
    borderRadius: '10px',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const getActionButtonStyle = (color: string): React.CSSProperties => ({
    padding: '6px 12px',
    background: color,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px'
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>🔥 تسجيل طالب جديد</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '16px' }}>نظام التقديم الإلكتروني للطلاب الجدد</p>
        </div>
        <div style={{ fontSize: '50px' }}>🎓</div>
      </div>

      {/* Form Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: 0, color: '#dc2626' }}>
            {isEditing ? '✏️ تعديل بيانات طالب' : '📝 استمارة التقديم'}
          </h2>
          {!isEditing && (
            <div style={{ background: '#fef2f2', padding: '5px 15px', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <span style={{ color: '#991b1b', fontWeight: 'bold' }}>الرقم التالي: {formData['رقم الطالب']}</span>
            </div>
          )}
        </div>

        {message && (
          <div style={{
            padding: '15px', marginBottom: '20px', borderRadius: '10px',
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            textAlign: 'center', fontWeight: 'bold', border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          
          {/* حقول النموذج */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>كود الطالب</label>
            <input 
              type="text" 
              name="كود الطالب" 
              value={formData['كود الطالب']} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
              placeholder="مثال: 2024001" 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>الاسم الرباعي</label>
            <input 
              type="text" 
              name="اسم الطالب" 
              value={formData['اسم الطالب']} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
              placeholder="الاسم بالكامل" 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>الرقم القومي</label>
            <input 
              type="text" 
             name="الرقم القومى"
              value={formData['الرقم القومى']} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
              placeholder="14 رقم" 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>النعمة الدينية</label>
            <select 
              name="نوع الاعدادية" 
              value={formData['نوع الاعدادية']} 
              onChange={handleChange} 
              style={inputStyle}
            >
              <option value="">اختر...</option>
              <option value="مسلم">مسلم</option>
              <option value="مسيحي">مسيحي</option>
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>المدرسة المتوسطة</label>
            <input 
              type="text" 
              name="المدرسة الاعدادية" 
              value={formData['المدرسة الاعدادية']} 
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="اسم المدرسة السابقة" 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>درجة النعمة / الشهادة</label>
            <input 
              type="text" 
             name="درجة الاعدادية"
value={formData['درجة الاعدادية']}
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="مثال: 98%" 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>سنة الحصول</label>
            <input 
              type="number" 
              name="سنه الحصول" 
              value={formData['سنه الحصول']} 
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="2023" 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>اسم ولي الأمر</label>
            <input 
              type="text" 
              name="اسم ولى الامر" 
              value={formData['اسم ولى الامر']} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>تليفون ولي الأمر</label>
            <input 
              type="text" 
              name="رقم العاتف" 
              value={formData['رقم العاتف']} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
              placeholder="01xxxxxxxxx" 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>البريد الإلكتروني</label>
            <input 
              type="email" 
              name="الايميل" 
              value={formData['الايميل']} 
              onChange={handleChange} 
              style={inputStyle} 
              placeholder="example@email.com" 
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                ...buttonStyle, 
                background: isEditing ? '#2563eb' : '#dc2626', 
                color: 'white',
                opacity: loading ? 0.7 : 1,
                flex: 1
              }}
            >
              {loading ? 'جاري الحفظ...' : (isEditing ? '💾 حفظ التعديلات' : '🚀 تسجيل الطالب')}
            </button>
            
            {isEditing && (
              <button 
                type="button" 
                onClick={resetForm}
                style={{ ...buttonStyle, background: '#94a3b8', color: 'white', flex: '0 0 auto' }}
              >
                ❌ إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#374151', borderBottom: '2px solid #f3f4f6', paddingBottom: 'Number 10px' }}>
          📋 قائمة الطلاب المسجلين ({students.length})
        </h3>
        
        <div style={{ ...cardStyle, padding: '0', overflowX: 'auto', boxShadow: 'none', border: 'none' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#374151' }}>
                <th style={{ padding: '15px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>الكود</th>
                <th style={{ padding: '15px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>الاسم</th>
                <th style={{ padding: '15px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>المدرسة السابقة</th>
                <th style={{ padding: '15px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>ولي الأمر</th>
                <th style={{ padding: '15px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>التليفون</th>
                <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>التحكم</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={`student-${student['رقم الطالب'] || idx}`} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#b91c1c' }}>{student['كود الطالب']}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>{student['اسم الطالب']}</td>
                  <td style={{ padding: '15px', color: '#6b7280' }}>{student['المدرسة الاعدادية']}</td>
                  <td style={{ padding: '15px' }}>{student['اسم ولى الامر']}</td>
                  <td style={{ padding: '15px' }}>{student['رقم العاتف']}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => handleEdit(student)}
                        style={getActionButtonStyle('#3b82f6')}
                      >
                        تعديل
                      </button>
                      <button 
                        onClick={() => handleDelete(student['رقم الطالب'])}
                        style={getActionButtonStyle('#ef4444')}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '18px' }}>
                    لا يوجد طلاب مسجلين حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}