'use client';

import React, { useEffect, useState, Suspense } from 'react'; // 1. إضافة Suspense
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

interface PermissionProfile {
  الطالب: string;
  الصف: string;
  الفصل: string;
  count: number;
  records: {
    date: string;
    time: string;
    reason: string;
  }[];
}

// === 1. مكون المحتوى (الداخلي) ===
function PermissionsDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams(); // <-- آمن هنا داخل المحتوى
  
  // قراءة البيانات من الرابط
  const schoolIdFromUrl = searchParams.get('schoolId');
  const schoolNameFromUrl = searchParams.get('schoolName');
  
  // تحديد المعرف والاسم المستهدف للعرض
  const targetSchoolId = schoolIdFromUrl || user?.schoolId;
  const displaySchoolName = schoolNameFromUrl || user?.schoolName || 'المدرسة الحالية';

  const [students, setStudents] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!targetSchoolId || !work?.yearId) return;

      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${work.yearId}&inpout=18`
        );

        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          const grouped: { [key: string]: PermissionProfile } = {};

          data.data.forEach((item: any) => {
            const key = item['الاسم بالعربى'];

            if (!grouped[key]) {
              grouped[key] = {
                الطالب: key,
                الصف: item['الصف'] || '—',
                الفصل: item['الفصل'] || '—',
                count: 0,
                records: [],
              };
            }

            grouped[key].count++;

            grouped[key].records.push({
              date: item['تاريخ الاذن'],
              time: item['وقت الخروج'],
              reason: item['سبب الاذن'],
            });
          });

          setStudents(Object.values(grouped));
        } else {
            setStudents([]);
        }
      } catch (err) {
        console.error(err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetSchoolId, work]);

  return (
    <div style={{ padding: 30, direction: 'rtl', background: '#f0f9ff', minHeight: '100vh' }}>
      <div
        style={{
          background: 'linear-gradient(to right, #0ea5e9, #0369a1)',
          color: 'white',
          padding: 40,
          borderRadius: 20,
          marginBottom: 40,
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0 }}>📋 لوحة متابعة الأذونات</h1>
        <p style={{ margin: '5px 0 0' }}>{displaySchoolName} - عرض وتحليل أذونات الطلاب</p>
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'20px'}}>جاري التحميل...</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          }}
        >
          {students.map((stu: PermissionProfile, idx: number) => (
            <div
              key={idx}
              style={{
                background: 'white',
                borderRadius: 15,
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.2)',
              }}
            >
              <div
                style={{
                  background: '#0369a1',
                  color: 'white',
                  padding: 15,
                  textAlign: 'center',
                }}
              >
                <h3 style={{ margin: 0 }}>{stu.الطالب}</h3>
                <small style={{ opacity: 0.9 }}>
                  {stu.الصف} - {stu.الفصل}
                </small>
              </div>

              <div style={{ padding: 15 }}>
                <div
                  style={{
                    background: '#e0f2fe',
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 15,
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  إجمالي الأذونات: {stu.count}
                </div>

                {stu.records.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#f0f9ff',
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 8,
                      fontSize: 14,
                    }}
                  >
                    📅 {r.date}  
                    <br />
                    ⏰ {r.time}  
                    <br />
                    📝 {r.reason}
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
export default function PermissionsDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <PermissionsDashboardContent />
    </Suspense>
  );
}