'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { useAuthStore, WorkData } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useRouter } from 'next/navigation';

// =======================
// Dashboard Component
// =======================
export default function StudentAffairsDashboard() {
  const { user, work, setWorkData } = useAuthStore();
  const router = useRouter();

  const schoolId = user?.schoolId;

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // === للـ مودال تغيير السنة والمرحلة ===
  const [modalOpen, setModalOpen] = useState(false);
  const [years, setYears] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(work?.yearId?.toString() ?? '');
  const [selectedStage, setSelectedStage] = useState<string>(work?.stageId?.toString() ?? '');
  const [saving, setSaving] = useState(false);

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

  // === جلب إحصائيات المدرسة ===
  useEffect(() => {
    const fetchStats = async () => {
      if (!schoolId) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/GETTKARERALLSCHOOL/2?id=${schoolId}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) setStats(data.data[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [schoolId]);

  // === جلب سنوات ومراحل ===
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        const resYears = await fetch(`${API_URL}/api/getData/13`);
        const dataYears = await resYears.json();
        if (dataYears.success) setYears(dataYears.data || []);

        const resStages = await fetch(`${API_URL}/api/getData1/2?id=${schoolId}`);
        const dataStages = await resStages.json();
        if (dataStages.success) setStages(dataStages.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [schoolId]);

  const handleSaveWorkData = async () => {
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
      const yearObj = years.find(y => getId(y).toString() === selectedYear);
      const stageObj = stages.find(s => getId(s).toString() === selectedStage);

      const newWork: WorkData = {
        yearId: parseInt(selectedYear),
        yearName: getName(yearObj),
        stageId: parseInt(selectedStage),
        stageName: getName(stageObj)
      };

      // حفظ على السيرفر
      const payload = {
        userId: user.userId || user.personId,
        schoolId: schoolId || null,
        mrahelId: newWork.stageId,
        yerId: newWork.yearId
      };
      const res = await fetch(`${API_URL}/api/save-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!result.success) {
        alert(result.message || 'حدث خطأ أثناء حفظ البيانات');
        return;
      }

      // تحديث الـ store مباشرة
      setWorkData(newWork);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالسيرفر');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>جاري التحميل...</div>;
  if (!stats) return <div style={styles.loading}>لا توجد بيانات</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>🎓 لوحة تحكم شئون الطلاب</h1>
      <div style={styles.grid}>
        <Card title="إجمالي الطلاب" value={stats.TotalStudents} icon="fa-user-graduate" color="#3b82f6" />
        <Card title="حضور اليوم" value={stats.PresentStudents} icon="fa-check-circle" color="#10b981" />
        <Card title="الغياب اليوم" value={stats.AbsentStudents} icon="fa-user-xmark" color="#ef4444" />
        <Card title="التأخير اليوم" value={stats.LateStudents} icon="fa-clock" color="#f59e0b" />
        <Card title="مخالفات" value={stats.ViolationsCount} icon="fa-triangle-exclamation" color="#8b5cf6" />
      </div>

      <div style={styles.actionsBox}>
        <h3>🚀 إجراءات سريعة</h3>
        <div style={styles.actionsGrid}>
          <button
            onClick={() => setModalOpen(true)}
            style={{ ...styles.actionBtn, background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', cursor: 'pointer' }}
          >
            اختر المرحلة و العام
          </button>

          <a href="/students/registration/add" style={styles.actionBtn}>تسجيل طالب</a>
          <a href="/attendance/register/by-class" style={styles.actionBtn}>تسجيل الحضور</a>
          <a href="/students/application/new" style={styles.actionBtn}>طلبات التقديم</a>
        </div>
      </div>

      {/* مودال تغيير السنة والمرحلة */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2>تغيير المرحلة والعام الدراسي</h2>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={styles.select}>
              <option value="">-- اختر العام --</option>
              {years.map((y, i) => (
                <option key={getId(y) || `year-${i}`} value={getId(y)}>{getName(y)}</option>
              ))}
            </select>
            <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} style={styles.select}>
              <option value="">-- اختر المرحلة --</option>
              {stages.map((s, i) => (
                <option key={getId(s) || `stage-${i}`} value={getId(s)}>{getName(s)}</option>
              ))}
            </select>
            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={handleSaveWorkData} style={styles.button} disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setModalOpen(false)} style={{ ...styles.button, background: '#ef4444' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =======================
// Card Component
// =======================
function Card({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{title}</h3>
          <h2 style={{ margin: '10px 0 0', fontSize: '28px', color }}>{value || 0}</h2>
        </div>
        <div style={{ ...styles.iconCircle, background: `${color}20`, color }}>{<i className={`fa-solid ${icon}`}></i>}</div>
      </div>
    </div>
  );
}

// =======================
// Styles
// =======================
const styles: { [key: string]: CSSProperties } = {
  loading: { textAlign: 'center', padding: '50px', color: '#64748b' },
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  header: { marginBottom: '30px', color: '#1e293b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' },
  card: { background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative' },
  iconCircle: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  actionsBox: { background: 'white', padding: '20px', borderRadius: '12px' },
  actionsGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  actionBtn: {
    background: '#f1f5f9',
    padding: '10px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
    color: '#334155',
    fontWeight: '600',
    border: '1px solid #e2e8f0',
    display: 'inline-block'
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  },
  modalContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    width: '320px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    marginBottom: '15px'
  },
  button: {
    flex: 1,
    padding: '10px 15px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    margin: '0 5px'
  }
};
