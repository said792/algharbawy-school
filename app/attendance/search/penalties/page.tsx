'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface ViolationDetail {
  المخالفة: string;
  العقوبة: string;
  التاريخ: string;
}

interface StudentViolationProfile {
  الطالب: string;
  الصف: string;
  violations: ViolationDetail[];
}

// === 1. مكون المحتوى (الداخلي) ===
function ViolationsDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams(); // <-- الاستدعاء هنا آمن الآن
  
  // قراءة البيانات من الرابط أو من المستخدم
  const externalSchoolId = searchParams.get('schoolId');
  const externalSchoolName = searchParams.get('schoolName');
  
  const targetSchoolId = externalSchoolId || user?.schoolId;
  const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة الحالية';

  const [students, setStudents] = useState<StudentViolationProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!targetSchoolId || !work?.yearId) return;
      
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${work.yearId}&inpout=6`);
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          const grouped: { [key: string]: StudentViolationProfile } = {};

          data.data.forEach((item: any) => {
            const stuKey = item['اسم الطالب'];

            if (!grouped[stuKey]) {
              grouped[stuKey] = { الطالب: stuKey, الصف: item['الصف'] || '—', violations: [] };
            }

            grouped[stuKey].violations.push({
              المخالفة: item['وصف المخالفة'],
              العقوبة: item['العقوبة'],
              التاريخ: item['تاريخ المخالفة'] ? new Date(item['تاريخ المخالفة']).toLocaleDateString('ar-EG') : ''
            });
          });

          setStudents(Object.values(grouped));
        } else {
            setStudents([]);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [targetSchoolId, work]);

  return (
    <div style={{ padding: 30, direction: 'rtl', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(to right, #7c3aed, #4f46e5)', color: 'white', padding: 40, borderRadius: 20, marginBottom: 40, textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>⚖️ لوحة متابعة العقوبات</h1>
        <p style={{ margin: '5px 0 0' }}>{displaySchoolName} - عرض المخالفات السلوكية والعقوبات</p>
      </div>

      {loading ? <div style={{textAlign:'center', padding:'20px'}}>جاري التحميل...</div> : (
        <div
          style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {students.map((stu, idx) => (
            <div key={idx} style={{ background: 'white', borderRadius: 15, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
              <div style={{ background: '#4c1d95', color: 'white', padding: 15, textAlign: 'center' }}>
                <h3 style={{ margin: 0 }}>{stu.الطالب}</h3>
                <small style={{ opacity: 0.9 }}>{stu.الصف}</small>
              </div>

              <div style={{ padding: 15 }}>
                {stu.violations.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af' }}>لا توجد عقوبات</div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {stu.violations.map((v, i) => (
                      <li key={i} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
                        <div style={{ fontWeight: 'bold', color: '#1f2937' }}>🚫 {v.المخالفة}</div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 5, display: 'flex', justifyContent: 'space-between' }}>
                          <span>العقوبة: <b>{v.العقوبة}</b></span>
                          <span>{v.التاريخ}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function ViolationsDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <ViolationsDashboardContent />
    </Suspense>
  );
}