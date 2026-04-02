'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === واجهات البيانات ===
interface AbsenceSummary {
  نوع: string;
  العدد: number;
  تفاصيل: AbsenceDetail[];
}

interface AbsenceDetail {
  مسلسل: number;
  التاريخ: string;
  الحالة: string;
}

interface StudentAbsenceProfile {
  الطالب: string;
  الصف: string;
  absenceTypes: AbsenceSummary[];
}

// === 1. مكون المحتوى ===
function AbsenceDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams();

  const externalSchoolId = searchParams.get('schoolId');
  const externalSchoolName = searchParams.get('schoolName');
  const targetSchoolId = externalSchoolId || user?.schoolId;
  const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة الحالية';

  const urlTab = searchParams.get('tab');
  const initialTab = urlTab ? parseInt(urlTab) : 1;

  const [students, setStudents] = useState<StudentAbsenceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ التعديل الهام: متغير للتأكد من تحميل الصفحة (Mounted)
  const [mounted, setMounted] = useState(false);
  
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  const formatNumber = useCallback((num: number) => new Intl.NumberFormat('ar-EG').format(num || 0), []);

  // === 1. التأكد من تحميل الصفحة (لمنع مشكلة الهيدريشن) ===
  useEffect(() => {
    setMounted(true);
  }, []);

  // === 2. التحقق من تسجيل الدخول (بعد التأكد من التحميل) ===
  useEffect(() => {
    // نفحص تسجيل الدخول فقط بعد أن نتأكد أن المتصفح والـ Store جاهزين
    if (mounted && (!user || !work)) {
      window.location.href = '/login'; 
    }
  }, [mounted, user, work]);

  // === 3. جلب البيانات ===
  useEffect(() => {
    // لا تجلب البيانات إلا إذا تم التحميل والتحقق من الـ IDs
    if (!mounted || !targetSchoolId || !work?.yearId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${work.yearId}&inpout=40`);
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          const grouped: { [key: string]: StudentAbsenceProfile } = {};
          data.data.forEach((item: any) => {
            const stuKey = item['اسم الطالب'];
            const type = item['نوع الغياب'] || 'غير محدد';

            if (!grouped[stuKey]) grouped[stuKey] = { الطالب: stuKey, الصف: item['الصف'] || '—', absenceTypes: [] };

            let typeObj = grouped[stuKey].absenceTypes.find(t => t.نوع === type);
            if (!typeObj) {
              typeObj = { نوع: type, العدد: 0, تفاصيل: [] };
              grouped[stuKey].absenceTypes.push(typeObj);
            }

            typeObj.العدد++;
            typeObj.تفاصيل.push({
              مسلسل: item['الرقم'],
              التاريخ: item['تاريخ الغياب'] ? new Date(item['تاريخ الغياب']).toLocaleDateString('ar-EG') : '',
              الحالة: item['الحالة'],
            });
          });

          setStudents(Object.values(grouped));
        } else setStudents([]);
      } catch (err) {
        console.error(err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetSchoolId, work, mounted]); // تمت إضافة mounted هنا أيضاً

  const getTotalAbsence = (profile: StudentAbsenceProfile) => profile.absenceTypes.reduce((acc, t) => acc + t.العدد, 0);

  const getFilteredStudents = useMemo(() => {
    if (activeTab === 1) return students;

    let keyword = '';
    if (activeTab === 2) keyword = 'بدون عذر';
    else if (activeTab === 3) keyword = 'بعذر';
    else if (activeTab === 4) keyword = 'تأخير';

    return students
      .map(s => ({ ...s, absenceTypes: s.absenceTypes.filter(t => t.نوع.includes(keyword)) }))
      .filter(s => s.absenceTypes.length > 0);
  }, [students, activeTab]);

  const tabs = [
    { id: 1, label: '📊 الكل' },
    { id: 2, label: '❌ بدون عذر' },
    { id: 3, label: '✅ بعذر' },
    { id: 4, label: '⏰ التأخير' },
  ];

  // ✅ منع العرض أثناء التحميل الأولي
  if (!mounted) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحميل النظام...</div>;
  }

  // التحقق النهائي (في حال تم تجاوز الـ mounted ولكن المستخدم غير موجود فعلاً)
  if (!user || !work) {
     return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحويلك لصفحة الدخول...</div>;
  }

  return (
    <div style={{ padding: 30, direction: 'rtl', background: '#f1f5f9', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #dc2626, #f97316)', color: 'white', padding: 40, borderRadius: 20, marginBottom: 30, textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>📉 لوحة متابعة الغياب</h1>
        <p style={{ margin: '5px 0 0' }}>{displaySchoolName} - رصد حالات الغياب للطلاب</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setExpanded(null); }}
            style={{
              padding: '12px 25px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 16,
              background: activeTab === tab.id ? '#dc2626' : 'white',
              color: activeTab === tab.id ? 'white' : '#475569',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 2px 5px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 18 }}>جاري تحميل البيانات...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {getFilteredStudents.map((stu, idx) => {
            const totalDays = getTotalAbsence(stu);

            return (
              <div key={idx} style={{
                background: 'white',
                borderRadius: 15,
                overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                border: activeTab === 1 ? '1px solid #e2e8f0' : `2px solid ${activeTab === 2 ? '#ef4444' : activeTab === 3 ? '#10b981' : '#f59e0b'}`
              }}>
                <div style={{
                  background: activeTab === 1 ? '#b91c1c' : (activeTab === 2 ? '#ef4444' : activeTab === 3 ? '#059669' : '#d97706'),
                  color: 'white',
                  padding: 15,
                  textAlign: 'center',
                }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{stu.الطالب}</h3>
                  <small style={{ opacity: 0.9 }}>{stu.الصف}</small>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 20,
                  padding: 15,
                  background: activeTab === 1 ? '#fef2f2' : (activeTab === 2 ? '#fef2f2' : activeTab === 3 ? '#ecfdf5' : '#fffbeb'),
                  fontWeight: 'bold',
                  color: activeTab === 1 ? '#991b1b' : (activeTab === 2 ? '#991b1b' : activeTab === 3 ? '#065f46' : '#92400e'),
                }}>
                  <span>إجمالي الأيام: {formatNumber(totalDays)}</span>
                </div>

                <div style={{ padding: 15 }}>
                  {stu.absenceTypes.map(type => (
                    <div key={type.نوع} style={{ marginBottom: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          color: type.نوع.includes('بدون') ? '#dc2626' : (type.نوع.includes('تأخير') ? '#d97706' : '#059669'),
                          fontWeight: 'bold',
                          fontSize: 15
                        }}>{type.نوع}</span>
                        <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 6, fontSize: 13 }}>{formatNumber(type.العدد)} يوم</span>
                      </div>

                      <button onClick={() =>
                        setExpanded(expanded === `${stu.الطالب}-${type.نوع}` ? null : `${stu.الطالب}-${type.نوع}`)
                      } style={{ fontSize: 12, color: '#6b7280', marginTop: 8, cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>
                        {expanded === `${stu.الطالب}-${type.نوع}` ? 'إخفاء التواريخ ▲' : 'عرض التواريخ ▼'}
                      </button>

                      {expanded === `${stu.الطالب}-${type.نوع}` && (
                        <ul style={{ margin: '10px 0 0', paddingRight: 20, fontSize: 13, color: '#4b5563', listStyleType: 'disc' }}>
                          {type.تفاصيل.map(d => <li key={d.مسلسل} style={{ marginBottom: 4 }}>{d.التاريخ}</li>)}
                        </ul>
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

export default function AbsenceDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <AbsenceDashboardContent />
    </Suspense>
  );
}