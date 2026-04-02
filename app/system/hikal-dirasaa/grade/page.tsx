'use client';
import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';  // استدعاء الـ Store

type Grade = { 
  الرقم: number; 
  المدرسة: string; 
  المرحلة: string;
  "الصف الدراسى": string;
};
type Stage = { الرقم: number; المرحلة: string; المدرسة?: string };

export default function GradePage() {
  // جلب بيانات المستخدم من الـ Store
  const { user } = useAuthStore();
  
  // تعريف الـ schoolId
  const schoolId = user?.schoolId;

  const [items, setItems] = useState<Grade[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    moderiaId: 0,
    edaraId: 0,
    schoolId: 0,
    stageId: 0,
    name: ''
  });

  // جلب الصفوف
  const fetchData = async () => {
    // شرط لمنع الاستدعاء إذا لم يكن المعرف موجوداً
    if (!schoolId) return;

    setLoading(true);
    try {
      // استخدام Endpoint رقم 4 مع تمرير الـ ID
      const res = await fetch(`${API_URL}/api/getData1/4?id=${schoolId}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  // جلب المراحل فقط (للقائمة المنسدلة)
  const fetchStages = async () => {
    try {
      // جلب جميع المراحل ثم سنقوم بفلترتها محلياً
      const res = await fetch(`${API_URL}/api/getData/11`);
      const data = await res.json();
      setStages(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  // جلب الرقم الجديد
  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/16`);
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
      fetchStages();
    }
  }, [schoolId]); 

  // فلترة المراحل حسب المدرسة المخزنة في الـ Store
  const filteredStages = stages.filter(s => s['المدرسة'] === user?.schoolName);

  // فتح نافذة الإضافة (استخدام بيانات المستخدم من الـ Store)
  const openAddModal = async () => {
    const nextId = await getNextId();
    setFormData({ 
      id: nextId, 
      moderiaId: user?.modriaId || 0, 
      edaraId: user?.edaraId || 0, 
      schoolId: user?.schoolId || 0, 
      stageId: 0, 
      name: '' 
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  // فتح نافذة التعديل
  const openEditModal = (item: Grade) => {
    // البحث عن المرحلة بناءً على الاسم والمدرسة
    const stage = stages.find(s => s['المرحلة'] === item['المرحلة'] && s['المدرسة'] === user?.schoolName);
    
    setFormData({
      id: item['الرقم'],
      moderiaId: user?.modriaId || 0,
      edaraId: user?.edaraId || 0,
      schoolId: user?.schoolId || 0,
      stageId: stage?.['الرقم'] || 0,
      name: item['الصف الدراسى']
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // فتح نافذة الحذف
  const openDeleteModal = (item: Grade) => {
    const stage = stages.find(s => s['المرحلة'] === item['المرحلة']);
    
    setFormData({
      id: item['الرقم'],
      moderiaId: user?.modriaId || 0,
      edaraId: user?.edaraId || 0,
      schoolId: user?.schoolId || 0,
      stageId: stage?.['الرقم'] || 0,
      name: item['الصف الدراسى']
    });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  // حفظ العملية
  const handleSubmit = async () => {
    if (!formData.name && modalMode !== 'delete') {
      alert('يرجى إدخال اسم الصف');
      return;
    }
    if (!formData.stageId && modalMode !== 'delete') {
      alert('يرجى اختيار المرحلة');
      return;
    }

    // التحقق من التكرار
    if (modalMode === 'add' || modalMode === 'edit') {
      const selectedStage = stages.find(st => st['الرقم'] === formData.stageId);

      const duplicate = items.find(item => {
        const isSameSchool = item['المدرسة'] === user?.schoolName; // مقارنة بمدرسة المستخدم
        const isSameStage = item['المرحلة'] === selectedStage?.['المرحلة'];
        const isSameName = item['الصف الدراسى']?.trim() === formData.name.trim();
        const isCurrentRecord = item['الرقم'] === formData.id;

        return isSameSchool && isSameStage && isSameName && !isCurrentRecord;
      });

      if (duplicate) {
        alert('هذا الصف موجود بالفعل في هذه المرحلة في هذه المدرسة!');
        return;
      }
    }

    const operation = modalMode === 'add' ? 1 : modalMode === 'edit' ? 2 : 3;

    try {
      const res = await fetch(`${API_URL}/api/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          schoolId: formData.schoolId, // يأتي من الـ Store
          stageId: formData.stageId,
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
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)'
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
            <i className="fa-solid fa-graduation-cap" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>الصفوف الدراسية</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>إدارة الصفوف الدراسية</p>
          </div>
        </div>
        <button 
          onClick={openAddModal}
          style={{
            background: 'white',
            color: '#059669',
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
          إضافة صف
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
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#10b981' }}></i>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>الرقم</th>
                <th style={thStyle}>الصف الدراسي</th>
                <th style={thStyle}>المرحلة</th>
                <th style={thStyle}>المدرسة</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    {!schoolId ? 'جاري تحميل بيانات المدرسة...' : 'لا توجد صفوف'}
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <span style={{
                        background: '#d1fae5',
                        color: '#065f46',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        {item['الرقم']}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>{item['الصف الدراسى']}</td>
                    <td style={tdStyle}>{item['المرحلة']}</td>
                    <td style={tdStyle}>{item['المدرسة']}</td>
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '24px',
              borderRadius: '20px 20px 0 0'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                {modalMode === 'add' && 'إضافة صف دراسي جديد'}
                {modalMode === 'edit' && 'تعديل الصف الدراسي'}
                {modalMode === 'delete' && 'حذف الصف الدراسي'}
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

                {/* المدرسة - ثابتة من بيانات المستخدم */}
                <div className="form-group">
                  <label style={labelStyle}>المدرسة</label>
                  <input 
                    style={{ ...inputStyle, background: '#f8fafc' }} 
                    value={user?.schoolName || 'غير محدد'} 
                    readOnly 
                  />
                </div>

                {/* المرحلة - تم فلترتها مسبقاً */}
                <div className="form-group">
                  <label style={labelStyle}>المرحلة</label>
                  <select 
                    style={inputStyle} 
                    value={formData.stageId}
                    onChange={e => setFormData({ ...formData, stageId: Number(e.target.value) })}
                  >
                    <option value={0}>اختر المرحلة...</option>
                    {filteredStages.map((s, i) => (
                      <option key={i} value={s['الرقم']}>{s['المرحلة']}</option>
                    ))}
                  </select>
                  {filteredStages.length === 0 && (
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
                      لا توجد مراحل لهذه المدرسة، يرجى إضافتها أولاً
                    </p>
                  )}
                </div>

                {/* اسم الصف */}
                <div className="form-group">
                  <label style={labelStyle}>اسم الصف الدراسي</label>
                  <input 
                    style={inputStyle} 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: الصف الأول..."
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
  width: '500px',
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
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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