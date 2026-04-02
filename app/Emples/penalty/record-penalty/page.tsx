'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === السطر السحري لإصلاح مشكلة البناء ===
export const dynamic = 'force-dynamic';

// === تعريف الأنواع ===
interface PenaltyFormData {
  palanetID: number;
  EmploeID: string;
  NoPalantID: string; 
  PalaentDAte: string;
  PalantModa: string; 
  PalanetSabb: string; 
  PalaentSatse: string; 
  YerID: number;
}

// === 1. مكون المحتوى (داخل Suspense) ===
function PenaltyContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams();

  // === منطق قراءة المعرفات (دعم الرابط والمستخدم العادي) ===
  const externalSchoolId = searchParams.get('schoolId');
  const externalSchoolName = searchParams.get('schoolName');
  const targetSchoolId = externalSchoolId || user?.schoolId;
  const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة';

  const yearId = work?.yearId;
  const yearName = work?.yearName;

  const [formData, setFormData] = useState<PenaltyFormData>({
    palanetID: 0,
    EmploeID: '',
    NoPalantID: '',
    PalaentDAte: new Date().toISOString().split('T')[0],
    PalantModa: '0',
    PalanetSabb: '',
    PalaentSatse: 'منتظرة',
    YerID: yearId ?? 1,
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [penaltyTypes, setPenaltyTypes] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  
  // حالة للتحقق من تسجيل الدخول
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // === التحقق من تسجيل الدخول (تم الإصلاح) ===
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAuthChecked(true);
      if (!user) {
        window.location.href = '/login'; 
      }
    }, 500); // مهلة 500ms

    return () => clearTimeout(timer);
  }, [user]);

  // === 1. جلب الموظفين (استخدام targetSchoolId) ===
  useEffect(() => {
    if (!targetSchoolId) return;
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData1/14?id=${targetSchoolId}`);
        const data = await res.json();
        if (data.success) setEmployees(data.data);
      } catch (err) { console.error(err); }
    };
    fetchEmployees();
  }, [targetSchoolId]);

  // === 2. جلب أنواع الجزاءات ===
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

  // === 3. مزامنة العام ===
  useEffect(() => {
    if (yearId) setFormData(prev => ({ ...prev, YerID: yearId }));
  }, [yearId]);

  // === 4. جلب سجل الجزاءات (استخدام targetSchoolId) ===
  useEffect(() => {
    if (!targetSchoolId || !formData.YerID) return;
    const fetchPenalties = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${formData.YerID}&inpout=20`);
        const data = await res.json();
        if (data.success) setPenalties(data.data);
      } catch (err) { console.error(err); }
    };
    fetchPenalties();
  }, [targetSchoolId, formData.YerID, refresh]);

  const getEmpIdByName = (name: string): number => {
    if (!name) return 0;
    const emp = employees.find(e => e.name === name);
    return emp ? emp.id : 0;
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any, operation: number, data?: PenaltyFormData) => {
    e?.preventDefault();
    setLoading(true);

    const fd = data || formData;

    try {
      const payload = {
        palanetID: Number(fd.palanetID),
        EmploeID: Number(fd.EmploeID),
        PalaentDAte: fd.PalaentDAte,
        NoPalantID: Number(fd.NoPalantID),
        PalantModa: Number(fd.PalantModa),
        PalanetSabb: fd.PalanetSabb,
        PalaentSatse: operation === 4 ? 'مؤكدة' : fd.PalaentSatse,
        YerID: fd.YerID,
        operation
      };

      const res = await fetch(`${API_URL}/api/penalty/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dataRes = await res.json();

      if (dataRes.success) {
        let message = '';
        if (operation === 1) message = 'تم إضافة الجزاء بنجاح ⚠️';
        else if (operation === 2) message = 'تم تعديل الجزاء ✏️';
        else if (operation === 3) message = 'تم حذف الجزاء 🗑️';
        else if (operation === 4) message = 'تم تأكيد الجزاء ✅';

        alert(message);
        resetForm();
        setRefresh(prev => prev + 1);

      } else {
        alert('حدث خطأ: ' + dataRes.error);
      }

    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجزاء؟')) return;

    const empId = item.EmploeID || getEmpIdByName(item['الموظف']);

    await handleSubmit(null, 3, {
      palanetID: item['الرقم'],
      EmploeID: empId.toString(),
      NoPalantID: '0',
      PalaentDAte: item['تاريخ الجزاء']?.split('T')[0],
      PalantModa: '0',
      PalanetSabb: '',
      PalaentSatse: '',
      YerID: formData.YerID,
    });
  };

  const handleConfirm = async (item: any) => {
    const empId = item.EmploeID || getEmpIdByName(item['الموظف']);
    const typeObj = penaltyTypes.find(t => t['نوع الجزاء'] === item['نوع الجزاء']);
    const typeId = typeObj ? typeObj['الرقم'] : 0;

    await handleSubmit(null, 4, {
      palanetID: item['الرقم'],
      EmploeID: empId.toString(),
      NoPalantID: typeId.toString(),
      PalaentDAte: item['تاريخ الجزاء']?.split('T')[0],
      PalantModa: item['مدة الجزاء']?.toString() || '0',
      PalanetSabb: item['سبب الجزاء'] || '',
      PalaentSatse: item['حالة الجزاء'] || 'منتظرة',
      YerID: formData.YerID,
    });
  };

  const resetForm = () => {
    setFormData({
      palanetID: 0,
      EmploeID: '',
      NoPalantID: '',
      PalaentDAte: new Date().toISOString().split('T')[0],
      PalantModa: '0',
      PalanetSabb: '',
      PalaentSatse: 'منتظرة',
      YerID: yearId ?? 1,
    });
    setIsEditing(false);
  };

  const startEdit = (item: any) => {
    const empId = item.EmploeID || getEmpIdByName(item['الموظف']);
    const typeObj = penaltyTypes.find(t => t['نوع الجزاء'] === item['نوع الجزاء']);
    const typeId = typeObj ? typeObj['الرقم'] : 0;

    setFormData({
      palanetID: item['الرقم'],
      EmploeID: empId.toString(),
      NoPalantID: typeId.toString(),
      PalaentDAte: item['تاريخ الجزاء']?.split('T')[0],
      PalantModa: item['مدة الجزاء']?.toString() || '0',
      PalanetSabb: item['سبب الجزاء'] || '',
      PalaentSatse: item['حالة الجزاء'] || 'منتظرة',
      YerID: yearId ?? 1,
    });

    setIsEditing(true);
  };

  // === Styles ===
  const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle = { background: 'linear-gradient(135deg, #ea580c, #f97316)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(234, 88, 12, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
  const inputGroupStyle = { marginBottom: '15px' };
  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' };
  const inputStyleBase = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', transition: 'all 0.3s', outline: 'none', boxSizing: 'border-box' as const };
  const inputStyle = { ...inputStyleBase, background: '#fff' };
  const buttonStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(to right, #ea580c, #f97316)', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.2s' };
  const thStyle = { background: '#fff7ed', color: '#9a3412', fontWeight: '700', padding: '15px', textAlign: 'right' as const, borderBottom: '2px solid #ea580c' };
  const tdStyle = { padding: '15px', color: '#334155', fontSize: '14px' };

  // === فحص الحالة قبل العرض ===
  if (!isAuthChecked) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>جاري التحقق من الصلاحيات...</div>;
  }
  if (!user) {
     return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>جاري تحويلك لصفحة الدخول...</div>;
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>⚖️ سجل الجزاءات</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
            تسجيل جزاءات: {externalSchoolId ? displaySchoolName : 'الموظفين'}
          </p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الحالي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yearName || formData.YerID}</div>
        </div>
      </div>

      {/* Form Card */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#ea580c', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
          {isEditing ? '✏️ تعديل الجزاء' : '➕ تسجيل جزاء جديد'}
        </h3>
        <form onSubmit={(e) => handleSubmit(e, isEditing ? 2 : 1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {/* الموظف */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>الموظف</label>
            <select name="EmploeID" value={formData.EmploeID} onChange={handleChange} required style={inputStyle}>
              <option value="">اختر الموظف...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>

          {/* نوع الجزاء */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>نوع الجزاء</label>
            <select name="NoPalantID" value={formData.NoPalantID} onChange={handleChange} required style={inputStyle}>
              <option value="">اختر النوع...</option>
              {penaltyTypes.map(type => <option key={type['الرقم']} value={type['الرقم']}>{type['نوع الجزاء']}</option>)}
            </select>
          </div>

          {/* تاريخ الجزاء */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>تاريخ الجزاء</label>
            <input type="date" name="PalaentDAte" value={formData.PalaentDAte} onChange={handleChange} required style={inputStyle} />
          </div>

          {/* المدة */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>المدة (أيام/قيمة)</label>
            <input type="number" name="PalantModa" value={formData.PalantModa} onChange={handleChange} required style={inputStyle} placeholder="0" />
          </div>

          {/* سبب الجزاء */}
          <div style={{ ...inputGroupStyle, gridColumn: '1 / -1' }}>
            <label style={labelStyle}>سبب الجزاء</label>
            <textarea 
              name="PalanetSabb" 
              value={formData.PalanetSabb} 
              onChange={handleChange} 
              required 
              rows={3}
              style={{...inputStyle, resize: 'vertical'}} 
              placeholder="اكتب سبب الجزاء هنا..."
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', gridColumn: '1 / -1' }}>
            <button type="submit" disabled={loading} style={{ ...buttonStyle, background: loading ? '#94a3b8' : (isEditing ? '#eab308' : '#ea580c') }}>
              {loading ? 'جاري...' : (isEditing ? 'حفظ التعديل' : 'إضافة الجزاء')}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} style={{ ...buttonStyle, background: '#94a3b8' }}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <h3 style={{ margin: 0, color: '#ea580c', marginBottom: '20px' }}>📋 سجل الجزاءات</h3>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={thStyle}>الموظف</th>
                <th style={thStyle}>نوع الجزاء</th>
                <th style={thStyle}>تاريخ الجزاء</th>
                <th style={thStyle}>المدة/القيمة</th>
                <th style={thStyle}>السبب</th>
                <th style={thStyle}>الحالة</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {penalties.length > 0 ? penalties.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fff7ed' }}>
                  <td style={tdStyle}>{item['الموظف']}</td>
                  <td style={tdStyle}>{item['نوع الجزاء']}</td>
                  <td style={tdStyle}>{item['تاريخ الجزاء']?.split('T')[0]}</td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{item['مدة الجزاء']}</td>
                  <td style={{...tdStyle, maxWidth:'200px', whiteSpace:'pre-wrap'}}>{item['سبب الجزاء']}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                      background: item['حالة الجزاء'] === 'مؤكدة' ? '#fee2e2' : '#fef9c3',
                      color: item['حالة الجزاء'] === 'مؤكدة' ? '#991b1b' : '#854d0e'
                    }}>
                      {item['حالة الجزاء']}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                    <button onClick={() => startEdit(item)} style={{ ...buttonStyle, padding: '6px 12px', fontSize: '12px', background: '#facc15' }}>✏️ تعديل</button>
                    <button onClick={() => handleConfirm(item)} style={{ ...buttonStyle, padding: '6px 12px', fontSize: '12px', background: '#16a34a' }}>✅ تأكيد</button>
                    <button onClick={() => handleDelete(item)} style={{ ...buttonStyle, padding: '6px 12px', fontSize: '12px', background: '#dc2626' }}>🗑️ حذف</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>لا توجد بيانات حالياً</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// === 2. المكون الرئيسي (ال Wrapper مع Suspense) ===
export default function PenaltyPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>جاري التحميل...</div>}>
      <PenaltyContent />
    </Suspense>
  );
}