'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface Term { 'الرقم': number; 'التيرم': string; }
interface Subject { SubjectGradeID: number; SabgekName: string; }

export default function ReExamGradesPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const yearId = work?.yearId || 0;
    const mrahelId = work?.stageId || 0; 

    const [grades, setGrades] = useState<Grade[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

    const [gridData, setGridData] = useState<any[]>([]);
    const [maxGrade, setMaxGrade] = useState<number>(0); 
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // === 1. جلب الصفوف والتيرمات ===
    useEffect(() => {
        const fetchInitial = async () => {
            const resG = await fetch(`${API_URL}/api/search2?SCHER1=${user?.schoolName}&SCHER2=${work?.stageName}&inpot=6`);
            if (resG.ok) { const json = await resG.json(); if (json.success) setGrades(json.data); }

            const resT = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
            if (resT.ok) { const json = await resT.json(); if (json.success) setTerms(json.data); }
        };
        if (schoolId) fetchInitial();
    }, [schoolId, yearId]);

    // === 2. جلب المواد ===
    useEffect(() => {
        if (!selectedGradeId) { setSubjects([]); return; }
        const fetchSubjects = async () => {
            const res = await fetch(`${API_URL}/api/getData1/45?id=${selectedGradeId}`);
            const json = await res.json();
            if (json.success) setSubjects(json.data);
        };
        fetchSubjects();
    }, [selectedGradeId]);

    // === 3. جلب أقصى درجة للمادة ===
    useEffect(() => {
        if (!selectedSubjectId) { setMaxGrade(0); return; }
        const fetchMaxGrade = async () => {
            try {
                const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${selectedSubjectId}&yearId=${selectedGradeId}&inpout=41`);
                const json = await res.json();
                if (json.success && json.data?.[0]) {
                    const val = Object.values(json.data[0])[0];
                    setMaxGrade(Number(val) || 0);
                }
            } catch (e) { console.error(e); setMaxGrade(0); }
        };
        fetchMaxGrade();
    }, [selectedSubjectId]);

    // === 4. عرض البيانات (INPOT 8, 9, 10) ===
    const handleShowData = async (inpot: 8 | 9 | 10) => {
        if (!selectedGradeId || !selectedTermId || !selectedSubjectId) {
            return alert('من فضلك اختر الصف والتيرم والمادة');
        }

        // === [التعديل] الشرط الجديد للتيرم ===
        const selectedTermName = terms.find(t => t['الرقم'] === selectedTermId)?.['التيرم'];
        // لو الاسم مش "الدور الثانى" يمنع العرض
        if (selectedTermName !== 'الدور الثانى') {
            return alert('⚠️ لا يسمح بالعرض إلا للدور الثانى فقط');
        }
        // =====================================

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/grades/evaluation/view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SchoolID: schoolId,
                    MrahelID: mrahelId,
                    YerID: yearId,
                    GereadID: selectedGradeId,
                    TiremID: selectedTermId,
                    MonesID: null,
                    SabgektID: selectedSubjectId,
                    INPOT: inpot
                })
            });

            const json = await res.json();
            if (json.success && json.data) {
                setGridData(json.data);
            } else {
                setGridData([]);
                alert('لا توجد بيانات');
            }
        } catch (err) {
            console.error(err);
            alert('خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    // === 5. تغيير الدرجات ===
    const handleGradeChange = (studentId: number, value: string) => {
        setGridData(prev => prev.map(row => 
            row.StudentID === studentId ? { ...row, 'درجة المادة': value } : row
        ));
    };

    // === 6. الحفظ ===
    const handleSave = async () => {
        if (gridData.length === 0) return;

        setSaving(true);
        let savedCount = 0;
        let errorMessages = '';

        for (const row of gridData) {
            const grade = String(row['درجة المادة'] ?? '').trim();
            if (grade === '') continue; 

            try {
                const res = await fetch(`${API_URL}/api/grades/exam/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        StudentID: row.StudentID,
                        SubjectGradeID: selectedSubjectId,
                        YearID: yearId,
                        TiremID: selectedTermId,
                        ExamGrade: grade
                    })
                });
                
                const json = await res.json();
                if (json.success) {
                    savedCount++;
                } else {
                    errorMessages += `طالب رقم ${row.StudentID}: ${json.error}\n`;
                }
            } catch (e) { 
                console.error('Error saving', e); 
            }
        }

        setSaving(false);
        
        if (errorMessages) {
            alert(`⚠️ تم الحفظ مع وجود أخطاء:\n${errorMessages}`);
        } else {
            alert(`✅ تم حفظ ${savedCount} درجة بنجاح`);
        }
    };

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const btn: React.CSSProperties = { padding: '8px 15px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
    const inputStyle: React.CSSProperties = { width: '70px', padding: '5px', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' };
    
    const maxGradeBoxStyle: React.CSSProperties = {
        background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '8px', 
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px'
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{margin:0}}>🔥 تسجيل درجات الدور الثانى</h2>
                <p style={{margin:'5px 0 0', opacity:0.9}}>تسجيل درجات دور ثانى للطلاب (بدون تحديد شهر)</p>
            </div>

            {/* الفلاتر */}
            <div style={cardStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                        <label style={{fontWeight:'bold'}}>الصف</label>
                        <select value={selectedGradeId || ''} onChange={e => setSelectedGradeId(Number(e.target.value))} style={{width:'100%', padding:'8px'}}>
                            <option value="">اختر</option>
                            {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{fontWeight:'bold'}}>التيرم</label>
                        <select value={selectedTermId || ''} onChange={e => setSelectedTermId(Number(e.target.value))} style={{width:'100%', padding:'8px'}}>
                            <option value="">اختر</option>
                            {terms.map(t => <option key={t['الرقم']} value={t['الرقم']}>{t['التيرم']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{fontWeight:'bold'}}>المادة</label>
                        <select value={selectedSubjectId || ''} onChange={e => setSelectedSubjectId(Number(e.target.value))} style={{width:'100%', padding:'8px'}} disabled={!selectedGradeId}>
                            <option value="">اختر</option>
                            {subjects.map(s => <option key={s.SubjectGradeID} value={s.SubjectGradeID}>{s.SabgekName}</option>)}
                        </select>
                    </div>
                </div>

                {selectedSubjectId && (
                    <div style={maxGradeBoxStyle}>
                        <span style={{fontWeight: 'bold', color: '#b91c1c'}}>📈 أقصى درجة للمادة:</span>
                        <input 
                            type="number" 
                            value={maxGrade} 
                            readOnly 
                            style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', padding: '5px' }}
                        />
                    </div>
                )}

                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleShowData(8)} disabled={loading} style={{...btn, background: '#0ea5e9', color: 'white'}}>
                        8️⃣ عرض بالاسم
                    </button>
                    <button onClick={() => handleShowData(9)} disabled={loading} style={{...btn, background: '#3b82f6', color: 'white'}}>
                        9️⃣ عرض برقم الجلوس
                    </button>
                    <button onClick={() => handleShowData(10)} disabled={loading} style={{...btn, background: '#8b5cf6', color: 'white'}}>
                        🔟 عرض بالرقم السرى
                    </button>
                </div>
            </div>

            {/* الجدول */}
            {gridData.length > 0 && (
                <div style={cardStyle}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                        <h3 style={{margin:0}}>الطلاب: {gridData.length}</h3>
                        <button onClick={handleSave} disabled={saving} style={{...btn, background: '#16a34a', color: 'white'}}>
                            {saving ? 'جاري الحفظ...' : '💾 حفظ الكل'}
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={thStyle}>م</th>
                                    <th style={thStyle}>الطالب / الرقم</th>
                                    <th style={thStyle}>درجة الدور التانى</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gridData.map((row, idx) => {
                                    const displayCol = row['اسم الطالب'] || row['رقم الجلوس'] || row['الرقم السرى'] || '---';
                                    const currentGrade = Number(row['درجة المادة']);
                                    const isOverLimit = currentGrade > maxGrade && maxGrade > 0;
                                    
                                    return (
                                        <tr key={row.StudentID}>
                                            <td style={tdStyle}>{idx + 1}</td>
                                            <td style={{...tdStyle, fontWeight: 'bold'}}>
                                                {displayCol}
                                            </td>
                                            <td style={tdStyle}>
                                                <input
                                                    type="text"
                                                    value={row['درجة المادة'] || ''}
                                                    onChange={(e) => handleGradeChange(row.StudentID, e.target.value)}
                                                    style={{
                                                        ...inputStyle,
                                                        border: isOverLimit ? '2px solid #dc2626' : '1px solid #ccc',
                                                        background: isOverLimit ? '#fef2f2' : 'white'
                                                    }}
                                                />
                                                {isOverLimit && <span style={{color:'#dc2626', fontSize:'10px', marginRight:'5px'}}>⚠️ تجاوز</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle: React.CSSProperties = { padding: '10px', borderBottom: '2px solid #e5e7eb', textAlign: 'center' };
const tdStyle: React.CSSProperties = { padding: '8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' };