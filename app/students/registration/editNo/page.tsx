'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

// تم إضافة الحقول الناقصة هنا
interface Student {
  StudentID: number;
  ArbStudName: string;
  StudentTyb?: string;    // النوع
  StudentDiana?: string;  // الديانة
  HaletKeaed?: string;    // حالة القيد
  selected?: boolean;
}

export default function StudentBulkEditPage() {
  const { user, work } = useAuthStore();
  
  // البيانات الأساسية
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearName = work?.yearName;

  // === State ===
  const [activeTab, setActiveTab] = useState(1); // 1: نوع, 2: حالة قيد, 3: ديانة
  const [gradesList, setGradesList] = useState<Grade[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // === 1. جلب الصفوف الدراسية ===
  useEffect(() => {
    const fetchGrades = async () => {
        if (!schoolName || !stageName) return;
        setLoadingGrades(true);
        try {
            const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
            const result = await res.json();
            if (result.success && result.data) {
                setGradesList(result.data);
            }
        } catch (err) { console.error('خطأ في جلب الصفوف:', err); }
        finally { setLoadingGrades(false); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  // === دالة تغيير الصف ===
  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedGradeId(id);
    const gradeObj = gradesList.find(g => g['الرقم'] === id);
    if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
    setStudentsList([]);
    setSelectedValue('');
  };

  // === 2. جلب الطلاب ===
  const handleShowStudents = async () => {
    if (!schoolName || !stageName || !yearName || !selectedGradeName) {
        alert('تأكد من اختيار الصف وتوفر البيانات');
        return;
    }
    
    setLoading(true);
    try {
        const res = await fetch(`${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&inpot=3`);
        const result = await res.json();
        
        if (result.success && result.data) {
            if (result.data.length > 0) {
                setStudentsList(result.data.map((s: any) => ({ 
                    StudentID: s['الرقم'], 
                    ArbStudName: s['الاسم بالعربى'], 
                    StudentTyb: s['النوع'], 
                    StudentDiana: s['الديانة'], 
                    HaletKeaed: s['حالة القيد'], 
                    selected: false 
                })));
            } else {
                alert('لا يوجد طلاب مسجلين في هذا الصف');
                setStudentsList([]);
            }
        }
    } catch (err) { 
        console.error(err); 
        alert('حدث خطأ في الاتصال');
    } 
    finally { setLoading(false); }
  };

  // === 3. دالة الحفظ ===
  const handleSaveChanges = async () => {
    const selected = studentsList.filter(s => s.selected);
    if (selected.length === 0) return alert('اختر طلاباً للتعديل');
    if (!selectedValue) return alert('اختر القيمة الجديدة');

    let operationCode = 0;
    if (activeTab === 1) operationCode = 8; 
    if (activeTab === 2) operationCode = 9; 
    if (activeTab === 3) operationCode = 7; 

    setLoading(true);
    let successCount = 0;

    try {
        for (const st of selected) {
            const payload = {
                id: st.StudentID,
                name: selectedValue,
                operation: operationCode
            };

            const res = await fetch(`${API_URL}/api/moderia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) successCount++;
        }

        alert(`✅ تم تعديل ${successCount} طالب بنجاح`);
        
        // تحديث القائمة المحلية بالقيمة الجديدة (لتحديث الـ UI فوراً)
        setStudentsList(prev => prev.map(s => {
            if(s.selected) {
                if(activeTab === 1) s.StudentTyb = selectedValue;
                if(activeTab === 2) s.HaletKeaed = selectedValue;
                if(activeTab === 3) s.StudentDiana = selectedValue;
            }
            return {...s, selected: false};
        }));
        setSelectedValue('');

    } catch (err) {
        alert('❌ حدث خطأ أثناء الحفظ');
    } finally {
        setLoading(false);
    }
  };

  const getOptions = () => {
    if (activeTab === 1) return ['ذكر', 'أنثى'];
    if (activeTab === 2) return ['مستجد', 'منقول', 'باقي', 'راسب', 'قيد', 'موقوف'];
    if (activeTab === 3) return ['مسلم', 'مسيحي'];
    return [];
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #e0e7ff', borderTop: '5px solid #6366f1' };
  
  const tabsContainerStyle: React.CSSProperties = { display: 'flex', gap: '10px', marginBottom: '20px' };
  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '15px', border: 'none', borderRadius: '10px', cursor: 'pointer',
    background: active ? '#6366f1' : '#e0e7ff', color: active ? 'white' : '#4338ca',
    fontWeight: 'bold', fontSize: '16px', transition: '0.3s'
  });

  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const buttonStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s', color: 'white' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>📝 تعديل بيانات الطلاب</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>تعديل النوع وحالة القيد والديانة لطلاب الصف الواحد</p>
        </div>
        <div style={{ fontSize: '50px' }}>✏️</div>
      </div>

      {/* School Info & Grade Filter */}
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>المدرسة</label>
                <input type="text" value={schoolName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>المرحلة</label>
                <input type="text" value={stageName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>العام الدراسي</label>
                <input type="text" value={yearName || ''} readOnly style={{...inputStyle, background: '#f1f5f9'}} />
            </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
                <label style={labelStyle}>اختر الصف الدراسي</label>
                <select 
                    value={selectedGradeId || ''} 
                    onChange={handleGradeChange}
                    style={inputStyle}
                    disabled={loadingGrades}
                >
                    <option value="">{loadingGrades ? 'جاري...' : '-- اختر الصف --'}</option>
                    {gradesList.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
            </div>
            <button onClick={handleShowStudents} disabled={!selectedGradeId || loading} style={{...buttonStyle, background: '#6366f1', height: '48px', opacity: (!selectedGradeId || loading) ? 0.5 : 1, padding: '0 30px'}}>
                عرض الطلاب
            </button>
        </div>
      </div>

      {/* Tabs & List */}
      {studentsList.length > 0 && (
        <div style={cardStyle}>
            {/* Tabs Navigation */}
            <div style={tabsContainerStyle}>
                <button onClick={() => { setActiveTab(1); setSelectedValue(''); }} style={tabButtonStyle(activeTab === 1)}>1️⃣ تعديل النوع</button>
                <button onClick={() => { setActiveTab(2); setSelectedValue(''); }} style={tabButtonStyle(activeTab === 2)}>2️⃣ حالة القيد</button>
                <button onClick={() => { setActiveTab(3); setSelectedValue(''); }} style={tabButtonStyle(activeTab === 3)}>3️⃣ الديانة</button>
            </div>

            {/* Selection & Save Area */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#374151' }}>تحديد الكل:</span>
                    <input 
                        type="checkbox" 
                        onChange={(e) => setStudentsList(studentsList.map(s => ({...s, selected: e.target.checked})))}
                        style={{ width: '18px', height: '18px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select value={selectedValue} onChange={(e) => setSelectedValue(e.target.value)} style={{...inputStyle, width: '150px'}}>
                        <option value="">اختر القيمة</option>
                        {getOptions().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <button onClick={handleSaveChanges} disabled={loading || !selectedValue} style={{...buttonStyle, background: '#10b981', opacity: (!selectedValue || loading) ? 0.5 : 1}}>
                        💾 حفظ التعديلات
                    </button>
                </div>
            </div>

            {/* Students Table - تم إضافة الأعمدة الناقصة هنا */}
            <div style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                        <tr>
                            <th style={thStyle}>اختر</th>
                            <th style={thStyle}>م</th>
                            <th style={thStyle}>اسم الطالب</th>
                            {/* أعمدة جديدة */}
                            <th style={thStyle}>النوع</th>
                            <th style={thStyle}>الديانة</th>
                            <th style={thStyle}>حالة القيد</th>
                        </tr>
                    </thead>
                    <tbody>
                        {studentsList.map((s, idx) => (
                            <tr key={s.StudentID} style={{ borderBottom: '1px solid #f3f4f6', background: s.selected ? '#eff6ff' : 'white' }}>
                                <td style={tdStyle}>
                                    <input 
                                        type="checkbox" 
                                        checked={s.selected || false} 
                                        onChange={() => setStudentsList(studentsList.map((st, i) => i === idx ? {...st, selected: !st.selected} : st))} 
                                    />
                                </td>
                                <td style={tdStyle}>{idx + 1}</td>
                                <td style={{...tdStyle, fontWeight: 'bold'}}>{s.ArbStudName}</td>
                                {/* عرض البيانات الجديدة */}
                                <td style={tdStyle}>{s.StudentTyb || '-'}</td>
                                <td style={tdStyle}>{s.StudentDiana || '-'}</td>
                                <td style={tdStyle}>{s.HaletKeaed || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', color: '#374151' };
const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '14px' };