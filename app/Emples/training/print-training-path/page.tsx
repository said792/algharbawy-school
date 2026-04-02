'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface TrainingRecord {
  'الرقم': number;
  'الموظف': string;
  'الوظيفة': string;
  'اسم التدريب': string;
  'مكان التدريب': string;
  'بداية التدريب': string;
  'نهاية التدريب': string;
  'مدة التدريب': number;
}

interface SchoolInfo {
    SchoolNam: string;
    ModriaNam: string;
    EdaraNam: string;
    Logo: string; 
}

// === 1. المكون الداخلي (Content) ===
function FutureTrainingsContent() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId || 0;
  const schoolName = user?.schoolName || 'المدرسة';

  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [filtered, setFiltered] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [printItem, setPrintItem] = useState<TrainingRecord | null>(null);
  
  const [filters, setFilters] = useState({
    name: "",
    trainingName: "",
  });

  const [columnsConfig, setColumnsConfig] = useState([
    { key: "الموظف", label: "الموظف", visible: true },
    { key: "الوظيفة", label: "الوظيفة", visible: true },
    { key: "اسم التدريب", label: "اسم التدريب", visible: true },
    { key: "بداية التدريب", label: "تاريخ البداية", visible: true },
    { key: "نهاية التدريب", label: "تاريخ النهاية", visible: true },
    { key: "actions", label: "إجراءات", visible: true },
  ]);

  const [showColMenu, setShowColMenu] = useState(false);

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

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData1/33?id=${schoolId}`);
        const json = await res.json();
        if (json.success && json.data?.[0]) {
            const row = json.data[0];
            const rawLogo = row['Image'] || row['Logo'] || row['SchoolImeg'];
            setSchoolInfo({
                SchoolNam: row['SchoolNam'] || schoolName,
                ModriaNam: row['ModriaNam'] || '',
                EdaraNam: row['EdaraNam'] || '',
                Logo: parseImage(rawLogo)
            });
        }
      } catch (err) { console.error(err); }
    };
    if (schoolId) fetchSchoolInfo();
  }, [schoolId, schoolName]);

  useEffect(() => {
    const fetchTrainings = async () => {
      if (!user?.schoolId || !work?.yearId) return;

      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/leaves/data?schoolId=${user.schoolId}&yearId=${work.yearId}&inpout=10`
        );
        const data = await res.json();
        if (data.success) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const futureData = data.data.filter((item: any) => {
            const startDate = new Date(item['بداية التدريب']);
            return startDate >= today;
          });

          setTrainings(futureData);
          setFiltered(futureData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainings();
  }, [user, work]);

  useEffect(() => {
    const { name, trainingName } = filters;
    const result = trainings.filter((item) => {
      const matchName = item['الموظف']?.toLowerCase().includes(name.toLowerCase());
      const matchTrainingName = item['اسم التدريب']?.toLowerCase().includes(trainingName.toLowerCase());
      return matchName && matchTrainingName;
    });
    setFiltered(result);
  }, [filters, trainings]);

  const handlePrint = (item: TrainingRecord) => {
    setPrintItem(item);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString.split('T')[0];
      return date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  const toggleColumn = (key: string) => {
    const newConfig = [...columnsConfig];
    const idx = newConfig.findIndex(c => c.key === key);
    if (idx !== -1) {
      newConfig[idx].visible = !newConfig[idx].visible;
      setColumnsConfig(newConfig);
    }
  };

  const containerStyle = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' as const, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle = { background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(14, 165, 233, 0.2)' };
  const cardStyle = { background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' };
  const inputStyle = { width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const };
  const thStyle = { padding: '12px 15px', textAlign: 'right' as const, fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '2px solid #0ea5e9', color: '#1e3a8a' };
  const tdStyle = { padding: '12px 15px', color: '#334155', fontSize: '14px', borderBottom: '1px solid #f1f5f9' };
  const actionButtonStyle = { background: '#0f766e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', margin: '0 auto' };

  const renderItineraryCard = (item: TrainingRecord, isFirst: boolean) => (
    <div style={{
        border: '2px solid #1e3a8a',
        borderRadius: '8px',
        padding: '8px',
        height: '48%', 
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxSizing: 'border-box',
        marginBottom: isFirst ? '0' : '0',
        background: '#fff'
    }}>
        {/* === الهيدر النظيف (لوجو يسار - بيانات يمين) === */}
        <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderBottom: '2px solid #1e3a8a', 
            paddingBottom: '5px', 
            marginBottom: '5px' 
        }}>
            
            {/* الجانب الأيمن (البيانات فقط) */}
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a' }}>{schoolInfo?.SchoolNam}</div>
                <div style={{ fontSize: '11px', color: '#475569' }}>مديرية: {schoolInfo?.ModriaNam}</div>
                <div style={{ fontSize: '11px', color: '#475569' }}>إدارة: {schoolInfo?.EdaraNam}</div>
            </div>

            {/* الجانب الأيسر (اللوجو) */}
            <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee' }}>
                {schoolInfo?.Logo ? (
                    <img src={schoolInfo.Logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                ) : <div style={{fontSize:'10px', color:'#ccc'}}>شعار</div>}
            </div>
        </div>

        {/* العنوان */}
        <div style={{ textAlign: 'center', margin: '2px 0' }}>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#b91c1c', fontWeight: '800', textDecoration: 'underline' }}>خط سير موظف</h1>
        </div>

        {/* بيانات الموظف */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '5px', background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px dashed #3b82f6' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748b' }}>الموظف</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{item['الموظف']}</div>
            </div>
            <div style={{ width: '1px', background: '#cbd5e1' }}></div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748b' }}>الوظيفة</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{item['الوظيفة'] || 'غير محدد'}</div>
            </div>
        </div>

        {/* جدول البيانات */}
        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
                        <th style={{ padding: '4px', border: '1px solid #fff', width: '25%' }}>من</th>
                        <th style={{ padding: '4px', border: '1px solid #fff', width: '25%' }}>إلى</th>
                        <th style={{ padding: '4px', border: '1px solid #fff', width: '25%' }}>المكان</th>
                        <th style={{ padding: '4px', border: '1px solid #fff', width: '25%' }}>الغرض</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ backgroundColor: '#fff', height: '50px', verticalAlign: 'top' }}>
                        <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>
                            {formatDate(item['بداية التدريب'])}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>
                            {formatDate(item['نهاية التدريب'])}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            {item['مكان التدريب'] || '-'}
                        </td>
                        <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            {item['اسم التدريب']}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* === الفوتر (التوقيعات الثلاثة بجانب بعض) === */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-around', paddingTop: '5px', borderTop: '1px dashed #cbd5e1' }}>
            <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px dotted #000', marginBottom: '2px', height: '20px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>توقيع الموظف</div>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px dotted #000', marginBottom: '2px', height: '20px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>توقيع المدير</div>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px dotted #000', marginBottom: '2px', height: '20px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>يعتمد</div>
            </div>
        </div>
    </div>
  );

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🚀 التدريبات القادمة</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>طباعة خطوط سير الموظفين</p>
        </div>
      </div>

      <div className="no-print" style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#0ea5e9' }}>🔍 بحث وفلترة</h3>
          <button onClick={() => setShowColMenu(!showColMenu)} style={{ background: '#475569', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>⚙️ الأعمدة</button>
        </div>
        
        {showColMenu && (
          <div style={{ position: 'absolute', zIndex: 50, background: 'white', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
            {columnsConfig.map((col) => (
              <label key={col.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumn(col.key)}
                  style={{ marginLeft: '8px', accentColor: '#0ea5e9' }}
                />
                {col.label}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '0' }}>
          <input
            placeholder="بحث باسم الموظف..."
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="بحث باسم التدريب..."
            value={filters.trainingName}
            onChange={(e) => setFilters({ ...filters, trainingName: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="no-print" style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50, color: '#0ea5e9' }}>جاري تحميل البيانات...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f0f9ff', color: '#1e3a8a' }}>
                  {columnsConfig.filter(c => c.visible).map((col) => (
                    <th key={col.key} style={thStyle}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', transition: '0.2s' }}>
                    {columnsConfig.filter(c => c.visible).map((col) => {
                      const value = item[col.key as keyof TrainingRecord];
                      let displayValue = value || "-";

                      if (col.key === 'بداية التدريب' || col.key === 'نهاية التدريب') {
                        displayValue = formatDate(value as string);
                      } else if (col.key === 'actions') {
                        return (
                          <td key={col.key} style={tdStyle}>
                            <button 
                              onClick={() => handlePrint(item)}
                              style={actionButtonStyle}
                            >
                              🖨️ طباعة خط سير
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} style={tdStyle}>
                          {displayValue as string}
                        </td>
                      );
                    })}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columnsConfig.length} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      لا توجد تدريبات مستقبلية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* منطقة الطباعة */}
      {printItem && (
        <div className="printable-area" style={{ display: 'none' }}>
             <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '2%' }}>
                {renderItineraryCard(printItem, true)}
                {renderItineraryCard(printItem, false)}
             </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
            body * { visibility: hidden; }
            .printable-area, .printable-area * { visibility: visible; }
            .no-print { display: none !important; }
            
            .printable-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 5mm;
                box-sizing: border-box;
                display: flex !important;
                flex-direction: column;
            }
            
            @page { size: A4 portrait; margin: 5mm; }
        }
      `}</style>
    </div>
  );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function FutureTrainingsPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحميل التدريبات...</div>}>
      <FutureTrainingsContent />
    </Suspense>
  );
}