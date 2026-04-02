'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const dynamic = 'force-dynamic';

// === الواجهات (Interfaces) ===
interface StudentSummary {
    'إجمالي عدد الطلاب': number;
    'نسبة الحضور': number;
    'إجمالي أيام الغياب': number;
}

interface StudentAbsenceDetail {
    'مسلسل': number;
    'اسم الطالب': string;
    'تاريخ الغياب': string;
}

interface StudentWarningProfile {
  الطالب: string;
  الصف: string;
  warnings: { type: string; count: number; dates: string[] }[];
}

interface StudentViolationProfile {
  الطالب: string;
  الصف: string;
  violations: { المخالفة: string; العقوبة: string; التاريخ: string }[];
}

interface PermissionProfile {
  الطالب: string;
  الصف: string;
  count: number;
  records: { date: string; time: string; reason: string }[];
}

// === المكون الداخلي ===
function StudentDashboardContent() {
  const { user } = useAuthStore();
  
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  // حالات البيانات
  const [summaryData, setSummaryData] = useState<StudentSummary | null>(null);
  const [absenceData, setAbsenceData] = useState<StudentAbsenceDetail[]>([]);
  const [warningsData, setWarningsData] = useState<StudentWarningProfile[]>([]);
  const [violationsData, setViolationsData] = useState<StudentViolationProfile[]>([]);
  const [permissionsData, setPermissionsData] = useState<PermissionProfile[]>([]);
  
  const [loading, setLoading] = useState(false);
  
  // الفلاتر
  const [schools, setSchools] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [statisticType, setStatisticType] = useState('شهري');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterName, setFilterName] = useState('');
  
  const [activeTab, setActiveTab] = useState<'absence' | 'warnings' | 'violations' | 'permissions'>('absence');
  
  const tableRef = useRef<HTMLDivElement>(null);

  // === دوال مساعدة ===
  const formatNumber = (num: number) => new Intl.NumberFormat('ar-EG').format(num);
  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('ar-EG') : '-';
  
  const getSchoolName = (s: any) => s['المدرسة'] || s.SchoolName || s.EntityName || s.name;
  const getSchoolId = (s: any) => s['الرقم'] || s.SchoolID || s.EntityID || s.id || Object.values(s).find((v: any) => typeof v === 'number');
  const getYearName = (y: any) => y['العام الدراسي'] || y.YearName || y.EntityName || y.name || Object.values(y).find((v: any) => typeof v === 'string');
  const getYearId = (y: any) => y['الرقم'] || y.YearID || y.EntityID || y.id || Object.values(y).find((v: any) => typeof v === 'number');

  // دالة مساعدة للتحقق من التاريخ (هل يقع بين البداية والنهاية؟)
  const isDateInRange = (dateStr: string) => {
    if (!dateStr || !startDate || !endDate) return true; // إذا لم تكن هناك تواريخ، أظهر الكل
    try {
        const d = new Date(dateStr);
        const start = new Date(startDate);
        const end = new Date(endDate);
        // ضبط الوقت لتجنب مشاكل الساعات
        d.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return d >= start && d <= end;
    } catch {
        return true;
    }
  };

  // 1. التحقق والتحميل الأولي
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAuthChecked(true);
      if (!user) window.location.href = '/login';
    }, 0);
    return () => clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    const fetchDropdowns = async () => {
        try {
            const resSchools = await fetch(`${API_URL}/api/getData/5`);
            const dataSchools = await resSchools.json();
            if (dataSchools.success) setSchools(dataSchools.data || []);

            const resYears = await fetch(`${API_URL}/api/getData/13`);
            const dataYears = await resYears.json();
            if (dataYears.success) setYears(dataYears.data || []);
        } catch(e) { console.error(e); }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
        const currentYear = years.find(y => {
            const name = getYearName(y);
            return (name && String(name).includes('الحالي')) || (name && String(name).includes(new Date().getFullYear().toString()));
        });
        if (currentYear) setSelectedYear(String(getYearId(currentYear)));
        else if (years.length > 0) setSelectedYear(String(getYearId(years[0])));
    }
  }, [years]);

  // 2. جلب البيانات (مع إضافة فلترة التاريخ يدوياً للبيانات التي لا تدعمها الـ API)
  const fetchData = async () => {
    if (!selectedSchool || !selectedYear) {
      alert('يرجى اختيار المدرسة والعام الدراسي');
      return;
    }
    
    setLoading(true);
    // تنظيف البيانات السابقة
    setSummaryData(null);
    setAbsenceData([]);
    setWarningsData([]);
    setViolationsData([]);
    setPermissionsData([]);

    try {
        const [absenceRes, warningsRes, violationsRes, permissionsRes] = await Promise.all([
            fetch(`${API_URL}/api/statistics?statisticType=${statisticType}&startDate=${startDate}&endDate=${endDate}&schoolId=${selectedSchool}&yearId=${selectedYear}&inpot=12`),
            fetch(`${API_URL}/api/leaves/data?schoolId=${selectedSchool}&yearId=${selectedYear}&inpout=38`),
            fetch(`${API_URL}/api/leaves/data?schoolId=${selectedSchool}&yearId=${selectedYear}&inpout=6`),
            fetch(`${API_URL}/api/leaves/data?schoolId=${selectedSchool}&yearId=${selectedYear}&inpout=18`)
        ]);

        // 1. معالجة الغياب (الـ API يدعم التاريخ بالفعل)
        const absenceJson = await absenceRes.json();
        if (absenceJson.success && absenceJson.data) {
            if (absenceJson.data[0] && absenceJson.data[0].length > 0) setSummaryData(absenceJson.data[0][0]);
            if (absenceJson.data[1]) setAbsenceData(absenceJson.data[1]);
        }

        // 2. معالجة الإنذارات (تطبيق فلتر التاريخ يدوياً)
        const warningsJson = await warningsRes.json();
        if (warningsJson.success && warningsJson.data?.length > 0) {
            const grouped: { [key: string]: StudentWarningProfile } = {};
            warningsJson.data.forEach((item: any) => {
                // التحقق من التاريخ
                if (!isDateInRange(item['تاريخ الإنذار'])) return;

                const stuKey = item['اسم الطالب'];
                const wType = item['نوع الإنذار'] || 'إنذار';
                if (!grouped[stuKey]) grouped[stuKey] = { الطالب: stuKey, الصف: item['الصف'] || '—', warnings: [] };
                
                let wObj = grouped[stuKey].warnings.find(w => w.type === wType);
                if (!wObj) { wObj = { type: wType, count: 0, dates: [] }; grouped[stuKey].warnings.push(wObj); }
                
                wObj.dates.push(item['تاريخ الإنذار'] ? new Date(item['تاريخ الإنذار']).toLocaleDateString('ar-EG') : '');
            });
            setWarningsData(Object.values(grouped));
        }

        // 3. معالجة العقوبات (تطبيق فلتر التاريخ يدوياً)
        const violationsJson = await violationsRes.json();
        if (violationsJson.success && violationsJson.data?.length > 0) {
            const grouped: { [key: string]: StudentViolationProfile } = {};
            violationsJson.data.forEach((item: any) => {
                // التحقق من التاريخ
                if (!isDateInRange(item['تاريخ المخالفة'])) return;

                const stuKey = item['اسم الطالب'];
                if (!grouped[stuKey]) grouped[stuKey] = { الطالب: stuKey, الصف: item['الصف'] || '—', violations: [] };
                grouped[stuKey].violations.push({
                    المخالفة: item['وصف المخالفة'],
                    العقوبة: item['العقوبة'],
                    التاريخ: item['تاريخ المخالفة'] ? new Date(item['تاريخ المخالفة']).toLocaleDateString('ar-EG') : ''
                });
            });
            setViolationsData(Object.values(grouped));
        }

        // 4. معالجة الأذونات (تطبيق فلتر التاريخ يدوياً)
        const permissionsJson = await permissionsRes.json();
        if (permissionsJson.success && permissionsJson.data?.length > 0) {
            const grouped: { [key: string]: PermissionProfile } = {};
            permissionsJson.data.forEach((item: any) => {
                // التحقق من التاريخ
                if (!isDateInRange(item['تاريخ الاذن'])) return;

                const key = item['الاسم بالعربى'];
                if (!grouped[key]) grouped[key] = { الطالب: key, الصف: item['الصف'] || '—', count: 0, records: [] };
                grouped[key].count++;
                grouped[key].records.push({
                    date: item['تاريخ الاذن'],
                    time: item['وقت الخروج'],
                    reason: item['سبب الاذن'],
                });
            });
            setPermissionsData(Object.values(grouped));
        }

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // === التصدير والطباعة ===
  const exportExcel = () => {
    let dataToExport: any[] = [];
    let fileName = 'Report';

    if (activeTab === 'absence') {
        dataToExport = absenceData;
        fileName = 'Absence_Report';
    } else if (activeTab === 'warnings') {
        dataToExport = warningsData.flatMap(s => s.warnings.map(w => ({Student: s.الطالب, Class: s.الصف, Type: w.type, Count: w.dates.length, Dates: w.dates.join(', ')})));
        fileName = 'Warnings_Report';
    } else if (activeTab === 'violations') {
        dataToExport = violationsData.flatMap(s => s.violations.map(v => ({Student: s.الطالب, Class: s.الصف, Violation: v.المخالفة, Penalty: v.العقوبة, Date: v.التاريخ})));
        fileName = 'Violations_Report';
    } else {
        dataToExport = permissionsData.flatMap(s => s.records.map(r => ({Student: s.الطالب, Class: s.الصف, Date: r.date, Time: r.time, Reason: r.reason})));
        fileName = 'Permissions_Report';
    }

    if (dataToExport.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${fileName}_${startDate}_${endDate}.xlsx`);
  };

  // === التنسيقات ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1600px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '20px', border: '1px solid #e2e8f0' };
  const selectStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e2e8f0', backgroundColor: '#fff', fontWeight: '600', color: '#334155' };
  const summaryCard = (bg: string, color: string, value: number | string, label: string) => (
    <div style={{ flex: '1', minWidth: '180px', padding: '15px', borderRadius: '12px', background: bg, color: color, textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: '800' }}>{value}</div>
        <div style={{ fontSize: '13px', opacity: 0.9 }}>{label}</div>
    </div>
  );

  const getWarningColor = (type: string) => {
    if (type.includes('أول')) return '#f59e0b';
    if (type.includes('ثاني')) return '#f97316';
    if (type.includes('ثالث')) return '#dc2626';
    return '#6b7280';
  };

  if (!isAuthChecked || !user) return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>;

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>🎓 لوحة تحكم الطلاب الشاملة</h1>
      <p style={{ color: '#64748b', marginTop: '5px' }}>تحليل شامل للغياب، الإنذارات، العقوبات والأذونات (تم تطبيق فلتر التاريخ على الجميع)</p>

      {/* الفلاتر */}
      <div style={{ ...cardStyle, margin: '20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>المدرسة</label>
                <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} style={selectStyle}>
                <option value=''>اختر المدرسة</option>
                {schools.map((s, i) => (<option key={i} value={getSchoolId(s)}>{getSchoolName(s)}</option>))}
                </select>
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>العام الدراسي</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
                <option value=''>اختر العام</option>
                {years.map((y, i) => (<option key={i} value={getYearId(y)}>{getYearName(y)}</option>))}
                </select>
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>نوع الإحصائية (للغياب)</label>
                <select value={statisticType} onChange={e => setStatisticType(e.target.value)} style={selectStyle}>
                <option value='يومي'>يومي</option>
                <option value='أسبوعي'>أسبوعي</option>
                <option value='شهري'>شهري</option>
                </select>
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>من تاريخ</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{...selectStyle, border: '1px solid #cbd5e1'}} />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>إلى تاريخ</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{...selectStyle, border: '1px solid #cbd5e1'}} />
            </div>
            <button onClick={fetchData} disabled={loading} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border:'none' }}>
                {loading ? 'جاري التحميل...' : 'عرض البيانات'}
            </button>
            <button onClick={exportExcel} style={{ padding: '10px 20px', background: '#22c55e', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border:'none' }}>Excel</button>
        </div>
      </div>

      {/* بطاقات الملخص */}
      {summaryData && (
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {summaryCard('#e0f2fe', '#0369a1', formatNumber(summaryData['إجمالي عدد الطلاب'] || 0), 'إجمالي الطلاب')}
            {summaryCard('#fee2e2', '#991b1b', formatNumber(summaryData['إجمالي أيام الغياب'] || 0), 'أيام الغياب')}
            {summaryCard('#fef3c7', '#92400e', warningsData.length, 'طلاب لديهم إنذارات')}
            {summaryCard('#f3e8ff', '#6b21a8', violationsData.length, 'طلاب لديهم عقوبات')}
            {summaryCard('#ecfdf5', '#065f46', permissionsData.length, 'طلاب لديهم أذونات')}
        </div>
      )}

      {/* التبويبات */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        {[
            { id: 'absence', label: 'الغياب', icon: 'fa-calendar-xmark' },
            { id: 'warnings', label: 'الإنذارات', icon: 'fa-triangle-exclamation' },
            { id: 'violations', label: 'العقوبات', icon: 'fa-gavel' },
            { id: 'permissions', label: 'الأذونات', icon: 'fa-file-signature' }
        ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? '#1e293b' : '#f1f5f9',
                color: activeTab === tab.id ? 'white' : '#475569',
                fontWeight: '600', transition: '0.2s'
            }}>
                <i className={`fa-solid ${tab.icon}`} style={{ marginLeft: '5px' }}></i> {tab.label}
            </button>
        ))}
      </div>

      {/* منطقة المحتوى */}
      <div ref={tableRef} style={cardStyle}>
            <div style={{marginBottom: '15px'}}>
                <input 
                    type="text" 
                    placeholder="بحث باسم الطالب..." 
                    value={filterName}
                    onChange={e => setFilterName(e.target.value)}
                    style={{padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '300px'}}
                />
            </div>

            {/* 1. الغياب */}
            {activeTab === 'absence' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '10px', textAlign: 'right' }}>م</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>اسم الطالب</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>تاريخ الغياب</th>
                        </tr>
                    </thead>
                    <tbody>
                        {absenceData.filter(s => !filterName || s['اسم الطالب']?.includes(filterName)).map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px' }}>{idx+1}</td>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{item['اسم الطالب']}</td>
                                <td style={{ padding: '10px' }}>{formatDate(item['تاريخ الغياب'])}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* 2. الإنذارات */}
            {activeTab === 'warnings' && (
                 <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {warningsData.filter(s => !filterName || s.الطالب.includes(filterName)).map((stu, idx) => (
                        <div key={idx} style={{ background: '#fffbeb', borderRadius: 12, border: '1px solid #fcd34d' }}>
                            <div style={{ background: '#78350f', color: 'white', padding: 10, borderRadius: '12px 12px 0 0' }}>
                                <h3 style={{margin:0}}>{stu.الطالب}</h3>
                                <small>{stu.الصف}</small>
                            </div>
                            <div style={{padding: 10}}>
                                {stu.warnings.map((w, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, background: 'white', padding: 8, borderRadius: 6 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: getWarningColor(w.type), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                            {w.dates.length}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: 13 }}>{w.type}</div>
                                            <small style={{ color: '#92400e', fontSize: 11 }}>{w.dates.join(' - ')}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                 </div>
            )}

            {/* 3. العقوبات */}
            {activeTab === 'violations' && (
                 <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {violationsData.filter(s => !filterName || s.الطالب.includes(filterName)).map((stu, idx) => (
                        <div key={idx} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <div style={{ background: '#4c1d95', color: 'white', padding: 10, borderRadius: '12px 12px 0 0' }}>
                                <h3 style={{margin:0}}>{stu.الطالب}</h3>
                                <small>{stu.الصف}</small>
                            </div>
                            <div style={{padding: 10}}>
                                {stu.violations.map((v, i) => (
                                    <div key={i} style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 0' }}>
                                        <div style={{ fontWeight: 'bold', color: '#b91c1c' }}>🚫 {v.المخالفة}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>العقوبة: <b>{v.العقوبة}</b></span>
                                            <span>{v.التاريخ}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                 </div>
            )}

            {/* 4. الأذونات */}
            {activeTab === 'permissions' && (
                 <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {permissionsData.filter(s => !filterName || s.الطالب.includes(filterName)).map((stu, idx) => (
                        <div key={idx} style={{ background: 'white', borderRadius: 12, border: '1px solid #bae6fd' }}>
                            <div style={{ background: '#0369a1', color: 'white', padding: 10, borderRadius: '12px 12px 0 0' }}>
                                <h3 style={{margin:0}}>{stu.الطالب}</h3>
                                <small>{stu.الصف}</small>
                            </div>
                            <div style={{padding: 10}}>
                                <div style={{ background: '#e0f2fe', padding: 8, borderRadius: 6, marginBottom: 10, textAlign: 'center', fontWeight: 'bold' }}>
                                    إجمالي الأذونات: {stu.count}
                                </div>
                                {stu.records.map((r, i) => (
                                    <div key={i} style={{ background: '#f0f9ff', padding: 8, borderRadius: 6, marginBottom: 5, fontSize: 13 }}>
                                        📅 {r.date} ⏰ {r.time} <br/> 📝 {r.reason}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                 </div>
            )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}