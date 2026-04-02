'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
    'الرقم': number;
    'الصف الدراسى': string;
}

interface Committee {
    "الرقم": number;
    "اللجنة": string;
}

interface CallSheetStudent {
    "مسلسل": number;
    "اسم الطالب": string;
    "النوع": string;
    "الديانة": string;
    "رقم الجلوس": number;
    "رقم اللجنة": string;
}

interface SchoolInfo {
    SchoolNam: string;
    ModriaNam: string;
    EdaraNam: string;
    Logo: string;
}

export default function CallSheetPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const schoolName = user?.schoolName || '';
    const stageName = work?.stageName || '';

    const [grades, setGrades] = useState<Grade[]>([]);
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [students, setStudents] = useState<CallSheetStudent[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedGradeName, setSelectedGradeName] = useState<string>('');
    const [selectedCommitteeId, setSelectedCommitteeId] = useState<number | null>(null);
    const [selectedCommitteeName, setSelectedCommitteeName] = useState<string>('');
    
    const [loading, setLoading] = useState(false);

    // === Helper: تحويل اللوجو (Binary / Hex) إلى Base64 ===
    const parseLogo = (rawData: any): string => {
        if (!rawData) return '';
        
        // Case 1: Buffer Object {type: "Buffer", data: [...]}
        if (typeof rawData === 'object' && rawData.type === 'Buffer' && Array.isArray(rawData.data)) {
            const bytes = new Uint8Array(rawData.data);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return `data:image/png;base64,${window.btoa(binary)}`;
        }
        
        // Case 2: Hex String "0x..."
        if (typeof rawData === 'string' && rawData.startsWith('0x')) {
            const hex = rawData.slice(2);
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
            }
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return `data:image/png;base64,${window.btoa(binary)}`;
        }

        // Case 3: Already Base64
        if (typeof rawData === 'string' && rawData.startsWith('data:image')) return rawData;
        
        return '';
    };

    // === 1. جلب الصفوف واللجان ===
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                // جلب الصفوف
                const resG = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                if (resG.ok) { const json = await resG.json(); if (json.success) setGrades(json.data); }

                // جلب اللجان
                const resC = await fetch(`${API_URL}/api/getData1/25?id=${schoolId}`);
                if (resC.ok) { const json = await resC.json(); if (json.success) setCommittees(json.data); }
            } catch (err) { console.error(err); }
        };
        if (schoolId) fetchInitial();
    }, [schoolId, schoolName, stageName]);

    // === 2. جلب معلومات المدرسة (لوحدها عشان اللوجو) ===
    useEffect(() => {
        const fetchSchoolInfo = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData1/33?id=${schoolId}`);
                const json = await res.json();
                if (json.success && json.data?.[0]) {
                    const row = json.data[0];
                    // محاولة قراءة اللوجو من أسماء مختلفة
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

    // === 3. جلب بيانات الكشف ===
    const handleShow = async () => {
        if (!selectedGradeName || !selectedCommitteeName) return alert('اختر الصف واللجنة');
        setLoading(true);
        setStudents([]);

        try {
            // SCHER3=Grade, SCHER4=Committee
            const res = await fetch(`${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&SCHER4=${selectedCommitteeName}&inpot=16`);
            
            const json = await res.json();

            if (json.success && json.data) {
                setStudents(json.data);
            } else {
                alert('لا توجد بيانات');
            }
        } catch (err) {
            console.error(err);
            alert('خطأ في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value);
        setSelectedGradeId(id);
        const obj = grades.find(g => g['الرقم'] === id);
        if (obj) setSelectedGradeName(obj['الصف الدراسى']);
    };

    const handleCommitteeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value);
        setSelectedCommitteeId(id);
        const obj = committees.find(c => c['الرقم'] === id);
        if (obj) setSelectedCommitteeName(obj['اللجنة']);
    };

    // === Styles ===
    const containerStyle: React.CSSProperties = { 
        padding: '20px', maxWidth: '1000px', margin: '0 auto', 
        direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' 
    };
    
    // Print Specific Styles
    const headerContainerStyle: React.CSSProperties = {
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '30px', 
        borderBottom: '2px solid black', 
        paddingBottom: '10px'
    };
    
    const titleStyle: React.CSSProperties = {
        textAlign: 'center', fontSize: '24px', fontWeight: 'bold', margin: '20px 0'
    };

    const tableStyle: React.CSSProperties = {
        width: '100%', borderCollapse: 'collapse', marginBottom: '50px'
    };
    
    const thStyle: React.CSSProperties = { border: '1px solid black', padding: '8px', background: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' };
    const tdStyle: React.CSSProperties = { border: '1px solid black', padding: '8px', textAlign: 'center' };

    return (
        <div style={containerStyle}>
            {/* شريط التحكم */}
            <div className="no-print" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginTop: 0, color: '#0f766e' }}>📜 كشف المناداة</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '15px', flexWrap: 'wrap' }}>
                    <select value={selectedGradeId || ''} onChange={handleGradeChange} style={{ padding: '8px', flex: 1, minWidth: '150px', borderRadius: '6px', border: '1px solid #ccc' }}>
                        <option value="">اختر الصف</option>
                        {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                    </select>
                    <select value={selectedCommitteeId || ''} onChange={handleCommitteeChange} style={{ padding: '8px', flex: 1, minWidth: '150px', borderRadius: '6px', border: '1px solid #ccc' }}>
                        <option value="">اختر اللجنة</option>
                        {committees.map(c => <option key={c['الرقم']} value={c['الرقم']}>{c['اللجنة']}</option>)}
                    </select>
                    <button onClick={handleShow} disabled={loading} style={{ padding: '8px 20px', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        {loading ? 'جاري...' : 'عرض'}
                    </button>
                    {students.length > 0 && (
                        <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                            🖨️ طباعة
                        </button>
                    )}
                </div>
            </div>

            {/* منطقة الطباعة */}
            {students.length > 0 && (
                <div id="print-area">
                    {/* 
                        RTL Layout: 
                        Start (Right) -> End (Left)
                        Logo Left, Text Right (Visual in RTL)
                    */}
                    <div style={headerContainerStyle}>
                        {/* الجزء اليمين (نص): بيانات المدرسة */}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>المديرية: {schoolInfo?.ModriaNam}</div>
                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>الإدارة: {schoolInfo?.EdaraNam}</div>
                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>المدرسة: {schoolInfo?.SchoolNam}</div>
                        </div>
                        
                        {/* الجزء الشمال (صورة): اللوجو */}
                        <div style={{ width: '100px', height: '100px', border: '1px solid #ccc', flexShrink: 0 }}>
                            {schoolInfo?.Logo ? (
                                <img src={schoolInfo.Logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : <div style={{textAlign:'center', lineHeight:'100px'}}>شعار</div>}
                        </div>
                    </div>

                    {/* العنوان */}
                    <div style={titleStyle}>
                        كشف مناداة - {selectedGradeName} - لجنة رقم ({selectedCommitteeName})
                    </div>

                                      {/* الجدول */}
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>مسلسل</th>
                                <th style={thStyle}>اسم الطالب</th>
                                <th style={thStyle}>النوع</th>
                                <th style={thStyle}>الديانة</th>
                                <th style={thStyle}>رقم الجلوس</th>
                                <th style={thStyle}>رقم اللجنة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s, idx) => (
                                <tr key={idx}>
                                    <td style={tdStyle}>{s['مسلسل'] || idx + 1}</td>
                                    <td style={{...tdStyle, fontWeight: 'bold', textAlign: 'right'}}>{s['اسم الطالب']}</td>
                                    <td style={tdStyle}>{s['النوع']}</td>
                                    <td style={tdStyle}>{s['الديانة']}</td>
                                    <td style={tdStyle}>{s['رقم الجلوس']}</td>
                                    <td style={tdStyle}>{s['رقم اللجنة']}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* التوقيعات */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontWeight: 'bold', fontSize: '16px' }}>
                        <div>توقيع رئيس اللجنة : .............................</div>
                        <div>توقيع المراقب الأول : .............................</div>
                    </div>
                </div>
            )}

            {/* Print CSS */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    .no-print { display: none !important; }
                    
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                        direction: rtl; /* تأكيد الاتجاه في الطباعة */
                    }

                    /* Force Black Borders */
                    table, th, td {
                        border: 1px solid black !important;
                    }
                }
            `}</style>
        </div>
    );
}