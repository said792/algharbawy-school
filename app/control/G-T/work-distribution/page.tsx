'use client';

import React, { useState } from 'react';
import { API_URL } from '@/lib/config';
import { useAuthStore } from '@/store/authStore';

interface Employee {
  الرقم: number;
  الاسم: string;
  المدرسة: string;
  SchoolID: number;
  "العمل المكلف به"?: string;
}

export default function WorkDistributionPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedJob, setSelectedJob] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'single' | 'all'>('single');

  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 0;

  // ================= جلب الموظفين =================
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData1/38?id=${schoolId}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
        setFilteredEmployees(data.data);
      }
    } catch {
      alert('خطأ فى تحميل الموظفين');
    }
    setLoading(false);
  };

  // ================= البحث =================
  const handleSearch = (value: string) => {
    setSearch(value);
    const filtered = employees.filter(emp => emp.الاسم.includes(value));
    setFilteredEmployees(filtered);
  };

  // ================= حفظ فردى (مع التحديث الفورى) =================
  const saveWork = async (empId: number) => {
    if (!selectedJob) return alert('اختر العمل أولاً');

    try {
      const res = await fetch(`${API_URL}/api/moderia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: empId,
          name: selectedJob,
          operation: 45
        })
      });

      const data = await res.json();
      if (data.success) {
        // ✅ تحديث الـ State فوراً ليعكس التغيير بدون عمل Reload
        const updateLogic = (prev: Employee[]) => prev.map(emp =>
          emp.الرقم === empId ? { ...emp, "العمل المكلف به": selectedJob } : emp
        );
        
        setEmployees(updateLogic);
        setFilteredEmployees(updateLogic);
        alert('✅ تم الحفظ بنجاح');
      }
    } catch {
      alert('خطأ فى الحفظ');
    }
  };

  // ================= حفظ للكل =================
  const saveAll = async () => {
    if (!selectedJob) return alert('اختر العمل أولاً');
    if (!confirm(`سيتم تعيين "${selectedJob}" لكل الموظفين الموجودين. متأكد؟`)) return;

    setSaving(true);
    let count = 0;

    for (const emp of employees) {
      try {
        const res = await fetch(`${API_URL}/api/moderia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: emp.الرقم,
            name: selectedJob,
            operation: 45
          })
        });
        const data = await res.json();
        if (data.success) count++;
      } catch { }
    }

    setSaving(false);
    alert(`✅ تم حفظ العمل لعدد ${count} موظف`);
    
    // تحديث الواجهة بعد الحفظ الكلي
    const updateLogic = (prev: Employee[]) => prev.map(emp => ({ ...emp, "العمل المكلف به": selectedJob }));
    setEmployees(updateLogic);
    setFilteredEmployees(updateLogic);
  };

  // ================= ألوان الوظائف (Badge Colors) =================
  const getJobStyle = (job: string | undefined): React.CSSProperties => {
    let color = '#64748b'; // Default Gray
    let bg = '#f1f5f9';

    switch (job) {
      case 'رئيس لجنة': color = '#b91c1c'; bg = '#fee2e2'; break; // Red
      case 'مراقب اول': color = '#b45309'; bg = '#fef3c7'; break; // Amber
      case 'مراقب دور': color = '#1d4ed8'; bg = '#dbeafe'; break; // Blue
      case 'ملاحظ': color = '#047857'; bg = '#d1fae5'; break; // Green
      case 'امن': color = '#334155'; bg = '#e2e8f0'; break; // Slate
      case 'عضو كنترول': color = '#6b21a8'; bg = '#f3e8ff'; break; // Purple
    }

    return {
      background: bg,
      color: color,
      padding: '6px 12px',
      borderRadius: '20px',
      fontWeight: 'bold',
      fontSize: '13px',
      display: 'inline-block',
      minWidth: '80px',
      textAlign: 'center'
    };
  };

  // ================= Styles (Fire Theme 🔥) =================
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: 'linear-gradient(to bottom, #fff7ed, #ffffff)', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #f97316, #dc2626)', color: 'white', padding: '40px 30px', borderRadius: '25px', marginBottom: '30px', boxShadow: '0 15px 30px rgba(249, 115, 22, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.08)', marginBottom: '25px', border: '1px solid #ffedd5' };
  const inputStyle: React.CSSProperties = { padding: '12px 15px', borderRadius: '10px', border: '2px solid #fdba74', width: '100%', outline: 'none', fontSize: '15px', transition: '0.2s' };
  const selectStyle: React.CSSProperties = { ...inputStyle, backgroundColor: 'white', cursor: 'pointer' };
  const btnPrimary: React.CSSProperties = { padding: '12px 30px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', color: 'white', background: 'linear-gradient(to right, #f97316, #ea580c)', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)', transition: 'transform 0.2s' };
  const btnSecondary: React.CSSProperties = { ...btnPrimary, background: '#f1f5f9', color: '#475569', boxShadow: 'none', border: '1px solid #e2e8f0' };
  const thStyle: React.CSSProperties = { padding: '15px', borderBottom: '2px solid #ffedd5', color: '#9a3412', fontWeight: 'bold', fontSize: '15px', textAlign: 'right' };
  const tdStyle: React.CSSProperties = { padding: '15px', borderBottom: '1px solid #fff7ed', fontSize: '15px', verticalAlign: 'middle' };

  return (
    <div style={containerStyle}>
      
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px' }}>📋 توزيع أعمال الامتحانات</h1>
          <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: '16px' }}>إدارة وتوزيع المهام على الموظفين</p>
        </div>
        <div style={{ fontSize: '60px' }}>🔥</div>
      </div>

      {/* Controls Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={loadEmployees} disabled={loading} style={btnPrimary}>
            {loading ? 'جاري التحميل...' : '🔄 عرض الموظفين'}
          </button>
        </div>

        {employees.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#4b5563' }}>بحث عن موظف</label>
                <input
                  placeholder='اكتب اسم الموظف...'
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={inputStyle}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#4b5563' }}>اختر العمل</label>
                <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} style={selectStyle}>
                  <option value="">-- اختر الوظيفة --</option>
                  <option>رئيس لجنة</option>
                  <option>مراقب اول</option>
                  <option>مراقب دور</option>
                  <option>ملاحظ</option>
                  <option>امن</option>
                  <option>عضو كنترول</option>
                </select>
              </div>

              <div style={{ textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#4b5563' }}>الوضع</label>
                <div style={{ display: 'flex', gap: '10px', background: '#f8fafc', padding: '5px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ cursor: 'pointer', padding: '5px 10px', background: mode === 'single' ? '#fff7ed' : 'transparent', borderRadius: '6px', border: mode === 'single' ? '2px solid #f97316' : '2px solid transparent' }}>
                    <input type="radio" checked={mode === 'single'} onChange={() => setMode('single')} style={{ display: 'none' }} />
                    فردى
                  </label>
                  <label style={{ cursor: 'pointer', padding: '5px 10px', background: mode === 'all' ? '#fff7ed' : 'transparent', borderRadius: '6px', border: mode === 'all' ? '2px solid #f97316' : '2px solid transparent' }}>
                    <input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} style={{ display: 'none' }} />
                    الكل
                  </label>
                </div>
              </div>
            </div>

            {mode === 'all' && (
              <div style={{ textAlign: 'left', marginTop: '10px' }}>
                <button onClick={saveAll} disabled={saving || !selectedJob} style={{ ...btnPrimary, background: 'linear-gradient(to right, #dc2626, #b91c1c)' }}>
                  {saving ? 'جاري الحفظ...' : `💾 تعيين "${selectedJob || '...'}" للجميع`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Table Card */}
      {employees.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#ea580c' }}>قائمة الموظفين</h3>
            <span style={{ background: '#fff7ed', padding: '5px 15px', borderRadius: '20px', color: '#9a3412', fontWeight: 'bold' }}>
              العدد: {filteredEmployees.length}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff7ed' }}>
                  <th style={thStyle}>م</th>
                  <th style={thStyle}>الرقم</th>
                  <th style={thStyle}>اسم الموظف</th>
                  <th style={thStyle}>العمل الحالي</th>
                  <th style={{...thStyle, textAlign:'center'}}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.الرقم} style={{ transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{...tdStyle, color:'#64748b'}}>{emp.الرقم}</td>
                    <td style={{...tdStyle, fontWeight:'bold'}}>{emp.الاسم}</td>
                    <td style={tdStyle}>
                      <span style={getJobStyle(emp["العمل المكلف به"])}>
                        {emp["العمل المكلف به"] || 'غير محدد'}
                      </span>
                    </td>
                    <td style={{...tdStyle, textAlign:'center'}}>
                      {mode === 'single' ? (
                        <button
                          style={{...btnPrimary, padding: '8px 20px', fontSize: '13px', opacity: !selectedJob ? 0.5 : 1}}
                          onClick={() => saveWork(emp.الرقم)}
                          disabled={!selectedJob}
                        >
                          حفظ
                        </button>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>وضع التعديل الكلي</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}