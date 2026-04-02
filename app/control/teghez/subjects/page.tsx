'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
    'الرقم': number;
    'الصف الدراسى': string;
}

interface Subject {
    SabgektID: number;
    SabgekName: string;
    IsSelected: boolean;
    EvaluationCount: number;
    EvaluationTotalMax: number;
    HasExam: boolean;
    ExamMax: number;
    IsEvaluationOnly: boolean;
    IsExamOnly: boolean;
    SubjectGradeID: number;
}

interface Part {
    PartNumber: number;
    PartName: string;
    PartGrade: number;
}

export default function SubjectSetupPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId;
    const schoolName = user?.schoolName;
    const stageName = work?.stageName;

    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [parts, setParts] = useState<Part[]>([]);
    
    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedGradeName, setSelectedGradeName] = useState<string>('');
    
    const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // === 1. جلب الصفوف ===
    useEffect(() => {
        const fetchGrades = async () => {
            if (!schoolName || !stageName) return;
            try {
                const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                const json = await res.json();
                if (json.success) setGrades(json.data);
            } catch (err) { console.error(err); }
        };
        fetchGrades();
    }, [schoolName, stageName]);

    // === 2. جلب المواد عند اختيار الصف ===
    const handleLoadSubjects = async () => {
        if (!selectedGradeId) return alert('اختر الصف أولاً');
        setLoading(true);
        setParts([]); // تفريغ الأجزاء
        setSelectedSubjectIndex(null);
        try {
            // INPOT = 65 لجلب المواد
            const res = await fetch(`${API_URL}/api/getData1/66?id=${selectedGradeId}`);
            const json = await res.json();
            if (json.success) {
                setSubjects(json.data);
            } else {
                setSubjects([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // === 3. عند الضغط على مادة لعرض/تعديل الأجزاء ===
    const handleSelectSubject = async (index: number) => {
        setSelectedSubjectIndex(index);
        const subject = subjects[index];
        
        if (subject.SubjectGradeID > 0) {
            // جلب الأجزاء الموجودة
            try {
             const res = await fetch(`${API_URL}/api/getData1/67?id=${subject.SubjectGradeID}`);
                const json = await res.json();
                if (json.success && json.data) setParts(json.data);
                else setParts([]);
            } catch { setParts([]); }
        } else {
            setParts([]);
        }
    };

    // === 4. تحديث بيانات المادة في الـ State ===
       const handleSubjectChange = (index: number, field: keyof Subject, value: any) => {
        const updated = [...subjects];
        // هنا بنحدث القيمة
        (updated[index] as any)[field] = value;
        
        // لو المستخدم غير الـ IsSelected لـ true، نتأكد إن الـ checkboxes التانية متأثرش
        // (مثلاً لو اختار "تقييم فقط" يفصل "لها امتحان" تلقائي - ده اختياري بس مفيد)
        if (field === 'IsSelected' && value === true) {
             // ممكن نحط قيم افتراضية هنا
        }
        
        setSubjects(updated);
    };

    // === 5. تحديث بيانات الأجزاء ===
    const handlePartChange = (index: number, field: keyof Part, value: any) => {
        const updated = [...parts];
        (updated[index] as any)[field] = value;
        setParts(updated);
    };

    const addPart = () => {
        setParts([...parts, { PartNumber: parts.length + 1, PartName: '', PartGrade: 0 }]);
    };

    // === 6. الحفظ ===
      // === دالة الحفظ المحدثة ===
    const handleSave = async () => {
        if (selectedSubjectIndex === null) return alert('اختر المادة أولاً');
        
        const subject = subjects[selectedSubjectIndex];
        
        // منطق العملية: لو مش مختار "تُدرّس" ويوجد ID، يعني حذف (32)، غير كده حفظ (1)
        // ملاحظة: لو IsSelected = false و SubjectGradeID = 0، يبقى مفيش حاجة تعملها (مateria مش موجودة أصلاً)
        if (!subject.IsSelected && subject.SubjectGradeID === 0) {
            return alert('لم يتم تحديد المادة للحفظ.');
        }

        setLoading(true);
        try {
            const operation = subject.IsSelected ? 1 : 32; // 1 حفظ، 32 حذف

            const payload = {
                SabgektID: subject.SabgektID,
                GereadID: selectedGradeId, // تحويل الاسم للي في الـ SP
                EvaluationCount: subject.EvaluationCount,
                EvaluationTotalMax: subject.EvaluationTotalMax,
                HasExam: subject.HasExam,
                ExamMax: subject.ExamMax,
                IsEvaluationOnly: subject.IsEvaluationOnly,
                IsExamOnly: subject.IsExamOnly,
                Parts: operation === 1 ? parts : [], // الأجزاء تُرسل فقط في حالة الحفظ
                Operation: operation
            };

            const res = await fetch(`${API_URL}/api/subjects/save-setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ تم ${operation === 32 ? 'إلغاء تفعيل المادة' : 'الحفظ'} بنجاح`);
                // إعادة تحميل المواد لتحديث الشاشة
                handleLoadSubjects();
                
                // إعادة تعيين اختيار المادة
                setSelectedSubjectIndex(null);
                setParts([]);
            } else {
                alert('فشل العملية: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '20px', border: '1px solid #e5e7eb' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', textAlign: 'center' };
    const checkStyle: React.CSSProperties = { width: '20px', height: '20px', cursor: 'pointer', accentColor: '#4f46e5' };
    const thStyle: React.CSSProperties = { padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#374151', fontWeight: 'bold', textAlign: 'center' };
    const tdStyle: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' };
    const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: 'white', cursor: 'pointer', fontWeight: 'bold' };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px' }}>📚 تجهيز المواد للرصد</h1>
                    <p style={{ margin: '5px 0 0', opacity: 0.9 }}>إعداد مواد الصف الواحد وأجزاء التقييم</p>
                </div>
            </div>

            {/* اختيار الصف */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اختر الصف</label>
                        <select 
                            value={selectedGradeId || ''} 
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                setSelectedGradeId(id);
                                const g = grades.find(x => x['الرقم'] === id);
                                setSelectedGradeName(g ? g['الصف الدراسى'] : '');
                                setSubjects([]);
                                setParts([]);
                            }}
                            style={{ ...inputStyle, padding: '12px' }}
                        >
                            <option value="">-- اختر --</option>
                            {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                        </select>
                    </div>
                    <button onClick={handleLoadSubjects} style={btnPrimary}>
                        اختيار المادة (عرض)
                    </button>
                </div>
            </div>

            {/* جدول المواد */}
            {subjects.length > 0 && (
                <div style={cardStyle}>
                    <h3 style={{marginTop:0, marginBottom:'15px', color:'#4f46e5'}}>المواد للصف: {selectedGradeName}</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>تُدرّس؟</th>
                                    <th style={thStyle}>اسم المادة</th>
                                    <th style={thStyle}>عدد أجزاء التقييم</th>
                                    <th style={thStyle}>مجموع درجات التقييم</th>
                                    <th style={thStyle}>لها امتحان؟</th>
                                    <th style={thStyle}>درجة الامتحان</th>
                                    <th style={thStyle}>تقييم فقط</th>
                                    <th style={thStyle}>امتحان فقط</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map((s, i) => (
                                    <tr 
                                        key={i} 
                                        onClick={() => handleSelectSubject(i)}
                                        style={{ 
                                            background: selectedSubjectIndex === i ? '#eef2ff' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <td style={tdStyle}>
                                            <input type="checkbox" checked={s.IsSelected} onChange={(e) => handleSubjectChange(i, 'IsSelected', e.target.checked)} style={checkStyle} />
                                        </td>
                                        <td style={{...tdStyle, fontWeight: 'bold', textAlign: 'right'}}>{s.SabgekName}</td>
                                        <td style={tdStyle}>
                                            <input type="number" value={s.EvaluationCount} onChange={(e) => handleSubjectChange(i, 'EvaluationCount', Number(e.target.value))} style={{...inputStyle, width: '70px'}} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input type="number" value={s.EvaluationTotalMax} onChange={(e) => handleSubjectChange(i, 'EvaluationTotalMax', Number(e.target.value))} style={{...inputStyle, width: '90px'}} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input type="checkbox" checked={s.HasExam} onChange={(e) => handleSubjectChange(i, 'HasExam', e.target.checked)} style={checkStyle} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input type="number" value={s.ExamMax} onChange={(e) => handleSubjectChange(i, 'ExamMax', Number(e.target.value))} style={{...inputStyle, width: '90px'}} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input type="checkbox" checked={s.IsEvaluationOnly} onChange={(e) => handleSubjectChange(i, 'IsEvaluationOnly', e.target.checked)} style={checkStyle} />
                                        </td>
                                        <td style={tdStyle}>
                                            <input type="checkbox" checked={s.IsExamOnly} onChange={(e) => handleSubjectChange(i, 'IsExamOnly', e.target.checked)} style={checkStyle} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* جدول الأجزاء */}
            {selectedSubjectIndex !== null && (
                <div style={{...cardStyle, borderLeft: '5px solid #7c3aed'}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{margin:0, color:'#4f46e5'}}>أجزاء تقييم: {subjects[selectedSubjectIndex].SabgekName}</h3>
                        <button onClick={addPart} style={{...btnPrimary, background: '#10b981'}}>➕ إضافة جزء</button>
                    </div>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>رقم الجزء</th>
                                <th style={thStyle}>اسم الجزء</th>
                                <th style={thStyle}>الدرجة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parts.map((p, i) => (
                                <tr key={i}>
                                    <td style={tdStyle}>
                                        <input type="number" value={p.PartNumber} onChange={(e) => handlePartChange(i, 'PartNumber', Number(e.target.value))} style={{...inputStyle, width: '60px'}} />
                                    </td>
                                    <td style={tdStyle}>
                                        <input type="text" value={p.PartName} onChange={(e) => handlePartChange(i, 'PartName', e.target.value)} style={{...inputStyle, textAlign: 'right'}} />
                                    </td>
                                    <td style={tdStyle}>
                                        <input type="number" value={p.PartGrade} onChange={(e) => handlePartChange(i, 'PartGrade', Number(e.target.value))} style={{...inputStyle, width: '80px'}} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '20px', textAlign: 'left' }}>
                        <button onClick={handleSave} disabled={loading} style={{...btnPrimary, padding: '12px 40px'}}>
                            {loading ? 'جاري الحفظ...' : '💾 حفظ المادة والأجزاء'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}