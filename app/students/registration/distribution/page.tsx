'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface DivisionItem { 'الرقم': number; 'الشعبة': string; 'الصف'?: string; 'المرحلة'?: string; 'MrahelID'?: number; }
interface ClassItem { 'الرقم': number; 'الفصل': string; }
interface Student {
  StudentID: number;
  ArbStudName: string;
  CurrentClass?: string;
  selected?: boolean;
}
interface AutoDistItem {
  ArbStudName: string;
  ClasesName: string;
}

const getClassId = (c: any): string | undefined => {
  const num = Number(c['الرقم']) || Number(c['ClasesID']) || Number(Object.values(c)[0]);
  return num ? String(num) : undefined;
};

export default function StudentDistributionPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const yearId = work?.yearId;
  const stageId = work?.stageId;
  const stageName = work?.stageName;

  const [activeTab, setActiveTab] = useState(1);
  const [gradesList, setGradesList] = useState<Grade[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [divisionsList, setDivisionsList] = useState<DivisionItem[]>([]);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
  const [selectedDivisionName, setSelectedDivisionName] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [viewMode, setViewMode] = useState<'new' | 'edit' | null>(null);

  const [hasDivisions, setHasDivisions] = useState(false);
  const [studentsList, setStudentsList] = useState<Student[]>([]);

  const [studentCount, setStudentCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [studentsPerClass, setStudentsPerClass] = useState<number>(0);
  const [distributionMethod, setDistributionMethod] = useState<string>('أبجدي');
  const [autoDivId, setAutoDivId] = useState<number | null>(null);

  const [autoDistribution, setAutoDistribution] = useState<AutoDistItem[]>([]);
  const [autoDistributed, setAutoDistributed] = useState(false);

  // === 1. جلب الصفوف ===
  useEffect(() => {
    const fetchGrades = async () => {
      if (!schoolName || !stageName) return;
      setLoadingGrades(true);
      try {
        const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
        const result = await res.json();
        if (result.success && result.data) setGradesList(result.data);
      } catch (err) { console.error(err); }
      finally { setLoadingGrades(false); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  // === 2. جلب الشعب + الفصول (بالحماية من Race Condition) ===
  useEffect(() => {
    // ✅ أهم جزء: متغير منع الـ race condition
    let cancelled = false;

    // إعادة تعيين
    setStudentsList([]);
    setStudentCount(0);
    setClassCount(0);
    setSelectedClassId(null);
    setViewMode(null);
    setAutoDistribution([]);
    setAutoDistributed(false);

    if (!selectedGradeId || !schoolName || !stageName || !selectedGradeName) {
      setClassesList([]);
      setDivisionsList([]);
      setHasDivisions(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        // --- جلب الشعب ---
        const divRes = await fetch(`${API_URL}/api/getData1/32?id=${schoolId}`);
        const divResult = await divRes.json();
        const stageDivisions = divResult.data ? divResult.data.filter((d: any) => {
          return d['الصف'] === selectedGradeName &&
            (d['المرحلة'] === stageName || d['MrahelID'] === stageId);
        }) : [];

        // ✅ توقف لو الـ effect اتلغى
        if (cancelled) return;
        setDivisionsList(stageDivisions);
        const hasDiv = stageDivisions.length > 0;
        setHasDivisions(hasDiv);

        // --- جلب الفصول ---
        if (hasDiv && !selectedDivisionName) {
          // لسه ما اختارش شعبة → فاضية
          if (cancelled) return;
          setClassesList([]);
        } else {
          let classUrl: string;
          if (hasDiv && selectedDivisionName) {
            // ✅ scher4 INPOT=21 → فصول الشعبة بس
            classUrl = `${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&SCHER4=${selectedDivisionName}&inpot=21`;
          } else {
            // scher3 INPOT=3 → كل فصول الصف
            classUrl = `${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`;
          }
          const classRes = await fetch(classUrl);
          const classResult = await classRes.json();
          // ✅ توقف لو الـ effect اتلغى
          if (cancelled) return;
          setClassesList(classResult.success && classResult.data ? classResult.data : []);
        }
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    };

    fetchAll();

    // ✅ الـ cleanup اللي بيمنع الـ race condition
    return () => { cancelled = true; };
  }, [selectedGradeId, selectedGradeName, schoolName, stageName, schoolId, selectedDivisionName]);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedGradeId(id);
    setSelectedDivisionId(null);
    setSelectedDivisionName('');
    setAutoDivId(null);
    const gradeObj = gradesList.find(g => g['الرقم'] === id);
    if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
  };

  // === 3. جلب الطلاب (يدوي) ===
  const handleShowStudents = async (mode: 'new' | 'edit') => {
    if (!schoolName || !stageName || !work?.yearName || !selectedGradeName)
      return alert('تأكد من اختيار الصف');
    if (hasDivisions && !selectedDivisionName)
      return alert('تأكد من اختيار الشعبة');

    setLoading(true);
    setViewMode(mode);
    try {
      let url = '';
      let needClientFilter = false;

      if (hasDivisions) {
        const inpot = mode === 'new' ? 5 : 6;
        url = `${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${work.yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedDivisionName}&inpot=${inpot}`;
      } else {
        url = `${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${work.yearName}&SCHER4=${selectedGradeName}&inpot=3`;
        needClientFilter = true;
      }

      const res = await fetch(url);
      const result = await res.json();

      if (result.success && result.data && result.data.length > 0) {
        let students = [...result.data];

        if (needClientFilter) {
          students = students.filter((s: any) => {
            const hasClass = s['الفصل'] && s['الفصل'] !== '-' && s['الفصل'].trim() !== '';
            return mode === 'new' ? !hasClass : hasClass;
          });
        }

        if (students.length > 0) {
          setStudentsList(students.map((s: any) => ({
            StudentID: s['الرقم'],
            ArbStudName: s['الاسم بالعربى'],
            CurrentClass: s['الفصل الحالي'] || s['الفصل'] || '-',
            selected: false
          })));
        } else {
          alert(mode === 'new' ? 'لا يوجد طلاب متاحين للتوزيع' : 'لا يوجد طلاب موزعين للتعديل');
          setStudentsList([]);
        }
      } else {
        alert(mode === 'new' ? 'لا يوجد طلاب متاحين للتوزيع' : 'لا يوجد طلاب موزعين للتعديل');
        setStudentsList([]);
      }
    } catch (err) { alert('خطأ في الاتصال'); }
    finally { setLoading(false); }
  };

  // === 4. حفظ يدوي ===
  const handleSave = async () => {
    const selected = studentsList.filter(s => s.selected);
    if (selected.length === 0) return alert('اختر طلاب أولاً');
    if (!selectedClassId || !selectedGradeId) return alert('تأكد من اختيار الصف والفصل');

    setLoading(true);
    try {
      const promises = selected.map(st =>
        fetch(`${API_URL}/api/manage-three-int`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sch1: st.StudentID, sch2: selectedGradeId, sch3: selectedClassId, input: 1 })
        }).then(res => res.json())
      );
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      alert(`✅ تم توزيع ${successCount} طالب بنجاح`);
      if (viewMode) handleShowStudents(viewMode);
    } catch (err) { alert('❌ حدث خطأ'); }
    finally { setLoading(false); }
  };

  // === 5. عد الطلاب ===
  const handleCountStudents = async () => {
    if (!selectedGradeId) return alert('اختر الصف أولاً');
    if (hasDivisions && !selectedDivisionName) return alert('اختر الشعبة أولاً');
    setLoading(true);
    try {
      let url: string;
      if (hasDivisions) {
        url = `${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${work?.yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedDivisionName}&inpot=7`;
      } else {
        url = `${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${work?.yearName}&SCHER4=${selectedGradeName}&inpot=10`;
      }
      const res = await fetch(url);
      const result = await res.json();
      setStudentCount(result.data?.length > 0 ? Number(result.data[0]['NumberOfClasses'] || 0) : 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // === 6. عد الفصول ===
  const handleCountClasses = async () => {
    if (!selectedGradeId) return alert('اختر الصف أولاً');
    if (hasDivisions && !selectedDivisionName) return alert('اختر الشعبة أولاً');
    setLoading(true);
    try {
      let url: string;
      if (hasDivisions) {
        url = `${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&SCHER4=${selectedDivisionName}&inpot=20`;
      } else {
        url = `${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=9`;
      }
      const res = await fetch(url);
      const result = await res.json();
      setClassCount(result.data?.length > 0 ? Number(result.data[0]['NumberOfClasses'] || 0) : 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // === 7. تنفيذ التوزيع الآلي ===
  const handleAutoDistribute = async () => {
    if (!selectedGradeId || studentsPerClass === 0) return alert('تأكد من البيانات');
    if (hasDivisions && !autoDivId) return alert('اختر الشعبة أولاً');

    setLoading(true);
    try {
      const payload = {
        schoolId,
        mrahelId: stageId,
        gereadId: selectedGradeId,
        yearId,
        studentsPerClass,
        // ✅ بنبعت القيمة بالعربي زي ما الـ SP بيتوقع بالظبط
        distributionMethod,
        shoabaId: hasDivisions ? autoDivId : null
      };

      const res = await fetch(`${API_URL}/api/students/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        // ✅ الـ SP الآن بيرجع: StudentID, ArbStudName, ClasesID, "الفصل"
        const distData: AutoDistItem[] = (data.data || []).map((d: any) => ({
          ArbStudName: d.ArbStudName || '',
          // نحاول ناخد اسم الفصل من الـ SP مباشرة، والا نعمل map
          ClasesName: d['الفصل'] || `فصل (${d.ClasesID})`,
        }));

        setAutoDistribution(distData);
        setAutoDistributed(true);
      } else {
        alert(`❌ ${data.error || 'فشل التوزيع'}`);
      }
    } catch (err) {
      alert('خطأ في الاتصال بالسيرفر');
    }
    finally { setLoading(false); }
  };

  const handleAutoClose = () => {
    setAutoDistributed(false);
    setAutoDistribution([]);
  };

  const groupedDist = autoDistribution.reduce((acc, item) => {
    const key = item.ClasesName || 'غير محدد';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, AutoDistItem[]>);

  const isGradeReady = !!selectedGradeId;
  const isDivReady = hasDivisions ? !!selectedDivisionName : true;

  // --- Styles ---
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #e0e7ff', borderTop: '5px solid #2563eb' };
  const tabActiveStyle: React.CSSProperties = { background: '#2563eb', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
  const tabInactiveStyle: React.CSSProperties = { background: '#e0e7ff', color: '#1e40af' };
  const tabButtonStyle = (active: boolean): React.CSSProperties => ({ flex: 1, padding: '15px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.3s', ...(active ? tabActiveStyle : tabInactiveStyle) });
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const buttonStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s', color: 'white' };
  const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', color: '#374151' };
  const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '14px' };

  const classColors = [
    { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', badge: '#dbeafe' },
    { bg: '#f0fdf4', border: '#22c55e', text: '#166534', badge: '#dcfce7' },
    { bg: '#fefce8', border: '#eab308', text: '#854d0e', badge: '#fef9c3' },
    { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d', badge: '#fce7f3' },
    { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6', badge: '#ede9fe' },
    { bg: '#fff7ed', border: '#f97316', text: '#9a3412', badge: '#ffedd5' },
    { bg: '#f0f9ff', border: '#0ea5e9', text: '#075985', badge: '#e0f2fe' },
    { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', badge: '#fee2e2' },
  ];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>📚 توزيع الطلاب على الفصول</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>
            {hasDivisions ? '🔄 وضع المراحل ذات الشعب' : '⚡ وضع المراحل العادية'}
          </p>
        </div>
        <div style={{ fontSize: '50px' }}>🏫</div>
      </div>

      <div style={cardStyle}>
        {hasDivisions && (
          <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '12px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#9a3412', fontSize: '14px' }}>تم اكتشاف شعب في هذه المرحلة. اختر الشعبة أولاً لعرض فصولها.</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px', padding: '20px', background: '#f8fafc', borderRadius: '15px' }}>
          <div style={inputGroupStyle}><label style={labelStyle}>المدرسة</label><input type="text" value={schoolName || ''} readOnly style={{ ...inputStyle, background: '#f1f5f9' }} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>المرحلة</label><input type="text" value={stageName || ''} readOnly style={{ ...inputStyle, background: '#f1f5f9' }} /></div>
          <div style={inputGroupStyle}><label style={labelStyle}>العام الدراسي</label><input type="text" value={work?.yearName || ''} readOnly style={{ ...inputStyle, background: '#f1f5f9' }} /></div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setActiveTab(1)} style={tabButtonStyle(activeTab === 1)}>1️⃣ توزيع يدوي</button>
          <button onClick={() => setActiveTab(2)} style={tabButtonStyle(activeTab === 2)}>2️⃣ توزيع آلي</button>
        </div>

        {/* ==================== Tab 1: التوزيع اليدوي ==================== */}
        {activeTab === 1 && (
          <div style={{ border: '2px solid #e0e7ff', padding: '25px', borderRadius: '15px' }}>
            <h3 style={{ marginTop: 0, color: '#1e40af' }}>التوزيع اليدوي</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>١. اختر الصف</label>
                <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle} disabled={loadingGrades}>
                  <option value="">-- اختر --</option>
                  {gradesList.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
              </div>

              {hasDivisions && (
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>٢. اختر الشعبة</label>
                  <select
                    value={selectedDivisionId || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedDivisionId(id);
                      const divObj = divisionsList.find(d => d['الرقم'] === id);
                      setSelectedDivisionName(divObj ? divObj['الشعبة'] : '');
                    }}
                    style={inputStyle}
                    disabled={!selectedGradeId || loading}
                  >
                    <option value="">-- اختر الشعبة --</option>
                    {divisionsList.map(d => <option key={d['الرقم']} value={d['الرقم']}>{d['الشعبة']}</option>)}
                  </select>
                </div>
              )}

              <div style={inputGroupStyle}>
                <label style={labelStyle}>{hasDivisions ? '٣. اختر الفصل' : '٢. اختر الفصل'}</label>
                <select
                  value={selectedClassId || ''}
                  onChange={(e) => setSelectedClassId(Number(e.target.value))}
                  style={inputStyle}
                  disabled={!selectedGradeId || (hasDivisions && !selectedDivisionName) || loading}
                >
                  <option value="">
                    {hasDivisions && !selectedDivisionName ? '-- اختر الشعبة أولاً --' : '-- اختر --'}
                  </option>
                  {classesList.map((c, i) => (
                    <option key={`class-${i}-${getClassId(c)}`} value={getClassId(c)}>
                      {c['الفصل']}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleShowStudents('new')}
                  disabled={!isGradeReady || !isDivReady || loading}
                  style={{ ...buttonStyle, background: '#2563eb', width: '100%', opacity: (!isGradeReady || !isDivReady || loading) ? 0.5 : 1 }}
                >
                  {loading && viewMode === 'new' ? 'جاري...' : 'عرض غير الموزعين'}
                </button>
                <button
                  onClick={() => handleShowStudents('edit')}
                  disabled={!isGradeReady || !isDivReady || loading}
                  style={{ ...buttonStyle, background: '#d97706', width: '100%', opacity: (!isGradeReady || !isDivReady || loading) ? 0.5 : 1 }}
                >
                  {loading && viewMode === 'edit' ? 'جاري...' : 'تعديل توزيع سابق'}
                </button>
              </div>
            </div>

            {studentsList.length > 0 && (
              <div style={{ marginTop: '20px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{
                  background: viewMode === 'edit' ? '#fffbeb' : '#f8fafc',
                  padding: '10px', borderBottom: '1px solid #e5e7eb',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 'bold', color: viewMode === 'edit' ? '#d97706' : '#1e40af' }}>
                    {viewMode === 'edit'
                      ? (hasDivisions ? '🔄 اختر للنقل (داخل الشعبة)' : '🔄 اختر للنقل من فصل آخر')
                      : '➕ اختر للتوزيع'}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="checkbox" onChange={(e) => setStudentsList(studentsList.map(s => ({ ...s, selected: e.target.checked })))} />
                    تحديد الكل
                  </label>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: viewMode === 'edit' ? '#fef3c7' : '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={thStyle}>اختر</th>
                        <th style={{ ...thStyle, width: '50px' }}>م</th>
                        <th style={thStyle}>اسم الطالب</th>
                        {viewMode === 'edit' && <th style={thStyle}>الفصل الحالي</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {studentsList.map((s, idx) => (
                        <tr key={s.StudentID || idx}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: s.selected ? (viewMode === 'edit' ? '#fffbeb' : '#eff6ff') : 'white',
                            transition: 'background 0.15s'
                          }}>
                          <td style={tdStyle}>
                            <input type="checkbox" checked={s.selected || false}
                              onChange={() => setStudentsList(studentsList.map((st, i) => i === idx ? { ...st, selected: !st.selected } : st))} />
                          </td>
                          <td style={{ ...tdStyle, color: '#9ca3af', fontWeight: 'bold' }}>{idx + 1}</td>
                          <td style={tdStyle}>{s.ArbStudName}</td>
                          {viewMode === 'edit' && (
                            <td style={{ ...tdStyle, color: '#d97706', fontWeight: 'bold' }}>{s.CurrentClass}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{
                  padding: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px',
                  background: viewMode === 'edit' ? '#fffbeb' : '#f8fafc', alignItems: 'center'
                }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>
                    تم تحديد: <strong style={{ color: '#1e40af' }}>{studentsList.filter(s => s.selected).length}</strong> طالب
                  </span>
                  <button onClick={handleSave} disabled={!selectedClassId || loading}
                    style={{ ...buttonStyle, background: '#16a34a', opacity: !selectedClassId ? 0.5 : 1 }}>
                    💾 حفظ التوزيع
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== Tab 2: التوزيع الآلي ==================== */}
        {activeTab === 2 && (
          <div style={{ border: '2px solid #e0e7ff', padding: '25px', borderRadius: '15px' }}>
            <h3 style={{ marginTop: 0, color: '#1e40af' }}>التوزيع الآلي الذكي</h3>

            {hasDivisions && (
              <div style={{ marginBottom: '20px', padding: '15px', background: '#fff7ed', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                <label style={{ ...labelStyle, color: '#9a3412', marginBottom: '10px', display: 'block' }}>
                  ⚠️ اختر الشعبة المراد توزيع طلابها آلياً:
                </label>
                <select
                  value={autoDivId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setAutoDivId(id);
                    setSelectedDivisionId(id);
                    const divObj = divisionsList.find(d => d['الرقم'] === id);
                    setSelectedDivisionName(divObj ? divObj['الشعبة'] : '');
                  }}
                  style={{ ...inputStyle, width: '100%' }}
                  disabled={!selectedGradeId}
                >
                  <option value="">-- اختر الشعبة --</option>
                  {divisionsList.map(d => <option key={d['الرقم']} value={d['الرقم']}>{d['الشعبة']}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>{hasDivisions ? 'اختر الصف' : '١. اختر الصف'}</label>
                <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle}>
                  <option value="">-- اختر --</option>
                  {gradesList.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                <button onClick={handleCountStudents} disabled={!isGradeReady || !isDivReady || loading}
                  style={{ ...buttonStyle, background: '#0ea5e9', height: 'fit-content', padding: '12px', opacity: (!isGradeReady || !isDivReady || loading) ? 0.5 : 1 }}>
                  عدد الطلاب
                </button>
                <input type="number" value={studentCount} readOnly style={{ ...inputStyle, background: '#f1f5f9', textAlign: 'center', fontWeight: 'bold', flex: 1 }} />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>عدد الطلاب في الفصل</label>
                <input type="number" value={studentsPerClass || ''} onChange={(e) => setStudentsPerClass(Number(e.target.value))}
                  placeholder="مثال: 40" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                <button onClick={handleCountClasses} disabled={!isGradeReady || !isDivReady || loading}
                  style={{ ...buttonStyle, background: '#8b5cf6', height: 'fit-content', padding: '12px', opacity: (!isGradeReady || !isDivReady || loading) ? 0.5 : 1 }}>
                  عدد الفصول المتاحة
                </button>
                <input type="number" value={classCount} readOnly style={{ ...inputStyle, background: '#f1f5f9', textAlign: 'center', fontWeight: 'bold', flex: 1 }} />
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>طريقة التوزيع</label>
                {/* ✅ القيم بالعربي زي ما الـ SP بيتوقع */}
                <select value={distributionMethod} onChange={(e) => setDistributionMethod(e.target.value)} style={inputStyle}>
                  <option value="أبجدي">أبجدي</option>
                  <option value="حسب الجنس">حسب الجنس</option>
                  <option value="حسب الدين">حسب الدين</option>
                  <option value="عشوائي">عشوائي</option>
                </select>
              </div>
            </div>

            {studentCount > 0 && studentsPerClass > 0 && (
              <div style={{
                marginTop: '20px', padding: '15px', background: '#f0fdf4',
                border: '1px solid #bbf7d0', borderRadius: '10px',
                display: 'flex', justifyContent: 'center', gap: '40px', fontSize: '15px', flexWrap: 'wrap'
              }}>
                <span>📋 إجمالي: <strong style={{ color: '#16a34a' }}>{studentCount}</strong></span>
                <span>👤 لكل فصل: <strong style={{ color: '#16a34a' }}>{studentsPerClass}</strong></span>
                <span>🏫 مطلوبة: <strong style={{ color: '#16a34a' }}>{Math.ceil(studentCount / studentsPerClass)}</strong></span>
                {classCount > 0 && (
                  <span style={{ color: classCount < Math.ceil(studentCount / studentsPerClass) ? '#dc2626' : '#16a34a' }}>
                    {classCount < Math.ceil(studentCount / studentsPerClass)
                      ? `⚠️ المتاحة (${classCount}) غير كافية`
                      : `✅ المتاحة (${classCount}) كافية`}
                  </span>
                )}
              </div>
            )}

            {isGradeReady && isDivReady && studentsPerClass > 0 && !autoDistributed && (
              <div style={{
                marginTop: '20px', padding: '12px 18px', background: '#fef2f2',
                border: '1px solid #fecaca', borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#991b1b'
              }}>
                <span style={{ fontSize: '18px' }}>🚨</span>
                <span><strong>تنبيه:</strong> التنفيذ سيقوم بمسح أي توزيع سابق وحفظ التوزيع الجديد مباشرة في قاعدة البيانات.</span>
              </div>
            )}

            <div style={{ marginTop: '25px', textAlign: 'center' }}>
              <button
                onClick={handleAutoDistribute}
                disabled={!isGradeReady || studentsPerClass === 0 || (hasDivisions && !autoDivId) || loading || autoDistributed}
                style={{
                  ...buttonStyle, background: autoDistributed ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #22c55e)',
                  padding: '15px 60px', fontSize: '18px',
                  opacity: (!isGradeReady || studentsPerClass === 0 || (hasDivisions && !autoDivId) || loading) ? 0.5 : 1
                }}
              >
                {loading ? '⏳ جاري التوزيع والحفظ...' : autoDistributed ? '✅ تم التوزيع بالفعل' : '⚙️ تنفيذ التوزيع الآلي'}
              </button>
            </div>

            {autoDistributed && autoDistribution.length > 0 && (
              <div style={{ marginTop: '25px', border: '3px solid #22c55e', borderRadius: '15px', overflow: 'hidden' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #16a34a, #22c55e)', padding: '18px 25px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '30px' }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '17px' }}>تم التوزيع والحفظ بنجاح</div>
                      <div style={{ opacity: 0.9, fontSize: '13px', marginTop: '2px' }}>
                        {autoDistribution.length} طالب في {Object.keys(groupedDist).length} فصل
                        {hasDivisions && selectedDivisionName ? ` — شعبة: ${selectedDivisionName}` : ''}
                      </div>
                    </div>
                  </div>
                  <button onClick={handleAutoClose}
                    style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    إغلاق المعاينة ✖
                  </button>
                </div>

                <div style={{ maxHeight: '550px', overflowY: 'auto', padding: '15px', background: '#fafafa' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                    {Object.entries(groupedDist).map(([className, students], classIdx) => {
                      const colors = classColors[classIdx % classColors.length];
                      return (
                        <div key={className} style={{
                          border: `2px solid ${colors.border}`, borderRadius: '12px',
                          overflow: 'hidden', boxShadow: `0 2px 8px ${colors.border}22`
                        }}>
                          <div style={{
                            background: colors.bg, padding: '10px 15px',
                            borderBottom: `2px solid ${colors.border}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <span style={{ fontWeight: 'bold', color: colors.text, fontSize: '15px' }}>
                              🏫 {className}
                            </span>
                            <span style={{
                              background: colors.badge, color: colors.text,
                              padding: '2px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold'
                            }}>
                              {students.length} طالب
                            </span>
                          </div>
                          <div style={{ background: 'white', maxHeight: '200px', overflowY: 'auto' }}>
                            {students.map((s, idx) => (
                              <div key={idx} style={{
                                padding: '7px 15px', borderBottom: idx < students.length - 1 ? '1px solid #f3f4f6' : 'none',
                                display: 'flex', gap: '10px', alignItems: 'center'
                              }}>
                                <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', minWidth: '22px', textAlign: 'center' }}>{idx + 1}</span>
                                <span style={{ fontSize: '13px', color: '#1f2937' }}>{s.ArbStudName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {autoDistributed && autoDistribution.length === 0 && (
              <div style={{
                marginTop: '20px', padding: '20px', background: '#fffbeb',
                border: '2px solid #fbbf24', borderRadius: '12px', textAlign: 'center'
              }}>
                <p style={{ color: '#92400e', margin: '0 0 15px' }}>⚠️ تم التنفيذ لكن لم يتم العثور على نتائج لعرضها</p>
                <button onClick={handleAutoClose} style={{ ...buttonStyle, background: '#6b7280' }}>إغلاق</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}