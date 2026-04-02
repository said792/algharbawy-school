'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === السطر السحري لإصلاح مشكلة البناء ===
export const dynamic = 'force-dynamic';

// === تعريف الأنواع ===
interface FormData {
  TlabAgazaID: number;
  EmploeID: string;
  AgazaNo: string;
  dtpStartDate: string;
  dtpEndDate: string;
  txtDuration: string;
  YerID: number;
  AgazaType: string;
}

interface BalanceType {
  current: number;
  total: number;
}

// === تعريف الستايلات خارج المكون ===
const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
const headerStyle = { background: 'linear-gradient(135deg, #4f46e5, #818cf8)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(79, 70, 229, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
const inputGroupStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' };
const inputStyleBase = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', transition: 'all 0.3s', outline: 'none', boxSizing: 'border-box' as const };
const inputStyle = { ...inputStyleBase, background: '#fff' };
const buttonStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(to right, #4f46e5, #6366f1)', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.2s' };
const thStyle = { background: '#f1f5f9', color: '#475569', fontWeight: '700', padding: '15px', textAlign: 'right' as const, borderBottom: '2px solid #e2e8f0' };
const tdStyle = { padding: '15px', color: '#334155', fontSize: '14px' };

// === المكون الداخلي الذي يحتوي المنطق ===
function VacationRequestContent() {
  const searchParams = useSearchParams();
  const { user, work } = useAuthStore();
  
  // استخراج المعرفات من الرابط أو من المتجر
  const externalSchoolId = searchParams.get('schoolId');
  const externalSchoolName = searchParams.get('schoolName');
  
  // المنطق الجديد: استخدام معرف المدرسة من الرابط إذا وجد، وإلا استخدام مدرسة المستخدم
  const targetSchoolId = externalSchoolId || user?.schoolId;
  const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة';
  
  const yearId = work?.yearId;
  const yearName = work?.yearName;

  const [formData, setFormData] = useState<FormData>({
    TlabAgazaID: 0,
    EmploeID: '',
    AgazaNo: 'اعتيادية',
    dtpStartDate: '',
    dtpEndDate: '',
    txtDuration: '0',
    YerID: yearId ?? 1,
    AgazaType: 'منتظرة'
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState<BalanceType>({ current: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // === 1. جلب الموظفين (بناءً على targetSchoolId) ===
  useEffect(() => {
    if (!targetSchoolId) return;
    let isMounted = true;
    
    const fetchEmployees = async () => {
      try {
        // ملاحظة: تأكد أن الـ API يدعم جلب موظفي مدرسة أخرى إذا كان المستخدم مديراً عاماً
        const res = await fetch(`${API_URL}/api/getData1/14?id=${targetSchoolId}`);
        const data = await res.json();
        if (isMounted && data.success) setEmployees(data.data);
      } catch (err) { console.error(err); }
    };
    fetchEmployees();

    return () => { isMounted = false; };
  }, [targetSchoolId]);

  // === 2. جلب الرقم التالي للطلب الجديد ===
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
        console.error(err);
      }
    };
    
    if (!isEditing) {
      getNextId();
    }
  }, [refresh, isEditing]);

  // === 3. مزامنة العام ===
  useEffect(() => {
    if (yearId) {
      setFormData(prev => {
        if (prev.YerID !== yearId) {
          return { ...prev, YerID: yearId };
        }
        return prev;
      });
    }
  }, [yearId]);

  // === 4. جلب الرصيد ===
  useEffect(() => {
    if (formData.EmploeID && formData.AgazaNo && formData.YerID) {
      fetchBalance();
    }
  }, [formData.EmploeID, formData.AgazaNo, formData.YerID]);

  const fetchBalance = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/search/complex?sch1=${formData.EmploeID}&sch2=${formData.YerID}&sch3=${formData.AgazaNo}&inpout=14`
      );
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const row = data.data[0];
        setBalance({
          current: row['رصيد حديث'] || 0,
          total: row['الرصيد المتاح'] || 0
        });
      } else {
        setBalance({ current: 0, total: 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // === 5. جلب الطلبات (بناءً على targetSchoolId) ===
  useEffect(() => {
    if (!targetSchoolId || !formData.YerID) return;
    
    let isMounted = true;
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${formData.YerID}&inpout=8`);
        const data = await res.json();
        if (isMounted && data.success) setRequests(data.data);
      } catch (err) { console.error(err); }
    };
    fetchRequests();

    return () => { isMounted = false; };
  }, [targetSchoolId, formData.YerID, refresh]);

  const getEmpIdByName = (name: string): number => {
    if (!name) return 0;
    const emp = employees.find(e => e.name === name);
    return emp ? emp.id : 0;
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setFormData(prev => ({ ...prev, txtDuration: diffDays.toString() }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'dtpStartDate' || name === 'dtpEndDate') {
      const newStart = name === 'dtpStartDate' ? value : formData.dtpStartDate;
      const newEnd = name === 'dtpEndDate' ? value : formData.dtpEndDate;
      calculateDuration(newStart, newEnd);
    }
  };

  const handleSubmit = async (e: React.FormEvent, operation: number) => {
    e.preventDefault();
    setLoading(true);

    const requestedDays = parseInt(formData.txtDuration);
    
    if (requestedDays > balance.current) {
      alert(`عذراً، رصيد العام الحالي غير كافٍ!\nالرصيد الحالي: ${balance.current} يوم\nالمدة المطلوبة: ${requestedDays} يوم`);
      setLoading(false);
      return; 
    }

    try {
      const payload = {
        ...formData,
        EmploeID: parseInt(formData.EmploeID),
        YerID: parseInt(formData.YerID.toString()),
        txtDuration: parseInt(formData.txtDuration),
        operation: operation 
        // ملاحظة: قد تحتاج لإضافة schoolId في الـ payload إذا كان الـ API يتطلب ذلك صراحة
        // SchoolID: parseInt(targetSchoolId) 
      };

      const res = await fetch(`${API_URL}/api/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(operation === 1 ? 'تم إرسال الطلب بنجاح ✅' : 'تم تعديل الطلب بنجاح ✏️');
        resetForm();
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

  // === تأكيد الطلب ===
  const handleConfirm = async (item: any) => {
    if (!confirm('هل أنت متأكد من تأكيد هذا الطلب؟ سيتم خصم الرصيد.')) return;
    try {
      const empId = getEmpIdByName(item['الموظف']);

      const payload = {
        TlabAgazaID: item['الرقم'],
        EmploeID: empId,
        AgazaNo: item['نوع الاجازة'],
        dtpStartDate: '1900-01-01', 
        dtpEndDate: '1900-01-01',   
        txtDuration: item['المدة'],
        YerID: yearId ?? 1,
        operation: 2 
      };

      const res = await fetch(`${API_URL}/api/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('تم تأكيد الإجازة وخصم الرصيد ✅');
        setRefresh(prev => prev + 1);
      } else {
        alert('فشل التأكيد: ' + data.error);
      }
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      TlabAgazaID: 0,
      EmploeID: '',
      AgazaNo: 'اعتيادية',
      dtpStartDate: '',
      dtpEndDate: '',
      txtDuration: '0',
      AgazaType: 'منتظرة'
    }));
    setBalance({ current: 0, total: 0 });
    setIsEditing(false);
    setRefresh(prev => prev + 1);
  };

  const startEdit = (item: any) => {
    const empName = item['الموظف'];
    const empId = getEmpIdByName(empName);

    setFormData({
      TlabAgazaID: item['الرقم'],
      EmploeID: empId.toString(),
      AgazaNo: item['نوع الاجازة'],
      dtpStartDate: item['تاريخ البدء'].split('T')[0], 
      dtpEndDate: item['تاريخ الانتهاء'].split('T')[0],
      txtDuration: item['المدة'].toString(),
      YerID: yearId ?? 1,
      AgazaType: item['حالة الاجازة']
    });
    setIsEditing(true);
  };

  return (
    <div style={containerStyle}>
      
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📝 طلبات الإجازة</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
            {externalSchoolId ? `إدارة طلبات: ${displaySchoolName}` : 'تسجيل ومتابعة طلبات الموظفين'}
          </p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الحالي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yearName || formData.YerID}</div>
        </div>
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#4f46e5', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
          {isEditing ? '✏️ تعديل الطلب' : '➕ تسجيل طلب جديد'}
        </h3>
        <form onSubmit={(e) => handleSubmit(e, isEditing ? 4 : 1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>الموظف</label>
            <select name="EmploeID" value={formData.EmploeID} onChange={handleChange} required style={inputStyle}>
              <option value="">اختر الموظف...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>نوع الإجازة</label>
            <select name="AgazaNo" value={formData.AgazaNo} onChange={handleChange} style={inputStyle}>
              <option value="اعتيادية">🏖️ اعتيادية</option>
              <option value="عارضة">⚡ عارضة</option>
              <option value="مرضية">🏥 مرضية</option>
              <option value="أمومة">👶 أمومة</option>
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>تاريخ البداية</label>
            <input type="date" name="dtpStartDate" value={formData.dtpStartDate} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>تاريخ النهاية</label>
            <input type="date" name="dtpEndDate" value={formData.dtpEndDate} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>رصيد العام الحالي</label>
            <input type="text" value={balance.current} readOnly style={{ ...inputStyle, background: '#dcfce7', color: '#166534', fontWeight: 'bold' }} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>الرصيد الكلي المتاح</label>
            <input type="text" value={balance.total} readOnly style={{ ...inputStyle, background: '#f0f9ff', color: '#1d4ed8', fontWeight: 'bold' }} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>المدة (أيام)</label>
            <input type="text" name="txtDuration" value={formData.txtDuration} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b', fontWeight: 'bold' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ ...buttonStyle, background: loading ? '#94a3b8' : (isEditing ? '#eab308' : '#4f46e5') }}>
              {loading ? 'جاري...' : (isEditing ? 'حفظ التعديل' : 'إرسال الطلب')}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} style={{ ...buttonStyle, background: '#94a3b8' }}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <h3 style={{ margin: 0, color: '#4f46e5', marginBottom: '20px' }}>📋 سجل الطلبات</h3>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={thStyle}>الموظف</th>
                <th style={thStyle}>نوع الإجازة</th>
                <th style={thStyle}>الفترة</th>
                <th style={thStyle}>المدة</th>
                <th style={thStyle}>الحالة</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? requests.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={tdStyle}>{item['الموظف']}</td>
                  <td style={tdStyle}>{item['نوع الاجازة']}</td>
                  <td style={tdStyle}>
                    {item['تاريخ البدء'].split('T')[0]} <br/> 
                    <span style={{fontSize:'12px', color:'#64748b'}}>إلى</span> <br/>
                    {item['تاريخ الانتهاء'].split('T')[0]}
                  </td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{item['المدة']} يوم</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                      background: item['حالة الاجازة'] === 'مؤكدة' ? '#dcfce7' : '#fef9c3',
                      color: item['حالة الاجازة'] === 'مؤكدة' ? '#166534' : '#854d0e'
                    }}>
                      {item['حالة الاجازة']}
                    </span>
                  </td>
                  <td style={{...tdStyle, textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      {item['حالة الاجازة'] === 'منتظرة' ? (
                        <>
                          <button onClick={() => handleConfirm(item)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} title="تأكيد">✅</button>
                          <button onClick={() => startEdit(item)} style={{ background: '#eab308', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} title="تعديل">✏️</button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا توجد طلبات مسجلة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// === المكون الرئيسي (ال Wrapper مع Suspense) ===
export default function VacationRequestPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>جاري التحميل...</div>}>
      <VacationRequestContent />
    </Suspense>
  );
}