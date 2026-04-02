'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface Term { 'الرقم': number; 'التيرم': string; }
interface Subject { SubjectGradeID: number; SabgekName: string; }
interface Month { 'الرقم': number; 'شهر الاختبار': string; }

export default function EvaluationGradesPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const yearId = work?.yearId || 0;
    const mrahelId = work?.stageId || 0;

    const [grades, setGrades] = useState<Grade[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [months, setMonths] = useState<Month[]>([]);

    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedTermName, setSelectedTermName] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);

    const [gridData, setGridData] = useState<any[]>([]);
    const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
    
    const [maxGradesMap, setMaxGradesMap] = useState<Record<string, number>>({});
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // === 1. جلب البيانات الأساسية ===
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
            const res = await fetch(`${API_URL}/api/getData1/24?id=${selectedGradeId}`);
            const json = await res.json();
            if (json.success) setSubjects(json.data);
        };
        fetchSubjects();
    }, [selectedGradeId]);

    // === 3. جلب الشهور ===
    useEffect(() => {
        if (!selectedTermId || !selectedTermName) { setMonths([]); return; }
        const fetchMonths = async () => {
            const res = await fetch(`${API_URL}/api/search/complex?sch1=${schoolId}&sch2=${yearId}&sch3=${selectedTermName}&inpout=12`);
            const json = await res.json();
            if (json.success) setMonths(json.data);
        };
        fetchMonths();
    }, [selectedTermId, selectedTermName, yearId]);

    // === 4. تغيير التيرم ===
    const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value);
        setSelectedTermId(id);
        const termObj = terms.find(t => t['الرقم'] === id);
        setSelectedTermName(termObj?.['التيرم'] || '');
    };

    // === 5. جلب أقصى درجات الأجزاء ===
    useEffect(() => {
        if (!selectedSubjectId) { setMaxGradesMap({}); return; }
        const fetchMaxGrades = async () => {
            try {
                const res = await fetch(`${API_URL}/api/subjects/parts-max/${selectedSubjectId}`);
                const json = await res.json();
                if (json.success && json.data) {
                    const map: Record<string, number> = {};
                    json.data.forEach((p: any) => {
                        map[p.PartName] = p.PartGrade || 0;
                    });
                    setMaxGradesMap(map);
                }
            } catch(e) { console.error(e); }
        };
        fetchMaxGrades();
    }, [selectedSubjectId]);

    // === 6. عرض البيانات ===
    const handleShowData = async (mode: 5 | 6 | 7) => {
        if (!selectedGradeId || !selectedTermId || !selectedSubjectId || !selectedMonthId) {
            return alert('من فضلك اكمل اختيار البيانات');
        }
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
                    MonesID: selectedMonthId,
                    SabgektID: selectedSubjectId,
                    INPOT: mode
                })
            });

            const json = await res.json();
            if (json.success && json.data) {
                setGridData(json.data);
                if (json.data.length > 0) {
                    const keys = Object.keys(json.data[0]).filter(k => k !== 'StudentID');
                    setDynamicColumns(keys);
                } else {
                    setDynamicColumns([]);
                }
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

    // === 7. ✅ حساب المجموع (للأجزاء فقط بدون المجموع نفسه) ===
    const calculateTotal = (row: any): number => {
        let total = 0;
        dynamicColumns.forEach(col => {
            // نستبعد الأعمدة الأساسية وعمود "المجموع" نفسه
            if (['اسم الطالب', 'رقم الجلوس', 'الرقم السرى', 'درجة الاختبار', 'المجموع', 'اللون'].includes(col)) return;
            const val = Number(row[col]);
            if (!isNaN(val)) total += val;
        });
        return total;
    };

    // === 8. ✅ التعامل مع تغيير الدرجات (مع الحفاظ على الحساب التلقائي) ===
    const handleGradeChange = (studentId: number, columnName: string, value: string) => {
        if (value !== '' && isNaN(Number(value))) return;

        const entered = Number(value);
        const max = maxGradesMap[columnName] || 0;
        if (max > 0 && entered > max) {
            alert(`❌ أقصى درجة لـ "${columnName}" هي ${max}`);
            return;
        }

        setGridData(prev => prev.map(row => {
            if (row.StudentID === studentId) {
                const newRow = { ...row, [columnName]: value };
                
                // ✅ لو التغيير مش في عمود "المجموع"، نعيد حساب المجموع تلقائياً
                // ده يحقق: لو في أجزاء، المجموع يحسب لوحده. لو مفيش غير المجموع، المستخدم يكتبه يدوي.
                if (columnName !== "المجموع") {
                    newRow["المجموع"] = calculateTotal(newRow);
                }
                return newRow;
            }
            return row;
        }));
    };

    // === 9. تنقل بالأسهم ===
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentRowIndex: number, columnName: string) => {
        const inputs = document.querySelectorAll(`input[data-col="${columnName}"]`);
        const inputsArray = Array.from(inputs);
        const currentIndex = inputsArray.indexOf(e.currentTarget);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentIndex < inputsArray.length - 1) {
                (inputsArray[currentIndex + 1] as HTMLInputElement).focus();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
                (inputsArray[currentIndex - 1] as HTMLInputElement).focus();
            }
        }
    };

    // === 10. تلوين عمود "اللون" ===
    const getCellStyle = (row: any, colName: string): React.CSSProperties => {
        if (colName !== 'اللون') return {};

        const total = Number(row['المجموع'] || 0);
        const max = maxGradesMap['المجموع'] || 0;
        if (max === 0) return {};

        const percent = (total / max) * 100;
        if (percent >= 85) return { backgroundColor: '#3b82f6', color: 'white' }; 
        if (percent >= 65) return { backgroundColor: '#22c55e', color: 'white' }; 
        if (percent >= 50) return { backgroundColor: '#eab308', color: 'black' }; 
        if (percent > 0)   return { backgroundColor: '#ef4444', color: 'white' }; 
        
        return { backgroundColor: 'transparent' };
    };

    // === 11. الحفظ ===
    const handleSave = async () => {
        if (gridData.length === 0) return;
        setSaving(true);
        let count = 0;

        // ✅ هنحفظ كل الأعمدة ماعدا الأساسية وعمود "اللون" (هنحفظ "المجموع" كجزء عادي)
        const colsToSave = dynamicColumns.filter(c => 
            !['اسم الطالب', 'رقم الجلوس', 'الرقم السرى', 'درجة الاختبار', 'اللون'].includes(c)
        );

        for (const row of gridData) {
            for (const col of colsToSave) {
                const grade = row[col];
                // لو الدرج مش فاضي (أو صفر) نحفظ
                if (grade !== null && grade !== undefined && grade !== '') {
                    try {
                        await fetch(`${API_URL}/api/grades/evaluation/save`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                StudentID: row.StudentID,
                                SubjectGradeID: selectedSubjectId,
                                TermID: selectedTermId,
                                YearID: yearId,
                                MonthID: selectedMonthId,
                                PartNumber: 0,
                                PartName: col,
                                PartGrade: Number(grade) || 0
                            })
                        });
                        count++;
                    } catch (e) { console.error(e); }
                }
            }
        }

        alert(`✅ تم حفظ ${count} درجة بنجاح`);
        setSaving(false);
    };

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const btn: React.CSSProperties = { padding: '8px 15px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
    const inputStyle: React.CSSProperties = { width: '60px', padding: '6px', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', outline: 'none' };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{margin:0}}>📝 رصد درجات التقييمات</h2>
                <p style={{margin:'5px 0 0', opacity:0.8}}>تسجيل درجات أجزاء التقييم للطلاب</p>
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
                        <select value={selectedTermId || ''} onChange={handleTermChange} style={{width:'100%', padding:'8px'}}>
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
                    <div>
                        <label style={{fontWeight:'bold'}}>الشهر</label>
                        <select value={selectedMonthId || ''} onChange={e => setSelectedMonthId(Number(e.target.value))} style={{width:'100%', padding:'8px'}} disabled={!selectedTermId}>
                            <option value="">اختر</option>
                            {months.map(m => <option key={m['الرقم']} value={m['الرقم']}>{m['شهر الاختبار']}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleShowData(5)} disabled={loading} style={{...btn, background: '#10b981', color: 'white'}}>1️⃣ عرض بالاسم</button>
                    <button onClick={() => handleShowData(6)} disabled={loading} style={{...btn, background: '#3b82f6', color: 'white'}}>2️⃣ عرض برقم الجلوس</button>
                    <button onClick={() => handleShowData(7)} disabled={loading} style={{...btn, background: '#8b5cf6', color: 'white'}}>3️⃣ عرض بالرقم السري</button>
                </div>
            </div>

            {/* الجدول */}
            {gridData.length > 0 && (
                <div style={cardStyle}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                        <h3 style={{margin:0}}>الطلاب: {gridData.length}</h3>
                        <button onClick={handleSave} disabled={saving} style={{...btn, background: '#dc2626', color: 'white'}}>
                            {saving ? 'جاري الحفظ...' : '💾 حفظ الكل'}
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={thStyle}>م</th>
                                    {dynamicColumns.map(col => (
                                        <th key={col} style={thStyle}>
                                            {col}
                                            {maxGradesMap[col] ? <span style={{display:'block', fontSize:'10px', color:'#6b7280', fontWeight:'normal'}}>(من {maxGradesMap[col]})</span> : null}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {gridData.map((row, idx) => (
                                    <tr key={row.StudentID}>
                                        <td style={tdStyle}>{idx + 1}</td>
                                        
                                        {dynamicColumns.map(col => {
                                            const isReadOnlyText = ['اسم الطالب', 'رقم الجلوس', 'الرقم السرى', 'درجة الاختبار'].includes(col);
                                            const isColorCol = col === 'اللون';

                                            return (
                                            <td key={col} style={{...tdStyle, ...getCellStyle(row, col)}}>
                                                {isColorCol ? (
                                                    <span>&nbsp;</span>
                                                ) : isReadOnlyText ? (
                                                    <span style={{fontWeight: col === 'اسم الطالب' ? 'bold' : 'normal'}}>{row[col]}</span>
                                                ) : (
                                                    // ✅ المجموع هنا بقى Input عادي نقدر نكتب فيه
                                                    <input
                                                        type="number"
                                                        value={row[col] || ''}
                                                        onChange={(e) => handleGradeChange(row.StudentID, col, e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, idx, col)}
                                                        data-col={col}
                                                        style={inputStyle}
                                                    />
                                                )}
                                            </td>
                                            );
                                        })}
                                    </tr>
                                ))}
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