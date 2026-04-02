'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config'; // ✅ التعديل هنا: الاستيراد من ملف الكونفيج

export default function AddCoursePage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
const personId = user?.personId || 0;

  // States
  const [courseId, setCourseId] = useState<number>(1);
  const [courseName, setCourseName] = useState('');
  const [price, setPrice] = useState('');
  const [sessions, setSessions] = useState('');
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 1. جلب البيانات الأولية
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // جلب رقم الكود (INPOT 71)
        const resId = await fetch(`${API_URL}/api/getData/71`);
        if (resId.ok) {
            const json = await resId.json();
            if (json.success && json.data?.[0]) {
                const id = json.data[0]['NextID'] || Object.values(json.data[0])[0];
                setCourseId(Number(id) || 1);
            }
        }

        // جلب الموظفين (INPOT 16)
if (personId) {
  const resEmp = await fetch(`${API_URL}/api/getData1/16?id=${personId}`);
  if (resEmp.ok) {
    const jsonEmp = await resEmp.json();
    if (jsonEmp.success) setEmployees(jsonEmp.data || []);
  }
}
 
        // جلب المواد (INPOT 35)
        const resSub = await fetch(`${API_URL}/api/getData/35`);
        if (resSub.ok) {
            const jsonSub = await resSub.json();
            if (jsonSub.success) setSubjects(jsonSub.data || []);
        }

      } catch (err) {
        console.error('Error fetching initial data:', err);
        setMessage({ text: 'فشل في جلب البيانات الأساسية', type: 'error' });
      } finally {
        setLoadingData(false);
      }
    };

    if (schoolId) fetchData();
 }, [schoolId, personId]);

  // 2. دالة الحفظ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSubject || !selectedEmployee) {
      setMessage({ text: 'الرجاء اختيار المادة والمحاضر', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch(`${API_URL}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: courseId,
          schoolId: schoolId,
          subjectId: Number(selectedSubject),
          employeeId: Number(selectedEmployee),
          courseName: courseName,
          price: parseFloat(price),
          sessions: parseInt(sessions),
          processType: 1, // 1 للإضافة
        }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessage({ text: 'تم إضافة الكورس بنجاح', type: 'success' });
        // تفريغ الحقول
        setCourseName('');
        setPrice('');
        setSessions('');
        setSelectedSubject('');
        setSelectedEmployee('');
        // تحديث الرقم
        setCourseId(prev => prev + 1); 
      } else {
        setMessage({ text: data.error || data.message || 'حدث خطأ في الحفظ', type: 'error' });
      }
    } catch (err) {
        console.error(err);
        setMessage({ text: 'فشل الاتصال بالخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
        <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#6366f1' }}></i>
        </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fa-solid fa-chalkboard-user" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>إضافة كورس جديد</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>إدارة المجموعات المدرسية والكورسات</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        <form onSubmit={handleSubmit}>
            <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    
                    {/* رقم الكود */}
                    <div className="form-group">
                        <label style={labelStyle}>رقم الكود</label>
                        <input 
                            style={{ ...inputStyle, background: '#f8fafc' }} 
                            value={courseId} 
                            readOnly 
                        />
                    </div>

                    {/* اسم الكورس */}
                    <div className="form-group">
                        <label style={labelStyle}>اسم الكورس</label>
                        <input 
                            style={inputStyle} 
                            value={courseName}
                            onChange={e => setCourseName(e.target.value)}
                            placeholder="مثال: مجموعة تقوية رياضيات"
                            required 
                        />
                    </div>

                    {/* المادة الدراسية */}
                    <div className="form-group">
                        <label style={labelStyle}>المادة الدراسية</label>
                        <select 
                            value={selectedSubject} 
                            onChange={e => setSelectedSubject(e.target.value)}
                            style={inputStyle}
                            required
                        >
                            <option value="">اختر المادة</option>
                            {subjects.map((sub: any) => (
                                <option key={sub.SubjectID || sub['الرقم']} value={sub.SubjectID || sub['الرقم']}>
                                    {sub.SubjectName || sub['المادة']}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* المحاضر */}
                    <div className="form-group">
                        <label style={labelStyle}>المحاضر / المعلم</label>
                        <select 
                            value={selectedEmployee} 
                            onChange={e => setSelectedEmployee(e.target.value)}
                            style={inputStyle}
                            required
                        >
                            <option value="">اختر المحاضر</option>
                            {employees.map((emp: any) => (
                                <option key={emp.EmployeeID || emp['id']} value={emp.EmployeeID || emp['id']}>
                                    {emp.EmploeArName || emp['name']}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* السعر */}
                    <div className="form-group">
                        <label style={labelStyle}>السعر</label>
                        <input 
                            type="number"
                            step="0.01"
                            style={inputStyle} 
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            placeholder="0.00"
                            required 
                        />
                    </div>

                    {/* عدد الحصص */}
                    <div className="form-group">
                        <label style={labelStyle}>عدد الحصص في الباكيج</label>
                        <input 
                            type="number"
                            style={inputStyle} 
                            value={sessions}
                            onChange={e => setSessions(e.target.value)}
                            placeholder="مثال: 12 حصة"
                            required 
                        />
                    </div>

                </div>

                {/* رسائل النظام */}
                {message.text && (
                    <div style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                    }}>
                        <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{message.text}</span>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: '#fafafa' }}>
                <button type="button" style={cancelBtnStyle} onClick={() => window.location.reload()}>
                    <i className="fa-solid fa-rotate-right" style={{ marginLeft: '8px' }}></i>
                    تحديث
                </button>
                <button type="submit" style={saveBtnStyle} disabled={loading}>
                    {loading ? (
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i>
                    ) : (
                        <i className="fa-solid fa-check" style={{ marginLeft: '8px' }}></i>
                    )}
                    {loading ? 'جاري الحفظ...' : 'حفظ الكورس'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}

// Styles
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' };
const inputStyle: React.CSSProperties = { 
    width: '100%', 
    padding: '12px 16px', 
    border: '2px solid #e2e8f0', 
    borderRadius: '10px', 
    fontSize: '15px', 
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: 'white'
};
const saveBtnStyle: React.CSSProperties = { 
    padding: '12px 24px', 
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '10px', 
    fontSize: '15px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
};
const cancelBtnStyle: React.CSSProperties = { 
    padding: '12px 24px', 
    background: '#f1f5f9', 
    color: '#475569', 
    border: 'none', 
    borderRadius: '10px', 
    fontSize: '15px', 
    fontWeight: '500', 
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
};