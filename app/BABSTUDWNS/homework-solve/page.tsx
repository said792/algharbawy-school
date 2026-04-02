'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// 1. تعريف نوع محدد للاختيارات
type OptionType = {
    ID: string;
    Text: string;
};

export default function StudentHomeworksPage() {
    const { user } = useAuthStore();
    const studentId = user?.personId;
    const schoolId = user?.schoolId;

    type HomeworkItem = {
        HomeworkID: number;
        Title: string;
        CourseName: string;
        TotalQuestions: number;
        AttemptsCount: number;
        BestScore: number;
    };

    const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
    const [activeHomework, setActiveHomework] = useState<HomeworkItem | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<{[key: number]: string}>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_URL}/api/homeworks/student?studentId=${studentId}&schoolId=${schoolId}`);
                const data = await res.json();
                if (data.success) setHomeworks(data.data);
            } catch(e) { console.error(e); } 
            finally { setLoading(false); }
        };
        if (studentId) fetchData();
    }, [studentId]);

    const startHomework = async (hw: HomeworkItem) => {
        setActiveHomework(hw);
        setResult(null);
        setAnswers({});
        try {
            const res = await fetch(`${API_URL}/api/homeworks/${hw.HomeworkID}/questions`);
            const data = await res.json();
            if (data.success) setQuestions(data.data);
        } catch(e) { alert('خطأ في تحميل الأسئلة'); }
    };

    const submitAnswers = async () => {
        if (!activeHomework) return;
        
        setSubmitting(true);
        const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({ qId: Number(qId), ans }));
        
        try {
            const res = await fetch(`${API_URL}/api/homeworks/submit`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    homeworkId: activeHomework.HomeworkID,
                    studentId: studentId,
                    answers: formattedAnswers
                })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data);
                setHomeworks(prev => prev.map((h) => {
                    if (h.HomeworkID === activeHomework.HomeworkID) {
                        return { ...h, AttemptsCount: data.attempt, BestScore: Math.max(h.BestScore, data.score) };
                    }
                    return h;
                }));
            } else {
                alert(data.message || 'حدث خطأ');
            }
        } catch(e) { alert('فشل الإرسال'); }
        finally { setSubmitting(false); }
    };

    // 2. استخدام النوع المحدد في الدالة

    // === دالة مصححة لإرجاع الحرف فقط (A, B, C, D) ==
    const getOptions = (q: any): OptionType[] => {
        if (q.Options && Array.isArray(q.Options)) return q.Options;
        if (q.options && Array.isArray(q.options)) return q.options;

        const tempOptions: OptionType[] = [];
        // الأسماء كما وردت في الـ SQL Procedure
        const sqlKeys = ['OptionA', 'OptionB', 'OptionC', 'OptionD'];
        
        sqlKeys.forEach((key) => {
            if (q[key]) {
                tempOptions.push({
                    // نقوم بقطع كلمة "Option" وأخذ الحرف الأخير فقط
                    // مثال: "OptionA" تصبح "A"
                    ID: key.replace('Option', ''), 
                    Text: q[key]
                });
            }
        });

        return tempOptions;
    };


    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
    const btnStyle: React.CSSProperties = { background: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' };

    if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>جاري التحميل...</div>;

    if (!activeHomework) {
        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{marginBottom: '20px'}}>📚 الواجبات المنزلية</h2>
                {homeworks.length === 0 && <p>لا توجد واجبات حالياً</p>}
                {homeworks.map((hw) => (
                    <div key={hw.HomeworkID} style={cardStyle}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>
                                <h3 style={{margin: 0}}>{hw.Title}</h3>
                                <small style={{color: '#64748b'}}>{hw.CourseName} | عدد الأسئلة: {hw.TotalQuestions}</small>
                            </div>
                            <div style={{textAlign: 'left'}}>
                                <div style={{fontWeight: '700', color: '#10b981'}}>
                                    {hw.AttemptsCount > 0 ? `أعلى درجة: ${hw.BestScore}/${hw.TotalQuestions}` : 'لم تبدأ بعد'}
                                </div>
                            </div>
                        </div>
                        <div style={{marginTop: '15px'}}>
                            <button onClick={() => startHomework(hw)} style={btnStyle}>
                                {hw.AttemptsCount > 0 ? 'إعادة المحاولة' : 'ابدأ الحل'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center'}}>
                <h2 style={{margin: 0}}>{activeHomework?.Title}</h2>
                <button onClick={() => setActiveHomework(null)} style={{...btnStyle, background: '#64748b'}}>رجوع للقائمة</button>
            </div>

            {result ? (
                <div style={{...cardStyle, background: '#f8fafc'}}>
                    <div style={{textAlign: 'center', marginBottom: '30px'}}>
                        <h2 style={{color: '#047857'}}>تم التصحيح!</h2>
                        <div style={{fontSize: '48px', fontWeight: '800'}}>{result.score} / {questions.length}</div>
                    </div>

                    {questions.map((q, index) => {
                        const options = getOptions(q);
                        const userAnswerKey = answers[q.QuestionID];
                        const userAnswerText = options.find(opt => opt.ID === userAnswerKey)?.Text;

                        return (
                            <div key={q.QuestionID} style={{...cardStyle, border: '1px solid #e2e8f0'}}>
                                <h4 style={{margin: '0 0 10px 0'}}>
                                    {index + 1}. {q.QuestionText}
                                </h4>
                                
                                <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                    {/* 3. استخدام النوع المحدد هنا لحل الخطأ */}
                                    {options.map((opt: OptionType) => {
                                        const isSelected = userAnswerKey === opt.ID;
                                        let bgColor = 'white';
                                        if (isSelected) bgColor = '#f0f9ff';

                                        return (
                                            <div key={opt.ID} style={{
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                                background: bgColor,
                                            }}>
                                                {opt.Text}
                                                {isSelected && <span style={{marginRight: '10px', color: '#2563eb', fontWeight: 'bold'}}>(اختيارك)</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    <button onClick={() => startHomework(activeHomework!)} style={{...btnStyle, background: '#0ea5e9', width: '100%', marginTop: '20px', padding: '15px'}}>
                        إعادة المحاولة
                    </button>
                </div>
            ) : (
                <>
                    {questions.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '40px'}}>جاري تحميل الأسئلة...</div>
                    ) : (
                        questions.map((q, index) => {
                            const options = getOptions(q);
                            
                            return (
                                <div key={q.QuestionID} style={cardStyle}>
                                    <h4 style={{margin: '0 0 15px 0', fontSize: '16px'}}>
                                        {index + 1}. {q.QuestionText}
                                    </h4>
                                    
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                        {/* 3. استخدام النوع المحدد هنا أيضاً */}
                                        {options.map((opt: OptionType) => {
                                            return (
                                                <label 
                                                    key={opt.ID} 
                                                    style={{
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        border: answers[q.QuestionID] === opt.ID ? '2px solid #10b981' : '1px solid #e2e8f0',
                                                        background: answers[q.QuestionID] === opt.ID ? '#f0fdf4' : 'white',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name={`question-${q.QuestionID}`} 
                                                        value={opt.ID}
                                                        onChange={(e) => setAnswers({...answers, [q.QuestionID]: e.target.value})}
                                                        checked={answers[q.QuestionID] === opt.ID}
                                                        style={{marginLeft: '10px', width: '18px', height: '18px'}}
                                                    />
                                                    <span style={{fontSize: '15px'}}>{opt.Text}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    <button 
                        onClick={submitAnswers} 
                        disabled={submitting || questions.length === 0} 
                        style={{
                            ...btnStyle, 
                            width: '100%', 
                            padding: '15px', 
                            fontSize: '18px', 
                            opacity: (submitting || questions.length === 0) ? 0.7 : 1,
                            marginTop: '10px'
                        }}
                    >
                        {submitting ? 'جاري التصحيح...' : 'إنهاء وتسليم'}
                    </button>
                </>
            )}
        </div>
    );
}