'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

interface WarningRecord {
  "الرقم": number;
  "اسم الطالب": string;
  "الايميل": string;
  "تاريخ الإنذار": string;
  "اجمالى ايام الغياب": number;
  "نوع الإنذار": string;
  "تاريخ اخر انذار": string;
  "ملاحظات": string;
  StudentID: number;
}

interface StudentWarningProfile {
  الطالب: string;
  الايميل: string;
  warnings: { 
    type: string; 
    count: number; 
    dates: string[]; 
    absenceDays: number[];
    notes: string[];
  }[];
}

// === 1. مكون المحتوى (الداخلي) ===
function WarningsDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams(); // <-- آمن الآن
  
  // قراءة البيانات من الرابط
  const schoolIdFromUrl = searchParams.get('schoolId');
  const schoolNameFromUrl = searchParams.get('schoolName');

  // تحديد البيانات المستهدفة
  const targetSchoolId = schoolIdFromUrl || user?.schoolId;
  const displaySchoolName = schoolNameFromUrl || user?.schoolName || 'المدرسة الحالية';

  const [students, setStudents] = useState<StudentWarningProfile[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalWarnings: 0,
    typeBreakdown: {} as { [key: string]: number }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!targetSchoolId || !work?.yearId) return;
      
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${work.yearId}&inpout=38`);
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          const uniqueStudents = new Set(data.data.map((item: WarningRecord) => item['اسم الطالب']));
          const typeCounts: { [key: string]: number } = {};
          
          data.data.forEach((item: WarningRecord) => {
            const wType = item['نوع الإنذار'] || 'إنذار';
            typeCounts[wType] = (typeCounts[wType] || 0) + 1;
          });

          setStats({
            totalStudents: uniqueStudents.size,
            totalWarnings: data.data.length,
            typeBreakdown: typeCounts
          });

          const grouped: { [key: string]: StudentWarningProfile } = {};

          data.data.forEach((item: WarningRecord) => {
            const stuKey = item['اسم الطالب'];
            const wType = item['نوع الإنذار'] || 'إنذار';

            if (!grouped[stuKey]) {
              grouped[stuKey] = { 
                الطالب: stuKey, 
                الايميل: item['الايميل'] || '—', 
                warnings: [] 
              };
            }

            let wObj = grouped[stuKey].warnings.find(w => w.type === wType);
            if (!wObj) {
              wObj = { type: wType, count: 0, dates: [], absenceDays: [], notes: [] };
              grouped[stuKey].warnings.push(wObj);
            }

            wObj.count++;
            wObj.dates.push(
              item['تاريخ الإنذار']
                ? new Date(item['تاريخ الإنذار']).toLocaleDateString('ar-EG')
                : ''
            );
            wObj.absenceDays.push(item['اجمالى ايام الغياب'] || 0);
            if(item['ملاحظات']) wObj.notes.push(item['ملاحظات']);
          });

          setStudents(Object.values(grouped));
        } else {
            setStudents([]);
            setStats({ totalStudents: 0, totalWarnings: 0, typeBreakdown: {} });
        }
      } catch (e) { 
        console.error(e); 
      }
      finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, [targetSchoolId, work]);

  const getWarningColor = (type: string) => {
    if (type.includes('أول')) return '#f59e0b';
    if (type.includes('ثاني')) return '#f97316';
    if (type.includes('ثالث')) return '#dc2626';
    return '#6b7280';
  };

  return (
    <div style={{ padding: 30, direction: 'rtl', background: '#fffbeb', minHeight: '100vh' }}>
      
      {/* العنوان الرئيسي */}
      <div style={{ background: 'linear-gradient(to right, #f59e0b, #d97706)', color: 'white', padding: 40, borderRadius: 20, marginBottom: 30, textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>⚠️ لوحة متابعة الإنذارات</h1>
        <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>{displaySchoolName} - رصد إنذارات الطلاب السلوكية والغياب</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: 15 }}>جاري التحميل...</div>
      ) : (
        <>
          {/* قسم الملخص الإحصائي */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
            
            <div style={{ background: 'white', padding: 20, borderRadius: 15, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderRight: '5px solid #f59e0b' }}>
              <h3 style={{ margin: 0, color: '#78350f' }}>{stats.totalStudents}</h3>
              <small style={{ color: '#64748b' }}>عدد الطلاب المنذرين</small>
            </div>

            <div style={{ background: 'white', padding: 20, borderRadius: 15, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderRight: '5px solid #dc2626' }}>
              <h3 style={{ margin: 0, color: '#991b1b' }}>{stats.totalWarnings}</h3>
              <small style={{ color: '#64748b' }}>إجمالي الإنذارات</small>
            </div>

            {Object.entries(stats.typeBreakdown).map(([type, count]) => (
              <div key={type} style={{ background: 'white', padding: 20, borderRadius: 15, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderRight: `5px solid ${getWarningColor(type)}` }}>
                <h3 style={{ margin: 0, color: getWarningColor(type) }}>{count}</h3>
                <small style={{ color: '#64748b' }}>{type}</small>
              </div>
            ))}
          </div>

          {/* عرض بطاقات الطلاب */}
          <div style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
          }}>
            {students.map((stu, idx) => (
              <div key={idx} style={{ background: 'white', borderRadius: 15, overflow: 'hidden', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.15)', border: '1px solid #fed7aa' }}>
                
                <div style={{ background: '#78350f', color: 'white', padding: '15px 20px' }}>
                  <h3 style={{ margin: 0 }}>{stu.الطالب}</h3>
                  <small style={{ opacity: 0.8 }}>{stu.الايميل}</small>
                </div>

                <div style={{ padding: 15 }}>
                  {stu.warnings.map((w, i) => (
                    <div key={i} style={{ marginBottom: 10, background: '#fef3c7', padding: 10, borderRadius: 8, borderRight: `4px solid ${getWarningColor(w.type)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#92400e' }}>{w.type}</span>
                        <span style={{ background: '#d97706', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>
                          {w.count}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: 12, color: '#78350f' }}>
                        {w.dates.map((date, k) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, borderBottom: '1px dashed #fde68a', paddingBottom: 2 }}>
                            <span>📅 {date}</span>
                            <span style={{ fontWeight: 'bold' }}>
                              {w.absenceDays[k] ? `${w.absenceDays[k]} يوم غياب` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {w.notes.length > 0 && (
                        <div style={{ marginTop: 5, fontSize: 11, color: '#92400e', background: '#fff7ed', padding: 5, borderRadius: 4 }}>
                          📝 {w.notes.join(' | ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function WarningsDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <WarningsDashboardContent />
    </Suspense>
  );
}