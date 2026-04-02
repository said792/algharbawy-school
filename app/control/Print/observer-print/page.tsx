'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Term { "الرقم": number; "التيرم": string; }
interface Teacher { id: number; name: string; job: string; }
interface DistributionRow {
    "التاريخ": string;
    "الفترة": string;
    "المادة": string;
    "اللجنة": string;
    "عدد الطلاب": number;
    "من رقم الجلوس": number;
    "إلى رقم جلوس": number;
    "الملاحظ1": string;
    "الملاحظ2": string;
}

interface SchoolInfo {
    SchoolNam: string;
    ModriaNam: string;
    EdaraNam: string;
    Logo: string;
}

export default function TeacherDistributionViewPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId || 0;
  const schoolName = user?.schoolName || '';
  const yearId = work?.yearId || 0;

  const [terms, setTerms] = useState<Term[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionRow[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  
  const [loading, setLoading] = useState(false);

  // === Helper: تحويل اللوجو ===
  const parseLogo = (rawData: any): string => {
    if (!rawData) return '';
    if (typeof rawData === 'object' && rawData.type === 'Buffer' && Array.isArray(rawData.data)) {
        const bytes = new Uint8Array(rawData.data);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return `data:image/png;base64,${window.btoa(binary)}`;
    }
    if (typeof rawData === 'string' && rawData.startsWith('data:image')) return rawData;
    return '';
  };

  // === 1. جلب البيانات الأولية (التيرمات والمعلمين) ===
  useEffect(() => {
    const fetchInitial = async () => {
        const resTerms = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
        const jsonTerms = await resTerms.json();
        if (jsonTerms.success) setTerms(jsonTerms.data);

        const resTeachers = await fetch(`${API_URL}/api/getData1/46?id=${schoolId}`);
        const jsonTeachers = await resTeachers.json();
        if (jsonTeachers.success) {
            setAllTeachers(jsonTeachers.data.map((t: any) => ({
                id: t['الرقم'],
                name: t['الاسم بالعربى'],
                job: t['العمل المكلف به'] || ''
            })));
        }
    };
    if (schoolId) fetchInitial();
  }, [schoolId, yearId]);

  // === 2. جلب معلومات المدرسة (اللوجو) - بالطريقة الصحيحة المطلوبة ===
  useEffect(() => {
    const fetchSchoolInfo = async () => {
        try {
            const res = await fetch(`${API_URL}/api/getData1/33?id=${schoolId}`);
            const json = await res.json();
            if (json.success && json.data?.[0]) {
                const row = json.data[0];
                const rawLogo = row['Image'] || row['Logo'] || row['SchoolImeg'] || row['SchoolImage'];
                
                setSchoolInfo({
                    SchoolNam: row['SchoolNam'] || schoolName,
                    ModriaNam: row['ModriaNam'] || '',
                    EdaraNam: row['EdaraNam'] || '',
                    Logo: parseLogo(rawLogo)
                });
            }
        } catch (err) { console.error(err); }
    };
    if (schoolId) fetchSchoolInfo();
  }, [schoolId, schoolName]);

  // === 3. جلب بيانات التوزيع ===
  useEffect(() => {
    if (!selectedTermId) return;
    
    const fetchData = async () => {
        setLoading(true);
        const termObj = terms.find(t => t['الرقم'] === selectedTermId);
        
        const res = await fetch(`${API_URL}/api/search/complex?sch1=${schoolId}&sch2=${yearId}&sch3=${termObj?.['التيرم'] || ''}&inpout=8`);
        const json = await res.json();
        
        if (json.success) setDistributionData(json.data);
        else setDistributionData([]);
        setLoading(false);
    };
    fetchData();
  }, [selectedTermId, terms, schoolId, yearId]);

  // === 4. الفلترة ===
  const filteredData = useMemo(() => {
      return distributionData.filter(row => {
          const matchDate = selectedDate ? row["التاريخ"]?.split('T')[0] === selectedDate : true;
          const matchPeriod = selectedPeriod ? row["الفترة"] === selectedPeriod : true;
          return matchDate && matchPeriod;
      });
  }, [distributionData, selectedDate, selectedPeriod]);

  // === 5. حساب المريحين ===
  const restingTeachers = useMemo(() => {
      if (!selectedDate) return []; 
      const workingNames = new Set<string>();
      filteredData.forEach(row => {
          if (row["الملاحظ1"]) workingNames.add(row["الملاحظ1"]);
          if (row["الملاحظ2"]) workingNames.add(row["الملاحظ2"]);
      });
      return allTeachers.filter(t => !workingNames.has(t.name));
  }, [filteredData, allTeachers, selectedDate]);

  // === 6. استخراج أسماء التواقيع ===
  const signatures = useMemo(() => {
      const head = allTeachers.find(t => t.job === "رئيس لجنة")?.name || "..................";
      const observer = allTeachers.find(t => t.job === "مراقب اول")?.name || "..................";
      return { head, observer };
  }, [allTeachers]);

  // === 7. تصدير للإكسل ===
  const exportToExcel = () => {
      if (filteredData.length === 0) return alert('لا توجد بيانات للتصدير');
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += "التاريخ,الفترة,المادة,اللجنة,عدد الطلاب,أرقام الجلوس,الملاحظ الأول,الملاحظ الثاني\n";
      filteredData.forEach(row => {
          const date = new Date(row["التاريخ"]).toLocaleDateString('ar-EG');
          const seats = `${row["من رقم الجلوس"]} - ${row["إلى رقم جلوس"]}`;
          csvContent += `${date},${row["الفترة"]},${row["المادة"]},${row["اللجنة"]},${row["عدد الطلاب"]},${seats},${row["الملاحظ1"]},${row["الملاحظ2"]}\n`;
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
  
  const thStyle: React.CSSProperties = { padding: '12px', borderBottom: '2px solid #ccfbf1', color: '#0f766e', fontWeight: 'bold', textAlign: 'center', border: '1px solid #e5e7eb' };
  const tdStyle: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', border: '1px solid #e5e7eb', verticalAlign: 'middle' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
                <h1 style={{margin:0, fontSize:'28px'}}>📋 عرض توزيع الملاحظين</h1>
                <p style={{margin:'5px 0 0', opacity:0.9}}>عرض وتقرير شامل للتوزيع</p>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={() => window.print()} style={{...btnPrimary, background: '#475569'}}>🖨️ طباعة</button>
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
                    <option value="الفترة الأولى">الفترة الأولى</option>
                    <option value="الفترة الثانية">الفترة الثانية</option>
                </select>
            </div>
        </div>
      </div>

      {/* جدول الشاشة */}
      <div style={cardStyle} className="screen-only">
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
                {filteredData.length === 0 && !loading && <p style={{textAlign:'center', color:'#94a3b8', marginTop:'20px'}}>لا توجد بيانات</p>}
            </div>
            </>
        )}
      </div>

      {/* === منطقة الطباعة (Print Area) === */}
      <div id="print-area" className="print-only">
          {/* 1. Header: Info Right, Logo Left */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '20px' }}>
              
              {/* العنصر الأول: بيانات المدرسة (على اليمين في RTL) */}
              <div style={{ textAlign: 'right', flexGrow: 1, marginLeft: '20px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>المديرية: {schoolInfo?.ModriaNam}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>الإدارة: {schoolInfo?.EdaraNam}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>المدرسة: {schoolInfo?.SchoolNam}</div>
              </div>

              {/* العنصر الثاني: اللوجو (على اليسار في RTL) */}
              <div style={{ width: '120px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {schoolInfo?.Logo ? (
                      <img src={schoolInfo.Logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : <div style={{textAlign:'center'}}>شعار</div>}
              </div>
          </div>

          {/* 2. Title */}
          <h2 style={{textAlign:'center', margin:'20px 0', fontSize: '20px', textDecoration: 'underline' }}>
            كشف توزيع الملاحظة
          </h2>

          {/* 3. Sub-header */}
          <div style={{ textAlign: 'right', marginBottom: '30px', fontSize: '16px', fontWeight: 'bold' }}>
              {filteredData.length > 0 && (
                   <span>
                       المادة: {filteredData[0]["المادة"]} &nbsp;&nbsp;&nbsp; 
                       الفترة: {filteredData[0]["الفترة"]} &nbsp;&nbsp;&nbsp; 
                       التاريخ: {new Date(filteredData[0]["التاريخ"]).toLocaleDateString('ar-EG')}
                   </span>
              )}
          </div>

          {/* 4. Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '50px' }}>
              <thead>
                  <tr>
                      <th style={thStyle}>رقم اللجنة</th>
                      <th style={thStyle}>عدد الطلاب</th>
                      <th style={thStyle}>أرقام الجلوس</th>
                      <th style={thStyle}>اسم الملاحظ</th>
                      <th style={thStyle}>توقيع الملاحظين</th>
                      <th style={thStyle}>توقيع مراقب الدور</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredData.map((row, idx) => (
                      <React.Fragment key={idx}>
                          <tr>
                              <td style={{...tdStyle, border: '1px solid black', textAlign: 'center'}} rowSpan={2}>{row["اللجنة"]}</td>
                              <td style={{...tdStyle, border: '1px solid black', textAlign: 'center'}} rowSpan={2}>{row["عدد الطلاب"]}</td>
                              <td style={{...tdStyle, border: '1px solid black', textAlign: 'center'}} rowSpan={2}>
                                  {row["من رقم الجلوس"]} - {row["إلى رقم جلوس"]}
                              </td>
                              <td style={{...tdStyle, border: '1px solid black', height: '40px'}}>{row["الملاحظ1"]}</td>
                              <td style={{...tdStyle, border: '1px solid black'}}></td>
                              <td style={{...tdStyle, border: '1px solid black'}} rowSpan={2}></td>
                          </tr>
                          <tr>
                              <td style={{...tdStyle, border: '1px solid black', height: '40px'}}>{row["الملاحظ2"]}</td>
                              <td style={{...tdStyle, border: '1px solid black'}}></td>
                          </tr>
                      </React.Fragment>
                  ))}
              </tbody>
          </table>

          {/* 5. Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px' }}>
              <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>توقيع مراقب الدور :</div>
                   <div style={{ marginTop: '40px', borderBottom: '1px solid black', width: '150px', margin: '40px auto 0' }}></div>
                   <div style={{ fontWeight: 'bold', marginTop: '5px' }}>....................</div>
              </div>
              
               <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>توقيع رئيس اللجنة :</div>
                   <div style={{ marginTop: '40px', borderBottom: '1px solid black', width: '150px', margin: '40px auto 0' }}></div>
                   <div style={{ fontWeight: 'bold', marginTop: '5px' }}>{signatures.head}</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>توقيع المراقب الأول :</div>
                   <div style={{ marginTop: '40px', borderBottom: '1px solid black', width: '150px', margin: '40px auto 0' }}></div>
                   <div style={{ fontWeight: 'bold', marginTop: '5px' }}>{signatures.observer}</div>
              </div>
          </div>
      </div>

      {/* المريحين */}
      {selectedDate && restingTeachers.length > 0 && (
          <div style={{...cardStyle, background: '#fff7ed', border: '1px solid #ffedd5'}} className="no-print">
              <h3 style={{marginTop:0, color: '#ea580c', display:'flex', alignItems:'center', gap:'10px'}}>
                  <span>☕</span> المعلمون المريحون ({restingTeachers.length})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {restingTeachers.map(t => (
                      <span key={t.id} style={{ background: 'white', padding: '6px 15px', borderRadius: '20px', border: '1px solid #fed7aa', fontSize: '14px', color: '#9a3412' }}>
                          {t.name}
                      </span>
                  ))}
              </div>
          </div>
      )}

      {/* Print CSS */}
      <style jsx global>{`
        .print-only { display: none; }
        .screen-only { display: block; }

        @media print {
            .no-print { display: none !important; }
            .screen-only { display: none !important; }
            
            .print-only { display: block !important; }
            
            #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 20px;
                background: white;
                color: black;
            }

            table, th, td {
                border: 1px solid black !important;
            }
            
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}