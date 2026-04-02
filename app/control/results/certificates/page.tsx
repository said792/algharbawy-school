'use client';

import React, { useState, useEffect, DragEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface Term { 'الرقم': number; 'التيرم': string; }
interface Month { 'الرقم': number; 'شهر الاختبار': string; }
interface Subject { SubjectGradeID: number; SabgekName: string; }
interface StudentList { StudentID: number; ArbStudName: string; }

interface SchoolInfo {
    SchoolNam: string;
    ModriaNam: string;
    EdaraNam: string;
    Logo: string;
}

type DisplayReturn = string | { text: string; style: React.CSSProperties } | number;

export default function CertificatesPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const yearId = work?.yearId || 0;
    const mrahelId = work?.stageId || 0;

    // Filters
    const [grades, setGrades] = useState<Grade[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [months, setMonths] = useState<Month[]>([]);
    const [studentsList, setStudentsList] = useState<StudentList[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

    // Subjects Order & Settings
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
    const [orderedSubjects, setOrderedSubjects] = useState<string[]>([]);
    const [selectedMainSubjects, setSelectedMainSubjects] = useState<string[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Data States
    const [gridData, setGridData] = useState<any[]>([]);
    const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
    
    // Rankings
    const [topStudents, setTopStudents] = useState<any[]>([]); 
    const [selectedStudentRank, setSelectedStudentRank] = useState<any | null>(null);

    const [currentViewType, setCurrentViewType] = useState<number>(1);
    const [isYearMode, setIsYearMode] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    // === Styles ===
    const thStyle: React.CSSProperties = { padding: '6px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid #e5e7eb', fontSize: '12px' };
    const tdStyle: React.CSSProperties = { padding: '4px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', whiteSpace: 'nowrap', border: '1px solid #e5e7eb', fontSize: '11px' };

    // === Helper: Logo Parsing ===
    const parseLogo = (rawData: any): string => {
        if (!rawData) return '';
        if (typeof rawData === 'object' && rawData.type === 'Buffer' && Array.isArray(rawData.data)) {
            const bytes = new Uint8Array(rawData.data);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            return `data:image/png;base64,${window.btoa(binary)}`;
        }
        if (typeof rawData === 'string' && rawData.startsWith('0x')) {
            const hex = rawData.slice(2);
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            return `data:image/png;base64,${window.btoa(binary)}`;
        }
        if (typeof rawData === 'string' && rawData.startsWith('data:image')) return rawData;
        return '';
    };

    // === Effects (Data Fetching) ===
    useEffect(() => {
        const fetchInitial = async () => {
            if (user?.schoolName && work?.stageName) {
                const resG = await fetch(`${API_URL}/api/search2?SCHER1=${user.schoolName}&SCHER2=${work.stageName}&inpot=6`);
                if (resG.ok) { const json = await resG.json(); if (json.success) setGrades(json.data); }
            }
            const resT = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
            if (resT.ok) { const json = await resT.json(); if (json.success) setTerms(json.data); }
        };

        const fetchSchoolInfo = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData1/33?id=${schoolId}`);
                const json = await res.json();
                if (json.success && json.data?.[0]) {
                    const row = json.data[0];
                    const rawLogo = row['Image'] || row['Logo'] || row['SchoolImeg'] || row['SchoolImage'];
                    setSchoolInfo({
                        SchoolNam: row['SchoolNam'] || user?.schoolName || '',
                        ModriaNam: row['ModriaNam'] || '',
                        EdaraNam: row['EdaraNam'] || '',
                        Logo: parseLogo(rawLogo)
                    });
                }
            } catch (err) { console.error(err); }
        };

        if (schoolId) { fetchInitial(); fetchSchoolInfo(); }
    }, [schoolId, yearId, user, work]);

    useEffect(() => {
        if (!selectedTermId) { setMonths([]); return; }
        const termName = terms.find(t => t['الرقم'] === selectedTermId)?.['التيرم'] || '';
        if (!termName) return;
        const fetchMonths = async () => {
            const res = await fetch(`${API_URL}/api/search/complex?sch1=${schoolId}&sch2=${yearId}&sch3=${termName}&inpout=12`);
            const json = await res.json();
            if (json.success) setMonths(json.data);
        };
        fetchMonths();
    }, [selectedTermId, terms, schoolId, yearId]);

    useEffect(() => {
        if (!selectedGradeId) { setAvailableSubjects([]); setOrderedSubjects([]); setSelectedMainSubjects([]); setStudentsList([]); return; }

        const fetchSubjectsAndSettings = async () => {
            const resSub = await fetch(`${API_URL}/api/getData1/24?id=${selectedGradeId}`);
            const jsonSub = await resSub.json();
            let defaultSubjects: string[] = [];

            if (jsonSub.success) {
                const data: Subject[] = jsonSub.data;
                setAvailableSubjects(data);
                defaultSubjects = [...new Set(data.map((s: Subject) => s.SabgekName))];
            }

            try {
                const resOrder = await fetch(`${API_URL}/api/settings/subjects-settings`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ Mode: 2, Action: 'GET', SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId, GradeID: selectedGradeId, TirmID: selectedTermId || 0, MonesID: selectedMonthId || 0 })
                });
                const jsonOrder = await resOrder.json();
                if (jsonOrder.success && jsonOrder.data?.[0]?.OrderList) setOrderedSubjects(jsonOrder.data[0].OrderList.split(','));
                else setOrderedSubjects(defaultSubjects.sort());
            } catch (e) { setOrderedSubjects(defaultSubjects.sort()); }

            try {
                const resMain = await fetch(`${API_URL}/api/settings/subjects-settings`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ Mode: 1, Action: 'GET', SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId, GradeID: selectedGradeId, TirmID: selectedTermId || 0, MonesID: selectedMonthId || 0 })
                });
                const jsonMain = await resMain.json();
                if (jsonMain.success && jsonMain.data) setSelectedMainSubjects(jsonMain.data.map((r: any) => r.SabgekName));
                else setSelectedMainSubjects([]);
            } catch (e) { setSelectedMainSubjects([]); }
        };

        const fetchStudents = async () => {
            const res = await fetch(`${API_URL}/api/students/list?schoolId=${schoolId}&gradeId=${selectedGradeId}&yearId=${yearId}`);
            const json = await res.json();
            if (json.success) setStudentsList(json.data);
        };

        fetchSubjectsAndSettings();
        fetchStudents();

    }, [selectedGradeId, selectedTermId, selectedMonthId, schoolId, yearId, mrahelId]);

    // === Drag & Drop & Save ===
    const handleDragStart = (index: number) => (e: DragEvent<HTMLDivElement>) => { setDraggedIndex(index); e.dataTransfer.effectAllowed = "move"; };
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
    const handleDrop = (index: number) => (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const newOrder = [...orderedSubjects];
        const draggedItem = newOrder[draggedIndex];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(index, 0, draggedItem);
        setOrderedSubjects(newOrder);
        setDraggedIndex(null);
    };
    const handleDragEnd = () => setDraggedIndex(null);

    const saveOrder = async () => {
        if (!selectedGradeId) return;
        try {
            const res = await fetch(`${API_URL}/api/settings/subjects-settings`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Mode: 2, Action: 'SAVE', SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId, GradeID: selectedGradeId, TirmID: selectedTermId || 0, MonesID: selectedMonthId || 0, OrderList: orderedSubjects.join(',') })
            });
            const json = await res.json();
            alert(json.success ? '✅ تم حفظ الترتيب' : 'حدث خطأ');
        } catch (e) { alert('خطأ في الاتصال'); }
    };

    const saveMainSubjects = async () => {
        if (!selectedGradeId) return;
        try {
            const res = await fetch(`${API_URL}/api/settings/subjects-settings`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Mode: 1, Action: 'SAVE', SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId, GradeID: selectedGradeId, TirmID: selectedTermId || 0, MonesID: selectedMonthId || 0, Subjects: selectedMainSubjects.join(',') })
            });
            const json = await res.json();
            alert(json.success ? '✅ تم حفظ المواد الأساسية' : 'حدث خطأ');
        } catch (e) { alert('خطأ في الاتصال'); }
    };

    // === Display Logic ===
    const getDisplayValue = (value: any, type: number): DisplayReturn => {
        const num = parseFloat(value);
        if (isNaN(num)) return value || '-';
        const percent = num;
        switch (type) {
            case 1: return num.toFixed(2);
            case 2: if (percent >= 85) return '#3b82f6'; if (percent >= 65) return '#22c55e'; if (percent >= 50) return '#eab308'; return '#ef4444';
            case 3: if (percent >= 85) return 'يفوق التوقعات'; if (percent >= 65) return 'يلبّي التوقعات'; if (percent >= 50) return 'يلبّي أحيانًا'; return 'أقل من المتوقع';
            case 4: const evalText = getDisplayValue(num, 3) as string; const color = getDisplayValue(num, 2) as string; return { text: evalText, style: { background: color, color: (percent >= 85 || percent < 50 || percent >= 65) ? 'white' : 'black' } };
            case 5: if (percent >= 85) return 'أزرق'; if (percent >= 65) return 'أخضر'; if (percent >= 50) return 'أصفر'; return 'أحمر';
            case 6: const cName = getDisplayValue(num, 5) as string; const eName = getDisplayValue(num, 3) as string; return `${cName} - ${eName}`;
            default: return num;
        }
    };

    const getPrintColor = (num: number): string => { if (num >= 85) return '#3b82f6'; if (num >= 65) return '#22c55e'; if (num >= 50) return '#eab308'; return '#ef4444'; };
    const getPrintEval = (num: number): string => { if (num >= 85) return 'يفوق التوقعات'; if (num >= 65) return 'يلبّي التوقعات'; if (num >= 50) return 'يلبّي أحيانًا'; return 'أقل من المتوقع'; };
    const getPrintColorName = (num: number): string => { if (num >= 85) return 'أزرق'; if (num >= 65) return 'أخضر'; if (num >= 50) return 'أصفر'; return 'أحمر'; };

    // === 5. تشغيل التقرير ===
    const handleShowData = async (viewType: number, isEndOfYear: boolean) => {
        if (!selectedGradeId) return alert('اختر الصف');

        setCurrentViewType(viewType);
        setIsYearMode(isEndOfYear);
        setLoading(true);
        setGridData([]);
        setTopStudents([]);
        setSelectedStudentRank(null);

        try {
            const sqlINPOT = isEndOfYear ? 2 : 1;

            // 1. جلب الشهادات
            const resCerts = await fetch(`${API_URL}/api/reports/certificates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId,
                    GradeID: selectedGradeId, TermID: selectedTermId || 0, MonthID: selectedMonthId || null,
                    OrderList: orderedSubjects.join(','), MainSubjects: selectedMainSubjects.join(','), INPOT: sqlINPOT
                })
            });
            const jsonCerts = await resCerts.json();
            if (jsonCerts.success && jsonCerts.data) {
                setGridData(jsonCerts.data);
                if (jsonCerts.data.length > 0) {
                    const fixed = ['اسم الطالب', 'رقم الجلوس', 'StudentID'];
                    
                    // === [التعديل المطلوب] إخفاء أعمدة _Exam ===
                    const keys = Object.keys(jsonCerts.data[0]).filter(k => {
                        const key = k.trim();
                        const isFixed = fixed.includes(key);
                        const isExam = key.endsWith('_Exam') || key.includes('_Exam-');
                        return !isFixed && !isExam;
                    });
                    
                    setDynamicColumns(keys);
                }
            }

            // 2. جلب الترتيب
            try {
                const resRanks = await fetch(`${API_URL}/api/reports/rankings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        SchoolID: schoolId, MrahelID: mrahelId, YerID: yearId, GereadID: selectedGradeId, 
                        TiremID: selectedTermId || 0, MonesID: selectedMonthId || 0,
                        StudentID: selectedStudentId || null
                    })
                });
                if (resRanks.ok) { 
                    const jsonRanks = await resRanks.json();
                    if (jsonRanks.success) {
                        if (jsonRanks.top10) setTopStudents(jsonRanks.top10);
                        if (jsonRanks.studentRank) setSelectedStudentRank(jsonRanks.studentRank);
                    }
                } 
            } catch (rankError) {
                console.warn("Rankings API call failed.", rankError);
            }

        } catch (e) {
            console.error(e);
            alert('خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    // === Dynamic Column Sizing Logic ===
    const getColumnStyles = (count: number) => {
        if (count > 15) return { fontSize: '8px', padding: '2px' };
        if (count > 10) return { fontSize: '9px', padding: '3px' };
        if (count > 6) return { fontSize: '10px', padding: '4px' };
        return { fontSize: '12px', padding: '5px' };
    };
    const colStyle = getColumnStyles(dynamicColumns.length);

    // === Render Certificate Component ===
    const renderCertificate = (row: any, idx: number, forPrint: boolean = false) => {
        const showEvalRow = currentViewType === 2 || currentViewType === 4;
        return (
            <div key={idx} className={forPrint ? "certificate-page" : "certificate-card"}>
                <div className="cert-border-inner">
                    <div className="cert-header">
                        <div className="cert-logo-area">
                            {schoolInfo?.Logo ? <img src={schoolInfo.Logo} alt="Logo" className="cert-logo-img" /> : <div className="cert-logo-placeholder"></div>}
                        </div>
                        <div className="school-info">
                            <div>المديرية: {schoolInfo?.ModriaNam}</div>
                            <div>الإدارة: {schoolInfo?.EdaraNam}</div>
                            <div>المدرسة: {schoolInfo?.SchoolNam}</div>
                        </div>
                    </div>

                    <div className="cert-title">بيان تقييم طالب لسنة {work?.yearName}</div>
                    <div className="cert-student-info">الاسم: {row['اسم الطالب']} &nbsp;&nbsp; رقم الجلوس: {row['رقم الجلوس']}</div>

                    <table className="cert-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={colStyle}>المادة</th>
                                {dynamicColumns.map(col => <th key={col} style={colStyle}>{col}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{...colStyle, fontWeight: 'bold', background: '#f0f0f0'}}>النتيجة</td>
                                {dynamicColumns.map(col => {
                                    const val = parseFloat(row[col]);
                                    const color = getPrintColor(val);
                                    if (currentViewType === 1) return <td key={col} style={colStyle}>{!isNaN(val) ? val.toFixed(2) : '-'}</td>;
                                    if (currentViewType === 2 || currentViewType === 4) return <td key={col} style={{...colStyle, background: color}}></td>;
                                    if (currentViewType === 3) return <td key={col} style={colStyle}>{getPrintEval(val)}</td>;
                                    if (currentViewType === 5) return <td key={col} style={colStyle}>{getPrintColorName(val)}</td>;
                                    if (currentViewType === 6) return <td key={col} style={colStyle}>{getPrintColorName(val)}</td>;
                                    return <td key={col} style={colStyle}>{val}</td>;
                                })}
                            </tr>
                            {showEvalRow && (
                                <tr>
                                    <td style={{...colStyle, fontWeight: 'bold', background: '#f0f0f0'}}>التقدير</td>
                                    {dynamicColumns.map(col => <td key={col} style={colStyle}>{getPrintEval(parseFloat(row[col]))}</td>)}
                                </tr>
                            )}
                        </tbody>
                    </table>
                    
                    <div className="cert-legend">
                        <div className="legend-item"><span style={{ background: '#3b82f6' }}></span> يفوق التوقعات</div>
                        <div className="legend-item"><span style={{ background: '#22c55e' }}></span> يلبي التوقعات</div>
                        <div className="legend-item"><span style={{ background: '#eab308' }}></span> يلبي أحيانًا</div>
                        <div className="legend-item"><span style={{ background: '#ef4444' }}></span> أقل من المتوقع</div>
                    </div>
                    <div className="cert-signatures">
                        <div>مسؤول الحاسب الآلي</div><div>رئيس الكنترول</div><div>مدير المدرسة</div>
                    </div>
                </div>
            </div>
        );
    };

    // === Main Render ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1600px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const btn: React.CSSProperties = { padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };
    const dragItemStyle: React.CSSProperties = { padding: '8px', marginBottom: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'grab', fontSize: '12px' };
    const dragItemActiveStyle: React.CSSProperties = { ...dragItemStyle, background: '#e0f2fe', border: '1px dashed #0ea5e9', opacity: 0.8 };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{ margin: 0 }}>🏆 شهادات التقدير والأوائل</h2>
            </div>

            {/* Controls */}
            <div style={cardStyle} className="no-print">
                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>الصف</label>
                        <select value={selectedGradeId || ''} onChange={e => setSelectedGradeId(Number(e.target.value))} style={{ width: '100%', padding: '8px' }}>
                            <option value="">اختر</option>
                            {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>التيرم</label>
                        <select value={selectedTermId || ''} onChange={e => setSelectedTermId(Number(e.target.value))} style={{ width: '100%', padding: '8px' }}>
                            <option value="">اختر</option>
                            {terms.map(t => <option key={t['الرقم']} value={t['الرقم']}>{t['التيرم']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>الشهر</label>
                        <select value={selectedMonthId || ''} onChange={e => setSelectedMonthId(Number(e.target.value))} style={{ width: '100%', padding: '8px' }}>
                            <option value="">اختر</option>
                            {months.map(m => <option key={m['الرقم']} value={m['الرقم']}>{m['شهر الاختبار']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>طالب محدد</label>
                        <select value={selectedStudentId || ''} onChange={e => setSelectedStudentId(Number(e.target.value))} style={{ width: '100%', padding: '8px' }}>
                            <option value="">اختر طالب</option>
                            {studentsList.map(s => <option key={s.StudentID} value={s.StudentID}>{s.ArbStudName}</option>)}
                        </select>
                    </div>
                </div>

                {/* Settings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: '15px', marginBottom: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div>
                        <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '5px' }}>1️⃣ ترتيب المواد</label>
                        <div style={{ height: '120px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px', background: 'white' }}>
                            {orderedSubjects.map((s, i) => (
                                <div key={i} draggable onDragStart={handleDragStart(i)} onDragOver={handleDragOver} onDrop={handleDrop(i)} onDragEnd={handleDragEnd} style={draggedIndex === i ? dragItemActiveStyle : dragItemStyle}>
                                    <span style={{ marginLeft: '5px', color: '#64748b' }}>{i + 1}.</span> {s}
                                </div>
                            ))}
                        </div>
                        <button onClick={saveOrder} style={{ ...btn, width: '100%', marginTop: '5px', background: '#16a34a', color: 'white' }}>💾 حفظ الترتيب</button>
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '5px' }}>2️⃣ المواد الأساسية</label>
                        <select multiple value={selectedMainSubjects} onChange={(e) => setSelectedMainSubjects(Array.from(e.target.selectedOptions, option => option.value))} size={5} style={{ width: '100%', padding: '5px', height: '120px' }}>
                            {availableSubjects.map(s => <option key={s.SubjectGradeID} value={s.SabgekName}>{s.SabgekName}</option>)}
                        </select>
                        <button onClick={saveMainSubjects} style={{ ...btn, width: '100%', marginTop: '5px', background: '#d97706', color: 'white' }}>💾 حفظ الأساسية</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center' }}>
                         <button onClick={() => window.print()} style={{ ...btn, background: '#15803d', color: 'white' }}>🖨️ طباعة</button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ width: '100%', margin: 0, borderBottom: '1px solid #eee', paddingBottom: '5px' }}>--- شهادات نص العام ---</h3>
                    <button onClick={() => handleShowData(1, false)} style={{ ...btn, background: '#0ea5e9', color: 'white' }}>📄 درجات</button>
                    <button onClick={() => handleShowData(2, false)} style={{ ...btn, background: '#f59e0b', color: 'white' }}>🎨 ألوان</button>
                    <button onClick={() => handleShowData(3, false)} style={{ ...btn, background: '#8b5cf6', color: 'white' }}>📝 تقييم</button>
                    <button onClick={() => handleShowData(4, false)} style={{ ...btn, background: '#ec4899', color: 'white' }}>📊 لون+تقييم</button>
                    <button onClick={() => handleShowData(5, false)} style={{ ...btn, background: '#64748b', color: 'white' }}>🖌️ اسم اللون</button>
                    <button onClick={() => handleShowData(6, false)} style={{ ...btn, background: '#0284c7', color: 'white' }}>📋 لون+اسم تقييم</button>

                    <h3 style={{ width: '100%', margin: '10px 0 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>--- شهادات آخر العام ---</h3>
                    <button onClick={() => handleShowData(1, true)} style={{ ...btn, background: '#0ea5e9', color: 'white' }}>📄 درجات</button>
                    <button onClick={() => handleShowData(2, true)} style={{ ...btn, background: '#f59e0b', color: 'white' }}>🎨 ألوان</button>
                    <button onClick={() => handleShowData(3, true)} style={{ ...btn, background: '#8b5cf6', color: 'white' }}>📝 تقييم</button>
                    <button onClick={() => handleShowData(4, true)} style={{ ...btn, background: '#ec4899', color: 'white' }}>📊 لون+تقييم</button>
                    <button onClick={() => handleShowData(5, true)} style={{ ...btn, background: '#64748b', color: 'white' }}>🖌️ اسم اللون</button>
                    <button onClick={() => handleShowData(6, true)} style={{ ...btn, background: '#0284c7', color: 'white' }}>📋 لون+اسم تقييم</button>
                </div>
            </div>

            {/* Rankings Info */}
            {(topStudents.length > 0 || selectedStudentRank) && (
                <div style={cardStyle} className="no-print">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <h4 style={{ margin: '0 0 10px' }}>🏅 العشرة الأوائل</h4>
                            <ol style={{ paddingRight: '20px', margin: 0, fontSize: '12px' }}>
                                {topStudents.map((s: any, i) => (
                                    <li key={i}>{s['اسم الطالب']} ({s['المجموع']}) - ترتيب: {s['الترتيب على مستوى الصف']}</li>
                                ))}
                            </ol>
                        </div>
                        <div style={{ padding: '10px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                            <h4 style={{ margin: '0 0 10px' }}>👤 ترتيب الطالب المختار</h4>
                            {selectedStudentRank ? (
                                <div style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center', color: '#d97706' }}>
                                    <div>الطالب: {selectedStudentRank['اسم الطالب']}</div>
                                    <div>الترتيب على الصف: {selectedStudentRank['الترتيب على مستوى الصف']}</div>
                                </div>
                            ) : <p style={{ fontSize: '12px', color: '#64748b' }}>اختر طالباً واضغط عرض</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* === On-Screen Certificates View === */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }} className="on-screen-view">
                {gridData.map((row, idx) => renderCertificate(row, idx, false))}
            </div>

            {/* === Print Area (Hidden) === */}
            <div id="print-area" style={{display: 'none'}}>
                <div className="cert-grid">
                    {gridData.map((row, idx) => renderCertificate(row, idx, true))}
                </div>
            </div>

            {/* Global Styles for Screen & Print */}
            <style jsx global>{`
                /* On Screen Styles */
                .certificate-card {
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    position: relative;
                    height: 100%;
                }
                .certificate-card .cert-border-inner {
                   border: 1px solid #f3f4f6;
                   height: 100%;
                   display: flex;
                   flex-direction: column;
                }
                .certificate-card .cert-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .certificate-card .school-info { text-align: right; font-size: 11px; font-weight: bold; }
                .certificate-card .cert-logo-img { width: 60px; }
                .certificate-card .cert-title { text-align: center; font-size: 14px; font-weight: bold; margin: 10px 0; }
                .certificate-card .cert-student-info { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .certificate-card .cert-table { border-collapse: collapse; margin-bottom: auto; width: 100%; }
                .certificate-card .cert-table th, .certificate-card .cert-table td { border: 1px solid #e5e7eb; text-align: center; }
                .certificate-card .cert-legend { display: flex; justify-content: center; gap: 10px; font-size: 9px; margin-top: 10px; flex-wrap: wrap; }
                .certificate-card .legend-item { display: flex; align-items: center; gap: 2px; }
                .certificate-card .legend-item span { width: 8px; height: 8px; display: inline-block; }
                .certificate-card .cert-signatures { display: flex; justify-content: space-between; margin-top: 15px; font-size: 10px; font-weight: bold; }

                /* Print Styles */
                @media print {
                    .no-print { display: none !important; }
                    .on-screen-view { display: none !important; }
                    
                    #print-area { display: block !important; }

                    @page { 
                        size: A4 landscape; 
                        margin: 5mm; 
                    }

                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

                    .cert-grid { 
                        display: grid; 
                        grid-template-columns: 1fr; 
                        gap: 2mm; 
                    }

                    .certificate-page {
                        border: 2px solid black; 
                        padding: 3mm; 
                        position: relative;
                        height: 32vh; 
                        box-sizing: border-box; 
                        page-break-inside: avoid;
                        overflow: hidden; 
                    }
                    
                    .cert-border-inner { 
                        border: 1px solid gray; 
                        height: 100%; 
                        position: relative; 
                        padding: 5px; 
                        display: flex; 
                        flex-direction: column; 
                    }
                    
                    .cert-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; }
                    .school-info { text-align: right; font-weight: bold; font-size: 10px; line-height: 1.3; }
                    .cert-logo-area { width: 40px; }
                    .cert-logo-img { width: 100%; object-fit: contain; }
                    .cert-logo-placeholder { width: 40px; height: 40px; border: 1px solid #ccc; }
                    
                    .cert-title { text-align: center; font-size: 12px; font-weight: bold; margin: 2mm 0; }
                    .cert-student-info { text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 2mm; }
                    
                    .cert-table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; table-layout: fixed; flex-grow: 1; }
                    .cert-table th, .cert-table td { border: 1px solid black; text-align: center; font-size: 9px; padding: 1px; }
                    
                    .cert-legend { display: flex; justify-content: center; gap: 5mm; font-size: 8px; margin-top: auto; }
                    .legend-item { display: flex; align-items: center; gap: 1px; }
                    .legend-item span { width: 8px; height: 8px; display: inline-block; border: 1px solid black; }
                    
                    .cert-signatures { 
                        position: absolute; 
                        bottom: 3mm; 
                        left: 5mm; 
                        right: 5mm; 
                        display: flex; 
                        justify-content: space-between; 
                        font-size: 9px; 
                        font-weight: bold; 
                    }
                }
            `}</style>
        </div>
    );
}