'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === السطر السحري لإصلاح مشكلة البناء ===
export const dynamic = 'force-dynamic';

// --- Types ---
type Course = {
  الرقم: number;
  'اسم الكورس': string;
  المادة: string;
  المحاضر: string;
  السعر: number;
};

type Enrollment = {
  EnrollmentID: number;
  CourseID: number;
  ArbStudName: string;
  Status: string;
};

type Payment = {
  الرقم: number;
  'كود الكورس': number;
  'المبلغ المدفوع': number;
  'حالة الدفع': boolean;
  'تاريخ الدفع': string;
  'اسم الطالب': string;
};

// === 1. مكون المحتوى (داخل Suspense) ===
function CoursesDashboardContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();

  // === منطق قراءة المعرفات (دعم الرابط والمستخدم العادي) ===
  const externalSchoolId = searchParams.get('schoolId');
  const externalSchoolName = searchParams.get('schoolName');
  const targetSchoolId = externalSchoolId || user?.schoolId || 1;
  const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة';

  // --- States ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // --- Detail Modal State ---
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState('students');

  // === التحقق من تسجيل الدخول (تم الإصلاح) ===
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAuthChecked(true);
      if (!user) {
        window.location.href = '/login'; 
      }
    }, 500); // مهلة 500ms

    return () => clearTimeout(timer);
  }, [user]);

  // --- Effects ---
  useEffect(() => {
    loadAllData();
  }, [targetSchoolId]);

  // --- Data Fetching (استخدام targetSchoolId) ---
  const loadAllData = async () => {
    if (!targetSchoolId) return;
    
    setLoading(true);
    try {
      const [coursesRes, enrollmentsRes, paymentsRes] = await Promise.all([
        fetch(`${API_URL}/api/getData1/10?id=${targetSchoolId}`).then(r => r.json()),
        fetch(`${API_URL}/api/getData1/48?id=${targetSchoolId}`).then(r => r.json()),
        fetch(`${API_URL}/api/getData1/49?id=${targetSchoolId}`).then(r => r.json())
      ]);

      if (coursesRes.success) setCourses(coursesRes.data || []);

      if (enrollmentsRes.success && enrollmentsRes.data) {
        const formatted = enrollmentsRes.data.map((e: any) => ({
          EnrollmentID: e['الرقم'],
          CourseID: e.CourseID,
          ArbStudName: e['الطالب'],
          Status: e['حالة الطالب']
        }));
        setEnrollments(formatted);
      }

      if (paymentsRes.success && paymentsRes.data) {
        setPayments(paymentsRes.data);
      }

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // --- Logic Helpers ---
  const getStudentCount = (courseId: number) => {
    return enrollments.filter(e => e.CourseID === courseId).length;
  };

  const getTotalRevenue = (courseId: number) => {
    const courseEnrollmentIds = enrollments
      .filter(e => e.CourseID === courseId)
      .map(e => e.EnrollmentID);

    const total = payments
      .filter(p => courseEnrollmentIds.includes(p['كود الكورس']))
      .reduce((sum, p) => sum + (p['المبلغ المدفوع'] || 0), 0);
      
    return total;
  };

  const openDetails = (course: Course) => {
    setSelectedCourse(course);
    setActiveTab('students');
  };

  // --- Filtered Data for Modal ---
  const courseStudents = selectedCourse 
    ? enrollments.filter(e => e.CourseID === selectedCourse['الرقم'])
    : [];

  const courseEnrollmentIds = selectedCourse 
    ? enrollments.filter(e => e.CourseID === selectedCourse['الرقم']).map(e => e.EnrollmentID)
    : [];

  const coursePayments = selectedCourse
    ? payments.filter(p => courseEnrollmentIds.includes(p['كود الكورس']))
    : [];

  // === فحص الحالة قبل العرض ===
  if (!isAuthChecked) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal' }}>جاري التحقق من الصلاحيات...</div>;
  }
  if (!user) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal' }}>جاري تحويلك لصفحة الدخول...</div>;
  }

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b' }}>📊 لوحة تحكم المجموعات</h1>
        <p style={{ color: '#64748b' }}>
            نظرة عامة على كورسات: <span style={{fontWeight: 'bold', color: '#059669'}}>{externalSchoolId ? displaySchoolName : 'المدرسة'}</span>
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', fontSize: '18px' }}>
            جاري تحميل بيانات الكورسات...
        </div>
      ) : (
        /* Grid of Cards */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
            
            {courses.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', padding: '40px', background: 'white', borderRadius: '16px' }}>
                    لا توجد كورسات مسجلة حالياً
                </div>
            )}

            {courses.map((course) => (
                <div 
                    key={course['الرقم']} 
                    onClick={() => openDetails(course)}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        border: '1px solid #f1f5f9'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(16, 185, 129, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
                    }}
                >
                    {/* Card Header */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                        padding: '20px',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.2, fontSize: '80px' }}>
                            🎓
                        </div>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', position: 'relative', zIndex: 1 }}>
                            {course['اسم الكورس']}
                        </h3>
                        <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px', position: 'relative', zIndex: 1 }}>
                            {course['المادة']} | {course['المحاضر']}
                        </p>
                    </div>

                    {/* Card Body - Stats */}
                    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {/* Stat 1: Students */}
                        <div style={{ textAlign: 'center', padding: '15px', background: '#f0fdf4', borderRadius: '12px' }}>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669' }}>
                                {getStudentCount(course['الرقم'])}
                            </div>
                            <div style={{ fontSize: '13px', color: '#065f46', marginTop: '5px' }}>
                                👥 طالب مسجل
                            </div>
                        </div>

                        {/* Stat 2: Revenue */}
                        <div style={{ textAlign: 'center', padding: '15px', background: '#ecfdf5', borderRadius: '12px' }}>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: '#047857' }}>
                                {getTotalRevenue(course['الرقم']).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '13px', color: '#065f46', marginTop: '5px' }}>
                                💰 جنيه إيرادات
                            </div>
                        </div>
                    </div>

                    {/* Card Footer */}
                    <div style={{ padding: '10px 20px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        اضغط لعرض التفاصيل الكاملة
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* --- Details Modal --- */}
      {selectedCourse && (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 1000, padding: '20px', backdropFilter: 'blur(5px)'
        }} onClick={() => setSelectedCourse(null)}>
            
            <div style={{
                background: 'white', borderRadius: '24px', width: '900px', maxWidth: '100%', 
                maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }} onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)', 
                    padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{margin: 0, fontSize: '24px'}}>{selectedCourse['اسم الكورس']}</h2>
                        <p style={{margin: '5px 0 0', opacity: 0.8}}>{selectedCourse['المحاضر']} - {selectedCourse['المادة']}</p>
                    </div>
                    <button onClick={() => setSelectedCourse(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px' }}>
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 20px', background: '#f8fafc' }}>
                    {[
                        { id: 'students', label: 'قائمة الطلاب', icon: '👥' },
                        { id: 'payments', label: 'سجل المدفوعات', icon: '💵' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '15px 20px', border: 'none', background: 'transparent',
                                borderBottom: activeTab === tab.id ? '3px solid #10b981' : '3px solid transparent',
                                color: activeTab === tab.id ? '#10b981' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Modal Content */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {activeTab === 'students' && (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={thStyle}>الطالب</th>
                                    <th style={thStyle}>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courseStudents.length === 0 ? (
                                    <tr><td colSpan={2} style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>لا يوجد طلاب</td></tr>
                                ) : (
                                    courseStudents.map((s, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={tdStyle}>{s.ArbStudName}</td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                                    background: s.Status === 'نشط' ? '#dcfce7' : '#fef3c7',
                                                    color: s.Status === 'نشط' ? '#166534' : '#92400e'
                                                }}>
                                                    {s.Status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'payments' && (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={thStyle}>الطالب</th>
                                    <th style={thStyle}>المبلغ</th>
                                    <th style={thStyle}>التاريخ</th>
                                    <th style={thStyle}>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coursePayments.length === 0 ? (
                                    <tr><td colSpan={4} style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>لا توجد مدفوعات</td></tr>
                                ) : (
                                    coursePayments.map((p, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={tdStyle}>{p['اسم الطالب']}</td>
                                            <td style={{...tdStyle, fontWeight: '700', color: '#059669'}}>{p['المبلغ المدفوع']} ج.م</td>
                                            <td style={tdStyle}>{p['تاريخ الدفع']}</td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                                    background: p['حالة الدفع'] ? '#dcfce7' : '#fee2e2',
                                                    color: p['حالة الدفع'] ? '#166534' : '#991b1b'
                                                }}>
                                                    {p['حالة الدفع'] ? 'مؤكد' : 'معلق'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// === 2. المكون الرئيسي (ال Wrapper مع Suspense) ===
export default function CoursesDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal', color: '#64748b' }}>جاري التحميل...</div>}>
      <CoursesDashboardContent />
    </Suspense>
  );
}

// --- Styles ---
const thStyle: React.CSSProperties = { padding: '12px 10px', textAlign: 'right', fontWeight: '600', color: '#64748b', fontSize: '13px' };
const tdStyle: React.CSSProperties = { padding: '12px 10px', textAlign: 'right', color: '#334155', fontSize: '14px' };