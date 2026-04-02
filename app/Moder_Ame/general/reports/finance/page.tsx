'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

type TabType = 10 | 11 | 12 | 13 | 14 | 16 | 99;
const orderedTabs: TabType[] = [10, 11, 12, 13, 14, 16, 99];

const valueKeys: Record<TabType, string[]> = {
  10: ['عدد العمليات', 'إجمالي المبلغ'],
  11: ['إجمالي المطلوب', 'إجمالي المدفوع', 'إجمالي المتبقي'],
  12: ['إجمالي الحكومى', 'إجمالي الخاص'],
  13: ['إجمالي المطلوب', 'إجمالي المدفوع', 'إجمالي المتبقي', 'حالة السداد'],
  14: ['عدد الأقساط', 'المدفوع', 'المتبقي'],
  16: ['الحالة'],
  99: ['السنة الدراسية', 'النوع', 'المبلغ المطلوب', 'المدفوع', 'المتبقي', 'حالة السداد'],
};

const tabNames: Record<TabType, string> = {
  10: '🏛️ حكومية',
  11: '💸 خاصة',
  12: '📊 الكل',
  13: '⏳ متأخرات',
  14: '📅 أقساط',
  16: '🚫 لم يسددوا',
  99: '📜 السجل التراكمي',
};

function ExpensesDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams();
  
  const [schools, setSchools] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  const [allStudents, setAllStudents] = useState<any[]>([]); 
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [dataTabs, setDataTabs] = useState<Record<TabType, any[]>>(() => {
    const initial: any = {};
    orderedTabs.forEach(t => initial[t] = []);
    return initial;
  });
  
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(10);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // === متغيرات المودال الجديدة ===
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // === دوال الوصول للبيانات ===
  const getSchoolName = (s: any) => s['المدرسة'] || s.SchoolNam || s.SchoolName || s.EntityName || s.name || Object.values(s).find((v: any) => typeof v === 'string') || '';
  const getSchoolId = (s: any) => s['الرقم'] || s.SchoolID || s.EntityID || s.id || Object.values(s).find((v: any) => typeof v === 'number');
  const getYearName = (y: any) => y['العام الدراسي'] || y.YearName || y.YerName || y['العام'] || y.EntityName || y.name || Object.values(y).find((v: any) => typeof v === 'string') || '';
  const getYearId = (y: any) => y['الرقم'] || y.YearID || y.YerID || y.EntityID || y.id || Object.values(y).find((v: any) => typeof v === 'number');
  const getStudentName = (s: any) => s['الاسم بالعربى'] || s['اسم الطالب'] || s.ArbStudName || s.name || s.EntityName || Object.values(s).find((v: any) => typeof v === 'string') || '';
  const getStudentId = (s: any) => s['الرقم'] || s.StudentID || s.EntityID || s.id || Object.values(s).find((v: any) => typeof v === 'number');

  // 1. جلب المدارس والسنوات
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

  // 2. تحديد القيم الافتراضية
  useEffect(() => {
    const urlSchool = searchParams.get('schoolId');
    const urlYear = searchParams.get('yearId');
    
    if (urlSchool) setSelectedSchool(urlSchool);
    else if (user?.schoolId) setSelectedSchool(String(user.schoolId));

    if (urlYear) setSelectedYear(urlYear);
    else if (work?.yearId) setSelectedYear(String(work.yearId));
    else if (years.length > 0) {
         const currentYear = years.find(y => String(getYearName(y)).includes(new Date().getFullYear().toString()));
         if (currentYear) setSelectedYear(String(getYearId(currentYear)));
         else setSelectedYear(String(getYearId(years[0])));
    }
  }, [user, work, years, searchParams]);

  // 3. جلب قائمة الطلاب
  useEffect(() => {
    if (!selectedSchool || !selectedYear) return;
    
    const fetchStudents = async () => {
        setLoadingStudents(true);
        setSelectedStudentId('');
        try {
            const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${selectedSchool}&yearId=${selectedYear}&inpout=1`);     
            if(res.ok) {
                const data = await res.json();
                if (data.success && data.data) setAllStudents(data.data);
                else setAllStudents([]);
            }
        } catch(e) { console.error(e); setAllStudents([]); }
        finally { setLoadingStudents(false); }
    };
    fetchStudents();
  }, [selectedSchool, selectedYear]);

  // 4. جلب البيانات المالية العادية
  useEffect(() => {
    if (!selectedSchool || !selectedYear || activeTab === 99) return;
    setLoading(true);

    const fetchData = async (inpot: TabType) => {
      try {
        const url = `${API_URL}/api/search/scher2int?sch1=${selectedSchool}&sch2=${selectedYear}&inpot=${inpot}`;
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok || text.startsWith('<!DOCTYPE')) return []; 
        return JSON.parse(text).data || [];
      } catch { return []; }
    };

    const normalTabs = orderedTabs.filter(t => t !== 99) as TabType[];
    Promise.all(normalTabs.map(tab => fetchData(tab)))
      .then((results) => {
        const newData: any = {};
        normalTabs.forEach((tab, index) => { newData[tab] = results[index] || []; });
        setDataTabs(newData);
      })
      .finally(() => setLoading(false));
  }, [selectedSchool, selectedYear, activeTab]);

  // 5. جلب السجل التراكمي (INPOT 99)
  useEffect(() => {
    if (activeTab !== 99 || !selectedStudentId) return;

    const fetchHistory = async () => {
        setLoading(true);
        setHistoryData([]);
        try {
            const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedSchool}&sch2=${selectedStudentId}&inpot=99`); 
            const text = await res.text();
            if (res.ok && !text.startsWith('<!DOCTYPE')) {
                const json = JSON.parse(text);
                setHistoryData(json.data || []);
            }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };
    fetchHistory();
  }, [selectedStudentId, selectedSchool, activeTab]);

  // === دالة جلب تفاصيل الطالب (فيها حكومي وخاص وصور) ===
  const fetchStudentDetails = async (studentId: string | number) => {
    if(!selectedYear) return;
    setDetailLoading(true);
    try {
      const url = `${API_URL}/api/search/scher2int?sch1=${studentId}&sch2=${selectedYear}&inpot=28`;
      const res = await fetch(url);
      const json = await res.json();
      setStudentDetails(json.success ? json.data : []);
    } catch (err) {
      console.error("❌ خطأ في جلب تفاصيل الطالب:", err);
      setStudentDetails([]);
    }
    setDetailLoading(false);
  };

  const handleOpenDetails = (item: any) => {
    // نحاول استخراج الـ ID من الكارت نفسه، وإذا لم ينجح (مثل تبويب 99) نأخذه من الطالب المختار بالـ Dropdown
    const studentId = item['StudentID'] || item['id'] || item['رقم القيد'] || selectedStudentId;
    if (!studentId) {
      alert("لا يوجد معرف للطالب لجلب البيانات");
      return;
    }
    setSelectedStudent(item);
    setIsModalOpen(true);
    fetchStudentDetails(studentId);
  };

  // الحسابات
  const govTotal = (dataTabs[12] || []).reduce((s: number, i: any) => s + Number(i['إجمالي الحكومى'] || 0), 0);
  const privateTotal = (dataTabs[12] || []).reduce((s: number, i: any) => s + Number(i['إجمالي الخاص'] || 0), 0);
  const grandTotal = govTotal + privateTotal;

  const pieData = {
    labels: ['حكومي', 'خاص'],
    datasets: [{ data: [govTotal, privateTotal], backgroundColor: ['#4c1d95', '#f97316'], hoverOffset: 6 }]
  };

  const displayData = activeTab === 99 ? historyData : (dataTabs[activeTab] || []);
  const displayKeys = valueKeys[activeTab];

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white', padding: '25px 15px', borderRadius: 20, marginBottom: 20, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>📊 لوحة التحليل المالي</h1>
      </div>

      <div style={{ background: 'white', padding: 15, borderRadius: 15, marginBottom: 20, display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: '600', fontSize: 13 }}>المدرسة</label>
              <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <option value=''>اختر المدرسة</option>
                  {schools.map((s, i) => <option key={i} value={getSchoolId(s)}>{getSchoolName(s)}</option>)}
              </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: '600', fontSize: 13 }}>العام الدراسي</label>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <option value=''>اختر العام</option>
                  {years.map((y, i) => <option key={i} value={getYearId(y)}>{getYearName(y)}</option>)}
              </select>
          </div>

          {activeTab === 99 && (
            <div style={{ flex: '2', minWidth: '300px' }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: '600', fontSize: 13 }}>الطالب ({allStudents.length})</label>
                <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} disabled={loadingStudents} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <option value=''>{loadingStudents ? 'جاري التحميل...' : 'اختر الطالب لعرض سجله'}</option>
                    {allStudents.map((s, i) => (
                        <option key={i} value={getStudentId(s)}>
                            {getStudentName(s)} - {s['الصف'] || ''}
                        </option>
                    ))}
                </select>
            </div>
          )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {orderedTabs.map((tab) => (
          <Tab key={tab} title={tabNames[tab]} value={tab} active={activeTab} set={setActiveTab} />
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>جاري التحميل...</div>
      ) : (
        <>
          {activeTab !== 99 && (
              <div style={{ display: 'flex', gap: 15, marginBottom: 25, flexWrap: 'wrap' }}>
                 <StatCard title="حكومية" value={govTotal} color="#4c1d95" icon="🏛️" />
                 <StatCard title="خاصة" value={privateTotal} color="#f97316" icon="💸" />
                 <StatCard title="الإجمالي" value={grandTotal} color="#059669" icon="💰" />
                 <div style={{ flex: '1 1 200px', maxWidth: '250px', background: 'white', padding: '12px', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pie data={pieData} />
                 </div>
              </div>
          )}

           {activeTab === 99 && !selectedStudentId && (
             <div style={{ textAlign: 'center', padding: '40px', color: '#2563eb', background: '#eff6ff', borderRadius: 15 }}>
                <h3>اختر الطالب من القائمة أعلاه</h3>
                <p style={{fontSize: 14}}>سيتم عرض سجله المالي التراكمي (حكومي + خاص) لجميع السنوات.</p>
             </div>
           )}

          {displayData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 15 }}>
              {displayData.map((item, i) => (
                <div key={i} onClick={() => handleOpenDetails(item)}>
                  <DataCard item={item} keys={displayKeys} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === مودال تفاصيل الطالب === */}
      <DetailsModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setStudentDetails([]); }} 
        student={selectedStudent} 
        details={studentDetails} 
        loading={detailLoading} 
        activeTab={activeTab} 
      />
    </div>
  );
}

// =====================================================================
// === مكون المودال (فلترة + صور معالجة من الـ SQL Buffer) ========
// =====================================================================
function DetailsModal({ isOpen, onClose, student, details, loading, activeTab }: any) {
  if (!isOpen) return null;

  let displayPayments = details;
  if (activeTab === 10) { 
    displayPayments = details.filter((p: any) => p['نوع المصروفات'] === 'حكومية');
  } else if (activeTab === 11) { 
    displayPayments = details.filter((p: any) => p['نوع المصروفات'] === 'خاصة');
  } else if (activeTab === 14) { 
    displayPayments = details.filter((p: any) => p['نوع المصروفات'] === 'خاصة'); 
     } else if (activeTab === 13) { 
    displayPayments = details.filter((p: any) => p['نوع المصروفات'] === 'خاصة'); 
  }
  // أما لو التبويب (الكل أو متأخرات أو السجل التراكمي) يعرض اللي رجع كله

  const renderImage = (imgData: any) => {
    if (!imgData) return null;
    let base64String = '';
    if (typeof imgData === 'string') {
      base64String = imgData;
    } else if (imgData.type === 'Buffer' && imgData.data) {
      const bytes = new Uint8Array(imgData.data);
      let binary = '';
      bytes.forEach((b: number) => binary += String.fromCharCode(b));
      base64String = btoa(binary);
    } else {
      return null;
    }
    return `data:image/jpeg;base64,${base64String}`;
  };

  const getCardStyle = (type: string) => {
    if (type === 'حكومية') return { border: '1px solid #c4b5fd', background: 'linear-gradient(to bottom, #f5f3ff, #ffffff)' };
    return { border: '1px solid #fed7aa', background: 'linear-gradient(to bottom, #fff7ed, #ffffff)' };
  };

  const getBadgeStyle = (type: string) => {
    if (type === 'حكومية') return { background: '#4c1d95', color: 'white' };
    return { background: '#f97316', color: 'white' };
  };

  return (
    <div 
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 650, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.3s ease' }}
      >
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>{student?.['اسم الطالب'] || student?.['السنة الدراسية'] || 'تفاصيل السداد'}</h2>
            {student?.['الصف'] && <p style={{ margin: '5px 0 0', opacity: 0.8, fontSize: '13px' }}>الصف: {student['الصف']}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 35, height: 35, borderRadius: '50%', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div className="spinner" style={{ margin: '0 auto 10px', width: 30, height: 30, border: '3px solid #f3f3f3', borderTop: '3px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              جاري تحميل سجل المصروفات...
            </div>
          ) : displayPayments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
              {details.length > 0 ? 'لا توجد مصروفات مطابقة لهذا التصنيف المحدد' : 'لا توجد مصروفات مسجلة في هذا العام'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {displayPayments.map((pay: any, idx: number) => {
                const type = pay['نوع المصروفات'] || 'خاصة';
                const imgSrc = renderImage(pay['صورة الوصل']);
                
                return (
                  <div key={idx} style={{ ...getCardStyle(type), borderRadius: 12, padding: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>
                        {type === 'حكومية' ? '🏛️' : '💸'} قسط {pay['رقم القسط'] || (idx + 1)}
                      </span>
                      <span style={{ ...getBadgeStyle(type), padding: '4px 12px', borderRadius: 20, fontSize: '12px', fontWeight: 'bold' }}>
                        {type}
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '13px' }}>
                      <div style={{ background: 'white', padding: '8px', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>المطلوب</div>
                        <div style={{ color: '#334155', fontWeight: 'bold' }}>{Number(pay['إجمالي المطلوب'] || 0).toLocaleString('ar-EG')} ج.م</div>
                      </div>
                      <div style={{ background: 'white', padding: '8px', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>المدفوع بهذه الدفعة</div>
                        <div style={{ color: '#059669', fontWeight: 'bold' }}>{Number(pay['المدفوع'] || 0).toLocaleString('ar-EG')} ج.م</div>
                      </div>
                      <div style={{ background: 'white', padding: '8px', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>إجمالي المدفوع حتى الآن</div>
                        <div style={{ color: '#2563eb', fontWeight: 'bold' }}>{Number(pay['إجمالي المدفوع حتى الآن'] || 0).toLocaleString('ar-EG')} ج.م</div>
                      </div>
                      <div style={{ background: 'white', padding: '8px', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>المتبقي</div>
                        <div style={{ color: Number(pay['المتبقي'] || 0) > 0 ? '#dc2626' : '#059669', fontWeight: 'bold' }}>
                          {Number(pay['المتبقي'] || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                      <span>📅 تاريخ السداد: {pay['تاريخ السداد'] ? new Date(pay['تاريخ السداد']).toLocaleDateString('ar-EG') : '—'}</span>
                      <span>🔢 رقم العملية: {pay['رقم العملية'] || '—'}</span>
                    </div>

                    {imgSrc && (
                      <div style={{ marginTop: '15px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>🖼️ صورة الإيصال:</div>
                        <img 
                          src={imgSrc} 
                          alt="صورة الوصل" 
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', padding: '5px', cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); window.open(imgSrc, '_blank'); }}
                        />
                        <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>اضغط على الصورة لتكبيرها في نافذة جديدة</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

export default function ExpensesDashboard() {
  return (
    <Suspense fallback={<div>جاري التحميل...</div>}>
      <ExpensesDashboardContent />
    </Suspense>
  );
}

// === Helper Components ===

function DataCard({ item, keys }: any) {
  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #f3f4f6', cursor: 'pointer', transition: 'all 0.3s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'; e.currentTarget.style.borderColor = '#f3f4f6'; }}>
      <div style={{ background: '#f8fafc', padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '15px' }}>
            {item['السنة الدراسية'] || item['اسم الطالب'] || item['المدرسة'] || '—'}
          </div>
          {item['النوع'] && (
             <span style={{ 
                fontSize: '11px', 
                background: item['النوع'].includes('حكومية') ? '#dbeafe' : '#fef3c7', 
                color: item['النوع'].includes('حكومية') ? '#1e40af' : '#92400e',
                padding: '2px 8px', borderRadius: '4px', marginTop: '5px', display: 'inline-block'
             }}>
                {item['النوع']}
             </span>
          )}
        </div>
        <span style={{ color: '#94a3b8', fontSize: '18px' }}>⟵</span>
      </div>
      <div style={{ padding: '12px 16px' }}>
        {keys.map((k: string, idx: number) => {
            if (k === 'السنة الدراسية' || k === 'النوع') return null;
            
            return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px dashed #f1f5f6' }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ fontWeight: 'bold', color: k.includes('مبلغ') || k.includes('مدفوع') ? '#059669' : k.includes('متبقي') ? '#ef4444' : '#334155' }}>
                    {k.includes('مبلغ') || k.includes('مدفوع') || k.includes('متبقي') ? `${Number(item[k] || 0).toLocaleString('ar-EG')} ج` : item[k] ?? '—'}
                </span>
                </div>
            );
        })}
      </div>
    </div>
  )
}

function StatCard({ title, value, color, icon }: any) {
  return (
    <div style={{ flex: '1', background: 'white', padding: '12px', borderRadius: 15, textAlign: 'center', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '20px' }}>{icon}</div>
      <div style={{ color: '#475569', fontWeight: '600', fontSize: '11px' }}>{title}</div>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: color }}>{value.toLocaleString('ar-EG')} ج</div>
    </div>
  );
}

function Tab({ title, value, active, set }: any) {
  return (
    <button onClick={() => set(value)} style={{ padding: '8px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', background: active === value ? '#0f172a' : '#ffffff', color: active === value ? 'white' : '#475569', fontWeight: 'bold', fontSize: '13px' }}>
      {title}
    </button>
  );
}