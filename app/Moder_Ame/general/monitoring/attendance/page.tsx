'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- أنواع البيانات ---
interface StatRecord {
  'التاريخ': string | Date;
  'إجمالي الموظفين': number;
  'إجازات'?: number;
  'تدريب'?: number;
  'أذونات'?: number;
  'جزاءات'?: number;
  'الحاضرون': number;
  'إجمالي الإجازات'?: number;
  'إجمالي التدريب'?: number;
  'إجمالي الأذونات'?: number;
  'إجمالي الجزاءات'?: number;
}

export default function GeneralStatisticsPage() {
  const { user, work } = useAuthStore();
  
  // --- حالات الفلاتر ---
  const [schools, setSchools] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  const [activeTab, setActiveTab] = useState<'leaves' | 'training' | 'permissions' | 'penalties'>('leaves');
  const [statisticType, setStatisticType] = useState<string>('أسبوعي');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // --- حالات البيانات ---
  const [data, setData] = useState<StatRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // --- دوال الوصول للبيانات ---
  const getSchoolName = (s: any) => s['المدرسة'] || s.SchoolNam || s.EntityName || s.name || Object.values(s).find((v: any) => typeof v === 'string') || '';
  const getSchoolId = (s: any) => s['الرقم'] || s.SchoolID || s.EntityID || s.id || Object.values(s).find((v: any) => typeof v === 'number');
  const getYearName = (y: any) => y['العام الدراسي'] || y.YearName || y.YerName || y.EntityName || y.name || Object.values(y).find((v: any) => typeof v === 'string') || '';
  const getYearId = (y: any) => y['الرقم'] || y.YearID || y.YerID || y.EntityID || y.id || Object.values(y).find((v: any) => typeof v === 'number');

  // 1. تحميل القوائم (المدارس والسنوات)
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

  // 2. تحديد القيم الافتراضية
  useEffect(() => {
    if (user?.schoolId && !selectedSchool) setSelectedSchool(String(user.schoolId));
    if (work?.yearId && !selectedYear) setSelectedYear(String(work.yearId));
    else if (years.length > 0 && !selectedYear) {
        const current = years.find(y => String(getYearName(y)).includes(new Date().getFullYear().toString()));
        if (current) setSelectedYear(String(getYearId(current)));
    }
  }, [user, work, years]);

  // 3. تحديد التواريخ الافتراضية
  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(lastWeek.toISOString().split('T')[0]);
  }, []);

  // 4. جلب البيانات
  const fetchData = async () => {
    if (!selectedSchool || !selectedYear || !startDate || !endDate) return;
    setLoading(true);
    try {
      let inpot = 1;
      if (activeTab === 'leaves') inpot = 2;
      else if (activeTab === 'training') inpot = 3;
      else if (activeTab === 'permissions') inpot = 4;
      else if (activeTab === 'penalties') inpot = 5;

      const res = await fetch(
        `${API_URL}/api/statistics?statisticType=${statisticType}&startDate=${startDate}&endDate=${endDate}&schoolId=${selectedSchool}&yearId=${selectedYear}&inpot=${inpot}`
      );

      const result = await res.json();

      if (result.success && result.data) {
        const records = Array.isArray(result.data[0]) ? result.data[0] : result.data;
        setData(records);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate && selectedSchool && selectedYear) fetchData();
  }, [activeTab, statisticType, startDate, endDate, selectedSchool, selectedYear]);

  // --- حساب الإجماليات ---
  const totals = useMemo(() => {
    if (data.length === 0) return null;

    if (statisticType === 'سنوي' && data[0]) {
      const row = data[0];
      return {
        'التاريخ': 'إجمالي السنة',
        'إجمالي الموظفين': row['إجمالي الموظفين'] || 0,
        'إجازات': row['إجمالي الإجازات'] || 0,
        'تدريب': row['إجمالي التدريب'] || 0,
        'أذونات': row['إجمالي الأذونات'] || 0,
        'جزاءات': row['إجمالي الجزاءات'] || 0,
        'الحاضرون': 0
      };
    }

    const rosterSize = Math.max(...data.map(r => r['إجمالي الموظفين'] || 0));

    const aggregated = data.reduce((acc, row) => {
      acc['الحاضرون'] += row['الحاضرون'] || 0;
      acc['إجازات'] = (acc['إجازات'] || 0) + (row['إجازات'] || 0);
      acc['تدريب'] = (acc['تدريب'] || 0) + (row['تدريب'] || 0);
      acc['أذونات'] = (acc['أذونات'] || 0) + (row['أذونات'] || 0);
      acc['جزاءات'] = (acc['جزاءات'] || 0) + (row['جزاءات'] || 0);
      return acc;
    }, { 'التاريخ': 'إجمالي الفترة', 'إجمالي الموظفين': 0, 'الحاضرون': 0, 'إجازات': 0, 'تدريب': 0, 'أذونات': 0, 'جزاءات': 0 });

    aggregated['إجمالي الموظفين'] = rosterSize;
    return aggregated;
  }, [data, statisticType]);

  const formatDate = (d: string | Date) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const gradients = [
    'linear-gradient(135deg, #10b981, #34d399)',
    'linear-gradient(135deg, #f59e0b, #fbbf24)',
    'linear-gradient(135deg, #ef4444, #f87171)',
    'linear-gradient(135deg, #3b82f6, #60a5fa)',
  ];

  // --- التنسيقات ---
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
          تقرير الإحصائيات الشامل للموظفين
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>متابعة تفصيلية للحضور، الإجازات، التدريب، الأذونات، والجزاءات</p>
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
                    <option value="يومي">يومي</option>
                    <option value="أسبوعي">أسبوعي</option>
                    <option value="شهري">شهري</option>
                    <option value="سنوي">سنوي</option>
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

        {/* التبويبات */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', background: '#f1f5f9', padding: '5px', borderRadius: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('leaves')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'leaves' ? '#ef4444' : 'transparent', color: activeTab === 'leaves' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>الإجازات</button>
            <button onClick={() => setActiveTab('training')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'training' ? '#3b82f6' : 'transparent', color: activeTab === 'training' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>التدريب</button>
            <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'permissions' ? '#f59e0b' : 'transparent', color: activeTab === 'permissions' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>الأذونات</button>
            <button onClick={() => setActiveTab('penalties')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'penalties' ? '#991b1b' : 'transparent', color: activeTab === 'penalties' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>الجزاءات</button>
        </div>
      </div>

      {/* المحتوى */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', ...cardStyle }}>جاري تحليل البيانات...</div>
      ) : (
        <>
          {/* كروت الإجماليات */}
          {totals && (
            <div style={{ ...gridStyle, marginBottom: '30px' }}>
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>إجمالي الموظفين</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{totals['إجمالي الموظفين']}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '12px', fontSize: '20px' }}>👥</div>
              </div>
              
              {activeTab === 'leaves' && <div style={{ ...cardStyle, borderBottom: '4px solid #ef4444' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>إجمالي الإجازات</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626' }}>{totals['إجازات'] || 0}</div></div>}
              {activeTab === 'training' && <div style={{ ...cardStyle, borderBottom: '4px solid #3b82f6' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>أيام التدريب</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb' }}>{totals['تدريب'] || 0}</div></div>}
              {activeTab === 'permissions' && <div style={{ ...cardStyle, borderBottom: '4px solid #f59e0b' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>أيام الأذونات</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706' }}>{totals['أذونات'] || 0}</div></div>}
              {activeTab === 'penalties' && <div style={{ ...cardStyle, borderBottom: '4px solid #991b1b' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>أيام الجزاءات</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#991b1b' }}>{totals['جزاءات'] || 0}</div></div>}

              <div style={{ ...cardStyle, borderBottom: '4px solid #10b981' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>الحضور</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#059669' }}>{totals['الحاضرون']}</div></div>
            </div>
          )}

          {/* تفاصيل الأيام */}
          {(statisticType !== 'سنوي' && data.length > 0) && (
            <div>
              <h3 style={{ marginBottom: '15px', fontWeight: 'bold', color: '#334155', fontSize: '18px' }}>سجل الأيام</h3>
              <div style={gridStyle}>
                {data.map((row, idx) => {
                  const bg = gradients[idx % gradients.length];
                  return (
                    <div key={idx} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white', transition: 'transform 0.2s' }} 
                         onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} 
                         onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                      <div style={{ background: bg, padding: '12px', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                        {formatDate(row['التاريخ'])}
                      </div>
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px' }}>
                          <span>إجمالي الموظفين</span>
                          <span style={{ color: '#1e293b', fontWeight: 'bold' }}>{row['إجمالي الموظفين']}</span>
                        </div>
                        
                        {activeTab === 'leaves' && <div style={{ color: '#dc2626', fontWeight: '600', padding: '4px', background: '#fef2f2', borderRadius: '6px', textAlign: 'center', fontSize: '12px' }}>إجازات: {row['إجازات'] || 0}</div>}
                        {activeTab === 'training' && <div style={{ color: '#2563eb', fontWeight: '600', padding: '4px', background: '#eff6ff', borderRadius: '6px', textAlign: 'center', fontSize: '12px' }}>تدريب: {row['تدريب'] || 0}</div>}
                        {activeTab === 'permissions' && <div style={{ color: '#d97706', fontWeight: '600', padding: '4px', background: '#fffbeb', borderRadius: '6px', textAlign: 'center', fontSize: '12px' }}>أذونات: {row['أذونات'] || 0}</div>}
                        {activeTab === 'penalties' && <div style={{ color: '#991b1b', fontWeight: '600', padding: '4px', background: '#fef2f2', borderRadius: '6px', textAlign: 'center', fontSize: '12px' }}>جزاءات: {row['جزاءات'] || 0}</div>}

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#059669', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', fontSize: '12px' }}>
                          <span>الحضور</span>
                          <span>{row['الحاضرون']}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px', ...cardStyle, color: '#94a3b8' }}>
                لا توجد بيانات لهذه الفترة، يرجى اختيار المدرسة والعام الدراسي.
            </div>
          )}
        </>
      )}
    </div>
  );
}