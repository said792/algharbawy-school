'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Term { "الرقم": number; "التيرم": string; }
interface Teacher { id: number; name: string; }
interface DistributionRow {
    "التاريخ": string;
    "الفترة": string;
    "المادة": string;
    "اللجنة": string;
    "الملاحظ1": string;
    "الملاحظ2": string;
}

export default function TeacherDistributionViewPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId || 0;
  const yearId = work?.yearId || 0;

  const [terms, setTerms] = useState<Term[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionRow[]>([]);
  
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  
  const [loading, setLoading] = useState(false);

  // === 1. جلب التيرمات والمعلمين (لحساب المريحين) ===
  useEffect(() => {
    const fetchInitial = async () => {
        // جلب التيرمات
        const resTerms = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
        const jsonTerms = await resTerms.json();
        if (jsonTerms.success) setTerms(jsonTerms.data);

        // جلب كل المعلمين (INPOT 46)
        const resTeachers = await fetch(`${API_URL}/api/getData1/46?id=${schoolId}`);
        const jsonTeachers = await resTeachers.json();
        if (jsonTeachers.success) {
            setAllTeachers(jsonTeachers.data.map((t: any) => ({
                id: t['الرقم'],
                name: t['الاسم بالعربى']
            })));
        }
    };
    if (schoolId) fetchInitial();
  }, [schoolId]);

  // === 2. جلب بيانات التوزيع عند اختيار التيرم ===
  useEffect(() => {
    if (!selectedTermId) return;
    
    const fetchData = async () => {
        setLoading(true);
        const termObj = terms.find(t => t['الرقم'] === selectedTermId);
        
        // استخدام Endpoint الموجود (search/complex) أو اللي أنشأناه
        const res = await fetch(`${API_URL}/api/search/complex?sch1=${schoolId}&sch2=${yearId}&sch3=${termObj?.['التيرم'] || ''}&inpout=8`);
        const json = await res.json();
        
        if (json.success) {
            setDistributionData(json.data);
        } else {
            setDistributionData([]);
        }
        setLoading(false);
    };
    fetchData();
  }, [selectedTermId]);

  // === 3. الفلترة (Memoized) ===
  const filteredData = useMemo(() => {
      return distributionData.filter(row => {
          const matchDate = selectedDate ? row["التاريخ"]?.split('T')[0] === selectedDate : true;
          const matchPeriod = selectedPeriod ? row["الفترة"] === selectedPeriod : true;
          return matchDate && matchPeriod;
      });
  }, [distributionData, selectedDate, selectedPeriod]);

  // === 4. حساب المريحين (Resting Teachers) ===
  const restingTeachers = useMemo(() => {
      // لو مفيش تاريخ مختار، مفيش حاجة نحسبها
      if (!selectedDate) return []; 

      // استخراج أسماء اللي شغالين في التاريخ والفترة دي
      const workingNames = new Set<string>();
      filteredData.forEach(row => {
          if (row["الملاحظ1"]) workingNames.add(row["الملاحظ1"]);
          if (row["الملاحظ2"]) workingNames.add(row["الملاحظ2"]);
      });

      // مقارنة بقائمة كل المعلمين
      return allTeachers.filter(t => !workingNames.has(t.name));

  }, [filteredData, allTeachers, selectedDate]);

  // === 5. تصدير للإكسل ===
  const exportToExcel = () => {
      if (filteredData.length === 0) return alert('لا توجد بيانات للتصدير');
      
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Arabic support
      // Headers
      csvContent += "التاريخ,الفترة,المادة,اللجنة,الملاحظ الأول,الملاحظ الثاني\n";
      
      // Rows
      filteredData.forEach(row => {
          const date = new Date(row["التاريخ"]).toLocaleDateString('ar-EG');
          csvContent += `${date},${row["الفترة"]},${row["المادة"]},${row["اللجنة"]},${row["الملاحظ1"]},${row["الملاحظ2"]}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "توزيع_الملاحظين.csv");
      document.body.appendChild(link);
      link.click();
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0f766e, #14b8a6)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(15, 118, 110, 0.4)' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '20px', border: '1px solid #ccfbf1' };
  const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' };
  const thStyle: React.CSSProperties = { padding: '12px', borderBottom: '2px solid #ccfbf1', color: '#0f766e', fontWeight: 'bold', textAlign: 'center' };
  const tdStyle: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
                <h1 style={{margin:0, fontSize:'28px'}}>📋 عرض توزيع الملاحظين</h1>
                <p style={{margin:'5px 0 0', opacity:0.9}}>عرض وتقرير شامل للتوزيع</p>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
                {/* ✅ تم إزالة زر الطباعة */}
                <button onClick={exportToExcel} style={{...btnPrimary, background: '#16a34a'}}>📊 إكسل</button>
            </div>
        </div>
      </div>

      {/* Filters */}
      <div style={cardStyle} className="no-print">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
                <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>التيرم</label>
                <select value={selectedTermId || ''} onChange={e => setSelectedTermId(Number(e.target.value))} style={{padding:'8px', width:'100%', borderRadius:'6px', border:'1px solid #ccc'}}>
                    <option value="">اختر التيرم</option>
                    {terms.map(t => <option key={t['الرقم']} value={t['الرقم']}>{t['التيرم']}</option>)}
                </select>
            </div>
            <div>
                <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>التاريخ</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{padding:'8px', width:'100%', borderRadius:'6px', border:'1px solid #ccc'}} />
            </div>
            <div>
                <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>الفترة</label>
                <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} style={{padding:'8px', width:'100%', borderRadius:'6px', border:'1px solid #ccc'}}>
                    <option value="">الكل</option>
                    <option value="الفترة الاولى">الفترة الاولى</option>
                    <option value="الفترة الثانية">الفترة الثانية</option>
                </select>
            </div>
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle} id="printableArea">
        {loading ? <div style={{textAlign:'center'}}>جاري التحميل...</div> : (
            <>
            <h3 style={{marginTop:0, color:'#0f766e'}}>عدد اللجان المعروضة: {filteredData.length}</h3>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={thStyle}>م</th>
                            <th style={thStyle}>التاريخ</th>
                            <th style={thStyle}>الفترة</th>
                            <th style={thStyle}>المادة</th>
                            <th style={thStyle}>اللجنة</th>
                            <th style={thStyle}>الملاحظ الأول</th>
                            <th style={thStyle}>الملاحظ الثاني</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, idx) => (
                            <tr key={idx}>
                                <td style={tdStyle}>{idx + 1}</td>
                                <td style={tdStyle}>{new Date(row["التاريخ"]).toLocaleDateString('ar-EG')}</td>
                                <td style={tdStyle}>{row["الفترة"]}</td>
                                <td style={tdStyle}>{row["المادة"]}</td>
                                <td style={{...tdStyle, fontWeight:'bold'}}>{row["اللجنة"]}</td>
                                <td style={{...tdStyle, color:'#0f766e'}}>{row["الملاحظ1"]}</td>
                                <td style={{...tdStyle, color:'#0f766e'}}>{row["الملاحظ2"]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && !loading && <p style={{textAlign:'center', color:'#94a3b8', marginTop:'20px'}}>لا توجد بيانات لهذه الفلاتر</p>}
            </div>
            </>
        )}
      </div>

      {/* Resting Teachers Section (المريحين) */}
      {selectedDate && restingTeachers.length > 0 && (
          <div style={{...cardStyle, background: '#fff7ed', border: '1px solid #ffedd5'}}>
              <h3 style={{marginTop:0, color: '#ea580c', display:'flex', alignItems:'center', gap:'10px'}}>
                  <span>☕</span> المعلمون المريحون ({restingTeachers.length})
              </h3>
              <p style={{fontSize: '13px', color: '#9a3412', marginBottom: '10px'}}>
                  المعلمون الذين ليس لديهم مهمة في تاريخ <strong>{new Date(selectedDate).toLocaleDateString('ar-EG')}</strong> 
                  {selectedPeriod && ` وفترة ${selectedPeriod}`}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {restingTeachers.map(t => (
                      <span key={t.id} style={{
                          background: 'white', 
                          padding: '6px 15px', 
                          borderRadius: '20px', 
                          border: '1px solid #fed7aa',
                          fontSize: '14px',
                          color: '#9a3412'
                      }}>
                          {t.name}
                      </span>
                  ))}
              </div>
          </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            #printableArea { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}