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

export default function StudentViolationPage() {
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

  // === بيانات العقوبات ===
  const [nextRecordId, setNextRecordId] = useState<number>(0);
  const [violationDate, setViolationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [violationDescription, setViolationDescription] = useState<string>('');
  const [parentContacted, setParentContacted] = useState<boolean>(false);
  const [punishmentDescription, setPunishmentDescription] = useState<string>('');
  const [punishmentStatus, setPunishmentStatus] = useState<string>('لم يتم');
  const [confirmedByPrincipal, setConfirmedByPrincipal] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

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
    setSelectedClassName('');
    setStudents([]);
    setSelectedStudentId(null);

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

  // === 3. جلب الطلاب ===
  useEffect(() => {
    const fetchStudents = async () => {
        if (!selectedClassName || !schoolName || !stageName || !yearName || !selectedGradeName) {
            setStudents([]);
            return;
        }

        setLoadingStudents(true);
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
        finally { setLoadingStudents(false); }
    };

    if(selectedClassName) fetchStudents();
    setSelectedStudentId(null);
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  // === 4. جلب الرقم الأخير ===
  useEffect(() => {
    const fetchId = async () => {
        try {
            const res = await fetch(`${API_URL}/api/getData/24`);
            const data = await res.json();
            if (data.success && data.data?.[0]) {
                const id = Object.values(data.data[0])[0];
                setNextRecordId(Number(id) || 0);
            }
        } catch (e) { console.error(e); }
    };
    if (schoolId) fetchId();
  }, [schoolId]);

  // === Helpers ===
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

  const resetForm = () => {
      setViolationDescription('');
      setPunishmentDescription('');
      setParentContacted(false);
      setPunishmentStatus('لم يتم');
      setConfirmedByPrincipal(false);
      setViolationDate(new Date().toISOString().split('T')[0]);
      fetchNewId();
  };

  const fetchNewId = async () => {
      try {
            const res = await fetch(`${API_URL}/api/getData/24`);
            const data = await res.json();
            if (data.success && data.data?.[0]) {
                const id = Object.values(data.data[0])[0];
                setNextRecordId(Number(id) || 0);
            }
        } catch (e) { console.error(e); }
  };

  // === 5. الحفظ ===
  const handleSaveViolation = async () => {
    if (!selectedStudentId) return alert('اختر الطالب أولاً');
    if (!violationDescription) return alert('اكتب وصف المخالفة');

    setLoading(true);
    try {
        const payload = {
            ViolationID: nextRecordId,
            StudentID: selectedStudentId,
            ViolationDescription: violationDescription,
            ViolationDate: violationDate,
            ParentContacted: parentContacted,
            PunishmentDescription: punishmentDescription,
            PunishmentStatus: punishmentStatus,
            ConfirmedByPrincipal: confirmedByPrincipal,
            INPOT: 1
        };

        const res = await fetch(`${API_URL}/api/students/violation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            alert(`✅ تم تسجيل العقوبة للطالب: ${data.studentName}`);
            resetForm();
            setSelectedStudentId(null);
        } else {
            alert(`❌ خطأ: ${data.error || 'حدث خطأ غير متوقع'}`);
        }

    } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ في الاتصال');
    } finally {
        setLoading(false);
    }
};

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #ef4444, #f43f5e)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #fee2e2', borderTop: '5px solid #ef4444' };
  
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const textAreaStyle: React.CSSProperties = { ...inputStyle, minHeight: '100px', resize: 'vertical' };
  const buttonStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s', color: 'white' };
  const checkboxContainer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>⚖️ تسجيل عقوبة / مخالفة طالب</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>تسجيل المخالفات السلوكية والعقوبات</p>
        </div>
        <div style={{ fontSize: '50px' }}>🚫</div>
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
                    onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedStudentId(id);
                        const st = students.find(s => s.StudentID === id);
                        if(st) setSelectedStudentName(st.ArbStudName);
                    }} 
                    style={{...inputStyle, borderColor: selectedStudentId ? '#ef4444' : '#e5e7eb'}} 
                    disabled={!selectedClassName || loadingStudents}
                >
                    <option value="">{loadingStudents ? 'جاري...' : '-- اختر الطالب --'}</option>
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

      {/* Form Card */}
      {selectedStudentId && (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fee2e2', paddingBottom: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#b91c1c' }}>تفاصيل المخالفة</h3>
                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px' }}>
                    رقم القيد: {nextRecordId}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                
                {/* القسم الأول: بيانات المخالفة */}
                <div style={{ background: '#fff5f5', padding: '20px', borderRadius: '15px', border: '1px solid #fecaca' }}>
                    <h4 style={{ color: '#b91c1c', marginTop: 0 }}>المخالفة</h4>
                    
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>تاريخ المخالفة</label>
                        <input type="date" value={violationDate} onChange={(e) => setViolationDate(e.target.value)} style={inputStyle} />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>وصف المخالفة</label>
                        <textarea 
                            value={violationDescription} 
                            onChange={(e) => setViolationDescription(e.target.value)} 
                            style={textAreaStyle} 
                            placeholder="اكتب تفاصيل المخالفة هنا..."
                        />
                    </div>
                </div>

                {/* القسم الثاني: متابعة العقوبة */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ color: '#475569', marginTop: 0 }}>المتابعة والعقوبة</h4>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>وصف العقوبة</label>
                        <input 
                            type="text" 
                            value={punishmentDescription} 
                            onChange={(e) => setPunishmentDescription(e.target.value)} 
                            style={inputStyle} 
                            placeholder="مثال: فصل مؤقت / لفت نظر"
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>حالة العقوبة</label>
                        <select value={punishmentStatus} onChange={(e) => setPunishmentStatus(e.target.value)} style={inputStyle}>
                            <option value="لم يتم">لم يتم</option>
                            <option value="قيد التنفيذ">قيد التنفيذ</option>
                            <option value="تم التنفيذ">تم التنفيذ</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                        <label style={checkboxContainer}>
                            <input type="checkbox" checked={parentContacted} onChange={(e) => setParentContacted(e.target.checked)} />
                            <span style={{ fontSize: '14px', color: '#334155' }}>تم التواصل مع ولي الأمر</span>
                        </label>

                        <label style={checkboxContainer}>
                            <input type="checkbox" checked={confirmedByPrincipal} onChange={(e) => setConfirmedByPrincipal(e.target.checked)} />
                            <span style={{ fontSize: '14px', color: '#334155' }}>اعتماد وكيل/مدير المدرسة</span>
                        </label>
                    </div>
                </div>

            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button 
                    onClick={handleSaveViolation} 
                    disabled={loading || !violationDescription}
                    style={{ 
                        ...buttonStyle, 
                        background: 'linear-gradient(135deg, #ef4444, #f43f5e)',
                        padding: '15px 60px',
                        fontSize: '18px',
                        borderRadius: '15px',
                        boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
                        opacity: (loading || !violationDescription) ? 0.5 : 1
                    }}
                >
                    {loading ? 'جاري الحفظ...' : '💾 تسجيل العقوبة'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}