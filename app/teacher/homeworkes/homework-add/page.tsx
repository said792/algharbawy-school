'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function CreateHomeworkPage() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId;
    const EmploeID = user?.personId;

    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [title, setTitle] = useState('');
    
    // حالة السؤال الافتراضية
    const defaultQuestion = { text: '', type: 'mcq', a: '', b: '', c: '', d: '', ans: '' };
    const [questions, setQuestions] = useState([defaultQuestion]);
    
    const [saving, setSaving] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false); // حالة المراجعة

    useEffect(() => {
        if (EmploeID) {
            fetch(`${API_URL}/api/getData1/17?id=${EmploeID}`)
                .then(res => res.json())
                .then(json => { if(json.success) setCourses(json.data || []); });
        }
    }, [EmploeID]);

    const handleQuestionChange = (index: number, field: string, value: string) => {
        const updated = [...questions];
        // لو نوع السؤال اتغير، نمسح الاختيارات القديمة عشان الـ Logic
        if (field === 'type') {
            updated[index] = { 
                ...updated[index], 
                type: value, 
                a: '', b: '', c: '', d: '', ans: '' 
            };
            // لو صح وخطأ، نعبي الاختيارات تلقائي
            if (value === 'tf') {
                updated[index].a = 'صح';
                updated[index].b = 'خطأ';
                updated[index].ans = 'A'; // افتراضي
            }
        } else {
            (updated[index] as any)[field] = value;
        }
        setQuestions(updated);
    };

    const addQuestion = () => {
        setQuestions([...questions, { ...defaultQuestion }]);
    };

    const removeQuestion = (index: number) => {
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
    };

    // زر المراجعة
    const handleReview = () => {
        // تحقق بسيط
        if(!selectedCourse || !title) return alert('اختر الكورس واكتب عنوان الواجب');
        if(questions.length === 0) return alert('أضف سؤالاً واحداً على الأقل');
        
        // تحقق من ملء البيانات حسب النوع
        for(let i=0; i<questions.length; i++) {
            const q = questions[i];
            if(!q.text) return alert(`السؤال رقم ${i+1} فارغ`);
            if(q.type === 'mcq' && (!q.a || !q.b || !q.c || !q.d || !q.ans)) return alert(`السؤال رقم ${i+1} (اختياري) ناقص البيانات`);
            if(q.type === 'tf' && !q.ans) return alert(`اختر إجابة السؤال رقم ${i+1} (صح/خطأ)`);
            if(q.type === 'essay' && !q.ans) return alert(`اكتب نموذج الإجابة للسؤال رقم ${i+1} (مقالي)`);
        }

        setIsPreviewing(true);
    };

    // زر الحفظ النهائي
       // ... داخل دالة handleSubmit
    
    const handleSubmit = async () => {
        // تحقق إضافي للتأكد من وجود البيانات
        if (!schoolId || !EmploeID) {
            return alert('خطأ: بيانات المستخدم (المعلم أو المدرسة) غير موجودة، يرجى تسجيل الدخول مرة أخرى.');
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/homeworks`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    courseId: selectedCourse,
                    EmploeID: EmploeID, // ✅ تم التعديل من teacherId إلى EmploeID
                    schoolId: schoolId,
                    title: title,
                    questions: questions
                })
            });
            const data = await res.json();
            
            if(data.success) {
                alert('تم حفظ الواجب بنجاح!');
                setTitle('');
                setSelectedCourse('');
                setQuestions([{ text: '', type: 'mcq', a: '', b: '', c: '', d: '', ans: '' }]);
                setIsPreviewing(false);
            } else {
                alert('خطأ: ' + (data.error || 'لم يتم الحفظ'));
            }
        } catch(e: any) { 
            alert('فشل الاتصال: ' + e.message); 
        }
        finally { setSaving(false); }
    };
    // Styles
    const inputStyle = { width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '5px', fontSize: '14px' };
    const cardStyle = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #f1f5f9' };
    
    // نموذج الإدخال (الوضع العادي)
    if (!isPreviewing) {
        return (
            <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
                <h2 style={{marginBottom: '20px', color: '#1e293b'}}>📝 إنشاء واجب جديد</h2>

                <div style={cardStyle}>
                    <label style={{fontWeight: '600', display: 'block', marginBottom: '5px'}}>عنوان الواجب</label>
                    <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: واجب الوحدة الأولى" />
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px'}}>
                        <div>
                            <label style={{fontWeight: '600', display: 'block', marginBottom: '5px'}}>اختر الكورس</label>
                            <select style={inputStyle} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                                <option value="">اختر...</option>
                                {courses.map(c => <option key={c['الرقم']} value={c['الرقم']}>{c['اسم الكورس']}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <h3 style={{margin: '20px 0 10px', color: '#334155'}}>الأسئلة ({questions.length})</h3>
                
                {questions.map((q, i) => (
                    <div key={i} style={{...cardStyle, borderRight: '4px solid #3b82f6'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                            <h4 style={{margin: 0, color: '#1e293b'}}>سؤال {i + 1}</h4>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <select 
                                    value={q.type} 
                                    onChange={e => handleQuestionChange(i, 'type', e.target.value)}
                                    style={{padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1'}}
                                >
                                    <option value="mcq">اختيار من متعدد</option>
                                    <option value="tf">صح وخطأ</option>
                                    <option value="essay">مقالي</option>
                                </select>
                                {questions.length > 1 && (
                                    <button onClick={() => removeQuestion(i)} style={{background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'}}>حذف</button>
                                )}
                            </div>
                        </div>

                        <textarea 
                            style={{...inputStyle, minHeight: '60px'}} 
                            placeholder="نص السؤال" 
                            value={q.text} 
                            onChange={e => handleQuestionChange(i, 'text', e.target.value)} 
                        />

                        {q.type === 'mcq' && (
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px'}}>
                                <input style={inputStyle} placeholder="اختيار A" value={q.a} onChange={e => handleQuestionChange(i, 'a', e.target.value)} />
                                <input style={inputStyle} placeholder="اختيار B" value={q.b} onChange={e => handleQuestionChange(i, 'b', e.target.value)} />
                                <input style={inputStyle} placeholder="اختيار C" value={q.c} onChange={e => handleQuestionChange(i, 'c', e.target.value)} />
                                <input style={inputStyle} placeholder="اختيار D" value={q.d} onChange={e => handleQuestionChange(i, 'd', e.target.value)} />
                                <div style={{gridColumn: 'span 2'}}>
                                    <label style={{fontSize: '12px'}}>الإجابة الصحيحة:</label>
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
                                <label style={{fontSize: '12px'}}>الإجابة الصحيحة:</label>
                                <select value={q.ans} onChange={e => handleQuestionChange(i, 'ans', e.target.value)} style={{...inputStyle, width: '150px', marginLeft: '10px'}}>
                                    <option value="A">صح</option>
                                    <option value="B">خطأ</option>
                                </select>
                            </div>
                        )}

                        {q.type === 'essay' && (
                             <div style={{marginTop: '10px'}}>
                                <label style={{fontSize: '12px'}}>نموذج الإجابة (للمعلم):</label>
                                <textarea 
                                    style={{...inputStyle, minHeight: '60px'}} 
                                    placeholder="اكتب نموذج الإجابة أو كلمات مفتاحية" 
                                    value={q.ans} 
                                    onChange={e => handleQuestionChange(i, 'ans', e.target.value)} 
                                />
                            </div>
                        )}
                    </div>
                ))}

                <button onClick={addQuestion} style={{...inputStyle, background: '#f1f5f9', cursor: 'pointer', fontWeight: '600', border: '1px dashed #cbd5e1'}}>
                    + إضافة سؤال جديد
                </button>

                <button onClick={handleReview} style={{...inputStyle, background: '#0ea5e9', color: 'white', fontWeight: '700', fontSize: '16px', cursor: 'pointer', marginTop: '20px'}}>
                    مراجعة الواجب قبل الحفظ 👁️
                </button>
            </div>
        );
    }

    // وضع المراجعة (Preview Mode)
    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2>👀 مراجعة الواجب</h2>
                <button onClick={() => setIsPreviewing(false)} style={{background: '#f1f5f9', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}>
                    تعديل الأسئلة
                </button>
            </div>

            <div style={{...cardStyle, background: '#f8fafc'}}>
                <h3 style={{margin: '0 0 10px', color: '#059669'}}>{title}</h3>
                <p style={{margin: 0, color: '#64748b', fontSize: '14px'}}>الكورس: {courses.find(c => String(c['الرقم']) === selectedCourse)?.['اسم الكورس']}</p>
            </div>

            {questions.map((q, i) => (
                <div key={i} style={{...cardStyle, background: 'white', marginBottom: '15px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <h4 style={{margin: '0 0 10px'}}>{i + 1}. {q.text}</h4>
                        <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '4px', height: 'fit-content',
                            background: q.type === 'mcq' ? '#dbeafe' : q.type === 'tf' ? '#fef3c7' : '#e0e7ff',
                            color: q.type === 'mcq' ? '#1e40af' : q.type === 'tf' ? '#92400e' : '#3730a3'
                        }}>
                            {q.type === 'mcq' ? 'اختياري' : q.type === 'tf' ? 'صح/خطأ' : 'مقالي'}
                        </span>
                    </div>
                    
                    {q.type === 'mcq' && (
                        <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                            <li style={{padding: '5px 0', color: q.ans === 'A' ? '#059669' : '#475569', fontWeight: q.ans === 'A' ? 'bold' : 'normal'}}>A. {q.a}</li>
                            <li style={{padding: '5px 0', color: q.ans === 'B' ? '#059669' : '#475569', fontWeight: q.ans === 'B' ? 'bold' : 'normal'}}>B. {q.b}</li>
                            <li style={{padding: '5px 0', color: q.ans === 'C' ? '#059669' : '#475569', fontWeight: q.ans === 'C' ? 'bold' : 'normal'}}>C. {q.c}</li>
                            <li style={{padding: '5px 0', color: q.ans === 'D' ? '#059669' : '#475569', fontWeight: q.ans === 'D' ? 'bold' : 'normal'}}>D. {q.d}</li>
                        </ul>
                    )}
                     {q.type === 'tf' && (
                        <div style={{color: '#475569'}}>
                            الإجابة الصحيحة: <strong style={{color: '#059669'}}>{q.ans === 'A' ? 'صح' : 'خطأ'}</strong>
                        </div>
                    )}
                    {q.type === 'essay' && (
                        <div style={{background: '#f1f5f9', padding: '10px', borderRadius: '6px', fontSize: '14px', color: '#334155'}}>
                            <strong>نموذج الإجابة:</strong><br/>
                            {q.ans}
                        </div>
                    )}
                </div>
            ))}

            <div style={{textAlign: 'center', marginTop: '30px'}}>
                <p style={{color: '#64748b', marginBottom: '15px'}}>هل أنت متأكد من حفظ هذا الواجب؟</p>
                <button onClick={handleSubmit} disabled={saving} style={{padding: '12px 40px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', fontWeight: '700'}}>
                    {saving ? 'جاري الحفظ...' : '✅ تأكيد وحفظ الواجب'}
                </button>
            </div>
        </div>
    );
}