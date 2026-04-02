'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'; // 1. إضافة Suspense
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === 1. تعريف البيانات بناءً على جدول التدريبات ===
interface TrainingRecord {
  الرقم: number;
  مسلسل: number;
  الموظف: string;
  الوظيفة: string;
  'اسم التدريب': string;
  'بداية التدريب': string;
  'نهاية التدريب': string;
  'مدة التدريب': number;
  'مكان التدريب': string;
  'اجمالى الدورات': number;
}

interface EmployeeSummary {
  name: string;
  job: string;
  total: number;
  types: Record<string, number>;
  trainings: TrainingRecord[];
}

// === 2. مكون المحتوى (الداخلي) ===
function TrainingDashboardContent() {
  const { user, work } = useAuthStore();
  
  const searchParams = useSearchParams(); // <-- آمن هنا
  
  const schoolIdFromUrl = searchParams.get('schoolId');
  const schoolNameFromUrl = searchParams.get('schoolName');

  const targetSchoolId = schoolIdFromUrl || user?.schoolId;
  const displaySchoolName = schoolNameFromUrl || user?.schoolName || 'المدرسة';

  const [cards, setCards] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const formatDateDisplay = useCallback((dateVal: string) => {
    if (!dateVal) return '-';
    try {
      return new Date(dateVal).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateVal;
    }
  }, []);

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
          trainings: []
        };
      }

      grouped[name].total++;
      const type = card['اسم التدريب']; 
      grouped[name].types[type] = (grouped[name].types[type] || 0) + 1;
      
      grouped[name].trainings.push(card);
    });

    return Object.values(grouped);
  }, [cards]);

  useEffect(() => {
    const fetchCards = async () => {
      if (!targetSchoolId || !work?.yearId) return;

      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${work.yearId}&inpout=10`
        );
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          setCards(data.data);
        } else {
          setCards([]);
        }
      } catch (err) {
        console.error('Error fetching training data:', err);
        setCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [targetSchoolId, work]);

  const gradients = [
    'linear-gradient(135deg, #10b981, #34d399)', 
    'linear-gradient(135deg, #3b82f6, #60a5fa)', 
    'linear-gradient(135deg, #8b5cf6, #a78bfa)', 
    'linear-gradient(135deg, #f59e0b, #fbbf24)', 
    'linear-gradient(135deg, #ec4899, #f472b6)', 
  ];

  const containerStyle: React.CSSProperties = {
    padding: '30px',
    maxWidth: '1500px',
    margin: '0 auto',
    direction: 'rtl',
    fontFamily: 'Tajawal, sans-serif',
    background: '#f1f5f9',
    minHeight: '100vh',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '25px',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(to right, #7c3aed, #8b5cf6)',
          color: 'white',
          padding: '40px',
          borderRadius: '20px',
          marginBottom: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,.15)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800 }}>
          🎓 لوحة متابعة التدريبات
        </h1>
        <p style={{ marginTop: 12, opacity: 0.9, fontSize: 16 }}>
          نظرة عامة على الدورات التدريبية لموظفي: {displaySchoolName}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>جاري تحميل البيانات...</div>
      ) : employeesData.length === 0 ? (
        <div
          style={{
            background: 'white',
            padding: '60px',
            textAlign: 'center',
            borderRadius: '20px',
            fontSize: 18,
            color: '#64748b',
          }}
        >
          لا يوجد بيانات تدريبات لهذا العام
        </div>
      ) : (
        <div style={gridStyle}>
          {employeesData.map((emp, idx) => {
            const mainGradient = gradients[idx % gradients.length];

            return (
              <div
                key={emp.name}
                style={{
                  background: 'white',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    background: mainGradient,
                    padding: '25px',
                    color: 'white',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
                        {emp.name}
                      </h3>
                      <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>
                        {emp.job}
                      </div>
                    </div>
                    
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.25)',
                        backdropFilter: 'blur(5px)',
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(255,255,255,0.4)'
                      }}
                    >
                      <span style={{ fontSize: '12px' }}>الدورات</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{emp.total}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#475569' }}>
                    الدورات التي حضرها:
                  </h4>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {Object.keys(emp.types).length > 0 ? (
                      Object.entries(emp.types).map(([type, count], typeIdx) => (
                        <div
                          key={type}
                          style={{
                            background: '#f1f5f9',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: `1px solid ${gradients[typeIdx % gradients.length].split(',')[1]}`
                          }}
                        >
                          <span>{type}</span>
                          <span style={{
                             background: '#334155', 
                             color: 'white', 
                             padding: '2px 8px', 
                             borderRadius: '10px', 
                             fontSize: '11px'
                          }}>
                            {count}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد دورات مسجلة</span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedEmployee(expandedEmployee === emp.name ? null : emp.name)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: expandedEmployee === emp.name ? '#f1f5f9' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      color: '#475569',
                      transition: '0.2s'
                    }}
                  >
                    {expandedEmployee === emp.name ? 'إخفاء التفاصيل ▲' : 'عرض سجل الدورات التفصيلي ▼'}
                  </button>
                </div>

                {expandedEmployee === emp.name && (
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '20px', 
                    borderTop: '1px solid #e2e8f0',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {emp.trainings.map((train, pIdx) => (
                      <div
                        key={train.الرقم}
                        style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '10px',
                          marginBottom: '10px',
                          borderRight: `4px solid ${gradients[pIdx % gradients.length].split(',')[1]}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold', color: '#7c3aed' }}>{train['اسم التدريب']}</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {train['مدة التدريب']} ساعة
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                          من: {formatDateDisplay(train['بداية التدريب'])} 
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                          إلى: {formatDateDisplay(train['نهاية التدريب'])}
                        </div>
                        <div style={{ fontSize: '13px', marginTop: '4px', color: '#64748b' }}>
                          مكان التدريب: {train['مكان التدريب']}
                        </div>
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
export default function TrainingDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <TrainingDashboardContent />
    </Suspense>
  );
}