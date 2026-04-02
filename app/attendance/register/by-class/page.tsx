'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

interface DivisionItem {
  'الرقم': number;
  'الشعبة': string;
  'الصف'?: string;
  'المرحلة'?: string;
  'MrahelID'?: number;
}

interface ClassItem {
  'الرقم': number;
  'الفصل': string;
}

interface Student {
  StudentID: number;
  ArbStudName: string;
  selected?: boolean;
}

export default function StudentAbsencePage() {
  const { user, work } = useAuthStore();
  
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const stageId = work?.stageId;
  const yearName = work?.yearName;

  // === State ===
  const [grades, setGrades] = useState<Grade[]>([]);
  const [divisionsList, setDivisionsList] = useState<DivisionItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
  const [selectedDivisionName, setSelectedDivisionName] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');

  const [hasDivisions, setHasDivisions] = useState(false);

  const [absentDate, setAbsentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [absentReason, setAbsentReason] = useState<string>('غائب بعذر');
  const [nextRecordId, setNextRecordId] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // === 1. جلب الصفوف ===
  useEffect(() => {
    const fetchGrades = async () => {
        if (!schoolName || !stageName) return;
        setLoadingGrades(true);
        try {
            const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
            const json = await res.json();
            if (json.success) setGrades(json.data);
        } catch (err) { console.error(err); } 
        finally { setLoadingGrades(false); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  // ✅ Effect A: جلب الشعب فقط (يشتغل لما الصف يتغير)
  useEffect(() => {
    setSelectedDivisionId(null);
    setSelectedDivisionName('');
    setSelectedClassName('');
    setClasses([]);
    setStudents([]);
    setHasDivisions(false);

    if (!selectedGradeId || !schoolName || !stageName || !selectedGradeName) return;

    let cancelled = false;

    const fetchDivisions = async () => {
      try {
        const divRes = await fetch(`${API_URL}/api/getData1/32?id=${schoolId}`);
        const divResult = await divRes.json();
        if (cancelled) return;
        const stageDivisions = divResult.data ? divResult.data.filter((d: any) => {
          return d['الصف'] === selectedGradeName &&
            (d['المرحلة'] === stageName || d['MrahelID'] === stageId);
        }) : [];

        setDivisionsList(stageDivisions);
        setHasDivisions(stageDivisions.length > 0);
      } catch (err) { console.error(err); }
    };

    fetchDivisions();
    return () => { cancelled = true; };
  }, [selectedGradeId, selectedGradeName, schoolName, stageName, schoolId, stageId]);

  // ✅ Effect B: جلب الفصول فقط (يشتغل لما الشعبة تتغير أو الصف بدون شعب)
  useEffect(() => {
    setSelectedClassName('');
    setStudents([]);

    if (!selectedGradeId || !schoolName || !stageName || !selectedGradeName) {
      setClasses([]);
      return;
    }

    if (hasDivisions && !selectedDivisionName) {
      setClasses([]);
      return;
    }

    let cancelled = false;

    const fetchClasses = async () => {
      try {
        let classUrl: string;
        if (hasDivisions && selectedDivisionName) {
          classUrl = `${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&SCHER4=${selectedDivisionName}&inpot=21`;
        } else {
          classUrl = `${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`;
        }
        const classRes = await fetch(classUrl);
        const classResult = await classRes.json();
        if (cancelled) return;
        setClasses(classResult.success && classResult.data ? classResult.data : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setClasses([]);
      }
    };

    fetchClasses();
    return () => { cancelled = true; };
  }, [selectedGradeId, selectedGradeName, schoolName, stageName, selectedDivisionName, hasDivisions]);

  // === 3. جلب الرقم الأخير ===
  useEffect(() => {
    const fetchId = async () => {
        try {
            const res = await fetch(`${API_URL}/api/getData/20`);
            const data = await res.json();
            if (data.success && data.data?.[0]) {
                const id = Object.values(data.data[0])[0];
                setNextRecordId(Number(id) || 0);
            }
        } catch (e) { console.error(e); }
    };
    if (schoolId) fetchId();
  }, [schoolId]);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedGradeId(id);
    const gradeObj = grades.find(g => g['الرقم'] === id);
    if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedDivisionId(id);
    const divObj = divisionsList.find(d => d['الرقم'] === id);
    setSelectedDivisionName(divObj ? divObj['الشعبة'] : '');
  };

  // === 4. جلب الطلاب ===
  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const className = e.target.value;
    setSelectedClassName(className);

    if (!className || !schoolName || !stageName || !yearName || !selectedGradeName) {
        setStudents([]);
        return;
    }

    setLoading(true);
    try {
        const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${className}&inpot=4`);
        const json = await res.json();
        
        if (json.success && json.data) {
            setStudents(json.data.map((s: any) => ({
                StudentID: s['الرقم'] || s.StudentID,
                ArbStudName: s['الاسم بالعربى'] || s.ArbStudName,
                selected: false
            })));
        } else {
            setStudents([]);
        }
    } catch (err) { console.error(err); setStudents([]); } 
    finally { setLoading(false); }
  };

  // === دالة الحفظ (مصححة) ===
  const handleSaveAbsence = async () => {
    const absentStudents = students.filter(s => s.selected);
    
    if (absentStudents.length === 0) return alert('لم يتم تحديد أي طلاب غائبين');
    if (!absentDate) return alert('يرجى تحديد تاريخ الغياب');

    const today = new Date().toISOString().split('T')[0];
    if (absentDate > today) {
        return alert('لا يمكن تسجيل غياب بتاريخ مستقبلي');
    }

    setLoading(true);
    let successCount = 0;

    try {
        for (const st of absentStudents) {
            const payload = {
                studentId: st.StudentID,
                absentDate: absentDate,
                absentHala: absentReason,
                inpout: 3
            };

            const res = await fetch(`${API_URL}/api/students/absent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) successCount++;
        }

        alert(`✅ تم تسجيل غياب ${successCount} طالب بنجاح`);
        setNextRecordId(prev => prev + successCount);
        setStudents(prev => prev.map(s => ({...s, selected: false})));

    } catch (err) {
        alert('❌ حدث خطأ أثناء الحفظ');
    } finally {
        setLoading(false);
    }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #fee2e2', borderTop: '5px solid #dc2626' };
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const buttonStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s', color: 'white' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>缺席登记 (تسجيل الغياب)</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>تسجيل غياب طلاب الفصل الدراسي</p>
        </div>
        <div style={{ fontSize: '50px' }}>🚫</div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
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
                <input type="text" value={yearName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>١. اختر الصف الدراسي</label>
                <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle} disabled={loadingGrades}>
                    <option value="">{loadingGrades ? 'جاري...' : '-- اختر الصف --'}</option>
                    {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
            </div>

            {/* ✅ الشعبة - تظهر فقط لو فيها شعب */}
            {hasDivisions && (
              <div style={inputGroupStyle}>
                  <label style={labelStyle}>٢. الشعبة</label>
                  <select value={selectedDivisionId || ''} onChange={handleDivisionChange} style={inputStyle} disabled={!selectedGradeId}>
                      <option value="">-- اختر الشعبة --</option>
                      {divisionsList.map(d => <option key={d['الرقم']} value={d['الرقم']}>{d['الشعبة']}</option>)}
                  </select>
              </div>
            )}

            <div style={inputGroupStyle}>
                <label style={labelStyle}>{hasDivisions ? '٣. اختر الفصل' : '٢. اختر الفصل'}</label>
                <select 
                    value={selectedClassName} 
                    onChange={handleClassChange} 
                    style={inputStyle} 
                    disabled={!selectedGradeId || (hasDivisions && !selectedDivisionName) || loading}
                >
                    <option value="">
                        {hasDivisions && !selectedDivisionName ? '-- اختر الشعبة أولاً --' : '-- اختر الفصل --'}
                    </option>
                    {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                </select>
            </div>
        </div>

        {/* تنبيه الشعب */}
        {hasDivisions && (
            <div style={{ marginTop: '15px', background: '#fff7ed', border: '1px solid #ffedd5', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span style={{ color: '#9a3412', fontSize: '13px' }}>هذه المرحلة تحتوي على شعب. اختر الشعبة لعرض فصولها فقط.</span>
            </div>
        )}
      </div>

      {students.length > 0 && (
        <div style={cardStyle}>
            <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>تاريخ الغياب</label>
                        <input type="date" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} style={{...inputStyle, borderColor: '#fecaca'}} />
                    </div>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>السبب</label>
                        <select value={absentReason} onChange={(e) => setAbsentReason(e.target.value)} style={{...inputStyle, borderColor: '#fecaca'}}>
                            <option value="غائب بعذر">غائب بعذر</option>
                            <option value="غائب بدون عذر">غائب بدون عذر</option>
                            <option value="تأخير">تأخير</option>
                        </select>
                    </div>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>رقم القيد</label>
                        <input type="text" value={nextRecordId} readOnly style={{...inputStyle, background: '#fff', width: '80px', textAlign: 'center', fontWeight: 'bold', color: '#b91c1c'}} />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#b91c1c' }}>تحديد الكل:</span>
                    <input 
                        type="checkbox" 
                        onChange={(e) => setStudents(students.map(s => ({...s, selected: e.target.checked})))}
                        style={{ width: '20px', height: '20px', accentColor: '#dc2626' }}
                    />
                </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #fee2e2', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                        <tr>
                            <th style={thStyle}>حالة الغياب</th>
                            <th style={thStyle}>م</th>
                            <th style={thStyle}>اسم الطالب</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((s, idx) => (
                            <tr key={s.StudentID || idx} style={{ borderBottom: '1px solid #f3f4f6', background: s.selected ? '#fef2f2' : 'white' }}>
                                <td style={tdStyle}>
                                    <input 
                                        type="checkbox" 
                                        checked={s.selected || false} 
                                        onChange={() => setStudents(students.map((st, i) => i === idx ? {...st, selected: !st.selected} : st))} 
                                        style={{ width: '18px', height: '18px', accentColor: '#dc2626' }}
                                    />
                                </td>
                                <td style={tdStyle}>{idx + 1}</td>
                                <td style={{...tdStyle, fontWeight: 'bold'}}>{s.ArbStudName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                    onClick={handleSaveAbsence} 
                    disabled={loading}
                    style={{ ...buttonStyle, background: '#dc2626', padding: '15px 40px', fontSize: '16px', opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? 'جاري الحفظ...' : '💾 حفظ الغياب'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', color: '#374151' };
const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '14px' };