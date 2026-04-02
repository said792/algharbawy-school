'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

interface Student {
  StudentID: number;
  ArbStudName: string;
  StudSex?: string; 
  SetingNum?: number;
  SecretNum?: number;
}

export default function ExamSeatingPage() {
  const { user, work } = useAuthStore();
  
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearName = work?.yearName;

  // === State ===
  const [activeTab, setActiveTab] = useState<'seating' | 'secret'>('seating');
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');

  // إدخالات التحكم
  const [sortType, setSortType] = useState<string>('alpha');
  const [startNumber, setStartNumber] = useState<number>(1);
  
  // خيارات الأرقام السرية
  const [secretType, setSecretType] = useState<'seq' | 'random' | 'stepped'>('seq');
  const [stepCount, setStepCount] = useState<number>(10);
  
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // === دالة الترتيب (Helper Function) ===
  const sortStudentList = (list: Student[], type: string) => {
    const sorted = [...list];
    if (type === 'alpha') {
        sorted.sort((a, b) => a.ArbStudName.localeCompare(b.ArbStudName));
    } else if (type === 'female_first') {
        sorted.sort((a, b) => (a.StudSex === 'أنثى' ? -1 : 1));
    } else if (type === 'male_first') {
        sorted.sort((a, b) => (a.StudSex === 'ذكر' ? -1 : 1));
    }
    return sorted;
  };

  // === 1. جلب الصفوف ===
  useEffect(() => {
    const fetchGrades = async () => {
        if (!schoolName || !stageName) return;
        setLoadingGrades(true);
        try {
            const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
            const json = await res.json();
            if (json.success) setGrades(json.data);
        } catch (err) { console.error(err); } 
        finally { setLoadingGrades(false); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  // === 2. جلب الطلاب وتطبيق الترتيب الأولي ===
  useEffect(() => {
    const fetchStudents = async () => {
        if (!selectedGradeName || !schoolName || !stageName || !yearName) {
            setStudents([]);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&inpot=8`);
            const json = await res.json();
            
            if (json.success && json.data) {
                const rawStudents = json.data.map((s: any) => ({
                    StudentID: s['الرقم'] || s.StudentID,
                    ArbStudName: s['الاسم بالعربى'] || s.ArbStudName,
                    StudSex: s['النوع'] || s.StudSex || 'ذكر',
                    SetingNum: s['رقم الجلوس'] || 0,
                    SecretNum: s['الرقم السرى'] || 0
                }));
                
                // ✅ تطبيق الترتيب فوراً بعد الجلب
                setStudents(sortStudentList(rawStudents, sortType));
            } else {
                setStudents([]);
            }
        } catch (err) { console.error(err); setStudents([]); } 
        finally { setLoading(false); }
    };

    if(selectedGradeName) fetchStudents();
    
  }, [selectedGradeName, schoolName, stageName, yearName]); // تم إزالة sortType من هنا لتفادي مشاكل الاعتمادية

  // === 3. تحديث الترتيب عند تغيير الاختيار من القائمة (التعديل المطلوب) ===
  useEffect(() => {
      if (students.length > 0) {
          // نرتب القائمة الحالية بناءً على الاختيار الجديد
          setStudents(prev => sortStudentList(prev, sortType));
      }
  }, [sortType]); // ده هيشتغل لما تغير نوع الترتيب فقط

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedGradeId(id);
    const gradeObj = grades.find(g => g['الرقم'] === id);
    if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
    setStudents([]);
  };

  // === 4. دالة التوليد (تم تبسيطها) ===
  const handleGenerateNumbers = () => {
    if (students.length === 0) return alert('لا يوجد طلاب للترقيم');
    
    // الطلاب مفروض مرتبين بالفعل بفضل الـ useEffect اللي فوق
    let currentNum = Number(startNumber);
    let groupCounter = 0;

    const updatedStudents = students.map(s => {
        const newStudent = { ...s };
        
        if (activeTab === 'seating') {
            newStudent.SetingNum = currentNum;
            currentNum++;
        } else {
            if (secretType === 'seq') {
                newStudent.SecretNum = currentNum;
                currentNum++;
            } else if (secretType === 'random') {
                newStudent.SecretNum = Math.floor(1000 + Math.random() * 9000);
            } else if (secretType === 'stepped') {
                newStudent.SecretNum = currentNum;
                currentNum++; 
                groupCounter++;

                if (groupCounter >= stepCount) {
                    const jump = Math.floor(Math.random() * 100) + 50;
                    currentNum += jump;
                    groupCounter = 0;
                }
            }
        }
        return newStudent;
    });

    setStudents(updatedStudents);
    alert('✅ تم توليد الأرقام بنجاح');
  };

  // === 5. الحفظ النهائي ===
  const handleSave = async () => {
    if (!schoolId) return alert('لا يوجد معرف للمدرسة');
    setLoading(true);
    
    try {
        let successCount = 0;
        
        for (const st of students) {
            const payload = {
                StudentID: st.StudentID,
                seat_number: st.SetingNum || 0,
                secret_number: st.SecretNum || 0,
                SchoolID: schoolId
            };

            const res = await fetch(`${API_URL}/api/exam/seats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) successCount++;
        }

        alert(`✅ تم حفظ بيانات ${successCount} طالب بنجاح`);
    } catch (err) {
        console.error(err);
        alert('❌ حدث خطأ أثناء الحفظ');
    } finally {
        setLoading(false);
    }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0f766e, #14b8a6)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(15, 118, 110, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '20px', border: '1px solid #ccfbf1' };
  const tabsContainer: React.CSSProperties = { display: 'flex', gap: '10px', marginBottom: '20px' };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '15px', textAlign: 'center', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold',
    background: active ? 'linear-gradient(135deg, #0f766e, #14b8a6)' : '#f1f5f9',
    color: active ? 'white' : '#475569', border: active ? 'none' : '1px solid #e2e8f0',
    transition: '0.3s'
  });
  const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', width: '100%' };
  const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>🔢 أرقام الجلوس والسرية</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>تنظيم وتوليد الأرقام لطلاب الصف الواحد</p>
        </div>
        <div style={{ fontSize: '50px' }}>🪑</div>
      </div>

      <div style={tabsContainer}>
        <div onClick={() => setActiveTab('seating')} style={tabStyle(activeTab === 'seating')}>
            🪑 أرقام الجلوس
        </div>
        <div onClick={() => setActiveTab('secret')} style={tabStyle(activeTab === 'secret')}>
            🔐 الأرقام السرية
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>المدرسة</label>
                <input type="text" value={schoolName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>المرحلة</label>
                <input type="text" value={stageName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>الصف الدراسي</label>
                <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle} disabled={loadingGrades}>
                    <option value="">{loadingGrades ? 'جاري التحميل...' : '-- اختر الصف --'}</option>
                    {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
            </div>
        </div>
      </div>

      {students.length > 0 && (
        <>
            <div style={{...cardStyle, borderLeft: '5px solid #14b8a6'}}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
                    
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>طريقة الترتيب</label>
                        <select value={sortType} onChange={(e) => setSortType(e.target.value)} style={inputStyle}>
                            <option value="alpha">ترتيب أبجدي (أ-ي)</option>
                            <option value="female_first">البنات أولاً</option>
                            <option value="male_first">الذكور أولاً</option>
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>رقم البداية</label>
                        <input type="number" value={startNumber} onChange={(e) => setStartNumber(Number(e.target.value))} style={inputStyle} />
                    </div>

                    {activeTab === 'secret' && (
                        <>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>نوع الرقم السري</label>
                                <select value={secretType} onChange={(e) => setSecretType(e.target.value as any)} style={inputStyle}>
                                    <option value="seq">مسلسل بسيط</option>
                                    <option value="stepped">مسلسل متقطع (صعب التنبؤ)</option>
                                    <option value="random">عشوائي</option>
                                </select>
                            </div>
                            
                            {secretType === 'stepped' && (
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>عدد الأرقام في المجموعة</label>
                                    <input type="number" value={stepCount} onChange={(e) => setStepCount(Number(e.target.value))} style={inputStyle} placeholder="مثلاً كل 10 طلاب يقفز" />
                                </div>
                            )}
                        </>
                    )}

                    <button onClick={handleGenerateNumbers} style={{...btnPrimary, background: '#f59e0b', height: 'fit-content', padding: '10px 30px' }}>
                        ⚡ توليد وترتيب
                    </button>
                </div>
            </div>

            <div style={cardStyle}>
                <h3 style={{margin:'0 0 15px', color:'#0f766e'}}>قائمة الطلاب ({students.length})</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                        <thead style={{ background: '#f1f5f9' }}>
                            <tr>
                                <th style={thStyle}>م</th>
                                <th style={thStyle}>اسم الطالب</th>
                                <th style={thStyle}>النوع</th>
                                <th style={thStyle}>
                                    {activeTab === 'seating' ? 'رقم الجلوس' : 'الرقم السري'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s, idx) => (
                                <tr key={s.StudentID} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={tdStyle}>{idx + 1}</td>
                                    <td style={{...tdStyle, fontWeight: 'bold', textAlign: 'right'}}>{s.ArbStudName}</td>
                                    <td style={tdStyle}>{s.StudSex}</td>
                                    <td style={{...tdStyle, color: '#0f766e', fontWeight: 'bold', fontSize: '16px' }}>
                                        {activeTab === 'seating' ? s.SetingNum : s.SecretNum}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSave} disabled={loading} style={{...btnPrimary, padding: '12px 40px', fontSize: '16px'}}>
                        {loading ? 'جاري الحفظ...' : '💾 حفظ النهائي'}
                    </button>
                </div>
            </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#374151' };
const tdStyle: React.CSSProperties = { padding: '10px', fontSize: '14px' };