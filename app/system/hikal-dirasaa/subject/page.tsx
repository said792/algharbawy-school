'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

type Subject = { الرقم: number; المادة: string };

export default function SubjectPage() {
  const [items, setItems] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: '' });

  // جلب البيانات
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData/35`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.log('خطأ:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // جلب الرقم الجديد
  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/36`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const row = data.data[0];
        const id = row[''] || row['الرقم'] || Object.values(row)[0];
        return Number(id) || 1;
      }
      return 1;
    } catch (err) {
      if (items.length > 0) {
        return Math.max(...items.map(item => item['الرقم'] || 0)) + 1;
      }
      return 1;
    }
  };

  // فتح نافذة الإضافة
  const openAddModal = async () => {
    const nextId = await getNextId();
    setFormData({ id: nextId, name: '' });
    setModalMode('add');
    setIsModalOpen(true);
  };

  // فتح نافذة التعديل
  const openEditModal = (item: Subject) => {
    setFormData({ id: item['الرقم'], name: item['المادة'] });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // فتح نافذة الحذف
  const openDeleteModal = (item: Subject) => {
    setFormData({ id: item['الرقم'], name: item['المادة'] });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  // حفظ العملية مع التحقق من التكرار
  const handleSubmit = async () => {
    if (!formData.name && modalMode !== 'delete') {
      alert('يرجى إدخال اسم المادة');
      return;
    }

    // التحقق من التكرار
    if (modalMode === 'add' || modalMode === 'edit') {
      const duplicate = items.find(item => {
        const isSameName = item['المادة']?.trim() === formData.name.trim();
        const isCurrentRecord = item['الرقم'] === formData.id;
        return isSameName && !isCurrentRecord;
      });

      if (duplicate) {
        alert('هذه المادة موجودة بالفعل!');
        return;
      }
    }

    let operation = 27; // إضافة
    if (modalMode === 'edit') operation = 28; // تعديل
    if (modalMode === 'delete') operation = 29; // حذف

    try {
      const res = await fetch(`${API_URL}/api/moderia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          operation: operation
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchData();
        alert(modalMode === 'add' ? 'تمت الإضافة بنجاح' : modalMode === 'edit' ? 'تم التعديل بنجاح' : 'تم الحذف بنجاح');
      }
    } catch (err) {
      console.log(err);
      alert('حدث خطأ');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 40px rgba(249, 115, 22, 0.3)'
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
            <i className="fa-solid fa-book" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>المواد الدراسية</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>إدارة المواد الدراسية</p>
          </div>
        </div>
        <button 
          onClick={openAddModal}
          style={{
            background: 'white',
            color: '#ea580c',
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
          إضافة مادة
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
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#f97316' }}></i>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>الرقم</th>
                <th style={thStyle}>المادة</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    لا توجد مواد
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <span style={{
                        background: '#ffedd5',
                        color: '#c2410c',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        {item['الرقم']}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>{item['المادة']}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => openEditModal(item)} style={editBtnStyle}>
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button onClick={() => openDeleteModal(item)} style={deleteBtnStyle}>
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
            
            <div style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              padding: '24px',
              borderRadius: '20px 20px 0 0'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                {modalMode === 'add' && 'إضافة مادة جديدة'}
                {modalMode === 'edit' && 'تعديل المادة'}
                {modalMode === 'delete' && 'حذف المادة'}
              </h3>
            </div>

            {modalMode === 'delete' ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{
                  width: '80px', height: '80px', background: '#fef2f2', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
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
                  <input style={{ ...inputStyle, background: '#f8fafc' }} value={formData.id} readOnly />
                </div>

                <div className="form-group">
                  <label style={labelStyle}>اسم المادة</label>
                  <input style={inputStyle} value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: الرياضيات، اللغة العربية..." />
                </div>
              </div>
            )}

            <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button style={cancelBtnStyle} onClick={() => setIsModalOpen(false)}>إلغاء</button>
              <button onClick={handleSubmit} style={modalMode === 'delete' ? deleteConfirmBtnStyle : saveBtnStyle}>
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
const thStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: '#64748b', fontSize: '14px', borderBottom: '2px solid #e2e8f0' };
const tdStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'center', color: '#475569', fontSize: '14px' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none' };
const editBtnStyle: React.CSSProperties = { background: '#eff6ff', color: '#2563eb', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const deleteBtnStyle: React.CSSProperties = { background: '#fef2f2', color: '#dc2626', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { background: 'white', borderRadius: '20px', width: '420px', maxWidth: '90%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' };
const cancelBtnStyle: React.CSSProperties = { padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' };
const saveBtnStyle: React.CSSProperties = { padding: '12px 24px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' };
const deleteConfirmBtnStyle: React.CSSProperties = { padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' };