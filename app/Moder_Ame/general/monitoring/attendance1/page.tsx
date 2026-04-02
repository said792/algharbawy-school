'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- أنواع البيانات ---
interface StudentSummary {
  'اسم المدرسة'?: string;
  'إجمالي عدد الطلاب'?: number;
  'إجمالي الأيام المتاحة'?: number;
  'إجمالي أيام الغياب'?: number;
  'أيام الحضور الفعلية'?: number; 
  'أيام الحضور'?: number;         
  'نسبة الحضور'?: number;
}

interface StudentDetail {
  'مسلسل'?: number;
  'اسم الطالب'?: string;
  'تاريخ الغياب'?: string;
}

interface GroupedStudent {
  name: string;
  absences: string[];
  count: number;
}

// --- الأيقونات ---
const Icons = {
  Search: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Users: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  CalendarCheck: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>,
  CalendarX: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m15 14-5 5"></path><path d="m20 9-5 5"></path></svg>,
  Percent: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>,
  FileText: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  School: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>,
  ChevronDown: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6"/></svg>
};

export default function StudentStatisticsPage() {
  const { user, work } = useAuthStore();
  
  // --- حالات الفلاتر ---
  const [schools, setSchools] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  const [statisticType, setStatisticType] = useState<string>('شهري');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // --- حالات البيانات ---
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<StudentSummary[]>([]);
  const [detailsData, setDetailsData] = useState<StudentDetail[]>([]);

  // حالة الأكورديون
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // --- دوال الوصول للبيانات ---
  const getSchoolName = (s: any) => s['المدرسة'] || s['اسم المدرسة'] || s.SchoolNam || s.EntityName || s.name || Object.values(s).find((v: any) => typeof v === 'string') || '';
  const getSchoolId = (s: any) => s['الرقم'] || s.SchoolID || s.EntityID || s.id || Object.values(s).find((v: any) => typeof v === 'number');
  const getYearName = (y: any) => y['العام الدراسي'] || y.YearName || y.YerName || y.EntityName || y.name || Object.values(y).find((v: any) => typeof v === 'string') || '';
  const getYearId = (y: any) => y['الرقم'] || y.YearID || y.YerID || y.EntityID || y.id || Object.values(y).find((v: any) => typeof v === 'number');

  useEffect(() => {
    const fetchFilters = async () => {
        try {
            const resSchools = await fetch(`${API_URL}/api/getData/5`);
            const dataSchools = await resSchools.json();
            if (dataSchools.success) setSchools(dataSchools.data || []);

            const resYears = await fetch(`${API_URL}/api/getData/13`);
            const dataYears = await resYears.json();
            if (dataYears.success) setYears(dataYears.data || []);
        } catch(e) { console.error(e); }
        finally { setLoadingFilters(false); }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    if (user?.schoolId && !selectedSchool) setSelectedSchool(String(user.schoolId));
    if (work?.yearId && !selectedYear) setSelectedYear(String(work.yearId));
    else if (years.length > 0 && !selectedYear) {
        const current = years.find(y => String(getYearName(y)).includes(new Date().getFullYear().toString()));
        if (current) setSelectedYear(String(getYearId(current)));
    }
  }, [user, work, years]);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(firstDay.toISOString().split('T')[0]);
  }, []);

  const fetchData = async () => {
    if (!selectedSchool || !selectedYear || !startDate || !endDate) return;
    
    setLoading(true);
    setError(null);

    try {
      const inpot = 12; 
      const res = await fetch(
        `${API_URL}/api/statistics?statisticType=${statisticType}&startDate=${startDate}&endDate=${endDate}&schoolId=${selectedSchool}&yearId=${selectedYear}&inpot=${inpot}`
      );
      const result = await res.json();

      if (result.success && result.data) {
        const summary = Array.isArray(result.data[0]) ? result.data[0] : [];
        const details = Array.isArray(result.data[1]) ? result.data[1] : [];
        setSummaryData(summary);
        setDetailsData(details);
      } else {
        setSummaryData([]);
        setDetailsData([]);
      }
    } catch (err) {
      console.error('Error fetching student stats:', err);
      setError('فشل الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSchool && selectedYear && startDate && endDate) {
      fetchData();
    }
  }, [statisticType, startDate, endDate, selectedSchool, selectedYear]);

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('ar-EG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  // تجميع الطلاب
  const groupedStudents = useMemo(() => {
    const map = new Map<string, GroupedStudent>();
    detailsData.forEach((item) => {
      const name = item['اسم الطالب'] || 'غير معروف';
      const date = item['تاريخ الغياب'] || '';
      if (!map.has(name)) map.set(name, { name: name, absences: [], count: 0 });
      const student = map.get(name)!;
      if (date) { student.absences.push(date); student.count++; }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [detailsData]);

  // --- التنسيقات من صفحة الموظفين ---
  const gradients = [
    'linear-gradient(135deg, #10b981, #34d399)',
    'linear-gradient(135deg, #f59e0b, #fbbf24)',
    'linear-gradient(135deg, #ef4444, #f87171)',
    'linear-gradient(135deg, #3b82f6, #60a5fa)',
  ];
  
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1600px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f1f5f9', minHeight: '100vh' };
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' };
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
  const selectStyle: React.CSSProperties = { width: '100%', padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#334155', fontWeight: '600', outline: 'none' };

  return (
    <div style={containerStyle}>
      
      {/* العنوان */}
      <div style={{ ...cardStyle, marginBottom: '30px', borderRight: '6px solid #3b82f6' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '8px 12px', borderRadius: '12px' }}>📊</span>
          تقرير الغياب الشامل للطلاب
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>متابعة تفصيلية لحضور وغياب الطلاب حسب التاريخ</p>
      </div>

      {/* فلاتر الاختيار */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
            
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>المدرسة</label>
                <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} style={selectStyle} disabled={loadingFilters}>
                    <option value=''>{loadingFilters ? 'جاري التحميل...' : 'اختر المدرسة'}</option>
                    {schools.map((s, i) => <option key={i} value={getSchoolId(s)}>{getSchoolName(s)}</option>)}
                </select>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>العام الدراسي</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
                    <option value=''>اختر العام</option>
                    {years.map((y, i) => <option key={i} value={getYearId(y)}>{getYearName(y)}</option>)}
                </select>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>نوع التقرير</label>
                <select value={statisticType} onChange={(e) => setStatisticType(e.target.value)} style={selectStyle}>
                    <option value="شهري">شهري</option>
                    <option value="أسبوعي">أسبوعي</option>
                    <option value="يومي">يومي</option>
                </select>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>من تاريخ</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{...selectStyle, border: '1px solid #cbd5e1'}} />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>إلى تاريخ</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{...selectStyle, border: '1px solid #cbd5e1'}} />
            </div>

        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'end' }}>
             <button onClick={fetchData} disabled={loading} style={{ padding: '10px 20px', background: loading ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'opacity 0.2s' }}>
                {loading ? 'جاري التحميل...' : <><Icons.Search /><span>عرض التقرير</span></>}
             </button>
        </div>
      </div>

      {/* المحتوى */}
      {!selectedSchool || !selectedYear ? (
        <div style={{ textAlign: 'center', padding: '60px', ...cardStyle, color: '#94a3b8' }}>
            <Icons.School style={{ width: '48px', height: '48px', marginBottom: '16px', color: '#cbd5e1' }} />
            <div>يرجى اختيار المدرسة والعام الدراسي لعرض البيانات</div>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', ...cardStyle }}>جاري تحليل البيانات...</div>
      ) : (
        <>
          {/* كروت الإجماليات (تنسيق الموظفين) */}
          {summaryData.length > 0 && summaryData.map((row, idx) => {
              const totalStudents = row['إجمالي عدد الطلاب'] || 0;
              const attendanceDays = row['أيام الحضور الفعلية'] || row['أيام الحضور'] || 0;
              const totalAbsence = row['إجمالي أيام الغياب'] || 0;
              const rate = Number(row['نسبة الحضور'] || 0).toFixed(1);
              return (
                <div key={idx} style={{ ...gridStyle, marginBottom: '30px' }}>
                  <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>إجمالي الطلاب</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{totalStudents}</div>
                    </div>
                    <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '12px', fontSize: '20px' }}><Icons.Users /></div>
                  </div>
                  
                  <div style={{ ...cardStyle, borderBottom: '4px solid #ef4444' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>أيام الغياب</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626' }}>{totalAbsence}</div></div>
                  
                  <div style={{ ...cardStyle, borderBottom: '4px solid #10b981' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>الحضور</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#059669' }}>{attendanceDays}</div></div>

                  <div style={{ ...cardStyle, borderBottom: '4px solid #8b5cf6' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>نسبة الحضور</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#7c3aed' }}>{rate}%</div></div>
                </div>
              );
          })}

          {/* كروت الطلاب (تصميم الموظفين مع المنطق الجديد) */}
          {(groupedStudents.length > 0) && (
            <div>
              <h3 style={{ marginBottom: '15px', fontWeight: 'bold', color: '#334155', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Users style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                سجل الطلاب المتغيبين ({groupedStudents.length})
              </h3>
              <div style={gridStyle}>
                {groupedStudents.map((student, idx) => {
                  const isExpanded = expandedStudent === student.name;
                  const bg = gradients[idx % gradients.length];
                  const initial = student.name.charAt(0);
                  
                  return (
                    <div key={student.name} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white', transition: 'transform 0.2s' }} 
                         onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} 
                         onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                      
                      {/* Header متلون */}
                      <div style={{ background: bg, padding: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                           onClick={() => setExpandedStudent(isExpanded ? null : student.name)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <span style={{ background: 'rgba(255,255,255,0.2)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{initial}</span>
                           {student.name}
                        </span>
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{student.count} غياب</span>
                      </div>
                      
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px' }}>
                          <span>العدد الكلي</span>
                          <span style={{ color: '#1e293b', fontWeight: 'bold' }}>{student.count}</span>
                        </div>
                        
                        <div style={{ color: '#ef4444', fontWeight: '600', padding: '4px', background: '#fef2f2', borderRadius: '6px', textAlign: 'center', fontSize: '12px' }}>
                           تاريخ الغياب
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#3b82f6', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', fontSize: '12px', alignItems: 'center', cursor: 'pointer' }}
                             onClick={() => setExpandedStudent(isExpanded ? null : student.name)}>
                          <span>عرض التفاصيل</span>
                          <span style={{ transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}><Icons.ChevronDown /></span>
                        </div>
                      </div>

                      {/* Accordion Details */}
                      {isExpanded && (
                        <div style={{ padding: '0 12px 12px 12px' }}>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                             {student.absences.map((date, i) => (
                               <span key={i} style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                 {formatDate(date)}
                               </span>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {groupedStudents.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px', ...cardStyle, color: '#94a3b8' }}>
                <div style={{ background: '#f0fdf4', color: '#10b981', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' }}>
                  <Icons.CalendarCheck />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>لا توجد غيابات</h3>
                <p>جميع الطلاب حاضرون في هذه الفترة</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}