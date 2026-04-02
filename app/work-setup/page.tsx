'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, WorkData } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function WorkSetupPage() {
  const router = useRouter();
  const { user, setWorkData, work } = useAuthStore();

  const [years, setYears] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const schoolId = user?.schoolId;

  const getId = (item: any) => {
    if (!item) return 0;
    if (item['الرقم']) return item['الرقم'];
    if (item['الرقم ']) return item['الرقم '];
    const values = Object.values(item);
    const numVal = values.find(v => typeof v === 'number');
    return numVal || 0;
  };

  const getName = (item: any) => {
    if (!item) return '';
    if (item['العام الدراسي']) return item['العام الدراسي'];
    if (item['العام الدراسى']) return item['العام الدراسى'];
    if (item['المرحلة']) return item['المرحلة'];
    if (item['اسم المرحلة']) return item['اسم المرحلة'];
    const values = Object.values(item);
    const nameVal = values.find(v => typeof v === 'string' && v.length > 1);
    return nameVal || 'غير معروف';
  };

  // نقرأ الاختيارات من الاستور ونحدد إذا نروح مباشرة
  useEffect(() => {
    if (!user) return;

    // استثناء مسئول النظام
    if (user.role === 'مسئول النظام' || user.role === 'مسؤول النظام') {
      router.push('/');
      return;
    }

    // لو عندنا بيانات محفوظة بالفعل
    if (work && work.stageId && work.yearId) {
      router.push('/'); // يروح للصفحة الرئيسية مباشرة
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);

        // جلب السنين
        const resYears = await fetch(`${API_URL}/api/getData/13`);
        const dataYears = await resYears.json();
        if (dataYears.success) setYears(dataYears.data || []);

        // جلب المراحل
        const resStages = await fetch(`${API_URL}/api/getData1/2?id=${schoolId}`);
        const dataStages = await resStages.json();
        if (dataStages.success) setStages(dataStages.data || []);
      } catch (err) {
        console.error("خطأ في جلب البيانات", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, work, schoolId, router]);

  // تحديث القيم الافتراضية من الاستور
  useEffect(() => {
    if (work?.yearId) setSelectedYear(work.yearId.toString());
    if (work?.stageId) setSelectedStage(work.stageId.toString());
  }, [work]);

  // =======================================
  // حفظ المرحلة والعام في السيرفر و store
  // =======================================
  const handleSave = async () => {
    if (!selectedYear || !selectedStage) {
      alert('من فضلك اختر العام والمرحلة');
      return;
    }

    if (!user?.userId) {
      alert('حدث خطأ: UserId غير موجود');
      return;
    }

    setSaving(true);

    try {
      const year = years.find(y => getId(y).toString() === selectedYear);
      const stage = stages.find(s => getId(s).toString() === selectedStage);

      const data: WorkData = {
        yearId: parseInt(selectedYear),
        yearName: getName(year),
        stageId: parseInt(selectedStage),
        stageName: getName(stage)
      };

      // ================================
      // 1️⃣ حفظ البيانات في قاعدة البيانات
      // ================================
    const payload = {
  userId: user.userId || user.personId, // رقم المستخدم
  schoolId: user.schoolId || null,     // رقم المدرسة
  mrahelId: data.stageId,              // المرحلة
  yerId: data.yearId                    // العام
};

      const res = await fetch(`${API_URL}/api/save-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!result.success) {
        alert(result.message || 'حدث خطأ أثناء حفظ البيانات');
        setSaving(false);
        return;
      }

      // ================================
      // 2️⃣ تحديث الـ store
      // ================================
      setWorkData(data);

      // ================================
      // 3️⃣ التحويل للصفحة الرئيسية
      // ================================
      router.push('/');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالسيرفر');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div style={styles.loading}>
        <i className="fa-solid fa-spinner fa-spin"></i>
        <span style={{ marginRight: '10px' }}>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <i className="fa-solid fa-sliders" style={{ fontSize: '30px', color: 'white' }}></i>
        </div>
        <h1 style={styles.title}>اختيار المرحلة والعام</h1>
        <p style={styles.subtitle}>يرجى تحديد العام الدراسي والمرحلة للبدء في العمل</p>

        <div style={styles.formGroup}>
          <label style={styles.label}>العام الدراسي</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={styles.select}
          >
            <option value="">-- اختر العام --</option>
            {years.map((y, i) => (
              <option key={getId(y) || `year-${i}`} value={getId(y)}>
                {getName(y)}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>المرحلة الدراسية</label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            style={styles.select}
          >
            <option value="">-- اختر المرحلة --</option>
            {stages.map((s, i) => (
              <option key={getId(s) || `stage-${i}`} value={getId(s)}>
                {getName(s)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.button,
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? (
            <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
          ) : (
            <><i className="fa-solid fa-check-circle" style={{ marginLeft: '8px' }}></i> حفظ ومتابعة</>
          )}
        </button>
      </div>
    </div>
  );
}

// =======================================
// styles
// =======================================
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f2744 0%, #1e40af 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    textAlign: 'center'
  },
  iconCircle: {
    width: '70px',
    height: '70px',
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 5px'
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '30px'
  },
  formGroup: {
    marginBottom: '20px',
    textAlign: 'right'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    cursor: 'pointer',
    background: 'white'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'opacity 0.2s',
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loading: {
    color: 'white',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  }
};