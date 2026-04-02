'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface ClassItem { 'الرقم': number; 'الفصل': string; }
interface Student { StudentID: number; ArbStudName: string; }

// واجهة النتائج الحكومية
interface GovResult {
    MsrofatID: number; 
    StudentID: number; 
    "مسلسل"?: number;
    "اسم الطالب": string;
    "كود الطالب": string;
    "تاريخ السداد": string;
    "نوع السداد": string;
    "المبلغ": string;
    "رقم القسيمة": number;
}

// واجهة النتائج الخاصة
interface PrivateResult {
    MsrofatNID: number; 
    StudentID: number; 
    "اسم الطالب": string;
    "كود الطالب": string;
    "تاريخ السداد": string;
    "رقم القسط": number;
    "إجمالي المطلوب": number;
    "المبلغ المدفوع": number;
    "المتبقي": number;
}

type MainTab = 'gov' | 'private';
type SubTab = 'name' | 'date';

export default function SearchFeesPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearName = work?.yearName;
  const yearId = work?.yearId || 0;

  const [mainTab, setMainTab] = useState<MainTab>('gov');
  const [subTab, setSubTab] = useState<SubTab>('name');

  // Filters
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Results
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // === 1. Filters Logic ===
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

  useEffect(() => {
    if (!selectedGradeName) { setClasses([]); return; }
    const fetchClasses = async () => {
      try {
        const res = await fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`);
        const json = await res.json();
        if (json.success) setClasses(json.data);
      } catch (e) { console.error(e); }
    };
    fetchClasses();
    clearStudent();
  }, [selectedGradeName]);

  useEffect(() => {
    if (!selectedClassName) { setStudents([]); return; }
    const fetchStudents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedClassName}&inpot=4`);
        const json = await res.json();
        if (json.success && json.data) setStudents(json.data.map((s: any) => ({ StudentID: s['الرقم'], ArbStudName: s['الاسم بالعربى'] })));
      } catch (e) { console.error(e); }
    };
    fetchStudents();
    clearStudent();
  }, [selectedClassName]);

  const clearStudent = () => {
    setSelectedStudentId(null);
    setSelectedStudentName('');
  };

  // === 2. Search Logic ===
  const handleSearch = async () => {
    if (subTab === 'name' && !selectedStudentId) return alert('اختر الطالب');
    if (subTab === 'date' && !selectedDate) return alert('اختر التاريخ');

    setLoading(true); setSearched(true); setResults([]);
    
    try {
        let res;
        // Mapping Logic:
        // Gov Date: 8
        // Gov Name: 24 (User updated SQL)
        // Private Date: 9
        // Private Name: 28

        if (mainTab === 'gov') {
            if (subTab === 'name') {
                // Gov Name -> INPOT 24
                res = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedStudentId}&sch2=${yearId}&inpot=9`);
            } else {
                // Gov Date -> INPOT 8
                res = await fetch(`${API_URL}/api/scher1int1dat?sch=${schoolId}&SCHER2=${selectedDate}&inpot=8`);
            }
        } else {
            // Private
            if (subTab === 'name') {
                // Private Name -> INPOT 28
                res = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedStudentId}&sch2=${yearId}&inpot=28`);
            } else {
                // Private Date -> INPOT 9
                res = await fetch(`${API_URL}/api/scher1int1dat?sch=${schoolId}&SCHER2=${selectedDate}&inpot=9`);
            }
        }

        const json = await res.json();
        if (json.success && json.data) setResults(json.data);
        else setResults([]);

    } catch(e) { alert('خطأ في البحث'); console.error(e); } 
    finally { setLoading(false); }
  };

  // === 3. Edit & Delete ===
  const handleDelete = async (id: number, stuId: number) => {
    if (!confirm('تأكيد الحذف؟')) return;
    if (!id) return alert('خطأ: رقم السجل غير موجود');
    
    const endpoint = mainTab === 'gov' ? `${API_URL}/api/fees/gov-payment` : `${API_URL}/api/fees/payment`;
    const keyId = mainTab === 'gov' ? 'MsrofatID' : 'MsrofatNID';
    
    // ✅ إضافة YerID في الحذف أيضاً لتجنب مشاكل الـ SP
    const payload: any = { [keyId]: id, StudentID: stuId, INPOT: 3, YerID: yearId };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert('تم الحذف');
            setResults(prev => prev.filter(r => (mainTab === 'gov' ? r.MsrofatID : r.MsrofatNID) !== id));
        } else { alert('فشل الحذف: ' + (data.error || 'خطأ غير معروف')); }
    } catch(e) { alert('خطأ في الاتصال'); }
  };

  const openEditModal = (record: any) => {
      if (!record.MsrofatID && !record.MsrofatNID) return alert('لا يمكن التعديل: رقم السجل مفقود');

      if (mainTab === 'gov') {
          setEditData({
              type: 'gov',
              MsrofatID: record.MsrofatID,
              StudentID: record.StudentID,
              masrofatgate: record['تاريخ السداد']?.split('T')[0],
              msrofatTyp: record['نوع السداد'],
              msrwfatCont: record['المبلغ'],
              NamperSdad: record['رقم القسيمة']
          });
      } else {
          setEditData({
              type: 'private',
              MsrofatNID: record.MsrofatNID,
              StudentID: record.StudentID,
              MsrofatNasDate: record['تاريخ السداد']?.split('T')[0],
              PaidAmount: record['المبلغ المدفوع'],
              InstallmentNumber: record['رقم القسط']
          });
      }
      setIsEditOpen(true);
  };

  const handleUpdate = async () => {
      setSaving(true);
      try {
          let endpoint = mainTab === 'gov' ? `${API_URL}/api/fees/gov-payment` : `${API_URL}/api/fees/payment`;
          
          // ✅ إصلاح: إضافة YerID في كل الأحوال
          let payload: any = { ...editData, INPOT: 2, YerID: yearId };

          const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
              alert('تم التعديل');
              setIsEditOpen(false);
              handleSearch();
          } else { alert('فشل التعديل: ' + (data.error || 'خطأ غير معروف')); }
      } catch(e) { alert('خطأ'); } 
      finally { setSaving(false); }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '25px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '25px', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.04)', marginBottom: '20px', border: '1px solid #e0e7ff' };
  const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' };
  const btnStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: 'white' };
  const activeTabBtn: React.CSSProperties = { background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.3)' };
  const inactiveTabBtn: React.CSSProperties = { background: '#e0e7ff', color: '#4338ca', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{margin:0, fontSize:'28px'}}>🔍 البحث في سداد المصروفات</h1>
        <p style={{margin: '5px 0 0', opacity:0.9}}>متابعة سجلات المصروفات الحكومية والخاصة</p>
      </div>

      {/* Main Tabs */}
      <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
        <button onClick={() => { setMainTab('gov'); setResults([]); }} style={mainTab === 'gov' ? activeTabBtn : inactiveTabBtn}>🏛️ مصروفات حكومية</button>
        <button onClick={() => { setMainTab('private'); setResults([]); }} style={mainTab === 'private' ? activeTabBtn : inactiveTabBtn}>💸 مصروفات خاصة</button>
      </div>

      <div style={cardStyle}>
        {/* Sub Tabs */}
        <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
            <button onClick={() => setSubTab('name')} style={{...tabStyle, background: subTab === 'name' ? '#f1f5f9' : 'transparent', borderBottom: subTab === 'name' ? '2px solid #4f46e5' : '2px solid transparent'}}>👤 بحث بالاسم</button>
            <button onClick={() => setSubTab('date')} style={{...tabStyle, background: subTab === 'date' ? '#f1f5f9' : 'transparent', borderBottom: subTab === 'date' ? '2px solid #4f46e5' : '2px solid transparent'}}>📅 بحث بالتاريخ</button>
        </div>

        {subTab === 'name' ? (
          <div style={{display:'flex', gap:'10px', alignItems:'flex-end'}}>
            <div style={{flex:1, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'10px'}}>
               <select value={selectedGradeId||''} onChange={e => { setSelectedGradeId(Number(e.target.value)); setSelectedGradeName(grades.find(g=>g['الرقم']==Number(e.target.value))?.['الصف الدراسى']||''); }} style={inputStyle}>
                 <option value="">الصف</option>
                 {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
               </select>
               <select value={selectedClassName} onChange={e => setSelectedClassName(e.target.value)} style={inputStyle} disabled={!selectedGradeName}>
                 <option value="">الفصل</option>
                 {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
               </select>
               
               {/* خانة الطالب مع زر المسح */}
               <div style={{position: 'relative'}}>
                    <input 
                        list="studs" 
                        value={selectedStudentName} 
                        onChange={e => { 
                            setSelectedStudentName(e.target.value); 
                            setSelectedStudentId(students.find(s=>s.ArbStudName===e.target.value)?.StudentID||null); 
                        }} 
                        style={{...inputStyle, paddingLeft: '30px'}} 
                        placeholder="الطالب" 
                    />
                    {selectedStudentName && (
                        <button 
                            onClick={clearStudent}
                            style={{
                                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', 
                                background: '#eee', border: 'none', borderRadius: '50%', width: '20px', height: '20px', 
                                cursor: 'pointer', fontWeight: 'bold', color: '#555', fontSize: '12px'
                            }}
                        >
                            ×
                        </button>
                    )}
                    <datalist id="studs">{students.map(s=><option key={s.StudentID} value={s.ArbStudName}/>)}</datalist>
               </div>
            </div>
            <button onClick={handleSearch} disabled={loading} style={{...btnStyle, background:'#4f46e5', height:'42px'}}>بحث</button>
          </div>
        ) : (
          <div style={{display:'flex', gap:'10px', alignItems:'flex-end'}}>
            <div style={{flex:1}}>
              <label style={{fontWeight:'bold', marginBottom:'5px', display:'block'}}>التاريخ</label>
              <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleSearch} disabled={loading} style={{...btnStyle, background:'#4f46e5', height:'42px'}}>بحث</button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? <div style={{textAlign:'center', padding:'30px'}}>جاري البحث...</div> : 
        searched && (
            <div style={cardStyle}>
                <h3 style={{margin:'0 0 15px 0'}}>النتائج ({results.length})</h3>
                {results.length > 0 ? (
                    <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%', borderCollapse:'collapse', minWidth:'700px'}}>
                            <thead>
                                <tr style={{background:'#f8fafc', borderBottom:'2px solid #e0e7ff'}}>
                                    <th style={thStyle}>الطالب</th>
                                    <th style={thStyle}>التاريخ</th>
                                    {mainTab === 'gov' ? (
                                        <>
                                            <th style={thStyle}>النوع/القسيمة</th>
                                            <th style={thStyle}>المبلغ</th>
                                        </>
                                    ) : (
                                        <>
                                            <th style={thStyle}>القسط</th>
                                            <th style={thStyle}>المدفوع</th>
                                            <th style={thStyle}>المتبقي</th>
                                        </>
                                    )}
                                    <th style={thStyle}>إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9', transition:'background 0.2s'}}
                                        onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                                    >
                                        <td style={tdStyle}>
                                            <div style={{fontWeight:'bold'}}>{r['اسم الطالب']}</div>
                                            {r['كود الطالب'] && <div style={{fontSize:'11px', color:'#94a3b8'}}>كود: {r['كود الطالب']}</div>}
                                        </td>
                                        <td style={tdStyle}>{r['تاريخ السداد']?.split('T')[0]}</td>
                                        
                                        {mainTab === 'gov' ? (
                                            <>
                                                <td style={tdStyle}><span style={{background:'#e0e7ff', padding:'2px 8px', borderRadius:'4px', fontSize:'12px'}}>{r['نوع السداد']}</span></td>
                                                <td style={tdStyle}>{r['المبلغ']}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={tdStyle}>{r['رقم القسط']}</td>
                                                <td style={{...tdStyle, color:'#059669', fontWeight:'bold'}}>{r['المبلغ المدفوع']?.toLocaleString('ar-EG')}</td>
                                                <td style={{...tdStyle, color: r['المتبقي'] > 0 ? '#dc2626' : '#059669'}}>{r['المتبقي']?.toLocaleString('ar-EG')}</td>
                                            </>
                                        )}
                                        
                                        <td style={tdStyle}>
                                            <button onClick={() => openEditModal(r)} style={{...btnStyle, background:'#3b82f6', padding:'6px 12px', fontSize:'12px'}}>✏️</button>
                                            <button onClick={() => handleDelete(mainTab === 'gov' ? r.MsrofatID : r.MsrofatNID, r.StudentID)} style={{...btnStyle, background:'#ef4444', padding:'6px 12px', fontSize:'12px', marginRight:'5px'}}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{textAlign:'center', color:'#94a3b8'}}>لا توجد نتائج</div>
                )}
            </div>
        )
      }

      {/* Edit Modal */}
      {isEditOpen && (
        <div style={modalOverlay} onClick={()=>setIsEditOpen(false)}>
          <div style={modalContent} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:'0 0 20px 0', color:'#4f46e5'}}>تعديل البيانات</h3>
            
            <div style={{marginBottom:'15px'}}>
              <label style={labelStyle}>التاريخ</label>
              <input type="date" value={editData.masrofatgate || editData.MsrofatNasDate || ''} onChange={e => editData.type === 'gov' ? setEditData({...editData, masrofatgate: e.target.value}) : setEditData({...editData, MsrofatNasDate: e.target.value})} style={inputStyle} />
            </div>

            {editData.type === 'gov' ? (
                <>
                    <div style={{marginBottom:'15px'}}>
                        <label style={labelStyle}>نوع السداد</label>
                        <select value={editData.msrofatTyp || ''} onChange={e=>setEditData({...editData, msrofatTyp: e.target.value})} style={inputStyle}>
                            <option value="سداد كامل">سداد كامل</option>
                            <option value="معفى">معفى</option>
                            <option value="ابناء عاملين">ابناء عاملين</option>
                            <option value="ايتام">ايتام</option>
                            <option value="قوات مسلحة">قوات مسلحة</option>
                        </select>
                    </div>
                    <div style={{marginBottom:'15px'}}>
                        <label style={labelStyle}>رقم القسيمة (اختياري)</label>
                        <input type="number" value={editData.NamperSdad || ''} onChange={e=>setEditData({...editData, NamperSdad: e.target.value})} style={inputStyle} placeholder="رقم القسيمة" />
                    </div>
                    <div style={{marginBottom:'15px'}}>
                        <label style={labelStyle}>المبلغ</label>
                        <input value={editData.msrwfatCont || ''} onChange={e=>setEditData({...editData, msrwfatCont: e.target.value})} style={inputStyle} placeholder="المبلغ" />
                    </div>
                </>
            ) : (
                <>
                    <div style={{marginBottom:'15px'}}>
                        <label style={labelStyle}>المبلغ المدفوع</label>
                        <input type="number" value={editData.PaidAmount || 0} onChange={e=>setEditData({...editData, PaidAmount: Number(e.target.value)})} style={inputStyle} />
                    </div>
                    <div style={{marginBottom:'15px'}}>
                        <label style={labelStyle}>رقم القسط</label>
                        <input type="number" value={editData.InstallmentNumber || 1} onChange={e=>setEditData({...editData, InstallmentNumber: Number(e.target.value)})} style={inputStyle} />
                    </div>
                </>
            )}

            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'25px'}}>
              <button onClick={()=>setIsEditOpen(false)} style={{...btnStyle, background:'#e5e7eb', color:'#111'}}>إلغاء</button>
              <button onClick={handleUpdate} disabled={saving} style={{...btnStyle, background:'#4f46e5'}}>{saving?'جاري...':'💾 حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles Constants
const thStyle: React.CSSProperties = { padding:'12px', textAlign:'right', fontWeight:'bold', color:'#475569', fontSize:'13px' };
const tdStyle: React.CSSProperties = { padding:'12px', fontSize:'13px' };
const tabStyle: React.CSSProperties = { padding:'8px 16px', border:'none', cursor:'pointer', fontWeight:'bold', transition:'all 0.2s' };
const labelStyle: React.CSSProperties = { display:'block', marginBottom:'5px', fontWeight:'bold', fontSize:'13px', color:'#4b5563' };
const modalOverlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalContent: React.CSSProperties = { background:'white', padding:'25px', borderRadius:'20px', width:'420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' };