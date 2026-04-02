'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// تعريف الأنواع
interface LeaveRecord {
  'الرقم': number;
  'الموظف': string;
  'نوع الاجازة': string;
  'تاريخ البدء': string;
  'تاريخ الانتهاء': string;
  'المدة': number;
  'حالة الاجازة': string;
}

// تعريف الستايلات خارج المكون
const containerStyle = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
const headerStyle = { background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
const filterGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const };
const thStyle = { padding: '12px 15px', textAlign: 'right' as const, fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '2px solid #059669' };
const tdStyle = { padding: '12px 15px', color: '#334155', fontSize: '14px', borderBottom: '1px solid #f1f5f9' };
const actionButtonStyle = { background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' };

export default function AllLeavesPage() {
  const schoolId = useAuthStore(state => state.user?.schoolId);
  const yearId = useAuthStore(state => state.work?.yearId);
  const yearName = useAuthStore(state => state.work?.yearName);

  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [filtered, setFiltered] = useState<LeaveRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const [filters, setFilters] = useState({
    name: "",
    type: "",
    date: ""
  });

  const [columnsConfig, setColumnsConfig] = useState([
    { key: "الموظف", label: "الموظف", visible: true },
    { key: "نوع الاجازة", label: "نوع الإجازة", visible: true },
    { key: "تاريخ البدء", label: "تاريخ البدء", visible: true },
    { key: 'تاريخ الانتهاء', label: "تاريخ الانتهاء", visible: true },
    { key: "المدة", label: "المدة (أيام)", visible: true },
    { key: "حالة الاجازة", label: "الحالة", visible: true },
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
        const data = await res.json();
        if (isMounted && data.success) setEmployees(data.data);
      } catch (err) { console.error(err); }
    };
    fetchEmployees();

    return () => { isMounted = false; };
  }, [schoolId]);

  // === 2. جلب بيانات الإجازات ===
  useEffect(() => {
    if (!schoolId || !yearId) return;
    setLoading(true);
    let isMounted = true;

    const fetchLeaves = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=33`
        );
        const data = await res.json();
        if (isMounted && data.success) {
          setLeaves(data.data);
          setFiltered(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLeaves();

    return () => { isMounted = false; };
  }, [schoolId, yearId, refresh]);

  const getEmpIdByName = (name: string): number => {
    if (!name) return 0;
    const emp = employees.find(e => e.name === name);
    return emp ? emp.id : 0;
  };

  // === 3. الفلترة ===
  useEffect(() => {
    const { name, type, date } = filters;
    const result = leaves.filter((item) => {
      const matchName = item['الموظف']?.toLowerCase().includes(name.toLowerCase());
      const matchType = type ? item['نوع الاجازة'] === type : true;
      let matchDate = true;
      if (date) {
        const searchDate = new Date(date);
        const start = new Date(item['تاريخ البدء']);
        const end = new Date(item['تاريخ الانتهاء']);
        matchDate = searchDate >= start && searchDate <= end;
      }
      return matchName && matchType && matchDate;
    });
    setFiltered(result);
  }, [filters, leaves]);

  // === الحذف ===
   // === التعامل مع العمليات (حذف) ===
  const handleDelete = async (item: LeaveRecord) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) return;

    try {
      // 1. جلب الـ ID الحقيقي للموظف
      const empId = getEmpIdByName(item['الموظف']);
      
      // 2. التحقق من حالة الإجازة
      const status = item['حالة الاجازة'];
      
      // 3. إرسال البيانات
      // ملاحظة: الباك إند (Stored Procedure) هو المسؤول عن التحقق من 'status'.
      // إذا كانت 'مؤكدة' يقوم بعملية الخصم العكسي (إرجاع الرصيد).
      // إذا كانت 'منتظرة' يقوم بالحذف فقط دون تعديل الرصيد (لأنه لم يخصم أصلاً).
      const payload = {
        TlabAgazaID: item['الرقم'],
        EmploeID: empId, 
        AgazaNo: item['نوع الاجازة'],
        dtpStartDate: '1900-01-01',
        dtpEndDate: '1900-01-01',
        txtDuration: item['المدة'],
        YerID: yearId ?? 1,
        operation: 3 
      };

      const res = await fetch(`${API_URL}/api/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('تم حذف السجل بنجاح 🗑️');
        setRefresh(prev => prev + 1);
      } else {
        alert('فشل الحذف: ' + (data.error || data.message));
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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📊 سجل الإجازات الشامل</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>عرض وفلترة جميع طلبات الإجازات للعام الحالي</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الدراسي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yearName || yearId}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#059669' }}>🔍 بحث وفلترة</h3>
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
                  style={{ marginLeft: '8px', accentColor: '#059669' }}
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
            <option value="اعتيادية">اعتيادية</option>
            <option value="عارضة">عارضة</option>
            <option value="مرضية">مرضية</option>
            <option value="أمومة">أمومة</option>
            <option value="زواج">زواج</option>
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
            <div style={{ textAlign: 'center', padding: 50, color: '#059669' }}>جاري تحميل البيانات...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f0fdf4', color: '#065f46' }}>
                  {columnsConfig.filter(c => c.visible).map((col) => (
                    <th key={col.key} style={thStyle}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', transition: '0.2s' }}>
                    {columnsConfig.filter(c => c.visible).map((col) => (
                      <td key={col.key} style={tdStyle}>
                        {/* دالة مساعدة داخل الـ Map لتنظيم الـ Logic */}
                        {(() => {
                          if (col.key === 'حالة الاجازة') {
                            return getStatusBadge(item['حالة الاجازة']);
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
                          if (col.key === 'تاريخ البدء' || col.key === 'تاريخ الانتهاء') {
                            // تحويل القيمة إلى نص ثم تقسيمها لمنع الخطأ مع الأرقام
                            const val = String(item[col.key as keyof LeaveRecord]);
                            return val.split('T')[0];
                          }
                          return item[col.key as keyof LeaveRecord] || "-";
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