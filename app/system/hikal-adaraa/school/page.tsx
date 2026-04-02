'use client';
import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';

type School = { 
  الرقم: number; 
  المديرية: string; 
  الادارة: string; 
  "كود المدرسة": string;
  المدرسة: string;
  الشعار?: string;
};
type Moderia = { الرقم: number; المديرية: string };
type Edara = { الرقم: number; الادارة: string; المديرية?: string };

export default function SchoolPage() {
  const [items, setItems] = useState<School[]>([]);
  const [moderiat, setModeriat] = useState<Moderia[]>([]);
  const [edarat, setEdarat] = useState<Edara[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    moderiaId: 0,
    edaraId: 0,
    code: '',
    name: '',
    image: null as File | null,
    imagePreview: ''
  });

  // جلب المدارس
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData/5`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  // جلب المديريات
  const fetchModeriat = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/1`);
      const data = await res.json();
      setModeriat(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  // جلب الإدارات
  const fetchEdarat = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/3`);
      const data = await res.json();
      setEdarat(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  // جلب الرقم الجديد
  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/6`);
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

  useEffect(() => {
    fetchData();
    fetchModeriat();
    fetchEdarat();
  }, []);

  // فلترة الإدارات حسب المديرية المختارة
  const filteredEdarat = formData.moderiaId 
    ? edarat.filter(e => {
        const moderia = moderiat.find(m => m['المديرية'] === e['المديرية']);
        return moderia?.['الرقم'] === formData.moderiaId;
      })
    : [];

  // فتح نافذة الإضافة
  const openAddModal = async () => {
    const nextId = await getNextId();
    setFormData({ 
      id: nextId, 
      moderiaId: 0, 
      edaraId: 0, 
      code: '', 
      name: '', 
      image: null,
      imagePreview: ''
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  // فتح نافذة التعديل
  const openEditModal = (item: School) => {
    const moderia = moderiat.find(m => m['المديرية'] === item['المديرية']);
    const edara = edarat.find(e => e['الادارة'] === item['الادارة']);
    setFormData({
      id: item['الرقم'],
      moderiaId: moderia?.['الرقم'] || 0,
      edaraId: edara?.['الرقم'] || 0,
      code: item['كود المدرسة'],
      name: item['المدرسة'],
      image: null,
      imagePreview: item['الشعار'] ? `data:image/png;base64,${item['الشعار']}` : ''
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // فتح نافذة الحذف
  const openDeleteModal = (item: School) => {
    const moderia = moderiat.find(m => m['المديرية'] === item['المديرية']);
    const edara = edarat.find(e => e['الادارة'] === item['الادارة']);
    setFormData({
      id: item['الرقم'],
      moderiaId: moderia?.['الرقم'] || 0,
      edaraId: edara?.['الرقم'] || 0,
      code: item['كود المدرسة'],
      name: item['المدرسة'],
      image: null,
      imagePreview: item['الشعار'] ? `data:image/png;base64,${item['الشعار']}` : ''
    });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  // تحويل الصورة لـ base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // عند اختيار صورة
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file, imagePreview: URL.createObjectURL(file) });
    }
  };

 // حفظ العملية
const handleSubmit = async () => {
  if (!formData.name && modalMode !== 'delete') {
    alert('يرجى إدخال اسم المدرسة');
    return;
  }
  if (!formData.moderiaId && modalMode !== 'delete') {
    alert('يرجى اختيار المديرية');
    return;
  }
  if (!formData.edaraId && modalMode !== 'delete') {
    alert('يرجى اختيار الإدارة');
    return;
  }

  // التحقق من التكرار - نفس المدرسة في نفس الإدارة
  if (modalMode === 'add' || modalMode === 'edit') {
    // نجيب اسم الإدارة اللي اختارها المستخدم
    const selectedEdara = edarat.find(e => e['الرقم'] === formData.edaraId);

    console.log('Selected Edara:', selectedEdara?.['الادارة']);
    console.log('Entered Name:', formData.name);

    // ندور على تطابق في الجدول
    const duplicate = items.find(item => {
      const isSameEdara = item['الادارة'] === selectedEdara?.['الادارة'];
      const isSameName = item['المدرسة']?.trim() === formData.name.trim();
      const isCurrentRecord = item['الرقم'] === formData.id;

      console.log('Item:', item['المدرسة'], '| Edara:', item['الادارة']);
      console.log('Match:', { isSameEdara, isSameName, isCurrentRecord });

      return isSameEdara && isSameName && !isCurrentRecord;
    });

    console.log('Duplicate found:', duplicate);

    if (duplicate) {
      alert('هذه المدرسة موجودة بالفعل في هذه الإدارة!');
      return;
    }
  }

  const operation = modalMode === 'add' ? 1 : modalMode === 'edit' ? 2 : 3;

  try {
    let imageData = null;
    if (formData.image) {
      const base64 = await fileToBase64(formData.image);
      imageData = base64.split(',')[1];
    }

    const res = await fetch(`${API_URL}/api/school`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: formData.id,
        moderiaId: formData.moderiaId,
        edaraId: formData.edaraId,
        code: formData.code,
        name: formData.name,
        image: imageData,
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
    console.log(err);
    alert('حدث خطأ');
  }
};

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
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
            <i className="fa-solid fa-school" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>المدارس</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>إدارة بيانات المدارس</p>
          </div>
        </div>
        <button 
          onClick={openAddModal}
          style={{
            background: 'white',
            color: '#667eea',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}
        >
          <i className="fa-solid fa-plus"></i>
          إضافة مدرسة
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
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#667eea' }}></i>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>الرقم</th>
                <th style={thStyle}>الشعار</th>
                <th style={thStyle}>المدرسة</th>
                <th style={thStyle}>كود المدرسة</th>
                <th style={thStyle}>الإدارة</th>
                <th style={thStyle}>المديرية</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    لا توجد مدارس
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{item['الرقم']}</td>
                    <td style={tdStyle}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        margin: '0 auto'
                      }}>
                        {item['الشعار'] ? (
                          <img 
                            src={`data:image/png;base64,${item['الشعار']}`} 
                            alt="شعار" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <i className="fa-solid fa-image" style={{ color: '#cbd5e1', fontSize: '20px' }}></i>
                        )}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>{item['المدرسة']}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        {item['كود المدرسة']}
                      </span>
                    </td>
                    <td style={tdStyle}>{item['الادارة']}</td>
                    <td style={tdStyle}>{item['المديرية']}</td>
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
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
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
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
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
            width: '520px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              borderRadius: '20px 20px 0 0'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                {modalMode === 'add' && 'إضافة مدرسة جديدة'}
                {modalMode === 'edit' && 'تعديل بيانات المدرسة'}
                {modalMode === 'delete' && 'حذف المدرسة'}
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
                {/* صورة المدرسة */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '3px dashed #cbd5e1'
                  }}>
                    {formData.imagePreview ? (
                      <img 
                        src={formData.imagePreview} 
                        alt="preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <i className="fa-solid fa-image" style={{ fontSize: '36px', color: '#94a3b8' }}></i>
                    )}
                  </div>
                  <label style={{
                    display: 'inline-block',
                    padding: '8px 20px',
                    background: '#f1f5f9',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#475569'
                  }}>
                    <i className="fa-solid fa-camera" style={{ marginLeft: '6px' }}></i>
                    اختيار شعار
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label style={labelStyle}>الرقم</label>
                    <input 
                      style={{ ...inputStyle, background: '#f8fafc' }} 
                      value={formData.id} 
                      readOnly 
                    />
                  </div>
                  <div className="form-group">
                    <label style={labelStyle}>كود المدرسة</label>
                    <input 
                      style={inputStyle} 
                      value={formData.code} 
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      placeholder="أدخل الكود..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={labelStyle}>المديرية</label>
                  <select 
                    style={inputStyle} 
                    value={formData.moderiaId}
                    onChange={e => setFormData({ ...formData, moderiaId: Number(e.target.value), edaraId: 0 })}
                  >
                    <option value={0}>اختر المديرية...</option>
                    {moderiat.map((m, i) => (
                      <option key={i} value={m['الرقم']}>{m['المديرية']}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={labelStyle}>الإدارة</label>
                  <select 
                    style={{ 
                      ...inputStyle, 
                      opacity: formData.moderiaId ? 1 : 0.5,
                      cursor: formData.moderiaId ? 'pointer' : 'not-allowed'
                    }} 
                    value={formData.edaraId}
                    onChange={e => setFormData({ ...formData, edaraId: Number(e.target.value) })}
                    disabled={!formData.moderiaId}
                  >
                    <option value={0}>
                      {formData.moderiaId ? 'اختر الإدارة...' : 'اختر المديرية أولاً...'}
                    </option>
                    {filteredEdarat.map((e, i) => (
                      <option key={i} value={e['الرقم']}>{e['الادارة']}</option>
                    ))}
                  </select>
                  {formData.moderiaId && filteredEdarat.length === 0 && (
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
                      لا توجد إدارات تابعة لهذه المديرية
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label style={labelStyle}>اسم المدرسة</label>
                  <input 
                    style={inputStyle} 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسم المدرسة..."
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
                  background: modalMode === 'delete' ? '#dc2626' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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