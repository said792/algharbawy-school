'use client';
import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

// ← مطابق بالظبط لأعمدة الـ SQL
type Division = {
  الرقم: number;
  المدرسة: string;
  المرحلة: string;
  الصف: string;
  الشعبة: string;
};

type Stage = { الرقم: number; المرحلة: string; المدرسة?: string };
type Grade = { الرقم: number; "الصف الدراسى": string; المرحلة?: string; المدرسة?: string };

export default function DivisionPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId;

  const [items, setItems] = useState<Division[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    id: 0,
    stageId: 0,
    gradeId: 0,
    schoolId: 0,
    name: '',
    isActive: true
  });

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData1/32?id=${schoolId}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) { console.log(err); }
    setLoading(false);
  };

  const fetchStages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/11`);
      const data = await res.json();
      setStages(data.data || []);
    } catch (err) { console.log(err); }
  };

  const fetchGrades = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/15`);
      const data = await res.json();
      setGrades(data.data || []);
    } catch (err) { console.log(err); }
  };

  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/38`);
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
    if (schoolId) {
      fetchData();
      fetchStages();
      fetchGrades();
    }
  }, [schoolId]);

  const filteredStages = stages.filter(s => s['المدرسة'] === user?.schoolName);

  const filteredGrades = formData.stageId
    ? grades.filter(g => {
        const match = stages.find(s =>
          s['المرحلة'] === g['المرحلة'] &&
          s['المدرسة'] === g['المدرسة']
        );
        return match?.['الرقم'] === formData.stageId
          && g['المدرسة'] === user?.schoolName;
      })
    : [];

  const filteredItems = items.filter(item =>
    item['الشعبة']?.includes(searchTerm) ||
    item['الصف']?.includes(searchTerm) ||
    item['المرحلة']?.includes(searchTerm)
  );

  const handleStageChange = (stageId: number) => {
    setFormData({ ...formData, stageId, gradeId: 0 });
  };

  const openAddModal = async () => {
    const nextId = await getNextId();
    setFormData({
      id: nextId, stageId: 0, gradeId: 0,
      schoolId: user?.schoolId || 0,
      name: '', isActive: true
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Division) => {
    const grade = grades.find(g =>
      g['الصف الدراسى'] === item['الصف'] && g['المدرسة'] === user?.schoolName
    );
    const stage = stages.find(s =>
      s['المرحلة'] === item['المرحلة'] && s['المدرسة'] === user?.schoolName
    );
    setFormData({
      id: item['الرقم'],
      stageId: stage?.['الرقم'] || 0,
      gradeId: grade?.['الرقم'] || 0,
      schoolId: user?.schoolId || 0,
      name: item['الشعبة'],
      isActive: true
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: Division) => {
    const grade = grades.find(g => g['الصف الدراسى'] === item['الصف']);
    const stage = stages.find(s => s['المرحلة'] === item['المرحلة']);
    setFormData({
      id: item['الرقم'],
      stageId: stage?.['الرقم'] || 0,
      gradeId: grade?.['الرقم'] || 0,
      schoolId: user?.schoolId || 0,
      name: item['الشعبة'],
      isActive: true
    });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  const handleDeactivate = async (item: Division) => {
    if (!confirm(`هل تريد إيقاف الشعبة "${item['الشعبة']}"؟`)) return;
    try {
      const grade = grades.find(g => g['الصف الدراسى'] === item['الصف']);
      const stage = stages.find(s => s['المرحلة'] === item['المرحلة']);
      const res = await fetch(`${API_URL}/api/class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item['الرقم'],
          schoolId: user?.schoolId,
          stageId: stage?.['الرقم'] || 0,
          gradeId: grade?.['الرقم'] || 0,
          name: item['الشعبة'],
          operation: 6
        })
      });
      const data = await res.json();
      if (data.success) fetchData();
      else alert('خطأ: ' + (data.error || data.message || ''));
    } catch { alert('خطأ في الاتصال'); }
  };

  const handleActivate = async (item: Division) => {
    try {
      const grade = grades.find(g => g['الصف الدراسى'] === item['الصف']);
      const stage = stages.find(s => s['المرحلة'] === item['المرحلة']);
      const res = await fetch(`${API_URL}/api/class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item['الرقم'],
          schoolId: user?.schoolId,
          stageId: stage?.['الرقم'] || 0,
          gradeId: grade?.['الرقم'] || 0,
          name: item['الشعبة'],
          operation: 5
        })
      });
      const data = await res.json();
      if (data.success) fetchData();
      else alert('خطأ: ' + (data.error || data.message || ''));
    } catch { alert('خطأ في الاتصال'); }
  };

  const handleSubmit = async () => {
    if (modalMode === 'delete') {
      try {
        const res = await fetch(`${API_URL}/api/class`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: formData.id,
            schoolId: formData.schoolId,
            stageId: formData.stageId,
            gradeId: formData.gradeId,
            name: formData.name,
            operation: 6
          })
        });
        const data = await res.json();
        if (data.success) { setIsModalOpen(false); fetchData(); alert('تم إيقاف الشعبة'); }
        else alert('خطأ: ' + (data.error || data.message || ''));
      } catch { alert('خطأ في الاتصال'); }
      return;
    }

    if (!formData.name) { alert('يرجى إدخال اسم الشعبة'); return; }
    if (!formData.gradeId) { alert('يرجى اختيار الصف الدراسي'); return; }

    if (modalMode === 'add') {
      const duplicate = items.find(item =>
        item['الصف'] === grades.find(g => g['الرقم'] === formData.gradeId)?.['الصف الدراسى']
        && item['الشعبة']?.trim() === formData.name.trim()
      );
      if (duplicate) { alert('هذه الشعبة موجودة بالفعل في هذا الصف!'); return; }
    }

    const operation = modalMode === 'add' ? 4 : 5;

    try {
      const res = await fetch(`${API_URL}/api/class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          schoolId: formData.schoolId,
          stageId: formData.stageId,
          gradeId: formData.gradeId,
          name: formData.name,
          operation: operation
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchData();
        alert(modalMode === 'add' ? 'تمت الإضافة بنجاح' : 'تم التعديل بنجاح');
      } else { alert('خطأ: ' + (data.error || data.message || '')); }
    } catch { alert('خطأ في الاتصال'); }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* الهيدر */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        borderRadius: '16px', padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fa-solid fa-users-rectangle" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>الشعب الدراسية</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>
              إجمالي {filteredItems.length} شعبة
            </p>
          </div>
        </div>
        <button onClick={openAddModal} style={{
          background: 'white', color: '#d97706', border: 'none',
          padding: '12px 28px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '600', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <i className="fa-solid fa-plus"></i> إضافة شعبة
        </button>
      </div>

      {/* شريط البحث */}
      <div style={{
        background: 'white', borderRadius: '14px', padding: '16px 20px',
        marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <div style={{
          width: '42px', height: '42px', background: '#fef3c7',
          borderRadius: '10px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0
        }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#d97706', fontSize: '16px' }}></i>
        </div>
        <input type="text" placeholder="ابحث عن شعبة..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: '15px',
            color: '#1e293b', fontFamily: 'Cairo, sans-serif', background: 'transparent'
          }}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} style={{
            background: '#f1f5f9', border: 'none', width: '32px', height: '32px',
            borderRadius: '8px', cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {/* الجدول */}
      <div style={{
        background: 'white', borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#f59e0b' }}></i>
            <p style={{ color: '#94a3b8', marginTop: '12px' }}>جاري تحميل الشعب...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
              <thead>
                <tr style={{ background: '#fffbeb' }}>
                  <th style={{ ...thStyle, width: '70px' }}>الرقم</th>
                  <th style={thStyle}>الشعبة</th>
                  <th style={thStyle}>الصف</th>
                  <th style={thStyle}>المرحلة</th>
                  <th style={thStyle}>المدرسة</th>
                  <th style={{ ...thStyle, width: '180px' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                      <i className="fa-solid fa-inbox" style={{
                        fontSize: '2.5rem', color: '#e2e8f0', display: 'block', marginBottom: '12px'
                      }}></i>
                      {!schoolId ? 'جاري تحميل بيانات المدرسة...'
                        : searchTerm ? 'لا توجد نتائج' : 'لا توجد شعب'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, i) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s'
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fffbeb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <td style={tdStyle}>
                        <span style={{
                          background: '#fef3c7', color: '#92400e',
                          padding: '4px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '13px'
                        }}>{item['الرقم']}</span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <div style={{ width: '8px', height: '8px', background: '#f59e0b',
                            borderRadius: '50%', flexShrink: 0 }}></div>
                          {item['الشعبة']}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: '#eff6ff', color: '#1d4ed8',
                          padding: '4px 10px', borderRadius: '6px', fontSize: '13px'
                        }}>{item['الصف']}</span>
                      </td>
                      <td style={tdStyle}>{item['المرحلة']}</td>
                      <td style={tdStyle}>{item['المدرسة']}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => openEditModal(item)} style={editBtnStyle} title="تعديل">
                            <i className="fa-solid fa-pen" style={{ fontSize: '12px' }}></i>
                          </button>
                          <button onClick={() => openDeleteModal(item)} style={deleteBtnStyle} title="حذف">
                            <i className="fa-solid fa-trash" style={{ fontSize: '12px' }}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredItems.length > 0 && (
          <div style={{
            padding: '14px 20px', background: '#fafafa', borderTop: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8'
          }}>
            <span>عرض {filteredItems.length} من {items.length}</span>
            <span>المدرسة: {user?.schoolName}</span>
          </div>
        )}
      </div>

      {/* النافذة المنبثقة */}
      {isModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setIsModalOpen(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{
              background: modalMode === 'delete'
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '24px', borderRadius: '20px 20px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                {modalMode === 'add' && 'إضافة شعبة جديدة'}
                {modalMode === 'edit' && 'تعديل الشعبة'}
                {modalMode === 'delete' && 'حذف الشعبة'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', width: '36px', height: '36px',
                borderRadius: '10px', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
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
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>&quot;{formData.name}&quot;</p>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-hashtag" style={{ marginLeft: '6px', color: '#d97706' }}></i> الرقم
                  </label>
                  <input style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }}
                    value={formData.id} readOnly />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-school" style={{ marginLeft: '6px', color: '#d97706' }}></i> المدرسة
                  </label>
                  <input style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }}
                    value={user?.schoolName || 'غير محدد'} readOnly />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-layer-group" style={{ marginLeft: '6px', color: '#d97706' }}></i> المرحلة
                  </label>
                  <select style={inputStyle} value={formData.stageId}
                    onChange={e => handleStageChange(Number(e.target.value))}>
                    <option value={0}>اختر المرحلة...</option>
                    {filteredStages.map((s, i) => (
                      <option key={i} value={s['الرقم']}>{s['المرحلة']}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-graduation-cap" style={{ marginLeft: '6px', color: '#d97706' }}></i> الصف الدراسي
                  </label>
                  <select
                    style={{ ...inputStyle, opacity: formData.stageId ? 1 : 0.5 }}
                    value={formData.gradeId}
                    disabled={!formData.stageId}
                    onChange={e => setFormData({ ...formData, gradeId: Number(e.target.value) })}
                  >
                    <option value={0}>
                      {formData.stageId ? 'اختر الصف...' : 'اختر المرحلة أولاً...'}
                    </option>
                    {filteredGrades.map((g, i) => (
                      <option key={i} value={g['الرقم']}>{g['الصف الدراسى']}</option>
                    ))}
                  </select>
                  {formData.stageId && filteredGrades.length === 0 && (
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
                      لا توجد صفوف في هذه المرحلة
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '0' }}>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-users" style={{ marginLeft: '6px', color: '#d97706' }}></i> اسم الشعبة
                  </label>
                  <input style={inputStyle} value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="شعبة أ، شعبة ب..." autoFocus />
                </div>
              </div>
            )}

            <div style={{
              padding: '20px 24px', borderTop: '1px solid #f1f5f9',
              display: 'flex', gap: '12px', justifyContent: 'flex-end'
            }}>
              <button style={cancelBtnStyle} onClick={() => setIsModalOpen(false)}>إلغاء</button>
              <button onClick={handleSubmit}
                style={modalMode === 'delete' ? deleteConfirmBtnStyle : saveBtnStyle}>
                {modalMode === 'delete' ? 'حذف' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '16px 20px', textAlign: 'right', fontWeight: '600',
  color: '#92400e', fontSize: '14px', borderBottom: '2px solid #fde68a'
};
const tdStyle: React.CSSProperties = {
  padding: '14px 20px', textAlign: 'center', color: '#475569', fontSize: '14px'
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0',
  borderRadius: '10px', fontSize: '15px', outline: 'none',
  fontFamily: 'Cairo, sans-serif', transition: 'border-color 0.2s', color: '#1e293b'
};
const editBtnStyle: React.CSSProperties = {
  background: '#eff6ff', color: '#2563eb', border: 'none', width: '34px', height: '34px',
  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const deleteBtnStyle: React.CSSProperties = {
  background: '#fef2f2', color: '#dc2626', border: 'none', width: '34px', height: '34px',
  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 1000
};
const modalStyle: React.CSSProperties = {
  background: 'white', borderRadius: '20px', width: '520px', maxWidth: '90%',
  maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none',
  borderRadius: '10px', fontSize: '15px', fontWeight: '500', cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};
const saveBtnStyle: React.CSSProperties = {
  padding: '12px 24px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600',
  cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
};
const deleteConfirmBtnStyle: React.CSSProperties = {
  padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none',
  borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
};