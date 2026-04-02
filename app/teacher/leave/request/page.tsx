'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

/* ================= Types ================= */

interface FormData {
  TlabAgazaID: number;
  EmploeID: number;
  AgazaNo: string;
  dtpStartDate: string;
  dtpEndDate: string;
  txtDuration: number;
  YerID: number;
  AgazaType: string;
}

interface BalanceType {
  current: number;
  total: number;
}

/* ================= Styles ================= */

const container = {
  maxWidth: '1100px',
  margin: 'auto',
  padding: '20px',
  direction: 'rtl' as const,
  fontFamily: 'Tajawal, sans-serif',
  background: '#f8fafc',
  minHeight: '100vh'
};

const card = {
  background: '#fff',
  padding: '25px',
  borderRadius: '16px',
  marginBottom: '25px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  border: '1px solid #e2e8f0'
};

const input = {
  width: '100%',
  padding: '12px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box' as const
};

const label = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: '600',
  color: '#334155',
  fontSize: '14px'
};

const button = {
  padding: '12px',
  background: 'linear-gradient(to right, #4f46e5, #6366f1)',
  border: 'none',
  color: '#fff',
  borderRadius: '8px',
  cursor: 'pointer',
  width: '100%',
  fontWeight: 'bold',
  fontSize: '16px',
  transition: 'transform 0.2s'
};

/* ================= Page ================= */

export default function VacationRequestPage() {

  const user = useAuthStore(s => s.user);
  const work = useAuthStore(s => s.work);

  const employeeId = user?.personId ?? 0;
  const employeeName = user?.personName ?? '';

  const yearId = work?.yearId ?? 1;
  const yearName = work?.yearName ?? '';

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [balance, setBalance] = useState<BalanceType>({ current: 0, total: 0 });

  const [formData, setFormData] = useState<FormData>({
    TlabAgazaID: 0, // سيتم تحديثه تلقائياً
    EmploeID: employeeId,
    AgazaNo: 'اعتيادية',
    dtpStartDate: '',
    dtpEndDate: '',
    txtDuration: 0,
    YerID: yearId,
    AgazaType: 'منتظرة'
  });

  /* ================= 1. تحديث البيانات الأساسية ================= */
  
  useEffect(() => {
    if (employeeId && yearId) {
      setFormData(prev => ({
        ...prev,
        EmploeID: employeeId,
        YerID: yearId
      }));
    }
  }, [employeeId, yearId]);

  /* ================= 2. جلب رقم الطلب التالي (إصلاح المشكلة) ================= */

  useEffect(() => {
    const getNextId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/41`);
        const data = await res.json();
        
        if (data.success && data.data.length > 0) {
          const id = data.data[0][''] || Object.values(data.data[0])[0];
          setFormData(prev => ({ ...prev, TlabAgazaID: Number(id) || 1 }));
        }
      } catch (err) {
        console.error('خطأ في جلب رقم الطلب:', err);
      }
    };
    
    // جلب الرقم عند تحميل الصفحة أو بعد التحديث
    getNextId();
  }, [refresh]);

  /* ================= 3. حساب المدة ================= */

  const calcDuration = (start: string, end: string) => {
    if (!start || !end) return;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.abs(e.getTime() - s.getTime());
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    setFormData(prev => ({ ...prev, txtDuration: days }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'dtpStartDate' || name === 'dtpEndDate') {
      const start = name === 'dtpStartDate' ? value : formData.dtpStartDate;
      const end = name === 'dtpEndDate' ? value : formData.dtpEndDate;
      calcDuration(start, end);
    }
  };

  /* ================= 4. جلب الرصيد ================= */

  useEffect(() => {
    if (!employeeId || !yearId) return;

    const fetchBalance = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/search/complex?sch1=${employeeId}&sch2=${yearId}&sch3=${formData.AgazaNo}&inpout=14`
        );
        const data = await res.json();

        if (data.success && data.data.length) {
          const r = data.data[0];
          setBalance({
            current: r['رصيد حديث'] || 0,
            total: r['الرصيد المتاح'] || 0
          });
        } else {
            setBalance({ current: 0, total: 0 });
        }
      } catch (err) {
        console.error('خطأ في جلب الرصيد:', err);
      }
    };

    fetchBalance();
  }, [employeeId, yearId, formData.AgazaNo]);

  /* ================= 5. جلب الطلبات السابقة ================= */

  useEffect(() => {
    if (!employeeId) return;

    const fetchRequests = async () => {
      try {
        // استخدام inpout=2 لجلب طلبات الموظف المحدد
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${employeeId}&yearId=${yearId}&inpout=2`
        );
        const data = await res.json();
        if (data.success) setRequests(data.data);
      } catch (err) {
        console.error('خطأ في جلب الطلبات:', err);
      }
    };

    fetchRequests();
  }, [employeeId, yearId, refresh]);

  /* ================= 6. إرسال الطلب (إصلاح منطق الإرسال) ================= */

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من الرصيد
    if (formData.txtDuration > balance.current) {
      alert(`عذراً، الرصيد غير كافٍ!\nالرصيد الحالي: ${balance.current} يوم\nالمدة المطلوبة: ${formData.txtDuration} يوم`);
      return;
    }

    // التحقق من الرقم
    if (formData.TlabAgazaID === 0) {
        alert('جاري تجهيز الطلب، يرجى المحاولة مرة أخرى...');
        // محاولة جلب الرقم مرة أخرى
        setRefresh(prev => prev + 1);
        return;
    }

    setLoading(true);

    try {
        // تجهيز البيانات بنفس طريقة الكود الأول (تحويل القيم لأرقام)
        const payload = {
            ...formData,
            EmploeID: parseInt(formData.EmploeID.toString()),
            YerID: parseInt(formData.YerID.toString()),
            txtDuration: parseInt(formData.txtDuration.toString()),
            operation: 1 // 1 = إضافة جديدة
        };

        const res = await fetch(`${API_URL}/api/leaves/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            alert('تم إرسال الطلب بنجاح ✅');
            
            // إعادة تعيين الحقول مع الاحتفاظ ببيانات الموظف
            setFormData(prev => ({
                ...prev,
                dtpStartDate: '',
                dtpEndDate: '',
                txtDuration: 0,
                AgazaType: 'منتظرة'
            }));
            
            // تحديث القائمة وجلب رقم جديد
            setRefresh(prev => prev + 1);
        } else {
            alert('حدث خطأ: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('حدث خطأ في الاتصال');
    } finally {
        setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div style={container}>
      {/* Header */}
      <div style={{
        marginBottom: 25,
        background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
        color: 'white',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(79, 70, 229, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📝 طلب إجازة</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>موظف: {employeeName}</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الدراسي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yearName}</div>
        </div>
      </div>

      {/* Form */}
      <div style={card}>
        <h3 style={{ marginTop: 0, color: '#4f46e5', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
          ➕ تقديم طلب جديد
        </h3>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
          <div>
            <label style={label}>الموظف</label>
            <input
              type="text"
              value={employeeName}
              readOnly
              style={{ ...input, background: '#f1f5f9', color: '#64748b' }}
            />
          </div>

          <div>
            <label style={label}>نوع الإجازة</label>
            <select
              name="AgazaNo"
              value={formData.AgazaNo}
              onChange={handleChange}
              style={input}
            >
              <option value="اعتيادية">🏖️ اعتيادية</option>
              <option value="عارضة">⚡ عارضة</option>
              <option value="مرضية">🏥 مرضية</option>
            </select>
          </div>

          <div>
            <label style={label}>تاريخ البداية</label>
            <input
              type="date"
              name="dtpStartDate"
              value={formData.dtpStartDate}
              onChange={handleChange}
              style={input}
              required
            />
          </div>

          <div>
            <label style={label}>تاريخ النهاية</label>
            <input
              type="date"
              name="dtpEndDate"
              value={formData.dtpEndDate}
              onChange={handleChange}
              style={input}
              required
            />
          </div>

          <div>
            <label style={label}>المدة (أيام)</label>
            <input
              value={formData.txtDuration}
              readOnly
              style={{ ...input, background: '#eef2ff', color: '#4f46e5', fontWeight: 'bold' }}
            />
          </div>

          <div>
            <label style={label}>رصيد العام الحالي</label>
            <input
              value={balance.current}
              readOnly
              style={{ ...input, background: '#dcfce7', color: '#166534', fontWeight: 'bold' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ ...button, background: loading ? '#94a3b8' : 'linear-gradient(to right, #4f46e5, #6366f1)' }}>
              {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div style={card}>
        <h3 style={{ margin: 0, color: '#4f46e5', marginBottom: '20px' }}>📋 طلباتي السابقة</h3>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>النوع</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>الفترة</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>المدة</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? requests.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '12px' }}>{r['نوع الاجازة']}</td>
                  <td style={{ padding: '12px' }}>
                    {r['تاريخ البدء']?.split('T')[0]} إلى {r['تاريخ الانتهاء']?.split('T')[0]}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{r['المدة']} يوم</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                      background: r['حالة الاجازة'] === 'مؤكدة' ? '#dcfce7' : '#fef9c3',
                      color: r['حالة الاجازة'] === 'مؤكدة' ? '#166534' : '#854d0e'
                    }}>
                      {r['حالة الاجازة']}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    لا توجد طلبات سابقة
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