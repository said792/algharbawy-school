'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// ==========================================
// 1. Types & Icons
// ==========================================

type DynamicRow = Record<string, any>;

const Icons = {
  Search: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  ),
  Table: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3v18"></path><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
  ),
  Percent: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
  ),
  FileText: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  ),
  AlertCircle: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
  ),
  Bug: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m8 2 1.88 1.88"></path><path d="M14.12 3.88 16 2"></path><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"></path><path d="M12 20v-9"></path><path d="M6.53 9C4.6 8.8 3 7.1 3 5"></path><path d="M6 13H2"></path><path d="M3 21c0-2.1 1.7-3.9 3.8-4"></path><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"></path><path d="M22 13h-4"></path><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"></path></svg>
  )
};

export default function FormattedAttendancePage() {
  const { user, work } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mainTable, setMainTable] = useState<DynamicRow[]>([]);
  const [percentageTable, setPercentageTable] = useState<DynamicRow[]>([]);

  const [statisticType, setStatisticType] = useState<string>('أسبوعي');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(firstDay.toISOString().split('T')[0]);
  }, []);

  const fetchData = async () => {
    if (!user?.schoolId || !work?.yearId || !work?.stageId || !startDate || !endDate) {
        setError("بيانات ناقصة");
        return;
    }

    setLoading(true);
    setError(null);
    setMainTable([]);
    setPercentageTable([]);

    try {
      const inpot = 21;
      
      const res = await fetch(
        `${API_URL}/api/statistics?statisticType=${statisticType}&startDate=${startDate}&endDate=${endDate}&schoolId=${user.schoolId}&yearId=${work.yearId}&inpot=${inpot}&stageId=${work.stageId}`
      );

      const result = await res.json();

      if (result.success && result.data) {
        const main = Array.isArray(result.data[0]) ? result.data[0] : [];
        const percentages = Array.isArray(result.data[1]) ? result.data[1] : [];

        if (main.length > 0 && main[0]['رسالة النظام']) {
            setError(main[0]['رسالة النظام']);
            setMainTable([]);
        } else {
            setMainTable(main);
            setPercentageTable(percentages);
        }
      } else {
        setError(result.error || 'فشل في جلب البيانات');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('فشل الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate && work?.stageId) fetchData();
  }, [statisticType, startDate, endDate, user, work]);

  // ✨✨✨ دالة جديدة لمعالجة وتجميع الـ Headers ✨✨✨
  const processHeaders = (rawHeaders: string[]) => {
    const fixedCols: string[] = [];
    const groupedCols = new Map<string, string[]>(); // Map<GradeName, [SubCols]>

    rawHeaders.forEach(header => {
      // نفترض أن الأعمدة المركبة تحتوي على " - "
      if (header.includes(' - ')) {
        const parts = header.split(' - ');
        const gradeName = parts[0].trim();
        const subCol = parts[1].trim();

        if (!groupedCols.has(gradeName)) {
          groupedCols.set(gradeName, []);
        }
        groupedCols.get(gradeName)?.push(header); // نحفظ الاسم الكامل للعمود
      } else {
        // أعمدة ثابتة (اليوم، التاريخ، البيان)
        fixedCols.push(header);
      }
    });

    return { fixedCols, groupedCols };
  };

  // ✨✨✨ دالة العرض المحدثة مع Headers مركبة ✨✨✨
  const renderDynamicTable = (data: DynamicRow[], title: string, icon: any, isPercentageTable: boolean = false) => {
    if (data.length === 0) return null;
    
    const rawHeaders = Object.keys(data[0]);
    const { fixedCols, groupedCols } = processHeaders(rawHeaders);
    
    // تحويل الـ Map إلى Array للسهولة في الـ JSX
    const groupsArray = Array.from(groupedCols.entries());

    return (
      <section className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl mb-8">
        <div className="p-5 border-b border-slate-700/50 bg-slate-900/40 flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            
            {/* === Header Section === */}
            <thead className="bg-slate-900/50 text-slate-300 text-sm uppercase tracking-wider">
                
                {/* الصف الأول: الأعمدة الثابتة + أسماء الصفوف */}
                <tr>
                    {fixedCols.map(key => (
                        <th key={key} rowSpan={2} className="p-4 font-semibold border-l border-b border-slate-700/50 align-bottom">
                            {isPercentageTable && key === 'اليوم' ? 'البيان' : key}
                        </th>
                    ))}
                    
                    {groupsArray.map(([gradeName, cols]) => (
                        <th key={gradeName} colSpan={cols.length} className="p-4 font-semibold text-center border-l border-b border-slate-700/50 bg-slate-800/30">
                            {gradeName}
                        </th>
                    ))}
                </tr>

                {/* الصف الثاني: الأعمدة الفرعية (مقيد، حاضر، غائب) */}
                <tr>
                    {groupsArray.map(([gradeName, cols]) => (
                        cols.map(subColFull => {
                            // استخراج الجزء الأخير من الاسم (مقيد، حاضر...)
                            const subName = subColFull.split(' - ')[1] || subColFull;
                            return (
                                <th key={subColFull} className="p-3 font-semibold text-center border-l border-b border-slate-700/50 text-xs">
                                    {subName}
                                </th>
                            );
                        })
                    ))}
                </tr>
            </thead>

            {/* === Body Section === */}
            <tbody className="divide-y divide-slate-800/50">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-700/20 transition-colors group">
                  
                  {/* عرض الأعمدة الثابتة */}
                  {fixedCols.map(key => (
                     <td key={key} className="p-4 text-slate-200 border-l border-slate-800/30 font-bold">
                        {row[key] !== null ? row[key].toString() : '-'}
                     </td>
                  ))}

                  {/* عرض الأعمدة الديناميكية */}
                  {groupsArray.map(([gradeName, cols]) => (
                      cols.map(subColFull => {
                          let value = row[subColFull];
                          let cellClass = "p-4 text-slate-200 border-l border-slate-800/30 last:border-l-0 group-hover:text-white text-center";
                          
                          if (typeof value === 'number') {
                              const subName = subColFull.split(' - ')[1];
                              // تلوين الحضور والغياب
                              if (subName === 'غائب' || subName === 'غياب' || subName === 'نسبة الغياب') {
                                  if (value > 0) cellClass += " text-red-400 font-bold bg-red-500/5";
                              } else if (subName === 'حضور' || subName === 'حاضر' || subName === 'نسبة الحضور') {
                                  cellClass += " text-emerald-400 font-bold";
                              }

                              // تنسيق النسب
                              if (isPercentageTable) {
                                  return (
                                      <td key={subColFull} className={cellClass}>
                                          {value.toFixed(2)}%
                                      </td>
                                  );
                              }
                          }

                          return (
                              <td key={subColFull} className={cellClass}>
                                  {value !== null ? value.toString() : '-'}
                              </td>
                          );
                      })
                  ))}

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-emerald-500/30 font-sans pb-20">
      {/* ... (Background and Header JSX remains the same) ... */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px]"></div>
      </div>

      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <Icons.FileText className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">تقرير الحضور المنسق</h1>
                <p className="text-slate-400 text-sm">تقرير تفصيلي حسب الصفوف </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 w-full xl:w-auto bg-slate-800/30 p-3 rounded-2xl border border-slate-700/50">
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 px-1">نوع التقرير</label>
                <select 
                  value={statisticType} 
                  onChange={(e) => setStatisticType(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="أسبوعي">أسبوعي</option>
                  <option value="شهري">شهري</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 px-1">من تاريخ</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none w-32"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 px-1">إلى تاريخ</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none w-32"
                />
              </div>

              <button 
                onClick={fetchData}
                disabled={loading}
                className="h-[42px] px-6 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
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
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3 text-yellow-200">
            <Icons.AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>جاري تحميل التقرير المنسق...</p>
          </div>
        ) : (
          <>
            {mainTable.length > 0 && renderDynamicTable(mainTable, 'تفاصيل الحضور والغياب', <Icons.Table className="text-emerald-400 w-6 h-6" />)}
            
            {percentageTable.length > 0 && renderDynamicTable(percentageTable, 'نسب الحضور والغياب', <Icons.Percent className="text-cyan-400 w-6 h-6" />, true)}

            {mainTable.length === 0 && !loading && !error && (
              <div className="text-center text-slate-500 py-10">
                 لا توجد بيانات للعرض لهذه المعايير.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}