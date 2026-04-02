'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// ==========================================
// 1. Types
// ==========================================

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

// ==========================================
// 2. SVG Icons (تم التعديل هنا لقبول Props)
// ==========================================

const Icons = {
  Search: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  ),
  Users: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
  ),
  CalendarCheck: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>
  ),
  CalendarX: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m15 14-5 5"></path><path d="m20 9-5 5"></path></svg>
  ),
  Percent: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
  ),
  FileText: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  )
};

export default function StudentStatisticsPage() {
  const { user, work } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<StudentSummary[]>([]);
  const [detailsData, setDetailsData] = useState<StudentDetail[]>([]);

  const [statisticType, setStatisticType] = useState<string>('شهري');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(firstDay.toISOString().split('T')[0]);
  }, []);

  const fetchData = async () => {
    if (!user?.schoolId || !work?.yearId || !startDate || !endDate) return;
    
    setLoading(true);
    setError(null);

    try {
      const inpot = 12; 

      const res = await fetch(
        `${API_URL}/api/statistics?statisticType=${statisticType}&startDate=${startDate}&endDate=${endDate}&schoolId=${user.schoolId}&yearId=${work.yearId}&inpot=${inpot}`
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
    if (startDate && endDate) fetchData();
  }, [statisticType, startDate, endDate, user, work]);

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('ar-EG');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-purple-500/30 font-sans pb-20">
      {/* خلفية متوهجة */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Icons.FileText className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">تقارير حضور الطلاب</h1>
                <p className="text-slate-400 text-sm">تحليل تفصيلي للغياب </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 w-full xl:w-auto bg-slate-800/30 p-3 rounded-2xl border border-slate-700/50">
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 px-1">نوع التقرير</label>
                <select 
                  value={statisticType} 
                  onChange={(e) => setStatisticType(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="شهري">شهري</option>
                  <option value="أسبوعي">أسبوعي</option>
                  <option value="يومي">يومي</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 px-1">من تاريخ</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 px-1">إلى تاريخ</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
                />
              </div>

              <button 
                onClick={fetchData}
                disabled={loading}
                className="h-[42px] px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Icons.Search />
                <span>عرض</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200">
            {/* تم تمرير className هنا */}
            <Icons.CalendarX className="w-5 h-5" /> 
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>جاري تحليل بيانات الطلاب...</p>
          </div>
        ) : (
          <>
            {summaryData.length > 0 && summaryData.map((row, idx) => {
              const totalStudents = row['إجمالي عدد الطلاب'] || 0;
              const attendanceDays = row['أيام الحضور الفعلية'] || row['أيام الحضور'] || 0;
              const totalAbsence = row['إجمالي أيام الغياب'] || 0;
              const rate = Number(row['نسبة الحضور'] || 0).toFixed(1);

              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all border-r-4 border-r-blue-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-slate-400 text-sm font-medium mb-1">إجمالي الطلاب</h3>
                        <p className="text-3xl font-black text-blue-400">{totalStudents}</p>
                      </div>
                      <div className="p-2 bg-slate-900/50 rounded-lg text-slate-400"><Icons.Users /></div>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all border-r-4 border-r-emerald-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-slate-400 text-sm font-medium mb-1">أيام الحضور</h3>
                        <p className="text-3xl font-black text-emerald-400">{attendanceDays}</p>
                      </div>
                      <div className="p-2 bg-slate-900/50 rounded-lg text-slate-400"><Icons.CalendarCheck /></div>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all border-r-4 border-r-red-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-slate-400 text-sm font-medium mb-1">أيام الغياب</h3>
                        <p className="text-3xl font-black text-red-400">{totalAbsence}</p>
                      </div>
                      <div className="p-2 bg-slate-900/50 rounded-lg text-slate-400"><Icons.CalendarX /></div>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all border-r-4 border-r-purple-500">
                    <div className="flex justify-between items-start">
                      <div className="w-full">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-slate-400 text-sm font-medium">نسبة الحضور</h3>
                            <p className="text-3xl font-black text-purple-400">{rate}%</p>
                          </div>
                          <div className="p-2 bg-slate-900/50 rounded-lg text-slate-400"><Icons.Percent /></div>
                        </div>
                        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${parseFloat(rate) > 80 ? 'bg-emerald-500' : 'bg-yellow-500'}`} 
                            style={{ width: `${Math.min(parseFloat(rate), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <section className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  {/* تم تمرير className هنا */}
                  <Icons.Users className="text-purple-400" />
                  قائمة الطلاب المتغيبين 
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-semibold">مسلسل</th>
                      <th className="p-4 font-semibold">اسم الطالب</th>
                      <th className="p-4 font-semibold">تاريخ الغياب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {detailsData.length > 0 ? (
                      detailsData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30 transition-colors group">
                          <td className="p-4 text-slate-500 font-mono group-hover:text-purple-400">
                            #{row['مسلسل'] || idx + 1}
                          </td>
                          <td className="p-4 font-bold text-slate-200">
                            {row['اسم الطالب'] || 'غير معروف'}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              {/* تم تمرير width و height هنا */}
                              <Icons.CalendarX width={14} height={14} />
                              {formatDate(row['تاريخ الغياب'] as string)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-slate-500">
                          لا توجد سجلات غياب في هذه الفترة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}