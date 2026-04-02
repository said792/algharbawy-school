'use client';
import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

type ClassItem = {
  الرقم: number;
  المدرسة: string;
  المرحلة: string;
  "الصف الدراسي": string;
  الشعبة: string;
  الفصل: string;
};

type Stage = { الرقم: number; المرحلة: string; المدرسة?: string };
type Grade = { الرقم: number; "الصف الدراسى": string; المرحلة?: string; المدرسة?: string };
type Division = { الرقم?: number; المدرسة?: string; المرحلة?: string; الصف?: string; الشعبة?: string };

export default function ClassPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId;

  const [items, setItems] = useState<ClassItem[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    stageId: 0,
    gradeId: 0,
    shoabaId: 0,
    schoolId: 0,
    name: ''
  });

  // دالة أمان لجلب رقم الشعبة مهما كان اسم العمود في الـ API
  const getDivId = (d: any): number => {
    return Number(d['الرقم']) || Number(Object.values(d)[0]) || 0;
  };

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/getData1/5?id=${schoolId}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const fetchStages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/11`);
      const data = await res.json();
      setStages(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchGrades = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/15`);
      const data = await res.json();
      setGrades(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchDivisions = async () => {
    if (!schoolId) return;
    try {
      const res = await fetch(`${API_URL}/api/getData1/32?id=${schoolId}`);
      const data = await res.json();
      setDivisions(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/18`);
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
      fetchDivisions();
    }
  }, [schoolId]);

  const filteredStages = stages.filter(s => s['المدرسة'] === user?.schoolName);

  const filteredGrades = formData.stageId
    ? grades.filter(g => {
        const match = stages.find(s =>
          s['المرحلة'] === g['المرحلة'] && s['المدرسة'] === g['المدرسة']
        );
        return match?.['الرقم'] === formData.stageId
          && g['المدرسة'] === user?.schoolName;
      })
    : [];

  const getGradeName = (g: Grade): string => {
    return g['الصف الدراسى'] || '';
  };

  const availableDivisions = formData.gradeId
    ? divisions.filter(d => {
        const selectedGrade = grades.find(g => g['الرقم'] === formData.gradeId);
        if (!selectedGrade) return false;
        const gradeName = getGradeName(selectedGrade);
        return d['الصف'] === gradeName && d['المرحلة'] === selectedGrade['المرحلة'];
      })
    : [];

  const handleStageChange = (stageId: number) => {
    setFormData({ ...formData, stageId, gradeId: 0, shoabaId: 0 });
  };

  const handleGradeChange = (gradeId: number) => {
    setFormData({ ...formData, gradeId, shoabaId: 0 });
  };

  const openAddModal = async () => {
    const nextId = await getNextId();
    setFormData({
      id: nextId, stageId: 0, gradeId: 0, shoabaId: 0,
      schoolId: user?.schoolId || 0, name: ''
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ClassItem) => {
    const stage = stages.find(s => s['المرحلة'] === item['المرحلة'] && s['المدرسة'] === user?.schoolName);
    const grade = grades.find(g => {
      const gradeName = getGradeName(g);
      return gradeName === item['الصف الدراسي'] && g['المدرسة'] === user?.schoolName;
    });
    const division = divisions.find(d =>
      d['الشعبة'] === item['الشعبة']
      && d['الصف'] === item['الصف الدراسي']
      && d['المدرسة'] === item['المدرسة']
    );

    setFormData({
      id: item['الرقم'],
      stageId: stage?.['الرقم'] || 0,
      gradeId: grade?.['الرقم'] || 0,
      shoabaId: division ? getDivId(division) : 0,
      schoolId: user?.schoolId || 0,
      name: item['الفصل']
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: ClassItem) => {
    setFormData({
      id: item['الرقم'], stageId: 0, gradeId: 0, shoabaId: 0,
      schoolId: user?.schoolId || 0, name: item['الفصل']
    });
    setModalMode('delete');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name && modalMode !== 'delete') {
      alert('يرجى إدخال اسم الفصل');
      return;
    }
    if (!formData.gradeId && modalMode !== 'delete') {
      alert('يرجى اختيار الصف الدراسي');
      return;
    }

    if (modalMode === 'add' || modalMode === 'edit') {
      const selectedGrade = grades.find(g => g['الرقم'] === formData.gradeId);
      const selectedGradeName = getGradeName(selectedGrade!);
      const duplicate = items.find(item => {
        return item['المدرسة'] === user?.schoolName
          && item['الصف الدراسي'] === selectedGradeName
          && item['الفصل']?.trim() === formData.name.trim()
          && item['الرقم'] !== formData.id;
      });
      if (duplicate) {
        alert('هذا الفصل موجود بالفعل في هذا الصف!');
        return;
      }
    }

    const operation = modalMode === 'add' ? 1 : modalMode === 'edit' ? 2 : 3;

    try {
      const res = await fetch(`${API_URL}/api/class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          schoolId: formData.schoolId,
          stageId: formData.stageId,
          gradeId: formData.gradeId,
          shoabaId: formData.shoabaId > 0 ? formData.shoabaId : null,
          name: formData.name,
          operation: operation
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchData();
        alert(modalMode === 'add' ? 'تمت الإضافة' : modalMode === 'edit' ? 'تم التعديل' : 'تم الحذف');
      } else {
        alert('خطأ: ' + (data.error || ''));
      }
    } catch (err) {
      console.log(err);
      alert('حدث خطأ');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
        borderRadius: '16px', padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 40px rgba(236, 72, 153, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fa-solid fa-door-open" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>الفصول</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>
              إدارة الفصول الدراسية - {items.length} فصل
            </p>
          </div>
        </div>
        <button onClick={openAddModal} style={{
          background: 'white', color: '#be185d', border: 'none',
          padding: '12px 28px', borderRadius: '12px', fontSize: '16px',
          fontWeight: '600', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <i className="fa-solid fa-plus"></i> إضافة فصل
        </button>
      </div>

      <div style={{
        background: 'white', borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#ec4899' }}></i>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#fdf2f8' }}>
                  <th style={{ ...thStyle, width: '70px' }}>الرقم</th>
                  <th style={thStyle}>الفصل</th>
                  <th style={thStyle}>الصف</th>
                  <th style={thStyle}>المرحلة</th>
                  <th style={thStyle}>الشعبة</th>
                  <th style={thStyle}>المدرسة</th>
                  <th style={{ ...thStyle, width: '120px' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                      <i className="fa-solid fa-inbox" style={{
                        fontSize: '2.5rem', color: '#e2e8f8', display: 'block', marginBottom: '12px'
                      }}></i>
                      {!schoolId ? 'جاري تحميل بيانات المدرسة...' : 'لا توجد فصول'}
                    </td>
                  </tr>
                ) : (
                  items.map((item, i) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s'
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fdf2f8')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <td style={tdStyle}>
                        <span style={{
                          background: '#fce7f3', color: '#9d174d',
                          padding: '4px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '13px'
                        }}>{item['الرقم']}</span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>
                        {item['الفصل']}
                      </td>
                      <td style={tdStyle}>{item['الصف الدراسي']}</td>
                      <td style={tdStyle}>{item['المرحلة']}</td>
                      <td style={tdStyle}>
                        {item['الشعبة'] ? (
                          <span style={{
                            background: '#fef3c7', color: '#92400e',
                            padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '500'
                          }}>{item['الشعبة']}</span>
                        ) : (
                          <span style={{
                            background: '#f1f5f9', color: '#94a3b8',
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px'
                          }}>-</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '160px' }}>
                        <span style={{
                          color: '#64748b', fontSize: '13px', display: 'inline-block',
                          maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{item['المدرسة']}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
        {!loading && items.length > 0 && (
          <div style={{
            padding: '14px 20px', background: '#fafafa', borderTop: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8'
          }}>
            <span>عرض {items.length} فصل</span>
            <span>المدرسة: {user?.schoolName}</span>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setIsModalOpen(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{
              background: modalMode === 'delete'
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
              padding: '24px', borderRadius: '20px 20px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                {modalMode === 'add' && 'إضافة فصل جديد'}
                {modalMode === 'edit' && 'تعديل الفصل'}
                {modalMode === 'delete' && 'حذف الفصل'}
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
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 }}>&quot;{formData.name}&quot;</p>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-hashtag" style={{ marginLeft: '6px', color: '#be185d' }}></i> الرقم
                  </label>
                  <input style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }}
                    value={formData.id} readOnly />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-school" style={{ marginLeft: '6px', color: '#be185d' }}></i> المدرسة
                  </label>
                  <input style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }}
                    value={user?.schoolName || 'غير محدد'} readOnly />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-layer-group" style={{ marginLeft: '6px', color: '#be185d' }}></i> المرحلة
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
                    <i className="fa-solid fa-graduation-cap" style={{ marginLeft: '6px', color: '#be185d' }}></i> الصف الدراسي
                  </label>
                  <select
                    style={{ ...inputStyle, opacity: formData.stageId ? 1 : 0.5 }}
                    value={formData.gradeId}
                    disabled={!formData.stageId}
                    onChange={e => handleGradeChange(Number(e.target.value))}
                  >
                    <option value={0}>
                      {formData.stageId ? 'اختر الصف...' : 'اختر المرحلة أولاً...'}
                    </option>
                    {filteredGrades.map((g, i) => (
                      <option key={i} value={g['الرقم']}>{getGradeName(g)}</option>
                    ))}
                  </select>
                </div>

                {formData.gradeId && availableDivisions.length > 0 && (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={labelStyle}>
                      <i className="fa-solid fa-users-rectangle" style={{ marginLeft: '6px', color: '#be185d' }}></i> الشعبة
                      <span style={{ color: '#cbd5e1', fontWeight: '400', fontSize: '13px' }}> (اختياري)</span>
                    </label>
                    <select
                      style={inputStyle}
                      value={formData.shoabaId}
                      onChange={e => setFormData({ ...formData, shoabaId: Number(e.target.value) || 0 })}
                    >
                      <option value="0">بدون شعبة</option>
                      {availableDivisions.map((d, i) => (
                        <option key={i} value={String(getDivId(d))}>{d['الشعبة']}</option>
                      ))}
                    </select>
                    <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>
                      {availableDivisions.length} شعبة متاحة في هذا الصف
                    </p>
                  </div>
                )}

                {formData.gradeId && availableDivisions.length === 0 && (
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                    padding: '12px 16px', marginBottom: '18px',
                    display: 'flex', alignItems: 'center', gap: '10px'
                  }}>
                    <i className="fa-solid fa-circle-info" style={{ color: '#16a34a', fontSize: '16px' }}></i>
                    <p style={{ color: '#065f46', fontSize: '13px', margin: 0 }}>
                      هذا الصف ليس به شعب - يمكنك المتابعة بدون ربط
                    </p>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>
                    <i className="fa-solid fa-door-open" style={{ marginLeft: '6px', color: '#be185d' }}></i> اسم الفصل
                  </label>
                  <input style={inputStyle} value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: 1/أ، 2/ب..." autoFocus />
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
  color: '#9d174d', fontSize: '14px', borderBottom: '2px solid #fbcfe8'
};
const tdStyle: React.CSSProperties = {
  padding: '14px 20px', textAlign: 'center', color: '#475569', fontSize: '14px'
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '8px', fontWeight: '600',
  color: '#374151', fontSize: '14px'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0',
  borderRadius: '10px', fontSize: '15px', outline: 'none',
  fontFamily: 'Cairo, sans-serif', transition: 'border-color 0.2s', color: '#1e293b'
};
const editBtnStyle: React.CSSProperties = {
  background: '#eff6ff', color: '#2563eb', border: 'none',
  width: '36px', height: '36px', borderRadius: '10px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const deleteBtnStyle: React.CSSProperties = {
  background: '#fef2f2', color: '#dc2626', border: 'none', width: '36px', height: '36px',
  borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
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
  borderRadius: '10px', fontSize: '15px', fontWeight: '500',
  cursor: 'pointer', fontFamily: 'Cairo, sans-serif'
};
const saveBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600',
  cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
};
const deleteConfirmBtnStyle: React.CSSProperties = {
  padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none',
  borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif'
};