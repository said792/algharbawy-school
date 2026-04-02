'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === تعريف الأنواع ===
interface PermissionFormData {
  PermissionID: number;
  EmploeID: string;
  PermissionType: string;
  PermissionDate: string;
  StartTime: string;
  EndTime: string;
  PermissionDuration: string;
  PermissionStatus: string;
  YerID: number;
}

export default function UserPermissionRequestPage() {
  // جلب بيانات المستخدم والعمل الحالي
  const user = useAuthStore((state) => state.user);
  const work = useAuthStore((state) => state.work);

  // متغيرات مساعدة
  const employeeId = user?.personId?.toString() || '0';
  const employeeName = user?.personName || 'موظف';
  const yearId = work?.yearId || 1;
  const yearName = work?.yearName || '';

  const [formData, setFormData] = useState<PermissionFormData>({
    PermissionID: 0,
    EmploeID: employeeId,
    PermissionType: 'تأخير',
    PermissionDate: new Date().toISOString().split('T')[0],
    StartTime: '',
    EndTime: '',
    PermissionDuration: '0 دقيقة',
    PermissionStatus: 'قيد الانتظار',
    YerID: yearId,
  });

  const [permissions, setPermissions] = useState<any[]>([]);
  const [totalPermissions, setTotalPermissions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // === 1. تحديث البيانات الأساسية (الموظف والعام) ===
  useEffect(() => {
    if (employeeId && yearId) {
      setFormData(prev => ({
        ...prev,
        EmploeID: employeeId,
        YerID: yearId
      }));
    }
  }, [employeeId, yearId]);

  // === 2. جلب الرقم التالي للطلب ===
  useEffect(() => {
    const getNextId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/42`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const id = data.data[0][''] || Object.values(data.data[0])[0];
          setFormData(prev => ({ ...prev, PermissionID: Number(id) || 1 }));
        }
      } catch (err) { console.error(err); }
    };
    
    if (!isEditing) getNextId();
  }, [refresh, isEditing]);

  // === 3. جلب عدد الأذونات السابقة للموظف ===
  useEffect(() => {
    if (formData.EmploeID && formData.YerID && formData.PermissionType) {
      fetchTotalPermissions();
    }
  }, [formData.EmploeID, formData.YerID, formData.PermissionType]);

  const fetchTotalPermissions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/search/complex?sch1=${formData.EmploeID}&sch2=${formData.YerID}&sch3=${formData.PermissionType}&inpout=15`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const total = data.data[0]['اجمالى الاذون'] || data.data[0]['TotalPermissions'] || 0;
        setTotalPermissions(Number(total));
      } else {
        setTotalPermissions(0);
      }
    } catch (err) {
      console.error('خطأ في جلب عدد الأذونات:', err);
      setTotalPermissions(0);
    }
  };

  // === 4. جلب سجل الإذونات الخاص بالمستخدم ===
  useEffect(() => {
    if (!employeeId || !yearId) return;
    
    const fetchPermissions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${employeeId}&yearId=${yearId}&inpout=42`);
        const data = await res.json();
        if (data.success) setPermissions(data.data);
      } catch (err) { console.error(err); }
    };
    fetchPermissions();
  }, [employeeId, yearId, refresh]);

  // === دوال مساعدة ===
  
  // دالة تنسيق الوقت للعرض
  const formatDisplayTime = (timeVal: any) => {
    if (!timeVal) return '';
    if (typeof timeVal === 'string' && !timeVal.includes('T')) {
      return timeVal.substring(0, 5);
    }
    try {
      const date = new Date(timeVal);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (e) {
      return timeVal;
    }
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '0 دقيقة';
    
    const startDate = new Date(`1970-01-01T${start}`);
    const endDate = new Date(`1970-01-01T${end}`);
    
    if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins <= 0) return '0 دقيقة';

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    let result = '';
    if (hours > 0) result += `${hours} ساعة `;
    if (mins > 0) result += `${mins} دقيقة`;
    
    return result.trim() || '0 دقيقة';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'StartTime' || name === 'EndTime') {
        const newStart = name === 'StartTime' ? value : formData.StartTime;
        const newEnd = name === 'EndTime' ? value : formData.EndTime;
        const duration = calculateDuration(newStart, newEnd);
        setFormData(prev => ({ ...prev, [name]: value, PermissionDuration: duration }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // === دالة الحفظ ===
  const handleSubmit = async (e: React.FormEvent, operation: number) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        EmploeID: parseInt(formData.EmploeID),
        YerID: parseInt(formData.YerID.toString()),
        operation: operation 
      };

      const res = await fetch(`${API_URL}/api/permissions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(operation === 1 ? 'تم إرسال طلب الإذن بنجاح ✅' : 'تم تعديل الإذن بنجاح ✏️');
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

  // === حذف الإذن ===
  const handleDelete = async (item: any) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإذن؟')) return;
    try {      
      const res = await fetch(`${API_URL}/api/permissions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PermissionID: item['الرقم'],
          EmploeID: employeeId,
          YerID: yearId,
          operation: 3 
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('تم حذف الإذن 🗑️');
        setRefresh(prev => prev + 1);
      } else {
        alert('فشل الحذف: ' + data.error);
      }
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData({
      PermissionID: 0,
      EmploeID: employeeId,
      PermissionType: 'تأخير',
      PermissionDate: new Date().toISOString().split('T')[0],
      StartTime: '',
      EndTime: '',
      PermissionDuration: '0 دقيقة',
      PermissionStatus: 'قيد الانتظار',
      YerID: yearId,
    });
    setIsEditing(false);
    setRefresh(prev => prev + 1);
  };

  const startEdit = (item: any) => {
    setFormData({
      PermissionID: item['الرقم'],
      EmploeID: employeeId,
      PermissionType: item['نوع الاذن'],
      PermissionDate: item['تاريخ الاذن'] ? item['تاريخ الاذن'].split('T')[0] : '',
      StartTime: formatDisplayTime(item['بداية من']),
      EndTime: formatDisplayTime(item['الى']),
      PermissionDuration: item['مدة الاذن'],
      PermissionStatus: item['حالة الاذن'],
      YerID: yearId,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === Styles ===
  const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle = { background: 'linear-gradient(135deg, #10b981, #34d399)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
  const inputGroupStyle = { marginBottom: '15px' };
  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' };
  const inputStyleBase = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', transition: 'all 0.3s', outline: 'none', boxSizing: 'border-box' as const };
  const inputStyle = { ...inputStyleBase, background: '#fff' };
  const buttonStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(to right, #10b981, #34d399)', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.2s' };
  const thStyle = { background: '#f1f5f9', color: '#475569', fontWeight: '700', padding: '15px', textAlign: 'right' as const, borderBottom: '2px solid #e2e8f0' };
  const tdStyle = { padding: '15px', color: '#334155', fontSize: '14px' };

  return (
    <div style={containerStyle}>
      
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>⏱️ طلبات الإذونات</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>موظف: {employeeName}</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الحالي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yearName}</div>
        </div>
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#10b981', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
          {isEditing ? '✏️ تعديل الإذن' : '➕ تسجيل إذن جديد'}
        </h3>
        <form onSubmit={(e) => handleSubmit(e, isEditing ? 2 : 1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>الموظف</label>
            <input 
                type="text" 
                value={employeeName} 
                readOnly 
                style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>نوع الإذن</label>
            <select name="PermissionType" value={formData.PermissionType} onChange={handleChange} style={inputStyle}>
              <option value="تأخير">⏰ تأخير</option>
              <option value="خروج أثناء اليوم">🚪 خروج أثناء اليوم</option>
              <option value="خروج آخر اليوم">🏁 خروج آخر اليوم</option>
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>عدد الأذونات السابقة</label>
            <input 
                type="text" 
                value={totalPermissions} 
                readOnly 
                style={{ ...inputStyle, background: '#fef9c3', color: '#854d0e', fontWeight: 'bold', textAlign: 'center' }} 
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>تاريخ الإذن</label>
            <input type="date" name="PermissionDate" value={formData.PermissionDate} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>من الساعة</label>
            <input type="time" name="StartTime" value={formData.StartTime} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>إلى الساعة</label>
            <input type="time" name="EndTime" value={formData.EndTime} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>إجمالي المدة</label>
            <input type="text" value={formData.PermissionDuration} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b', fontWeight: 'bold' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ ...buttonStyle, background: loading ? '#94a3b8' : (isEditing ? '#eab308' : '#10b981') }}>
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
        <h3 style={{ margin: 0, color: '#10b981', marginBottom: '20px' }}>📋 سجل إذوناتي</h3>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={thStyle}>نوع الإذن</th>
                <th style={thStyle}>التاريخ</th>
                <th style={thStyle}>الفترة</th>
                <th style={thStyle}>المدة</th>
                <th style={thStyle}>الحالة</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {permissions.length > 0 ? permissions.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={tdStyle}>{item['نوع الاذن']}</td>
                  <td style={tdStyle}>{item['تاريخ الاذن'] ? item['تاريخ الاذن'].split('T')[0] : ''}</td>
                  <td style={tdStyle}>
                    {formatDisplayTime(item['بداية من'])} - {formatDisplayTime(item['الى'])}
                  </td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{item['مدة الاذن']}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                      background: item['حالة الاذن'] === 'مؤكدة' ? '#dcfce7' : '#fef9c3',
                      color: item['حالة الاذن'] === 'مؤكدة' ? '#166534' : '#854d0e'
                    }}>
                      {item['حالة الاذن']}
                    </span>
                  </td>
                  <td style={{...tdStyle, textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => startEdit(item)} 
                        style={{ background: '#eab308', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} 
                        title="تعديل">
                          ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(item)} 
                        style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} 
                        title="حذف">
                          🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا توجد طلبات إذونات سابقة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}