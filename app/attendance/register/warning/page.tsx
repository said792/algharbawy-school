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
}

interface AbsenceRecord {
  'الرقم': number;
  'اسم الطالب': string;
  'اليوم': string;
  'نوع الغياب': string;
}

export default function StudentWarningPage() {
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
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  const [hasDivisions, setHasDivisions] = useState(false);

  // بيانات الإحصائيات
  const [absenceWithExcuse, setAbsenceWithExcuse] = useState(0);
  const [absenceWithoutExcuse, setAbsenceWithoutExcuse] = useState(0);
  const [delays, setDelays] = useState(0);
  
  // بيانات الإنذار
  const [warningType, setWarningType] = useState<string>('أول');
  const [allowedDays, setAllowedDays] = useState<number>(5);
  
  // لتخزين الإنذارات السابقة
  const [existingWarnings, setExistingWarnings] = useState<string[]>([]); 

  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

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
    // لما الصف يتغير → نمسح الشعبة والفصول والطلاب
    setSelectedDivisionId(null);
    setSelectedDivisionName('');
    setSelectedClassName('');
    setClasses([]);
    setStudents([]);
    setSelectedStudentId(null);
    setHasDivisions(false);
    resetStats();

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
    // نمسح الفصول والطلاب بس (مش الشعبة!)
    setSelectedClassName('');
    setStudents([]);
    setSelectedStudentId(null);
    resetStats();

    if (!selectedGradeId || !schoolName || !stageName || !selectedGradeName) {
      setClasses([]);
      return;
    }

    // لو في شعب ولسه ما اختارتش → فصول فاضية
    if (hasDivisions && !selectedDivisionName) {
      setClasses([]);
      return;
    }

    let cancelled = false;

    const fetchClasses = async () => {
      try {
        let classUrl: string;
        if (hasDivisions && selectedDivisionName) {
          // scher4 INPOT=21 → فصول الشعبة
          classUrl = `${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&SCHER4=${selectedDivisionName}&inpot=21`;
        } else {
          // scher3 INPOT=3 → كل فصول الصف
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

  // === 3. جلب الطلاب ===
  useEffect(() => {
    const fetchStudents = async () => {
        if (!selectedClassName || !schoolName || !stageName || !yearName || !selectedGradeName) {
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

    if(selectedClassName) fetchStudents();
    
    setSelectedStudentId(null);
    resetStats();
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

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

  const resetStats = () => {
    setAbsenceWithExcuse(0);
    setAbsenceWithoutExcuse(0);
    setDelays(0);
    setExistingWarnings([]); 
  };

  // === 4. جلب إحصائيات الغياب و الإنذارات السابقة ===
  const handleStudentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const studentId = Number(e.target.value);
    setSelectedStudentId(studentId);
    
    const studentObj = students.find(s => s.StudentID === studentId);
    if (studentObj) setSelectedStudentName(studentObj.ArbStudName);

    if (!studentId) {
        resetStats();
        return;
    }

    setLoadingStats(true);
    try {
        const resAbsence = await fetch(`${API_URL}/api/getData1/12?id=${studentId}`);
        const jsonAbsence = await resAbsence.json();
        if (jsonAbsence.success && jsonAbsence.data) {
            calculateAbsenceStats(jsonAbsence.data);
        } else {
            setAbsenceWithExcuse(0); setAbsenceWithoutExcuse(0); setDelays(0);
        }

        const resWarn = await fetch(`${API_URL}/api/getData1/64?id=${studentId}`);
        const jsonWarn = await resWarn.json();
        
        if (jsonWarn.success && jsonWarn.data) {
            const types = jsonWarn.data.map((w: any) => w['نوع الإنذار'] || w.WarningType);
            setExistingWarnings(types);
        } else {
            setExistingWarnings([]);
        }

    } catch (err) {
        console.error(err);
        resetStats();
    } finally {
        setLoadingStats(false);
    }
  };

  const calculateAbsenceStats = (data: AbsenceRecord[]) => {
    let withExcuse = 0;
    let withoutExcuse = 0;
    let delay = 0;

    data.forEach(record => {
        const type = record['نوع الغياب'];
        if (type === 'غائب بعذر') withExcuse++;
        else if (type === 'غائب بدون عذر') withoutExcuse++;
        else if (type === 'تأخير') delay++;
    });

    setAbsenceWithExcuse(withExcuse);
    setAbsenceWithoutExcuse(withoutExcuse);
    setDelays(delay);
  };

  const totalAbsence = absenceWithExcuse + absenceWithoutExcuse;

  // === 5. دالة الحفظ ===
  const handleSaveWarning = async () => {
    if (!selectedStudentId) return alert('اختر الطالب أولاً');
    
    if (totalAbsence < allowedDays) {
        alert(`مجموع الغياب الحالي (${totalAbsence}) أقل من الحد المسموح (${allowedDays})، لا يمكن تسجيل إنذار.`);
        return;
    }

    if (existingWarnings.includes(warningType)) {
        alert(`❌ خطأ: الطالب لديه بالفعل إنذار (${warningType}) مسجل سابقاً. لا يمكن تكراره.`);
        return;
    }

    setLoading(true);
    try {
        const payload = {
            StudentID: selectedStudentId,
            WarningDate: new Date().toISOString().split('T')[0],
            TotalAbsenceDays: totalAbsence,
            WarningType: warningType,
            LastWarningDate: null,
            Notes: `تجاوز حد الغياب (المجموع: ${totalAbsence} أيام) - بعذر: ${absenceWithExcuse} - بدون عذر: ${absenceWithoutExcuse}`
        };

        const res = await fetch(`${API_URL}/api/warnings/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            alert(`✅ ${data.message}\nالطالب: ${data.data.studentName}`);
            setExistingWarnings(prev => [...prev, warningType]);
            setSelectedStudentId(null);
            resetStats();
        } else {
            alert(`❌ خطأ: ${data.message}`);
        }

    } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ في الاتصال بالسيرفر');
    } finally {
        setLoading(false);
    }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #fef3c7', borderTop: '5px solid #f59e0b' };
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const statBoxStyle: React.CSSProperties = { ...inputStyle, background: '#fffbeb', fontWeight: 'bold', textAlign: 'center', fontSize: '24px', color: '#b45309', border: '2px solid #fcd34d' };
  const buttonStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s', color: 'white' };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>⚠️ تسجيل إنذار طالب</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>عرض حالات الغياب المستحقة للإنذار وتسجيلها</p>
        </div>
        <div style={{ fontSize: '50px' }}>🔔</div>
      </div>

      {/* Filters Card */}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>١. الصف الدراسي</label>
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
                <label style={labelStyle}>{hasDivisions ? '٣. الفصل' : '٢. الفصل'}</label>
                <select 
                    value={selectedClassName} 
                    onChange={(e) => setSelectedClassName(e.target.value)} 
                    style={inputStyle} 
                    disabled={!selectedGradeId || (hasDivisions && !selectedDivisionName) || loading}
                >
                    <option value="">
                        {hasDivisions && !selectedDivisionName ? '-- اختر الشعبة أولاً --' : '-- اختر الفصل --'}
                    </option>
                    {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                </select>
            </div>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>{hasDivisions ? '٤. اسم الطالب' : '٣. اسم الطالب'}</label>
                <select 
                    value={selectedStudentId || ''} 
                    onChange={handleStudentChange} 
                    style={{...inputStyle, borderColor: selectedStudentId ? '#f59e0b' : '#e5e7eb'}} 
                    disabled={!selectedClassName || loadingStats}
                >
                    <option value="">{loadingStats ? 'جاري...' : '-- اختر الطالب --'}</option>
                    {students.map(s => <option key={s.StudentID} value={s.StudentID}>{s.ArbStudName}</option>)}
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

      {/* Stats & Save Card */}
      {selectedStudentId && (
        <div style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#b45309', borderBottom: '1px solid #fef3c7', paddingBottom: '10px' }}>
                إحصائيات الغياب
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px', background: '#fffbeb', padding: '20px', borderRadius: '10px', border: '1px solid #fcd34d' }}>
                 <div style={inputGroupStyle}>
                    <label style={labelStyle}>الحد الأقصى للأيام المسموح بها</label>
                    <input 
                        type="number" 
                        value={allowedDays} 
                        onChange={(e) => setAllowedDays(Number(e.target.value))} 
                        style={{...inputStyle, textAlign: 'center', fontWeight: 'bold', fontSize: '16px'}}
                        min="0"
                    />
                </div>

                 <div style={inputGroupStyle}>
                    <label style={labelStyle}>نوع الإنذار</label>
                    <select 
                        value={warningType} 
                        onChange={(e) => setWarningType(e.target.value)} 
                        style={{
                            ...inputStyle, 
                            fontWeight: 'bold', 
                            color: existingWarnings.includes(warningType) ? '#dc2626' : '#b45309',
                            borderColor: existingWarnings.includes(warningType) ? '#ef4444' : '#fcd34d'
                        }}
                    >
                        <option value="أول" disabled={existingWarnings.includes('أول')}>
                            إنذار أول {existingWarnings.includes('أول') && '(مسجل سابقاً)'}
                        </option>
                        <option value="ثاني" disabled={existingWarnings.includes('ثاني')}>
                            إنذار ثاني {existingWarnings.includes('ثاني') && '(مسجل سابقاً)'}
                        </option>
                        <option value="ثالث" disabled={existingWarnings.includes('ثالث')}>
                            إنذار ثالث {existingWarnings.includes('ثالث') && '(مسجل سابقاً)'}
                        </option>
                    </select>
                    {existingWarnings.includes(warningType) && (
                        <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '5px' }}>
                            ⚠️ هذا الإنذار مسجل بالفعل للطالب!
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>غياب بعذر</label>
                    <input type="text" value={absenceWithExcuse} readOnly style={statBoxStyle} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>غياب بدون عذر</label>
                    <input type="text" value={absenceWithoutExcuse} readOnly style={{...statBoxStyle, color: '#dc2626', background: '#fef2f2', borderColor: '#fca5a5'}} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>تأخير</label>
                    <input type="text" value={delays} readOnly style={statBoxStyle} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={{...labelStyle, color: '#b91c1c'}}>المجموع الكلي</label>
                    <input type="text" value={totalAbsence} readOnly style={{...statBoxStyle, background: '#fee2e2', borderColor: '#f87171', color: '#b91c1c'}} />
                </div>
            </div>

            {totalAbsence >= allowedDays ? (
                <div style={{ background: '#fff7ed', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #fed7aa', color: '#9a3412' }}>
                    <strong>⚠️ تنبيه:</strong> الطالب تجاوز الحد المسموح ({allowedDays} أيام). 
                    <br />
                    مجموع الغياب: <strong>{totalAbsence}</strong> يوم (بعذر: {absenceWithExcuse} + بدون عذر: {absenceWithoutExcuse}).
                </div>
            ) : (
                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #bbf7d0', color: '#166534' }}>
                    <strong>✅ وضع الطالب:</strong> المجموع ({totalAbsence}) أقل من الحد المسموح ({allowedDays}).
                </div>
            )}

            <div style={{ textAlign: 'center' }}>
                <button 
                    onClick={handleSaveWarning} 
                    disabled={loading || totalAbsence < allowedDays || existingWarnings.includes(warningType)}
                    style={{ 
                        ...buttonStyle, 
                        background: (existingWarnings.includes(warningType)) ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #f97316)',
                        padding: '15px 60px',
                        fontSize: '18px',
                        borderRadius: '15px',
                        boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3)',
                        opacity: (loading || totalAbsence < allowedDays || existingWarnings.includes(warningType)) ? 0.6 : 1,
                        cursor: (existingWarnings.includes(warningType)) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'جاري الحفظ...' : `💾 تسجيل إنذار (${warningType})`}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}