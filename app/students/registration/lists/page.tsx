'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface DivisionItem { 'الرقم': number; 'الشعبة': string; 'الصف'?: string; 'المرحلة'?: string; 'MrahelID'?: number; }
interface ClassItem { 'الرقم': number; 'الفصل': string; }
interface Student {
  'الاسم بالعربى': string;
  'النوع': string;
  'الديانة': string;
  'حالة القيد': string;
  'الفصل': string;
}
interface Stats {
  males: number;
  females: number;
  muslims: number;
  christians: number;
  newStudents: number;
  transferred: number;
  others: number;
}
interface SchoolInfo {
  SchoolNam: string;
  ModriaNam: string;
  EdaraNam: string;
  Logo: string;
}

export default function ClassListsPage() {
  const { user, work } = useAuthStore();

  const schoolId = user?.schoolId || 0;
  const schoolName = user?.schoolName || '';
  const stageName = work?.stageName || '';
  const stageId = work?.stageId;
  const yearName = work?.yearName || '';

  const [grades, setGrades] = useState<Grade[]>([]);
  const [divisionsList, setDivisionsList] = useState<DivisionItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
  const [selectedDivisionName, setSelectedDivisionName] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [hasDivisions, setHasDivisions] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const parseImage = (rawData: any): string => {
    if (!rawData) return '';
    if (typeof rawData === 'object' && rawData.type === 'Buffer' && Array.isArray(rawData.data)) {
      const bytes = new Uint8Array(rawData.data);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return `data:image/png;base64,${window.btoa(binary)}`;
    }
    if (typeof rawData === 'string' && rawData.startsWith('0x')) {
      const hex = rawData.slice(2);
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return `data:image/png;base64,${window.btoa(binary)}`;
    }
    if (typeof rawData === 'string' && rawData.startsWith('data:image')) return rawData;
    return '';
  };

  // === 0. جلب بيانات المدرسة ===
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!schoolId) return;
      try {
        const res = await fetch(`${API_URL}/api/getData1/33?id=${schoolId}`);
        const json = await res.json();
        if (json.success && json.data?.[0]) {
          const row = json.data[0];
          setSchoolInfo({
            SchoolNam: row['SchoolNam'] || schoolName,
            ModriaNam: row['ModriaNam'] || '',
            EdaraNam: row['EdaraNam'] || '',
            Logo: parseImage(row['Image'] || row['Logo'] || row['SchoolImeg'])
          });
        }
      } catch (err) { console.error(err); }
    };
    fetchSchoolInfo();
  }, [schoolId, schoolName]);

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

  // ✅ Effect A: جلب الشعب
  useEffect(() => {
    setSelectedDivisionId(null);
    setSelectedDivisionName('');
    setSelectedClassName('');
    setStudents([]);
    setStats(null);
    setClasses([]);
    setHasDivisions(false);

    if (!selectedGradeId || !schoolName || !stageName || !selectedGradeName) return;

    let cancelled = false;

    const fetchDivisions = async () => {
      try {
        const divRes = await fetch(`${API_URL}/api/getData1/32?id=${schoolId}`);
        const divResult = await divRes.json();
        if (cancelled) return;
        const stageDivisions = divResult.data ? divResult.data.filter((d: any) => {
          return d['الصف'] === selectedGradeName &&
            (d['المرحلة'] === stageName || d['MrahelID'] === stageId);
        }) : [];

        setDivisionsList(stageDivisions);
        setHasDivisions(stageDivisions.length > 0);
      } catch (err) { console.error(err); }
    };

    fetchDivisions();
    return () => { cancelled = true; };
  }, [selectedGradeId, selectedGradeName, schoolName, stageName, schoolId, stageId]);

  // ✅ Effect B: جلب الفصول
  useEffect(() => {
    setSelectedClassName('');
    setStudents([]);
    setStats(null);

    if (!selectedGradeId || !schoolName || !stageName || !selectedGradeName) {
      setClasses([]);
      return;
    }

    if (hasDivisions && !selectedDivisionName) {
      setClasses([]);
      return;
    }

    let cancelled = false;

    const fetchClasses = async () => {
      try {
        let classUrl: string;
        if (hasDivisions && selectedDivisionName) {
          classUrl = `${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&SCHER4=${selectedDivisionName}&inpot=21`;
        } else {
          classUrl = `${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`;
        }
        const classRes = await fetch(classUrl);
        const classResult = await classRes.json();
        if (cancelled) return;
        setClasses(classResult.success && classResult.data ? classResult.data : []);
      } catch (err) { console.error(err); }
    };

    fetchClasses();
    return () => { cancelled = true; };
  }, [selectedGradeId, selectedGradeName, schoolName, stageName, selectedDivisionName, hasDivisions]);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedGradeId(id);
    const gradeObj = grades.find(g => g['الرقم'] === id);
    if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedDivisionId(id);
    const divObj = divisionsList.find(d => d['الرقم'] === id);
    setSelectedDivisionName(divObj ? divObj['الشعبة'] : '');
  };

  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const className = e.target.value;
    setSelectedClassName(className);

    if (!className || !schoolName || !stageName || !yearName || !selectedGradeName) {
      setStudents([]);
      setStats(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${className}&inpot=3`);
      const json = await res.json();

      if (json.success && json.data) {
        setStudents(json.data);
        calculateStats(json.data);
      } else {
        setStudents([]);
        setStats(null);
      }
    } catch (err) {
      console.error(err);
      setStudents([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Student[]) => {
    const newStats: Stats = {
      males: 0, females: 0, muslims: 0, christians: 0,
      newStudents: 0, transferred: 0, others: 0
    };
    data.forEach(s => {
      if (s['النوع'] === 'ذكر') newStats.males++;
      else if (s['النوع'] === 'أنثى') newStats.females++;
      if (s['الديانة'] === 'مسلم') newStats.muslims++;
      else if (s['الديانة'] === 'مسيحي') newStats.christians++;
      if (s['حالة القيد'] === 'مستجد') newStats.newStudents++;
      else if (s['حالة القيد'] === 'منقول') newStats.transferred++;
      else newStats.others++;
    });
    setStats(newStats);
  };

  const handlePrint = () => window.print();

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '30px', border: '1px solid #d1fae5', borderTop: '5px solid #059669' };
  const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontWeight: 'bold', color: '#4b5563', fontSize: '14px' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '14px' };
  const thStyle: React.CSSProperties = { padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #059669', color: '#374151', fontSize: '12px', fontWeight: 'bold' };
  const tdStyle: React.CSSProperties = { padding: '7px 10px', fontSize: '12px' };

  return (
    <div style={containerStyle}>

      {/* ========== Header ========== */}
      <div className="no-print" style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>📋 قوائم الفصول الدراسية</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>
            {hasDivisions ? '🔄 يدعم الشعب' : '⚡ عرض تفصيلي لطلاب الفصل مع الإحصائيات'}
          </p>
        </div>
        <div style={{ fontSize: '50px' }}>🏫</div>
      </div>

      {/* ========== Filters ========== */}
      <div className="no-print" style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#059669', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>🔎 اختيار الفصل</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px', padding: '20px', background: '#f0fdf4', borderRadius: '15px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>المدرسة</label>
            <input type="text" value={schoolName} readOnly style={{ ...inputStyle, background: '#ecfdf5', fontWeight: 'bold' }} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>المرحلة</label>
            <input type="text" value={stageName} readOnly style={{ ...inputStyle, background: '#ecfdf5', fontWeight: 'bold' }} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>العام الدراسي</label>
            <input type="text" value={yearName} readOnly style={{ ...inputStyle, background: '#ecfdf5', fontWeight: 'bold' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>١. اختر الصف الدراسي</label>
            <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle} disabled={loadingGrades}>
              <option value="">{loadingGrades ? 'جاري التحميل...' : '-- اختر الصف --'}</option>
              {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
            </select>
          </div>

          {hasDivisions && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>٢. اختر الشعبة</label>
              <select value={selectedDivisionId || ''} onChange={handleDivisionChange} style={inputStyle} disabled={!selectedGradeId}>
                <option value="">-- اختر الشعبة --</option>
                {divisionsList.map(d => <option key={d['الرقم']} value={d['الرقم']}>{d['الشعبة']}</option>)}
              </select>
            </div>
          )}

          <div style={inputGroupStyle}>
            <label style={labelStyle}>{hasDivisions ? '٣. اختر الفصل' : '٢. اختر الفصل'}</label>
            <select
              value={selectedClassName}
              onChange={handleClassChange}
              style={inputStyle}
              disabled={!selectedGradeId || (hasDivisions && !selectedDivisionName)}
            >
              <option value="">
                {hasDivisions && !selectedDivisionName ? '-- اختر الشعبة أولاً --' : '-- اختر الفصل --'}
              </option>
              {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
            </select>
          </div>
        </div>

        {hasDivisions && (
          <div style={{ marginTop: '15px', background: '#fff7ed', border: '1px solid #ffedd5', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span style={{ color: '#9a3412', fontSize: '13px' }}>هذه المرحلة تحتوي على شعب. اختر الشعبة لعرض فصولها فقط.</span>
          </div>
        )}
      </div>

      {/* ========== المحتوى القابل للطباعة ========== */}
      {selectedClassName && (
        <div ref={printRef} className="printable-area">

          {/* ✅ هيدر الطباعة - الشعار يسار والبيانات يمين */}
          <div className="print-header" style={{
            marginBottom: '12px', paddingBottom: '8px',
            borderBottom: '2px solid #333'
          }}>
            {/* صف الهيدر: شعار يسار + عنوان وسط + بيانات يمين */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              marginBottom: '6px'
            }}>
              {/* ✅ الشعار أقصى اليسار */}
              <div style={{
                width: '55px', height: '55px',
                border: '1px solid #ccc', borderRadius: '6px',
                overflow: 'hidden', background: '#f9fafb', flexShrink: 0
              }}>
                {schoolInfo?.Logo ? (
                  <img src={schoolInfo.Logo} alt="شعار" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '9px', color: '#999' }}>شعار</div>
                )}
              </div>

              {/* ✅ عنوان القائمة في المنتصف */}
              <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#059669', lineHeight: '1.2' }}>
                  قائمة فصل: {selectedClassName}
                </div>
                <div style={{ fontSize: '11px', color: '#374151', marginTop: '2px' }}>
                  الصف: {selectedGradeName}
                  {hasDivisions && selectedDivisionName && (
                    <span style={{ color: '#9a3412', fontWeight: 'bold' }}> — شعبة: {selectedDivisionName}</span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px' }}>
                  العام الدراسي: {yearName} | عدد الطلاب: {students.length}
                </div>
              </div>

              {/* ✅ بيانات المدرسة أقصى اليمين (مديرية → إدارة → مدرسة) */}
              <div style={{
                textAlign: 'left', flexShrink: 0,
                fontSize: '9px', lineHeight: '1.4', color: '#374151'
              }}>
                {schoolInfo?.ModriaNam && <div>{schoolInfo.ModriaNam}</div>}
                {schoolInfo?.EdaraNam && <div>{schoolInfo.EdaraNam}</div>}
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{schoolInfo?.SchoolNam || schoolName}</div>
              </div>
            </div>
          </div>

          {/* ========== جدول الطلاب ========== */}
          <div style={{ ...cardStyle, padding: '20px', marginBottom: '20px' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1e40af' }}>👥 قائمة طلاب: {selectedClassName}</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ background: '#eff6ff', padding: '5px 15px', borderRadius: '20px', color: '#1d4ed8', fontWeight: 'bold' }}>العدد: {students.length}</span>
                <button onClick={handlePrint} disabled={students.length === 0} style={{
                  padding: '8px 22px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
                  opacity: students.length === 0 ? 0.5 : 1, boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                }}>
                  🖨️ طباعة القائمة
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>⏳ جاري تحميل البيانات...</div>
            ) : students.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f0fdf4' }}>
                      <th style={{ ...thStyle, width: '35px', textAlign: 'center' }}>م</th>
                      <th style={thStyle}>اسم الطالب</th>
                      <th style={{ ...thStyle, width: '55px', textAlign: 'center' }}>النوع</th>
                      <th style={{ ...thStyle, width: '55px', textAlign: 'center' }}>الديانة</th>
                      <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>القيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: '#9ca3af' }}>{idx + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: '#1e293b' }}>{s['الاسم بالعربى']}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                            background: s['النوع'] === 'ذكر' ? '#dbeafe' : '#fce7f3',
                            color: s['النوع'] === 'ذكر' ? '#1e40af' : '#9d174d'
                          }}>{s['النوع']}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                            background: s['الديانة'] === 'مسلم' ? '#dcfce7' : '#e0f2fe',
                            color: s['الديانة'] === 'مسلم' ? '#166534' : '#075985'
                          }}>{s['الديانة']}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                            background: s['حالة القيد'] === 'مستجد' ? '#dcfce7' : s['حالة القيد'] === 'منقول' ? '#fef3c7' : '#f3f4f6',
                            color: s['حالة القيد'] === 'مستجد' ? '#166534' : s['حالة القيد'] === 'منقول' ? '#92400e' : '#4b5563'
                          }}>{s['حالة القيد']}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>لا يوجد طلاب في هذا الفصل</div>
            )}
          </div>

          {/* ========== الإحصائيات ========== */}
          {stats && (
            <div style={{ ...cardStyle, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', marginBottom: '20px' }}>
              <h3 className="no-print" style={{ marginTop: 0, color: '#166534', marginBottom: '15px', textAlign: 'center', borderBottom: '2px solid #bbf7d0', paddingBottom: '8px', fontSize: '15px' }}>📊 ملخص الفصل</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                <div style={{ background: 'white', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', fontSize: '11px' }}>النوع</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2563eb' }}>{stats.males}</div><div style={{ fontSize: '11px', color: '#6b7280' }}>بنين</div></div>
                    <div style={{ width: '1px', background: '#e5e7eb' }}></div>
                    <div><div style={{ fontSize: '22px', fontWeight: 'bold', color: '#db2777' }}>{stats.females}</div><div style={{ fontSize: '11px', color: '#6b7280' }}>بنات</div></div>
                  </div>
                </div>
                <div style={{ background: 'white', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', fontSize: '11px' }}>الديانة</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '22px', fontWeight: 'bold', color: '#059669' }}>{stats.muslims}</div><div style={{ fontSize: '11px', color: '#6b7280' }}>مسلم</div></div>
                    <div style={{ width: '1px', background: '#e5e7eb' }}></div>
                    <div><div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0891b2' }}>{stats.christians}</div><div style={{ fontSize: '11px', color: '#6b7280' }}>مسيحي</div></div>
                  </div>
                </div>
                <div style={{ background: 'white', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', fontSize: '11px' }}>حالة القيد</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{stats.newStudents}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>مستجد</div></div>
                    <div style={{ width: '1px', background: '#e5e7eb' }}></div>
                    <div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d97706' }}>{stats.transferred}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>منقول</div></div>
                    <div style={{ width: '1px', background: '#e5e7eb' }}></div>
                    <div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6b7280' }}>{stats.others}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>باقي</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ توقيع الطباعة */}
          <div className="print-signature" style={{
            marginTop: '30px', display: 'none',
            justifyContent: 'space-between', padding: '0 20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '50px', color: '#333' }}>م. شئون طلاب</div>
              <div style={{ borderTop: '1px solid #333', width: '130px' }}></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '50px', color: '#333' }}>مدير المدرسة</div>
              <div style={{ borderTop: '1px solid #333', width: '130px' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* ========== Print Styles ========== */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 0;
            background: white !important;
            font-size: 11px;
          }

          .no-print {
            display: none !important;
          }

          .printable-area {
            padding: 0 !important;
            max-width: 100% !important;
          }

          .print-signature {
            display: flex !important;
          }

          .print-header {
            page-break-after: avoid;
          }

          /* تقليل padding الكروت في الطباعة */
          div[style*="padding: 20px"] {
            padding: 10px !important;
            box-shadow: none !important;
            border-width: 1px !important;
          }

          table tr:nth-child(even) {
            background-color: #fafafa !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm 8mm;
          }
        }
      `}</style>
    </div>
  );
}