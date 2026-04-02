'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function AddEmployeeTransferPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    EmploeID: 0,
    EmploeArName: '',
    MoehelID: '',
    moehel_Date: '',
    MNKWEL_MEN: '',
    SchoolID: null as number | null,
    DateEstlam: '',
    RKEM_KRAER: '',
  });

  const [qualifications, setQualifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ===============================
     ✅ تحميل رقم المدرسة بعد تحميل user
  =============================== */
  useEffect(() => {
    if (user?.schoolId) {
      setFormData(prev => ({
        ...prev,
        SchoolID: Number(user.schoolId)
      }));
    }
  }, [user]);

  /* ===============================
     ✅ جلب رقم الموظف التالي
  =============================== */
  useEffect(() => {
    const getNextEmployeeId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/37`);
        const data = await res.json();
        if (data?.data?.length > 0) {
          const row = data.data[0];
          const id = row['EmploeID'] || Object.values(row)[0];
          setFormData(prev => ({
            ...prev,
            EmploeID: Number(id) || 1
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };

    getNextEmployeeId();
  }, []);

  /* ===============================
     ✅ جلب المؤهلات
  =============================== */
  useEffect(() => {
    const fetchQualifications = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/25`);
        const data = await res.json();
        if (data.success) {
          setQualifications(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchQualifications();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'MoehelID'
        ? value === '' ? null : Number(value)
        : value
    }));
  };

  /* ===============================
     ✅ حفظ البيانات
  =============================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.SchoolID) {
      alert("رقم المدرسة غير موجود ❌");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        operation: 1
      };

      console.log("🔥 Payload Sent:", payload);

      const res = await fetch(`${API_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        alert('تم حفظ بيانات النقل بنجاح 🔥');
        router.push('/employees/view');
      } else {
        alert('حدث خطأ أثناء الحفظ');
      }

    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     🎨 الشكل الاحترافي
  =============================== */
  return (
    <div style={{
      padding: '40px',
      maxWidth: '1000px',
      margin: '0 auto',
      direction: 'rtl'
    }}>

      {/* Header Card */}
      <div style={{
        background: 'linear-gradient(135deg,#2563eb,#1e3a8a)',
        color: 'white',
        padding: '25px',
        borderRadius: '18px',
        marginBottom: '30px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ margin: 0 }}>اقرار قيام بالعمل</h2>
        <p style={{ marginTop: 10 }}>
          رقم الموظف الجديد: <strong>{formData.EmploeID}</strong>
        </p>
        <p style={{ opacity: 0.9 }}>
          منقول إلى: {user?.schoolName || '—'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#ffffff',
          padding: '35px',
          borderRadius: '18px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
        }}
      >

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
          gap: '20px'
        }}>

          <div>
            <label>الاسم بالعربي *</label>
            <input
              type="text"
              name="EmploeArName"
              value={formData.EmploeArName}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>المؤهل</label>
            <select
              name="MoehelID"
              value={formData.MoehelID ?? ''}
              onChange={handleChange}
            >
              <option value="">اختر المؤهل</option>
              {qualifications.map((q, i) => {
                const id = q['ID'] || Object.values(q)[0];
                const name = q['المؤهل'] || Object.values(q)[1];
                return (
                  <option key={i} value={id}>{name}</option>
                );
              })}
            </select>
          </div>

          <div>
            <label>تاريخ المؤهل</label>
            <input
              type="date"
              name="moehel_Date"
              value={formData.moehel_Date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>منقول من</label>
            <input
              type="text"
              name="MNKWEL_MEN"
              value={formData.MNKWEL_MEN}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>المدرسة المنقول إليها</label>
            <input
              type="text"
              value={user?.schoolName || ''}
              disabled
              style={{ background: '#e5e7eb' }}
            />
          </div>

          <div>
            <label>تاريخ استلام العمل</label>
            <input
              type="date"
              name="DateEstlam"
              value={formData.DateEstlam}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>رقم القرار</label>
            <input
              type="text"
              name="RKEM_KRAER"
              value={formData.RKEM_KRAER}
              onChange={handleChange}
            />
          </div>

        </div>

        <div style={{
          marginTop: 40,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 15
        }}>
          <button type="button" onClick={() => router.back()}>
            إلغاء
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '10px 35px',
              borderRadius: '10px'
            }}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ النقل'}
          </button>
        </div>

      </form>
    </div>
  );
}