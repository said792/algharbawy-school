'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

export default function BellSettings() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // 1. جلب SchoolID عند التحميل
  useEffect(() => {
    const id = localStorage.getItem('schoolId');
    setSchoolId(id);
  }, []);

  // 2. دالة رفع الصوت
  const handleUpload = async (periodId: number, file: File) => {
    if (!schoolId) return alert('يرجى تسجيل الدخول أولاً');

    const formData = new FormData();
    formData.append('sound', file);
    formData.append('schoolId', String(schoolId));
    formData.append('periodId', String(periodId));

    try {
      const res = await fetch(`${API_URL}/api/bell/manage`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        alert('تم الحفظ بنجاح');
        fetchSounds();
      } else {
        alert('فشل الحفظ');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال');
    }
  };

  // 3. دالة حذف الصوت
  const handleRemoveSound = async (periodId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الصوت؟')) return;

    try {
      const res = await fetch(`${API_URL}/api/bell/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: schoolId,
          periodId: periodId,
          operation: 3 // حذف
        })
      });
      const result = await res.json();

      if (result.success) {
        alert('تم الحذف');
        fetchSounds();
      } else {
        alert('فشل الحذف');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ');
    }
  };

  // 4. دالة جلب البيانات
  const fetchSounds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/bell/sounds?schoolId=${schoolId}`);
      const data = await res.json();

      if (data.success) {
        setPeriods(data.data);
      }
    } catch (err) {
      console.error(err);
      alert('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) fetchSounds();
  }, [schoolId]);

  // --- الأنماط (Styles) ---
  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
  };

  const tdStyle: React.CSSProperties = {
    padding: 16,
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'center'
  };

  const thStyle: React.CSSProperties = {
    padding: 16,
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'center',
    background: '#f8fafc'
  };

  const btnStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  };

  const uploadBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#e0f2fe',
    color: '#0369a1'
  };

  const removeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#fef2f2',
    color: '#dc2626'
  };

  const playBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#dcfce7',
    color: '#15803d'
  };

  return (
    <div style={{ padding: '20px', direction: 'rtl' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ color: 'white', margin: 0 }}>إعدادات الأجراس</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            تحديد أصوات مخصصة لكل حصة
          </p>
        </div>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>الحصة</th>
                <th style={thStyle}>الوقت</th>
                <th style={thStyle}>الصوت</th>
                <th style={thStyle}>أدوات</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.PeriodID}>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{p.PeriodName}</td>
                  <td style={tdStyle}>
                    {p.StartTime?.substring(0,5)} - {p.EndTime?.substring(0,5)}
                  </td>
                  <td style={tdStyle}>
                    {p.SoundURL ? (
                      <span style={{ color: 'green', fontWeight: 'bold', fontSize: '12px', padding: '4px 8px', background: '#dcfce7', borderRadius: '4px' }}>✅ صوت مخصص</span>
                    ) : (
                      <span style={{ color: 'gray', fontSize: '12px' }}>الجرس الافتراضي</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      
                      {/* زر التجربة */}
                      {p.SoundURL && (
                        <button 
                          style={playBtnStyle}
                          onClick={() => new Audio(`${API_URL}${p.SoundURL}`).play()}
                          title="تجربة الصوت"
                        >
                          🔊
                        </button>
                      )}

                      {/* زر الرفع */}
                      <label style={uploadBtnStyle}>
                        {p.SoundURL ? 'تغيير' : 'إضافة'}
                        <input 
                          type="file" 
                          accept="audio/*"
                          style={{ display: 'none' }} 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const op = p.SoundURL ? 2 : 1; // 2 تعديل، 1 إضافة
                              handleUpload(p.PeriodID, e.target.files[0]);
                            }
                          }}
                        />
                      </label>

                      {/* زر الحذف */}
                      {p.SoundURL && (
                        <button 
                          style={removeBtnStyle}
                          onClick={() => handleRemoveSound(p.PeriodID)}
                          title="حذف الصوت المخصص"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}