'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface PenaltyTypeSummary {
  نوع: string;
  عدد_المرات: number;
  إجمالي_الأيام: number;
  تفاصيل: PenaltyDetail[];
}

interface PenaltyDetail {
  مسلسل: number;
  الموظف: string;
  الوظيفة: string;
  نوع_الجزاء: string;
  تاريخ_الجزاء: string;
  سبب_الجزاء: string;
  مدة_الجزاء: number;
  حالة_الجزاء: string;
}

interface EmployeeSummary {
  الموظف: string;
  الوظيفة: string;
  penaltyTypes: PenaltyTypeSummary[];
}

// === 1. مكون المحتوى (الداخلي) ===
function PenaltyDashboardContent() {
  const schoolId = useAuthStore(state => state.user?.schoolId);
  const yearId = useAuthStore(state => state.work?.yearId);
  const yearName = useAuthStore(state => state.work?.yearName);

  const searchParams = useSearchParams(); // <-- آمن هنا داخل المحتوى
  
  const schoolIdFromUrl = searchParams.get('schoolId');
  const schoolNameFromUrl = searchParams.get('schoolName');

  const targetSchoolId = schoolIdFromUrl || schoolId;
  const displaySchoolName = schoolNameFromUrl || useAuthStore(state => state.user?.schoolName) || 'المدرسة';

  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('ar-EG').format(num || 0);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!targetSchoolId || !yearId) return;

      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${yearId}&inpout=20`
        );
        const data = await res.json();

        if (data.success && data.data?.length > 0) {

          const grouped: { [key: string]: EmployeeSummary } = {};

          data.data.forEach((item: any) => {
            const empKey = item['الموظف'];
            const penaltyType = item['نوع الجزاء'];

            if (!grouped[empKey]) {
              grouped[empKey] = {
                الموظف: empKey,
                الوظيفة: item['وظيفة'] || '—',
                penaltyTypes: [],
              };
            }

            let typeObj = grouped[empKey].penaltyTypes.find(
              (t) => t.نوع === penaltyType
            );

            if (!typeObj) {
              typeObj = {
                نوع: penaltyType,
                عدد_المرات: 0,
                إجمالي_الأيام: 0,
                تفاصيل: [],
              };
              grouped[empKey].penaltyTypes.push(typeObj);
            }

            typeObj.عدد_المرات += 1;
            typeObj.إجمالي_الأيام += (Number(item['مدة الجزاء']) || 0);

            typeObj.تفاصيل.push({
              مسلسل: item['الرقم'],
              الموظف: item['الموظف'],
              الوظيفة: item['وظيفة'],
              نوع_الجزاء: penaltyType,
              تاريخ_الجزاء: item['تاريخ الجزاء']?.split('T')[0],
              سبب_الجزاء: item['سبب الجزاء'],
              مدة_الجزاء: Number(item['مدة الجزاء']) || 0,
              حالة_الجزاء: item['حالة الجزاء'],
            });
          });

          Object.values(grouped).forEach(emp => {
            emp.penaltyTypes.sort((a, b) =>
              a.نوع.localeCompare(b.نوع, 'ar')
            );
          });

          setEmployees(Object.values(grouped));
        } else {
          setEmployees([]);
        }
      } catch (err) {
        console.error(err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetSchoolId, yearId]);

  return (
    <div style={{ padding: 30, direction: 'rtl', background: '#f1f5f9', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{
        background: 'linear-gradient(to right, #ea580c, #f97316)',
        color: 'white',
        padding: 40,
        borderRadius: 20,
        marginBottom: 40,
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(234, 88, 12, 0.2)'
      }}>
        <h1 style={{ margin: 0 }}>⚖️ لوحة متابعة الجزاءات</h1>
        <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>عرض تفصيلي لإدارة: {displaySchoolName}</p>
        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>العام الدراسي: {yearName || yearId}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#ea580c', padding: '40px' }}>جاري تحميل البيانات...</div>
      ) : employees.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 50, background: 'white', borderRadius: 15 }}>لا توجد جزاءات مسجلة لهذا العام.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(400px,1fr))', gap: 25 }}>
          {employees.map((emp, index) => {
            const empSummary = emp.penaltyTypes.reduce(
              (acc, type) => {
                acc.totalCount += type.عدد_المرات;
                acc.totalDays += type.إجمالي_الأيام;
                return acc;
              },
              { totalCount: 0, totalDays: 0 }
            );

            return (
              <div key={`${emp.الموظف}-${index}`} style={{
                background: 'white',
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0,0,0,.08)',
                border: '1px solid #fdba74'
              }}>
                
                <div style={{
                  background: '#fff7ed',
                  color: '#9a3412',
                  padding: 20,
                  textAlign: 'center',
                  borderBottom: '1px solid #fed7aa'
                }}>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{emp.الموظف}</h3>
                  <small style={{ fontSize: '13px', opacity: 0.8 }}>{emp.الوظيفة}</small>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  padding: 15,
                  fontWeight: 700,
                  background: '#fff',
                  fontSize: 14,
                  color: '#475569'
                }}>
                  <span>عدد الجزاءات: {empSummary.totalCount}</span>
                  <span>إجمالي الأيام: {empSummary.totalDays}</span>
                </div>

                <div style={{ padding: 20 }}>
                  {emp.penaltyTypes.map(type => (
                    <div key={`${emp.الموظف}-${type.نوع}`} style={{
                      border: '1px solid #fdba74',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 15,
                      background: '#fff'
                    }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 8 }}>
                        <span style={{ color: '#c2410c' }}>{type.نوع}</span>
                        <span style={{ color: '#ea580c' }}>{type.عدد_المرات} مرات</span>
                      </div>

                      <div style={{
                        height: 6,
                        background: '#fed7aa',
                        borderRadius: 5,
                        marginBottom: 10
                      }}>
                        <div style={{
                          width: `${Math.min(type.عدد_المرات * 20, 100)}%`,
                          height: '100%',
                          background: '#ea580c',
                          borderRadius: 5
                        }} />
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                        fontSize: 13,
                        color: '#64748b'
                      }}>
                        <span>إجمالي الأيام: {formatNumber(type.إجمالي_الأيام)}</span>
                      </div>

                      <button
                        style={{
                          marginTop: 5,
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '12px',
                          width: '100%'
                        }}
                        onClick={() =>
                          setExpanded(
                            expanded === `${emp.الموظف}-${type.نوع}`
                              ? null
                              : `${emp.الموظف}-${type.نوع}`
                          )
                        }
                      >
                        {expanded === `${emp.الموظف}-${type.نوع}` ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                      </button>

                      {expanded === `${emp.الموظف}-${type.نوع}` && (
                        <div style={{ 
                          marginTop: 10, 
                          maxHeight: '200px', 
                          overflowY: 'auto', 
                          background: '#f8fafc', 
                          borderRadius: 8,
                          padding: 10,
                          border: '1px solid #e2e8f0'
                        }}>
                          {type.تفاصيل.map(d => (
                            <div key={d.مسلسل} style={{
                              display: 'flex',
                              flexDirection: 'column',
                              marginBottom: 10,
                              paddingBottom: 10,
                              borderBottom: '1px dashed #cbd5e1'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                                <span style={{ fontWeight: 'bold' }}>{d.تاريخ_الجزاء}</span>
                                <span style={{ color: '#ea580c' }}>{d.مدة_الجزاء} يوم</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#4b5563', whiteSpace: 'pre-wrap' }}>
                                <strong>السبب:</strong> {d.سبب_الجزاء}
                              </div>
                              <div style={{ fontSize: '11px', marginTop: 4 }}>
                                <span style={{
                                  padding: '2px 6px', borderRadius: '4px', 
                                  background: d.حالة_الجزاء === 'مؤكدة' ? '#fee2e2' : '#fef9c3',
                                  color: d.حالة_الجزاء === 'مؤكدة' ? '#991b1b' : '#854d0e'
                                }}>
                                  {d.حالة_الجزاء}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function PenaltyDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <PenaltyDashboardContent />
    </Suspense>
  );
}