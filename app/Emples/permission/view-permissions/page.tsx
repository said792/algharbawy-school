'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'; // 1. إضافة Suspense
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === 1. تعريف الواجهات (Interfaces) ===
interface PermissionRecord {
  الرقم: number;
  مسلسل: number;
  الموظف: string;
  الوظيفة: string;
  'نوع الاذن': string;
  'تاريخ الاذن': string;
  'بداية من': string;
  'الى': string;
  'مدة الاذن': string;
  'حالة الاذن': string;
  'اجمالى الاذون': number;
}

interface EmployeeSummary {
  name: string;
  job: string;
  total: number;
  types: Record<string, number>;
  permissions: PermissionRecord[];
}

// === 2. مكون المحتوى (الداخلي) ===
function PermissionDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams(); // <-- آمن هنا داخل المحتوى

  const [cards, setCards] = useState<PermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // === منطق القراءة ===
  const schoolIdFromUrl = searchParams.get('schoolId');
  const schoolNameFromUrl = searchParams.get('schoolName');
  
  const userSchoolId = user?.schoolId;
  const userSchoolName = user?.schoolName;

  const activeSchoolId = schoolIdFromUrl || userSchoolId;
  const activeSchoolName = schoolNameFromUrl || userSchoolName || 'المدرسة';

  // === دالة التنسيق ===
  const formatDisplayTime = useCallback((timeVal: string) => {
    if (!timeVal) return '';
    if (typeof timeVal === 'string' && !timeVal.includes('T')) {
      return timeVal.substring(0, 5);
    }
    try {
      const date = new Date(timeVal);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return timeVal;
    }
  }, []);

  // === تجميع البيانات ===
  const employeesData = useMemo(() => {
    const grouped: Record<string, EmployeeSummary> = {};
    cards.forEach((card) => {
      const name = card['الموظف'];
      if (!grouped[name]) {
        grouped[name] = {
          name: name,
          job: card['الوظيفة'],
          total: 0,
          types: {},
          permissions: []
        };
      }
      grouped[name].total++;
      const type = card['نوع الاذن'];
      grouped[name].types[type] = (grouped[name].types[type] || 0) + 1;
      grouped[name].permissions.push(card);
    });
    return Object.values(grouped);
  }, [cards]);

  // === جلب البيانات ===
  useEffect(() => {
    const fetchData = async () => {
      console.log("------------------------------------------------");
      console.log("🔍 DEBUG START");
      console.log("ID from URL (schoolIdFromUrl):", schoolIdFromUrl);
      console.log("ID from User Store (userSchoolId):", userSchoolId);
      console.log("Final ID to be sent (activeSchoolId):", activeSchoolId);
      console.log("------------------------------------------------");

      if (!activeSchoolId || !work?.yearId) {
        console.log("⛔ Stopped: No ID found.");
        return;
      }

      setLoading(true);
      try {
        const url = `${API_URL}/api/leaves/data?schoolId=${activeSchoolId}&yearId=${work.yearId}&inpout=35`;
        console.log("🚀 Fetching URL:", url);

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          console.log("✅ Data Received, Count:", data.data.length);
          setCards(data.data);
        } else {
          console.log("⚠️ No Data Found");
          setCards([]);
        }
      } catch (err) {
        console.error('❌ Error:', err);
        setCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeSchoolId, work?.yearId]); 

  // === الواجهة (UI) ===
  const gradients = [
    'linear-gradient(135deg, #10b981, #34d399)',
    'linear-gradient(135deg, #3b82f6, #60a5fa)',
    'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    'linear-gradient(135deg, #f59e0b, #fbbf24)',
    'linear-gradient(135deg, #ec4899, #f472b6)',
  ];

  return (
    <div style={{ padding: '30px', maxWidth: '1500px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f1f5f9', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #0f766e, #10b981)', color: 'white', padding: '40px', borderRadius: '20px', marginBottom: '40px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,.15)' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800 }}>👥 بطاقات أداء الموظفين (الإذونات)</h1>
        <p style={{ marginTop: 12, opacity: 0.9, fontSize: 16 }}>
          نظرة عامة على إذونات موظفي: {activeSchoolName}
          <span style={{fontSize: '12px', opacity: 0.7, display: 'block'}}>ID: {activeSchoolId}</span>
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>جاري تحميل البيانات...</div>
      ) : employeesData.length === 0 ? (
        <div style={{ background: 'white', padding: '60px', textAlign: 'center', borderRadius: '20px', fontSize: 18, color: '#64748b' }}>لا يوجد بيانات</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
          {employeesData.map((emp, idx) => {
            const mainGradient = gradients[idx % gradients.length];
            return (
              <div key={emp.name} style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                {/* Card Header */}
                <div style={{ background: mainGradient, padding: '25px', color: 'white', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>{emp.name}</h3>
                      <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>{emp.job}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(5px)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.4)' }}>
                      <span style={{ fontSize: '12px' }}>الإجمالي</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{emp.total}</span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#475569' }}>توزيع الإذونات حسب النوع:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {Object.keys(emp.types).length > 0 ? (
                      Object.entries(emp.types).map(([type, count]) => (
                        <div key={type} style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{type}</span>
                          <span style={{ background: '#334155', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{count}</span>
                        </div>
                      ))
                    ) : <span style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد أنواع مسجلة</span>}
                  </div>

                  <button onClick={() => setExpandedEmployee(expandedEmployee === emp.name ? null : emp.name)} style={{ width: '100%', padding: '10px', background: expandedEmployee === emp.name ? '#f1f5f9' : 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>
                    {expandedEmployee === emp.name ? 'إخفاء التفاصيل ▲' : 'عرض سجل الإذونات التفصيلي ▼'}
                  </button>
                </div>

                {/* Details Section */}
                {expandedEmployee === emp.name && (
                  <div style={{ background: '#f8fafc', padding: '20px', borderTop: '1px solid #e2e8f0', maxHeight: '300px', overflowY: 'auto' }}>
                    {emp.permissions.map((perm) => (
                      <div key={perm.الرقم} style={{ background: 'white', padding: '12px', borderRadius: '10px', marginBottom: '10px', borderRight: `4px solid #10b981`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold', color: '#0f766e' }}>{perm['نوع الاذن']}</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{perm['تاريخ الاذن'] ? perm['تاريخ الاذن'].split('T')[0] : ''}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569' }}>من: {formatDisplayTime(perm['بداية من'])} ➔ إلى: {formatDisplayTime(perm['الى'])}</div>
                        <div style={{ fontSize: '13px', marginTop: '4px', color: '#64748b' }}>المدة: {perm['مدة الاذن']} | الحالة: {perm['حالة الاذن']}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === 3. المكون الرئيسي (Wrapper) ===
export default function PermissionDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <PermissionDashboardContent />
    </Suspense>
  );
}