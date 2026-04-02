'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface Term { 'الرقم': number; 'التيرم': string; }
interface Month { 'الرقم': number; 'شهر الاختبار': string; }
interface Subject { SubjectGradeID: number; SabkekName: string; }

export default function ExamSheetPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const yearId = work?.yearId || 0;
    const mrahelId = work?.stageId || 0;

    const [grades, setGrades] = useState<Grade[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [months, setMonths] = useState<Month[]>([]);
    
    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedTermName, setSelectedTermName] = useState<string>('');
    const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);

    // Listbox State
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]); 
    const [orderedSubjects, setOrderedSubjects] = useState<string[]>([]); 

    // Grid State
    const [gridData, setGridData] = useState<any[]>([]);
    const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
    
    const [loading, setLoading] = useState(false);

    // === 1. جلب البيانات الأساسية ===
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const resG = await fetch(`${API_URL}/api/search2?SCHER1=${user?.schoolName}&SCHER2=${work?.stageName}&inpot=6`);
                if (resG.ok) { const json = await resG.json(); if (json.success) setGrades(json.data); }

                const resT = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
                if (resT.ok) { const json = await resT.json(); if (json.success) setTerms(json.data); }
            } catch (error) { console.error("Error fetching initial data", error); }
        };
        if (schoolId) fetchInitial();
    }, [schoolId, yearId]);

    // === 2. جلب الشهور ===
    useEffect(() => {
        if (!selectedTermId || !selectedTermName) { setMonths([]); return; }
        const fetchMonths = async () => {
            try {
                const res = await fetch(`${API_URL}/api/search/complex?sch1=${schoolId}&sch2=${yearId}&sch3=${selectedTermName}&inpout=12`);
                const json = await res.json();
                if (json.success) setMonths(json.data);
            } catch (error) { console.error("Error fetching months", error); }
        };
        fetchMonths();
    }, [selectedTermId, selectedTermName, yearId]);

    // === 3. جلب المواد ===
    useEffect(() => {
        if (!selectedGradeId) { setAvailableSubjects([]); setOrderedSubjects([]); return; }
        
        const fetchSubjects = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData1/24?id=${selectedGradeId}`);
                const json = await res.json();
                if (json.success) {
                    const data: Subject[] = json.data;
                    setAvailableSubjects(data);
                    
                    const uniqueNames: string[] = [...new Set(data.map((s: Subject) => s.SabkekName))];
                    
                    const savedOrder = localStorage.getItem(`order_subj_${selectedGradeId}`);
                    if (savedOrder) {
                        const parsed: string[] = JSON.parse(savedOrder);
                        setOrderedSubjects([...new Set(parsed)]);
                    } else {
                        setOrderedSubjects(uniqueNames.sort());
                    }
                }
            } catch (error) { console.error("Error fetching subjects", error); }
        };
        fetchSubjects();
    }, [selectedGradeId]);

    // === Logic: Listbox Movement ===
    const moveUp = () => {
        const list = document.getElementById('listbox-subjects') as HTMLSelectElement;
        if (!list || list.selectedIndex < 1) return;
        const i = list.selectedIndex;
        const newOrder = [...orderedSubjects];
        [newOrder[i - 1], newOrder[i]] = [newOrder[i], newOrder[i - 1]];
        setOrderedSubjects(newOrder);
    };

    const moveDown = () => {
        const list = document.getElementById('listbox-subjects') as HTMLSelectElement;
        if (!list || list.selectedIndex === orderedSubjects.length - 1 || list.selectedIndex === -1) return;
        const i = list.selectedIndex;
        const newOrder = [...orderedSubjects];
        [newOrder[i + 1], newOrder[i]] = [newOrder[i], newOrder[i + 1]];
        setOrderedSubjects(newOrder);
    };

    const saveOrder = () => {
        if (selectedGradeId) {
            localStorage.setItem(`order_subj_${selectedGradeId}`, JSON.stringify(orderedSubjects));
            alert('✅ تم حفظ ترتيب المواد');
        }
    };

    // === 4. عرض البيانات ===
    const handleShowData = async (inpot: number) => {
        if (!selectedGradeId || !selectedTermId || !selectedMonthId) {
            alert('الرجاء اختيار الصف والتيرم والشهر');
            return;
        }
        if (orderedSubjects.length === 0) {
            alert('لا توجد مواد لعرضها');
            return;
        }

        setLoading(true);
        setGridData([]);

        try {
            const res = await fetch(`${API_URL}/api/reports/exam-sheet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SchoolID: schoolId,
                    MrahelID: mrahelId,
                    YearID: yearId,
                    GradeID: selectedGradeId,
                    TermID: selectedTermId,
                    MonthID: selectedMonthId,
                    OrderList: orderedSubjects.join(','),
                    INPOT: inpot
                })
            });

            const json = await res.json();
            
            if (json.success && json.data) {
                setGridData(json.data);
                if (json.data.length > 0) {
                    const fixed = ['مسلسل', 'اسم الطالب', 'الديانة', 'حالة القيد', 'الرقم القومى'];
                    const keys = Object.keys(json.data[0]).filter(k => !fixed.includes(k));
                    setDynamicColumns(keys);
                } else {
                    alert('لا توجد بيانات لهذه الاختيارات');
                }
            } else {
                alert(`خطأ: ${json.error || 'مشكلة غير معروفة'}`);
            }
        } catch (e) {
            console.error(e);
            alert('خطأ في الاتصال بالسيرفر');
        } finally {
            setLoading(false);
        }
    };

    const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value);
        setSelectedTermId(id);
        setSelectedTermName(terms.find(t => t['الرقم'] === id)?.['التيرم'] || '');
    };

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', color: 'white', padding: '25px', borderRadius: '20px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(15, 118, 110, 0.3)' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #f1f5f9' };
    const btn: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' };
    
    const legendStyle: React.CSSProperties = { border: '1px solid #e5e7eb', borderCollapse: 'collapse', width: '100%', fontSize: '13px', marginBottom: '25px', borderRadius: '8px', overflow: 'hidden' };
    const legTh: React.CSSProperties = { border: '1px solid #e5e7eb', background: '#f8fafc', padding: '10px', textAlign: 'center', fontWeight: 'bold' };
    const legTd: React.CSSProperties = { border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center' };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{margin:0, fontSize: '24px'}}>📊 شيت درجات التقييمات</h2>
                <p style={{margin: '5px 0 0', opacity: 0.9, fontSize: '14px'}}>تقرير مجمع لدرجات الطلاب حسب الشهر والتيرم</p>
            </div>

            {/* الفلاتر والتحكم */}
            <div style={cardStyle} className="no-print">
                
                {/* صف الفلاتر */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:'8px', color:'#334155'}}>الصف الدراسي</label>
                        <select value={selectedGradeId || ''} onChange={e => setSelectedGradeId(Number(e.target.value))} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1'}}>
                            <option value="">اختر الصف</option>
                            {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:'8px', color:'#334155'}}>التيرم</label>
                        <select value={selectedTermId || ''} onChange={handleTermChange} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1'}}>
                            <option value="">اختر التيرم</option>
                            {terms.map(t => <option key={t['الرقم']} value={t['الرقم']}>{t['التيرم']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:'8px', color:'#334155'}}>شهر الاختبار</label>
                        <select value={selectedMonthId || ''} onChange={e => setSelectedMonthId(Number(e.target.value))} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1'}}>
                            <option value="">اختر الشهر</option>
                            {months.map(m => <option key={m['الرقم']} value={m['الرقم']}>{m['شهر الاختبار']}</option>)}
                        </select>
                    </div>
                </div>

                {/* ترتيب المواد والأزرار - في نفس الصف */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    
                    {/* جزء ترتيب المواد (يسار) */}
                    <div style={{ flex: '0 0 250px' }}>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:'8px', color:'#334155'}}>ترتيب المواد</label>
                        <select 
                            id="listbox-subjects"
                            size={6} 
                            style={{width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                        >
                            {orderedSubjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
                        </select>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                            <button onClick={moveUp} style={{...btn, flex:1, background: '#f1f5f9', color: '#334155', fontSize: '12px'}}>⬆️ أعلى</button>
                            <button onClick={moveDown} style={{...btn, flex:1, background: '#f1f5f9', color: '#334155', fontSize: '12px'}}>⬇️ أسفل</button>
                        </div>
                        <button onClick={saveOrder} style={{...btn, width: '100%', marginTop: '5px', background: '#16a34a', color: 'white', fontSize: '12px'}}>💾 حفظ الترتيب</button>
                    </div>

                    {/* الأزرار (يمين) */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => handleShowData(1)} disabled={loading} style={{...btn, flex:1, background: '#0ea5e9', color:'white'}}>📄 شيت درجات</button>
                                <button onClick={() => window.print()} style={{...btn, background: '#94a3b8', color:'white'}}>🖨️</button>
                            </div>
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => handleShowData(2)} disabled={loading} style={{...btn, flex:1, background: '#f59e0b', color:'white'}}>🎨 شيت ألوان</button>
                                <button onClick={() => window.print()} style={{...btn, background: '#94a3b8', color:'white'}}>🖨️</button>
                            </div>
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => handleShowData(3)} disabled={loading} style={{...btn, flex:1, background: '#8b5cf6', color:'white'}}>📝 شيت بالتقييم</button>
                                <button onClick={() => window.print()} style={{...btn, background: '#94a3b8', color:'white'}}>🖨️</button>
                            </div>
                            
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => handleShowData(4)} disabled={loading} style={{...btn, flex:1, background: '#ec4899', color:'white'}}>📊 لون + تقييم</button>
                                <button onClick={() => window.print()} style={{...btn, background: '#94a3b8', color:'white'}}>🖨️</button>
                            </div>
                            
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => handleShowData(5)} disabled={loading} style={{...btn, flex:1, background: '#64748b', color:'white'}}>🖌️ اسم اللون</button>
                                <button onClick={() => window.print()} style={{...btn, background: '#94a3b8', color:'white'}}>🖨️</button>
                            </div>
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => handleShowData(6)} disabled={loading} style={{...btn, flex:1, background: '#0284c7', color:'white'}}>📋 لون واسم تقييم</button>
                                <button onClick={() => window.print()} style={{...btn, background: '#94a3b8', color:'white'}}>🖨️</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* النتائج */}
            {gridData.length > 0 && (
                <div id="print-area" style={{...cardStyle, padding: '10px'}}>
                    <h3 style={{margin:'0 0 15px', textAlign:'center', fontWeight: 'bold'}}>دليل الألوان والتقييمات</h3>
                    <table style={legendStyle}>
                        <thead>
                            <tr>
                                <th style={legTh}>اسم اللون</th>
                                <th style={legTh}>التقييم</th>
                                <th style={legTh}>النسبة من</th>
                                <th style={legTh}>النسبة إلى</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{...legTd, background:'#3b82f6', color:'white'}}>أزرق</td>
                                <td style={legTd}>يفوق التوقعات</td>
                                <td style={legTd}>85%</td>
                                <td style={legTd}>100%</td>
                            </tr>
                            <tr>
                                <td style={{...legTd, background:'#22c55e', color:'white'}}>أخضر</td>
                                <td style={legTd}>يلبّي التوقعات</td>
                                <td style={legTd}>65%</td>
                                <td style={legTd}>84%</td>
                            </tr>
                            <tr>
                                <td style={{...legTd, background:'#eab308'}}>أصفر</td>
                                <td style={legTd}>يلبّي أحيانًا</td>
                                <td style={legTd}>50%</td>
                                <td style={legTd}>64%</td>
                            </tr>
                            {/* تم إضافة اللون الأحمر */}
                            <tr>
                                <td style={{...legTd, background:'#ef4444', color:'white'}}>أحمر</td>
                                <td style={legTd}>أقل من المتوقع</td>
                                <td style={legTd}>0%</td>
                                <td style={legTd}>49%</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* الجدول الرئيسي */}
                    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={thStyle}>م</th>
                                    <th style={thStyle}>اسم الطالب</th>
                                    <th style={thStyle}>الديانة</th>
                                    <th style={thStyle}>حالة القيد</th>
                                    {dynamicColumns.map(col => <th key={col} style={thStyle}>{col}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {gridData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={tdStyle}>{row['مسلسل'] || idx+1}</td>
                                        <td style={{...tdStyle, textAlign:'right'}}>{row['اسم الطالب']}</td>
                                        <td style={tdStyle}>{row['الديانة']}</td>
                                        <td style={tdStyle}>{row['حالة القيد']}</td>
                                        {dynamicColumns.map(col => {
                                            const val = row[col];
                                            let bg = {};
                                            
                                            const text = String(val || '');
                                            
                                            if (text.includes('أزرق')) bg = {background:'#3b82f6', color:'white'};
                                            else if (text.includes('أخضر')) bg = {background:'#22c55e', color:'white'};
                                            else if (text.includes('أصفر')) bg = {background:'#eab308'};
                                            else if (text.includes('أحمر')) bg = {background:'#ef4444', color:'white'};
                                            
                                            return <td key={col} style={{...tdStyle, ...bg}}>{val}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Print CSS */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    
                    body { 
                        background: white !important; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    
                    #print-area { 
                        border: none; 
                        box-shadow: none; 
                        width: 100%; 
                    }
                    
                    table, th, td { 
                        border: 1px solid black !important; 
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    @page { size: A4 landscape; margin: 5mm; }
                }
            `}</style>
        </div>
    );
}

const thStyle: React.CSSProperties = { padding: '8px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', background: '#f8fafc' };
const tdStyle: React.CSSProperties = { padding: '6px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontSize: '12px' };