'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

// === Interfaces ===
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

interface StudentData {
    id: number;
    name: string;
    code: string;
    nationalId: string;
    grade: string;
    class: string;
    image: string;
}

interface EmployeeData {
    id: number;
    name: string;
    code: string;
    nationalId: string;
    job: string;
    image: string;
}

interface SchoolInfo {
    SchoolNam: string;
    ModriaNam: string;
    EdaraNam: string;
    Logo: string; 
}

// === إعدادات الطباعة الافتراضية ===
const initialSettings = {
    width: 280,
    height: 180,
    showImage: true,
    textColor: '#000000',
    logoPosition: 'top-right', 
    photoPosition: 'bottom-left', 
    schoolInfoPosition: 'top-center',
    fields: {
        name: true,
        code: true,
        grade: true,
        class: true,
        nationalId: false,
        job: true
    },
    schoolFields: {
        schoolName: true,
        modriaNam: true,
        edaraNam: false,
    }
};

const positionOptions = [
    { value: 'top-right', label: 'أعلى اليمين' },
    { value: 'top-center', label: 'أعلى المنتصف' },
    { value: 'top-left', label: 'أعلى اليسار' },
    { value: 'bottom-right', label: 'أسفل اليمين' },
    { value: 'bottom-center', label: 'أسفل المنتصف' },
    { value: 'bottom-left', label: 'أسفل اليسار' },
    { value: 'center', label: 'المنتصف' },
    { value: 'hidden', label: 'مخفي' },
];

// === 1. المكون الداخلي (Content) ===
function IDDesignerContent() {
    const searchParams = useSearchParams(); // <-- آمن هنا
    
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const schoolName = user?.schoolName || '';
    const stageName = work?.stageName || '';
    const yearName = work?.yearName || '';

    const typeFromUrl = searchParams.get('type');

    // === State ===
    const [activeTab, setActiveTab] = useState<'students' | 'employees'>('students');
    
    const [grades, setGrades] = useState<Grade[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [selectedGradeName, setSelectedGradeName] = useState<string>('');
    
    const [students, setStudents] = useState<StudentData[]>([]);
    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
    
    const [loading, setLoading] = useState(false);

    const [settings, setSettings] = useState(initialSettings);

    useEffect(() => {
        if (typeFromUrl === 'students' || typeFromUrl === 'employees') {
            setActiveTab(typeFromUrl);
        }
    }, [typeFromUrl]);

    // === Helper: تحويل الصور ===
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

    // === Data Fetching ===
    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                const json = await res.json();
                if (json.success) setGrades(json.data);
            } catch (err) { console.error(err); }
        };
        if (schoolName && stageName && activeTab === 'students') fetchGrades();
    }, [schoolName, stageName, activeTab]);

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

    const handleShowStudentCards = async () => {
        if (!selectedGradeName) return alert('اختر الصف أولاً');
        setLoading(true); setStudents([]);
        try {
            const res = await fetch(`${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&inpot=17`);
            const json = await res.json();
            if (json.success && json.data) {
                setStudents(json.data.map((s: any) => ({
                    id: s['الرقم'], name: s['الاسم بالعربى'], code: s['كود الطالب'],
                    nationalId: s['الرقم القومى'], grade: s['الصف'], class: s['الفصل'],
                    image: parseImage(s['صورة الطالب'])
                })));
            } else alert('لا توجد بيانات');
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleShowEmployeeCards = async () => {
        setLoading(true); setEmployees([]);
        try {
            const res = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
            const json = await res.json();
            if (json.success && json.data) {
                setEmployees(json.data.map((e: any) => ({
                    id: e.id, name: e.name, code: e.code,
                    nationalId: e.nationalId, job: e.job,
                    image: parseImage(e.image)
                })));
            } else alert('لا توجد بيانات');
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    // === Settings Handlers ===
    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const toggleField = (field: string) => {
        setSettings(prev => ({
            ...prev,
            fields: { ...prev.fields, [field]: !prev.fields[field as keyof typeof prev.fields] }
        }));
    };

    const toggleSchoolField = (field: string) => {
        setSettings(prev => ({
            ...prev,
            schoolFields: { ...prev.schoolFields, [field]: !prev.schoolFields[field as keyof typeof prev.schoolFields] }
        }));
    };

    // === Styles Helpers ===
    const getPositionStyle = (pos: string, isText: boolean = false): React.CSSProperties => {
        if (pos === 'hidden') return { display: 'none' };
        if (pos === 'center') return { 
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'absolute', textAlign: 'center' 
        };
        
        const styles: React.CSSProperties = { position: 'absolute' };
        
        if (pos.startsWith('top')) styles.top = 5;
        else if (pos.startsWith('bottom')) styles.bottom = 5;

        if (pos.endsWith('center')) {
            styles.left = '50%';
            styles.transform = 'translateX(-50%)';
            if (isText) styles.textAlign = 'center';
        } else if (pos.endsWith('right')) {
            styles.right = 5;
            if (isText) styles.textAlign = 'right';
        } else if (pos.endsWith('left')) {
            styles.left = 5;
            if (isText) styles.textAlign = 'left';
        }
        
        return styles;
    };

    // === Component Render ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1100px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
    
    const cardsContainerStyle: React.CSSProperties = {
        display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '20px', justifyContent: 'center'
    };

    const renderCard = (data: StudentData | EmployeeData, isStudent: boolean) => (
        <div key={data.id} style={{
            border: '2px solid black', 
            padding: '5px', 
            width: `${settings.width}px`,
            height: `${settings.height}px`,
            position: 'relative', 
            background: 'white',
            overflow: 'hidden',
            boxSizing: 'border-box',
            flexShrink: 0,
            color: settings.textColor
        }}>
            <div style={{
                ...getPositionStyle(settings.logoPosition),
                width: '50px', height: '50px', border: '1px solid #eee', background: '#fff', zIndex: 10
            }}>
                {schoolInfo?.Logo ? (
                    <img src={schoolInfo.Logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : <div style={{fontSize:'8px', textAlign:'center', lineHeight:'50px'}}>شعار</div> }
            </div>

            <div style={{
                ...getPositionStyle(settings.schoolInfoPosition, true),
                zIndex: 12,
                maxWidth: '80%',
                fontSize: '9px',
                lineHeight: '1.3',
                whiteSpace: 'nowrap'
            }}>
                {settings.schoolFields.schoolName && <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{schoolInfo?.SchoolNam}</div>}
                {settings.schoolFields.modriaNam && <div>{schoolInfo?.ModriaNam}</div>}
                {settings.schoolFields.edaraNam && <div>{schoolInfo?.EdaraNam}</div>}
            </div>

            {settings.showImage && (
                <div style={{
                    ...getPositionStyle(settings.photoPosition),
                    width: '60px', height: '70px', border: '1px solid #ccc', background: '#f1f5f9', zIndex: 5
                }}>
                    {data.image ? (
                        <img src={data.image} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : <div style={{fontSize:'8px', textAlign:'center', lineHeight:'70px'}}>صورة</div> }
                </div>
            )}

            <div style={{
                position: 'absolute', 
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '5px',
                zIndex: 1
            }}>
                <div style={{ textAlign: 'center', fontSize: '11px', lineHeight: '1.4' }}>
                    {settings.fields.name && <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{data.name}</div>}
                    {isStudent ? (
                        <>
                            {settings.fields.grade && <div>{(data as StudentData).grade}</div>}
                            {settings.fields.class && <div>{(data as StudentData).class}</div>}
                            {settings.fields.code && <div>كود: {(data as StudentData).code}</div>}
                        </>
                    ) : (
                        <>
                            {settings.fields.job && <div>{(data as EmployeeData).job}</div>}
                            {settings.fields.code && <div>كود: {(data as EmployeeData).code}</div>}
                        </>
                    )}
                    {settings.fields.nationalId && <div>قومي: {data.nationalId}</div>}
                </div>
            </div>
        </div>
    );

    const isStudentLocked = typeFromUrl === 'employees';
    const isEmployeeLocked = typeFromUrl === 'students';

    return (
        <div style={containerStyle}>
            {/* === التبويبات === */}
            <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button 
                    onClick={() => setActiveTab('students')} 
                    disabled={isStudentLocked}
                    style={{ 
                        flex: 1, 
                        padding: '10px', 
                        background: activeTab === 'students' ? '#0f766e' : '#e2e8f0', 
                        color: activeTab === 'students' ? 'white' : 'black', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: isStudentLocked ? 'not-allowed' : 'pointer',
                        opacity: isStudentLocked ? 0.5 : 1
                    }}>
                    🎓 طلاب
                </button>
                <button 
                    onClick={() => setActiveTab('employees')} 
                    disabled={isEmployeeLocked}
                    style={{ 
                        flex: 1, 
                        padding: '10px', 
                        background: activeTab === 'employees' ? '#0f766e' : '#e2e8f0', 
                        color: activeTab === 'employees' ? 'white' : 'black', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: isEmployeeLocked ? 'not-allowed' : 'pointer',
                        opacity: isEmployeeLocked ? 0.5 : 1 
                    }}>
                    👨‍🏫 موظفين
                </button>
            </div>

            {/* === باقي الكود === */}
             <div className="no-print" style={{ padding: '20px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginTop: 0, color: '#0f766e' }}>🎨 تصميم كارت الهوية</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginTop: '15px' }}>
                    
                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>البيانات</h4>
                        {activeTab === 'students' ? (
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <select value={selectedGradeId || ''} onChange={(e) => { setSelectedGradeId(Number(e.target.value)); setSelectedGradeName(grades.find(g=> g['الرقم'] === Number(e.target.value))?.['الصف الدراسى'] || ''); }} style={{ padding: '8px', flex: 1, borderRadius: '6px', border: '1px solid #ccc' }}>
                                    <option value="">اختر الصف</option>
                                    {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                                </select>
                                <button onClick={handleShowStudentCards} disabled={loading} style={{ padding: '8px', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px' }}>عرض</button>
                            </div>
                        ) : (
                            <button onClick={handleShowEmployeeCards} disabled={loading} style={{ width: '100%', padding: '8px', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px' }}>
                                {loading ? 'جاري...' : 'تحميل الموظفين'}
                            </button>
                        )}
                    </div>

                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>المقاسات والالوان</h4>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                العرض:
                                <input type="number" value={settings.width} onChange={(e) => updateSetting('width', Number(e.target.value))} style={{ width: '50px', padding: '5px' }} />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                الارتفاع:
                                <input type="number" value={settings.height} onChange={(e) => updateSetting('height', Number(e.target.value))} style={{ width: '50px', padding: '5px' }} />
                            </label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                            <label htmlFor="colorPicker" style={{ fontSize: '12px', fontWeight: 'bold' }}>لون النص:</label>
                            <input 
                                id="colorPicker"
                                type="color" 
                                value={settings.textColor} 
                                onChange={(e) => updateSetting('textColor', e.target.value)} 
                                style={{ width: '40px', height: '30px', border: '1px solid #ccc', cursor: 'pointer', padding: '0' }}
                            />
                        </div>
                    </div>

                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>التخطيط (الأماكن)</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px' }}>
                                الشعار:
                                <select value={settings.logoPosition} onChange={(e) => updateSetting('logoPosition', e.target.value)} style={{ width: '100%', padding: '3px', marginTop: '2px' }}>
                                    {positionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </label>
                            <label style={{ fontSize: '12px' }}>
                                بيانات المدرسة:
                                <select value={settings.schoolInfoPosition} onChange={(e) => updateSetting('schoolInfoPosition', e.target.value)} style={{ width: '100%', padding: '3px', marginTop: '2px' }}>
                                    {positionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </label>
                            <label style={{ fontSize: '12px' }}>
                                الصورة الشخصية:
                                <select value={settings.photoPosition} onChange={(e) => updateSetting('photoPosition', e.target.value)} style={{ width: '100%', padding: '3px', marginTop: '2px' }}>
                                    {positionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </label>
                        </div>
                    </div>

                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>الظهور</h4>
                        
                        <div style={{ marginBottom: '8px', borderBottom: '1px solid #f1f1f1', paddingBottom: '5px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '3px' }}>بيانات الشخص:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '11px' }}>
                                <label><input type="checkbox" checked={settings.fields.name} onChange={() => toggleField('name')} /> الاسم</label>
                                {activeTab === 'students' ? (
                                    <>
                                        <label><input type="checkbox" checked={settings.fields.grade} onChange={() => toggleField('grade')} /> الصف</label>
                                        <label><input type="checkbox" checked={settings.fields.class} onChange={() => toggleField('class')} /> الفصل</label>
                                    </>
                                ) : (
                                    <label><input type="checkbox" checked={settings.fields.job} onChange={() => toggleField('job')} /> الوظيفة</label>
                                )}
                                 <label><input type="checkbox" checked={settings.fields.nationalId} onChange={() => toggleField('nationalId')} /> القومي</label>
                            </div>
                        </div>

                        <div>
                            <span style={{ fontWeight: 'bold', fontSize: '11px', display: 'block', marginBottom: '3px' }}>بيانات المدرسة:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '11px' }}>
                                <label><input type="checkbox" checked={settings.schoolFields.schoolName} onChange={() => toggleSchoolField('schoolName')} /> المدرسة</label>
                                <label><input type="checkbox" checked={settings.schoolFields.modriaNam} onChange={() => toggleSchoolField('modriaNam')} /> المديرية</label>
                                <label><input type="checkbox" checked={settings.schoolFields.edaraNam} onChange={() => toggleSchoolField('edaraNam')} /> الإدارة</label>
                            </div>
                        </div>
                    </div>
                </div>

                {(students.length > 0 || employees.length > 0) && (
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                        <button onClick={() => window.print()} style={{ padding: '10px 30px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                            🖨️ طباعة
                        </button>
                    </div>
                )}
            </div>

            <div className="cards-container" style={cardsContainerStyle}>
                {activeTab === 'students' && students.map((st) => renderCard(st, true))}
                {activeTab === 'employees' && employees.map((emp) => renderCard(emp, false))}
            </div>

            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .cards-container, .cards-container * { visibility: visible; }
                    .no-print { display: none !important; }
                    
                    .cards-container {
                        display: flex !important;
                        flex-wrap: wrap !important;
                        justify-content: flex-start !important; 
                        position: absolute; left: 0; top: 0; width: 100%;
                        padding: 5mm; gap: 2mm !important;
                    }
                    .cards-container > div {
                        margin: 0 !important; padding: 2mm !important;
                        border: 1px solid black !important;
                        page-break-inside: avoid !important;
                    }
                    @page { size: A4; margin: 5mm; }
                }
            `}</style>
        </div>
    );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function IDDesignerPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحميل المصمم...</div>}>
            <IDDesignerContent />
        </Suspense>
    );
}