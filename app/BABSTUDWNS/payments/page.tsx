'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

// --- Types ---
type AttendanceRecord = {
    "الرقم": number;
    "كود الطالب": number;
    "اسم الطالب": string;
    "الكورس": string;
    "تاريخ الغياب": string;
    "الحالة": string;
    "ملاحظات": string;
};

type EnrolledCourse = {
    الرقم: number; // EnrollmentID
    CourseID: number;
    الكورس: string;
    السنتر: string;
};

// === Component ===
function StudentAttendanceContent() {
  const { user, work } = useAuthStore();
  const studentId = user?.personId ?? 0;
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseInfo, setSelectedCourseInfo] = useState<{ enrollmentId: number, courseId: number } | null>(null);
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

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
        setAttendanceRecords([]);
        return;
    }
    const [enrollmentIdStr, courseIdStr] = selectedValue.split('-');
    const enrollmentId = Number(enrollmentIdStr);
    const courseId = Number(courseIdStr);
    
    setSelectedCourseInfo({ enrollmentId, courseId });
    fetchAttendanceRecords(enrollmentId, courseId);
  };

  // === Fetch Attendance ===
  const fetchAttendanceRecords = async (enrollmentId: number, courseId: number) => {
    setLoadingRecords(true);
    setAttendanceRecords([]);
    try {
      const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${enrollmentId}&yearId=${courseId}&inpout=43`);
      const data = await res.json();
      if (data.success && data.data) {
          setAttendanceRecords(data.data);
      }
    } catch (e) { console.error(e); } 
    finally { setLoadingRecords(false); }
  };

  // === Calculations for Dashboard (Memoized for performance) ===
  const stats = useMemo(() => {
    const present = attendanceRecords.filter(r => r["الحالة"] === 'حاضر').length;
    const absent = attendanceRecords.filter(r => r["الحالة"] === 'غائب').length;
    const total = attendanceRecords.length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(0) : 0;

    return { present, absent, total, percentage };
  }, [attendanceRecords]);

  const getStatusStyle = (status: string) => {
    if (status === 'حاضر') return { bg: '#dcfce7', color: '#166534' };
    if (status === 'غائب') return { bg: '#fee2e2', color: '#991b1b' };
    return { bg: '#f1f5f9', color: '#475569' };
  };

  if (!isAuthChecked) return <div style={centerStyle}>جاري التحميل...</div>;
  if (!user || !work) return <div style={centerStyle}>جاري التحويل...</div>;

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>تقرير الحضور والغياب</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>متابعة انتظامك فى الكورسات</p>
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

      {/* === 1. Dashboard Summary Cards === */}
      {selectedCourseInfo && !loadingRecords && (
        <div style={dashboardGridStyle}>
            {/* Card 1: Attendance */}
            <div style={{...statCardStyle, background: '#f0fdf4', borderTop: '4px solid #10b981'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <div style={{...statIconCircle, background: '#10b981', color: 'white'}}>
                         <i className="fa-solid fa-user-check"></i>
                    </div>
                    <div>
                        <div style={statNumberStyle}>{stats.present}</div>
                        <div style={statLabelStyle}>أيام الحضور</div>
                    </div>
                </div>
            </div>

            {/* Card 2: Absence */}
            <div style={{...statCardStyle, background: '#fef2f2', borderTop: '4px solid #ef4444'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <div style={{...statIconCircle, background: '#ef4444', color: 'white'}}>
                         <i className="fa-solid fa-user-xmark"></i>
                    </div>
                    <div>
                        <div style={statNumberStyle}>{stats.absent}</div>
                        <div style={statLabelStyle}>أيام الغياب</div>
                    </div>
                </div>
            </div>

            {/* Card 3: Percentage */}
            <div style={{...statCardStyle, background: '#eff6ff', borderTop: '4px solid #3b82f6'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <div style={{...statIconCircle, background: '#3b82f6', color: 'white'}}>
                         <i className="fa-solid fa-chart-pie"></i>
                    </div>
                    <div>
                        <div style={statNumberStyle}>{stats.percentage}%</div>
                        <div style={statLabelStyle}>نسبة المواظبة</div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* === 2. Details Table === */}
      <div style={cardStyle}>
        {loadingRecords ? (
             <div style={{ textAlign: 'center', padding: '60px' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{color: '#3b82f6'}}></i>
            </div>
        ) : (
            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thStyle}>التاريخ</th>
                        <th style={{...thStyle, textAlign: 'right'}}>الكورس</th>
                        <th style={thStyle}>الحالة</th>
                        <th style={thStyle}>ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    {attendanceRecords.length === 0 ? (
                        <tr>
                            <td colSpan={4} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                                {!selectedCourseInfo ? 'الرجاء اختيار كورس لعرض التقرير' : 'لا توجد سجلات حضور لهذا الكورس'}
                            </td>
                        </tr>
                    ) : (
                        attendanceRecords.map((rec, i) => {
                            const statusStyle = getStatusStyle(rec["الحالة"]);
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={tdStyle}>{rec["تاريخ الغياب"]}</td>
                                    <td style={{...tdStyle, textAlign: 'right', fontWeight: '600'}}>{rec["الكورس"]}</td>
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

export default function StudentAttendancePage() {
  return (
    <Suspense fallback={<div style={centerStyle}>جاري التحميل...</div>}>
      <StudentAttendanceContent />
    </Suspense>
  );
}

// === Styles ===

const centerStyle: React.CSSProperties = { textAlign: 'center', padding: 40, direction: 'rtl' };
const headerStyle: React.CSSProperties = { 
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
    borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', 
    boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)', color: 'white', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
};
const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' };

// Styles for Dashboard Cards
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
    justifyContent: 'flex-start' // RTL handled by parent direction usually, but explicitly here
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

// Table Styles
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '14px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' };
const tdStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'center', color: '#475569', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', background: 'white' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' };