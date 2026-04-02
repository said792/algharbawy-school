'use client';
import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore'; // تأكد من صحة المسار

type Stage = { 
  الرقم: number; 
  المدرسة: string; 
  المرحلة: string;
};

export default function StagePage() {
  // جلب بيانات المستخدم من الـ Store
  const { user } = useAuthStore();
  
  // تعريف الـ schoolId
  const schoolId = user?.schoolId;

  const [items, setItems] = useState<Stage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    moderiaId: 0,
    edaraId: 0,
    schoolId: 0,
    name: ''
  });

  // جلب المراحل فقط
  const fetchData = async () => {
    // شرط لمنع الاستدعاء إذا لم يكن المعرف موجوداً
    if (!schoolId) return; 
    
    setLoading(true);
    try {
      // استخدام endpoint الصحيح مع المعرف
      const res = await fetch(`${API_URL}/api/getData1/2?id=${schoolId}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  // جلب الرقم الجديد
  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/12`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const row = data.data[0];
        const id = row[''] || Object.values(row)[0];
        return Number(id) || 1;
      }
      return 1;
    } catch (err) {
      return items.length > 0 ? Math.max(...items.map(i => i['الرقم'])) + 1 : 1;
    }
  };

  // التعديل هنا: إضافة schoolId للمصفوفة لضمان إعادة الجلب عند توفر البيانات
  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]); 

  // فتح نافذة الإضافة
  const openAddModal = async () => {
    const nextId = await getNextId();
    setFormData({ 
      id: nextId, 
      moderiaId: user?.modriaId || 0, 
      edaraId: user?.edaraId || 0, 
      schoolId: user?.schoolId || 0, 
      name: '' 
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  // فتح نافذة التعديل
  const openEditModal = (item: Stage) => {
    setFormData({
      id: item['الرقم'],
      moderiaId: user?.modriaId || 0,
      edaraId: user?.edaraId || 0,
      schoolId: user?.schoolId || 0,
      name: item['المرحلة']
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // فتح نافذة الحذف
  const openDeleteModal = (item: Stage) => {
    setFormData({
      id: item['الرقم'],
      moderiaId: user?.modriaId || 0,
      edaraId: user?.edaraId || 0,
      schoolId: user?.schoolId || 0,
      name: item['المرحلة']
    });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  // حفظ العملية
  const handleSubmit = async () => {
    if (!formData.name && modalMode !== 'delete') {
      alert('يرجى إدخال اسم المرحلة');
      return;
    }
    if (!formData.schoolId && modalMode !== 'delete') {
      alert('لا توجد مدرسة محددة في بيانات المستخدم');
      return;
    }

    const operation = modalMode === 'add' ? 4 : modalMode === 'edit' ? 5 : 6;

    try {
      const res = await fetch(`${API_URL}/api/saveWithParent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          parentId: formData.schoolId,
          name: formData.name,
          operation: operation
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchData(); // إعادة جلب البيانات
        alert(modalMode === 'add' ? 'تمت الإضافة' : modalMode === 'edit' ? 'تم التعديل' : 'تم الحذف');
      } else {
        alert('حدث خطأ: ' + (data.error || ''));
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
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3)'
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
            <i className="fa-solid fa-stairs" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>المراحل</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>إدارة مراحل الدراسة</p>
          </div>
        </div>
        <button 
          onClick={openAddModal}
          style={{
            background: 'white',
            color: '#d97706',
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
          إضافة مرحلة
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#fef3c7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-layer-group" style={{ fontSize: '20px', color: '#d97706' }}></i>
            </div>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>إجمالي المراحل</p>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{items.length}</h3>
            </div>
          </div>
        </div>
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
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#f59e0b' }}></i>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>الرقم</th>
                <th style={thStyle}>المرحلة</th>
                <th style={thStyle}>المدرسة</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    {!schoolId ? 'جاري تحميل بيانات المدرسة...' : 'لا توجد مراحل'}
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <span style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        {item['الرقم']}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>{item['المرحلة']}</td>
                    <td style={tdStyle}>{item['المدرسة']}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => openEditModal(item)}
                          style={{
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
                          }}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button 
                          onClick={() => openDeleteModal(item)}
                          style={{
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
                          }}
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setIsModalOpen(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '24px',
              borderRadius: '20px 20px 0 0'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                {modalMode === 'add' && 'إضافة مرحلة جديدة'}
                {modalMode === 'edit' && 'تعديل المرحلة'}
                {modalMode === 'delete' && 'حذف المرحلة'}
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

                {/* عرض المدرسة من بيانات المستخدم */}
                <div className="form-group">
                  <label style={labelStyle}>المدرسة</label>
                  <input 
                    style={{ ...inputStyle, background: '#f8fafc' }} 
                    value={user?.schoolName || 'غير محدد'} 
                    readOnly 
                  />
                  <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    يتم إضافة المرحلة للمدرسة التابعة لحسابك
                  </small>
                </div>

                {/* اسم المرحلة */}
                <div className="form-group">
                  <label style={labelStyle}>اسم المرحلة</label>
                  <input 
                    style={inputStyle} 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: المرحلة الابتدائية..."
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
              <button 
                style={{
                  padding: '12px 24px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onClick={() => setIsModalOpen(false)}
              >
                إلغاء
              </button>
              <button 
                onClick={handleSubmit}
                style={{
                  padding: '12px 24px',
                  background: modalMode === 'delete' ? '#dc2626' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
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
  transition: 'all 0.2s ease',
  outline: 'none'
};