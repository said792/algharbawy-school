'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

// === Types ===
// نستخدم الأسماء الإنجليزية في الكود البرمجي، ولكن سنقوم بربطها بالأسماء العربية القادمة من الـ API
interface Period {
  PeriodID: number;
  PeriodName: string;
  StartTime: string;
  EndTime: string;
}

export default function PeriodsListPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: '', startTime: '', endTime: '' });

  // 1. جلب البيانات باستخدام INPOT = 78
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData/78`);
      const data = await res.json();
      
      if (data.data && Array.isArray(data.data)) {
        // نقوم بتحويل المفاتيح العربية القادمة من الـ SQL إلى المفاتيح الإنجليزية لاستخدامها في الكود
        const mappedData = data.data.map((item: any) => ({
          PeriodID: item["الرقم"],
          PeriodName: item["الحصة"],
          StartTime: item["بداية الحصة"],
          EndTime: item["نهاية الحصة"]
        }));
        setPeriods(mappedData);
      }
    } catch (err) {
      console.log(err);
      alert('فشل تحميل البيانات');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. جلب الرقم التالي باستخدام INPOT = 77
  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/77`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        // القيمة قد تكون بدون اسم عمود (Unnamed column) في الـ SQL
        return Number(Object.values(data.data[0])[0]) || 1;
      }
      return 1;
    } catch {
      return 1;
    }
  };

  const openAddModal = async () => {
    const nextId = await getNextId(); // جلب الرقم الجديد
    setFormData({ id: nextId, name: '', startTime: '', endTime: '' });
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Period) => {
    setFormData({
      id: p.PeriodID,
      name: p.PeriodName,
      startTime: p.StartTime?.substring(0, 5) || '',
      endTime: p.EndTime?.substring(0, 5) || ''
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openDeleteModal = (p: Period) => {
    setFormData({
      id: p.PeriodID,
      name: p.PeriodName,
      startTime: '',
      endTime: ''
    });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (modalMode !== 'delete') {
      if (!formData.name) {
        alert('يرجى إدخال اسم الحصة');
        return;
      }
      if (formData.endTime <= formData.startTime) {
        alert('وقت النهاية لازم يكون بعد وقت البداية');
        return;
      }
    }

    // ملاحظة: تأكد من أن أرقام العمليات (1, 2, 3) صحيحة في السيرفر الخاص بك
    let operation = 1; // Add
    if (modalMode === 'edit') operation = 2;
    if (modalMode === 'delete') operation = 3;

    try {
      const res = await fetch(`${API_URL}/api/period`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          startTime: formData.startTime + ':00',
          endTime: formData.endTime + ':00',
          inpot: operation
        })
      });

      const result = await res.json();
      if (result.success) {
        alert(modalMode === 'delete' ? 'تم الحذف' : 'تم الحفظ بنجاح');
        setIsModalOpen(false);
        fetchData();
      } else {
        alert(result.message || 'فشلت العملية');
      }
    } catch (err) {
      console.log(err);
      alert('حدث خطأ');
    }
  };

  const formatTime = (t: string) => t?.substring(0, 5);

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ color: 'white', margin: 0 }}>جدول الحصص</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            إدارة الفترات الزمنية (الحصص)
          </p>
        </div>
        <button style={addBtnStyle} onClick={openAddModal}>
          إضافة حصة
        </button>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            جاري التحميل...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>الرقم</th>
                <th style={thStyle}>الحصة</th>
                <th style={thStyle}>الوقت</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                periods.map((p, index) => (
                  <tr key={p.PeriodID || index}>
                    <td style={tdStyle}>{p.PeriodID}</td>
                    <td style={tdStyle}>{p.PeriodName}</td>
                    <td style={tdStyle}>
                      {formatTime(p.StartTime)} - {formatTime(p.EndTime)}
                    </td>
                    <td style={tdStyle}>
                      <button style={editBtnStyle} onClick={() => openEditModal(p)}>
                        تعديل
                      </button>
                      <button style={deleteBtnStyle} onClick={() => openDeleteModal(p)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={overlayStyle} onClick={() => setIsModalOpen(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20 }}>
              {modalMode === 'add' && 'إضافة حصة جديدة'}
              {modalMode === 'edit' && 'تعديل الحصة'}
              {modalMode === 'delete' && 'حذف الحصة'}
            </h3>

            {modalMode !== 'delete' ? (
              <>
                <input 
                  value={formData.id} 
                  readOnly 
                  disabled 
                  placeholder="الرقم (تلقائي)" 
                  style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} 
                />
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="اسم الحصة"
                  style={inputStyle}
                />
                
                <div style={{ display: 'flex', gap: '10px' }}>
                   <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </>
            ) : (
              <p style={{ marginBottom: 20 }}>
                هل أنت متأكد من حذف الحصة "{formData.name}" ؟
              </p>
            )}

            <div style={modalActionsStyle}>
              <button
                style={cancelBtnStyle}
                onClick={() => setIsModalOpen(false)}
              >
                إلغاء
              </button>

              <button
                style={
                  modalMode === 'delete'
                    ? deleteConfirmBtnStyle
                    : saveBtnStyle
                }
                onClick={handleSubmit}
              >
                {modalMode === 'delete' ? 'حذف' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Styles ===== */

const headerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
};

const addBtnStyle: React.CSSProperties = {
  background: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 600
};

const editBtnStyle: React.CSSProperties = {
  marginRight: 8,
  background: '#eff6ff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 8,
  cursor: 'pointer'
};

const deleteBtnStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 8,
  cursor: 'pointer'
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  padding: 24,
  borderRadius: 16,
  width: 400
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  marginBottom: 12,
  borderRadius: 8,
  border: '1px solid #ccc'
};

const modalActionsStyle: React.CSSProperties = {
  marginTop: 20,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#f1f5f9',
  color: '#475569',
  border: 'none',
  borderRadius: 10,
  fontWeight: 600,
  cursor: 'pointer'
};

const saveBtnStyle: React.CSSProperties = {
  padding: '10px 22px',
  background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(20,184,166,0.3)'
};

const deleteConfirmBtnStyle: React.CSSProperties = {
  padding: '10px 22px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(220,38,38,0.3)'
};

const thStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #e5e7eb'
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  textAlign: 'center'
};