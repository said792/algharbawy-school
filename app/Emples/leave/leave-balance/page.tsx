'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === تعريف الأنواع ===
interface FormData {
  RasedID: number;
  EmploeID: string;
  YerID: number;
  NewBalance: string;
  AgazaNo: string;
}

// === تعريف الستايلات خارج المكون (لتحسين الأداء ومنع تكرار إنشائها) ===
const containerStyle = {
  padding: '20px', maxWidth: '1200px', margin: '0 auto',
  direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh'
};

const headerStyle = {
  background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white',
  padding: '25px', borderRadius: '16px', marginBottom: '25px',
  boxShadow: '0 4px 20px rgba(37, 99, 235, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};

const cardStyle = {
  background: 'white', padding: '25px', borderRadius: '16px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px',
  border: '1px solid #e2e8f0'
};

const inputGroupStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' };

const inputStyleBase = {
  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1',
  fontSize: '14px', transition: 'all 0.3s', outline: 'none', boxSizing: 'border-box' as const
};

const inputStyle = { ...inputStyleBase, background: '#fff' };
const inputStyleReadOnly = { ...inputStyleBase, background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' };

const buttonStyle = {
  width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
  background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
  color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer',
  transition: 'transform 0.2s'
};

const tableHeaderStyle = {
  background: '#f1f5f9', color: '#475569', fontWeight: '700',
  padding: '15px', textAlign: 'right' as const, borderBottom: '2px solid #e2e8f0'
};

const tableRowStyle = { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' };
const tableCellStyle = { padding: '15px', color: '#334155', fontSize: '14px' };

export default function LeaveBalancePage() {
  // ✅ 1. حل مشكلة Turbopack: استخراج القيم الأولية فقط (Primitives)
  const schoolId = useAuthStore(state => state.user?.schoolId);
  const yearId = useAuthStore(state => state.work?.yearId);
  const yearName = useAuthStore(state => state.work?.yearName);

  // === State ===
  const [formData, setFormData] = useState<FormData>({
    RasedID: 0,
    EmploeID: '',
    YerID: yearId || 1, 
    NewBalance: '',
    AgazaNo: 'اعتيادية'
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // === 2. جلب الموظفين ===
  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;
    
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
        const data = await res.json();
        if (isMounted && data.success) setEmployees(data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEmployees();

    return () => { isMounted = false; };
  }, [schoolId]);

  // === 3. جلب رقم السجل الجديد ===
  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;
    
    const getNextId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/40`);
        const data = await res.json();
        if (isMounted && data.data && data.data.length > 0) {
          const id = data.data[0][''] || Object.values(data.data[0])[0];
          setFormData(prev => ({ ...prev, RasedID: Number(id) || 1 }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    getNextId();

    return () => { isMounted = false; };
  }, [refresh, schoolId]);

  // === 4. مزامنة العام (الحل الدائم لمنع الانهيار) ===
  useEffect(() => {
    if (yearId) {
      // استخدام setTimeout لفصل التحديث عن دورة الرسم الحالية
      setTimeout(() => {
        setFormData(prev => {
          // تحديث فقط إذا تغير الرقم فعلياً
          if (prev.YerID !== yearId) {
            return { ...prev, YerID: yearId };
          }
          return prev;
        });
      }, 0);
    }
  }, [yearId]);

  // === 5. جلب الأرصدة ===
  useEffect(() => {
    if (!schoolId || !formData.YerID) return;
    
    let isMounted = true;
    const fetchBalances = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${formData.YerID}&inpout=7`);
        
        if (!res.ok) throw new Error('Failed to fetch');
        
        const data = await res.json();
        if (isMounted) {
          if (data.success) setBalances(data.data);
          else setBalances([]);
        }
      } catch (err) {
        if (isMounted) console.error(err);
      }
    };
    fetchBalances();

    return () => { isMounted = false; };
  }, [schoolId, formData.YerID, refresh]);

  // === Helper: البحث عن ID الموظف بالاسم ===
  const getEmpIdByName = (name: string): number => {
    if (!name) return 0;
    const emp = employees.find(e => e.name === name);
    return emp ? emp.id : 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // === دالة الحفظ (مع التحقق من التكرار) ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // --- التحقق من التكرار ---
    const selectedEmp = employees.find(emp => emp.id.toString() === formData.EmploeID);
    const empName = selectedEmp ? selectedEmp.name : '';

    const isDuplicate = balances.some(b => 
      b['الموظف'] === empName && 
      b['نوع الاجازة'] === formData.AgazaNo
    );

    if (isDuplicate) {
      alert(`❌ عذراً، الموظف "${empName}" لديه رصيد "${formData.AgazaNo}" مسجل بالفعل لهذا العام!`);
      setLoading(false);
      return; 
    }

    try {
      const payload = {
        ...formData,
        EmploeID: parseInt(formData.EmploeID),
        YerID: parseInt(formData.YerID.toString()),
        NewBalance: parseInt(formData.NewBalance),
        operation: 1 
      };

      const res = await fetch(`${API_URL}/api/leaves/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('تمت إضافة الرصيد بنجاح ✅');
        setRefresh(prev => prev + 1);
        setFormData(prev => ({ ...prev, EmploeID: '', NewBalance: '' }));
      } else {
        alert('حدث خطأ: ' + (data.error || data.message));
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  // === دالة الحذف (المعدلة لإرسال بيانات حقيقية) ===
  const handleDelete = async (item: any) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرصيد؟')) return;
    
    try {
      // 1. جلب ID الموظف الحقيقي من الاسم
      const empId = getEmpIdByName(item['الموظف']);

      // 2. تجهيز البيانات الحقيقية لتجاوز تحقق الباك إند
      const payload = {
        RasedID: item['الرقم'],
        EmploeID: empId,               // ID صحيح
        YerID: formData.YerID,           // العام صحيح
        NewBalance: item['رصيد حديث'],   // الرصيد صحيح
        AgazaNo: item['نوع الاجازة'],   // النوع صحيح
        operation: 3 
      };

      const res = await fetch(`${API_URL}/api/leaves/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('تم الحذف بنجاح 🗑️');
        setRefresh(prev => prev + 1);
      } else {
        alert('فشل الحذف: ' + (data.error || data.message));
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء محاولة الحذف');
    }
  };

  return (
    <div style={containerStyle}>
      
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📅 إدارة أرصدة الإجازات</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>توزيع ومتابعة رصيد الموظفين</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الحالي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yearName || formData.YerID}</div>
        </div>
      </div>

      {/* فورم الإضافة */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
          ➕ إضافة رصيد جديد
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>رقم السجل</label>
            <input type="text" name="RasedID" value={formData.RasedID} readOnly 
              style={inputStyleReadOnly} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>الموظف</label>
            <select name="EmploeID" value={formData.EmploeID} onChange={handleChange} required 
              style={{ ...inputStyle, cursor: 'pointer' }} 
            >
              <option value="">اختر الموظف...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>العام الدراسي</label>
            <input 
              type="text" 
              value={yearName || formData.YerID.toString()} 
              readOnly
              style={inputStyleReadOnly} 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>نوع الإجازة</label>
            <select name="AgazaNo" value={formData.AgazaNo} onChange={handleChange} style={inputStyle}>
              <option value="اعتيادية">🏖️ اعتيادية</option>
              <option value="عارضة">⚡ عارضة</option>
              <option value="مرضية">🏥 مرضية</option>
              <option value="أمومة">👶 أمومة</option>
              <option value="زواج">💍 زواج</option>
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>الرصيد (أيام)</label>
            <input 
              type="number" 
              name="NewBalance" 
              value={formData.NewBalance} 
              onChange={handleChange} 
              placeholder="30" 
              required min="0"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                ...buttonStyle, 
                background: loading ? '#94a3b8' : 'linear-gradient(to right, #10b981, #059669)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '⏳ جاري الحفظ...' : '💾 حفظ الرصيد'}
            </button>
          </div>
        </form>
      </div>

      {/* جدول الأرصدة */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#1e3a8a' }}>📊 سجل الأرصدة</h3>
          <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            عدد السجلات: {balances.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>الموظف</th>
                <th style={tableHeaderStyle}>العام</th>
                <th style={tableHeaderStyle}>نوع الإجازة</th>
                <th style={tableHeaderStyle}>رصيد سابق</th>
                <th style={tableHeaderStyle}>رصيد مضاف</th>
                <th style={tableHeaderStyle}>الإجمالي</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {balances.length > 0 ? balances.map((item, idx) => (
                <tr key={idx} style={tableRowStyle} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                  <td style={{...tableCellStyle, fontWeight: '600'}}>{item['الموظف']}</td>
                  <td style={tableCellStyle}>{item['العام']}</td>
                  <td style={tableCellStyle}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                      background: item['نوع الاجازة'] === 'عارضة' ? '#fef3c7' : '#e0e7ff',
                      color: item['نوع الاجازة'] === 'عارضة' ? '#b45309' : '#3730a3'
                    }}>
                      {item['نوع الاجازة']}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{item['رصيد سابق']}</td>
                  <td style={{...tableCellStyle, color: '#2563eb', fontWeight: 'bold'}}>+{item['رصيد حديث']}</td>
                  <td style={{...tableCellStyle, color: '#059669', fontWeight: 'bold', fontSize: '15px'}}>{item['اجمالى الرصيد']}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                    {/* === تم التعديل هنا: تمرير item بالكامل === */}
                    <button 
                      onClick={() => handleDelete(item)}
                      style={{
                        background: '#fee2e2', color: '#dc2626', border: 'none', 
                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', 
                        fontSize: '13px', fontWeight: 'bold', transition: '0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = '#fecaca'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    لا توجد أرصدة مسجلة لهذا العام
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}