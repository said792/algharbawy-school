'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

// === Types ===
interface TimetableRow {
    DayID: number;
    PeriodID: number;
    ClasesID: number;
    EmploeID: number;
    SabgektID: number;
    'اسم الحصة': string;
    'اسم المعلم': string;
    'اسم الفصل': string;
    'اسم المادة': string;
}

interface DropdownItem {
    id: number;
    name: string;
}

export default function ViewTimetablePage() {
    const [loading, setLoading] = useState(true);
    const [rawData, setRawData] = useState<TimetableRow[]>([]);
    
    // القوائم المنسدلة
    const [teachers, setTeachers] = useState<DropdownItem[]>([]);
    const [classes, setClasses] = useState<DropdownItem[]>([]);
    const [periods, setPeriods] = useState<DropdownItem[]>([]);
    
    // الفلاتر المختارة
    const [activeTab, setActiveTab] = useState<'school' | 'teacher' | 'class'>('school');
    const [selectedTeacher, setSelectedTeacher] = useState<number>(0);
    const [selectedClass, setSelectedClass] = useState<number>(0);
    const [selectedDay, setSelectedDay] = useState<number>(1); // للأحد

    const daysMap: Record<number, string> = {
        1: 'الأحد', 2: 'الاثنين', 3: 'الثلاثاء', 4: 'الأربعاء', 5: 'الخميس'
    };

       // === 1. جلب البيانات ===
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData/85`);
                const json = await res.json();
                
                // ✅ تحديد النوع صراحةً لحل مشكلة الـ unknown
                const data = (json.success ? json.data : json.data) as TimetableRow[];
                
                if (data && data.length > 0) {
                    setRawData(data);
                    
                    // استخراج القوائم الفريدة بدون تكرار
                    const uniqueTeachers = [...new Map(data.map((item: TimetableRow) => [item.EmploeID, { id: item.EmploeID, name: item['اسم المعلم'] }])).values()];
                    const uniqueClasses = [...new Map(data.map((item: TimetableRow) => [item.ClasesID, { id: item.ClasesID, name: item['اسم الفصل'] }])).values()];
                    const uniquePeriods = [...new Map(data.map((item: TimetableRow) => [item.PeriodID, { id: item.PeriodID, name: item['اسم الحصة'] }])).values()].sort((a, b) => a.id - b.id);

                    setTeachers(uniqueTeachers);
                    setClasses(uniqueClasses);
                    setPeriods(uniquePeriods);
                    
                    // اختيار أول عنصر افتراضياً
                    if (uniqueTeachers.length > 0) setSelectedTeacher(uniqueTeachers[0].id);
                    if (uniqueClasses.length > 0) setSelectedClass(uniqueClasses[0].id);
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // === 2. دالة استخراج الخلية ===
       // === 2. دالة استخراج الخلية (محدثة لتدعم تعدد المعلمين) ===
    const getCellData = (dayId: number, periodId: number, classId?: number, teacherId?: number): string => {
        
        // لو في فلتر للمعلم (جدول المعلم) -> نستخدم find عادي لأن المعلم مش هيكون عنده إلا حصة واحدة في الوقت ده
        if (teacherId) {
            const cell = rawData.find(r => 
                r.DayID === dayId && 
                r.PeriodID === periodId && 
                r.EmploeID === teacherId
            );
            if (!cell) return '-';
            return `${cell['اسم الفصل']}\n${cell['اسم المادة']}`;
        }

        // في جدول المدرسة وجدول الفصل -> نستخدم filter عشان ممكن يكون فيه أكتر من معلم (مواد عملية)
        const cells = rawData.filter(r => 
            r.DayID === dayId && 
            r.PeriodID === periodId && 
            (classId ? r.ClasesID === classId : true)
        );

        if (cells.length === 0) return '-';

        // نجمع أسماء المعلمين والمواد في نفس الخلية ونحطهم تحت بعض
        return cells.map(c => {
            if (activeTab === 'school') {
                // جدول المدرسة (خلاصة مختصرة عشان الصف عريض)
                return `${c['اسم المعلم']} (${c['اسم المادة']})`;
            } else {
                // جدول الفصل (عرض أوضح)
                return `${c['اسم المعلم']} - ${c['اسم المادة']}`;
            }
        }).join('\n'); // \n معناها سطر جديد (بفضل whiteSpace: 'pre-line' في الستايل)
    };

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: 16, padding: 24, marginBottom: 24, color: 'white' };
    const tabsContainer: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: 20 };
    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, border: 'none',
        background: isActive ? '#2563eb' : '#f1f5f9', color: isActive ? 'white' : '#475569',
        boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.3)' : 'none', transition: 'all 0.2s'
    });
    const filtersContainer: React.CSSProperties = { display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' };
    const selectStyle: React.CSSProperties = { padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '14px', minWidth: 200, background: 'white' };
    const tableContainer: React.CSSProperties = { background: 'white', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: activeTab === 'school' ? '1000px' : '600px' };
    const thStyle: React.CSSProperties = { background: '#f8fafc', padding: 12, borderBottom: '2px solid #e2e8f0', textAlign: 'center', color: '#334155', fontWeight: '700', fontSize: '13px' };
    const tdStyle: React.CSSProperties = { 
        padding: 12, borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#1e293b', fontSize: '13px',
        whiteSpace: 'pre-line', minHeight: 50
    };
    const emptyState: React.CSSProperties = { textAlign: 'center', padding: 60, color: '#94a3b8' };

    if (loading) return <div style={emptyState}>جاري تحميل بيانات الجدول...</div>;
    if (rawData.length === 0) return <div style={emptyState}>لا توجد بيانات. يرجى توليد الجدول أولاً.</div>;

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{ margin: 0 }}>📅 عرض الجداول الدراسية</h2>
                <p style={{ margin: '5px 0 0 0', opacity: 0.8 }}>استعراض الجدول حسب المعلم، الفصل، أو المدرسة بالكامل</p>
            </div>

            {/* التبويبات */}
            <div style={tabsContainer}>
                <button style={tabStyle(activeTab === 'school')} onClick={() => setActiveTab('school')}>🏫 جدول المدرسة</button>
                <button style={tabStyle(activeTab === 'teacher')} onClick={() => setActiveTab('teacher')}>👨‍🏫 جدول المعلم</button>
                <button style={tabStyle(activeTab === 'class')} onClick={() => setActiveTab('class')}>🏫 جدول الفصل</button>
            </div>

            {/* الفلاتر */}
            <div style={filtersContainer}>
                {activeTab === 'school' && (
                    <select style={selectStyle} value={selectedDay} onChange={e => setSelectedDay(Number(e.target.value))}>
                        {Object.entries(daysMap).map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                )}
                
                {activeTab === 'teacher' && (
                    <select style={selectStyle} value={selectedTeacher} onChange={e => setSelectedTeacher(Number(e.target.value))}>
                        {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                )}

                {activeTab === 'class' && (
                    <select style={selectStyle} value={selectedClass} onChange={e => setSelectedClass(Number(e.target.value))}>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* الجداول */}
            <div style={tableContainer} className="custom-scrollbar">
                
                {/* 1. جدول المدرسة (حصص × فصول ل يوم معين) */}
                {activeTab === 'school' && (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={{...thStyle, position: 'sticky', left: 0, zIndex: 1, background: '#f8fafc'}}>الحصة / الفصول</th>
                                {classes.map(c => (
                                    <th key={c.id} style={thStyle}>{c.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map(p => (
                                <tr key={p.id}>
                                    <td style={{...tdStyle, position: 'sticky', left: 0, zIndex: 1, background: 'white', fontWeight: 'bold'}}>{p.name}</td>
                                    {classes.map(c => (
                                        <td key={c.id} style={tdStyle}>
                                            {getCellData(selectedDay, p.id, c.id)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* 2. جدول المعلم (حصص × أيام) */}
                {activeTab === 'teacher' && (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>الحصة / اليوم</th>
                                {Object.values(daysMap).map(day => (
                                    <th key={day} style={thStyle}>{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map(p => (
                                <tr key={p.id}>
                                    <td style={{...tdStyle, fontWeight: 'bold'}}>{p.name}</td>
                                    {Object.keys(daysMap).map(dayId => (
                                        <td key={dayId} style={tdStyle}>
                                            {getCellData(Number(dayId), p.id, undefined, selectedTeacher)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* 3. جدول الفصل (حصص × أيام) */}
                {activeTab === 'class' && (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>الحصة / اليوم</th>
                                {Object.values(daysMap).map(day => (
                                    <th key={day} style={thStyle}>{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map(p => (
                                <tr key={p.id}>
                                    <td style={{...tdStyle, fontWeight: 'bold'}}>{p.name}</td>
                                    {Object.keys(daysMap).map(dayId => (
                                        <td key={dayId} style={tdStyle}>
                                            {getCellData(Number(dayId), p.id, selectedClass)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}