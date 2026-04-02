'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Committee {
    "الرقم": number;
    "اللجنة": string;
    "المدرسة": string;
    "SchoolID": number;
}

export default function CommitteesControlPage() {
  // ✅ 1. جلب بيانات المدرسة المحفوظة زي صفحة التوزيع
  const { user, work } = useAuthStore();
 const schoolId = user?.schoolId || 0;
  const schoolName = user?.schoolName || 'المدرسة الحالية';
  
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [nextId, setNextId] = useState(0); // الرقم التسلسلي
  const [committeeName, setCommitteeName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // === 2. جلب الرقم التسلسلي (INPOT 57) ===
  useEffect(() => {
    let isMounted = true; 
    const fetchId = async () => {
      try {
        // هنستخدم endpoint /api/getData/57 اللي بيجيب آخر رقم + 1
        const res = await fetch(`${API_URL}/api/getData/57`);
        const json = await res.json();
        if (isMounted && json.success && json.data?.[0]) {
            // الـ Procedure غالباً بيرجع عمود واحد زي "الرقم" أو بدون اسم
            const id = Object.values(json.data[0])[0];
            setNextId(Number(id) || 0);
        }
      } catch (e) { if (isMounted) console.error(e); }
    };
    fetchId();
    return () => { isMounted = false; };
  }, []);

  // === 3. جلب اللجان الموجودة (INPOT 25) ===
  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;
    const fetchCommittees = async () => {
        setLoading(true);
        try {
            // تعديل الرابط ليكون getData1/25?id=schoolId
            const res = await fetch(`${API_URL}/api/getData1/25?id=${schoolId}`);
            const json = await res.json();
            if (isMounted) {
                if (json.success && json.data) setCommittees(json.data);
                else setCommittees([]);
            }
        } catch (e) { if (isMounted) console.error(e); } 
        finally { if (isMounted) setLoading(false); }
    };
    fetchCommittees();
    return () => { isMounted = false; };
  }, [schoolId]);

  // === 4. الحفظ والتعديل ===
  const handleSubmit = async () => {
    if (!committeeName) return alert('اكتب اسم اللجنة');
    if (!schoolId) return alert('لا توجد مدرسة محددة');

    setSaving(true);
    try {
        const operation = editingId ? 17 : 16; // 16 إضافة، 17 تعديل
        const idToSend = editingId || nextId;

        const res = await fetch(`${API_URL}/api/saveWithParent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: idToSend,           //sch1
                parentId: schoolId,     //sch2 (رقم المدرسة)
                name: committeeName,    //sch3
                operation: operation    //INPOT
            })
        });

        const data = await res.json();
        if (data.success) {
            alert(`✅ تم ${editingId ? 'التعديل' : 'الإضافة'} بنجاح`);
            
            if (!editingId) {
                // إضافة العنصر الجديد في اللأئحة
                setCommittees(prev => [...prev, { 
                    "الرقم": nextId, 
                    "اللجنة": committeeName, 
                    "المدرسة": schoolName, 
                    "SchoolID": schoolId 
                }]);
                // زيادة الرقم التسلسلي محلياً
                setNextId(prev => prev + 1);
            } else {
                // تعديل العنصر الحالي
                setCommittees(prev => prev.map(c => c['الرقم'] === editingId ? {...c, "اللجنة": committeeName} : c));
            }

            // إعادة تهيئة الفورم
            setCommitteeName('');
            setEditingId(null);
        } else { alert('فشل العملية: ' + data.error); }
    } catch (e) { alert('خطأ في الاتصال'); } 
    finally { setSaving(false); }
  };

  const handleEdit = (committee: Committee) => {
      setEditingId(committee['الرقم']);
      setCommitteeName(committee['اللجنة']);
  };

  const handleDelete = async (id: number) => {
      if (!confirm('هل تريد حذف هذه اللجنة؟')) return;
      try {
          // عملية الحذف 18
          const res = await fetch(`${API_URL}/api/saveWithParent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, operation: 18 })
          });
          const data = await res.json();
          if (data.success) {
              alert('تم الحذف');
              setCommittees(prev => prev.filter(c => c['الرقم'] !== id));
          } else { alert('فشل الحذف'); }
      } catch(e) { alert('خطأ'); }
  };

  // === Styles (Fire Theme 🔥) ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '900px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: 'linear-gradient(to bottom, #fff7ed, #ffffff)', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #f97316, #dc2626)', color: 'white', padding: '40px 30px', borderRadius: '25px', marginBottom: '30px', boxShadow: '0 15px 30px rgba(249, 115, 22, 0.4)', textAlign: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.08)', marginBottom: '25px', border: '1px solid #ffedd5' };
  const inputStyle: React.CSSProperties = { padding: '12px 15px', borderRadius: '10px', border: '2px solid #fdba74', width: '100%', outline: 'none', fontSize: '15px' };
  const readonlyStyle: React.CSSProperties = { ...inputStyle, background: '#f8fafc', color: '#64748b', fontWeight: 'bold' };
  const btnPrimary: React.CSSProperties = { padding: '12px 30px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', color: 'white', background: 'linear-gradient(to right, #f97316, #ea580c)', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' };
  const btnSecondary: React.CSSProperties = { ...btnPrimary, background: '#f1f5f9', color: '#475569', boxShadow: 'none' };
  const tableTh: React.CSSProperties = { padding: '12px', borderBottom: '2px solid #ffedd5', color: '#9a3412', fontWeight: 'bold', fontSize: '14px', textAlign: 'right' };
  const tableTd: React.CSSProperties = { padding: '12px', borderBottom: '1px solid #fff7ed', fontSize: '14px' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{margin:0, fontSize:'30px'}}>🔥 التحكم في اللجان</h1>
        <p style={{margin:'8px 0 0', opacity:0.9}}>المدرسة: <strong>{schoolName}</strong></p>
      </div>

      {/* Form Card */}
      <div style={cardStyle}>
        <h3 style={{marginTop:0, marginBottom:'20px', color:'#ea580c'}}>
            {editingId ? `✏️ تعديل لجنة رقم (${editingId})` : '➕ إضافة لجنة جديدة'}
        </h3>

        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'15px', marginBottom:'20px'}}>
            {/* خانة الرقم التسلسلي */}
            <div>
                <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>رقم اللجنة (تسلسلي)</label>
                <input 
                    type="number" 
                    value={nextId} 
                    readOnly 
                    style={readonlyStyle} 
                />
            </div>
            {/* خانة اسم اللجنة */}
            <div>
                <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>اسم اللجنة</label>
                <input 
                    type="text" 
                    value={committeeName} 
                    onChange={e => setCommitteeName(e.target.value)} 
                    placeholder="مثال: لجنة الانضباط" 
                    style={inputStyle} 
                />
            </div>
        </div>
        
        {/* عرض اسم المدرسة للتأكيد (مقروء فقط) */}
        <div style={{marginBottom:'20px'}}>
            <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>تابعة لمدرسة</label>
            <input type="text" value={schoolName} readOnly style={{...inputStyle, background:'#fff7ed', borderColor:'#fdba74'}} />
        </div>

        <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
            {editingId && <button onClick={() => { setEditingId(null); setCommitteeName(''); }} style={btnSecondary}>إلغاء التعديل</button>}
            <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>
                {saving ? 'جاري الحفظ...' : (editingId ? '💾 حفظ التعديل' : '➕ إضافة اللجنة')}
            </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <h3 style={{marginTop:0, marginBottom:'15px', color:'#9a3412'}}>📋 اللجان المسجلة ({committees.length})</h3>
        
        {loading ? <div style={{textAlign:'center', padding:'20px'}}>جاري التحميل...</div> : (
            committees.length > 0 ? (
                <table style={{width:'100%', borderCollapse:'collapse'}}>

<thead>
<tr>
<th style={tableTh}>الرقم</th>
<th style={tableTh}>اسم اللجنة</th>
<th style={tableTh}>المدرسة</th>
<th style={tableTh}>إجراءات</th>
</tr>
</thead>

<tbody>
{committees.map((c, i) => (
<tr
key={i}
style={{transition:'background 0.2s'}}
onMouseEnter={e => e.currentTarget.style.background='#fff7ed'}
onMouseLeave={e => e.currentTarget.style.background='transparent'}
>

<td style={{...tableTd, fontWeight:'bold', color:'#64748b'}}>
{c['الرقم']}
</td>

<td style={{...tableTd, fontWeight:'bold', color:'#c2410c'}}>
{c['اللجنة']}
</td>

<td style={tableTd}>
{c['المدرسة']}
</td>

<td style={tableTd}>
<button
onClick={() => handleEdit(c)}
style={{...btnPrimary, padding:'5px 12px', fontSize:'12px', background:'#fdba74', color:'#9a3412'}}
>
✏️
</button>

<button
onClick={() => handleDelete(c['الرقم'])}
style={{...btnPrimary, padding:'5px 12px', fontSize:'12px', marginRight:'5px', background:'#fca5a5'}}
>
🗑️
</button>
</td>

</tr>
))}
</tbody>

</table>
            ) : <div style={{textAlign:'center', color:'#d1d5db', padding:'30px'}}>لا توجد لجان مسجلة لهذه المدرسة.</div>
        )}
      </div>
    </div>
  );
}