'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- Types ---
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

export default function StatisticsReportPage() {
  const { user, work } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'leaves' | 'training' | 'permissions' | 'penalties'>('leaves');
  const [statisticType, setStatisticType] = useState<string>('أسبوعي');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<StatRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(lastWeek.toISOString().split('T')[0]);
  }, []);

  const fetchData = async () => {
    if (!user?.schoolId || !work?.yearId || !startDate || !endDate) return;
    setLoading(true);
    try {
      let inpot = 1;
      if (activeTab === 'leaves') inpot = 2;
      else if (activeTab === 'training') inpot = 3;
      else if (activeTab === 'permissions') inpot = 4;
      else if (activeTab === 'penalties') inpot = 5;

      const res = await fetch(
        `${API_URL}/api/statistics?statisticType=${statisticType}&startDate=${startDate}&endDate=${endDate}&schoolId=${user.schoolId}&yearId=${work.yearId}&inpot=${inpot}`
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) fetchData();
  }, [activeTab, statisticType, startDate, endDate, user, work]);

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

  // --- Styles (تم التحسين) ---
  const gradients = [
    'linear-gradient(135deg, #10b981, #34d399)',
    'linear-gradient(135deg, #f59e0b, #fbbf24)',
    'linear-gradient(135deg, #ef4444, #f87171)',
    'linear-gradient(135deg, #3b82f6, #60a5fa)',
  ];

  const containerStyle: React.CSSProperties = {
    padding: '30px',
    maxWidth: '1600px',
    margin: '0 auto',
    direction: 'rtl',
    fontFamily: 'Tajawal, sans-serif',
    background: '#f1f5f9',
    minHeight: '100vh',
  };

  const headerCardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    borderRight: '6px solid #3b82f6',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  };

  const formatDate = (d: string | Date) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div style={containerStyle}>
      
      <div style={headerCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '8px 12px', borderRadius: '12px', fontSize: '20px' }}>📊</span>
              لوحة الإحصائيات الشاملة
            </h1>
            <p style={{ color: '#64748b', fontSize: '15px', marginTop: '8px', marginRight: '50px' }}>
              متابعة تفصيلية للحضور، الإجازات، التدريب، الأذونات، والجزاءات للعاملين
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          
          <div style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '5px', borderRadius: '12px' }}>
            <button onClick={() => setActiveTab('leaves')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'leaves' ? '#ef4444' : 'transparent', color: activeTab === 'leaves' ? 'white' : '#475569', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: activeTab === 'leaves' ? '0 4px 6px rgba(239, 68, 68, 0.2)' : 'none' }}>الإجازات</button>
            <button onClick={() => setActiveTab('training')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'training' ? '#3b82f6' : 'transparent', color: activeTab === 'training' ? 'white' : '#475569', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: activeTab === 'training' ? '0 4px 6px rgba(59, 130, 246, 0.2)' : 'none' }}>التدريب</button>
            <button onClick={() => setActiveTab('permissions')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'permissions' ? '#f59e0b' : 'transparent', color: activeTab === 'permissions' ? 'white' : '#475569', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: activeTab === 'permissions' ? '0 4px 6px rgba(245, 158, 11, 0.2)' : 'none' }}>الأذونات</button>
            <button onClick={() => setActiveTab('penalties')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'penalties' ? '#991b1b' : 'transparent', color: activeTab === 'penalties' ? 'white' : '#475569', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: activeTab === 'penalties' ? '0 4px 6px rgba(153, 27, 27, 0.2)' : 'none' }}>الجزاءات</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={statisticType} onChange={(e) => setStatisticType(e.target.value)} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontWeight: '600', outline: 'none', cursor: 'pointer' }}>
              <option value="يومي">يومي</option>
              <option value="أسبوعي">أسبوعي</option>
              <option value="شهري">شهري</option>
              <option value="سنوي">سنوي</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>من:</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>إلى:</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
          </div>

        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>جاري تحليل البيانات...</div>
      ) : (
        <>
          {totals && (
            <div style={{ ...gridStyle, marginBottom: '30px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>إجمالي الموظفين</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b' }}>{totals['إجمالي الموظفين']}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '12px', color: '#64748b' }}>👥</div>
              </div>
              
              {activeTab === 'leaves' && <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderBottom: '4px solid #ef4444' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>إجمالي الإجازات</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#dc2626' }}>{totals['إجازات'] || 0}</div></div>}
              {activeTab === 'training' && <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderBottom: '4px solid #3b82f6' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>أيام التدريب</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#2563eb' }}>{totals['تدريب'] || 0}</div></div>}
              {activeTab === 'permissions' && <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderBottom: '4px solid #f59e0b' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>أيام الأذونات</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#d97706' }}>{totals['أذونات'] || 0}</div></div>}
              {activeTab === 'penalties' && <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderBottom: '4px solid #991b1b' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>أيام الجزاءات</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#991b1b' }}>{totals['جزاءات'] || 0}</div></div>}

              <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderBottom: '4px solid #10b981' }}><div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>الحضور</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#059669' }}>{totals['الحاضرون']}</div></div>
            </div>
          )}

          {(statisticType !== 'سنوي' && data.length > 0) && (
            <div>
              <h3 style={{ marginBottom: '15px', fontWeight: 'bold', color: '#334155', fontSize: '18px' }}>{statisticType === 'شهري' ? 'سجل أيام الشهر' : 'سجل الأيام'}</h3>
              <div style={gridStyle}>
                {data.map((row, idx) => {
                  const bg = gradients[idx % gradients.length];
                  return (
                    <div key={idx} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white', transition: 'transform 0.2s' }} 
                         onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} 
                         onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                      <div style={{ background: bg, padding: '15px', color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                        {formatDate(row['التاريخ'])}
                      </div>
                      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px' }}>
                          <span>إجمالي الموظفين</span>
                          <span style={{ color: '#1e293b', fontWeight: 'bold' }}>{row['إجمالي الموظفين']}</span>
                        </div>
                        
                        {activeTab === 'leaves' && <div style={{ color: '#dc2626', fontWeight: '600', padding: '5px', background: '#fef2f2', borderRadius: '6px', textAlign: 'center' }}>إجازات: {row['إجازات'] || 0}</div>}
                        {activeTab === 'training' && <div style={{ color: '#2563eb', fontWeight: '600', padding: '5px', background: '#eff6ff', borderRadius: '6px', textAlign: 'center' }}>تدريب: {row['تدريب'] || 0}</div>}
                        {activeTab === 'permissions' && <div style={{ color: '#d97706', fontWeight: '600', padding: '5px', background: '#fffbeb', borderRadius: '6px', textAlign: 'center' }}>أذونات: {row['أذونات'] || 0}</div>}
                        {activeTab === 'penalties' && <div style={{ color: '#991b1b', fontWeight: '600', padding: '5px', background: '#fef2f2', borderRadius: '6px', textAlign: 'center' }}>جزاءات: {row['جزاءات'] || 0}</div>}

                        <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#059669', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
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
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', color: '#94a3b8', fontSize: '18px' }}>لا توجد بيانات لهذه الفترة</div>
          )}
        </>
      )}
    </div>
  );
}