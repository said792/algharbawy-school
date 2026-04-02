'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// نوع البيانات للموعد
type ScheduleItem = {
    ScheduleID: number;
    DayOfWeek: string;
    StartTime: string;
    EndTime: string;
};

export default function AddCourseSchedulePage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;

  const [scheduleId, setScheduleId] = useState<number>(1);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');

  const [dayOfWeek, setDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // States for Schedules List
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 1. جلب البيانات الأساسية (الكورسات والرقم التسلسلي)
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const resId = await fetch(`${API_URL}/api/getData/72`);
        if (resId.ok) {
          const json = await resId.json();
          if (json.success && json.data?.[0]) {
            const id = json.data[0]['NextID'] || Object.values(json.data[0])[0];
            setScheduleId(Number(id) || 1);
          }
        }

        const resCourses = await fetch(`${API_URL}/api/getData1/10?id=${schoolId}`);
        if (resCourses.ok) {
          const json = await resCourses.json();
          if (json.success) setCourses(json.data || []);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [schoolId]);

  // 2. جلب المواعيد عند اختيار كورس
  useEffect(() => {
    const fetchSchedules = async () => {
        if (!courseId) {
            setSchedules([]);
            return;
        }

        setLoadingSchedules(true);
        try {
         const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${schoolId}&sch2=${courseId}&inpot=${32}`);
            const data = await res.json();
            if (data.success) {
                setSchedules(data.data || []);
            }
        } catch (err) {
            console.error('خطأ في جلب المواعيد', err);
        } finally {
            setLoadingSchedules(false);
        }
    };

    fetchSchedules();
  }, [courseId, schoolId]);

   // 3. الحفظ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseId || !dayOfWeek || !startTime || !endTime) {
        setMessage({ text: 'الرجاء استكمال جميع البيانات', type: 'error' });
        return;
    }

    // --- بداية كود التحقق من التعارض ---
    
    // التحقق من أن وقت النهاية أكبر من وقت البداية
    if (startTime >= endTime) {
        setMessage({ text: 'وقت النهاية يجب أن يكون بعد وقت البداية', type: 'error' });
        return;
    }

    // فحص هل يوجد تعارض مع موعد موجود
    const isConflict = schedules.some((sch) => {
        // 1. التحقق من تطابق اليوم
        if (sch.DayOfWeek !== dayOfWeek) return false;

        // 2. تجهيز الوقت القديم (بافتراض أن البيانات قد تكون بصيغة DateTime أو Text)
        let oldStart = sch.StartTime;
        let oldEnd = sch.EndTime;

        // لو الوقت راجع بصيغة ISO (يحتوي على T)، نقص الجزء الخاص بالوقت فقط
        if (oldStart && oldStart.includes('T')) oldStart = oldStart.substring(11, 16);
        if (oldEnd && oldEnd.includes('T')) oldEnd = oldEnd.substring(11, 16);

        // 3. المعادلة الرياضية لاكتشاف تداخل الأوقات
        // يوجد تداخل إذا: (بداية الجديد < نهاية القديم) و (نهاية الجديد > بداية القديم)
        return (startTime < oldEnd) && (endTime > oldStart);
    });

    if (isConflict) {
        setMessage({ text: 'تعارض في المواعيد: يوجد محاضرة أخرى في هذا التوقيت بنفس اليوم!', type: 'error' });
        return;
    }

    // --- نهاية كود التحقق ---

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch(`${API_URL}/api/courseSchedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sch1: scheduleId,
          sch2: schoolId,
          sch3: Number(courseId),
          sch4: dayOfWeek,
          sch5: startTime,
          sch6: endTime,
          INPOT: 1
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ text: 'تم حفظ الموعد بنجاح', type: 'success' });
        
        // تفريغ الحقول
        setDayOfWeek('');
        setStartTime('');
        setEndTime('');
        setScheduleId(prev => prev + 1);
        
        // تحديث قائمة المواعيد مباشرة بعد الحفظ
        setSchedules(prev => [...prev, { 
            ScheduleID: scheduleId, 
            DayOfWeek: dayOfWeek, 
            StartTime: startTime, 
            EndTime: endTime 
        }]);

      } else {
        // لو السيرفر رجع خطأ (مثلاً قيد آخر في الداتا بيز)
        setMessage({ text: data.error || 'حدث خطأ أثناء الحفظ', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'فشل الاتصال بالسيرفر', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#8b5cf6' }}></i>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '24px',
        boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fa-solid fa-calendar-plus" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>تحديد مواعيد الكورسات</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>إضافة ومتابعة مواعيد المجموعات الدراسية</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        <form onSubmit={handleSubmit}>
            <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    
                    {/* رقم الكود */}
                    <div className="form-group">
                        <label style={labelStyle}>رقم الكود</label>
                        <input style={{ ...inputStyle, background: '#f8fafc' }} value={scheduleId} readOnly />
                    </div>

                    {/* الكورس */}
                    <div className="form-group">
                        <label style={labelStyle}>الكورس</label>
                        <select 
                            value={courseId} 
                            onChange={e => setCourseId(e.target.value)}
                            style={inputStyle}
                            required
                        >
                            <option value="">اختر الكورس</option>
                            {courses.map((c: any) => (
                                <option key={c.CourseID || c['الرقم']} value={c.CourseID || c['الرقم']}>
                                    {c.CourseName || c['اسم الكورس']}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* اليوم */}
                    <div className="form-group">
                        <label style={labelStyle}>اليوم</label>
                        <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} style={inputStyle} required>
                            <option value="">اختر اليوم</option>
                            <option value="السبت">السبت</option>
                            <option value="الأحد">الأحد</option>
                            <option value="الاثنين">الاثنين</option>
                            <option value="الثلاثاء">الثلاثاء</option>
                            <option value="الأربعاء">الأربعاء</option>
                            <option value="الخميس">الخميس</option>
                            <option value="الجمعة">الجمعة</option>
                        </select>
                    </div>

                    {/* وقت البداية */}
                    <div className="form-group">
                        <label style={labelStyle}>وقت البداية</label>
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} required />
                    </div>

                    {/* وقت النهاية */}
                    <div className="form-group">
                        <label style={labelStyle}>وقت النهاية</label>
                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} required />
                    </div>

                </div>

                {message.text && (
                    <div style={{
                        marginTop: '20px', padding: '12px 16px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: message.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                    }}>
                        <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{message.text}</span>
                    </div>
                )}
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: '#fafafa' }}>
                <button type="submit" style={saveBtnStyle} disabled={loading}>
                    {loading ? <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i> : <i className="fa-solid fa-check" style={{ marginLeft: '8px' }}></i>}
                    {loading ? 'جاري الحفظ...' : 'حفظ الموعد'}
                </button>
            </div>
        </form>
      </div>

      {/* قسم عرض المواعيد المسجلة - يظهر فقط لما نختار كورس */}
      {courseId && (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            animation: 'fadeIn 0.3s ease-in-out'
        }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-calendar-check" style={{ color: '#8b5cf6' }}></i>
                    المواعيد المسجلة لهذا الكورس
                </h3>
            </div>

            {loadingSchedules ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '20px', color: '#8b5cf6' }}></i>
                </div>
            ) : schedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                    لا توجد مواعيد مسجلة لهذا الكورس بعد
                </div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={thStyle}>اليوم</th>
                            <th style={thStyle}>من الساعة</th>
                            <th style={thStyle}>إلى الساعة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedules.map((sch, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={tdStyle}>
                                    <span style={{
                                        background: '#ede9fe', color: '#5b21b6',
                                        padding: '4px 12px', borderRadius: '6px', fontWeight: '600'
                                    }}>
                                        {sch.DayOfWeek}
                                    </span>
                                </td>
                                <td style={tdStyle}>{sch.StartTime}</td>
                                <td style={tdStyle}>{sch.EndTime}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// Styles
const thStyle: React.CSSProperties = { padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '14px', borderBottom: '2px solid #e2e8f0' };
const tdStyle: React.CSSProperties = { padding: '14px 20px', textAlign: 'center', color: '#475569', fontSize: '14px' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'white' };
const saveBtnStyle: React.CSSProperties = { padding: '12px 24px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' };