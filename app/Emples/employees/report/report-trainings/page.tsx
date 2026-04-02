'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- Types ---
interface EligibilityRecord {
  'مسلسل': number;
  'اسم الموظف': string;
  'اسم المدرسة'?: string;
  'إجازة عارضة': number;
  'إجازة اعتيادية': number;
  'عدد أيام الجمعة': number;
  'عدد أيام السبت': number;
  'عدد أيام العمل الفعلية': number;
  'يستحق الصرف': string;
}

export default function SalaryEligibilityPage() {
  const { user, work } = useAuthStore();
  
  // --- State ---
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minDays, setMinDays] = useState<string>('20');
  const [jopFilter, setJopFilter] = useState<string>('الكل');
  
  const [data, setData] = useState<EligibilityRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. تهيئة التواريخ
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // --- جلب البيانات ---
  const fetchReport = async () => {
    if (!user?.schoolId || !work?.yearId) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/monthly-stats?startDate=${startDate}&endDate=${endDate}&schoolId=${user.schoolId}&yearId=${work.yearId}&minDays=${minDays}&inpot=1&jopFilter=${jopFilter}`
      );

      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        alert('خطأ: ' + result.error);
        setData([]);
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  // --- دالة الطباعة ---
  const handlePrint = () => {
    if (data.length === 0) {
      alert('لا توجد بيانات للطباعة');
      return;
    }
    window.print();
  };

  // --- احصائيات ---
  const stats = React.useMemo(() => {
    const total = data.length;
    const eligible = data.filter(r => r['يستحق الصرف'] === 'يستحق الصرف').length;
    const notEligible = total - eligible;
    return { total, eligible, notEligible };
  }, [data]);

  // --- Styles ---
  const containerStyle: React.CSSProperties = {
    padding: '30px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'Tajawal, sans-serif',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    minHeight: '100vh',
    direction: 'rtl',
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '25px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    marginBottom: '25px',
  };

  const inputStyle: React.CSSProperties = {
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const tableHeaderStyle: React.CSSProperties = {
    background: '#f8fafc',
    color: '#475569',
    fontWeight: '700',
    padding: '16px',
    textAlign: 'right' as const,
    borderBottom: '2px solid #e2e8f0',
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    fontSize: '14px',
  };

  return (
    <div>
      {/* === 1. واجهة الشاشة (تظهر فقط في العرض العادي) === */}
      <div className="screen-only" style={containerStyle}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            color: '#1e293b',
            marginBottom: '10px',
            background: 'linear-gradient(to right, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            📊 تقرير المستحقين لصرف المرتب
          </h1>
          <p style={{ color: '#64748b' }}>تحليل أيام العمل والغياب لتحديد الأحقية</p>
        </div>

        {/* Filters */}
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>بداية الشهر</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>نهاية الشهر</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>الحد الأدنى لأيام العمل</label>
              <input type="number" value={minDays} onChange={(e) => setMinDays(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569' }}>نوع العمل</label>
              <select value={jopFilter} onChange={(e) => setJopFilter(e.target.value)} style={inputStyle}>
                <option value="الكل">الكل</option>
                <option value="منتدب">منتدب</option>
                <option value="تعاقد خاص">تعاقد خاص</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={fetchReport}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none', 
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', 
                  fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', height: '46px'
                }}
              >
                عرض التقرير
              </button>
              <button 
                onClick={handlePrint}
                disabled={data.length === 0}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none', 
                  background: data.length === 0 ? '#cbd5e1' : '#334155', color: 'white', 
                  fontWeight: 'bold', cursor: data.length === 0 ? 'not-allowed' : 'pointer', height: '46px'
                }}
              >
                🖨️ طباعة التقرير
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {data.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ ...cardStyle, textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '40px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
              <div style={{ color: '#64748b' }}>إجمالي الموظفين</div>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center', padding: '20px', borderBottom: '5px solid #10b981' }}>
              <div style={{ fontSize: '40px', fontWeight: '800', color: '#10b981' }}>{stats.eligible}</div>
              <div style={{ color: '#64748b' }}>يستحقون الصرف ✅</div>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center', padding: '20px', borderBottom: '5px solid #ef4444' }}>
              <div style={{ fontSize: '40px', fontWeight: '800', color: '#ef4444' }}>{stats.notEligible}</div>
              <div style={{ color: '#64748b' }}>لا يستحقون الصرف ❌</div>
            </div>
          </div>
        )}

        {/* Data Table (Screen View) */}
        {data.length > 0 && (
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>مسلسل</th>
                    <th style={tableHeaderStyle}>اسم الموظف</th>
                    <th style={tableHeaderStyle}>إجازة عارضة</th>
                    <th style={tableHeaderStyle}>إجازة اعتيادية</th>
                    <th style={tableHeaderStyle}>أيام الجمعة</th>
                    <th style={tableHeaderStyle}>أيام السبت</th>
                    <th style={tableHeaderStyle}>أيام العمل الفعلية</th>
                    <th style={tableHeaderStyle}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => {
                    const isEligible = row['يستحق الصرف'] === 'يستحق الصرف';
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', transition: '0.2s' }}>
                        <td style={tableCellStyle}>{row['مسلسل']}</td>
                        <td style={{ ...tableCellStyle, fontWeight: 'bold' }}>{row['اسم الموظف']}</td>
                        <td style={tableCellStyle}>{row['إجازة عارضة']}</td>
                        <td style={tableCellStyle}>{row['إجازة اعتيادية']}</td>
                        <td style={tableCellStyle}>{row['عدد أيام الجمعة']}</td>
                        <td style={tableCellStyle}>{row['عدد أيام السبت']}</td>
                        <td style={{ ...tableCellStyle, fontWeight: 'bold', color: '#334155' }}>
                          {row['عدد أيام العمل الفعلية']}
                        </td>
                        <td style={tableCellStyle}>
                          <span style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                            background: isEligible ? '#dcfce7' : '#fee2e2',
                            color: isEligible ? '#166534' : '#991b1b',
                            border: `1px solid ${isEligible ? '#86efac' : '#fca5a5'}`
                          }}>
                            {isEligible ? 'يستحق الصرف' : 'لا يستحق الصرف'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.length === 0 && !loading && (
           <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>لا توجد بيانات لهذا التقرير</div>
        )}
      </div>

      {/* === 2. قالب الطباعة (يظهر فقط عند الطباعة) === */}
      <div className="print-only" style={{ display: 'none' }}>
        {/* رأس التقرير الرسمي */}
        <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #000' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#000' }}>تقرير المستحقين لصرف المرتب</h2>
          <div style={{ fontSize: '16px', color: '#333', marginTop: '10px' }}>
            المدرسة: {user?.schoolName || '---'}
          </div>
          <div style={{ fontSize: '14px', color: '#555', marginTop: '5px' }}>
            الفترة: من {startDate} إلى {endDate}
          </div>
          <div style={{ fontSize: '14px', color: '#555' }}>
            الحد الأدنى لأيام العمل: {minDays} يوم | الفلتر: {jopFilter}
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
          </div>
        </div>

        {/* ملخص الإحصائيات في التقرير */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
          <div><strong>إجمالي الموظفين:</strong> {stats.total}</div>
          <div><strong>يستحقون الصرف:</strong> {stats.eligible}</div>
          <div><strong>لا يستحقون:</strong> {stats.notEligible}</div>
        </div>

        {/* الجدول الرسمي */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', border: '1px solid #000' }}>
          <thead>
            <tr style={{ backgroundColor: '#eee' }}>
              <th style={{ border: '1px solid #000', padding: '10px', color: '#000' }}>م</th>
              <th style={{ border: '1px solid #000', padding: '10px', color: '#000' }}>اسم الموظف</th>
              <th style={{ border: '1px solid #000', padding: '10px', color: '#000' }}>إجازة عارضة</th>
              <th style={{ border: '1px solid #000', padding: '10px', color: '#000' }}>إجازة اعتيادية</th>
              <th style={{ border: '1px solid #000', padding: '10px', color: '#000' }}>الجمعة</th>
              <th style={{ border: '1px solid #000', padding: '10px', color: '#000' }}>السبت</th>
              <th style={{ border: '1px solid #000', padding: '10px', color: '#000' }}>أيام العمل</th>
              <th style={{ border: '1px solid #000', padding: '10px', color: '#000' }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', padding: '8px' }}>{row['اسم الموظف']}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row['إجازة عارضة']}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row['إجازة اعتيادية']}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row['عدد أيام الجمعة']}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row['عدد أيام السبت']}</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                  {row['عدد أيام العمل الفعلية']}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                  {row['يستحق الصرف']}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* تذييل الصفحة */}
        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: '10px' }}>
          <div>التوقيع: المدير</div>
          <div>التوقيع: المحاسب</div>
        </div>
      </div>

      {/* === CSS للتحكم في ما يظهر على الشاشة وما يظهر في الطباعة === */}
      <style jsx global>{`
        /* افتراضياً: إخفاء قالب الطباعة وإظهار الشاشة */
        .print-only { display: none; }
        .screen-only { display: block; }

        /* عند الطباعة: إخفاء الشاشة وإظهار قالب الطباعة */
        @media print {
          body {
            background: white;
            color: black;
            font-size: 12pt; /* حجم خط مناسب للورقة */
          }

          .screen-only {
            display: none !important;
          }

          .print-only {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            background: white;
            color: black;
            padding: 20px;
            z-index: 9999;
          }

          /* إزالة أي هوامش أو خلفيات من المتصفح */
          @page {
            margin: 1cm;
            size: A4 portrait;
          }

          /* إخفاء عناصر المتصفح القياسية */
          ::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </div>
  );
}