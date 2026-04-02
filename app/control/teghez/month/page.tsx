'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Month {
    "الرقم": number;
    "التيرم": string;
    "شهر الاختبار": string;
}

interface Term {
    "الرقم": number;
    "التيرم": string;
}

export default function MonthsControlPage() {
  // ✅ جلب البيانات الأساسية
  const { work, user } = useAuthStore();
  const yearId = work?.yearId || 0;
  const yearName = work?.yearName || 'العام الحالي';
  const schoolId = user?.schoolId || 0;

  const [months, setMonths] = useState<Month[]>([]);
  const [terms, setTerms] = useState<Term[]>([]); // لتخزين التيرمات في القائمة المنسدلة
  const [loading, setLoading] = useState(false);

  // Form State
  const [nextId, setNextId] = useState(0);
  const [monthName, setMonthName] = useState('');
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null); // لتخزين التيرم المختار
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // === 1. جلب الرقم التسلسلي (INPOT 62) ===
  useEffect(() => {
    let isMounted = true; 
    const fetchId = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData/62`); // الرقم 62 للشهور
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

  // === 2. جلب التيرمات للقائمة المنسدلة (INPOT 22) ===
  useEffect(() => {
    if (!yearId || !schoolId) return;
    let isMounted = true;
    const fetchTerms = async () => {
        try {
            const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
            const json = await res.json();
            if (isMounted && json.success && json.data) {
                setTerms(json.data);
            }
        } catch (e) { if (isMounted) console.error(e); }
    };
    fetchTerms();
    return () => { isMounted = false; };
  }, [yearId, schoolId]);

  // === 3. جلب الشهور الموجودة (INPOT 27) ===
  useEffect(() => {
    if (!yearId || !schoolId) return;
    let isMounted = true;
    const fetchMonths = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=27`);
            const json = await res.json();
            if (isMounted) {
                if (json.success && json.data) setMonths(json.data);
                else setMonths([]);
            }
        } catch (e) { if (isMounted) console.error(e); } 
        finally { if (isMounted) setLoading(false); }
    };
    fetchMonths();
    return () => { isMounted = false; };
  }, [yearId, schoolId]);

  // === 4. الحفظ والتعديل ===
  const handleSubmit = async () => {
    if (!monthName) return alert('اكتب اسم الشهر');
    if (!selectedTermId) return alert('اختر التيرم التابع له الشهر');

    setSaving(true);
    try {
        // تعديل (20) أو إضافة (19)
        const operation = editingId ? 20 : 19;
        const idToSend = editingId || nextId;

        // ✅ توحيد أسماء المفاتيح كما في صفحة اللجان والتيرمات
        const res = await fetch(`${API_URL}/api/saveWithParent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: idToSend,           // MonesID
                parentId: selectedTermId, // TiremID
                name: monthName,        // MonseNam
                operation: operation    // INPOT
            })
        });

        const data = await res.json();
        if (data.success) {
            alert(`✅ تم ${editingId ? 'التعديل' : 'الإضافة'} بنجاح`);
            
            // تحديث العرض محلياً
            const termObj = terms.find(t => t['الرقم'] === selectedTermId);
            const termName = termObj ? termObj['التيرم'] : '';

            if (!editingId) {
                // حالة الإضافة
                setMonths(prev => [...prev, { 
                    "الرقم": nextId, 
                    "التيرم": termName, 
                    "شهر الاختبار": monthName 
                }]);
                setNextId(prev => prev + 1);
            } else {
                // حالة التعديل
                setMonths(prev => prev.map(m => m['الرقم'] === editingId ? {
                    ...m, 
                    "شهر الاختبار": monthName,
                    "التيرم": termName // في حالة تم تغيير التيرم
                } : m));
            }

            // إعادة تهيئة الفورم
            setMonthName('');
            setEditingId(null);
            setSelectedTermId(null);
        } else { alert('فشل العملية: ' + data.error); }
    } catch (e) { alert('خطأ في الاتصال'); } 
    finally { setSaving(false); }
  };

  const handleEdit = (month: Month) => {
      setEditingId(month['الرقم']);
      setMonthName(month['شهر الاختبار']);
      // نبحث عن رقم التيرم بناءً على اسمه لتحديد القيمة في القائمة المنسدلة
      const foundTerm = terms.find(t => t['التيرم'] === month['التيرم']);
      if (foundTerm) setSelectedTermId(foundTerm['الرقم']);
  };

  const handleDelete = async (id: number) => {
      if (!confirm('هل تريد حذف هذا الشهر؟')) return;
      try {
          const res = await fetch(`${API_URL}/api/saveWithParent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, operation: 21 }) // INPOT 21 للحذف
          });
          const data = await res.json();
          if (data.success) {
              alert('تم الحذف');
              setMonths(prev => prev.filter(m => m['الرقم'] !== id));
          } else { alert('فشل الحذف'); }
      } catch(e) { alert('خطأ'); }
  };

  // === Styles (Fire Theme 🔥) ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '900px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: 'linear-gradient(to bottom, #fff7ed, #ffffff)', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #f97316, #dc2626)', color: 'white', padding: '40px 30px', borderRadius: '25px', marginBottom: '30px', boxShadow: '0 15px 30px rgba(249, 115, 22, 0.4)', textAlign: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 5px 20px rgba(0,0,0,0.08)', marginBottom: '25px', border: '1px solid #ffedd5' };
  const inputStyle: React.CSSProperties = { padding: '12px 15px', borderRadius: '10px', border: '2px solid #fdba74', width: '100%', outline: 'none', fontSize: '15px' };
  const readonlyStyle: React.CSSProperties = { ...inputStyle, background: '#f8fafc', color: '#64748b', fontWeight: 'bold' };
  const selectStyle: React.CSSProperties = { ...inputStyle, backgroundColor: 'white' };
  const btnPrimary: React.CSSProperties = { padding: '12px 30px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', color: 'white', background: 'linear-gradient(to right, #f97316, #ea580c)', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' };
  const btnSecondary: React.CSSProperties = { ...btnPrimary, background: '#f1f5f9', color: '#475569', boxShadow: 'none' };
  const tableTh: React.CSSProperties = { padding: '12px', borderBottom: '2px solid #ffedd5', color: '#9a3412', fontWeight: 'bold', fontSize: '14px', textAlign: 'right' };
  const tableTd: React.CSSProperties = { padding: '12px', borderBottom: '1px solid #fff7ed', fontSize: '14px' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{margin:0, fontSize:'30px'}}>📅 التحكم في الشهور</h1>
        <p style={{margin:'8px 0 0', opacity:0.9}}>عام: <strong>{yearName}</strong></p>
      </div>

      {/* Form Card */}
      <div style={cardStyle}>
        <h3 style={{marginTop:0, marginBottom:'20px', color:'#ea580c'}}>
            {editingId ? `✏️ تعديل شهر رقم (${editingId})` : '➕ إضافة شهر جديد'}
        </h3>

        {/* صف يحتوي على الرقم واسم الشهر */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'15px', marginBottom:'20px'}}>
            <div>
                <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>رقم الشهر (تسلسلي)</label>
                <input 
                    type="number" 
                    value={nextId} 
                    readOnly 
                    style={readonlyStyle} 
                />
            </div>
            <div>
                <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>اسم الشهر</label>
                <input 
                    type="text" 
                    value={monthName} 
                    onChange={e => setMonthName(e.target.value)} 
                    placeholder="مثال: شهر أكتوبر" 
                    style={inputStyle} 
                />
            </div>
        </div>

        {/* اختيار التيرم */}
        <div style={{marginBottom:'20px'}}>
            <label style={{display:'block', marginBottom:'8px', fontWeight:'bold', color:'#4b5563'}}>تابع لتيرم</label>
            <select 
                value={selectedTermId || ''} 
                onChange={e => setSelectedTermId(Number(e.target.value))} 
                style={selectStyle}
            >
                <option value="" disabled>اختر التيرم</option>
                {terms.map(t => (
                    <option key={t['الرقم']} value={t['الرقم']}>
                        {t['التيرم']}
                    </option>
                ))}
            </select>
        </div>

        <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
            {editingId && <button onClick={() => { setEditingId(null); setMonthName(''); setSelectedTermId(null); }} style={btnSecondary}>إلغاء التعديل</button>}
            <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>
                {saving ? 'جاري الحفظ...' : (editingId ? '💾 حفظ التعديل' : '➕ إضافة الشهر')}
            </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <h3 style={{marginTop:0, marginBottom:'15px', color:'#9a3412'}}>📋 الشهور المسجلة ({months.length})</h3>
        
        {loading ? <div style={{textAlign:'center', padding:'20px'}}>جاري التحميل...</div> : (
            months.length > 0 ? (
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                        <tr>
                            <th style={tableTh}>الرقم</th>
                            <th style={tableTh}>اسم الشهر</th>
                            <th style={tableTh}>التيرم</th>
                            <th style={tableTh}>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {months.map((m, i) => (
                            <tr key={i} style={{transition:'background 0.2s'}} onMouseEnter={e => e.currentTarget.style.background='#fff7ed'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                <td style={{...tableTd, fontWeight:'bold', color:'#64748b'}}>{m['الرقم']}</td>
                                <td style={{...tableTd, fontWeight:'bold', color:'#c2410c'}}>{m['شهر الاختبار']}</td>
                                <td style={tableTd}>{m['التيرم']}</td>
                                <td style={tableTd}>
                                    <button onClick={() => handleEdit(m)} style={{...btnPrimary, padding:'5px 12px', fontSize:'12px', background:'#fdba74', color:'#9a3412'}}>✏️</button>
                                    <button onClick={() => handleDelete(m['الرقم'])} style={{...btnPrimary, padding:'5px 12px', fontSize:'12px', marginRight:'5px', background:'#fca5a5'}}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <div style={{textAlign:'center', color:'#d1d5db', padding:'30px'}}>لا توجد شهور مسجلة لهذا العام.</div>
        )}
      </div>
    </div>
  );
}