'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, work } = useAuthStore();
  
  // متغير عشان نعرف هل لسه بنحمل البيانات ولا لأ
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // نستنى شوية عشان الـ Store يتحمل (Hydration)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 50); // 50 ملي ثانية تكفي جداً

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // لو خلصنا تحميل وهنشتغل نチェック البيانات
    if (!isLoading) {
      if (!user) {
        // لو مفيش يوزر -> لوجن
        router.push('/login');
      } else if (!work) {
        // لو فيه يوزر بس مفيش شغل -> اختيار المرحلة
        router.push('/work-setup');
      }
    }
  }, [isLoading, user, work, router]);

  // لسه بنحمل او مفيش يوزر -> نظهر لودر
  if (isLoading || !user || !work) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f9ff' }}>
        <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#2563eb' }}></i>
      </div>
    );
  }

  // لو كل حاجة تمام -> نظهر الصفحة
  return <>{children}</>;
}