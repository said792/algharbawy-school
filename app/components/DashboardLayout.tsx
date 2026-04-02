'use client';

import { useAuthStore } from '@/store/authStore';
import Sidebar from './Sidebar';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  // أضفنا updateUser لتحديث الاسم بعد جلبه
  const { isLoggedIn, user, work, setWorkData, updateUser } = useAuthStore();
  
  const [isMounted, setIsMounted] = useState(false);

  // دوال مساعدة لاستخراج البيانات
  const getId = (item: any) => item['الرقم'] ?? Object.values(item).find(v => typeof v === 'number');
  const getName = (item: any) => item['العام الدراسي'] ?? item['المرحلة'] ?? Object.values(item).find(v => typeof v === 'string');

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isLoggedIn) router.push('/login');
  }, [isMounted, isLoggedIn, router]);

  // ✅✅✅ منطق جديد: جلب اسم المستخدم (personName) باستخدام personId
   // ✅✅✅ منطق جلب اسم المستخدم (PersonName) مصحح
  useEffect(() => {
    const fetchPersonName = async () => {
      // لا تفعل شيئاً إذا لم يكن هناك مستخدم أو إذا الاسم موجود بالفعل
      if (!isLoggedIn || !user?.userId || user?.personName) return;

      try {
        // استدعاء الـ API
        const res = await fetch(`${API_URL}/api/getData1/57?id=${user.userId}`);
        
        if (res.ok) {
          const response = await res.json();
          
          // 1. الوصول للبيانات (غالباً تكون داخل response.data)
          let dataObj = response.data || response;

          // 2. إذا كانت البيانات مصفوفة (وهذا هو الغالب)، نأخذ العنصر الأول
          if (Array.isArray(dataObj)) {
            dataObj = dataObj[0];
          }

          // 3. استخراج الاسم (SQL يعيد PersonName بحرف P كبير)
          const name = dataObj?.PersonName || dataObj?.personName || dataObj?.name;

          if (name) {
            // تحديث الـ Store
            updateUser({ personName: name });
          }
        }
      } catch (e) {
        console.error("Failed to fetch person name", e);
      }
    };

    fetchPersonName();
  }, [isLoggedIn, user?.userId, user?.personName, updateUser]);

  // منطق جلب أسماء المرحلة والعام
  useEffect(() => {
    const fetchAndFixNames = async () => {
      if (!isLoggedIn || !work?.stageId || !work?.yearId || !user?.schoolId) return;
      if (work.stageName && work.yearName) return;

      try {
        const resY = await fetch(`${API_URL}/api/getData/13`);
        const dataY = await resY.json();
        const years = dataY.data || [];
        const yearObj = years.find((y: any) => getId(y) == work.yearId);

        const resS = await fetch(`${API_URL}/api/getData1/2?id=${user.schoolId}`);
        const dataS = await resS.json();
        const stages = dataS.data || [];
        const stageObj = stages.find((s: any) => getId(s) == work.stageId);

        if (yearObj || stageObj) {
          setWorkData({
            ...work,
            yearName: getName(yearObj),
            stageName: getName(stageObj)
          });
        }
      } catch (e) {
        console.error("Failed to auto-fetch names", e);
      }
    };

    fetchAndFixNames();
  }, [isLoggedIn, work, user?.schoolId]);

  if (!isMounted || !isLoggedIn) return null;

  const showWorkData = work && work.yearId && work.stageId;

  return (
    <>
      <Sidebar />
      <main className="main-content" style={{ minHeight: '100vh', background: '#f4f6f8' }}>
        <header style={{ padding: '15px 25px', background: '#f9f9f9', borderBottom: '1px solid #e2e8f0' }}>
          <div className="page-title">
            <h2 style={{ margin: 0 }}>الغرباوى للادارة المدرسية</h2>
          </div>

          {user?.schoolName && showWorkData ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginTop: '10px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #2563eb, #1e40af)',
              color: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏫</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}><strong>{user.schoolName}</strong></div>

              <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📚</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>
                {work?.stageName || '...'}
              </div>

              <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🗓️</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>
                {work?.yearName || '...'}
              </div>
            </div>
          ) : (
            <div style={{
                marginTop: '10px',
                padding: '12px 20px',
                background: '#fff3cd',
                color: '#856404',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid #ffeeba'
            }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>يرجى اختيار <strong>المرحلة والعام الدراسي</strong> من لوحة التحكم لتفعيل البيانات.</span>
            </div>
          )}

          {/* قسم المستخدم */}
          <div className="user-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '15px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 600,
                fontSize: '16px'
              }}>
                 {/* عرض الحرف الأول من الاسم (إذا تم جلبه) أو الحرف الأول من username */}
                {user?.personName?.charAt(0) || user?.username?.charAt(0)?.toUpperCase() || 'م'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* السطر الأول: الاسم الكامل */}
                <span style={{ fontWeight: 600 }}>
                   {/* إذا الاسم موجود يظهره، وإلا ينتظر حتى يتم جلبه أو يظهر الاحتياطي */}
                  {user?.personName || user?.username || 'جاري التحميل...'}
                </span>
                
                {/* السطر الثاني: اسم الدخول */}
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {user?.username || ''}
                </span>
                
              </div>
            </div>
          </div>
        </header>

        <div className="content-area" style={{ padding: '20px' }}>
          {children}
        </div>
      </main>
    </>
  );
}