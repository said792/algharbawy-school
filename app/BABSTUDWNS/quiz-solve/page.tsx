'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function StudentTestsPage() {
    const { user } = useAuthStore();
    const studentId = user?.personId;
    const schoolId = user?.schoolId;

    const [tests, setTests] = useState<any[]>([]);
    const [activeTest, setActiveTest] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<{[key: number]: string}>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    // === حالة العداد الزمني ===
    const [timeLeft, setTimeLeft] = useState(0); // بالثواني

    // 1. جلب الاختبارات
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_URL}/api/tests/student?studentId=${studentId}&schoolId=${schoolId}`);
                const data = await res.json();
                if (data.success) setTests(data.data);
            } catch(e) {} 
            finally { setLoading(false); }
        };
        if (studentId) fetchData();
    }, [studentId]);

    // 2. مؤقت الاختبار (Timer)
    useEffect(() => {
        if (!activeTest || result) return; // لو مفيش اختبار شغال أو خلصنا، قفل المؤقت

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // انتهى الوقت -> إرسال تلقائي
                    alert('انتهى الوقت! سيتم إرسال إجاباتك الآن.');
                    submitAnswers(true); // force submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer); // تنظيف المؤقت
    }, [activeTest, result]);

    // تحويل الوقت لصيغة مقروءة (MM:SS)
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // بدء الاختبار
    const startTest = async (test: any) => {
        if (test.IsSubmitted) return alert('لقد قمت بحل هذا الاختبار مسبقاً.');
        
        setActiveTest(test);
        setResult(null);
        setAnswers({});
        try {
            const res = await fetch(`${API_URL}/api/tests/${test.TestID}/questions`);
            const data = await res.json();
            if (data.success) {
                setQuestions(data.data);
                // ضبط العداد (المدة بالدقائق * 60)
                setTimeLeft(test.DurationMinutes * 60);
            }
        } catch(e) { alert('خطأ في تحميل الأسئلة'); }
    };

    // إرسال الإجابات
    const submitAnswers = async (isAutoSubmit = false) => {
        if (!activeTest) return;
        if (!isAutoSubmit && Object.keys(answers).length < questions.length) {
            if(!confirm('لم تجب على جميع الأسئلة. هل تريد الإرسال؟')) return;
        }
        
        setSubmitting(true);
        const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({ qId: Number(qId), ans }));
        
        try {
            const res = await fetch(`${API_URL}/api/tests/submit`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    testId: activeTest.TestID,
                    studentId: studentId,
                    answers: formattedAnswers
                })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data);
                // تحديث حالة الاختبار في القائمة
                setTests(prev => prev.map(t => t.TestID === activeTest.TestID ? {...t, IsSubmitted: true} : t));
            } else {
                alert('خطأ: ' + data.error);
            }
        } catch(e) { alert('فشل الإرسال'); }
        finally { setSubmitting(false); }
    };

    // === دالة استخراج الاختيارات (نفس فكرة الواجبات) ===
    const getOptions = (q: any) => {
        if (q.QuestionType === 'essay') return [];
        return [
            { ID: 'A', Text: q.OptionA },
            { ID: 'B', Text: q.OptionB },
            { ID: 'C', Text: q.OptionC },
            { ID: 'D', Text: q.OptionD }
        ].filter(opt => opt.Text); // إزالة الاختيارات الفارغة
    };

    // === واجهة القائمة ===
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
    const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' };

    if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>جاري التحميل...</div>;

    if (!activeTest) {
        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{marginBottom: '20px'}}>📝 الاختبارات</h2>
                
                {tests.length === 0 && <p>لا توجد اختبارات متاحة</p>}

                {tests.map((test) => {
                    const now = new Date();
                    const start = new Date(test.StartDate);
                    const end = new Date(test.EndDate);
                    
                    let status = 'available'; // available, upcoming, ended
                    let btnLabel = 'ابدأ الاختبار';
                    let btnColor = '#10b981';
                    let disabled = false;

                    if (now < start) {
                        status = 'upcoming';
                        btnLabel = 'لم يبدأ بعد';
                        btnColor = '#94a3b8';
                        disabled = true;
                    } else if (now > end) {
                        status = 'ended';
                        btnLabel = 'انتهت المدة';
                        btnColor = '#ef4444';
                        disabled = true;
                    }

                    if (test.IsSubmitted) {
                        btnLabel = 'تم الحل ✅';
                        btnColor = '#64748b';
                        disabled = true;
                    }

                    return (
                        <div key={test.TestID} style={cardStyle}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                    <h3 style={{margin: 0}}>{test.Title}</h3>
                                    <small style={{color: '#64748b'}}>{test.CourseName} | المدة: {test.DurationMinutes} دقيقة</small>
                                    <br/>
                                    <small style={{color: status === 'available' ? '#059669' : '#64748b', fontSize: '12px'}}>
                                        متاح من: {start.toLocaleString()} إلى {end.toLocaleString()}
                                    </small>
                                </div>
                                <button 
                                    onClick={() => startTest(test)} 
                                    disabled={disabled}
                                    style={{...btnStyle, background: btnColor, color: 'white', opacity: disabled ? 0.7 : 1}}
                                >
                                    {btnLabel}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // === واجهة الحل ===
    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            {/* شريط العنوان والعداد */}
            <div style={{position: 'sticky', top: '0', background: 'white', zIndex: 10, padding: '15px 0', borderBottom: '1px solid #e2e8f0', marginBottom: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h2 style={{margin: 0, color: '#1e293b'}}>{activeTest.Title}</h2>
                    <div style={{
                        background: timeLeft < 60 ? '#fef2f2' : '#eff6ff', 
                        color: timeLeft < 60 ? '#dc2626' : '#1d4ed8', 
                        padding: '8px 16px', 
                        borderRadius: '20px',
                        fontWeight: '800',
                        fontSize: '18px',
                        border: `2px solid ${timeLeft < 60 ? '#fecaca' : '#bfdbfe'}`
                    }}>
                        ⏱️ {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            {result ? (
                <div style={{...cardStyle, textAlign: 'center', background: '#f0fdf4', border: '2px solid #10b981'}}>
                    <h2 style={{color: '#047857'}}>تم تسليم الاختبار!</h2>
                    <div style={{fontSize: '48px', fontWeight: '800', color: '#059669'}}>
                        {result.score} / {result.total}
                    </div>
                    <p style={{color: '#64748b'}}>درجتك النهائية</p>
                    <button 
                        onClick={() => setActiveTest(null)} 
                        style={{...btnStyle, background: '#0ea5e9', color: 'white', marginTop: '20px'}}
                    >
                        العودة للقائمة
                    </button>
                </div>
            ) : (
                <>
                    {questions.map((q, index) => (
                        <div key={q.QuestionID} style={{...cardStyle, borderRight: '4px solid #3b82f6'}}>
                            <h4 style={{margin: '0 0 10px', fontSize: '16px'}}>
                                {index + 1}. {q.QuestionText}
                                <span style={{fontSize: '12px', color: '#64748b', marginRight: '10px'}}>({q.Points} درجات)</span>
                            </h4>
                            
                            {q.QuestionType === 'essay' ? (
                                <textarea 
                                    style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '80px'}}
                                    placeholder="اكتب إجابتك هنا..."
                                    value={answers[q.QuestionID] || ''}
                                    onChange={(e) => setAnswers({...answers, [q.QuestionID]: e.target.value})}
                                />
                            ) : (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    {getOptions(q).map((opt: any) => (
                                        <label 
                                            key={opt.ID}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px',
                                                borderRadius: '8px',
                                                border: answers[q.QuestionID] === opt.ID ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                                background: answers[q.QuestionID] === opt.ID ? '#eff6ff' : 'white',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <input 
                                                type="radio" 
                                                name={`q-${q.QuestionID}`}
                                                value={opt.ID}
                                                checked={answers[q.QuestionID] === opt.ID}
                                                onChange={(e) => setAnswers({...answers, [q.QuestionID]: e.target.value})}
                                                style={{marginLeft: '10px'}}
                                            />
                                            <strong style={{marginLeft: '5px'}}>{opt.ID}.</strong> {opt.Text}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <button 
                        onClick={() => submitAnswers(false)}
                        disabled={submitting}
                        style={{
                            width: '100%', 
                            padding: '15px', 
                            background: submitting ? '#94a3b8' : '#10b981', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '10px', 
                            fontSize: '18px', 
                            fontWeight: '700', 
                            cursor: 'pointer',
                            marginTop: '30px'
                        }}
                    >
                        {submitting ? 'جاري التسليم...' : 'إنهاء الاختبار وتسليم'}
                    </button>
                </>
            )}
        </div>
    );
}