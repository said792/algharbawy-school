'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

interface FeeSetup {
    FeeID: number;
    TotalAmount: number;
    InstallmentCount: number;
    Inst1Amount: number; Inst2Amount: number; Inst3Amount: number; Inst4Amount: number;
}

interface PaymentRecord {
    MsrofatNID: number;
    MsrofatNasDate: string;
    PaymentType: string;
    InstallmentNumber: number;
    PaidAmount: number;
    MsrofatMtbke: number;
}

interface InstallmentStatus {
    num: number;
    amount: number;
    isPaid: boolean;
}

export default function StudentPaymentPage() {
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

  // --- Financial Data ---
  const [feeSetup, setFeeSetup] = useState<FeeSetup | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  
  // --- Form State ---
  const [nextRecordId, setNextRecordId] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('نقدي');
  const [installmentNum, setInstallmentNum] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [kasemaNam, setKasemaNam] = useState('');
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
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setHasDivisions(false);
    setFeeSetup(null); setPaymentHistory([]);

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
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setFeeSetup(null); setPaymentHistory([]);

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
    setSelectedStudentId(null); setSelectedStudentName('');
    setFeeSetup(null); setPaymentHistory([]);
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  // === 2. جلب الرقم التسلسلي (INPOT 60) ===
  useEffect(() => {
    const fetchId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/60`);
        const json = await res.json();
        if (json.success && json.data?.[0]) {
            const id = Object.values(json.data[0])[0];
            setNextRecordId(Number(id) || 0);
        }
      } catch(e) { console.error(e); }
    };
    if(schoolId) fetchId();
  }, [schoolId]);

  // === 3. جلب البيانات المالية عند اختيار الطالب ===
  useEffect(() => {
    const fetchFeeData = async () => {
        if (!selectedStudentId || !selectedGradeId) {
            setFeeSetup(null); setPaymentHistory([]);
            return;
        }

        setLoading(true);
        try {
            const resSetup = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedGradeId}&sch2=${yearId}&inpot=26`);
            const jsonSetup = await resSetup.json();
            
            if (jsonSetup.success && jsonSetup.data && jsonSetup.data.length > 0) {
                const setup = jsonSetup.data[0];
                setFeeSetup(setup);
                
                const resHistory = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedStudentId}&sch2=${yearId}&inpot=27`);
                const jsonHistory = await resHistory.json();
                
                if (jsonHistory.success && jsonHistory.data) {
                    setPaymentHistory(jsonHistory.data);
                } else {
                    setPaymentHistory([]);
                }
            } else {
                setFeeSetup(null);
            }
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };

    fetchFeeData();
  }, [selectedStudentId, selectedGradeId, yearId]);

  // === 4. حساب حالة الأقساط (Logic Magic) ===
  const { installmentStatus, totalPaid, remainingAmount } = useMemo(() => {
    if (!feeSetup) return { installmentStatus: [], totalPaid: 0, remainingAmount: 0 };

    const status: InstallmentStatus[] = [];
    
    for (let i = 1; i <= (feeSetup.InstallmentCount || 1); i++) {
        const amount = Number(feeSetup[`Inst${i}Amount` as keyof FeeSetup]) || 0;
        const isPaid = paymentHistory.some(p => p.InstallmentNumber === i);
        status.push({ num: i, amount, isPaid });
    }

    const paid = paymentHistory.reduce((sum, p) => sum + (p.PaidAmount || 0), 0);
    const remaining = (feeSetup.TotalAmount || 0) - paid;

    return { installmentStatus: status, totalPaid: paid, remainingAmount: remaining };
  }, [feeSetup, paymentHistory]);

  // تحديث الاختيار الافتراضي
  useEffect(() => {
    const firstUnpaid = installmentStatus.find(i => !i.isPaid);
    if (firstUnpaid) {
        setInstallmentNum(firstUnpaid.num);
        setPaidAmount(firstUnpaid.amount);
    } else {
        setInstallmentNum(0);
        setPaidAmount(0);
    }
  }, [installmentStatus]);

  // === 5. دوال التفاعل ===
  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedDivisionId(id);
    const divObj = divisionsList.find(d => d['الرقم'] === id);
    setSelectedDivisionName(divObj ? divObj['الشعبة'] : '');
  };

  const handleInstallmentChange = (num: number) => {
    setInstallmentNum(num);
    const selected = installmentStatus.find(i => i.num === num);
    if (selected) setPaidAmount(selected.amount);
  };

  const handleSave = async () => {
    if (!selectedStudentId) return alert('اختر الطالب');
    if (installmentNum === 0) return alert('اختر رقم القسط');

    const targetInstallment = installmentStatus.find(i => i.num === installmentNum);
    
    if (targetInstallment?.isPaid) return alert('⚠️ هذا القسط تم سداده بالفعل!');
    if (paidAmount <= 0) return alert('ادخل مبلغ صحيح');
    if (targetInstallment && paidAmount > targetInstallment.amount) {
        return alert(`⚠️ المبلغ المدفوع (${paidAmount}) أكبر من قيمة القسط (${targetInstallment.amount})`);
    }

    setSaving(true);
    try {
        let imgBase64 = '';
        if (imageFile) {
            imgBase64 = await toBase64(imageFile);
        }

        const payload = {
            MsrofatNID: nextRecordId,
            StudentID: selectedStudentId,
            SchoolID: schoolId,
            YerID: yearId,
            GradeID: selectedGradeId,
            MsrofatNasDate: paymentDate,
            PaymentType: paymentType,
            InstallmentNumber: installmentNum,
            kasemaNam: kasemaNam,
            PaidAmount: paidAmount,
            ImageBase64: imgBase64,
            INPOT: 1
        };

        const res = await fetch(`${API_URL}/api/fees/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert(`✅ تم سداد القسط ${installmentNum} بنجاح. المتبقي: ${data.remainingAmount}`);
            
            setNextRecordId(prev => prev + 1);
            setImageFile(null);
            
            const newRecord: PaymentRecord = {
                MsrofatNID: nextRecordId, 
                MsrofatNasDate: paymentDate, 
                PaymentType: paymentType,
                InstallmentNumber: installmentNum, 
                PaidAmount: paidAmount, 
                MsrofatMtbke: data.remainingAmount
            };
            setPaymentHistory(prev => [newRecord, ...prev]);
        } else {
            alert('❌ فشل الحفظ: ' + data.error);
        }
    } catch(e) { alert('خطأ في الاتصال'); } 
    finally { setSaving(false); }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
  });

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f0fdf4', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', padding: '35px', borderRadius: '25px', marginBottom: '30px', boxShadow: '0 15px 30px rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid #d1fae5' };
  const inputStyle: React.CSSProperties = { padding: '12px', borderRadius: '10px', border: '2px solid #e5e7eb', width: '100%', outline: 'none', fontSize: '15px', transition:'border 0.2s' };
  const btnStyle: React.CSSProperties = { padding: '15px 35px', borderRadius: '12px', background: '#059669', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 6px rgba(5, 150, 105, 0.3)' };
  
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{margin:0, fontSize:'32px'}}>💸 نظام سداد المصروفات</h1>
          <p style={{margin: '5px 0 0', opacity:0.9}}>تسجيل سداد أقساط المصروفات الدراسية للطلاب</p>
        </div>
        <div style={{ fontSize: '60px' }}>💰</div>
      </div>

      {/* فلاتر الاختيار */}
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div style={{marginBottom:'10px'}}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#047857' }}>١. الصف الدراسي</label>
                <select value={selectedGradeId || ''} onChange={e => { setSelectedGradeId(Number(e.target.value)); setSelectedGradeName(grades.find(g=>g['الرقم']==Number(e.target.value))?.['الصف الدراسى']||''); }} style={inputStyle}>
                    <option value="">اختر الصف</option>
                    {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
            </div>

            {/* ✅ الشعبة - تظهر فقط لو فيها شعب */}
            {hasDivisions && (
              <div style={{marginBottom:'10px'}}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#047857' }}>٢. الشعبة</label>
                  <select value={selectedDivisionId || ''} onChange={handleDivisionChange} style={inputStyle} disabled={!selectedGradeId}>
                      <option value="">-- اختر الشعبة --</option>
                      {divisionsList.map(d => <option key={d['الرقم']} value={d['الرقم']}>{d['الشعبة']}</option>)}
                  </select>
              </div>
            )}

            <div style={{marginBottom:'10px'}}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#047857' }}>{hasDivisions ? '٣. الفصل' : '٢. الفصل'}</label>
                <select value={selectedClassName} onChange={e => setSelectedClassName(e.target.value)} style={inputStyle} disabled={!selectedGradeId || (hasDivisions && !selectedDivisionName)}>
                    <option value="">
                        {hasDivisions && !selectedDivisionName ? '-- اختر الشعبة أولاً --' : 'اختر الفصل'}
                    </option>
                    {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
                </select>
            </div>

            <div style={{marginBottom:'10px'}}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#047857' }}>{hasDivisions ? '٤. الطالب' : '٣. الطالب'}</label>
                <input 
                    list="studs" 
                    value={selectedStudentName} 
                    onChange={e => { setSelectedStudentName(e.target.value); setSelectedStudentId(students.find(s=>s.ArbStudName===e.target.value)?.StudentID||null); }} 
                    style={{...inputStyle, borderColor: selectedStudentId ? '#10b981' : '#e5e7eb'}} 
                    placeholder="اكتب أو اختر الطالب" 
                    disabled={!selectedClassName}
                />
                <datalist id="studs">{students.map(s => <option key={s.StudentID} value={s.ArbStudName} />)}</datalist>
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

      {loading ? (
          <div style={{textAlign:'center', padding:'50px', color:'#065f46'}}>جاري تحميل البيانات المالية...</div>
      ) : (
        <>
          {/* ملخص المصروفات */}
          {selectedStudentId && feeSetup && (
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom:'2px solid #ecfdf5', paddingBottom:'15px' }}>
                    <h3 style={{margin:0, color:'#047857', fontSize:'22px'}}>📊 ملخص الحساب</h3>
                    <div style={{ background:'#ecfdf5', padding:'8px 20px', borderRadius:'30px', color:'#065f46', fontWeight:'bold', border:'1px solid #d1fae5'}}>رقم السجل: {nextRecordId}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '20px', textAlign:'center' }}>
                    <div style={{background:'#eff6ff', padding:'20px', borderRadius:'15px', border:'1px solid #bfdbfe'}}>
                        <div style={{color:'#1e40af', fontWeight:'bold', marginBottom:5}}>المطلوب</div>
                        <div style={{fontSize:'24px', fontWeight:'bold', color:'#1e3a8a'}}>{feeSetup.TotalAmount?.toFixed(2)}</div>
                    </div>
                    <div style={{background:'#ecfdf5', padding:'20px', borderRadius:'15px', border:'1px solid #a7f3d0'}}>
                        <div style={{color:'#047857', fontWeight:'bold', marginBottom:5}}>المدفوع</div>
                        <div style={{fontSize:'24px', fontWeight:'bold', color:'#065f46'}}>{totalPaid.toFixed(2)}</div>
                    </div>
                    <div style={{background: remainingAmount > 0 ? '#fef2f2' : '#ecfdf5', padding:'20px', borderRadius:'15px', border:`1px solid ${remainingAmount > 0 ? '#fecaca' : '#a7f3d0'}`}}>
                        <div style={{color: remainingAmount > 0 ? '#b91c1c' : '#047857', fontWeight:'bold', marginBottom:5}}>المتبقي</div>
                        <div style={{fontSize:'24px', fontWeight:'bold', color: remainingAmount > 0 ? '#dc2626' : '#059669'}}>{remainingAmount.toFixed(2)}</div>
                    </div>
                </div>
            </div>
          )}

          {/* فورم السداد */}
          {selectedStudentId && feeSetup && (
            <div style={cardStyle}>
                <h3 style={{margin:'0 0 20px 0', color:'#047857', fontSize:'22px'}}>💳 تسجيل دفعة جديدة</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    {/* رقم القسط */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#374151' }}>رقم القسط</label>
                        <select 
                            value={installmentNum} 
                            onChange={(e) => handleInstallmentChange(Number(e.target.value))} 
                            style={{...inputStyle, background: installmentStatus.find(i=>i.num===installmentNum)?.isPaid ? '#fee2e2' : '#fff'}} 
                            disabled={remainingAmount <= 0}
                        >
                            <option value="0" disabled>-- اختر القسط --</option>
                            {installmentStatus.map(inst => (
                                <option 
                                    key={inst.num} 
                                    value={inst.num} 
                                    disabled={inst.isPaid}
                                >
                                    {inst.isPaid ? `✅ القسط ${inst.num} (مسدد)` : `💲 القسط ${inst.num} (${inst.amount} ج)`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#374151' }}>المبلغ المدفوع</label>
                        <input type="number" value={paidAmount} onChange={e=>setPaidAmount(Number(e.target.value))} style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#374151' }}>تاريخ السداد</label>
                        <input type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#374151' }}>طريقة السداد</label>
                        <select value={paymentType} onChange={e=>setPaymentType(e.target.value)} style={inputStyle}>
                            <option value="نقدي">نقدي</option>
                            <option value="تحويل">تحويل</option>
                            <option value="شيك">شيك</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#374151' }}>اسم القاسم</label>
                        <input type="text" value={kasemaNam} onChange={e=>setKasemaNam(e.target.value)} style={inputStyle} placeholder="اختياري" />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color:'#374151' }}>صورة الإيصال</label>
                        <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0]||null)} style={{...inputStyle, padding:'11px'}} />
                    </div>
                </div>

                <div style={{ marginTop: 30, textAlign: 'center' }}>
                    <button onClick={handleSave} disabled={saving || remainingAmount <= 0} style={{...btnStyle, opacity: (saving || remainingAmount <= 0) ? 0.5 : 1, transform:'scale(1.05)'}}>
                        {saving ? '⏳ جاري الحفظ...' : '✅ تسجيل السداد'}
                    </button>
                    {remainingAmount <= 0 && <p style={{color:'#059669', marginTop:'10px', fontWeight:'bold'}}>🎉 هذا الطالب سدد كامل المستحقات</p>}
                </div>
            </div>
          )}

          {/* جدول السجل */}
          {selectedStudentId && paymentHistory.length > 0 && (
            <div style={cardStyle}>
                <h3 style={{margin:'0 0 15px 0', color:'#047857', fontSize:'20px'}}>📜 سجل المدفوعات السابقة</h3>
                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', minWidth:'600px'}}>
                        <thead style={{background:'#f0fdf4'}}>
                            <tr>
                                <th style={thStyle}>م</th>
                                <th style={thStyle}>التاريخ</th>
                                <th style={thStyle}>القسط</th>
                                <th style={thStyle}>النوع</th>
                                <th style={thStyle}>المبلغ</th>
                                <th style={thStyle}>المتبقي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentHistory.map((p, i) => (
                                <tr key={i} style={{borderBottom:'1px solid #f3f4f6'}}>
                                    <td style={tdStyle}>{i+1}</td>
                                    <td style={tdStyle}>{p.MsrofatNasDate?.split('T')[0]}</td>
                                    <td style={tdStyle}><span style={{background:'#dcfce7', color:'#166534', padding:'4px 10px', borderRadius:'20px', fontSize:'13px'}}>القسط {p.InstallmentNumber}</span></td>
                                    <td style={tdStyle}>{p.PaymentType}</td>
                                    <td style={{...tdStyle, fontWeight:'bold', color:'#047857'}}>{p.PaidAmount?.toFixed(2)}</td>
                                    <td style={{...tdStyle, color: p.MsrofatMtbke > 0 ? '#b91c1c' : '#059669'}}>{p.MsrofatMtbke?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
          
          {/* حالة فارغة */}
          {selectedStudentId && !feeSetup && !loading && (
             <div style={{textAlign:'center', padding:'40px', color:'#b91c1c', background:'#fef2f2', borderRadius:'15px', border:'1px solid #fecaca'}}>
                ⚠️ لا توجد مصروفات محددة لهذا الصف في هذا العام. برجاء تحديد المصروفات أولاً.
             </div>
          )}
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding:'12px', textAlign:'right', borderBottom:'2px solid #d1fae5', color:'#065f46' };
const tdStyle: React.CSSProperties = { padding:'12px', fontSize:'14px' };