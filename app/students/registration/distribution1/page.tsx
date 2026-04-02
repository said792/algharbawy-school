'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- Types ---
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

interface DivisionItem {
  'الرقم': number;
  'الشعبة': string;
}

interface Student {
  StudentID: number;
  ArbStudName: string;
  CurrentDivision?: string; // الشعبة الحالية (للتعديل)
  selected?: boolean;
}

export default function DivisionDistributionPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const yearId = work?.yearId;
  const stageName = work?.stageName;

  // === State ===
  const [gradesList, setGradesList] = useState<Grade[]>([]);
  const [divisionsList, setDivisionsList] = useState<DivisionItem[]>([]);
  
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [viewMode, setViewMode] = useState<'new' | 'edit' | null>(null); // ✅ جديد: لمعرفة وضع العرض

  const [studentsList, setStudentsList] = useState<Student[]>([]);

  // === 1. جلب الصفوف الدراسية ===
  useEffect(() => {
    const fetchGrades = async () => {
      if (!schoolName || !stageName) return;
      setLoadingGrades(true);
      try {
        const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
        const result = await res.json();
        if (result.success && result.data) setGradesList(result.data);
      } catch (err) { console.error(err); }
      finally { setLoadingGrades(false); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  // === 2. جلب الشعب الخاصة بالصف المختار ===
  useEffect(() => {
    if (!selectedGradeId || !schoolId) {
      setDivisionsList([]);
      return;
    };
    const fetchDivisions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/getData1/32?id=${schoolId}`);
        const result = await res.json();
        if (result.data) {
          const filtered = result.data.filter((d: any) => d['الصف'] === selectedGradeName);
          setDivisionsList(filtered);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchDivisions();
    setStudentsList([]);
    setSelectedDivisionId(null);
    setViewMode(null);
  }, [selectedGradeId, selectedGradeName, schoolId]);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedGradeId(id);
    const gradeObj = gradesList.find(g => g['الرقم'] === id);
    if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
  };

  // === 3. جلب الطلاب (توزيع جديد أو تعديل) ===
  const handleShowStudents = async (mode: 'new' | 'edit') => {
    if (!schoolName || !stageName || !work?.yearName || !selectedGradeName) {
      alert('تأكد من اختيار الصف وتوفر كل البيانات');
      return;
    }
    
    // ✅ لو تعديل، لازم يختار شعبة عشان يعرف ينقلهم منها (اختياري بس للفلترة)
    if (mode === 'edit' && !selectedDivisionId) {
      alert('اختر الشعبة التي تريد تعديل طلابها');
      return;
    }
    
    setLoading(true);
    setViewMode(mode);
    try {
      // ✅ 3 = غير موزعين | 13 = موزعين (للتعديل)
      const inpot = mode === 'new' ? 18 : 19;
      const res = await fetch(`${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${work.yearName}&SCHER4=${selectedGradeName}&inpot=${inpot}`);
      const result = await res.json();
      
      if (result.success && result.data && result.data.length > 0) {
        setStudentsList(result.data.map((s: any) => ({ 
          StudentID: s['الرقم'], 
          ArbStudName: s['الاسم بالعربى'], 
          CurrentDivision: s['الشعبة الحالية'] || '-', // ✅ أخذ الشعبة الحالية
          selected: false 
        })));
      } else {
        alert(mode === 'new' ? 'لا يوجد طلاب غير موزعين' : 'لا يوجد طلاب موزعين في هذه الشعبة');
        setStudentsList([]);
      }
    } catch (err) { alert('حدث خطأ في الاتصال'); } 
    finally { setLoading(false); }
  };

  // === 4. دالة الحفظ (موحدة للتوزيع والتعديل) ===
  const handleSave = async () => {
    const selected = studentsList.filter(s => s.selected);
    if (selected.length === 0) return alert('اختر طلاب أولاً');
    if (!selectedDivisionId) return alert('اختر الشعبة المستهدفة');

    setLoading(true);
    try {
      const promises = selected.map(st => {
        return fetch(`${API_URL}/api/manage-three-int`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sch1: st.StudentID,       
            sch2: selectedGradeId,    
            sch3: selectedDivisionId, 
            input: 5                  
          })
        }).then(res => res.json());
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      alert(`✅ تم ${viewMode === 'edit' ? 'تعديل' : 'توزيع'} ${successCount} طالب بنجاح`);
      
      // تحديث القائمة بعد الحفظ
      if (viewMode === 'new') handleShowStudents('new');
      else handleShowStudents('edit');
      
    } catch (err) { alert('❌ حدث خطأ أثناء الحفظ'); } 
    finally { setLoading(false); }
  };

  // --- Styles ---
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(124, 58, 237, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #ede9fe', borderTop: '5px solid #7c3aed' };
  
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const buttonStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s', color: 'white' };
  const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', color: '#374151' };
  const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '14px' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>📚 توزيع الطلاب على الشعب</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>توزيع جديد أو تعديل توزيع سابق</p>
        </div>
        <div style={{ fontSize: '50px' }}>🧩</div>
      </div>

      <div style={cardStyle}>
        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px', padding: '20px', background: '#faf5ff', borderRadius: '15px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>المدرسة</label>
            <input type="text" value={schoolName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>المرحلة</label>
            <input type="text" value={stageName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>العام الدراسي</label>
            <input type="text" value={work?.yearName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
          </div>
        </div>

        {/* Selection Area */}
        <div style={{ border: '2px solid #ede9fe', padding: '25px', borderRadius: '15px' }}>
          <h3 style={{ marginTop: 0, color: '#6d28d9' }}>اختيار الصف والشعبة</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>١. اختر الصف الدراسي</label>
              <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle} disabled={loadingGrades}>
                <option value="">{loadingGrades ? 'جاري التحميل...' : '-- اختر الصف --'}</option>
                {gradesList.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
              </select>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>٢. اختر الشعبة</label>
              <select value={selectedDivisionId || ''} onChange={(e) => setSelectedDivisionId(Number(e.target.value))} style={inputStyle} disabled={!selectedGradeId || loading}>
                <option value="">-- اختر الشعبة --</option>
                {divisionsList.map(d => <option key={d['الرقم']} value={d['الرقم']}>{d['الشعبة']}</option>)}
              </select>
            </div>

            {/* ✅ الأزرار الجديدة */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => handleShowStudents('new')} 
                disabled={!selectedGradeId || loading} 
                style={{...buttonStyle, background: '#7c3aed', width: '100%', opacity: (!selectedGradeId || loading) ? 0.5 : 1}}
              >
                {loading && viewMode === 'new' ? 'جاري...' : '٣. توزيع جديد'}
              </button>
              <button 
                onClick={() => handleShowStudents('edit')} 
                disabled={!selectedGradeId || !selectedDivisionId || loading} 
                style={{...buttonStyle, background: '#ea580c', width: '100%', opacity: (!selectedGradeId || !selectedDivisionId || loading) ? 0.5 : 1}}
              >
                {loading && viewMode === 'edit' ? 'جاري...' : '٤. تعديل توزيع'}
              </button>
            </div>
          </div>

          {/* Students Table */}
          {studentsList.length > 0 && (
            <div style={{ marginTop: '20px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ 
                background: viewMode === 'edit' ? '#fff7ed' : '#faf5ff', 
                padding: '10px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
              }}>
                <span style={{ fontWeight: 'bold', color: viewMode === 'edit' ? '#ea580c' : '#6d28d9' }}>
                  {viewMode === 'edit' ? '🔄 الطلاب الموزعين (اختر للنقل)' : '➕ الطلاب المتاحين للتوزيع'}
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="checkbox" onChange={(e) => setStudentsList(studentsList.map(s => ({...s, selected: e.target.checked})))} />
                  تحديد الكل
                </label>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: viewMode === 'edit' ? '#ffedd5' : '#f3e8ff', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={thStyle}>اختر</th>
                      <th style={thStyle}>اسم الطالب</th>
                      {/* ✅ عمود الشعبة الحالية يظهر فقط في وضع التعديل */}
                      {viewMode === 'edit' && <th style={thStyle}>الشعبة الحالية</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map((s, idx) => (
                      <tr key={s.StudentID || idx} style={{ borderBottom: '1px solid #f3f4f6', background: s.selected ? (viewMode === 'edit' ? '#fff7ed' : '#ede9fe') : 'white' }}>
                        <td style={tdStyle}>
                          <input type="checkbox" checked={s.selected || false} onChange={() => setStudentsList(studentsList.map((st, i) => i === idx ? {...st, selected: !st.selected} : st))} />
                        </td>
                        <td style={tdStyle}>{s.ArbStudName}</td>
                        {viewMode === 'edit' && <td style={{...tdStyle, color: '#ea580c', fontWeight: 'bold'}}>{s.CurrentDivision}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: viewMode === 'edit' ? '#fff7ed' : '#faf5ff' }}>
                <span style={{ alignSelf: 'center', color: '#6b7280' }}>تم تحديد: {studentsList.filter(s => s.selected).length} طالب</span>
                <button onClick={handleSave} disabled={!selectedDivisionId || loading} style={{...buttonStyle, background: '#16a34a', opacity: !selectedDivisionId ? 0.5 : 1}}>
                  💾 {viewMode === 'edit' ? 'حفظ النقل' : 'حفظ التوزيع'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}