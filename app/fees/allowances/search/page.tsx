'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface ClassItem { 'الرقم': number; 'الفصل': string; }
interface Student { StudentID: number; ArbStudName: string; }

// ✅ تم تعديل الواجهة لتشمل StudentID
interface PermitResult {
  EzenStudID: number;
  StudentID?: number; // رقم الطالب (للفلترة والحذف)
  'الرقم': number;    // رقم الإذن
  'اسم الطالب': string;
  'الصف': string;
  'الفصل': string;
  'تاريخ الاذن': string;
  'وقت الخروج': string;
  'سبب الاذن': string;
  'عدد الاذون': number;
}

export default function SearchPermitsPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearName = work?.yearName;

  const [activeTab, setActiveTab] = useState(1);

  // فلاتر
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // نتائج البحث
  const [results, setResults] = useState<PermitResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // مودال التعديل
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // === جلب البيانات ===
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

  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedGradeName) { setClasses([]); return; }
      try {
        const res = await fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`);
        const json = await res.json();
        if (json.success) setClasses(json.data);
      } catch (err) { console.error(err); }
    };
    fetchClasses();
    setSelectedClassName(''); setStudents([]); setSelectedStudentId(null); setSelectedStudentName('');
  }, [selectedGradeName, schoolName, stageName]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassName) { setStudents([]); return; }
      try {
        const res = await fetch(`${API_URL}/api/search5?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&SCHER5=${selectedClassName}&inpot=4`);
        const json = await res.json();
        if (json.success && json.data) setStudents(json.data.map((s: any) => ({ StudentID: s['الرقم'], ArbStudName: s['الاسم بالعربى'] })));
      } catch (err) { console.error(err); }
    };
    fetchStudents();
    setSelectedStudentId(null); setSelectedStudentName('');
  }, [selectedClassName, selectedGradeName, schoolName, stageName, yearName]);

  // === دوال البحث ===
  
  const handleSearchByName = async () => {
    if (!selectedStudentName) return alert('اختر الطالب');
    setLoading(true); setSearched(true); setResults([]);
    try {
      const res = await fetch(`${API_URL}/api/search?scher=${encodeURIComponent(selectedStudentName)}&inpot=19`);
      const json = await res.json();

      if (json.success && json.data) {
        // ✅ فلترة بالرقم (لو الـ SQL رجع StudentID)
        const filtered = json.data.filter((r: any) => !selectedStudentId || r.StudentID === selectedStudentId);
        setResults(filtered);
      }
    } catch (e) { alert('خطأ'); } finally { setLoading(false); }
  };

  const handleSearchByDate = async () => {
    if (!selectedDate) return alert('اختر التاريخ');
    setLoading(true); setSearched(true); setResults([]);
    try {
      const res = await fetch(`${API_URL}/api/scher1int1dat?sch=${schoolId}&SCHER2=${selectedDate}&inpot=3`);
      const json = await res.json();
      if (json.success && json.data) setResults(json.data);
    } catch (e) { alert('خطأ'); } finally { setLoading(false); }
  };

  // === دوال التعديل والحذف ===
  
  const handleDelete = async (id: number, stuId: number | undefined) => {
    if (!confirm('حذف الإذن؟')) return;
    // لو مفيش StudentID من الناتج، مش هنقدر نحدث العداد في الـ SP (INPOT 3) صح
    // يفضل يرجع StudentID من الـ SQL
    try {
        const res = await fetch(`${API_URL}/api/students/exit-permit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ EzenStudID: id, StudentID: stuId || 0, INPOT: 3 })
        });
        const data = await res.json();
        if (data.success) {
            alert('تم الحذف');
            setResults(prev => prev.filter(r => r['الرقم'] !== id));
        } else { alert('فشل'); }
    } catch(e) { alert('خطأ'); }
  };

  const openEditModal = (record: PermitResult) => {
    setEditData({
        EzenStudID: record['الرقم'],
        StudentID: record.StudentID, // ✅ استخدام StudentID
        EzenStudDate: record['تاريخ الاذن']?.split('T')[0],
        EzenStudTime: record['وقت الخروج'],
        EzenStudSabb: record['سبب الاذن'],
        EzenStudNo: record['عدد الاذون']
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
      setSaving(true);
      try {
          const payload = {
              ...editData,
              YerID: work?.yearId || 0,
              INPOT: 2
          };
          const res = await fetch(`${API_URL}/api/students/exit-permit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(data.success){
              alert('تم التعديل');
              setIsEditOpen(false);
              setResults(prev => prev.map(r => r['الرقم'] === editData.EzenStudID ? {...r, ...editData, 'تاريخ الاذن': editData.EzenStudDate, 'وقت الخروج': editData.EzenStudTime, 'سبب الاذن': editData.EzenStudSabb} : r));
          } else {
              alert('فشل');
          }
      } catch(e) { alert('خطأ'); } finally { setSaving(false); }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f0f9ff', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(14, 165, 233, 0.3)' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e0f2fe' };
  const tabsStyle: React.CSSProperties = { display: 'flex', gap: '10px', marginBottom: '20px' };
  const tabBtn = (active: boolean) => ({ flex: 1, padding: '15px', border: 'none', borderRadius: '10px', cursor: 'pointer', background: active ? '#0284c7' : '#e0f2fe', color: active ? 'white' : '#0369a1', fontWeight: 'bold' });
  const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' };
  const btnStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: 'white' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{margin:0}}>🔍 البحث في سجل الأذونات</h1>
        <p>عرض وتعديل أذونات الخروج</p>
      </div>

      <div style={tabsStyle}>
        <button onClick={() => { setActiveTab(1); setResults([]); }} style={tabBtn(activeTab===1)}>بحث بالاسم</button>
        <button onClick={() => { setActiveTab(2); setResults([]); }} style={tabBtn(activeTab===2)}>بحث بالتاريخ</button>
      </div>

      <div style={cardStyle}>
        {activeTab === 1 ? (
          <div style={{display:'flex', gap:'10px', alignItems:'flex-end'}}>
            <div style={{flex:1, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px'}}>
               <select value={selectedGradeId||''} onChange={e => { setSelectedGradeId(Number(e.target.value)); setSelectedGradeName(grades.find(g=>g['الرقم']==Number(e.target.value))?.['الصف الدراسى']||''); }} style={inputStyle}>
                 <option value="">الصف</option>
                 {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
               </select>
               <select value={selectedClassName} onChange={e => setSelectedClassName(e.target.value)} style={inputStyle} disabled={!selectedGradeName}>
                 <option value="">الفصل</option>
                 {classes.map(c => <option key={c['الرقم']} value={c['الفصل']}>{c['الفصل']}</option>)}
               </select>
               <input list="studs" value={selectedStudentName} onChange={e => { setSelectedStudentName(e.target.value); setSelectedStudentId(students.find(s=>s.ArbStudName===e.target.value)?.StudentID||null); }} style={inputStyle} placeholder="الطالب" />
               <datalist id="studs">{students.map(s=><option key={s.StudentID} value={s.ArbStudName}/>)}</datalist>
            </div>
            <button onClick={handleSearchByName} disabled={loading} style={{...btnStyle, background:'#0284c7', height:'42px'}}>بحث</button>
          </div>
        ) : (
          <div style={{display:'flex', gap:'10px', alignItems:'flex-end'}}>
            <div style={{flex:1}}>
              <label>التاريخ</label>
              <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleSearchByDate} disabled={loading} style={{...btnStyle, background:'#0284c7', height:'42px'}}>بحث</button>
          </div>
        )}
      </div>

      {/* Results Table */}
      {searched && (
        <div style={cardStyle}>
          <h3>النتائج ({results.length})</h3>
          {results.length > 0 ? (
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead style={{background:'#f1f5f9'}}>
                <tr>
                  <th style={th}>م</th><th style={th}>الطالب</th><th style={th}>الصف</th><th style={th}>التاريخ</th><th style={th}>الوقت</th><th style={th}>السبب</th><th style={th}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{r['عدد الاذون'] || i+1}</td>
                    <td style={td}>{r['اسم الطالب']}</td>
                    <td style={td}>{r['الصف']}</td>
                    <td style={td}>{r['تاريخ الاذن']?.split('T')[0]}</td>
                    <td style={td}>{r['وقت الخروج']}</td>
                    <td style={td}>{r['سبب الاذن']}</td>
                    <td style={td}>
                      <button onClick={() => openEditModal(r)} style={{...btnStyle, background:'#3b82f6', padding:'5px 10px', fontSize:'12px'}}>✏️</button>
                      {/* ✅ تم التصحيح: استخدام r.StudentID */}
                      <button onClick={() => handleDelete(r['الرقم'], r.StudentID)} style={{...btnStyle, background:'#ef4444', padding:'5px 10px', fontSize:'12px', marginRight:'5px'}}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{textAlign:'center', color:'#64748b'}}>لا توجد نتائج</div>}
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center'}} onClick={()=>setIsEditOpen(false)}>
          <div style={{background:'white', padding:'30px', borderRadius:'15px', width:'400px'}} onClick={e=>e.stopPropagation()}>
            <h3>تعديل الإذن</h3>
            <div style={{marginBottom:'10px'}}>
              <label>التاريخ</label>
              <input type="date" value={editData.EzenStudDate} onChange={e=>setEditData({...editData, EzenStudDate:e.target.value})} style={inputStyle} />
            </div>
            <div style={{marginBottom:'10px'}}>
              <label>الوقت</label>
              <input type="time" value={editData.EzenStudTime?.substring(0,5)} onChange={e=>setEditData({...editData, EzenStudTime: e.target.value+':00'})} style={inputStyle} />
            </div>
            <div style={{marginBottom:'10px'}}>
              <label>السبب</label>
              <input value={editData.EzenStudSabb} onChange={e=>setEditData({...editData, EzenStudSabb:e.target.value})} style={inputStyle} />
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
              <button onClick={()=>setIsEditOpen(false)} style={{...btnStyle, background:'#e5e7eb', color:'#111'}}>إلغاء</button>
              <button onClick={handleUpdate} disabled={saving} style={{...btnStyle, background:'#0284c7'}}>{saving?'جاري...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding:'10px', textAlign:'right', borderBottom:'1px solid #e2e8f0' };
const td: React.CSSProperties = { padding:'10px', borderBottom:'1px solid #f1f5f9', fontSize:'14px' };