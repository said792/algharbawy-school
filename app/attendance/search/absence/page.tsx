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
  ArbStudName: string;
}

interface AbsenceResult {
  'الرقم': number;
  'اسم الطالب': string;
  'الفصل': string;
  'اليوم': string;
  'نوع الغياب': string;
}

export default function AbsenceSearchPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearName = work?.yearName;

  // === State ===
  const [activeTab, setActiveTab] = useState(1); // 1: بالاسم, 2: بالتاريخ

  // بيانات اختيار الصف والفصل والطالب
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // البحث بالتاريخ
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // النتائج وحالة التحميل
  const [results, setResults] = useState<AbsenceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // === جلب الصفوف ===
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

  // === جلب الفصول عند اختيار الصف ===
  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedGradeName) {
        setClasses([]);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`);
        const json = await res.json();
        if (json.success) setClasses(json.data);
      } catch (err) { console.error(err); setClasses([]); }
    };
    fetchClasses();
    setSelectedClassName('');
    setStudents([]);
    setSelectedStudentId(null);
  }, [selectedGradeName, schoolName, stageName]);

  // === جلب الطلاب عند اختيار الفصل ===
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassName) {
        setStudents([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedClassName}&inpot=4`);
        const json = await res.json();
        if (json.success && json.data) {
          setStudents(json.data.map((s: any) => ({
            StudentID: s['الرقم'] || s.StudentID,
            ArbStudName: s['الاسم بالعربى'] || s.ArbStudName
          })));
        } else {
          setStudents([]);
        }
      } catch (err) { console.error(err); setStudents([]); }
      finally { setLoading(false); }
    };
    fetchStudents();
    setSelectedStudentId(null);
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  const handleSearchByName = async () => {
  if (!selectedStudentId) return alert('يرجى اختيار الطالب');

  const studentObj = students.find(s => s.StudentID === selectedStudentId);
  if (!studentObj) return alert('الطالب غير موجود');

  setLoading(true);
  setSearched(true);
  setResults([]);

  try {
    const res = await fetch(`${API_URL}/api/search?scher=${encodeURIComponent(studentObj.ArbStudName)}&inpot=7`);
    const json = await res.json();

    if (json.success && json.data) setResults(json.data);
    else setResults([]);
  } catch (err) {
    console.error(err);
    alert('حدث خطأ في البحث');
  } finally {
    setLoading(false);
  }
};

  const handleSearchByDate = async () => {
    if (!selectedDate) return alert('يرجى اختيار التاريخ');
    setLoading(true);
    setSearched(true);
    setResults([]);
    try {
      const res = await fetch(`${API_URL}/api/scher1int1dat?sch=${schoolId}&SCHER2=${selectedDate}&inpot=1`);
      const json = await res.json();
      if (json.success && json.data) setResults(json.data);
      else setResults([]);
    } catch (err) { console.error(err); alert('حدث خطأ في البحث'); }
    finally { setLoading(false); }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #ede9fe', borderTop: '5px solid #8b5cf6' };
  
  const tabsContainerStyle: React.CSSProperties = { display: 'flex', gap: '10px', marginBottom: '25px' };
  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '15px', border: 'none', borderRadius: '10px', cursor: 'pointer',
    background: active ? '#8b5cf6' : '#ede9fe', color: active ? 'white' : '#5b21b6',
    fontWeight: 'bold', fontSize: '16px', transition: '0.3s'
  });

  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const buttonStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s', color: 'white', height: 'fit-content' };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>🔍 البحث عن الغياب</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>البحث بسجل غياب الطلاب بالاسم أو التاريخ</p>
        </div>
        <div style={{ fontSize: '50px' }}>📅</div>
      </div>

      {/* Tabs */}
      <div style={tabsContainerStyle}>
        <button onClick={() => { setActiveTab(1); setResults([]); setSearched(false); }} style={tabButtonStyle(activeTab === 1)}>1️⃣ البحث بالاسم</button>
        <button onClick={() => { setActiveTab(2); setResults([]); setSearched(false); }} style={tabButtonStyle(activeTab === 2)}>2️⃣ البحث بالتاريخ</button>
      </div>

      {/* Search Card */}
      <div style={cardStyle}>
        {/* Tab 1: Name Search */}
        {activeTab === 1 && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>الصف</label>
                <select value={selectedGradeId || ''} onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedGradeId(id);
                  const gradeObj = grades.find(g => g['الرقم'] === id);
                  if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
                }}>
                  <option value="">-- اختر الصف --</option>
                  {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>الفصل</label>
                <select value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)} disabled={!selectedGradeName}>
                  <option value="">-- اختر الفصل --</option>
                  {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                </select>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>الطالب</label>
                <input list="studentsList" value={students.find(s => s.StudentID === selectedStudentId)?.ArbStudName || ''} 
                  onChange={(e) => {
                    const s = students.find(st => st.ArbStudName === e.target.value);
                    setSelectedStudentId(s ? s.StudentID : null);
                  }}
                  placeholder="اختر أو اكتب اسم الطالب"
                  style={inputStyle}
                />
                <datalist id="studentsList">
                  {students.map(s => <option key={s.StudentID} value={s.ArbStudName} />)}
                </datalist>
              </div>
            </div>

            <button onClick={handleSearchByName} disabled={loading || !selectedStudentId} style={{...buttonStyle, background: '#8b5cf6'}}>
              {loading ? 'جاري...' : '🔍 بحث'}
            </button>
          </div>
        )}

        {/* Tab 2: Date Search */}
        {activeTab === 2 && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>تاريخ الغياب</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleSearchByDate} disabled={loading} style={{...buttonStyle, background: '#8b5cf6'}}>
              {loading ? 'جاري...' : '🔍 بحث'}
            </button>
          </div>
        )}
      </div>

      {/* Results Table */}
      {searched && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#5b21b6', marginBottom: '15px' }}>النتائج ({results.length})</h3>
          {results.length > 0 ? (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={thStyle}>م</th>
                    <th style={thStyle}>اسم الطالب</th>
                    <th style={thStyle}>الفصل</th>
                    <th style={thStyle}>التاريخ</th>
                    <th style={thStyle}>نوع الغياب</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={r['الرقم'] || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={{...tdStyle, fontWeight: 'bold'}}>{r['اسم الطالب']}</td>
                      <td style={tdStyle}>{r['الفصل']}</td>
                      <td style={tdStyle}>{r['اليوم']}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                          background: r['نوع الغياب'] === 'غائب بعذر' ? '#dcfce7' : '#fee2e2',
                          color: r['نوع الغياب'] === 'غائب بعذر' ? '#166534' : '#991b1b'
                        }}>
                          {r['نوع الغياب']}
                        </span>
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
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', color: '#374151' };
const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '14px' };