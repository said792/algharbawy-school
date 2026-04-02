'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

interface AssignmentRaw {
    'الرقم': number;
    EmploeID: number;
    ClasesID: number;
    SabgektID: number;
    RequiredPeriods: number;
    'المعلم': string;
    'المادة': string;
}

interface BlackListItem {
    EmploeID: number;
    PeriodID: number;
}

interface PeriodItem {
    'الرقم': number;
    'الحصة': string;
    [key: string]: any;
}

interface ScheduleCell {
    dayIndex: number;
    periodId: number;
    classId: number;
    teacherId: number;
    subjectId: number;
}

interface Subject {
    'الرقم': number;
    'المادة': string;
}

export default function GenerateSchedulePage() {
    const [loading, setLoading] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [assignments, setAssignments] = useState<AssignmentRaw[]>([]);
    const [blacklist, setBlacklist] = useState<BlackListItem[]>([]);
    const [periods, setPeriods] = useState<PeriodItem[]>([]);
    const [days] = useState<string[]>(['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);

    // ✅ حالة المواد العملية والمويديل
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [selectedPracticalIds, setSelectedPracticalIds] = useState<number[]>([]);
    const [practicalSubjectIds, setPracticalSubjectIds] = useState<number[]>([]);

    const addLog = (message: string) => setLog(prev => [...prev, message]);

    // === 1. جلب البيانات الأساسية + المواد العملية ===
    useEffect(() => {
        const fetchData = async () => {
            try {
                const resAssign = await fetch(`${API_URL}/api/getData/80`);
                const dataAssign = await resAssign.json();
                if (dataAssign.success) setAssignments(dataAssign.data || []);
                else if (dataAssign.data) setAssignments(dataAssign.data);

                const resBlack = await fetch(`${API_URL}/api/getData/82`);
                const dataBlack = await resBlack.json();
                if (dataBlack.data) {
                    setBlacklist(dataBlack.data.map((item: any) => ({
                        EmploeID: item.EmploeID,
                        PeriodID: item.PeriodID
                    })));
                }

                const resPeriods = await fetch(`${API_URL}/api/getData/78`);
                const dataPeriods = await resPeriods.json();
                if (dataPeriods.success) setPeriods(dataPeriods.data || []);
                else if (dataPeriods.data) setPeriods(dataPeriods.data);

                // ✅ جلب IDs المواد العملية المحفوظة (API 86)
                const resPractical = await fetch(`${API_URL}/api/getData/86`);
                const dataPractical = await resPractical.json();
                const practicalData = dataPractical.success ? dataPractical.data : dataPractical.data;
                if (practicalData && Array.isArray(practicalData)) {
                    const ids = practicalData.map((p: any) => p['الرقم']);
                    setPracticalSubjectIds(ids);
                    setSelectedPracticalIds(ids);
                }

            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    // ✅ فتح المويديل وجلب كل المواد
    const openSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/getData/35`);
            const json = await res.json();
            const data = json.success ? json.data : json.data;
            if (data) setAllSubjects(data);
        } catch (err) {
            console.error(err);
        }
        setIsSettingsOpen(true);
    };

    // ✅ حفظ إعدادات المواد العملية
    const savePracticalSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/savePracticalSubjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subjectIds: selectedPracticalIds })
            });
            const result = await res.json();
            if (result.success) {
                setPracticalSubjectIds(selectedPracticalIds);
                setIsSettingsOpen(false);
                alert('✅ تم حفظ الإعدادات بنجاح');
            }
        } catch (err) {
            alert('حدث خطأ أثناء الحفظ');
        }
    };

    const toggleSubject = (id: number) => {
        setSelectedPracticalIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

       // === 3. الخوارزمية الذكية الجديدة (بنظام الجذب المغناطيسي) ===
    const generateAlgorithm = (): ScheduleCell[] => {
        const finalSchedule: ScheduleCell[] = [];
        const classBusy = new Map<string, boolean>();
        const teacherBusy = new Map<string, boolean>();
        const teacherClassDayCount = new Map<string, number>(); 
        const subjectClassDayCount = new Map<string, number>(); 
        
        // ✅ خريطة لتتبع الحصص العملية في نفس الوقت (السر كله هنا!)
        const classPracticalSlots = new Map<string, number>();

        const isBlacklisted = (teacherId: number, periodId: number) => {
            return blacklist.some(b => b.EmploeID === teacherId && b.PeriodID === periodId);
        };

        const isPractical = (subjectId: number) => practicalSubjectIds.includes(subjectId);

        const sortedAssignments = [...assignments].sort((a, b) => b.RequiredPeriods - a.RequiredPeriods);
        const normalAssignments = sortedAssignments.filter(a => !isPractical(a.SabgektID));
        const practicalAssignments = sortedAssignments.filter(a => isPractical(a.SabgektID));

        addLog("🧠 بدء التوزيع الذكي...");
        addLog(`📌 مواد عادية: ${normalAssignments.length} | مواد عملية: ${practicalAssignments.length}`);

        const scoreSlot = (dayIndex: number, periodId: number, assign: AssignmentRaw, isPracticalMode: boolean): number => {
            const classKey = `${dayIndex}-${periodId}-${assign.ClasesID}`;
            const teacherKey = `${dayIndex}-${periodId}-${assign.EmploeID}`;

            if (teacherBusy.has(teacherKey)) return -1;
            
            // قفل الفصل للمواد العادية فقط
            if (!isPracticalMode && classBusy.has(classKey)) return -1; 
            
            if (isBlacklisted(assign.EmploeID, periodId)) return -1;

            let score = 100;
            
            // منع التكرار في نفس اليوم
            if ((subjectClassDayCount.get(`${dayIndex}-${assign.SabgektID}-${assign.ClasesID}`) || 0) >= 1) {
                score -= 50; 
            }

            // ✅ قوة الجذب المغناطيسي (للمواد العملية بس)
            if (isPracticalMode) {
                const classSlotKey = `${dayIndex}-${periodId}-${assign.ClasesID}`;
                const existingPracticals = classPracticalSlots.get(classSlotKey) || 0;
                
                if (existingPracticals > 0) {
                    score += 200; // مكافأة ضخمة جداً لو لقى زملاء (مواد عملية تانية) في نفس الحصة!
                }
            }

            score += Math.random() * 5; // عشوائية بسيطة
            return score;
        };

        const placeAssignments = (assigns: AssignmentRaw[], isPracticalMode: boolean) => {
            for (const assign of assigns) {
                if (!assign.ClasesID || !assign.EmploeID || !assign.SabgektID) {
                    setError(`❌ توقف! تخصيص "${assign['المادة']}" ناقص IDs`);
                    return false; 
                }

                let placedPeriods = 0;
                while (placedPeriods < assign.RequiredPeriods) {
                    let bestSlot: ScheduleCell | null = null;
                    let bestScore = -Infinity;

                    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
                        for (const period of periods) {
                            const score = scoreSlot(dayIndex, period['الرقم'], assign, isPracticalMode);
                            if (score > bestScore) {
                                bestScore = score;
                                bestSlot = { dayIndex, periodId: period['الرقم'], classId: assign.ClasesID, teacherId: assign.EmploeID, subjectId: assign.SabgektID };
                            }
                        }
                    }

                    if (!bestSlot) {
                        setError(`❌ فشل توزيع "${assign['المادة']}" للمعلم "${assign['المعلم']}"`);
                        return false; 
                    }

                    // حجز المعلم
                    teacherBusy.set(`${bestSlot.dayIndex}-${bestSlot.periodId}-${bestSlot.teacherId}`, true);
                    
                    if (!isPracticalMode) {
                        // المواد العادية: نقفل الفصل
                        classBusy.set(`${bestSlot.dayIndex}-${bestSlot.periodId}-${bestSlot.classId}`, true);
                    } else {
                        // ✅ المواد العملية: نفعل الجاذبية (نسجل إن الحصة دي اتحطلت فيها مادة للفصل ده)
                        const classSlotKey = `${bestSlot.dayIndex}-${bestSlot.periodId}-${bestSlot.classId}`;
                        classPracticalSlots.set(classSlotKey, (classPracticalSlots.get(classSlotKey) || 0) + 1);
                    }
                    
                    // تحديث العدادات
                    teacherClassDayCount.set(`${bestSlot.dayIndex}-${bestSlot.teacherId}-${bestSlot.classId}`, (teacherClassDayCount.get(`${bestSlot.dayIndex}-${bestSlot.teacherId}-${bestSlot.classId}`) || 0) + 1);
                    subjectClassDayCount.set(`${bestSlot.dayIndex}-${bestSlot.subjectId}-${bestSlot.classId}`, (subjectClassDayCount.get(`${bestSlot.dayIndex}-${bestSlot.subjectId}-${bestSlot.classId}`) || 0) + 1);

                    finalSchedule.push(bestSlot);
                    placedPeriods++;
                }
                addLog(`✅ تم توزيع ${assign.RequiredPeriods} حصة (${assign['المادة']})`);
            }
            return true;
        };

        addLog("⚙️ المرحلة 1: المواد العادية...");
        if (!placeAssignments(normalAssignments, false)) return [];

        addLog("🎨 المرحلة 2: مواد الأنشطة (الجذب المغناطيسي)...");
        if (!placeAssignments(practicalAssignments, true)) return [];

        return finalSchedule;
    };
    // === 3. التوليد والحفظ ===
    const handleGenerate = async () => {
        setLoading(true); setIsGenerated(false); setError(null); setLog([]);
        await new Promise(res => setTimeout(res, 50));

        const scheduleData = generateAlgorithm();
        if (scheduleData.length === 0) { setLoading(false); return; }

        addLog("📤 جاري حفظ الجدول...");
        try {
            const res = await fetch(`${API_URL}/api/saveTimetable`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule: scheduleData })
            });
            const result = await res.json();
            if (result.success) { addLog(`🎉 ${result.message}`); setIsGenerated(true); }
            else { setError(result.message || "فشل الحفظ"); addLog("❌ " + (result.message || "فشل")); }
       } catch (err: any) {
            const errorMsg = err.message || "خطأ غير معروف";
            setError("خطأ أثناء الحفظ: " + errorMsg);
            addLog("❌ تفاصيل الخطأ: " + errorMsg);
        }
        setLoading(false);
    };

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '850px', margin: '0 auto' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: 16, padding: 24, marginBottom: 24, textAlign: 'center' };
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 20 };
    const btnStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '15px 40px', borderRadius: 12, fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.4)', display: 'block', margin: '20px auto 0 auto', width: '100%' };
    const settingsBtnStyle: React.CSSProperties = { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: 8, fontSize: '14px', cursor: 'pointer', marginBottom: '15px' };
    const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
    const modalStyle: React.CSSProperties = { background: 'white', padding: 24, borderRadius: 16, width: 450, maxHeight: '80vh', display: 'flex', flexDirection: 'column' };
    const logContainerStyle: React.CSSProperties = { background: '#1e293b', borderRadius: 12, padding: 15, maxHeight: 300, overflowY: 'auto', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' };
    const logLineStyle: React.CSSProperties = { fontSize: '13px', color: '#94a3b8', marginBottom: 4 };
    const errorBoxStyle: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 15, borderRadius: 10, marginBottom: 15, fontWeight: 'bold' };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div style={{ fontSize: '40px', marginBottom: 10 }}>🧠</div>
                <h2 style={{ color: 'white', margin: 0 }}>مولد الجدول المدرسي الذكي</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0 0' }}>توزيع تلقائي وذكي للحصص دون تعارضات</p>
            </div>

            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <h3 style={{ margin: 0, color: '#334155' }}>📊 الإعدادات الحالية</h3>
                    <button style={settingsBtnStyle} onClick={openSettings}>⚙️ إعدادات المواد العملية</button>
                </div>
                
                {/* شريط يوضح المواد العملية المختارة */}
                {practicalSubjectIds.length > 0 && (
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '10px 15px', borderRadius: 8, marginBottom: 15, fontSize: '13px', color: '#9a3412' }}>
                        🎨 المواد العملية المحددة حالياً: <strong>{practicalSubjectIds.length} مواد</strong> (سيتم توزيع المعلمين لنفس الفصل في نفس الحصة).
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <div style={{ background: '#f8fafc', padding: 15, borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>{days.length}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>أيام الدراسة</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: 15, borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>{periods.length}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>حصة يومياً</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: 15, borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>{assignments.length}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>تخصيص مطلوب</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: 15, borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>{blacklist.length}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>قيد (قائمة سوداء)</div>
                    </div>
                </div>

                <button 
                    style={{ ...btnStyle, opacity: (loading || assignments.length === 0) ? 0.5 : 1, cursor: (loading || assignments.length === 0) ? 'not-allowed' : 'pointer' }}
                    onClick={handleGenerate}
                    disabled={loading || assignments.length === 0}
                >
                    {loading ? '⏳ جاري التوليد والتحليل...' : '🚀 ابدأ توليد الجدول الآن'}
                </button>
            </div>

            {error && <div style={errorBoxStyle}>⚠️ {error}</div>}

            {log.length > 0 && (
                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: 15 }}>💻 سجل العملية:</h3>
                    <div style={logContainerStyle}>
                        {log.map((l, i) => <div key={i} style={logLineStyle}>{l}</div>)}
                        {loading && <div style={{...logLineStyle, color: '#facc15'}}>⏳ يعمل...</div>}
                    </div>
                </div>
            )}

            {isGenerated && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 25, borderRadius: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: 10 }}>🎉</div>
                    <h2 style={{ color: '#166534', margin: '0 0 10px 0' }}>تم إنشاء وحفظ الجدول بنجاح!</h2>
                </div>
            )}

            {/* ✅ مويديل إعدادات المواد العملية */}
            {isSettingsOpen && (
                <div style={overlayStyle} onClick={() => setIsSettingsOpen(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: 10 }}>⚙️ تحديد المواد العملية (الأنشطة)</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: 15 }}>
                            اختر المواد اللي بتتدرس بأكثر من معلم في نفس الحصة لنفس الفصل (مثل: فنية، موسيقى، صناعي).
                        </p>
                        
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 300, overflowY: 'auto', marginBottom: 15 }}>
                            {allSubjects.length === 0 ? <div style={{padding:15, textAlign:'center'}}>جاري تحميل...</div> : 
                                allSubjects.map(s => {
                                    const isSelected = selectedPracticalIds.includes(s['الرقم']);
                                    return (
                                        <div 
                                            key={s['الرقم']} 
                                            onClick={() => toggleSubject(s['الرقم'])}
                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 15px', cursor: 'pointer', background: isSelected ? '#eff6ff' : 'white', borderBottom: '1px solid #f1f5f9' }}
                                        >
                                            <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ cursor: 'pointer' }} />
                                            <span style={{ fontSize: '14px' }}>{s['المادة']}</span>
                                        </div>
                                    );
                                })
                            }
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 'auto' }}>
                            <button onClick={() => setIsSettingsOpen(false)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>إلغاء</button>
                            <button onClick={savePracticalSettings} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 حفظ الإعدادات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}