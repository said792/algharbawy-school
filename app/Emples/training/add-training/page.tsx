'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === تعريف الأنواع ===
interface TrainingFormData {
  TrainingID: number;
  EmploeID: string;
  TrainingName: string;
  TrainingPlaes: string;
  TrainingStartDate: string;
  TrainingEndDate: string;
  TrainingModa: number; // المدة بالأيام
  YerID: number;
}

export default function TrainingRequestPage() {
  const { user, work } = useAuthStore();

  const [formData, setFormData] = useState<TrainingFormData>({
    TrainingID: 0,
    EmploeID: '',
    TrainingName: '',
    TrainingPlaes: '',
    TrainingStartDate: new Date().toISOString().split('T')[0],
    TrainingEndDate: new Date().toISOString().split('T')[0],
    TrainingModa: 0,
    YerID: work?.yearId || 1,
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // === 1. جلب الموظفين ===
  useEffect(() => {
    if (!user?.schoolId) return;
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData1/14?id=${user.schoolId}`);
        const data = await res.json();
        if (data.success) setEmployees(data.data);
      } catch (err) { console.error(err); }
    };
    fetchEmployees();
  }, [user]);

  // === 2. جلب الرقم التالي (45) ===
  useEffect(() => {
    const getNextId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/45`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const id = data.data[0][''] || Object.values(data.data[0])[0];
          setFormData(prev => ({ ...prev, TrainingID: Number(id) || 1 }));
        }
      } catch (err) { console.error(err); }
    };
    
    if (!isEditing) getNextId();
  }, [refresh, isEditing]);

  // === 3. مزامنة العام ===
  useEffect(() => {
    if (work?.yearId) setFormData(prev => ({ ...prev, YerID: work.yearId ?? 1 }));
  }, [work]);

  // === 4. جلب سجل التدريبات ===
  useEffect(() => {
    if (!user?.schoolId || !formData.YerID) return;
    
    const fetchTrainings = async () => {
      try {
        // استخدام inpout=10
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${user.schoolId}&yearId=${formData.YerID}&inpout=10`);
        const data = await res.json();
        if (data.success) setTrainings(data.data);
      } catch (err) { console.error(err); }
    };
    fetchTrainings();
  }, [user, formData.YerID, refresh]);

  // === دوال مساعدة ===
  const getEmpIdByName = (name: string): number => {
    if (!name) return 0;
    const emp = employees.find(e => e.name === name);
    return emp ? emp.id : 0;
  };

  // حساب المدة بالأيام
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 ليوم البداية
    return diffDays > 0 ? diffDays : 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'TrainingStartDate' || name === 'TrainingEndDate') {
        const newStart = name === 'TrainingStartDate' ? value : formData.TrainingStartDate;
        const newEnd = name === 'TrainingEndDate' ? value : formData.TrainingEndDate;
        const duration = calculateDuration(newStart, newEnd);
        setFormData(prev => ({ ...prev, [name]: value, TrainingModa: duration }));
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

      const res = await fetch(`${API_URL}/api/training/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(operation === 1 ? 'تم إضافة التدريب بنجاح ✅' : 'تم تعديل التدريب بنجاح ✏️');
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

  // === حذف التدريب ===
  const handleDelete = async (item: any) => {
    if (!confirm('هل أنت متأكد من حذف هذا التدريب؟')) return;
    try {
      const empId = item.EmploeID || getEmpIdByName(item['الموظف']);
      
      const res = await fetch(`${API_URL}/api/training/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TrainingID: item['الرقم'],
          EmploeID: empId,
          YerID: formData.YerID,
          // باقي الحقول غير مهمة في الحذف لكن يجب إرسالها إذا كان الإجراء يطلبها
          TrainingStartDate: '1900-01-01',
          TrainingEndDate: '1900-01-01',
          TrainingModa: 0,
          operation: 3 
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('تم حذف التدريب 🗑️');
        setRefresh(prev => prev + 1);
      } else {
        alert('فشل الحذف: ' + data.error);
      }
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData({
      TrainingID: 0,
      EmploeID: '',
      TrainingName: '',
      TrainingPlaes: '',
      TrainingStartDate: new Date().toISOString().split('T')[0],
      TrainingEndDate: new Date().toISOString().split('T')[0],
      TrainingModa: 0,
      YerID: work?.yearId || 1,
    });
    setIsEditing(false);
    setRefresh(prev => prev + 1);
  };

  const startEdit = (item: any) => {
    const empName = item['الموظف'];
    const empId = getEmpIdByName(empName);

    setFormData({
      TrainingID: item['الرقم'],
      EmploeID: empId.toString(),
      TrainingName: item['اسم التدريب'] || item['TrainingName'],
      TrainingPlaes: item['مكان التدريب'] || item['TrainingPlaes'],
      TrainingStartDate: item['بداية التدريب'] ? item['بداية التدريب'].split('T')[0] : '',
      TrainingEndDate: item['نهاية التدريب'] ? item['نهاية التدريب'].split('T')[0] : '',
      TrainingModa: item['مدة التدريب'] || 0,
      YerID: formData.YerID,
    });
    setIsEditing(true);
  };

  // === Styles ===
  const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle = { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
  const inputGroupStyle = { marginBottom: '15px' };
  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' };
  const inputStyleBase = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', transition: 'all 0.3s', outline: 'none', boxSizing: 'border-box' as const };
  const inputStyle = { ...inputStyleBase, background: '#fff' };
  const buttonStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(to right, #6366f1, #8b5cf6)', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.2s' };
  const thStyle = { background: '#f1f5f9', color: '#475569', fontWeight: '700', padding: '15px', textAlign: 'right' as const, borderBottom: '2px solid #e2e8f0' };
  const tdStyle = { padding: '15px', color: '#334155', fontSize: '14px' };

  return (
    <div style={containerStyle}>
      
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🎓 سجل التدريبات</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>إدارة دورات وتدريبات الموظفين</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الحالي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{work?.yearName || formData.YerID}</div>
        </div>
      </div>

      {/* Form */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#6366f1', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
          {isEditing ? '✏️ تعديل التدريب' : '➕ تسجيل تدريب جديد'}
        </h3>
        <form onSubmit={(e) => handleSubmit(e, isEditing ? 2 : 1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
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
            <label style={labelStyle}>اسم التدريب</label>
            <input type="text" name="TrainingName" value={formData.TrainingName} onChange={handleChange} required style={inputStyle} placeholder="مثال: دورة الحاسب الآلي" />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>مكان التدريب</label>
            <input type="text" name="TrainingPlaes" value={formData.TrainingPlaes} onChange={handleChange} required style={inputStyle} placeholder="مثال: وزارة التربية والتعليم" />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>تاريخ البداية</label>
            <input type="date" name="TrainingStartDate" value={formData.TrainingStartDate} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>تاريخ النهاية</label>
            <input type="date" name="TrainingEndDate" value={formData.TrainingEndDate} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>المدة (أيام)</label>
            <input type="number" value={formData.TrainingModa} readOnly style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b', fontWeight: 'bold' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ ...buttonStyle, background: loading ? '#94a3b8' : (isEditing ? '#eab308' : '#6366f1') }}>
              {loading ? 'جاري...' : (isEditing ? 'حفظ التعديل' : 'إضافة التدريب')}
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
        <h3 style={{ margin: 0, color: '#6366f1', marginBottom: '20px' }}>📋 سجل التدريبات</h3>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={thStyle}>الموظف</th>
                <th style={thStyle}>اسم التدريب</th>
                <th style={thStyle}>المكان</th>
                <th style={thStyle}>الفترة</th>
                <th style={thStyle}>المدة</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {trainings.length > 0 ? trainings.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={tdStyle}>{item['الموظف']}</td>
                  <td style={tdStyle}>{item['اسم التدريب']}</td>
                  <td style={tdStyle}>{item['مكان التدريب']}</td>
                  <td style={tdStyle}>
                    {item['بداية التدريب']?.split('T')[0]} <br/>
                    <span style={{fontSize:'12px', color:'#64748b'}}>إلى</span> <br/>
                    {item['نهاية التدريب']?.split('T')[0]}
                  </td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{item['مدة التدريب']} يوم</td>
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
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا توجد تدريبات مسجلة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}