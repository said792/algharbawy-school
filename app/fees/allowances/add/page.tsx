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

interface ExitPermit {
  EzenStudID: number;
  StudentID: number;
  EzenStudDate: string;
  EzenStudTime: string;
  EzenStudSabb: string;
  EzenStudNo: number;
}

export default function ExitPermitPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const stageId = work?.stageId;
  const yearName = work?.yearName;
  const yearId = work?.yearId || 0;

  // بيانات الفلاتر
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

  // بيانات الإذن الجديد
  const [nextRecordId, setNextRecordId] = useState<number>(0);
  const [permitDate, setPermitDate] = useState(new Date().toISOString().split('T')[0]);
  const [permitTime, setPermitTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [permitReason, setPermitReason] = useState('');

  // النتائج والحالات
  const [permits, setPermits] = useState<ExitPermit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // === 1. جلب الصفوف ===
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

  // ✅ Effect A: جلب الشعب فقط (يشتغل لما الصف يتغير)
  useEffect(() => {
    setSelectedDivisionId(null);
    setSelectedDivisionName('');
    setSelectedClassName('');
    setClasses([]);
    setStudents([]);
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setPermits([]);
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
    setSelectedStudentName('');
    setPermits([]);

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
      if (!selectedClassName) { setStudents([]); return; }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedClassName}&inpot=4`);
        const json = await res.json();
        if (json.success && json.data) setStudents(json.data.map((s: any) => ({ StudentID: s['الرقم'], ArbStudName: s['الاسم بالعربى'] })));
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchStudents();
    setSelectedStudentId(null); setSelectedStudentName('');
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  // === 4. جلب آخر رقم للإذن (INPOT 47) ===
  useEffect(() => {
    const fetchId = async () => {
        try {
            const res = await fetch(`${API_URL}/api/getData/47`);
            const json = await res.json();
            if (json.success && json.data?.[0]) {
                const id = Object.values(json.data[0])[0];
                setNextRecordId(Number(id) || 0);
            }
        } catch(e) { console.error(e); }
    };
    if(schoolId) fetchId();
  }, [schoolId]);

  // === 5. جلب أذونات الطالب (بحث بالاسم + Mapping) ===
  useEffect(() => {
    const fetchStudentPermits = async () => {
        if (!selectedStudentName || !selectedStudentId) { 
            setPermits([]); 
            return; 
        }
        
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/search?scher=${encodeURIComponent(selectedStudentName)}&inpot=19`);
            const json = await res.json();
            
            if (json.success && json.data) {
                const mappedData: ExitPermit[] = json.data.map((item: any) => ({
                    EzenStudID: item['الرقم'],
                    StudentID: item['StudentID'] || item['رقم الطالب'],
                    EzenStudDate: item['تاريخ الاذن'],
                    EzenStudTime: item['وقت الخروج'],
                    EzenStudSabb: item['سبب الاذن'],
                    EzenStudNo: item['عدد الاذون']
                }));

                const filteredData = mappedData.filter(p => p.StudentID === selectedStudentId);
                setPermits(filteredData);
            } else {
                setPermits([]);
            }
        } catch(e) { 
            console.error(e); 
            setPermits([]);
        } finally { 
            setLoading(false); 
        }
    };

    fetchStudentPermits();
  }, [selectedStudentName, selectedStudentId]);

  // === دوال التفاعل ===
  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedDivisionId(id);
    const divObj = divisionsList.find(d => d['الرقم'] === id);
    setSelectedDivisionName(divObj ? divObj['الشعبة'] : '');
  };

  const handleSave = async () => {
    if (!selectedStudentId) return alert('اختر الطالب');
    if (!permitReason) return alert('اكتب سبب الإذن');

    setSaving(true);
    try {
        const permitCount = permits.length + 1; 

        const payload = {
            EzenStudID: nextRecordId,
            StudentID: selectedStudentId,
            EzenStudDate: permitDate,
            EzenStudTime: permitTime + ':00', 
            EzenStudSabb: permitReason,
            EzenStudNo: permitCount,
            YerID: yearId,
            INPOT: 1 
        };

        const res = await fetch(`${API_URL}/api/students/exit-permit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert('✅ تم تسجيل الإذن بنجاح');
            setNextRecordId(prev => prev + 1); 
            setPermitReason('');
            setPermits(prev => [...prev, { ...payload, EzenStudID: nextRecordId }]);
        } else {
            alert('❌ فشل الحفظ: ' + data.error);
        }
    } catch (e) { alert('خطأ في الاتصال'); } 
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل تريد حذف هذا الإذن؟')) return;

    try {
        const payload = { EzenStudID: id, StudentID: selectedStudentId, INPOT: 3 };
        const res = await fetch(`${API_URL}/api/students/exit-permit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert('تم الحذف');
            setPermits(prev => prev.filter(p => p.EzenStudID !== id));
        } else {
            alert('فشل الحذف');
        }
    } catch (e) { alert('خطأ'); }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f0f9ff', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(14, 165, 233, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e0f2fe' };
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#334155', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' };
  const buttonStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: 'white', transition: '0.2s' };
  
  const badgeStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', color: '#334155', border: '1px solid #e2e8f0' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>🚪 تسجيل إذن خروج</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>إدارة أذونات الخروج للطلاب</p>
        </div>
        <div style={{ fontSize: '50px' }}>📝</div>
      </div>

      {/* فلاتر الاختيار */}
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>١. الصف</label>
                <select value={selectedGradeId || ''} onChange={(e) => { const id = Number(e.target.value); setSelectedGradeId(id); const g = grades.find(x => x['الرقم'] === id); if(g) setSelectedGradeName(g['الصف الدراسى']); }} style={inputStyle}>
                    <option value="">اختر الصف</option>
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
                    disabled={!selectedGradeId || (hasDivisions && !selectedDivisionName)}
                >
                    <option value="">
                        {hasDivisions && !selectedDivisionName ? '-- اختر الشعبة أولاً --' : 'اختر الفصل'}
                    </option>
                    {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                </select>
            </div>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>{hasDivisions ? '٤. الطالب' : '٣. الطالب'}</label>
                <input 
                    list="studentsList" 
                    value={selectedStudentName} 
                    onChange={(e) => { 
                        const name = e.target.value;
                        setSelectedStudentName(name);
                        const s = students.find(x => x.ArbStudName === name); 
                        setSelectedStudentId(s ? s.StudentID : null); 
                    }} 
                    style={{...inputStyle, borderColor: selectedStudentId ? '#0ea5e9' : '#cbd5e1'}} 
                    placeholder="اختر الطالب" 
                    disabled={!selectedClassName}
                />
                <datalist id="studentsList">
                    {students.map(s => <option key={s.StudentID} value={s.ArbStudName} />)}
                </datalist>
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

      {/* نموذج الإذن */}
      {selectedStudentId && (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{color: '#0369a1', margin: 0}}>✍️ تسجيل إذن جديد</h3>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <span style={badgeStyle}>
                        🔢 رقم القيد: {nextRecordId}
                    </span>
                    <span style={{...badgeStyle, background: '#ecfeff', color: '#0e7490', borderColor: '#a5f3fc'}}>
                        📊 عدد الأذونات: {permits.length}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>التاريخ</label>
                    <input type="date" value={permitDate} onChange={(e) => setPermitDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>الوقت</label>
                    <input type="time" value={permitTime} onChange={(e) => setPermitTime(e.target.value)} style={inputStyle} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>السبب</label>
                    <input type="text" value={permitReason} onChange={(e) => setPermitReason(e.target.value)} style={inputStyle} placeholder="سبب الخروج" />
                </div>
            </div>

            <div style={{ marginTop: 20, textAlign: 'left' }}>
                <button onClick={handleSave} disabled={saving} style={{...buttonStyle, background: saving ? '#94a3b8' : '#0284c7', padding: '12px 40px'}}>
                    {saving ? 'جاري...' : '💾 تسجيل الإذن'}
                </button>
            </div>
        </div>
      )}

      {/* جدول الأذونات السابقة */}
      {selectedStudentId && permits.length > 0 && (
        <div style={cardStyle}>
            <h3 style={{color: '#0369a1', margin: '0 0 15px 0'}}>📜 الأذونات المسجلة سابقاً</h3>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead style={{ background: '#f1f5f9' }}>
                        <tr>
                            <th style={thStyle}>م</th>
                            <th style={thStyle}>التاريخ</th>
                            <th style={thStyle}>الوقت</th>
                            <th style={thStyle}>السبب</th>
                            <th style={thStyle}>إجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {permits.map((p, idx) => (
                            <tr key={p.EzenStudID || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={tdStyle}>{p.EzenStudNo || idx + 1}</td>
                                <td style={tdStyle}>{p.EzenStudDate ? p.EzenStudDate.split('T')[0] : '-'}</td>
                                <td style={tdStyle}>{p.EzenStudTime}</td>
                                <td style={tdStyle}>{p.EzenStudSabb}</td>
                                <td style={tdStyle}>
                                    <button onClick={() => handleDelete(p.EzenStudID)} style={{...buttonStyle, background: '#ef4444', padding: '5px 10px', fontSize: '12px'}}>🗑️ حذف</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
      
      {selectedStudentId && !loading && permits.length === 0 && (
         <div style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>لا توجد أذونات سابقة لهذا الطالب</div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', color: '#475569' };
const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '14px' };