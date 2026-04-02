'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// تعريف الأنواع بناءً على البيانات الفعلية القادمة
interface PermissionRecord {
  'الرقم': number;
  'الموظف': string;
  'نوع الاذن': string;
  'تاريخ الاذن': string; // تم تغيير الاسم ليتطابق مع الاستعلام
  'بداية من': string;    // حقل وقت البدء
  'الى': string;         // حقل وقت الانتهاء
  'مدة الاذن': number;
  'حالة الاذن': string;
}

export default function AllPermissionsPage() {
  const { user, work } = useAuthStore();

  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [filtered, setFiltered] = useState<PermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: "",
    type: "",
    date: ""
  });

  // تحديث تعريف الأعمدة ليتطابق مع البيانات الجديدة
  const [columnsConfig, setColumnsConfig] = useState([
    { key: "الموظف", label: "الموظف", visible: true },
    { key: "نوع الاذن", label: "نوع الإذن", visible: true },
    { key: "تاريخ الاذن", label: "التاريخ", visible: true },
    { key: 'بداية من', label: "من (وقت)", visible: true },
    { key: 'الى', label: "إلى (وقت)", visible: true },
    { key: "مدة الاذن", label: "المدة", visible: true },
    { key: "حالة الاذن", label: "الحالة", visible: true },
    { key: "actions", label: "إجراءات", visible: true },
  ]);

  const [showColMenu, setShowColMenu] = useState(false);

  // === دوال تنسيق التاريخ والوقت ===
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "-";
    try {
      // تحويل التاريخ الكامل إلى وقت فقط
      return new Date(timeString).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return timeString;
    }
  };

  // === 1. جلب بيانات الأذونات ===
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.schoolId || !work?.yearId) return;

      setLoading(true);
      try {
        // تأكد أن الرابط صحيح و inpout = 39
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${user.schoolId}&yearId=${work.yearId}&inpout=39`
        );
        const data = await res.json();
        if (data.success) {
          setPermissions(data.data);
          setFiltered(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, work]);

  // === 2. دالة الفلترة والبحث ===
  useEffect(() => {
    const { name, type, date } = filters;
    
    const result = permissions.filter((item) => {
      const matchName = item['الموظف']?.toLowerCase().includes(name.toLowerCase());
      const matchType = type ? item['نوع الاذن'] === type : true;
      
      let matchDate = true;
      if (date) {
        const itemDate = new Date(item['تاريخ الاذن']).toDateString();
        const searchDate = new Date(date).toDateString();
        matchDate = itemDate === searchDate;
      }

      return matchName && matchType && matchDate;
    });

    setFiltered(result);
  }, [filters, permissions]);

  // === التعامل مع العمليات (حذف) ===
  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإذن؟')) return;

    try {
      const reqItem = permissions.find((r) => r['الرقم'] === id);
      if (!reqItem) return;

      const res = await fetch(`${API_URL}/api/permissions/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TlabEznID: id,
          EmploeID: 0, 
          EznType: reqItem?.['نوع الاذن'] || 'انصراف مبكر',
          dtpStartDate: '1900-01-01',
          dtpEndDate: '1900-01-01',
          txtDuration: reqItem?.['مدة الاذن'] || 0,
          YerID: work?.yearId || 0,
          operation: 3 
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('تم الحذف');
        if (user?.schoolId && work?.yearId) {
          const refreshRes = await fetch(
            `${API_URL}/api/leaves/data?schoolId=${user.schoolId}&yearId=${work.yearId}&inpout=39`
          );
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            setPermissions(refreshData.data);
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

  const getStatusBadge = (status: string) => {
    let bg = '#f1f5f9', color = '#64748b';
    if (status === 'مؤكدة') { bg = '#dcfce7'; color = '#166534'; }
    else if (status === 'منتظرة') { bg = '#fef9c3'; color = '#854d0e'; }
    else if (status === 'ملغاة') { bg = '#fee2e2'; color: '#991b1b'; }
    
    return (
      <span style={{
        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
        backgroundColor: bg, color: color, whiteSpace: 'nowrap'
      }}>
        {status}
      </span>
    );
  };

  // Styles
  const containerStyle = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle = { background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(37, 99, 235, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
  const filterGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' };
  const inputStyle = { width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const };
  const thStyle = { padding: '12px 15px', textAlign: 'right' as const, fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '2px solid #2563eb' };
  const tdStyle = { padding: '12px 15px', color: '#334155', fontSize: '14px', borderBottom: '1px solid #f1f5f9' };
  const actionButtonStyle = { background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📋 سجل الأذونات</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>عرض وفلترة جميع طلبات الأذونات</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الدراسي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{work?.yearName}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#2563eb' }}>🔍 بحث وفلترة</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowColMenu(!showColMenu)} style={{ background: '#475569', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>⚙️ الأعمدة</button>
          </div>
        </div>
        
        {showColMenu && (
          <div style={{ position: 'absolute', zIndex: 50, background: 'white', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
            {columnsConfig.map((col, idx) => (
              <label key={col.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumn(col.key)}
                  style={{ marginLeft: '8px', accentColor: '#2563eb' }}
                />
                {col.label}
              </label>
            ))}
          </div>
        )}

        <div style={filterGridStyle}>
          <input
            placeholder="بحث بالاسم..."
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            style={inputStyle}
          />
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            style={inputStyle}
          >
            <option value="">كل الأنواع</option>
            <option value="تأخير">⏰ تأخير</option>
              <option value="خروج أثناء اليوم">🚪 خروج أثناء اليوم</option>
              <option value="خروج آخر اليوم">🏁 خروج آخر اليوم</option>
          </select>

          <input
            type="date"
            placeholder="بحث في تاريخ..."
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50, color: '#2563eb' }}>جاري تحميل البيانات...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#eff6ff', color: '#1e40af' }}>
                  {columnsConfig.filter(c => c.visible).map((col) => (
                    <th key={col.key} style={thStyle}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', transition: '0.2s' }}>
                    {columnsConfig.filter(c => c.visible).map((col) => {
                      const value = item[col.key as keyof PermissionRecord];
                      
                      // === منطق تنسيق القيم ===
                      let displayValue = value || "-";

                      if (col.key === 'تاريخ الاذن') {
                        displayValue = formatDate(value as string);
                      } else if (col.key === 'بداية من' || col.key === 'الى') {
                        displayValue = formatTime(value as string);
                      } else if (col.key === 'حالة الاذن') {
                        return (
                          <td key={col.key} style={tdStyle}>
                            {getStatusBadge(item['حالة الاذن'])}
                          </td>
                        );
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
                      لا توجد بيانات
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