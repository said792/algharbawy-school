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

export default function SingleStudentAbsencePage() {
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

  const [hasDivisions, setHasDivisions] = useState(false);

  // بيانات الغياب
  const [absentDate, setAbsentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [absentReason, setAbsentReason] = useState<string>('غائب بعذر');

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
    // لما الصف يتغير → نمسح الشعبة والفصول والطلاب
    setSelectedDivisionId(null);
    setSelectedDivisionName('');
    setSelectedClassName('');
    setClasses([]);
    setStudents([]);
    setSelectedStudentId(null);
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
    // نمسح الفصول والطلاب بس (مش الشعبة!)
    setSelectedClassName('');
    setStudents([]);
    setSelectedStudentId(null);

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

  // === 3. جلب الطلاب عند اختيار الفصل ===
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

    if (selectedClassName) fetchStudents();
    setSelectedStudentId(null);

  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  // === دوال تغيير القوائم ===
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

  const handleSaveSingle = async () => {
    if (!selectedStudentId) return alert('يرجى اختيار الطالب');
    if (!absentDate) return alert('يرجى تحديد التاريخ');

    // ✅ التحقق من أن التاريخ ليس مستقبلي
    const today = new Date().toISOString().split('T')[0];
    if (absentDate > today) {
        return alert('لا يمكن تسجيل غياب بتاريخ مستقبلي');
    }

    setLoading(true);
    try {
        const payload = {
            studentId: selectedStudentId,
            absentDate: absentDate,
            absentHala: absentReason,
            inpout: 3 // 3 = تعديل أو إضافة (Upsert)
        };

        const res = await fetch(`${API_URL}/api/students/absent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            alert(`✅ تم تسجيل الغياب بنجاح للطالب`);
        } else {
            alert('❌ فشل الحفظ: ' + (data.error || 'خطأ غير معروف'));
        }

    } catch (err) {
        alert('❌ حدث خطأ في الاتصال');
    } finally {
        setLoading(false);
    }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1000px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(14, 165, 233, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #e0f2fe', borderTop: '5px solid #0ea5e9' };
  
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const buttonStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s', color: 'white' };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>📝 تسجيل غياب فردي</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>اختر الطالب وتاريخ الغياب وسبب الانصراف</p>
        </div>
        <div style={{ fontSize: '50px' }}>👤</div>
      </div>

      {/* Main Card */}
      <div style={cardStyle}>
        {/* School Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px', padding: '15px', background: '#f0f9ff', borderRadius: '10px' }}>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>المدرسة</label>
                <input type="text" value={schoolName || ''} readOnly style={{...inputStyle, background: '#e0f2fe'}} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>المرحلة</label>
                <input type="text" value={stageName || ''} readOnly style={{...inputStyle, background: '#e0f2fe'}} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>العام الدراسي</label>
                <input type="text" value={yearName || ''} readOnly style={{...inputStyle, background: '#e0f2fe'}} />
            </div>
        </div>

        {/* Selection Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
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
        </div>

        {/* تنبيه الشعب */}
        {hasDivisions && (
            <div style={{ marginBottom: '20px', background: '#fff7ed', border: '1px solid #ffedd5', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span style={{ color: '#9a3412', fontSize: '13px' }}>هذه المرحلة تحتوي على شعب. اختر الشعبة لعرض فصولها فقط.</span>
            </div>
        )}

        {/* Student & Absence Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>{hasDivisions ? '٤. اسم الطالب' : '٣. اسم الطالب'}</label>
                <select 
                    value={selectedStudentId || ''} 
                    onChange={(e) => setSelectedStudentId(Number(e.target.value))} 
                    style={{...inputStyle, borderColor: '#0ea5e9', borderWidth: '2px'}}
                    disabled={!selectedClassName || loading}
                >
                    <option value="">{loading ? 'جاري التحميل...' : '-- اختر الطالب --'}</option>
                    {students.map(s => (
                        <option key={s.StudentID} value={s.StudentID}>
                            {s.ArbStudName}
                        </option>
                    ))}
                </select>
            </div>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>تاريخ الغياب</label>
                <input type="date" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} style={inputStyle} />
            </div>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>السبب</label>
                <select value={absentReason} onChange={(e) => setAbsentReason(e.target.value)} style={inputStyle}>
                    <option value="غائب بعذر">غائب بعذر</option>
                    <option value="غائب بدون عذر">غائب بدون عذر</option>
                    <option value="تأخير">تأخير</option>
                </select>
            </div>
        </div>

        {/* Save Button */}
        <div style={{ textAlign: 'center' }}>
            <button 
                onClick={handleSaveSingle} 
                disabled={loading || !selectedStudentId}
                style={{ 
                    ...buttonStyle, 
                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    padding: '15px 60px',
                    fontSize: '18px',
                    borderRadius: '15px',
                    boxShadow: '0 10px 15px -3px rgba(14, 165, 233, 0.3)',
                    opacity: (loading || !selectedStudentId) ? 0.5 : 1
                }}
            >
                💾 تسجيل الغياب
            </button>
        </div>
      </div>
    </div>
  );
}