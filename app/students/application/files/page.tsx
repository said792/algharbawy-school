'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- Types ---
interface StudentFile {
  'الرقم': number;
  'اسم الطالب': string;
  'شهادة الميلاد': string;
  'صورة الطالب': string;
  'اقرارات القبول': string;
  'طلب الالتحاق': string;
  'الدمغات': string;
  'صور البطايق': string;
  'حافظات': string;
  'حالة التسليم': string;
  StudentID1?: number; 
}

interface Applicant {
  'رقم الطالب': number;
  'اسم الطالب': string;
}

export default function FileReceptionPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const yearId = work?.yearId;
  const stageId = work?.stageId;

  const [formData, setFormData] = useState<Partial<StudentFile & { StudentID1: number }>>({
    'الرقم': 0,
    StudentID1: 0,
    'شهادة الميلاد': 'موجود',
    'صورة الطالب': 'موجود',
    'اقرارات القبول': 'موجود',
    'طلب الالتحاق': 'موجود',
    'الدمغات': 'موجود',
    'صور البطايق': 'موجود',
    'حافظات': 'موجود',
  });

  const [applicantsList, setApplicantsList] = useState<Applicant[]>([]);
  const [filesList, setFilesList] = useState<StudentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refresh, setRefresh] = useState(0);

  // === 1. جلب الرقم التالي للملف (Logic 63) ===
  useEffect(() => {
    const getNextId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/63`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const id = data.data[0][''] || Object.values(data.data[0])[0];
          setFormData(prev => ({ ...prev, 'الرقم': Number(id) || 1 }));
        }
      } catch (err) {
        console.error('Error fetching next file ID:', err);
      }
    };
    
    if (!isEditing) {
      getNextId();
    }
  }, [refresh, isEditing]);

  // === 2. جلب قائمة الطلاب المقدمين (INPOT 31) ===
  useEffect(() => {
    const fetchApplicants = async () => {
      if (!schoolId || !yearId) return;
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=31`);
        const data = await res.json();
        if (data.success) {
          setApplicantsList(data.data);
        }
      } catch (err) {
        console.error('Error fetching applicants:', err);
      }
    };
    fetchApplicants();
  }, [schoolId, yearId]);

  // === 3. جلب بيانات الملفات المسجلة (Logic 32) ===
  useEffect(() => {
    const fetchFiles = async () => {
      if (!schoolId || !yearId) return;
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=32`);
        const data = await res.json();
        if (data.success) {
          setFilesList(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchFiles();
  }, [schoolId, yearId, refresh]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // === دالة اختيار الطالب (تم التعديل لاستخدام الرقم) ===
  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    
    if (!selectedId) {
        resetForm();
        return;
    }

    // البحث عن الطالب في القائمة المحلية لتعبة البيانات
    const student = applicantsList.find(s => String(s['رقم الطالب']) === selectedId);
    
    if (student) {
        setFormData(prev => ({
            ...prev,
            StudentID1: student['رقم الطالب'],
            'اسم الطالب': student['اسم الطالب'],
        }));
    }
  };

  // === حفظ / تعديل حالة الملف ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !yearId) return;
    
    if (!formData.StudentID1) {
        setMessage({ text: 'يرجى اختيار الطالب من القائمة أولاً', type: 'error' });
        return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        FiellId: formData['الرقم'],
        StudentID1: formData.StudentID1,
        BirthCSTat: formData['شهادة الميلاد'],
        PrepScStat: formData['صورة الطالب'],
        StudPhotoS: formData['اقرارات القبول'],
        Application: formData['طلب الالتحاق'],
        EkraratSt: formData['الدمغات'],
        EkraratSt1: formData['صور البطايق'],
        EkraratSt2: formData['حافظات'],
        INPOT: isEditing ? 2 : 1,
      };

      const res = await fetch(`${API_URL}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        resetForm();
        setRefresh(r => r + 1); 
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'حدث خطأ في الاتصال', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // === ترحيل الطالب ===
  const handleAdmit = async (studentId: number, studentName: string) => {
    if (!stageId) {
        alert('لا يمكن الترحيل: لم يتم تحديد المرحلة الدراسية.');
        return;
    }
    if(!confirm(`هل أنت متأكد من ترحيل الطالب "${studentName}"؟`)) return;

    try {
        const res = await fetch(`${API_URL}/api/students/admit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                StudentID1: studentId,
                MrahelID: stageId
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('✅ تم ترحيل الطالب بنجاح!');
            setRefresh(r => r + 1);
        } else {
            alert(`❌ خطأ: ${data.message}`);
        }
    } catch (err) {
        console.error(err);
        alert('حدث خطأ في الاتصال');
    }
  };

  const handleEdit = (file: StudentFile) => {
    // التأكد من وجود StudentID1 قبل التعديل
    if (!file.StudentID1) {
        alert('خطأ: رقم الطالب (StudentID1) غير موجود في البيانات القادمة من السيرفر. يرجى تعديل الإجراء المخزن INPOT 32 لإرجاع هذا الحقل.');
        return;
    }

    setFormData({
        'الرقم': file['الرقم'],
        StudentID1: file.StudentID1, // الآن سيعمل بشكل صحيح
        'شهادة الميلاد': file['شهادة الميلاد'],
        'صورة الطالب': file['صورة الطالب'],
        'اقرارات القبول': file['اقرارات القبول'],
        'طلب الالتحاق': file['طلب الالتحاق'],
        'الدمغات': file['الدمغات'],
        'صور البطايق': file['صور البطايق'],
        'حافظات': file['حافظات'],
        'اسم الطالب': file['اسم الطالب']
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({
      'الرقم': 0,
      StudentID1: 0,
      'شهادة الميلاد': 'موجود',
      'صورة الطالب': 'موجود',
      'اقرارات القبول': 'موجود',
      'طلب الالتحاق': 'موجود',
      'الدمغات': 'موجود',
      'صور البطايق': 'موجود',
      'حافظات': 'موجود',
    });
    setIsEditing(false);
    setMessage(null);
    setRefresh(r => r + 1);
  };

  // --- Styles ---
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #fee2e2', borderTop: '5px solid #dc2626' };
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const buttonStyle: React.CSSProperties = { padding: '14px 30px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' };
  const statusOptions = ['موجود', 'ناقص', 'منتظر'];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>📂 استلام وترحيل ملفات الطلاب</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>اختر الطالب من القائمة لتسجيل حالة ملفاته</p>
        </div>
        <div style={{ fontSize: '50px' }}>🏫</div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: 0, color: '#dc2626' }}>
            {isEditing ? '✏️ تعديل حالة الملف' : '📝 تسجيل ملف جديد'}
          </h2>
          {!isEditing && (
            <div style={{ background: '#fef2f2', padding: '5px 15px', borderRadius: '8px' }}>
              <span style={{ color: '#991b1b', fontWeight: 'bold' }}>رقم الملف: {formData['الرقم']}</span>
            </div>
          )}
        </div>

        {message && (
          <div style={{
            padding: '15px', marginBottom: '20px', borderRadius: '10px',
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b', textAlign: 'center', fontWeight: 'bold'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          
          {/* === القائمة المنسدلة لاختيار الطالب === */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>اختر الطالب</label>
            <select 
              value={formData.StudentID1 || ''} // تعديل: استخدام الرقم كقيمة
              onChange={handleStudentSelect}
              disabled={isEditing}
              style={{...inputStyle, background: isEditing ? '#f3f4f6' : 'white'}}
            >
                <option value="">-- اختر طالب --</option>
                {/* تعديل: القيمة أصبحت رقم الطالب */}
                {applicantsList.map((s) => (
                    <option key={s['رقم الطالب']} value={s['رقم الطالب']}>
                        {s['اسم الطالب']} (#{s['رقم الطالب']})
                    </option>
                ))}
            </select>
          </div>

          {/* === عرض بيانات الطالب === */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>اسم الطالب</label>
            <input 
              type="text" 
              name="اسم الطالب" 
              value={formData['اسم الطالب'] || ''} 
              readOnly 
              style={{...inputStyle, background: '#f9fafb', color: '#374151'}} 
              placeholder="سيظهر بعد الاختيار" 
            />
          </div>

          {/* حقول الأوراق */}
          {[
            { label: 'شهادة الميلاد', key: 'شهادة الميلاد' },
            { label: 'صورة الطالب', key: 'صورة الطالب' },
            { label: 'إقرارات القبول', key: 'اقرارات القبول' },
            { label: 'طلب الالتحاق', key: 'طلب الالتحاق' },
            { label: 'الدمغات', key: 'الدمغات' },
            { label: 'صور البطايق', key: 'صور البطايق' },
            { label: 'حافظات', key: 'حافظات' },
          ].map(item => (
             <div key={item.key} style={inputGroupStyle}>
                <label style={labelStyle}>{item.label}</label>
                <select name={item.key} value={formData[item.key as keyof StudentFile]} onChange={handleChange} style={inputStyle}>
                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
             </div>
          ))}

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                ...buttonStyle, 
                background: isEditing ? '#16a34a' : '#dc2626',
                color: 'white', opacity: loading ? 0.7 : 1, flex: 1
              }}
            >
              {loading ? 'جاري الحفظ...' : (isEditing ? '💾 تحديث الملف' : '🚀 تسجيل الملف')}
            </button>
            
            {isEditing && (
              <button type="button" onClick={resetForm} style={{ ...buttonStyle, background: '#94a3b8', color: 'white' }}>
                ❌ إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#374151', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>
          📋 قائمة الملفات المستلمة ({filesList.length})
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>الرقم</th>
                <th style={thStyle}>اسم الطالب</th>
                <th style={thStyle}>ميلاد</th>
                <th style={thStyle}>صورة</th>
                <th style={thStyle}>إقرارات</th>
                <th style={thStyle}>طلب</th>
                <th style={thStyle}>دمغات</th>
                <th style={thStyle}>بطايق</th>
                <th style={thStyle}>حافظات</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>تحكم</th>
              </tr>
            </thead>
            <tbody>
              {filesList.map((file, idx) => {
                const isConfirmed = file['حالة التسليم'] === 'مؤكدة';
                return (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>{file['الرقم']}</td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{file['اسم الطالب']}</td>
                  {[ 'شهادة الميلاد', 'صورة الطالب', 'اقرارات القبول', 'طلب الالتحاق', 'الدمغات', 'صور البطايق', 'حافظات'].map(key => (
                     <td key={key} style={{...tdStyle, textAlign: 'center'}}>
                        <span style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                            background: file[key as keyof StudentFile] === 'موجود' ? '#dcfce7' : '#fee2e2',
                            color: file[key as keyof StudentFile] === 'موجود' ? '#166534' : '#991b1b'
                        }}>
                            {file[key as keyof StudentFile]}
                        </span>
                     </td>
                  ))}
                  <td style={{...tdStyle, textAlign: 'center', fontWeight: 'bold', color: isConfirmed ? '#166534' : '#d97706'}}>
                    {file['حالة التسليم']}
                  </td>
                  <td style={{...tdStyle, textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(file)} style={actionBtn('#3b82f6')}>تعديل</button>
                      <button 
                        onClick={() => handleAdmit(file.StudentID1!, file['اسم الطالب'])}
                        style={{
                            ...actionBtn(isConfirmed ? '#16a34a' : '#9ca3af'),
                            cursor: isConfirmed ? 'pointer' : 'not-allowed'
                        }}
                        disabled={!isConfirmed}
                        title={isConfirmed ? 'ترحيل للمدارس' : 'يجب تأكيد الاستلام أولاً'}
                      >
                        ترحيل
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper Styles
const thStyle: React.CSSProperties = { padding: '15px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', color: '#374151' };
const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '14px' };
const actionBtn = (color: string): React.CSSProperties => ({
    padding: '6px 12px', background: color, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
});