'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// ✅ تصحيح الخطأ: استيراد Bar بدلاً من Chart
import { Bar } from 'react-chartjs-2'; 
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// إعدادات التشارت
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ❌ تم حذف هذا السطر لأنه غير مسموح به داخل 'use client'
// export const dynamic = 'force-dynamic'; 


// === الواجهات ===
interface EmployeeDetail {
  'رقم الموظف': number;
  'الموظف': string;
  'الوظيفة': string;
  'عارضة': number;
  'اعتيادي': number;
  'مرضي': number;
  'إذن أثناء اليوم': number;
  'تأخير': number;
  'انصراف مبكر': number;
  'عدد الجزاءات': number;
  JobTitle?: string;
  Job?: string;
}

// === المكون الداخلي ===
function EmployeeDashboardContent() {
  const { user } = useAuthStore();
  
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [data, setData] = useState<EmployeeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [schools, setSchools] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterJob, setFilterJob] = useState('');
  
  const tableRef = useRef<HTMLDivElement>(null);

  const formatNumber = (num: number) => new Intl.NumberFormat('ar-EG').format(num);

  const getSchoolName = (s: any) => s['المدرسة'] || s.SchoolName || s.EntityName || s.name;
  const getSchoolId = (s: any) => s['الرقم'] || s.SchoolID || s.EntityID || s.id;

  const getYearName = (y: any) => y['العام الدراسي'] || y.YearName || y.EntityName || y.name || Object.values(y).find((v: any) => typeof v === 'string');
  const getYearId = (y: any) => y['الرقم'] || y.YearID || y.EntityID || y.id || Object.values(y).find((v: any) => typeof v === 'number');

  const getJobName = (emp: any) => emp['الوظيفة'] || emp.JobTitle || emp.Job || emp.EntityName || 'غير محدد';

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAuthChecked(true);
      if (!user) {
        window.location.href = '/login';
      }
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
        } catch(e) {
            console.error("Error fetching dropdowns", e);
        }
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
        const currentYear = years.find(y => 
            (getYearName(y) && String(getYearName(y)).includes('الحالي')) || 
            (getYearName(y) && String(getYearName(y)).includes(new Date().getFullYear().toString()))
        );
        if (currentYear) setSelectedYear(String(getYearId(currentYear)));
    }
  }, [years]);

  const fetchData = async () => {
    if (!selectedSchool || !selectedYear || !startDate || !endDate) {
      alert('يرجى اختيار المدرسة والعام الدراسي أولاً');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/statistics?statisticType=شامل&startDate=${startDate}&endDate=${endDate}&schoolId=${selectedSchool}&yearId=${selectedYear}&inpot=6`
      );
      const result = await res.json();
      if (result.success && result.data) {
        setData(Array.isArray(result.data[0]) ? result.data[0] : result.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthChecked || !user) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>;
  }

  const totals = data.reduce(
    (acc, emp) => {
      acc.leaves += emp['عارضة'] + emp['اعتيادي'] + emp['مرضي'];
      acc.permissions += emp['إذن أثناء اليوم'] + emp['تأخير'] + emp['انصراف مبكر'];
      acc.penalties += emp['عدد الجزاءات'];
      return acc;
    },
    { leaves: 0, permissions: 0, penalties: 0 }
  );

  const mostAbsent = [...data].sort((a, b) => 
    (b['عارضة'] + b['اعتيادي'] + b['مرضي']) - (a['عارضة'] + a['اعتيادي'] + a['مرضي'])
  )[0];

  const renderBadge = (value: number, bg: string, color: string) => {
    if (!value) return <span style={{ color: '#94a3b8' }}>0</span>;
    return (
      <span style={{
        background: bg,
        color: color,
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {value}
      </span>
    );
  };

  const exportExcel = () => {
    if (data.length === 0) return;
    const filteredData = data.filter(emp => !filterJob || getJobName(emp) === filterJob);
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'موظفين');
    XLSX.writeFile(wb, `EmployeeDashboard_${startDate}_${endDate}.xlsx`);
  };

  const exportPDF = () => {
    if (data.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('Arial', 'normal');
    doc.text(`سجل الموظفين من ${startDate} إلى ${endDate}`, 14, 20);

    const tableColumn = ["م", "الموظف", "الوظيفة", "عارضة", "اعتيادي", "مرضي", "إذن أثناء اليوم", "تأخير", "انصراف مبكر", "جزاءات", "نسبة الانضباط"];
    const tableRows: any[] = [];

    data.filter(emp => !filterJob || getJobName(emp) === filterJob).forEach((emp, idx) => {
      const totalAbsence = emp['عارضة'] + emp['اعتيادي'] + emp['مرضي'];
      const disciplineRate = totalAbsence === 0 ? 100 : Math.max(0, 100 - totalAbsence * 5);
      tableRows.push([
        idx+1,
        emp['الموظف'],
        getJobName(emp),
        emp['عارضة'],
        emp['اعتيادي'],
        emp['مرضي'],
        emp['إذن أثناء اليوم'],
        emp['تأخير'],
        emp['انصراف مبكر'],
        emp['عدد الجزاءات'],
        `${disciplineRate}%`
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85] },
      styles: { fontSize: 10 }
    });

    doc.save(`EmployeeDashboard_${startDate}_${endDate}.pdf`);
  };

  const printPage = () => {
    if (!tableRef.current) return;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;
    printWindow.document.write('<html dir="rtl"><head><title>طباعة السجل</title></head><body>');
    printWindow.document.write('<div style="font-family:Tajawal, sans-serif; direction:rtl;">');
    printWindow.document.write(tableRef.current.innerHTML);
    printWindow.document.write('</div></body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const chartData = {
    labels: data.map(emp => emp['الموظف']),
    datasets: [
      {
        label: 'إجمالي الإجازات',
        data: data.map(emp => emp['عارضة'] + emp['اعتيادي'] + emp['مرضي']),
        backgroundColor: '#f87171'
      },
      {
        label: 'إجمالي الأذونات',
        data: data.map(emp => emp['إذن أثناء اليوم'] + emp['تأخير'] + emp['انصراف مبكر']),
        backgroundColor: '#fcd34d'
      },
      {
        label: 'الجزاءات',
        data: data.map(emp => emp['عدد الجزاءات']),
        backgroundColor: '#c084fc'
      }
    ]
  };

  const containerStyle: React.CSSProperties = {
    padding: '30px',
    maxWidth: '1600px',
    margin: '0 auto',
    direction: 'rtl',
    fontFamily: 'Tajawal, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    padding: '20px',
    border: '1px solid #e2e8f0',
  };

  const tableContainerStyle: React.CSSProperties = { ...cardStyle, overflowX: 'auto' };
  const summaryCard = (bg: string, color: string): React.CSSProperties => ({
    flex: '1',
    minWidth: '200px',
    padding: '15px',
    borderRadius: '12px',
    background: bg,
    color: color,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '16px'
  });
  
  const selectStyle: React.CSSProperties = { 
      width: '100%', 
      padding: '10px', 
      borderRadius: '8px', 
      border: '2px solid #e2e8f0', 
      backgroundColor: '#fff', 
      fontWeight: '600',
      color: '#334155'
  };

  const uniqueJobs = Array.from(new Set(data.map(emp => getJobName(emp))));

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>📊 لوحة تحكم الموظفين (عام)</h1>
      <p style={{ color: '#64748b', marginTop: '5px' }}>ملخص تفصيلي لكل الموظفين عن الإجازات، الأذونات، التدريب، والجزاءات</p>

      <div style={{ ...cardStyle, margin: '20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
            
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569' }}>المدرسة</label>
            <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} style={selectStyle}>
              <option value=''>اختر المدرسة</option>
              {schools.map((s, i) => (
                  <option key={i} value={getSchoolId(s)}>{getSchoolName(s)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569' }}>العام الدراسي</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
              <option value=''>اختر العام</option>
              {years.map((y, i) => (
                  <option key={i} value={getYearId(y)}>{getYearName(y)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569' }}>من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{...selectStyle, border: '1px solid #cbd5e1'}} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569' }}>إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{...selectStyle, border: '1px solid #cbd5e1'}} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#475569' }}>الوظيفة</label>
            <select value={filterJob} onChange={e => setFilterJob(e.target.value)} style={selectStyle}>
              <option value=''>الكل</option>
              {uniqueJobs.map((job, idx) => <option key={idx} value={job}>{job}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={fetchData} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>
                {loading ? 'جاري التحميل...' : 'عرض البيانات'}
            </button>
            <button onClick={exportExcel} disabled={data.length === 0} style={{ padding: '10px 20px', background: '#22c55e', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: data.length ? 1 : 0.5, border: 'none' }}>Excel</button>
            <button onClick={exportPDF} disabled={data.length === 0} style={{ padding: '10px 20px', background: '#a855f7', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: data.length ? 1 : 0.5, border: 'none' }}>PDF</button>
            <button onClick={printPage} disabled={data.length === 0} style={{ padding: '10px 20px', background: '#f97316', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: data.length ? 1 : 0.5, border: 'none' }}>طباعة</button>
        </div>
      </div>

      {data.length > 0 && (
        <>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <div style={summaryCard('#fee2e2', '#991b1b')}>إجمالي الإجازات<br/><strong>{formatNumber(totals.leaves)}</strong></div>
                <div style={summaryCard('#fef3c7', '#92400e')}>إجمالي الأذونات<br/><strong>{formatNumber(totals.permissions)}</strong></div>
                <div style={summaryCard('#f3e8ff', '#6b21a8')}>إجمالي الجزاءات<br/><strong>{formatNumber(totals.penalties)}</strong></div>
            </div>

            {mostAbsent && totals.leaves > 0 && (
                <div style={{ background: '#fff7ed', padding: '12px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 'bold' }}>
                ⚠️ أكثر موظف غياباً: {mostAbsent['الموظف']}
                </div>
            )}

            <div style={{ ...cardStyle, marginBottom: '20px' }}>
                {/* ✅ تصحيح الخطأ: استخدام Bar بدلاً من Chart */}
                <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' as const }, title: { display: true, text: 'إحصائيات الموظفين' } }}} />
            </div>
        </>
      )}

      <div ref={tableRef} style={tableContainerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px' }}>م</th>
              <th style={{ padding: '12px' }}>الموظف</th>
              <th style={{ padding: '12px' }}>الوظيفة</th>
              <th style={{ padding: '12px' }}>عارضة</th>
              <th style={{ padding: '12px' }}>اعتيادي</th>
              <th style={{ padding: '12px' }}>مرضي</th>
              <th style={{ padding: '12px' }}>إذن أثناء اليوم</th>
              <th style={{ padding: '12px' }}>تأخير</th>
              <th style={{ padding: '12px' }}>انصراف مبكر</th>
              <th style={{ padding: '12px' }}>جزاءات</th>
              <th style={{ padding: '12px' }}>نسبة الانضباط</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.filter(emp => !filterJob || getJobName(emp) === filterJob).map((emp, idx) => {
              const totalAbsence = emp['عارضة'] + emp['اعتيادي'] + emp['مرضي'];
              const disciplineRate = totalAbsence === 0 ? 100 : Math.max(0, 100 - totalAbsence * 5);
              return (
                <tr key={emp['رقم الموظف'] || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', color: '#64748b' }}>{idx+1}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{emp['الموظف']}</td>
                  <td style={{ padding: '12px' }}>{getJobName(emp)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{renderBadge(emp['عارضة'], '#fee2e2', '#991b1b')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{renderBadge(emp['اعتيادي'], '#fee2e2', '#991b1b')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{renderBadge(emp['مرضي'], '#fee2e2', '#991b1b')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{renderBadge(emp['إذن أثناء اليوم'], '#fef3c7', '#92400e')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{renderBadge(emp['تأخير'], '#fef3c7', '#92400e')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{renderBadge(emp['انصراف مبكر'], '#fef3c7', '#92400e')}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{renderBadge(emp['عدد الجزاءات'], '#f3e8ff', '#6b21a8')}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: disciplineRate > 80 ? '#16a34a' : '#dc2626' }}>{disciplineRate}%</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    {loading ? 'جاري التحميل...' : 'اختر المدرسة والعام الدراسي ثم اضغط "عرض البيانات"'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <EmployeeDashboardContent />
    </Suspense>
  );
}