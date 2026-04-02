'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// تعريف الأنواع
interface PenaltyRecord {
  'الرقم': number;
  'الموظف': string;
  'نوع الجزاء': string;
  'تاريخ الجزاء': string;
  'مدة الجزاء': number;
  'سبب الجزاء': string;
  'حالة الجزاء': string;
}

// تعريف الستايلات خارج المكون
const containerStyle = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
const headerStyle = { background: 'linear-gradient(135deg, #ea580c, #f97316)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(234, 88, 12, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
const filterGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const };
const thStyle = { padding: '12px 15px', textAlign: 'right' as const, fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '2px solid #ea580c', background: '#fff7ed', color: '#9a3412' };
const tdStyle = { padding: '12px 15px', color: '#334155', fontSize: '14px', borderBottom: '1px solid #f1f5f9' };
const actionButtonStyle = { background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' };

export default function AllPenaltiesPage() {
  const schoolId = useAuthStore(state => state.user?.schoolId);
  const yearId = useAuthStore(state => state.work?.yearId);
  const yearName = useAuthStore(state => state.work?.yearName);

  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [filtered, setFiltered] = useState<PenaltyRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // ✅ إضافة حالة لتخزين أنواع الجزاءات
  const [penaltyTypes, setPenaltyTypes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const [filters, setFilters] = useState({
    name: "",
    type: "",
    date: ""
  });

  const [columnsConfig, setColumnsConfig] = useState([
    { key: "الموظف", label: "الموظف", visible: true },
    { key: "نوع الجزاء", label: "نوع الجزاء", visible: true },
    { key: "تاريخ الجزاء", label: "تاريخ الجزاء", visible: true },
    { key: "مدة الجزاء", label: "المدة/القيمة", visible: true },
    { key: "سبب الجزاء", label: "سبب الجزاء", visible: true },
    { key: "حالة الجزاء", label: "الحالة", visible: true },
    { key: "actions", label: "إجراءات", visible: true },
  ]);

  const [showColMenu, setShowColMenu] = useState(false);

  // === 1. جلب قائمة الموظفين ===
  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;
    
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success) setEmployees(data.data);
      } catch (err) { console.error(err); }
    };
    fetchEmployees();

    return () => { isMounted = false; };
  }, [schoolId]);

  // === 2. جلب أنواع الجزاء (ديناميكي) ===
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/50`);
        const data = await res.json();
        if (data.success) setPenaltyTypes(data.data);
      } catch (err) { console.error(err); }
    };
    fetchTypes();
  }, []);

  // === 3. جلب بيانات الجزاءات (Inpot 20) ===
  useEffect(() => {
    if (!schoolId || !yearId) return;
    setLoading(true);
    let isMounted = true;

    const fetchPenalties = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=20`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success) {
          setPenalties(data.data);
          setFiltered(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPenalties();

    return () => { isMounted = false; };
  }, [schoolId, yearId, refresh]);

  const getEmpIdByName = (name: string): number => {
    if (!name) return 0;
    const emp = employees.find(e => e.name === name);
    return emp ? emp.id : 0;
  };

  // === 4. الفلترة ===
  useEffect(() => {
    const { name, type, date } = filters;
    const result = penalties.filter((item) => {
      const matchName = item['الموظف']?.toLowerCase().includes(name.toLowerCase());
      const matchType = type ? item['نوع الجزاء'] === type : true;
      let matchDate = true;
      if (date) {
        const searchDate = new Date(date);
        const start = new Date(item['تاريخ الجزاء']);
        matchDate = item['تاريخ الجزاء'] === date || new Date(item['تاريخ الجزاء']).getTime() === searchDate.getTime();
      }
      return matchName && matchType && matchDate;
    });
    setFiltered(result);
  }, [filters, penalties]);

  // === الحذف ===
const handleDelete = async (item: PenaltyRecord) => {
  if (!confirm('هل أنت متأكد من حذف هذا الجزاء؟')) return;

  const empId = getEmpIdByName(item['الموظف']);

  try {
    const res = await fetch(`${API_URL}/api/penalty/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        palanetID: item['الرقم'],
        EmploeID: empId.toString(),
        NoPalantID: '0',
        PalaentDAte: item['تاريخ الجزاء']?.split('T')[0],
        PalantModa: '0',
        PalanetSabb: '',
        PalaentSatse: '',
        YerID: yearId ?? 1,
        operation: 3
      })
    });

    const data = await res.json();
    if (data.success) {
      alert('تم حذف الجزاء 🗑️');
      setRefresh(prev => prev + 1);
    } else {
      alert('فشل الحذف: ' + data.error);
    }
  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء الحذف');
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
    if (status === 'مؤكدة') { bg = '#fee2e2'; color = '#991b1b'; }
    else if (status === 'منتظرة') { bg = '#fef9c3'; color = '#854d0e'; }
    else if (status === 'ملغاة') { bg = '#e2e8f0'; color: '#475569'; }
    return (
      <span style={{
        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
        backgroundColor: bg, color: color, whiteSpace: 'nowrap'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>⚖️ سجل الجزاءات الشامل</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>عرض وفلترة جميع جزاءات الموظفين للعام الحالي</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الدراسي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yearName || yearId}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#ea580c' }}>🔍 بحث وفلترة</h3>
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
                  style={{ marginLeft: '8px', accentColor: '#ea580c' }}
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
          
          {/* ✅ تم التعديل هنا: جلب الأنواع من القائمة الديناميكية */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            style={inputStyle}
          >
            <option value="">كل الأنواع</option>
            {penaltyTypes.map(type => (
              <option key={type['الرقم']} value={type['نوع الجزاء']}>
                {type['نوع الجزاء']}
              </option>
            ))}
          </select>
          
          <input
            type="date"
            placeholder="بحث في تاريخ..."
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ textAlign: 'left' }}>
          <button 
            onClick={() => setFilters({ name: '', type: '', date: '' })}
            style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
          >
            مسح الفلاتر
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50, color: '#ea580c' }}>جاري تحميل البيانات...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr>
                  {columnsConfig.filter(c => c.visible).map((col) => (
                    <th key={col.key} style={thStyle}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#fff7ed', transition: '0.2s' }}>
                    {columnsConfig.filter(c => c.visible).map((col) => (
                      <td key={col.key} style={tdStyle}>
                        {(() => {
                          if (col.key === 'حالة الجزاء') {
                            return getStatusBadge(item['حالة الجزاء']);
                          }
                          if (col.key === 'actions') {
                            return (
                              <button 
                                onClick={() => handleDelete(item)}
                                style={actionButtonStyle}
                                title="حذف"
                              >
                                🗑️
                              </button>
                            );
                          }
                          if (col.key === 'تاريخ الجزاء') {
                            const val = String(item[col.key as keyof PenaltyRecord]);
                            return val.split('T')[0];
                          }
                          if (col.key === 'سبب الجزاء') {
                             return <div style={{maxWidth: '250px', whiteSpace: 'pre-wrap'}}>{item['سبب الجزاء']}</div>
                          }
                          return item[col.key as keyof PenaltyRecord] || "-";
                        })()}
                      </td>
                    ))}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columnsConfig.length} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      لا توجد بيانات تطابق البحث
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