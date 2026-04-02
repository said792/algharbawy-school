'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// إعدادات التشارت
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// === إجبار الصفحة أن تكون ديناميكية ===
export const dynamic = 'force-dynamic';

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
}

// === المكون الداخلي (يحتوي على كل المنطق) ===
function EmployeeDashboardContent() {
  const { user, work } = useAuthStore();
  
  // حالة جديدة للتحقق من الدخول لمنع الانهيار
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  const [data, setData] = useState<EmployeeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const formatNumber = (num: number) => new Intl.NumberFormat('ar-EG').format(num);

  // 1. التحقق من تسجيل الدخول
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAuthChecked(true);
      if (!user || !work) {
        window.location.href = '/login';
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [user, work]);

  // 2. إعداد التواريخ الافتراضية
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // 3. جلب البيانات
  const fetchData = async () => {
    if (!user?.schoolId || !work?.yearId || !startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/statistics?statisticType=شامل&startDate=${startDate}&endDate=${endDate}&schoolId=${user.schoolId}&yearId=${work.yearId}&inpot=6`
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

  useEffect(() => {
    // لا تجلب البيانات إلا إذا تم التحقق من المستخدم
    if (isAuthChecked && startDate && endDate) fetchData();
  }, [startDate, endDate, user, work, isAuthChecked]);

  // 4. منطق العرض (Guard Clauses)
  if (!isAuthChecked) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>;
  }

  if (!user || !work) {
     return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحويلك لصفحة الدخول...</div>;
  }

  // --- باقي الكود الأصلي (بدون تعديل في المنطق) ---

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
    const filteredData = data.filter(emp => !filterJob || emp['الوظيفة'] === filterJob);
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'موظفين');
    XLSX.writeFile(wb, `EmployeeDashboard_${startDate}_${endDate}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('Arial', 'normal');
    doc.text(`سجل الموظفين من ${startDate} إلى ${endDate}`, 14, 20);

    const tableColumn = ["م", "الموظف", "الوظيفة", "عارضة", "اعتيادي", "مرضي", "إذن أثناء اليوم", "تأخير", "انصراف مبكر", "جزاءات", "نسبة الانضباط"];
    const tableRows: any[] = [];

    data.filter(emp => !filterJob || emp['الوظيفة'] === filterJob).forEach((emp, idx) => {
      const totalAbsence = emp['عارضة'] + emp['اعتيادي'] + emp['مرضي'];
      const disciplineRate = totalAbsence === 0 ? 100 : Math.max(0, 100 - totalAbsence * 5);
      tableRows.push([
        idx+1,
        emp['الموظف'],
        emp['الوظيفة'],
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

  const uniqueJobs = Array.from(new Set(data.map(emp => emp['الوظيفة'])));

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>📊 لوحة تحكم الموظفين</h1>
      <p style={{ color: '#64748b', marginTop: '5px' }}>ملخص تفصيلي لكل الموظفين عن الإجازات، الأذونات، التدريب، والجزاءات</p>

      <div style={{ ...cardStyle, margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label>من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label>إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label>فلترة حسب الوظيفة</label>
            <select value={filterJob} onChange={e => setFilterJob(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value=''>الكل</option>
              {uniqueJobs.map((job, idx) => <option key={idx} value={job}>{job}</option>)}
            </select>
          </div>
          <button onClick={fetchData} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>تحديث البيانات</button>
          <button onClick={exportExcel} style={{ padding: '10px 20px', background: '#22c55e', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Excel</button>
          <button onClick={exportPDF} style={{ padding: '10px 20px', background: '#a855f7', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>PDF</button>
          <button onClick={printPage} style={{ padding: '10px 20px', background: '#f97316', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>طباعة</button>
        </div>
      </div>

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
        <Chart type="bar" data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'إحصائيات الموظفين' } }}} />
      </div>

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
            {data.length > 0 ? data.filter(emp => !filterJob || emp['الوظيفة'] === filterJob).map((emp, idx) => {
              const totalAbsence = emp['عارضة'] + emp['اعتيادي'] + emp['مرضي'];
              const disciplineRate = totalAbsence === 0 ? 100 : Math.max(0, 100 - totalAbsence * 5);
              return (
                <tr key={emp['رقم الموظف']} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', color: '#64748b' }}>{idx+1}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{emp['الموظف']}</td>
                  <td style={{ padding: '12px' }}>{emp['الوظيفة']}</td>
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
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا توجد بيانات لهذه الفترة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// === المكون الرئيسي (Wrapper) ===
export default function Page() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <EmployeeDashboardContent />
    </Suspense>
  );
}