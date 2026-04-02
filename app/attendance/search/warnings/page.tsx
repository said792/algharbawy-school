'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

interface StudentWarningProfile {
  الطالب: string;
  الصف: string;
  warnings: { type: string; count: number; dates: string[] }[];
}

// === 1. مكون المحتوى (الداخلي) ===
function WarningsDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams(); // <-- الاستدعاء آمن هنا
  
  // قراءة البيانات من الرابط
  const schoolIdFromUrl = searchParams.get('schoolId');
  const schoolNameFromUrl = searchParams.get('schoolName');

  // تحديد البيانات المستهدفة
  const targetSchoolId = schoolIdFromUrl || user?.schoolId;
  const displaySchoolName = schoolNameFromUrl || user?.schoolName || 'المدرسة الحالية';

  const [students, setStudents] = useState<StudentWarningProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!targetSchoolId || !work?.yearId) return;
      
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${work.yearId}&inpout=38`);
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          const grouped: { [key: string]: StudentWarningProfile } = {};

          data.data.forEach((item: any) => {
            const stuKey = item['اسم الطالب'];
            const wType = item['نوع الإنذار'] || 'إنذار';

            if (!grouped[stuKey]) {
              grouped[stuKey] = { الطالب: stuKey, الصف: item['الصف'] || '—', warnings: [] };
            }

            let wObj = grouped[stuKey].warnings.find(w => w.type === wType);
            if (!wObj) {
              wObj = { type: wType, count: 0, dates: [] };
              grouped[stuKey].warnings.push(wObj);
            }

            wObj.dates.push(
              item['تاريخ الإنذار']
                ? new Date(item['تاريخ الإنذار']).toLocaleDateString('ar-EG')
                : ''
            );
          });

          setStudents(Object.values(grouped));
        } else {
            setStudents([]);
        }
      } catch (e) { 
        console.error(e); 
        setStudents([]);
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
      <div style={{ background: 'linear-gradient(to right, #f59e0b, #d97706)', color: 'white', padding: 40, borderRadius: 20, marginBottom: 40, textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>⚠️ لوحة متابعة الإنذارات</h1>
        <p style={{ margin: '5px 0 0' }}>{displaySchoolName} - رصد إنذارات الطلاب السلوكية والغياب</p>
      </div>

      {loading ? <div style={{textAlign:'center', padding:'20px'}}>جاري التحميل...</div> : (
        <div style={{
          display: 'grid',
          gap: 20,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
        }}>
          {students.map((stu: StudentWarningProfile, idx: number) => (
            <div key={idx} style={{ background: 'white', borderRadius: 15, overflow: 'hidden', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)' }}>
              <div style={{ background: '#78350f', color: 'white', padding: 15, textAlign: 'center' }}>
                <h3 style={{ margin: 0 }}>{stu.الطالب}</h3>
                <small style={{ opacity: 0.9 }}>{stu.الصف}</small>
              </div>

              <div style={{ padding: 15 }}>
                {stu.warnings.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, background: '#fef3c7', padding: 10, borderRadius: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: getWarningColor(w.type), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {w.dates.length}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{w.type}</div>
                      <small style={{ color: '#92400e' }}>تواريخ: {w.dates.join(' - ')}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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