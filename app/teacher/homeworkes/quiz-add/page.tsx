'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function CreateTestPage() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId;
    const EmploeID = user?.personId;

    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    
    // بيانات الاختبار
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState(''); // تاريخ البداية
    const [endDate, setEndDate] = useState('');     // تاريخ النهاية
    const [duration, setDuration] = useState(30);   // مدة الحل بالدقائق

    const defaultQuestion = { text: '', type: 'mcq', a: '', b: '', c: '', d: '', ans: '', points: 1 };
    const [questions, setQuestions] = useState([defaultQuestion]);
    
    const [saving, setSaving] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);

    useEffect(() => {
        if (EmploeID) {
            fetch(`${API_URL}/api/getData1/17?id=${EmploeID}`)
                .then(res => res.json())
                .then(json => { if(json.success) setCourses(json.data || []); });
        }
    }, [EmploeID]);

    const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

    const handleQuestionChange = (index: number, field: string, value: string | number) => {
        const updated = [...questions];
        if (field === 'type') {
            updated[index] = { ...updated[index], type: value as string, a: '', b: '', c: '', d: '', ans: '' };
            if (value === 'tf') { updated[index].a = 'صح'; updated[index].b = 'خطأ'; updated[index].ans = 'A'; }
        } else {
            (updated[index] as any)[field] = value;
        }
        setQuestions(updated);
    };

    const addQuestion = () => setQuestions([...questions, { ...defaultQuestion }]);
    const removeQuestion = (index: number) => setQuestions(questions.filter((_, i) => i !== index));

    const handleReview = () => {
        if(!selectedCourse || !title || !startDate || !endDate || !duration) 
            return alert('اكمل بيانات الاختبار الأساسية (العنوان، الكورس، التواريخ، المدة)');
        
        if(new Date(startDate) >= new Date(endDate)) 
            return alert('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');

        for(let q of questions) {
            if(!q.text || !q.points) return alert('تأكد من نص السؤال ودرجته');
            if(q.type !== 'essay' && !q.ans) return alert('حدد الإجابة الصحيحة');
        }
        setIsPreviewing(true);
    };

    const handleSubmit = async () => {
        if (!schoolId || !EmploeID) return alert('خطأ في بيانات المستخدم');
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/tests`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    courseId: selectedCourse,
                    EmploeID,
                    schoolId,
                    title,
                    startDate, // إرسال التواريخ
                    endDate,
                    duration,
                    questions
                })
            });
            const data = await res.json();
            if(data.success) {
                alert('تم إنشاء الاختبار بنجاح!');
                // تصفير الحقول
                setTitle(''); setSelectedCourse(''); setStartDate(''); setEndDate(''); setDuration(30);
                setQuestions([{ text: '', type: 'mcq', a: '', b: '', c: '', d: '', ans: '', points: 1 }]);
                setIsPreviewing(false);
            } else {
                alert('خطأ: ' + data.error);
            }
        } catch(e: any) { alert('فشل الاتصال'); }
        finally { setSaving(false); }
    };

    const inputStyle = { width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '5px', fontSize: '14px' };
    const cardStyle = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #f1f5f9' };

    if (!isPreviewing) {
        return (
            <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
                <h2 style={{marginBottom: '20px', color: '#7c3aed'}}>🚀 إنشاء اختبار جديد</h2>

                {/* بيانات الاختبار الأساسية */}
                <div style={cardStyle}>
                    <label style={{fontWeight: '600'}}>عنوان الاختبار</label>
                    <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: اختبار نهائي" />

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px'}}>
                        <div>
                            <label style={{fontWeight: '600'}}>الكورس</label>
                            <select style={inputStyle} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                                <option value="">اختر...</option>
                                {courses.map(c => <option key={c['الرقم']} value={c['الرقم']}>{c['اسم الكورس']}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{fontWeight: '600'}}>مدة الحل (دقائق)</label>
                            <input type="number" style={inputStyle} value={duration} onChange={e => setDuration(Number(e.target.value))} placeholder="30" />
                        </div>
                    </div>

                    {/* قسم التواريخ المطلوب */}
                    <div style={{marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1'}}>
                        <h4 style={{margin: '0 0 10px', color: '#475569'}}>📅 فترة تواجد الاختبار (السماح بالدخول)</h4>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                            <div>
                                <label style={{fontSize: '13px', color: '#64748b'}}>تاريخ ووقت البداية (يظهر للمتاح)</label>
                                <input type="datetime-local" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{fontSize: '13px', color: '#64748b'}}>تاريخ ووقت النهاية (ينتهي السماح)</label>
                                <input type="datetime-local" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>
                        <p style={{fontSize: '12px', color: '#94a3b8', margin: '5px 0 0'}}>
                            * الطالب لن يتمكن من فتح الاختبار قبل البداية أو بعد النهاية.
                        </p>
                    </div>
                </div>

                {/* الأسئلة */}
                <h3 style={{margin: '20px 0 10px', color: '#334155'}}>الأسئلة (المجموع: {totalPoints} درجة)</h3>
                
                {questions.map((q, i) => (
                    <div key={i} style={{...cardStyle, borderRight: '4px solid #7c3aed'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                            <h4 style={{margin: 0}}>سؤال {i + 1}</h4>
                            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', padding: '5px 10px', borderRadius: '6px'}}>
                                    <span style={{fontSize: '12px'}}>الدرجة:</span>
                                    <input type="number" value={q.points} onChange={e => handleQuestionChange(i, 'points', Number(e.target.value))} style={{width: '50px', border: 'none', textAlign: 'center', fontWeight: 'bold', color: '#7c3aed'}} />
                                </div>
                                <select value={q.type} onChange={e => handleQuestionChange(i, 'type', e.target.value)} style={{padding: '5px', borderRadius: '4px'}}>
                                    <option value="mcq">اختياري</option>
                                    <option value="tf">صح/خطأ</option>
                                    <option value="essay">مقالي</option>
                                </select>
                                {questions.length > 1 && (
                                    <button onClick={() => removeQuestion(i)} style={{background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: '4px'}}>حذف</button>
                                )}
                            </div>
                        </div>

                        <textarea style={{...inputStyle, minHeight: '60px'}} placeholder="نص السؤال" value={q.text} onChange={e => handleQuestionChange(i, 'text', e.target.value)} />

                        {q.type === 'mcq' && (
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px'}}>
                                <input style={inputStyle} placeholder="اختيار A" value={q.a} onChange={e => handleQuestionChange(i, 'a', e.target.value)} />
                                <input style={inputStyle} placeholder="اختيار B" value={q.b} onChange={e => handleQuestionChange(i, 'b', e.target.value)} />
                                <input style={inputStyle} placeholder="اختيار C" value={q.c} onChange={e => handleQuestionChange(i, 'c', e.target.value)} />
                                <input style={inputStyle} placeholder="اختيار D" value={q.d} onChange={e => handleQuestionChange(i, 'd', e.target.value)} />
                                <div style={{gridColumn: 'span 2'}}>
                                    <label style={{fontSize: '12px'}}>الصحيحة:</label>
                                    <select value={q.ans} onChange={e => handleQuestionChange(i, 'ans', e.target.value)} style={{...inputStyle, width: '100px', marginLeft: '10px'}}>
                                        <option value="">اختر...</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {q.type === 'tf' && (
                            <div style={{marginTop: '10px'}}>
                                <label>الصحيحة:</label>
                                <select value={q.ans} onChange={e => handleQuestionChange(i, 'ans', e.target.value)} style={{...inputStyle, width: '150px', marginLeft: '10px'}}>
                                    <option value="A">صح</option>
                                    <option value="B">خطأ</option>
                                </select>
                            </div>
                        )}
                        
                        {q.type === 'essay' && (
                             <div style={{marginTop: '10px'}}>
                                <label style={{fontSize: '12px'}}>نموذج الإجابة:</label>
                                <textarea style={{...inputStyle, minHeight: '60px'}} value={q.ans} onChange={e => handleQuestionChange(i, 'ans', e.target.value)} />
                            </div>
                        )}
                    </div>
                ))}

                <button onClick={addQuestion} style={{...inputStyle, background: '#f1f5f9', cursor: 'pointer', fontWeight: '600', border: '1px dashed #cbd5e1'}}>
                    + إضافة سؤال
                </button>

                <button onClick={handleReview} style={{...inputStyle, background: '#7c3aed', color: 'white', fontWeight: '700', marginTop: '20px', cursor: 'pointer'}}>
                    مراجعة الاختبار 👁️
                </button>
            </div>
        );
    }

    // === المراجعة ===
    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                <h2>👀 مراجعة الاختبار</h2>
                <button onClick={() => setIsPreviewing(false)} style={{background: '#f1f5f9', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>تعديل</button>
            </div>

            <div style={{...cardStyle, background: '#faf5ff'}}>
                <h3 style={{margin: '0 0 10px', color: '#6b21a8'}}>{title} (الدرجة: {totalPoints})</h3>
                <p style={{margin: 0, color: '#64748b', fontSize: '14px'}}>
                    الكورس: {courses.find(c => String(c['الرقم']) === selectedCourse)?.['اسم الكورس']}
                </p>
                <p style={{margin: '5px 0 0', color: '#64748b', fontSize: '14px'}}>
                    ⏱️ المدة: {duration} دقيقة
                </p>
                <p style={{margin: '5px 0 0', color: '#059669', fontSize: '14px'}}>
                    📅 متاح من: {new Date(startDate).toLocaleString()} <br/>
                    📅 إلى: {new Date(endDate).toLocaleString()}
                </p>
            </div>

            {questions.map((q, i) => (
                <div key={i} style={cardStyle}>
                    <h4 style={{margin: '0 0 10px'}}>{i + 1}. {q.text} <small style={{color:'#7c3aed'}}>({q.points} درجة)</small></h4>
                    {q.type === 'mcq' && (
                         <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                            <li style={{color: q.ans === 'A' ? '#059669' : '#475569', fontWeight: q.ans === 'A' ? 'bold' : 'normal'}}>A. {q.a}</li>
                            <li style={{color: q.ans === 'B' ? '#059669' : '#475569', fontWeight: q.ans === 'B' ? 'bold' : 'normal'}}>B. {q.b}</li>
                            <li style={{color: q.ans === 'C' ? '#059669' : '#475569', fontWeight: q.ans === 'C' ? 'bold' : 'normal'}}>C. {q.c}</li>
                            <li style={{color: q.ans === 'D' ? '#059669' : '#475569', fontWeight: q.ans === 'D' ? 'bold' : 'normal'}}>D. {q.d}</li>
                        </ul>
                    )}
                </div>
            ))}

            <div style={{textAlign: 'center', marginTop: '30px'}}>
                <button onClick={handleSubmit} disabled={saving} style={{padding: '12px 40px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', fontWeight: '700'}}>
                    {saving ? 'جاري الحفظ...' : '✅ تأكيد إنشاء الاختبار'}
                </button>
            </div>
        </div>
    );
}