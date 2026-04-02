'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Term {
    "الرقم": number;
    "التيرم": string;
}

interface Grade {
    "الرقم": number;
    "الصف الدراسى": string;
}

interface Subject {
    SabgektID: number;
    SabgekName: string;
}

interface ExamSchedule {
    "الرقم": number;
    "التيرم": string;
    "الصف": string;
    "المادة": string;
    "التاريخ": string;
    "اليوم": string;
    "الفترة": string;
    "من": string;
    "إلى": string;
    "الزمن": string;
}

export default function ExamSchedulePage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const yearId = work?.yearId || 0;
    const schoolName = user?.schoolName;
    const stageName = work?.stageName;

    // State for Dropdowns
    const [terms, setTerms] = useState<Term[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [schedules, setSchedules] = useState<ExamSchedule[]>([]);

    // Form State
    const [nextId, setNextId] = useState(0);
    const [editingId, setEditingId] = useState<number | null>(null);
    
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [targetSubjectName, setTargetSubjectName] = useState<string>(''); // لتعيين المادة بعد التحميل
    
    const [examDate, setExamDate] = useState<string>('');
    const [period, setPeriod] = useState<string>('الفترة الأولى');
    const [startTime, setStartTime] = useState<string>('09:00');
    const [endTime, setEndTime] = useState<string>('11:00');
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // === 1. جلب الرقم التسلسلي (INPOT 58) ===
    useEffect(() => {
        let isMounted = true;
        const fetchId = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData/58`);
                const json = await res.json();
                if (isMounted && json.success && json.data?.[0]) {
                    const id = Object.values(json.data[0])[0];
                    setNextId(Number(id) || 0);
                }
            } catch (e) { if (isMounted) console.error(e); }
        };
        fetchId();
        return () => { isMounted = false; };
    }, []);

    // === 2. جلب التيرمات (INPOT 22) ===
    useEffect(() => {
        if (!schoolId || !yearId) return;
        let isMounted = true;
        const fetchTerms = async () => {
            try {
                const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
                const json = await res.json();
                if (isMounted && json.success) setTerms(json.data);
            } catch (e) { if (isMounted) console.error(e); }
        };
        fetchTerms();
        return () => { isMounted = false; };
    }, [schoolId, yearId]);

    // === 3. جلب الصفوف ===
    useEffect(() => {
        if (!schoolName || !stageName) return;
        let isMounted = true;
        const fetchGrades = async () => {
            try {
                const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                const json = await res.json();
                if (isMounted && json.success) setGrades(json.data);
            } catch (e) { if (isMounted) console.error(e); }
        };
        fetchGrades();
        return () => { isMounted = false; };
    }, [schoolName, stageName]);

    // === 4. جلب المواد عند اختيار الصف ===
    useEffect(() => {
        if (!selectedGradeId) { setSubjects([]); return; }
        let isMounted = true;
        const fetchSubjects = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData1/66?id=${selectedGradeId}`);
                const json = await res.json();
                if (isMounted && json.success) setSubjects(json.data);
            } catch (e) { if (isMounted) console.error(e); }
        };
        fetchSubjects();
        return () => { isMounted = false; };
    }, [selectedGradeId]);

    // === 5. جلب جدول الاختبارات (INPOT 23) ===
    useEffect(() => {
        if (!schoolId || !yearId) return;
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=23`);
                const json = await res.json();
                if (isMounted) {
                    if (json.success && json.data) setSchedules(json.data);
                    else setSchedules([]);
                }
            } catch (e) { if (isMounted) console.error(e); } 
            finally { if (isMounted) setLoading(false); }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [schoolId, yearId]);

    // === 6. تعيين المادة تلقائياً بعد تحميل القائمة (حل مشكلة التعديل) ===
    useEffect(() => {
        if (subjects.length > 0 && targetSubjectName) {
            const sub = subjects.find(s => s.SabgekName === targetSubjectName);
            if (sub) {
                setSelectedSubjectId(sub.SabgektID);
                setTargetSubjectName(''); // مسح المتغير
            }
        }
    }, [subjects, targetSubjectName]);

    // === دوال مساعدة ===
    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return '0 دقيقة';
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const diff = endMin - startMin;
        if (diff <= 0) return '0 دقيقة';
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `${h > 0 ? h + ' ساعة ' : ''}${m > 0 ? m + ' دقيقة' : ''}`.trim();
    };

    const getDayName = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-EG', { weekday: 'long' });
    };

    // === 7. الحفظ ===
    const handleSubmit = async () => {
        if (!selectedTermId || !selectedGradeId || !selectedSubjectId || !examDate) {
            return alert('يرجى استكمال البيانات (التيرم، الصف، المادة، التاريخ)');
        }

        setSaving(true);
        try {
            const operation = editingId ? 2 : 1;
            const idToSend = editingId || nextId;
            const dayName = getDayName(examDate);
            const duration = calculateDuration(startTime, endTime);

            const res = await fetch(`${API_URL}/api/exams/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    GadwelExID: idToSend,
                    exaem_dat: examDate,
                    exaem_moafek: dayName,
                    GereadID: selectedGradeId,
                    SabgektID: selectedSubjectId,
                    SchoolID: schoolId,
                    YerID: yearId,
                    TiremID: selectedTermId,
                    exam_men: startTime,
                    exam_ela: endTime,
                    sxzam_moda: duration,
                    exam_ftra: period,
                    INPOT: operation
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ تم ${editingId ? 'التعديل' : 'الإضافة'} بنجاح`);
                
                const gradeName = grades.find(g => g['الرقم'] === selectedGradeId)?.['الصف الدراسى'] || '';
                const subjectName = subjects.find(s => s.SabgektID === selectedSubjectId)?.SabgekName || '';
                const termName = terms.find(t => t['الرقم'] === selectedTermId)?.['التيرم'] || '';

                if (!editingId) {
                    setSchedules(prev => [...prev, {
                        "الرقم": nextId,
                        "التيرم": termName, 
                        "الصف": gradeName, 
                        "المادة": subjectName,
                        "التاريخ": examDate,
                        "اليوم": dayName,
                        "الفترة": period,
                        "من": startTime,
                        "إلى": endTime,
                        "الزمن": duration
                    }]);
                    setNextId(prev => prev + 1);
                } else {
                    setSchedules(prev => prev.map(s => s['الرقم'] === editingId ? {
                        ...s, 
                        "التاريخ": examDate, 
                        "اليوم": dayName, 
                        "المادة": subjectName, 
                        "الزمن": duration
                    } : s));
                }

                // Reset Form
                setEditingId(null);
                setSelectedTermId(null);
                setSelectedGradeId(null);
                setSelectedSubjectId(null);
                setExamDate('');
            } else {
                alert('فشل العملية: ' + data.error);
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (row: ExamSchedule) => {
        // 1. البحث عن الـ IDs من خلال الأسماء
        const term = terms.find(t => t['التيرم'] === row['التيرم']);
        const grade = grades.find(g => g['الصف الدراسى'] === row['الصف']);

        if (term) setSelectedTermId(term['الرقم']);
        
        // 2. لما نختار الصف، هيتم تحميل المواد أوتوماتيك
        if (grade) setSelectedGradeId(grade['الرقم']);

        // 3. نحفظ اسم المادة في متغير مؤقت عشان نختارها لما القائمة تحمل
        setTargetSubjectName(row['المادة']);
        
        // 4. باقي البيانات
        setEditingId(row['الرقم']);
        setPeriod(row['الفترة']);
        setStartTime(row['من']);
        setEndTime(row['إلى']);

        // 5. تصليح صيغة التاريخ (YYYY-MM-DD)
        if (row['التاريخ']) {
            const dateObj = new Date(row['التاريخ']);
            const formattedDate = dateObj.toISOString().split('T')[0];
            setExamDate(formattedDate);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل تريد حذف هذا الموعد؟')) return;
        try {
            const res = await fetch(`${API_URL}/api/exams/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ GadwelExID: id, INPOT: 3 })
            });
            const data = await res.json();
            if (data.success) {
                alert('تم الحذف');
                setSchedules(prev => prev.filter(s => s['الرقم'] !== id));
            } else { alert('فشل الحذف'); }
        } catch (e) { alert('خطأ'); }
    };

    // === Styles (Fire Theme 🔥) ===
    const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: 'linear-gradient(to bottom, #fff7ed, #ffffff)', minHeight: '100vh' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '20px', border: '1px solid #fee2e2' };
    const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', width: '100%' };
    const readonlyStyle: React.CSSProperties = { ...inputStyle, background: '#f1f5f9', color: '#64748b', fontWeight: 'bold' };
    const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 'bold' };
    const btnSecondary: React.CSSProperties = { ...btnPrimary, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    const thStyle: React.CSSProperties = { padding: '12px', borderBottom: '2px solid #fee2e2', color: '#991b1b', fontWeight: 'bold', textAlign: 'center' };
    const tdStyle: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px' }}>📅 جدول الاختبارات</h1>
                    <p style={{ margin: '5px 0 0', opacity: 0.9 }}>تسجيل مواعيد الامتحانات</p>
                </div>
                <div style={{ fontSize: '50px' }}>📝</div>
            </div>

            {/* Form Card */}
            <div style={cardStyle}>
                <h3 style={{marginTop:0, marginBottom:'20px', color:'#dc2626'}}>
                    {editingId ? `✏️ تعديل موعد رقم (${editingId})` : '➕ إضافة موعد جديد'}
                </h3>

                {/* Row 1: Term & Grade & Subject */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>التيرم</label>
                        <select value={selectedTermId || ''} onChange={e => setSelectedTermId(Number(e.target.value))} style={inputStyle}>
                            <option value="">اختر التيرم</option>
                            {terms.map(t => <option key={t['الرقم']} value={t['الرقم']}>{t['التيرم']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>الصف</label>
                        <select value={selectedGradeId || ''} onChange={e => setSelectedGradeId(Number(e.target.value))} style={inputStyle}>
                            <option value="">اختر الصف</option>
                            {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>المادة</label>
                        <select value={selectedSubjectId || ''} onChange={e => setSelectedSubjectId(Number(e.target.value))} style={inputStyle} disabled={!selectedGradeId}>
                            <option value="">اختر المادة</option>
                            {subjects.map(s => <option key={s.SabgektID} value={s.SabgektID}>{s.SabgekName}</option>)}
                        </select>
                    </div>
                </div>

                {/* Row 2: Date & Day & Period */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>تاريخ الاختبار</label>
                        <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اليوم (تلقائي)</label>
                        <input type="text" value={getDayName(examDate)} readOnly style={readonlyStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>الفترة</label>
                        <select value={period} onChange={e => setPeriod(e.target.value)} style={inputStyle}>
                            <option value="الفترة الأولى">الفترة الأولى</option>
                            <option value="الفترة الثانية">الفترة الثانية</option>
                        </select>
                    </div>
                </div>

                {/* Row 3: Time & Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '15px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>من الساعة</label>
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>إلى الساعة</label>
                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>زمن الاختبار (تلقائي)</label>
                        <input type="text" value={calculateDuration(startTime, endTime)} readOnly style={readonlyStyle} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    {editingId && <button onClick={() => { setEditingId(null); setExamDate(''); }} style={btnSecondary}>إلغاء</button>}
                    <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>
                        {saving ? 'جاري الحفظ...' : '💾 حفظ'}
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div style={cardStyle}>
                <h3 style={{marginTop:0, marginBottom:'15px', color:'#991b1b'}}>📋 جدول الاختبارات المسجل ({schedules.length})</h3>
                {loading ? <div style={{textAlign:'center'}}>جاري التحميل...</div> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>الرقم</th>
                                    <th style={thStyle}>التيرم</th>
                                    <th style={thStyle}>الصف</th>
                                    <th style={thStyle}>المادة</th>
                                    <th style={thStyle}>التاريخ</th>
                                    <th style={thStyle}>اليوم</th>
                                    <th style={thStyle}>الفترة</th>
                                    <th style={thStyle}>الوقت</th>
                                    <th style={thStyle}>الزمن</th>
                                    <th style={thStyle}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map((s, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={tdStyle}>{s['الرقم']}</td>
                                        <td style={tdStyle}>{s['التيرم']}</td>
                                        <td style={{...tdStyle, fontWeight:'bold'}}>{s['الصف']}</td>
                                        <td style={tdStyle}>{s['المادة']}</td>
                                        <td style={tdStyle}>{s['التاريخ'] ? new Date(s['التاريخ']).toLocaleDateString('ar-EG') : ''}</td>
                                        <td style={tdStyle}>{s['اليوم']}</td>
                                        <td style={tdStyle}>{s['الفترة']}</td>
                                        <td style={tdStyle}>{s['من']} - {s['إلى']}</td>
                                        <td style={tdStyle}>{s['الزمن']}</td>
                                        <td style={tdStyle}>
                                            <button onClick={() => handleEdit(s)} style={{...btnPrimary, padding:'5px 12px', fontSize:'12px', background:'#fdba74', color:'#9a3412'}}>✏️</button>
                                            <button onClick={() => handleDelete(s['الرقم'])} style={{...btnPrimary, padding:'5px 12px', fontSize:'12px', marginRight:'5px', background:'#fca5a5'}}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}