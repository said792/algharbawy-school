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

type TabType = 10 | 11 | 12 | 13 | 14 | 16;
const orderedTabs: TabType[] = [10, 11, 12, 13, 14, 16];

const valueKeys: Record<TabType, string[]> = {
  10: ['عدد العمليات', 'إجمالي المبلغ'],
  11: ['إجمالي المطلوب', 'إجمالي المدفوع', 'إجمالي المتبقي'],
  12: ['إجمالي الحكومى', 'إجمالي الخاص'],
  13: ['إجمالي المطلوب', 'إجمالي المدفوع', 'إجمالي المتبقي', 'حالة السداد'],
  14: ['عدد الأقساط', 'المدفوع', 'المتبقي'],
  16: ['الحالة'],
};

const tabNames: Record<TabType, string> = {
  10: '🏛️ حكومية',
  11: '💸 خاصة',
  12: '📊 الكل',
  13: '⏳ متأخرات',
  14: '📅 أقساط',
  16: '🚫 لم يسددوا',
};

function ExpensesDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams();
  
  const tabFromUrl = searchParams.get('tab');
  const schoolIdFromUrl = searchParams.get('schoolId');

  const [dataTabs, setDataTabs] = useState<Record<TabType, any[]>>(() => {
    const initial: any = {};
    orderedTabs.forEach(t => initial[t] = []);
    return initial;
  });
  
  const getInitialTab = (): TabType => {
    const id = Number(tabFromUrl);
    if (orderedTabs.includes(id as TabType)) return id as TabType;
    return 10;
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // === متغيرات المودال ===
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async (inpot: TabType) => {
    const schoolId = schoolIdFromUrl || user?.schoolId;
    const yearId = work?.yearId;
    if (!schoolId || !yearId) return [];
    try {
      const url = `${API_URL}/api/search/scher2int?sch1=${schoolId}&sch2=${yearId}&inpot=${inpot}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) {
      console.error(`❌ خطأ في التبويب ${inpot}:`, err);
      return [];
    }
  };

  // === جلب تفاصيل الطالب (فيها حكومي وخاص وصور) ===
  const fetchStudentDetails = async (studentId: string | number) => {
    setDetailLoading(true);
    try {
      const url = `${API_URL}/api/search/scher2int?sch1=${studentId}&sch2=${work?.yearId}&inpot=28`;
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
    const studentId = item['StudentID'] || item['id'] || item['رقم القيد'];
    if (!studentId) {
      alert("لا يوجد معرف للطالب لجلب البيانات");
      return;
    }
    setSelectedStudent(item);
    setIsModalOpen(true);
    fetchStudentDetails(studentId);
  };

  useEffect(() => {
    const id = Number(tabFromUrl);
    if (orderedTabs.includes(id as TabType)) setActiveTab(id as TabType);

    const schoolId = schoolIdFromUrl || user?.schoolId;
    const yearId = work?.yearId;

    if (schoolId && yearId) {
      setLoading(true);
      setErrorMsg(null);
      Promise.all(orderedTabs.map(tab => fetchData(tab)))
        .then((results) => {
          const newData: any = {};
          orderedTabs.forEach((tab, index) => { newData[tab] = results[index] || []; });
          setDataTabs(newData);
        })
        .catch(err => { setErrorMsg("حدث خطأ في تحميل البيانات"); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      if(!schoolId) setErrorMsg("لا يوجد معرف للمدرسة");
      else if(!yearId) setErrorMsg("برجاء اختيار العام الدراسي أولاً");
    }
  }, [user, work, schoolIdFromUrl, tabFromUrl]);

  const displayData = dataTabs[activeTab] || [];
  const displayKeys = valueKeys[activeTab];
  const govTotal = (dataTabs[12] || []).reduce((s: number, i: any) => s + Number(i['إجمالي الحكومى'] || 0), 0);
  const privateTotal = (dataTabs[12] || []).reduce((s: number, i: any) => s + Number(i['إجمالي الخاص'] || 0), 0);
  const grandTotal = govTotal + privateTotal;

  const pieData = {
    labels: ['حكومي', 'خاص'],
    datasets: [{ data: [govTotal, privateTotal], backgroundColor: ['#4c1d95', '#f97316'], hoverOffset: 6 }]
  };

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white', padding: '25px 15px', borderRadius: 20, marginBottom: 20, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>📊 لوحة التحليل المالي</h1>
        <p style={{ margin: '5px 0 0', opacity: 0.8, fontSize: '14px' }}>تحليل شامل للمصروفات المدرسية</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {orderedTabs.map((tab) => (
          <Tab key={tab} title={tabNames[tab]} value={tab} active={activeTab} set={setActiveTab} />
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 10px', width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          جاري تحميل البيانات...
        </div>
      ) : errorMsg ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#ef4444', background: '#fef2f2', borderRadius: 15, border: '1px solid #fecaca' }}>⚠️ {errorMsg}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 15, marginBottom: 25, flexWrap: 'wrap', alignItems: 'stretch' }}>
            <StatCard title="حكومية" value={govTotal} color="#4c1d95" icon="🏛️" />
            <StatCard title="خاصة" value={privateTotal} color="#f97316" icon="💸" />
            <StatCard title="الإجمالي" value={grandTotal} color="#059669" icon="💰" />
            <div style={{ flex: '1 1 200px', maxWidth: '250px', background: 'white', padding: '12px', borderRadius: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ textAlign: 'center', marginBottom: 8, color: '#334155', fontSize: '14px', marginTop: 0 }}>نسبة التحصيل</h3>
              <div style={{ maxWidth: '130px', width: '100%' }}><Pie data={pieData} /></div>
            </div>
          </div>

          {displayData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', background: 'white', borderRadius: 15 }}>لا توجد بيانات لهذا القسم</div>
          ) : (
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

      {/* === مودال تفاصيل الطالب (تم تمرير activeTab) === */}
      <DetailsModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setStudentDetails([]); }} 
        student={selectedStudent} 
        details={studentDetails} 
        loading={detailLoading} 
        activeTab={activeTab} 
      />

      <style jsx>{` @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } `}</style>
    </div>
  );
}

// =====================================================================
// === مكون المودال (فلترة + صور معالجة من الـ SQL Buffer) ========
// =====================================================================
function DetailsModal({ isOpen, onClose, student, details, loading, activeTab }: any) {
  if (!isOpen) return null;

  // 1. فلترة البيانات بناءً على التبويب الأصل
  let displayPayments = details;
  if (activeTab === 10) { // لو تبويب حكومية
    displayPayments = details.filter((p: any) => p['نوع المصروفات'] === 'حكومية');
    } else if (activeTab === 11) { // لو تبويب خاصة
    displayPayments = details.filter((p: any) => p['نوع المصروفات'] === 'خاصة');
    } else if (activeTab === 14) { 
    // ⚠️ ملاحظة: تأكد من عدم وجود مسافة زائدة في النص
    displayPayments = details.filter((p: any) => p['نوع المصروفات'] === 'خاصة'); 
  } else if (activeTab === 13) { 
    // ⚠️ ملاحظة: تأكد من عدم وجود مسافة زائدة في النص
    displayPayments = details.filter((p: any) => p['نوع المصروفات'] === 'خاصة'); 
    }
  // أما لو التبويب (الكل أو متأخرات أو أقساط) يعرض اللي رجع كله

  // 2. تحويل الصورة من Buffer لـ Base64 يفهمها المتصفح
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
            <h2 style={{ margin: 0, fontSize: '18px' }}>{student?.['اسم الطالب'] || 'تفاصيل الطالب'}</h2>
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
              {details.length > 0 ? 'لا توجد مصروفات مطابقة لهذا التصنيف المحدد' : 'لا توجد مصروفات مسجلة لهذا الطالب في هذا العام'}
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

                    {/* عرض الصورة لو موجودة */}
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
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// === المكونات المساعدة (DataCard, StatCard, Tab) ==================
// =====================================================================

export default function ExpensesDashboard() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <ExpensesDashboardContent />
    </Suspense>
  );
}

function DataCard({ item, keys }: any) {
  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'all 0.3s', border: '1px solid #f3f4f6', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'; e.currentTarget.style.borderColor = '#f3f4f6'; }}>
      
      <div style={{ background: 'linear-gradient(to right, #f8fafc, #ffffff)', padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }}></span>
            {item['اسم الطالب'] || item['المدرسة'] || '—'}
          </div>
          {item['الصف'] && <div style={{ fontSize: '11px', color: '#64748b', marginTop: 4, paddingRight: 16 }}>{item['الصف']}</div>}
        </div>
        <span style={{ color: '#94a3b8', fontSize: '18px' }}>⟵</span>
      </div>

      <div style={{ padding: '12px 16px 16px' }}>
        {keys.map((k: string, idx: number) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: idx !== keys.length - 1 ? '1px dashed #f1f5f6' : 'none' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>{k}</span>
            <span style={{ color: k.includes('مبلغ') || k.includes('مدفوع') || k.includes('مطلوب') || k.includes('متبقي') ? '#059669' : (k.includes('حالة') ? '#2563eb' : '#334155'), fontWeight: 'bold', background: k.includes('مبلغ') || k.includes('مدفوع') || k.includes('مطلوب') ? '#f0fdf4' : 'transparent', padding: '2px 6px', borderRadius: '4px' }}>
              {k.includes('مبلغ') || k.includes('مدفوع') || k.includes('مطلوب') || k.includes('متبقي') ? `${Number(item[k] || 0).toLocaleString('ar-EG')} ج` : item[k] ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ title, value, color, icon }: any) {
  return (
    <div style={{ flex: '1 1 120px', background: 'white', padding: '12px', borderRadius: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', textAlign: 'center', borderLeft: `4px solid ${color}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
      <div style={{ fontSize: '20px' }}>{icon}</div>
      <div style={{ color: '#475569', fontWeight: '600', fontSize: '11px' }}>{title}</div>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: color }}>{value.toLocaleString('ar-EG')} ج</div>
    </div>
  );
}

function Tab({ title, value, active, set }: any) {
  return (
    <button onClick={() => set(value)} style={{ padding: '8px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', background: active === value ? '#0f172a' : '#ffffff', color: active === value ? 'white' : '#475569', fontWeight: 'bold', fontSize: '13px', boxShadow: active === value ? '0 4px 8px rgba(15, 23, 42, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s ease' }}>
      {title}
    </button>
  );
}