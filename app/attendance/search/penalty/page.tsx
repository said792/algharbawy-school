'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

interface ClassItem {
  'الرقم': number;
  'الفصل': string;
}

interface Student {
  StudentID: number;
  'الاسم بالعربى': string;
}

// واجهة نتائج البحث (الأعمدة العربية)
interface ViolationResult {
  'الرقم'?: number; // رقم المخالفة (ViolationID)
  'اسم الطالب': string;
  'تاريخ المخالفة': string;
  'وصف المخالفة': string;
  'العقوبة': string;
  'حالة العقوبة': string;
  'تم التواصل'?: boolean;
  'اعتماد المدير'?: boolean;
}

export default function ViolationsSearchPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearName = work?.yearName;

  const [activeTab, setActiveTab] = useState(1);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [results, setResults] = useState<ViolationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // استخدام أي نوع للبيانات المؤقتة في المودال
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // === دوال التنسيق وجلب البيانات ===
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    if (typeof dateString === 'string' && dateString.includes('T')) return dateString.split('T')[0];
    return dateString;
  };

  useEffect(() => {
    const fetchGrades = async () => {
      if (!schoolName || !stageName) return;
      try {
        const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
        const json = await res.json();
        if (json.success) setGrades(json.data);
      } catch (err) { console.error(err); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedGradeName) { setClasses([]); return; }
      try {
        const res = await fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`);
        const json = await res.json();
        if (json.success) setClasses(json.data);
      } catch (err) { console.error(err); setClasses([]); }
    };
    fetchClasses();
    setSelectedClassName(''); setStudents([]); setSelectedStudentId(null);
  }, [selectedGradeName, schoolName, stageName]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassName) { setStudents([]); return; }
      try {
        const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedClassName}&inpot=4`);
        const json = await res.json();
        if (json.success && json.data) setStudents(json.data.map((s: any) => ({ StudentID: s['الرقم'], 'الاسم بالعربى': s['الاسم بالعربى'] })));
      } catch (err) { console.error(err); setStudents([]); }
    };
    fetchStudents();
    setSelectedStudentId(null);
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  // === دوال البحث ===
  const handleSearchByName = async () => {
    if (!selectedStudentId) return alert('اختر الطالب');
    setLoading(true); setSearched(true); setResults([]);
    try {
      const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${schoolId}&sch2=${selectedStudentId}&inpot=6`);
      const json = await res.json();
      if (json.success && json.data) setResults(json.data);
    } catch (err) { alert('خطأ في البحث'); } finally { setLoading(false); }
  };

  const handleSearchByDate = async () => {
    if (!selectedDate) return alert('اختر التاريخ');
    setLoading(true); setSearched(true); setResults([]);
    try {
      const res = await fetch(`${API_URL}/api/scher1int1dat?sch=${schoolId}&SCHER2=${selectedDate}&inpot=7`);
      const json = await res.json();
      if (json.success && json.data) setResults(json.data);
    } catch (err) { alert('خطأ في البحث'); } finally { setLoading(false); }
  };

  // === دوال التعديل والحذف ===

  const handleDelete = async (record: ViolationResult) => {
    const id = record['الرقم'];
    if (!id) return alert('رقم المخالفة غير موجود');
    if (!confirm('هل أنت متأكد من حذف هذه المخالفة؟')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/students/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ViolationID: id, INPOT: 3 })
      });
      const data = await res.json();
      if (data.success) {
        alert('تم الحذف بنجاح');
        setResults(prev => prev.filter(r => r['الرقم'] !== id));
      } else {
        alert('فشل الحذف: ' + data.error);
      }
    } catch (err) { alert('خطأ في الاتصال'); }
  };

  const openEditModal = (record: ViolationResult) => {
    setEditData({
      ...record,
      ViolationID: record['الرقم'], // تأكد من وجود الرقم
      ViolationDate: formatDate(record['تاريخ المخالفة'])
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editData.ViolationID) return alert('لا يوجد رقم للمخالفة');

    setSaving(true);
    try {
      const payload = {
        ViolationID: editData.ViolationID,
        StudentID: 0, // غير مهم في التعديل
        ViolationDescription: editData['وصف المخالفة'],
        ViolationDate: editData.ViolationDate,
        ParentContacted: editData['تم التواصل'],
        PunishmentDescription: editData['العقوبة'],
        PunishmentStatus: editData['حالة العقوبة'],
        ConfirmedByPrincipal: editData['اعتماد المدير'],
        INPOT: 2
      };

      const res = await fetch(`${API_URL}/api/students/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        alert('تم التعديل بنجاح');
        setIsEditModalOpen(false);
        // تحديث العرض محلياً
        setResults(prev => prev.map(r => r['الرقم'] === editData.ViolationID ? {...r, ...editData} : r));
      } else {
        alert('فشل التعديل: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (record: ViolationResult) => {
    const id = record['الرقم'];
    if (!id) return;

    try {
      const payload = {
        ViolationID: id,
        StudentID: 0,
        ViolationDescription: record['وصف المخالفة'] || '',
        ViolationDate: formatDate(record['تاريخ المخالفة']),
        ConfirmedByPrincipal: true,
        INPOT: 2
      };
      
      const res = await fetch(`${API_URL}/api/students/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        alert('تم الاعتماد بنجاح');
        setResults(prev => prev.map(r => r['الرقم'] === id ? {...r, 'اعتماد المدير': true} : r));
      } else {
        alert('فشل الاعتماد');
      }
    } catch (e) { alert('خطأ'); }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #ef4444, #f43f5e)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', marginBottom: '30px', border: '1px solid #fee2e2', borderTop: '5px solid #ef4444' };
  const tabsContainerStyle: React.CSSProperties = { display: 'flex', gap: '10px', marginBottom: '25px' };
  const tabButtonStyle = (active: boolean): React.CSSProperties => ({ flex: 1, padding: '15px', border: 'none', borderRadius: '10px', cursor: 'pointer', background: active ? '#ef4444' : '#fee2e2', color: active ? 'white' : '#b91c1c', fontWeight: 'bold', fontSize: '16px', transition: '0.3s' });
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const buttonStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: '0.2s', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '5px' };
  const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
  const modalContent: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '20px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', direction: 'rtl' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>🚨 إدارة العقوبات والمخالفات</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>بحث، تعديل، واعتماد العقوبات</p>
        </div>
        <div style={{ fontSize: '50px' }}>⚖️</div>
      </div>

      <div style={tabsContainerStyle}>
        <button onClick={() => { setActiveTab(1); setResults([]); setSearched(false); }} style={tabButtonStyle(activeTab === 1)}>1️⃣ البحث بالاسم</button>
        <button onClick={() => { setActiveTab(2); setResults([]); setSearched(false); }} style={tabButtonStyle(activeTab === 2)}>2️⃣ البحث بالتاريخ</button>
      </div>

      <div style={cardStyle}>
        {activeTab === 1 && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
               <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px'}}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>الصف</label>
                        <select value={selectedGradeId || ''} onChange={(e) => { const id = Number(e.target.value); setSelectedGradeId(id); const g = grades.find(x => x['الرقم'] === id); if(g) setSelectedGradeName(g['الصف الدراسى']); }}>
                            <option value="">اختر الصف</option>
                            {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                        </select>
                    </div>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>الفصل</label>
                        <select value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)} disabled={!selectedGradeName}>
                            <option value="">اختر الفصل</option>
                            {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                        </select>
                    </div>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>الطالب</label>
                        <input list="stuList" value={students.find(s => s.StudentID === selectedStudentId)?.['الاسم بالعربى'] || ''} onChange={(e) => { const s = students.find(x => x['الاسم بالعربى'] === e.target.value); setSelectedStudentId(s ? s.StudentID : null); }} style={inputStyle} placeholder="اختر الطالب" />
                        <datalist id="stuList">{students.map(s => <option key={s.StudentID} value={s['الاسم بالعربى']} />)}</datalist>
                    </div>
               </div>
            </div>
            <button onClick={handleSearchByName} disabled={loading || !selectedStudentId} style={{...buttonStyle, background: '#ef4444', height: '50px'}}>
              {loading ? 'جاري...' : '🔍 بحث'}
            </button>
          </div>
        )}

        {activeTab === 2 && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>تاريخ المخالفة</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleSearchByDate} disabled={loading} style={{...buttonStyle, background: '#ef4444', height: '50px'}}>
              {loading ? 'جاري...' : '🔍 بحث'}
            </button>
          </div>
        )}
      </div>

      {searched && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#b91c1c', marginBottom: '15px' }}>النتائج ({results.length})</h3>
          {results.length > 0 ? (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead style={{ background: '#fee2e2' }}>
                  <tr>
                    <th style={thStyle}>م</th>
                    <th style={thStyle}>اسم الطالب</th>
                    <th style={thStyle}>تاريخ المخالفة</th>
                    <th style={thStyle}>الوصف</th>
                    <th style={thStyle}>العقوبة</th>
                    <th style={thStyle}>الحالة</th>
                    <th style={thStyle}>اعتماد المدير</th>
                    <th style={thStyle}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={{...tdStyle, fontWeight: 'bold'}}>{r['اسم الطالب']}</td>
                      <td style={tdStyle}>{formatDate(r['تاريخ المخالفة'])}</td>
                      <td style={tdStyle}>{r['وصف المخالفة']}</td>
                      <td style={tdStyle}>{r['العقوبة']}</td>
                      <td style={tdStyle}>{r['حالة العقوبة']}</td>
                      <td style={tdStyle}>{r['اعتماد المدير'] ? '✅ نعم' : '❌ لا'}</td>
                      <td style={tdStyle}>
                        <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                            <button onClick={() => openEditModal(r)} style={{...buttonStyle, background: '#3b82f6'}}>✏️ تعديل و تأكيد</button>
                            {!r['اعتماد المدير'] && (
                                <button onClick={() => handleConfirm(r)} style={{...buttonStyle, background: '#10b981'}}>✔️ تأكيد</button>
                            )}
                            <button onClick={() => handleDelete(r)} style={{...buttonStyle, background: '#6b7280'}}>🗑️ حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>لا توجد نتائج</div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
          <div style={modalOverlay} onClick={() => setIsEditModalOpen(false)}>
            <div style={modalContent} onClick={(e) => e.stopPropagation()}>
                <h2 style={{color: '#b91c1c', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>✏️ تعديل بيانات المخالفة</h2>
                
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>تاريخ المخالفة</label>
                    <input type="date" style={inputStyle} value={editData.ViolationDate || ''} onChange={(e) => setEditData({...editData, ViolationDate: e.target.value})} />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>وصف المخالفة</label>
                    <textarea style={{...inputStyle, minHeight: '80px'}} value={editData['وصف المخالفة'] || ''} onChange={(e) => setEditData({...editData, 'وصف المخالفة': e.target.value})} />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>وصف العقوبة</label>
                    <input type="text" style={inputStyle} value={editData['العقوبة'] || ''} onChange={(e) => setEditData({...editData, 'العقوبة': e.target.value})} />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>حالة العقوبة</label>
                    <select style={inputStyle} value={editData['حالة العقوبة'] || ''} onChange={(e) => setEditData({...editData, 'حالة العقوبة': e.target.value})}>
                        <option value="لم يتم">لم يتم</option>
                        <option value="قيد التنفيذ">قيد التنفيذ</option>
                        <option value="تم التنفيذ">تم التنفيذ</option>
                    </select>
                </div>

                <div style={{display: 'flex', gap: '20px', marginTop: '15px'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                        <input type="checkbox" checked={editData['تم التواصل'] || false} onChange={(e) => setEditData({...editData, 'تم التواصل': e.target.checked})} />
                        تم التواصل مع ولي الأمر
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                        <input type="checkbox" checked={editData['اعتماد المدير'] || false} onChange={(e) => setEditData({...editData, 'اعتماد المدير': e.target.checked})} />
                        اعتماد المدير
                    </label>
                </div>

                <div style={{marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                    <button onClick={() => setIsEditModalOpen(false)} style={{...buttonStyle, background: '#e5e7eb', color: 'black'}}>إلغاء</button>
                    <button onClick={handleUpdate} disabled={saving} style={{...buttonStyle, background: '#ef4444'}}>
                        {saving ? 'جاري الحفظ...' : '💾 حفظ التعديلات'}
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', color: '#374151' };
const tdStyle: React.CSSProperties = { padding: '10px', fontSize: '14px', verticalAlign: 'middle' };