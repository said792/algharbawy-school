'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// تعريف الأنواع بناءً على بيانات التدريبات
interface TrainingRecord {
  'الرقم': number;
  'الموظف': string;
  'اسم التدريب': string;
  'مكان التدريب': string;
  'بداية التدريب': string;
  'نهاية التدريب': string;
  'مدة التدريب': number;
}

export default function AllTrainingsPage() {
  const { user, work } = useAuthStore();

  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [filtered, setFiltered] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: "",
    trainingName: "",
    date: ""
  });

  // تحديث تعريف الأعمدة
  const [columnsConfig, setColumnsConfig] = useState([
    { key: "الموظف", label: "الموظف", visible: true },
    { key: "اسم التدريب", label: "اسم التدريب", visible: true },
    { key: "مكان التدريب", label: "المكان", visible: true },
    { key: "بداية التدريب", label: "تاريخ البداية", visible: true },
    { key: "نهاية التدريب", label: "تاريخ النهاية", visible: true },
    { key: "مدة التدريب", label: "المدة (أيام)", visible: true },
    { key: "actions", label: "إجراءات", visible: true },
  ]);

  const [showColMenu, setShowColMenu] = useState(false);

  // === دوال التنسيق ===
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      // التعامل مع صيغة ISO إذا كانت قادمة
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString.split('T')[0];
      
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  // === 1. جلب بيانات التدريبات ===
  useEffect(() => {
    const fetchTrainings = async () => {
      if (!user?.schoolId || !work?.yearId) return;

      setLoading(true);
      try {
        // استخدام inpout=10 لجلب التدريبات
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${user.schoolId}&yearId=${work.yearId}&inpout=10`
        );
        const data = await res.json();
        if (data.success) {
          setTrainings(data.data);
          setFiltered(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainings();
  }, [user, work]);

  // === 2. دالة الفلترة والبحث ===
  useEffect(() => {
    const { name, trainingName, date } = filters;
    
    const result = trainings.filter((item) => {
      const matchName = item['الموظف']?.toLowerCase().includes(name.toLowerCase());
      const matchTrainingName = item['اسم التدريب']?.toLowerCase().includes(trainingName.toLowerCase());
      
      let matchDate = true;
      if (date) {
        // البحث في تاريخ البداية
        const itemDate = new Date(item['بداية التدريب']).toDateString();
        const searchDate = new Date(date).toDateString();
        matchDate = itemDate === searchDate;
      }

      return matchName && matchTrainingName && matchDate;
    });

    setFiltered(result);
  }, [filters, trainings]);

  // === الحذف ===
  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا التدريب؟')) return;

    try {
      // استخدام رابط حفظ التدريب مع operation 3 للحذف
      const res = await fetch(`${API_URL}/api/training/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TrainingID: id,
          EmploeID: 0, 
          TrainingStartDate: '1900-01-01',
          TrainingEndDate: '1900-01-01',
          TrainingModa: 0,
          operation: 3 
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('تم الحذف بنجاح');
        // تحديث القائمة
        if (user?.schoolId && work?.yearId) {
          const refreshRes = await fetch(
            `${API_URL}/api/training/data?schoolId=${user.schoolId}&yearId=${work.yearId}&inpout=10`
          );
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            setTrainings(refreshData.data);
            setFiltered(refreshData.data);
          }
        }
      } else {
        alert('فشل الحذف: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ');
    }
  };

  const toggleColumn = (key: string) => {
    const newConfig = [...columnsConfig];
    const idx = newConfig.findIndex(c => c.key === key);
    if (idx !== -1) {
      newConfig[idx].visible = !newConfig[idx].visible;
      setColumnsConfig(newConfig);
    }
  };

  // Styles
  const containerStyle = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  // تغيير الألوان للون البنفسجي لتمييز صفحة التدريبات
  const headerStyle = { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
  const filterGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' };
  const inputStyle = { width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const };
  const thStyle = { padding: '12px 15px', textAlign: 'right' as const, fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '2px solid #6366f1', color: '#4c1d95' };
  const tdStyle = { padding: '12px 15px', color: '#334155', fontSize: '14px', borderBottom: '1px solid #f1f5f9' };
  const actionButtonStyle = { background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🎓 سجل التدريبات</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>عرض وفلترة جميع دورات الموظفين</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الدراسي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{work?.yearName}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#6366f1' }}>🔍 بحث وفلترة</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowColMenu(!showColMenu)} style={{ background: '#475569', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>⚙️ الأعمدة</button>
          </div>
        </div>
        
        {showColMenu && (
          <div style={{ position: 'absolute', zIndex: 50, background: 'white', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
            {columnsConfig.map((col) => (
              <label key={col.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumn(col.key)}
                  style={{ marginLeft: '8px', accentColor: '#6366f1' }}
                />
                {col.label}
              </label>
            ))}
          </div>
        )}

        <div style={filterGridStyle}>
          <input
            placeholder="بحث باسم الموظف..."
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            style={inputStyle}
          />
          
          <input
            placeholder="بحث باسم التدريب..."
            value={filters.trainingName}
            onChange={(e) => setFilters({ ...filters, trainingName: e.target.value })}
            style={inputStyle}
          />

          <input
            type="date"
            placeholder="بحث بتاريخ البداية..."
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50, color: '#6366f1' }}>جاري تحميل البيانات...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f5f3ff', color: '#4c1d95' }}>
                  {columnsConfig.filter(c => c.visible).map((col) => (
                    <th key={col.key} style={thStyle}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', transition: '0.2s' }}>
                    {columnsConfig.filter(c => c.visible).map((col) => {
                      const value = item[col.key as keyof TrainingRecord];
                      
                      // === منطق تنسيق القيم ===
                      let displayValue = value || "-";

                      if (col.key === 'بداية التدريب' || col.key === 'نهاية التدريب') {
                        displayValue = formatDate(value as string);
                      } else if (col.key === 'مدة التدريب') {
                        displayValue = `${value} يوم`;
                      } else if (col.key === 'actions') {
                        return (
                          <td key={col.key} style={tdStyle}>
                            <button 
                              onClick={() => handleDelete(item['الرقم'])}
                              style={actionButtonStyle}
                              title="حذف"
                            >
                              🗑️
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} style={tdStyle}>
                          {displayValue as string}
                        </td>
                      );
                    })}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columnsConfig.length} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      لا توجد بيانات تدريبات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}