'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

type NoPalant = { الرقم: number; "نوع الجزاء": string };

export default function NoPalantPage() {
  const [items, setItems] = useState<NoPalant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: '' });

  // جلب البيانات
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData/50`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // جلب الرقم الجديد
  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/49`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        return Number(Object.values(data.data[0])[0]) || 1;
      }
      return 1;
    } catch {
      if (items.length > 0) {
        return Math.max(...items.map(item => item['الرقم'])) + 1;
      }
      return 1;
    }
  };

  const openAddModal = async () => {
    const nextId = await getNextId();
    setFormData({ id: nextId, name: '' });
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (item: NoPalant) => {
    setFormData({ id: item['الرقم'], name: item['نوع الجزاء'] });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: NoPalant) => {
    setFormData({ id: item['الرقم'], name: item['نوع الجزاء'] });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name && modalMode !== 'delete') {
      alert('يرجى إدخال نوع الجزاء');
      return;
    }

    let operation = 30;
    if (modalMode === 'edit') operation = 31;
    if (modalMode === 'delete') operation = 32;

    try {
      await fetch(`${API_URL}/api/moderia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          operation
        })
      });

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.log(err);
      alert('حدث خطأ');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ color: 'white', margin: 0 }}>أنواع الجزاءات</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            إدارة أنواع الجزاءات
          </p>
        </div>
        <button style={addBtnStyle} onClick={openAddModal}>
          إضافة نوع جزاء
        </button>
      </div>

      {/* Table */}
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
                <th style={thStyle}>نوع الجزاء</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: 40 }}>
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item['الرقم']}>
                    <td style={tdStyle}>{item['الرقم']}</td>
                    <td style={tdStyle}>{item['نوع الجزاء']}</td>
                    <td style={tdStyle}>
                      <button style={editBtnStyle} onClick={() => openEditModal(item)}>
                        تعديل
                      </button>
                      <button style={deleteBtnStyle} onClick={() => openDeleteModal(item)}>
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
              {modalMode === 'add' && 'إضافة نوع جزاء'}
              {modalMode === 'edit' && 'تعديل نوع الجزاء'}
              {modalMode === 'delete' && 'حذف نوع الجزاء'}
            </h3>

            {modalMode !== 'delete' ? (
              <>
                <input value={formData.id} readOnly style={inputStyle} />
                <input
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="اكتب نوع الجزاء"
                  style={inputStyle}
                />
              </>
            ) : (
              <p style={{ marginBottom: 20 }}>
                هل أنت متأكد من حذف {formData.name} ؟
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