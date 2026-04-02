'use client';

import React, { useState, useEffect, DragEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface Term { 'الرقم': number; 'التيرم': string; }
interface Month { 'الرقم': number; 'شهر الاختبار': string; }
interface Subject { SubjectGradeID: number; SabgekName: string; }

export default function FullExamSheetPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const yearId = work?.yearId || 0;
    const mrahelId = work?.stageId || 0;

    const [grades, setGrades] = useState<Grade[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [months, setMonths] = useState<Month[]>([]);
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]); 
    
    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);

    // ListBox States
    const [orderedSubjects, setOrderedSubjects] = useState<string[]>([]);
    const [selectedMainSubjects, setSelectedMainSubjects] = useState<string[]>([]);
    
    // Drag & Drop State
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Data & UI States
    const [gridData, setGridData] = useState<any[]>([]);
    const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState({
        total: 0, success: 0, fail: 0, 
        blue: 0, green: 0, yellow: 0, red: 0
    });
    
    const [loading, setLoading] = useState(false);

    // === Styles Definition ===
    const thStyle: React.CSSProperties = { padding: '6px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid #e5e7eb', background: '#f8fafc' };
    const tdStyle: React.CSSProperties = { padding: '4px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', whiteSpace: 'nowrap', border: '1px solid #e5e7eb' };

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

    // === 2. جلب الشهور ===
    useEffect(() => {
        if (!selectedTermId) { setMonths([]); return; }
        const termName = terms.find(t => t['الرقم'] === selectedTermId)?.['التيرم'] || '';
        if(!termName) return;

        const fetchMonths = async () => {
            const res = await fetch(`${API_URL}/api/search/complex?sch1=${schoolId}&sch2=${yearId}&sch3=${termName}&inpout=12`);
            const json = await res.json();
            if (json.success) setMonths(json.data);
        };
        fetchMonths();
    }, [selectedTermId]);

    // === 3. جلب المواد والإعدادات ===
    useEffect(() => {
        if (!selectedGradeId) { 
            setAvailableSubjects([]); 
            setOrderedSubjects([]); 
            setSelectedMainSubjects([]);
            return; 
        }
        
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
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Mode: 2, Action: 'GET',
                        SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId,
                        GradeID: selectedGradeId, TirmID: selectedTermId || 0, MonesID: selectedMonthId || 0
                    })
                });
                const jsonOrder = await resOrder.json();
                if (jsonOrder.success && jsonOrder.data?.[0]?.OrderList) {
                    setOrderedSubjects(jsonOrder.data[0].OrderList.split(','));
                } else {
                    setOrderedSubjects(defaultSubjects.sort());
                }
            } catch (e) { setOrderedSubjects(defaultSubjects.sort()); }

            try {
                const resMain = await fetch(`${API_URL}/api/settings/subjects-settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Mode: 1, Action: 'GET',
                        SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId,
                        GradeID: selectedGradeId, TirmID: selectedTermId || 0, MonesID: selectedMonthId || 0
                    })
                });
                const jsonMain = await resMain.json();
                if (jsonMain.success && jsonMain.data) {
                    const savedMain = jsonMain.data.map((r: any) => r.SabgekName);
                    setSelectedMainSubjects(savedMain);
                } else {
                    setSelectedMainSubjects([]);
                }
            } catch (e) { setSelectedMainSubjects([]); }
        };

        fetchSubjectsAndSettings();
    }, [selectedGradeId, selectedTermId, selectedMonthId]);

    // === Logic: Drag & Drop Handlers ===
    const handleDragStart = (index: number) => (e: DragEvent<HTMLDivElement>) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

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

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // === Save Handlers ===
    const saveOrder = async () => {
        if (!selectedGradeId) return;
        try {
            const res = await fetch(`${API_URL}/api/settings/subjects-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Mode: 2, Action: 'SAVE',
                    SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId,
                    GradeID: selectedGradeId, TirmID: selectedTermId || 0, MonesID: selectedMonthId || 0,
                    OrderList: orderedSubjects.join(',')
                })
            });
            const json = await res.json();
            alert(json.success ? '✅ تم حفظ الترتيب' : 'حدث خطأ');
        } catch (e) { alert('خطأ في الاتصال'); }
    };

    const saveMainSubjects = async () => {
        if (!selectedGradeId) return;
        try {
            const res = await fetch(`${API_URL}/api/settings/subjects-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Mode: 1, Action: 'SAVE',
                    SchoolID: schoolId, MrahelID: mrahelId, YearID: yearId,
                    GradeID: selectedGradeId, TirmID: selectedTermId || 0, MonesID: selectedMonthId || 0,
                    Subjects: selectedMainSubjects.join(',')
                })
            });
            const json = await res.json();
            alert(json.success ? '✅ تم حفظ المواد الأساسية' : 'حدث خطأ');
        } catch (e) { alert('خطأ في الاتصال'); }
    };

    // === 4. تشغيل التقرير ===
    const handleShowData = async (inpot: 1 | 2) => {
        if (!selectedGradeId) return alert('اختر الصف');
        
        setLoading(true);
        setGridData([]);
        setAnalysis({ total: 0, success: 0, fail: 0, blue: 0, green: 0, yellow: 0, red: 0 });

        try {
            const res = await fetch(`${API_URL}/api/reports/exam-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SchoolID: schoolId,
                    MrahelID: mrahelId,
                    YearID: yearId,
                    GradeID: selectedGradeId,
                    INPOT: inpot,
                    OrderList: orderedSubjects.join(','),
                    MainSubjects: selectedMainSubjects.join(',')
                })
            });

            const json = await res.json();
            if (json.success && json.data) {
                setGridData(json.data);
                if (json.data.length > 0) {
                    // تم تحديث الأعمدة الثابتة لتناسب الإجراء الجديد
                    const fixed = ['مسلسل', 'اسم الطالب', 'الديانة', 'حالة القيد', 'الرقم القومي', 'مجموع الدرجات', 'المجموع الكلي %', 'تقدير كلي', 'لون كلي'];
                    const keys = Object.keys(json.data[0]).filter(k => !fixed.includes(k));
                    setDynamicColumns(keys);
                    calculateAnalysis(json.data);
                }
            } else {
                alert(json.error || 'لا توجد بيانات');
            }
        } catch (e) {
            console.error(e);
            alert('خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    // === 5. حساب التحليل ===
    const calculateAnalysis = (data: any[]) => {
        let total = data.length;
        let blue = 0, green = 0, yellow = 0, red = 0;
        
        data.forEach(row => {
            const color = row['لون كلي']; // نستخدم عمود اللون القادم من SQL
            if (color === 'أزرق') blue++;
            else if (color === 'أخضر') green++;
            else if (color === 'أصفر') yellow++;
            else if (color === 'أحمر') red++;
        });

        // الناجحين هم كل من ليس لونه أحمر (بناءً على منطق الإجراء الجديد)
        const success = blue + green + yellow;
        setAnalysis({ total, success, fail: red, blue, green, yellow, red });
    };

    // === 6. تصدير اكسل ===
    const exportToExcel = () => {
        if (gridData.length === 0) return;
        const headers = Object.keys(gridData[0]);
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.join(";") + "\n"; 
        
        gridData.forEach(row => {
            const values = headers.map(h => {
                let val = row[h] || '';
                val = String(val).replace(/;/g, '،'); 
                return `"${val}"`;
            });
            csvContent += values.join(";") + "\n"; 
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "تقرير_الدرجات.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // === Logic: Grouping Headers ===
    const getGroupedHeaders = () => {
        const groups: { [key: string]: string[] } = {};
        dynamicColumns.forEach(col => {
            const parts = col.split('-');
            const subjectName = parts[0];
            const partName = parts.length > 1 ? parts.slice(1).join('-') : '';
            if (!groups[subjectName]) groups[subjectName] = [];
            groups[subjectName].push(partName);
        });
        return groups;
    };
    const groupedHeaders = getGroupedHeaders();
    const subjectNames = Object.keys(groupedHeaders);

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1600px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const btn: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' };
    const statBox: React.CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', textAlign: 'center' };
    const statNum: React.CSSProperties = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a' };
    const statLbl: React.CSSProperties = { fontSize: '12px', color: '#64748b' };

    const dragItemStyle: React.CSSProperties = {
        padding: '10px', marginBottom: '5px', background: '#f1f5f9', 
        border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'grab',
        transition: 'background 0.2s', userSelect: 'none'
    };
    const dragItemActiveStyle: React.CSSProperties = {
        ...dragItemStyle,
        background: '#e0f2fe', border: '1px dashed #0ea5e9', opacity: 0.8
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{margin:0}}>📊 الشيت الكامل والتجميعي</h2>
                <p style={{margin:'5px 0 0', opacity:0.9}}>تقرير شامل بدرجات التقييم والاختبارات مع تحليل النتائج</p>
            </div>

            {/* الفلاتر */}
            <div style={cardStyle} className="no-print">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
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
                        <label style={{fontWeight:'bold'}}>الشهر</label>
                        <select value={selectedMonthId || ''} onChange={e => setSelectedMonthId(Number(e.target.value))} style={{width:'100%', padding:'8px'}}>
                            <option value="">اختر</option>
                            {months.map(m => <option key={m['الرقم']} value={m['الرقم']}>{m['شهر الاختبار']}</option>)}
                        </select>
                    </div>
                </div>

                {/* ListBoxs & Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: '20px' }}>
                    
                    {/* ListBox 1: ترتيب المواد */}
                    <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                        <label style={{fontWeight:'bold', marginBottom:'5px', display:'block'}}>1️⃣ ترتيب المواد (اسحب وأفلت)</label>
                        <div style={{height: '180px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px', background: 'white'}}>
                            {orderedSubjects.map((s, i) => (
                                <div 
                                    key={i}
                                    draggable
                                    onDragStart={handleDragStart(i)}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop(i)}
                                    onDragEnd={handleDragEnd}
                                    style={draggedIndex === i ? dragItemActiveStyle : dragItemStyle}
                                >
                                    <span style={{marginLeft: '10px', color:'#64748b'}}>{i+1}.</span> {s}
                                </div>
                            ))}
                        </div>
                        <button onClick={saveOrder} style={{...btn, width:'100%', marginTop:'10px', background:'#16a34a', color:'white', fontSize:'12px'}}>
                            💾 حفظ الترتيب
                        </button>
                    </div>

                    {/* ListBox 2: المواد الأساسية */}
                    <div style={{background:'#fffbeb', padding:'15px', borderRadius:'8px', border:'1px solid #fcd34d'}}>
                        <label style={{fontWeight:'bold', marginBottom:'5px', display:'block'}}>2️⃣ المواد الأساسية (للمجموع)</label>
                        <select 
                            multiple 
                            value={selectedMainSubjects} 
                            onChange={(e) => {
                                const options = e.target.options;
                                const selected: string[] = [];
                                for (let i = 0; i < options.length; i++) {
                                    if (options[i].selected) selected.push(options[i].value);
                                }
                                setSelectedMainSubjects(selected);
                            }}
                            size={5} 
                            style={{width:'100%', padding:'5px', marginBottom:'5px'}}
                        >
                            {availableSubjects.map(s => <option key={s.SubjectGradeID} value={s.SabgekName}>{s.SabgekName}</option>)}
                        </select>
                        <button onClick={saveMainSubjects} style={{...btn, width:'100%', background:'#d97706', color:'white', fontSize:'12px'}}>
                            💾 حفظ المواد الأساسية
                        </button>
                    </div>

                    {/* الأزرار */}
                    <div style={{display:'flex', flexDirection:'column', gap:'10px', justifyContent:'center'}}>
                        <button onClick={() => handleShowData(1)} disabled={loading} style={{...btn, background:'#0ea5e9', color:'white'}}>
                            📄 نص العام
                        </button>
                        <button onClick={() => handleShowData(2)} disabled={loading} style={{...btn, background:'#8b5cf6', color:'white'}}>
                            📊 آخر العام
                        </button>
                        <button onClick={() => window.print()} style={{...btn, background:'#94a3b8', color:'white'}}>🖨️ طباعة</button>
                        <button onClick={exportToExcel} style={{...btn, background:'#16a34a', color:'white'}}>📥 تصدير اكسل</button>
                    </div>
                </div>
            </div>

            {/* التحليل الإحصائي */}
            {gridData.length > 0 && (
                <div style={cardStyle} className="no-print">
                    <h3 style={{margin:'0 0 15px'}}>📈 تحليل النتائج</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                        <div style={statBox}>
                            <div style={statNum}>{analysis.total}</div>
                            <div style={statLbl}>إجمالي الطلاب</div>
                        </div>
                        <div style={{...statBox, background:'#dcfce7'}}>
                            <div style={{...statNum, color:'#16a34a'}}>{analysis.success}</div>
                            <div style={statLbl}>الناجحين</div>
                        </div>
                        <div style={{...statBox, background:'#fee2e2'}}>
                            <div style={{...statNum, color:'#dc2626'}}>{analysis.fail}</div>
                            <div style={statLbl}>الراسبين</div>
                        </div>
                        <div style={{...statBox, background:'#dbeafe'}}>
                            <div style={{...statNum, color:'#2563eb'}}>{analysis.blue}</div>
                            <div style={statLbl}>يفوق التوقعات</div>
                        </div>
                        <div style={{...statBox, background:'#dcfce7'}}>
                            <div style={{...statNum, color:'#16a34a'}}>{analysis.green}</div>
                            <div style={statLbl}>يلبي التوقعات</div>
                        </div>
                        <div style={{...statBox, background:'#fef9c3'}}>
                            <div style={{...statNum, color:'#ca8a04'}}>{analysis.yellow}</div>
                            <div style={statLbl}>يلبي أحياناً</div>
                        </div>
                        <div style={{...statBox, background:'#fee2e2'}}>
                            <div style={{...statNum, color:'#dc2626'}}>{analysis.red}</div>
                            <div style={statLbl}>أقل من المتوقع</div>
                        </div>
                    </div>
                </div>
            )}

            {/* الجدول */}
            {gridData.length > 0 && (
                <div id="print-area" style={cardStyle}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ background: '#e2e8f0' }}>
                                    <th rowSpan={2} style={thStyle}>م</th>
                                    <th rowSpan={2} style={thStyle}>اسم الطالب</th>
                                    {subjectNames.map(sub => (
                                        <th key={sub} colSpan={groupedHeaders[sub].length} style={{...thStyle, background: '#cbd5e1'}}>
                                            {sub}
                                        </th>
                                    ))}
                                    {/* تم تعديل رؤوس الأعمدة الثابتة */}
                                    <th rowSpan={2} style={{...thStyle, background:'#e0f2fe'}}>مجموع الدرجات</th>
                                    <th rowSpan={2} style={{...thStyle, background:'#0ea5e9', color:'white'}}>المجموع الكلي %</th>
                                    <th rowSpan={2} style={{...thStyle, background:'#8b5cf6', color:'white'}}>التقدير</th>
                                </tr>
                                <tr style={{ background: '#f1f5f9' }}>
                                    {subjectNames.map(sub => 
                                        groupedHeaders[sub].map((part, idx) => (
                                            <th key={`${sub}-${idx}`} style={{...thStyle, fontSize: '10px'}}>
                                                {part}
                                            </th>
                                        ))
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {gridData.map((row, idx) => {
                                    // نستخدم عمود اللون من الإجراء
                                    const rowColor = row['لون كلي'];
                                    let rowBg = 'white';
                                    if(rowColor === 'أحمر') rowBg = '#fee2e2';
                                    else if(rowColor === 'أصفر') rowBg = '#fef9c3';
                                    // الأزرق والأخضر نتركهم أبيض أو ألوان فاتحة جداً للطباعة
                                    
                                    return (
                                        <tr key={idx} style={{ background: rowBg }}>
                                            <td style={tdStyle}>{row['مسلسل'] || idx+1}</td>
                                            <td style={{...tdStyle, textAlign:'right'}}>{row['اسم الطالب']}</td>
                                            
                                            {dynamicColumns.map(col => {
                                                const val = row[col];
                                                const text = String(val || '');
                                                let bg = {};
                                                // تلوين خلايا الحالة داخل المواد
                                                if (text.includes('دور ثاني')) bg = {background:'#fecaca', color:'#991b1b'};
                                                else if (text.includes('ناجح')) bg = {background:'#bbf7d0', color:'#166534'};
                                                
                                                // تلوين أعمدة التقييم والاختبار إذا كانت أقل من 50% (اختياري)
                                                // لكن سنكتفي بتلوين الحالة كما في الكود الأصلي
                                                
                                                return <td key={col} style={{...tdStyle, ...bg}}>{val}</td>;
                                            })}

                                            {/* أعمدة الملخص */}
                                            <td style={{...tdStyle, fontWeight:'bold'}}>{row['مجموع الدرجات']}</td>
                                            <td style={{...tdStyle, fontWeight:'bold', background:'#f0f9ff'}}>{row['المجموع الكلي %']}</td>
                                            <td style={{...tdStyle, fontWeight:'bold'}}>{row['تقدير كلي']}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Print CSS */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    #print-area { width: 100%; }
                    table, th, td { border: 1px solid black !important; font-size: 10px !important; }
                    @page { size: A3 landscape; margin: 5mm; }
                }
            `}</style>
        </div>
    );
}