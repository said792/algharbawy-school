'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

interface StudentCard {
    StudentName: string; 
    SeatNumber: number;  
    CommitteeName: string; 
}

interface SchoolInfo {
    SchoolNam: string;
    ModriaNam: string;
    EdaraNam: string;
    Logo: string; 
}

export default function SeatingCardsPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const schoolName = user?.schoolName || '';
    const stageName = work?.stageName || '';
    const yearName = work?.yearName || '';

    const [grades, setGrades] = useState<Grade[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedGradeName, setSelectedGradeName] = useState<string>('');
    
    const [students, setStudents] = useState<StudentCard[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
    
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

    // === 1. جلب الصفوف ===
    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                const json = await res.json();
                if (json.success) setGrades(json.data);
            } catch (err) { console.error(err); }
        };
        if (schoolName && stageName) fetchGrades();
    }, [schoolName, stageName]);

    // === 2. جلب معلومات المدرسة ===
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

    // === 3. جلب بيانات الطلاب ===
    const handleShowCards = async () => {
        if (!selectedGradeName) return alert('اختر الصف أولاً');
        setLoading(true);
        setStudents([]);

        try {
            const res = await fetch(`${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&inpot=15`);
            const json = await res.json();

            if (json.success && json.data) {
                const cards = json.data.map((s: any) => ({
                    StudentName: s['الطالب'] || s.ArbStudName,
                    SeatNumber: s['رقم الجلوس'] || s.SetingNum || 0,
                    CommitteeName: s['رقم اللجنة'] || s['اسم اللجنة'] || s.CommitteeName || 'غير محدد' 
                }));
                
                cards.sort((a: StudentCard, b: StudentCard) => a.SeatNumber - b.SeatNumber);
                setStudents(cards);
            } else {
                alert('لا توجد بيانات لهذا الصف');
            }
        } catch (err) {
            console.error(err);
            alert('خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value);
        setSelectedGradeId(id);
        const gradeObj = grades.find(g => g['الرقم'] === id);
        if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
    };

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '900px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
    
    // ✅ تعديل: Grid للشاشة (2 في الصف)
    const cardsContainerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px', 
        marginTop: '20px'
    };

    const cardBoxStyle: React.CSSProperties = {
        border: '2px solid black', 
        padding: '15px', 
        height: '180px', 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        background: 'white',
        pageBreakInside: 'avoid'
    };

    return (
        <div style={containerStyle}>
            <div className="no-print" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginTop: 0, color: '#0f766e' }}>🎫 كروت أرقام الجلوس</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '15px' }}>
                    <select value={selectedGradeId || ''} onChange={handleGradeChange} style={{ padding: '8px', flex: 1, borderRadius: '6px', border: '1px solid #ccc' }}>
                        <option value="">اختر الصف</option>
                        {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                    </select>
                    <button onClick={handleShowCards} disabled={loading} style={{ padding: '8px 20px', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        {loading ? 'جاري...' : 'عرض الكروت'}
                    </button>
                    {students.length > 0 && (
                        <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                            🖨️ طباعة
                        </button>
                    )}
                </div>
            </div>

            <div className="cards-container" style={cardsContainerStyle}>
                {students.map((st, idx) => (
                    <div key={idx} style={cardBoxStyle}>
                        
                        {/* 🟢 الهيدر: التبديل بين اللوجو والبيانات */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            
                            {/* 🟢 الجزء اليمين: اللوجو (مكان البيانات القديمة) */}
                            <div style={{ width: '80px', height: '80px', border: '1px solid #eee' }}>
                                {schoolInfo?.Logo ? (
                                    <img src={schoolInfo.Logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>شعار</div>
                                )}
                            </div>

                            {/* 🟢 الجزء الشمال: البيانات (مكان اللوجو القديم) */}
                            {/* الترتيب: مديرية - إدارة - مدرسة */}
                            <div style={{ textAlign: 'right', fontSize: '11px', lineHeight: '1.4', flex: 1, marginRight: '10px' }}>
                                <div>المديرية: {schoolInfo?.ModriaNam}</div>
                                <div>الإدارة: {schoolInfo?.EdaraNam}</div>
                                <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '3px' }}>{schoolInfo?.SchoolNam}</div>
                            </div>
                        </div>

                        {/* بيانات الطالب */}
                        <div style={{ textAlign: 'right', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                                الطالب: {st.StudentName}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                                <span>رقم الجلوس: {st.SeatNumber}</span>
                                <span>رقم اللجنة: {st.CommitteeName}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

                       {/* CSS للطباعة - تم إصلاح العرض */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .cards-container, .cards-container * { visibility: visible; }
                    .no-print { display: none !important; }
                    
                    /* 1. إلغاء الـ Grid */
                    .cards-container {
                        display: block !important; 
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }

                    /* 2. إجبار الكروت على العرض 48% بغض النظر عن الـ Inline Styles */
                    .cards-container > div {
                        display: inline-block !important;
                        width: 48% !important; 
                        margin: 1% !important; 
                        vertical-align: top;
                        border: 2px solid black !important; /* تأكيد الحدود */
                    }

                    /* 3. منطق الـ 10 كروت لكل صفحة */
                    .cards-container > div:nth-child(10n+1) {
                        page-break-before: always;
                    }
                    
                    @page { size: A4; margin: 5mm; }
                }
            `}</style>
        </div>
    );
}