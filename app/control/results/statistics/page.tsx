'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface Term { 'الرقم': number; 'التيرم': string; }
interface Month { 'الرقم': number; 'شهر الاختبار': string; }

export default function StatisticsPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const yearId = work?.yearId || 0;
    const mrahelId = work?.stageId || 0;

    // Filters
    const [grades, setGrades] = useState<Grade[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [months, setMonths] = useState<Month[]>([]);

    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);

    // Data States
    // الإحصاء العام (3) بيرجع 3 جداول
    const [table1, setTable1] = useState<any[]>([]);
    const [table2, setTable2] = useState<any[]>([]);
    const [table3, setTable3] = useState<any[]>([]);
    
    // الباقي بيرجع جدول واحد
    const [mainData, setMainData] = useState<any[]>([]);

    // View State
    const [currentMode, setCurrentMode] = useState<number>(0); // 3, 4, 5
    const [loading, setLoading] = useState(false);

    // === Styles ===
    const thStyle: React.CSSProperties = { padding: '8px', borderBottom: '2px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid #e5e7eb', fontSize: '12px', background: '#f8fafc' };
    const tdStyle: React.CSSProperties = { padding: '6px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', whiteSpace: 'nowrap', border: '1px solid #e5e7eb', fontSize: '11px' };

    // === Helpers: Color & Eval Logic ===
    const getColor = (val: number): string => {
        if (val >= 85) return '#3b82f6'; // Blue
        if (val >= 65) return '#22c55e'; // Green
        if (val >= 50) return '#eab308'; // Yellow
        return '#ef4444'; // Red
    };

    const getEval = (val: number): string => {
        if (val >= 85) return 'يفوق التوقعات';
        if (val >= 65) return 'يلبّي التوقعات';
        if (val >= 50) return 'يلبّي أحيانًا';
        return 'أقل من المتوقع';
    };

    // === Data Fetching (Filters) ===
    useEffect(() => {
        const fetchInitial = async () => {
            if (user?.schoolName && work?.stageName) {
                const resG = await fetch(`${API_URL}/api/search2?SCHER1=${user.schoolName}&SCHER2=${work.stageName}&inpot=6`);
                if (resG.ok) { const json = await resG.json(); if (json.success) setGrades(json.data); }
            }
            const resT = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
            if (resT.ok) { const json = await resT.json(); if (json.success) setTerms(json.data); }
        };
        if (schoolId) fetchInitial();
    }, [schoolId, yearId]);

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
    }, [selectedTermId]);

    // === Logic: Show Data ===
    const handleShowData = async (inpot: 3 | 4 | 5) => {
        if (!selectedGradeId) return alert('اختر الصف');

        setLoading(true);
        setCurrentMode(inpot);
        setTable1([]); setTable2([]); setTable3([]); setMainData([]);

        try {
            // نفترض وجود Endpoint جديد أو استخدام search/scher2int
            // هنا سنستخدم نفس نمط الـ API المستخدم في الشيت
            const res = await fetch(`${API_URL}/api/reports/certificates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SchoolID: schoolId,
                    MrahelID: mrahelId,
                    YearID: yearId,
                    GradeID: selectedGradeId,
                    TermID: selectedTermId || 0,
                    MonthID: selectedMonthId || 0,
                    INPOT: inpot
                })
            });

            const json = await res.json();
            if (json.success) {
                if (inpot === 3) {
                    // 3 جداول
                    if (json.data) setTable1(json.data);
                    if (json.data2) setTable2(json.data2);
                    if (json.data3) setTable3(json.data3);
                } else {
                    // جدول واحد
                    if (json.data) setMainData(json.data);
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

    // === Render Table Function ===
    const renderTable = (data: any[], title: string) => {
        if (!data || data.length === 0) return null;
        const headers = Object.keys(data[0]);

        return (
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 10px', textAlign: 'center', background: '#f1f5f9', padding: '8px', borderRadius: '6px' }}>{title}</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                            <tr>
                                {headers.map(h => <th key={h} style={thStyle}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <tr key={idx}>
                                    {headers.map(col => {
                                        const val = row[col];
                                        const num = parseFloat(val);
                                        let style = tdStyle;

                                        // تطبيق الألوان لو العمود رقمي ومناسب
                                        if (!isNaN(num) && typeof val !== 'string') {
                                            // لو العمود اسمه نسبة أو مجموع أو درجة
                                            const lowerCol = col.toLowerCase();
                                            if (lowerCol.includes('نسبة') || lowerCol.includes('مجموع') || lowerCol.includes('درجة') || lowerCol.includes('متوسط')) {
                                                style = { ...tdStyle, background: getColor(num) };
                                            }
                                        }
                                        
                                        // لو القيمة نصية فيها تقدير
                                        let content = val;
                                        if (typeof val === 'string') {
                                            if (val.includes('يفوق')) style = { ...tdStyle, background: '#3b82f6', color: 'white' };
                                            else if (val.includes('يلبي التوقعات')) style = { ...tdStyle, background: '#22c55e', color: 'white' };
                                            else if (val.includes('أحيان')) style = { ...tdStyle, background: '#eab308' };
                                            else if (val.includes('أقل')) style = { ...tdStyle, background: '#ef4444', color: 'white' };
                                        }

                                        return <td key={col} style={style}>{content}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // === Main Render ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const btn: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{margin:0}}>📊 الإحصائيات والتحليل</h2>
                <p style={{margin:'5px 0 0', opacity:0.9}}>تحليل شامل لنتائج الطلاب</p>
            </div>

            {/* Controls */}
            <div style={cardStyle} className="no-print">
                {/* Filters */}
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

                {/* Buttons Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* عمود العرض */}
                    <div>
                        <h4 style={{margin:'0 0 10px', borderBottom:'1px solid #eee', paddingBottom:'5px'}}>👁️ أزرار العرض</h4>
                        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            <button onClick={() => handleShowData(3)} disabled={loading} style={{...btn, background:'#0ea5e9', color:'white'}}>
                                📈 إحصاء عام (3 جداول)
                            </button>
                            <button onClick={() => handleShowData(4)} disabled={loading} style={{...btn, background:'#8b5cf6', color:'white'}}>
                                📚 إحصاء فصول ومواد
                            </button>
                            <button onClick={() => handleShowData(5)} disabled={loading} style={{...btn, background:'#ec4899', color:'white'}}>
                                🧩 إحصاء تحليلى
                            </button>
                        </div>
                    </div>

                    {/* عمود الطباعة */}
                    <div>
                        <h4 style={{margin:'0 0 10px', borderBottom:'1px solid #eee', paddingBottom:'5px'}}>🖨️ أزرار الطباعة</h4>
                        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            <button onClick={() => { setCurrentMode(3); window.print(); }} style={{...btn, background:'#94a3b8', color:'white'}}>
                                طباعة إحصاء عام
                            </button>
                            <button onClick={() => { setCurrentMode(4); window.print(); }} style={{...btn, background:'#94a3b8', color:'white'}}>
                                طباعة فصول ومواد
                            </button>
                            <button onClick={() => { setCurrentMode(5); window.print(); }} style={{...btn, background:'#94a3b8', color:'white'}}>
                                طباعة إحصاء تحليلى
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Area */}
            {loading ? (
                <div style={{textAlign:'center', padding:'50px'}}>جاري التحميل...</div>
            ) : (
                <div id="print-area" style={cardStyle}>
                    {currentMode === 3 && (
                        <>
                            {renderTable(table1, "الجدول الأول - الطلاب")}
                            {renderTable(table2, "الجدول الثاني - المواد")}
                            {renderTable(table3, "الجدول الثالث - التحصيل")}
                        </>
                    )}
                    {currentMode === 4 && renderTable(mainData, "إحصاء الفصول والمواد")}
                    {currentMode === 5 && renderTable(mainData, "الإحصاء التحليلي")}
                </div>
            )}

            {/* Print CSS */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    #print-area { width: 100%; box-shadow: none !important; border: none !important; }
                    table, th, td { border: 1px solid black !important; font-size: 10px !important; }
                    @page { size: A4 landscape; margin: 5mm; }
                }
            `}</style>
        </div>
    );
}