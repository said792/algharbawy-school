'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Term {
    "الرقم": number; 
    "العام الدراسى": string;
    "التيرم": string;
}

export default function TermsControlPage() {
  // ✅ جلب البيانات من الـ Store
  const { work, user } = useAuthStore();
  const yearId = work?.yearId || 0;
  const yearName = work?.yearName || 'العام الحالي';
  const schoolId = user?.schoolId || 0; // جلب رقم المدرسة لاستخدامه في الفلترة

  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [nextId, setNextId] = useState(0);
  const [termName, setTermName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // === 1. جلب الرقم التسلسلي (INPOT 54) ===
  useEffect(() => {
    let isMounted = true; 
    const fetchId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/54`);
        const json = await res.json();
        if (isMounted && json.success && json.data?.[0]) {
            const id = Object.values(json.data[0])[0];
            setNextId(Number(id) || 0);
        }
      } catch (e) { if (isMounted) console.error(e); }
    };
    fetchId();
    return () => { isMounted = false; };
  }, []);

  // === 2. جلب التيرمات الموجودة (INPOT 22) ===
  useEffect(() => {
    if (!yearId || !schoolId) return;
    let isMounted = true;
    const fetchTerms = async () => {
        setLoading(true);
        try {
            // استخدام نفس نقطة النهاية (leaves/data) للتوافق مع الفلترة
            const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
            const json = await res.json();
            if (isMounted) {
                if (json.success && json.data) setTerms(json.data);
                else setTerms([]);
            }
        } catch (e) { if (isMounted) console.error(e); } 
        finally { if (isMounted) setLoading(false); }
    };
    fetchTerms();
    return () => { isMounted = false; };
  }, [yearId, schoolId]);

  // === 3. الحفظ والتعديل ===
  const handleSubmit = async () => {
    if (!termName) return alert('اكتب اسم التيرم');
    if (!yearId) return alert('لا يوجد عام دراسي محدد');

    setSaving(true);
    try {
        // أرقام العمليات: 13 (إضافة), 14 (تعديل), 15 (حذف)
        const operation = editingId ? 14 : 13;
        const idToSend = editingId || nextId;

        // ✅ توحيد أسماء المفاتيح كما في صفحة اللجان
        const res = await fetch(`${API_URL}/api/saveWithParent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: idToSend,         // TiremID
                parentId: yearId,     // YerID
                name: termName,       // TiremNam
                operation: operation  // INPOT
            })
        });

        const data = await res.json();
        if (data.success) {
            alert(`✅ تم ${editingId ? 'التعديل' : 'الإضافة'} بنجاح`);
            
            if (!editingId) {
                setTerms(prev => [...prev, { "الرقم": nextId, "العام الدراسى": yearName, "التيرم": termName }]);
                setNextId(prev => prev + 1);
            } else {
                setTerms(prev => prev.map(t => t['الرقم'] === editingId ? {...t, "التيرم": termName} : t));
            }

            setTermName('');
            setEditingId(null);
        } else { alert('فشل العملية: ' + data.error); }
    } catch (e) { alert('خطأ في الاتصال'); } 
    finally { setSaving(false); }
  };

  const handleEdit = (term: Term) => {
      setEditingId(term['الرقم']);
      setTermName(term['التيرم']);
  };

  const handleDelete = async (id: number) => {
      if (!confirm('هل تريد حذف هذا التيرم؟')) return;
      try {
          const res = await fetch(`${API_URL}/api/saveWithParent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, operation: 15 }) // 15 = حذف
          });
          const data = await res.json();
          if (data.success) {
              alert('تم الحذف');
              setTerms(prev => prev.filter(t => t['الرقم'] !== id));
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
        <h1 style={{margin:0, fontSize:'30px'}}>🔥 التحكم في التيرمات</h1>
        <p style={{margin:'8px 0 0', opacity:0.9}}>عام: <strong>{yearName}</strong></p>
      </div>

      {/* Form Card */}
      <div style={cardStyle}>
        <h3 style={{marginTop:0, marginBottom:'20px', color:'#ea580c'}}>
            {editingId ? `✏️ تعديل تيرم رقم (${editingId})` : '➕ إضافة تيرم جديد'}
        </h3>

        {/* صف يحتوي على الرقم والاسم */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'15px', marginBottom:'20px'}}>
            <div>
                <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>رقم التيرم (تسلسلي)</label>
                <input 
                    type="number" 
                    value={nextId} 
                    readOnly 
                    style={readonlyStyle} 
                />
            </div>
            <div>
                <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>اسم التيرم</label>
                <input 
                    type="text" 
                    value={termName} 
                    onChange={e => setTermName(e.target.value)} 
                    placeholder="مثال: التيرم الأول" 
                    style={inputStyle} 
                />
            </div>
        </div>

        {/* عرض اسم العام الدراسي للتأكيد */}
        <div style={{marginBottom:'20px'}}>
            <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>تابع لعام دراسي</label>
            <input type="text" value={yearName} readOnly style={{...inputStyle, background:'#fff7ed', borderColor:'#fdba74'}} />
        </div>

        <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
            {editingId && <button onClick={() => { setEditingId(null); setTermName(''); }} style={btnSecondary}>إلغاء التعديل</button>}
            <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>
                {saving ? 'جاري الحفظ...' : (editingId ? '💾 حفظ التعديل' : '➕ إضافة التيرم')}
            </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <h3 style={{marginTop:0, marginBottom:'15px', color:'#9a3412'}}>📋 التيرمات المسجلة ({terms.length})</h3>
        
        {loading ? <div style={{textAlign:'center', padding:'20px'}}>جاري التحميل...</div> : (
            terms.length > 0 ? (
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                        <tr>
                            <th style={tableTh}>الرقم</th>
                            <th style={tableTh}>اسم التيرم</th>
                            <th style={tableTh}>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {terms.map((t, i) => (
                            <tr key={i} style={{transition:'background 0.2s'}} onMouseEnter={e => e.currentTarget.style.background='#fff7ed'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                <td style={{...tableTd, fontWeight:'bold', color:'#64748b'}}>{t['الرقم']}</td>
                                <td style={{...tableTd, fontWeight:'bold', color:'#c2410c'}}>{t['التيرم']}</td>
                                <td style={tableTd}>
                                    <button onClick={() => handleEdit(t)} style={{...btnPrimary, padding:'5px 12px', fontSize:'12px', background:'#fdba74', color:'#9a3412'}}>✏️</button>
                                    <button onClick={() => handleDelete(t['الرقم'])} style={{...btnPrimary, padding:'5px 12px', fontSize:'12px', marginRight:'5px', background:'#fca5a5'}}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <div style={{textAlign:'center', color:'#d1d5db', padding:'30px'}}>لا توجد تيرمات لهذا العام.</div>
        )}
      </div>
    </div>
  );
}