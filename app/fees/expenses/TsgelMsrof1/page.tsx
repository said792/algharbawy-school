'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface DivisionItem {
  'الرقم': number;
  'الشعبة': string;
  'الصف'?: string;
  'المرحلة'?: string;
  'MrahelID'?: number;
}
interface ClassItem { 'الرقم': number; 'الفصل': string; }
interface Student { StudentID: number; ArbStudName: string; }

// الأسماء متطابقة مع الـ SQL Aliases
interface GovPaymentRecord {
    "الرقم": number;
    "تاريخ السداد": string;
    "نوع السداد": string;
    "المبلغ": string;
    "رقم القسيمة": number;
}

export default function GovFeesPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const stageId = work?.stageId;
  const yearName = work?.yearName;
  const yearId = work?.yearId || 0;

  // --- Filters ---
  const [grades, setGrades] = useState<Grade[]>([]);
  const [divisionsList, setDivisionsList] = useState<DivisionItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
  const [selectedDivisionName, setSelectedDivisionName] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  const [hasDivisions, setHasDivisions] = useState(false);

  // --- Data ---
  const [nextRecordId, setNextRecordId] = useState(0);
  const [existingRecord, setExistingRecord] = useState<GovPaymentRecord | null>(null);
  const isPaid = existingRecord !== null;

  // --- Form Fields ---
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState<number>(0);
  const [feeType, setFeeType] = useState('سداد كامل');
  const [paidAmountStr, setPaidAmountStr] = useState<string>('0');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // === 1. جلب البيانات الأساسية ===
  useEffect(() => {
    const fetchGrades = async () => {
      if (!schoolName || !stageName) return;
      try {
        const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
        const json = await res.json();
        if (json.success) setGrades(json.data);
      } catch (e) { console.error(e); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  // ✅ Effect A: جلب الشعب فقط (يشتغل لما الصف يتغير)
  useEffect(() => {
    setSelectedDivisionId(null);
    setSelectedDivisionName('');
    setSelectedClassName('');
    setClasses([]);
    setStudents([]);
    clearStudentSelection();
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

  // ✅ Effect B: جلب الفصول فقط (يشتغل لما الشعبة تتغير أو الصف بدون شعب)
  useEffect(() => {
    setSelectedClassName('');
    setStudents([]);
    clearStudentSelection();

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
      } catch (err) {
        console.error(err);
        if (!cancelled) setClasses([]);
      }
    };

    fetchClasses();
    return () => { cancelled = true; };
  }, [selectedGradeId, selectedGradeName, schoolName, stageName, selectedDivisionName, hasDivisions]);

  // === 3. جلب الطلاب ===
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassName) { setStudents([]); return; }
      try {
        const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedClassName}&inpot=4`);
        const json = await res.json();
        if (json.success && json.data) setStudents(json.data.map((s: any) => ({ StudentID: s['الرقم'], ArbStudName: s['الاسم بالعربى'] })));
      } catch (e) { console.error(e); }
    };
    fetchStudents();
    clearStudentSelection();
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  // === 2. جلب الرقم التسلسلي (INPOT 59) ===
  useEffect(() => {
    const fetchId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/59`);
        const json = await res.json();
        if (json.success && json.data?.[0]) {
            const id = Object.values(json.data[0])[0];
            setNextRecordId(Number(id) || 0);
        }
      } catch(e) { console.error(e); }
    };
    if(schoolId) fetchId();
  }, [schoolId]);

  // === 3. جلب حالة السداد عند اختيار الطالب ===
  useEffect(() => {
    const fetchStatus = async () => {
        if (!selectedStudentId) {
            setExistingRecord(null);
            resetFormToDefault();
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedStudentId}&sch2=${yearId}&inpot=9`);
            const json = await res.json();

            if (json.success && json.data && json.data.length > 0) {
                const record = json.data[0];
                setExistingRecord(record);
                setPaymentDate(record["تاريخ السداد"]?.split('T')[0] || new Date().toISOString().split('T')[0]);
                setFeeType(record["نوع السداد"] || 'سداد كامل');
                setPaidAmountStr(String(record["المبلغ"] || '0'));
                setReceiptNumber(Number(record["رقم القسيمة"]) || 0);
            } else {
                setExistingRecord(null);
                resetFormToDefault();
            }
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };

    fetchStatus();
  }, [selectedStudentId, yearId]);

  // === دوال مساعدة ===
  
  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedDivisionId(id);
    const divObj = divisionsList.find(d => d['الرقم'] === id);
    setSelectedDivisionName(divObj ? divObj['الشعبة'] : '');
  };

  const clearStudentSelection = () => {
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setExistingRecord(null);
    resetFormToDefault();
  };

  const resetFormToDefault = () => {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReceiptNumber(0);
      setFeeType('سداد كامل');
      setPaidAmountStr('0');
      setImageFile(null);
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
  });

  // === 4. الحفظ والتعديل والحذف ===
  const handleAction = async (actionType: number) => {
    if (!selectedStudentId) return alert('اختر الطالب');
    if (actionType === 1 && isPaid) return alert('تم السداد بالفعل، استخدم زر التعديل');
    if (actionType !== 1 && !isPaid) return alert('لا يوجد سجل لتعديله أو حذفه');

    setSaving(true);
    try {
        let imgBase64 = '';
        if (imageFile) imgBase64 = await toBase64(imageFile);

        const recordId = (isPaid && existingRecord) ? existingRecord["الرقم"] : nextRecordId;

        const payload = {
            MsrofatID: recordId,
            masrofatgate: paymentDate,
            msrofatTyp: feeType,
            msrwfatCont: paidAmountStr,
            NamperSdad: receiptNumber,
            StudentID: selectedStudentId,
            YerID: yearId,
            ImageBase64: imgBase64,
            INPOT: actionType
        };

        const res = await fetch(`${API_URL}/api/fees/gov-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert(`✅ تمت العملية بنجاح`);
            
            if (actionType === 3) {
                setExistingRecord(null);
                resetFormToDefault();
            } else {
                setExistingRecord({ 
                    "الرقم": recordId, 
                    "تاريخ السداد": paymentDate, 
                    "نوع السداد": feeType, 
                    "المبلغ": paidAmountStr, 
                    "رقم القسيمة": receiptNumber 
                });
                if (!isPaid) setNextRecordId(prev => prev + 1);
            }
            setImageFile(null);
        } else {
            alert('❌ فشل: ' + data.error);
        }
    } catch(e) { alert('خطأ'); } 
    finally { setSaving(false); }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1100px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#fff7ed', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', padding: '35px', borderRadius: '25px', marginBottom: '30px', boxShadow: '0 15px 30px rgba(249, 115, 22, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid #ffedd5' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', width: '100%', outline: 'none', fontSize: '15px' };
  const btnStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', transition: '0.2s', color: 'white' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{margin:0, fontSize:'32px'}}>🏛️ تسجيل المصروفات الحكومية</h1>
          <p style={{margin: '5px 0 0', opacity:0.9}}>تسجيل سداد المصروفات الحكومية للطلاب</p>
        </div>
        <div style={{ fontSize: '60px' }}>🏛️</div>
      </div>

      {/* فلاتر الاختيار */}
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#9a3412' }}>١. الصف الدراسي</label>
                <select value={selectedGradeId || ''} onChange={e => { setSelectedGradeId(Number(e.target.value)); setSelectedGradeName(grades.find(g=>g['الرقم']==Number(e.target.value))?.['الصف الدراسى']||''); }} style={inputStyle}>
                    <option value="">اختر الصف</option>
                    {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
            </div>

            {/* ✅ الشعبة - تظهر فقط لو فيها شعب */}
            {hasDivisions && (
              <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#9a3412' }}>٢. الشعبة</label>
                  <select value={selectedDivisionId || ''} onChange={handleDivisionChange} style={inputStyle} disabled={!selectedGradeId}>
                      <option value="">-- اختر الشعبة --</option>
                      {divisionsList.map(d => <option key={d['الرقم']} value={d['الرقم']}>{d['الشعبة']}</option>)}
                  </select>
              </div>
            )}

            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#9a3412' }}>{hasDivisions ? '٣. الفصل' : '٢. الفصل'}</label>
                <select value={selectedClassName} onChange={e => setSelectedClassName(e.target.value)} style={inputStyle} disabled={!selectedGradeId || (hasDivisions && !selectedDivisionName)}>
                    <option value="">
                        {hasDivisions && !selectedDivisionName ? '-- اختر الشعبة أولاً --' : 'اختر الفصل'}
                    </option>
                    {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                </select>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#9a3412' }}>{hasDivisions ? '٤. الطالب' : '٣. الطالب'}</label>
                <div style={{position:'relative'}}>
                    <input 
                        list="studs" 
                        value={selectedStudentName} 
                        onChange={e => { 
                            const val = e.target.value;
                            setSelectedStudentName(val); 
                            const s = students.find(x=>x.ArbStudName===val); 
                            setSelectedStudentId(s ? s.StudentID : null); 
                        }} 
                        style={{...inputStyle, borderColor: selectedStudentId ? '#f97316' : '#e5e7eb', paddingLeft: '30px'}} 
                        placeholder="اكتب أو اختر الطالب" 
                        disabled={!selectedClassName}
                    />
                    {selectedStudentName && (
                        <button 
                            onClick={clearStudentSelection} 
                            style={{position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', background:'#eee', border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer', fontWeight:'bold', color:'#666'}}
                            title="مسح الاختيار"
                        >
                            ×
                        </button>
                    )}
                    <datalist id="studs">{students.map(s => <option key={s.StudentID} value={s.ArbStudName} />)}</datalist>
                </div>
            </div>
        </div>

        {/* تنبيه الشعب */}
        {hasDivisions && (
            <div style={{ marginTop: '15px', background: '#fff7ed', border: '1px solid #ffedd5', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span style={{ color: '#9a3412', fontSize: '13px' }}>هذه المرحلة تحتوي على شعب. اختر الشعبة لعرض فصولها فقط.</span>
            </div>
        )}
      </div>

      {loading ? <div style={{textAlign:'center', padding:'20px'}}>جاري التحميل...</div> : (
        selectedStudentId && (
          <div style={cardStyle}>
            {/* حالة السداد */}
            <div style={{ marginBottom: 20, padding: 15, background: isPaid ? '#dcfce7' : '#fef2f2', borderRadius: 10, border: `1px solid ${isPaid ? '#86efac' : '#fecaca'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{fontWeight:'bold', fontSize:'18px', color: isPaid ? '#166534' : '#991b1b'}}>
                    {isPaid ? '✅ تم سداد المصروفات الحكومية' : '❌ لم يتم السداد بعد'}
                </span>
                {isPaid && <span style={{background:'#fff', padding:'5px 10px', borderRadius:'20px', color:'#15803d', border:'1px solid #86efac', fontSize:'12px'}}>رقم الإيصال: {existingRecord?.["الرقم"]}</span>}
            </div>

            {/* الفورم */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>تاريخ السداد</label>
                    <input type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>رقم القسيمة</label>
                    <input type="number" value={receiptNumber} onChange={e=>setReceiptNumber(Number(e.target.value))} style={inputStyle} placeholder="رقم القسيمة" />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>نوع السداد</label>
                    <select value={feeType} onChange={e=>setFeeType(e.target.value)} style={inputStyle}>
                        <option value="سداد كامل">سداد كامل</option>
                        <option value="معفى">معفى</option>
                        <option value="ابناء عاملين">ابناء عاملين</option>
                        <option value="ايتام">ايتام</option>
                        <option value="قوات مسلحة">قوات مسلحة</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>المبلغ</label>
                    <input type="text" value={paidAmountStr} onChange={e=>setPaidAmountStr(e.target.value)} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>صورة الإيصال</label>
                    <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0]||null)} style={{...inputStyle, padding:'11px'}} />
                </div>
            </div>

            {/* أزرار التحكم */}
            <div style={{ marginTop: 30, display: 'flex', gap: '15px', justifyContent: 'center' }}>
                {!isPaid && (
                    <button onClick={() => handleAction(1)} disabled={saving} style={{...btnStyle, background:'#f97316'}}>
                        {saving ? '⏳ جاري...' : '💾 تسجيل سداد جديد'}
                    </button>
                )}

                {isPaid && (
                    <button onClick={() => handleAction(2)} disabled={saving} style={{...btnStyle, background:'#2563eb'}}>
                        {saving ? '⏳ جاري...' : '✏️ تعديل السجل'}
                    </button>
                )}

                {isPaid && (
                    <button onClick={() => { if(confirm('حذف السجل؟')) handleAction(3); }} disabled={saving} style={{...btnStyle, background:'#dc2626'}}>
                        🗑️ حذف
                    </button>
                )}
            </div>
          </div>
        )
      )}
    </div>
  );
}