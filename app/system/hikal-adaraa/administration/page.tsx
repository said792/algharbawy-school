'use client';
import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';

type Edara = { الرقم: number; المديرية: string; الادارة: string };
type Moderia = { الرقم: number; المديرية: string };

export default function EdaraPage() {
  const [items, setItems] = useState<Edara[]>([]);
  const [moderiat, setModeriat] = useState<Moderia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: '', parentId: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData/3`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const fetchModeriat = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/1`);
      const data = await res.json();
      setModeriat(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/4`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const row = data.data[0];
        const id = row[''] || row['الرقم'] || Object.values(row)[0];
        return Number(id) || 1;
      }
      return 1;
    } catch (err) {
      return items.length > 0 ? Math.max(...items.map(i => i['الرقم'])) + 1 : 1;
    }
  };

  useEffect(() => {
    fetchData();
    fetchModeriat();
  }, []);

  const openAddModal = async () => {
    const nextId = await getNextId();
    setFormData({ id: nextId, name: '', parentId: 0 });
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Edara) => {
    const moderia = moderiat.find(m => m['المديرية'] === item['المديرية']);
    setFormData({
      id: item['الرقم'],
      name: item['الادارة'],
      parentId: moderia?.['الرقم'] || 0
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: Edara) => {
    const moderia = moderiat.find(m => m['المديرية'] === item['المديرية']);
    setFormData({
      id: item['الرقم'],
      name: item['الادارة'],
      parentId: moderia?.['الرقم'] || 0
    });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  // حفظ العملية مع التحقق من التكرار
  const handleSubmit = async () => {
    if (!formData.name && modalMode !== 'delete') {
      alert('يرجى إدخال اسم الإدارة');
      return;
    }
    if (!formData.parentId && modalMode !== 'delete') {
      alert('يرجى اختيار المديرية');
      return;
    }

    // التحقق من التكرار - نفس الإدارة في نفس المديرية
    if (modalMode === 'add' || modalMode === 'edit') {
      const selectedModeria = moderiat.find(m => m['الرقم'] === formData.parentId);

      const duplicate = items.find(item => {
        const isSameModeria = item['المديرية'] === selectedModeria?.['المديرية'];
        const isSameName = item['الادارة']?.trim() === formData.name.trim();
        const isCurrentRecord = item['الرقم'] === formData.id;

        return isSameModeria && isSameName && !isCurrentRecord;
      });

      if (duplicate) {
        alert('هذه الإدارة موجودة بالفعل في هذه المديرية!');
        return;
      }
    }

    const operation = modalMode === 'add' ? 1 : modalMode === 'edit' ? 2 : 3;

    try {
      const res = await fetch(`${API_URL}/api/saveWithParent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          parentId: formData.parentId,
          name: formData.name,
          operation: operation
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchData();
        alert(modalMode === 'add' ? 'تمت الإضافة' : modalMode === 'edit' ? 'تم التعديل' : 'تم الحذف');
      }
    } catch (err) {
      alert('حدث خطأ');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fa-solid fa-landmark" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>الإدارات</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>إدارة الإدارات التعليمية</p>
          </div>
        </div>
        <button 
          onClick={openAddModal}
          style={{
            background: 'white',
            color: '#4f46e5',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}
        >
          <i className="fa-solid fa-plus"></i>
          إضافة إدارة
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#6366f1' }}></i>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>الرقم</th>
                <th style={thStyle}>الإدارة</th>
                <th style={thStyle}>المديرية</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    لا توجد إدارات
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <span style={{
                        background: '#e0e7ff',
                        color: '#3730a3',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        {item['الرقم']}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>{item['الادارة']}</td>
                    <td style={tdStyle}>{item['المديرية']}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => openEditModal(item)}
                          style={editBtnStyle}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button 
                          onClick={() => openDeleteModal(item)}
                          style={deleteBtnStyle}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
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
        <div style={modalOverlayStyle} onClick={() => setIsModalOpen(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              padding: '24px',
              borderRadius: '20px 20px 0 0'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                {modalMode === 'add' && 'إضافة إدارة جديدة'}
                {modalMode === 'edit' && 'تعديل الإدارة'}
                {modalMode === 'delete' && 'حذف الإدارة'}
              </h3>
            </div>

            {modalMode === 'delete' ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: '#fef2f2',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <i className="fa-solid fa-trash" style={{ fontSize: '32px', color: '#dc2626' }}></i>
                </div>
                <p style={{ color: '#64748b', marginBottom: '8px' }}>هل أنت متأكد من حذف</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{formData.name}؟</p>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                <div className="form-group">
                  <label style={labelStyle}>الرقم</label>
                  <input 
                    style={{ ...inputStyle, background: '#f8fafc' }} 
                    value={formData.id} 
                    readOnly 
                  />
                </div>

                <div className="form-group">
                  <label style={labelStyle}>المديرية</label>
                  <select 
                    style={inputStyle} 
                    value={formData.parentId}
                    onChange={e => setFormData({ ...formData, parentId: Number(e.target.value) })}
                  >
                    <option value={0}>اختر المديرية...</option>
                    {moderiat.map((m, i) => (
                      <option key={i} value={m['الرقم']}>{m['المديرية']}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={labelStyle}>اسم الإدارة</label>
                  <input 
                    style={inputStyle} 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسم الإدارة..."
                  />
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button style={cancelBtnStyle} onClick={() => setIsModalOpen(false)}>إلغاء</button>
              <button 
                onClick={handleSubmit}
                style={modalMode === 'delete' ? deleteConfirmBtnStyle : saveBtnStyle}
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

// Styles
const thStyle: React.CSSProperties = {
  padding: '16px 20px',
  textAlign: 'right',
  fontWeight: '600',
  color: '#64748b',
  fontSize: '14px',
  borderBottom: '2px solid #e2e8f0'
};

const tdStyle: React.CSSProperties = {
  padding: '16px 20px',
  textAlign: 'center',
  color: '#475569',
  fontSize: '14px'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: '600',
  color: '#374151',
  fontSize: '14px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '2px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '15px',
  outline: 'none'
};

const editBtnStyle: React.CSSProperties = {
  background: '#eff6ff',
  color: '#2563eb',
  border: 'none',
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const deleteBtnStyle: React.CSSProperties = {
  background: '#fef2f2',
  color: '#dc2626',
  border: 'none',
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '20px',
  width: '450px',
  maxWidth: '90%',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#f1f5f9',
  color: '#475569',
  border: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '500',
  cursor: 'pointer'
};

const saveBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer'
};

const deleteConfirmBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer'
};