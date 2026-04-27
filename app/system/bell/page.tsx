'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';
import { useAuthStore } from '@/store/authStore'; 

export default function BellSettings() {
  const user = useAuthStore((state) => state.user);
  const schoolId = user?.schoolId;

  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. دالة جلب الحصص (محسنة لمنع الخطأ)
  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData/78`);
      
      // التحقق أن الرد نجح قبل تحليله
      if (!res.ok) {
        console.error("Failed to fetch periods:", res.status);
        return;
      }

      const data = await res.json();

      if (data.data && Array.isArray(data.data)) {
        const mappedData = data.data.map((item: any) => ({
          PeriodID: item["الرقم"],
          PeriodName: item["الحصة"],
          StartTime: item["بداية الحصة"],
          EndTime: item["نهاية الحصة"],
          SoundURL: null
        }));
        setPeriods(mappedData);
      }
    } catch (err) {
      console.error("خطأ في جلب الحصص:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. دالة جلب الأصوات (المكان الأكثر احتمالاً للخطأ)
  const fetchBellSettings = async (id: number | undefined) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/bell/sounds?schoolId=${id}`);

      // ✅ التحقق: إذا لم يكن الرد نجاحاً (200)، نوقف ونطبع الخطأ
      if (!res.ok) {
        console.warn(`فشل جلب الأصوات - كود الخطأ: ${res.status}`);
        // لا نستمر في تحليل JSON إذا كان الكود ليس 200
        return; 
      }

      // محاولة تحليل الـ JSON، وإذا فشل (لأن السيرفر رجع HTML) سيتم التقاطه في الـ catch
      const bellData = await res.json();

      if (bellData.success && bellData.data) {
        setPeriods((prevPeriods) =>
          prevPeriods.map((p) => {
            const soundInfo = bellData.data.find((b: any) => b.PeriodID === p.PeriodID);
            return {
              ...p,
              SoundURL: soundInfo ? soundInfo.SoundURL : null
            };
          })
        );
      }
    } catch (e) {
      console.warn("فشل جلب الأصوات (ربما الـ API غير موجود):", e);
      // ✅ إضافي: قراءة الرد كنص لطباعته في الـ Console إذا كان HTML
      // (هذا يساعدك في معرفة هل هو 404 أم 500)
      // fetch(`${API_URL}/api/bell/sounds?schoolId=${id}`).then(r => r.text()).then(text => console.log("Server Response:", text));
    }
  };

  // 3. عند تحميل الصفحة
  useEffect(() => {
    fetchPeriods();
    if (schoolId) {
      fetchBellSettings(schoolId);
    }
  }, [schoolId]);

  // 4. دالة رفع الصوت
  const handleUpload = async (periodId: number, file: File) => {
    if (!schoolId) {
      alert('يرجى تسجيل الدخول واختيار المدرسة أولاً');
      return;
    }

    const formData = new FormData();
    formData.append('sound', file);
    formData.append('schoolId', String(schoolId));
    formData.append('periodId', String(periodId));

    try {
      const res = await fetch(`${API_URL}/api/bell/manage`, {
        method: 'POST',
        body: formData
      });
      
      // التحقق هنا أيضاً
      if (!res.ok) {
        alert('فشل الاتصال بالسيرفر: ' + res.status);
        return;
      }

      const result = await res.json();
      
      if (result.success) {
        alert('تم الحفظ بنجاح');
        fetchBellSettings(schoolId);
      } else {
        alert('فشل الرفع: ' + (result.message || 'حدث خطأ'));
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الاتصال');
    }
  };

  // Styles
  const tdStyle = "py-3 text-center border-b border-gray-700";
  const deleteBtn = "px-3 py-2 rounded-lg border border-transparent hover:bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer";
  const uploadBtn = "px-3 py-2 rounded-lg border border-transparent bg-orange-500 hover:bg-orange-600 text-white cursor-pointer";

  const formatTime = (t: string) => t?.substring(0, 5);

  return (
    <div className="p-10 flex flex-col items-center bg-gray-50 min-h-screen">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-800">إعدادات الأجراس</h1>
            <p className="text-gray-500">
              {loading ? 'جاري تحميل البيانات...' : `إدارة أصوات الحصص - ${user?.schoolName || 'المدرسة'}`}
            </p>
          </div>
          {schoolId && (
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition shadow"
              onClick={() => {
                alert('جاري التحميل من الـ API الصوت المخصص...');
              }}
            >
              🔊 جرب الآن
            </button>
          )}
        </div>

        {!schoolId && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded" role="alert">
            <p className="font-bold">تنبيه</p>
            <p>يرجى تسجيل الدخول واختيار مدرسة لتتمكن من رفع الأصوات.</p>
          </div>
        )}

        <div className="w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {loading ? (
            <div className="text-center py-20 text-gray-500">جاري التحميل...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="py-3 text-right font-bold text-gray-700 px-4">الحصة</th>
                  <th className="py-3 text-right font-bold text-gray-700 px-4">الوقت</th>
                  <th className="py-3 text-right font-bold text-gray-700 px-4">الحالة</th>
                  <th className="py-3 text-center font-bold text-gray-700 px-4">أدوات</th>
                </tr>
              </thead>
              <tbody>
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      لا توجد بيانات
                    </td>
                  </tr>
                ) : (
                  periods.map((p) => (
                    <tr key={p.PeriodID} className="hover:bg-gray-50 transition">
                      <td className={tdStyle}>{p.PeriodName}</td>
                      <td className={tdStyle}>
                        <span className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-600">
                          {formatTime(p.StartTime)} - {formatTime(p.EndTime)}
                        </span>
                      </td>
                      <td className={tdStyle}>
                        {p.SoundURL ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ صوت مخصص
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            الافتراضي
                          </span>
                        )}
                      </td>
                      <td className={tdStyle}>
                        <div className="flex gap-2 justify-center items-center">
                          
                          {p.SoundURL && (
                            <button 
                              onClick={() => new Audio(`${API_URL}${p.SoundURL}`).play().catch(e => console.log(e))}
                              className="text-blue-500 hover:text-blue-700 p-2"
                              title="تجربة الصوت"
                            >
                              🔊
                            </button>
                          )}

                          <label className={uploadBtn}>
                            {p.SoundURL ? 'تغيير' : 'إضافة'}
                            <input 
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleUpload(p.PeriodID, e.target.files[0]);
                                }
                              }}
                            />
                          </label>

                          {p.SoundURL && (
                             <button
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف هذا الصوت؟')) {
                                    const formData = new FormData();
                                    formData.append('schoolId', String(schoolId));
                                    formData.append('periodId', String(p.PeriodID));
                                    formData.append('operation', '3');
                                    
                                    fetch(`${API_URL}/api/bell/manage`, {
                                      method: 'POST',
                                      body: formData
                                    })
                                    .then((r: any) => r.json())
                                    .then((res: any) => {
                                        if (res.success) fetchBellSettings(schoolId!); 
                                        else alert('فشل الحذف'); 
                                      });
                                  }
                                }}
                                className={deleteBtn}
                                title="حذف الصوت"
                             >
                               🗑️
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}