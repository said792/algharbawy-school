'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

// --- Types ---
// تعريف شكل بيانات الدفع
type PaymentRecord = {
    "الرقم": number;
    "تاريخ الدفع": string;
    "المبلغ": number;
    "الحالة": string; // مدفوع، متأخر، جزئي... إلخ
    "ملاحظات": string;
    "المتبقي"?: number; // لو في حقل للمتبقي
};

type EnrolledCourse = {
    الرقم: number; // EnrollmentID
    CourseID: number;
    الكورس: string;
    السنتر: string;
};

// === Component ===
function StudentPaymentsContent() {
  const { user, work } = useAuthStore();
  const studentId = user?.personId ?? 0;
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseInfo, setSelectedCourseInfo] = useState<{ enrollmentId: number, courseId: number } | null>(null);
  
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAuthChecked(true);
      if (!user || !work) window.location.href = '/login';
    }, 0);
    return () => clearTimeout(timeout);
  }, [user, work]);

  useEffect(() => {
    if (!isAuthChecked || !studentId) return;
    fetchEnrolledCourses();
  }, [studentId, isAuthChecked]);

  // === Fetch Courses ===
  const fetchEnrolledCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await fetch(`${API_URL}/api/getData1/43?id=${studentId}`); 
      const data = await res.json();
      if (data.success && data.data) setEnrolledCourses(data.data);
    } catch (e) { console.error(e); } 
    finally { setLoadingCourses(false); }
  };

  // === Handle Change ===
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (!selectedValue) {
        setSelectedCourseInfo(null);
        setPaymentRecords([]);
        return;
    }
    const [enrollmentIdStr, courseIdStr] = selectedValue.split('-');
    const enrollmentId = Number(enrollmentIdStr);
    const courseId = Number(courseIdStr);
    
    setSelectedCourseInfo({ enrollmentId, courseId });
    fetchPaymentRecords(enrollmentId, courseId);
  };

  // === Fetch Payments ===
  const fetchPaymentRecords = async (enrollmentId: number, courseId: number) => {
    setLoadingPayments(true);
    setPaymentRecords([]);
    try {
      // الاستدعاء لـ API المدفوعات
      // نستخدم inpout=45 (مثلا) للمدفوعات
      const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${enrollmentId}&yearId=${courseId}&inpout=44`);
      
      const data = await res.json();
      if (data.success && data.data) {
          setPaymentRecords(data.data);
      }
    } catch (e) { console.error(e); } 
    finally { setLoadingPayments(false); }
  };

  // === Calculations for Dashboard ===
  const stats = useMemo(() => {
    // حساب إجمالي المدفوع
    const totalPaid = paymentRecords.reduce((sum, r) => sum + (Number(r["المبلغ"]) || 0), 0);
    
    // حساب إجمالي المتبقي/المتأخرات (لو الحقل موجود)
    const totalRemaining = paymentRecords.reduce((sum, r) => sum + (Number(r["المتبقي"]) || 0), 0);
    
    // عدد الدفعات
    const count = paymentRecords.length;

    return { totalPaid, totalRemaining, count };
  }, [paymentRecords]);

  const getStatusStyle = (status: string) => {
    if (status === 'مدفوع') return { bg: '#dcfce7', color: '#166534' };
    if (status === 'متأخر' || status === 'متبقي') return { bg: '#fee2e2', color: '#991b1b' };
    if (status === 'جزئي') return { bg: '#fef9c3', color: '#854d0e' };
    return { bg: '#f1f5f9', color: '#475569' };
  };

  if (!isAuthChecked) return <div style={centerStyle}>جاري التحميل...</div>;
  if (!user || !work) return <div style={centerStyle}>جاري التحويل...</div>;

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{...headerStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'}}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>تقرير المدفوعات والمتأخرات</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>متابعة التزامك المادي</p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ ...cardStyle, marginBottom: '20px', padding: '20px' }}>
        <div style={{ maxWidth: '400px' }}>
            <label style={labelStyle}>اختر الكورس:</label>
            <select 
                onChange={handleCourseChange}
                style={inputStyle}
                disabled={loadingCourses}
                defaultValue=""
            >
                <option value="" disabled>-- اختر كورس --</option>
                {enrolledCourses.map((c) => (
                    <option key={c['الرقم']} value={`${c['الرقم']}-${c.CourseID}`}>
                        {c['الكورس']} - {c['السنتر']}
                    </option>
                ))}
            </select>
        </div>
      </div>

      {/* === Dashboard Summary Cards === */}
      {selectedCourseInfo && !loadingPayments && (
        <div style={dashboardGridStyle}>
            {/* Card 1: Total Paid */}
            <div style={{...statCardStyle, background: '#f0fdf4', borderTop: '4px solid #10b981'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <div style={{...statIconCircle, background: '#10b981', color: 'white'}}>
                         <i className="fa-solid fa-hand-holding-dollar"></i>
                    </div>
                    <div>
                        <div style={statNumberStyle}>{stats.totalPaid}</div>
                        <div style={statLabelStyle}>إجمالي المدفوع (ج.م)</div>
                    </div>
                </div>
            </div>

            {/* Card 2: Total Delays/Remaining */}
            <div style={{...statCardStyle, background: '#fef2f2', borderTop: '4px solid #ef4444'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <div style={{...statIconCircle, background: '#ef4444', color: 'white'}}>
                         <i className="fa-solid fa-clock"></i>
                    </div>
                    <div>
                        <div style={statNumberStyle}>{stats.totalRemaining}</div>
                        <div style={statLabelStyle}>إجمالي المتأخرات (ج.م)</div>
                    </div>
                </div>
            </div>

            {/* Card 3: Payments Count */}
            <div style={{...statCardStyle, background: '#eff6ff', borderTop: '4px solid #3b82f6'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <div style={{...statIconCircle, background: '#3b82f6', color: 'white'}}>
                         <i className="fa-solid fa-list-ol"></i>
                    </div>
                    <div>
                        <div style={statNumberStyle}>{stats.count}</div>
                        <div style={statLabelStyle}>عدد الدفعات</div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* === Details Table === */}
      <div style={cardStyle}>
        {loadingPayments ? (
             <div style={{ textAlign: 'center', padding: '60px' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{color: '#8b5cf6'}}></i>
            </div>
        ) : (
            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thStyle}>التاريخ</th>
                        <th style={thStyle}>المبلغ المدفوع</th>
                        <th style={thStyle}>المتبقي</th>
                        <th style={thStyle}>الحالة</th>
                        <th style={thStyle}>ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    {paymentRecords.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                                {!selectedCourseInfo ? 'الرجاء اختيار كورس لعرض التقرير' : 'لا توجد سجلات مالية لهذا الكورس'}
                            </td>
                        </tr>
                    ) : (
                        paymentRecords.map((rec, i) => {
                            const statusStyle = getStatusStyle(rec["الحالة"]);
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={tdStyle}>{rec["تاريخ الدفع"]}</td>
                                    <td style={{...tdStyle, fontWeight: '700', color: '#166534'}}>{rec["المبلغ"]}</td>
                                    <td style={{...tdStyle, fontWeight: '700', color: '#991b1b'}}>{rec["المتبقي"] || '-'}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            background: statusStyle.bg, color: statusStyle.color,
                                            padding: '4px 12px', borderRadius: '20px', fontWeight: '600', fontSize: '13px'
                                        }}>
                                            {rec["الحالة"]}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{rec["ملاحظات"] || '-'}</td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
}

export default function StudentPaymentsPage() {
  return (
    <Suspense fallback={<div style={centerStyle}>جاري التحميل...</div>}>
      <StudentPaymentsContent />
    </Suspense>
  );
}

// === Styles ===
// (نفس الستايل المستخدم في صفحة الحضور)

const centerStyle: React.CSSProperties = { textAlign: 'center', padding: 40, direction: 'rtl' };
const headerStyle: React.CSSProperties = { 
    borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', 
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)', color: 'white', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
};
const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' };

const dashboardGridStyle: React.CSSProperties = { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
    gap: '20px', 
    marginBottom: '24px' 
};

const statCardStyle: React.CSSProperties = {
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
};

const statIconCircle: React.CSSProperties = {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
};

const statNumberStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1e293b',
    lineHeight: 1
};

const statLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '5px',
    fontWeight: '600'
};

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '14px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' };
const tdStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'center', color: '#475569', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', background: 'white' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' };