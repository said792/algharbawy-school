'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface GeneralItem { [key: string]: any }

export default function TransferStudentsPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;

    // === Helper Functions ===
    const getId = (item: any) => {
        if (!item) return 0;
        if (item['StudentID']) return item['StudentID'];
        if (item['الرقم']) return item['الرقم'];
        if (item['الرقم ']) return item['الرقم '];
        const values = Object.values(item);
        const numVal = values.find(v => typeof v === 'number');
        return numVal || 0;
    };

    const getName = (item: any) => {
        if (!item) return '';
        if (item['العام الدراسي']) return item['العام الدراسي'];
        if (item['العام الدراسى']) return item['العام الدراسى'];
        
        // تقديم الصف على المرحلة
        if (item['الصف الدراسى']) return item['الصف الدراسى'];
        if (item['الصف الدراسي']) return item['الصف الدراسي'];
        
        if (item['المرحلة']) return item['المرحلة'];
        if (item['اسم المرحلة']) return item['اسم المرحلة'];
        
        const values = Object.values(item);
        const nameVal = values.find(v => typeof v === 'string' && v.length > 1);
        return nameVal || 'غير معروف';
    };

    // === States ===
    const currentYearId = work?.yearId || 0;
    const currentYearName = work?.yearName || 'غير محدد';
    const currentMrahelId = work?.stageId || 0;
    const currentMrahelName = work?.stageName || 'غير محدد';
    const [selectedCurrentGradeId, setSelectedCurrentGradeId] = useState<number | null>(null);
    
    const [currentGrades, setCurrentGrades] = useState<GeneralItem[]>([]);
    const [nextGrades, setNextGrades] = useState<GeneralItem[]>([]);

    const [nextYears, setNextYears] = useState<GeneralItem[]>([]);
    const [nextStages, setNextStages] = useState<GeneralItem[]>([]);
    
    const [selectedNextYearId, setSelectedNextYearId] = useState<number | null>(null);
    const [selectedNextStageId, setSelectedNextStageId] = useState<number | null>(null);
    const [selectedNextGradeId, setSelectedNextGradeId] = useState<number | null>(null);

    const [gridData, setGridData] = useState<any[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    // === Styles ===
    const containerStyle: React.CSSProperties = { padding: '20px', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f3f4f6', minHeight: '100vh' };
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const selectStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', color: '#374151' };
    const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '25px' };
    const btnAction: React.CSSProperties = { padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };
    
    const thStyle: React.CSSProperties = { padding: '10px', textAlign: 'center', background: '#f1f5f9', borderBottom: '2px solid #e5e7eb', fontSize: '13px' };
    const tdStyle: React.CSSProperties = { padding: '10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', fontSize: '13px' };

    // === 1. تحميل البيانات الأولية ===
    useEffect(() => {
        const fetchInitial = async () => {
            setLoadingData(true);
            try {
                if (currentMrahelId) {
                    const resCG = await fetch(`${API_URL}/api/search2?SCHER1=${user?.schoolName}&SCHER2=${currentMrahelName}&inpot=6`);
                    const jsonCG = await resCG.json();
                    if (jsonCG.success) setCurrentGrades(jsonCG.data || []);
                }

                const resYears = await fetch(`${API_URL}/api/getData/13`);
                const jsonYears = await resYears.json();
                if (jsonYears.success) setNextYears(jsonYears.data || []);

                const resStages = await fetch(`${API_URL}/api/getData1/2?id=${schoolId}`);
                const jsonStages = await resStages.json();
                if (jsonStages.success) setNextStages(jsonStages.data || []);

            } catch (err) { console.error("خطأ في جلب البيانات", err); } 
            finally { setLoadingData(false); }
        };
        
        if (schoolId && currentMrahelId) fetchInitial();
    }, [schoolId, currentMrahelId]);

    // === 2. تحديث الصفوف الجديدة عند تغيير المرحلة الجديدة (محسن) ===
    useEffect(() => {
        if (!selectedNextStageId) { setNextGrades([]); return; }
        
        const fetchNextGrades = async () => {
            const selectedStage = nextStages.find(s => getId(s) === selectedNextStageId);
            const stageName = getName(selectedStage);
            
            const res = await fetch(`${API_URL}/api/search2?SCHER1=${user?.schoolName}&SCHER2=${stageName}&inpot=6`);
            const json = await res.json();
            if (json.success && json.data) {
                setNextGrades(json.data);
                
                // === تحسين: اختيار تلقائي للصف الأول عند تغيير المرحلة ===
                // إذا كانت المرحلة الجديدة مختلفة عن الحالية، نختار أول صف تلقائياً
                if (selectedNextStageId !== currentMrahelId && json.data.length > 0) {
                    const firstGradeId = getId(json.data[0]);
                    setSelectedNextGradeId(firstGradeId);
                } else {
                    // إذا نفس المرحلة، نترك الاختيار فارغاً للاختيار اليدوي
                    setSelectedNextGradeId(null);
                }
            }
        };
        fetchNextGrades();
    }, [selectedNextStageId, nextStages]);

    // === 3. منطق العرض ===
    const handleShowData = async () => {
        if (!selectedCurrentGradeId) return alert('اختر الصف الحالي');
        
        setLoading(true);
        setGridData([]);
        setSelectedStudentIds(new Set());

        try {
            const res = await fetch(`${API_URL}/api/reports/exam-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SchoolID: schoolId,
                    MrahelID: currentMrahelId,
                    YearID: currentYearId,
                    GradeID: selectedCurrentGradeId,
                    INPOT: 4,
                    OrderList: '', 
                    MainSubjects: ''
                })
            });

            const json = await res.json();
            if (json.success && json.data) {
                setGridData(json.data);
            } else {
                alert(json.error || 'لا توجد بيانات');
            }
        } catch (e) { alert('خطأ في الاتصال'); } 
        finally { setLoading(false); }
    };

    // === منطق الاختيار والترحيل ===
    const getRowStudentId = (row: any) => {
        if (!row) return 0;
        const possibleKeys = ['StudentID', 'student_id', 'ID', 'الرقم', 'الرقم '];
        for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== null) return Number(row[key]);
        }
        const keys = Object.keys(row);
        const idKey = keys.find(k => k.toLowerCase().includes('id') || k.includes('رقم'));
        if (idKey) return Number(row[idKey]);
        return 0;
    };

    const handleToggleStudent = (studentId: number, status: string) => {
        if (status !== 'ناجح') return; 
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(studentId)) newSet.delete(studentId);
        else newSet.add(studentId);
        setSelectedStudentIds(newSet);
    };

    const handleSelectAll = () => {
        const newSet = new Set<number>();
        gridData.forEach(row => {
            const id = getRowStudentId(row);
            if (row['الحالة العامة'] === 'ناجح' && id > 0) {
                newSet.add(id);
            }
        });
        setSelectedStudentIds(newSet);
    };

    const handleTransfer = async () => {
        if (selectedStudentIds.size === 0) return alert('لم يتم اختيار طلاب');
        
        // === تحققات جديدة ===
        if (!selectedNextYearId || !selectedNextStageId || !selectedNextGradeId) {
            return alert('اختر بيانات الترحيل الكاملة (العام، المرحلة، الصف)');
        }

        // منع الترحيل لنفس الصف
        if (selectedCurrentGradeId === selectedNextGradeId && currentMrahelId === selectedNextStageId) {
            return alert('لا يمكن ترحيل الطلاب لنفس الصف الدراسي.');
        }
        
        if (!confirm(`سيتم ترحيل ${selectedStudentIds.size} طالب. هل أنت متأكد؟`)) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/students/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SchoolID: schoolId,
                    CurrentYearID: currentYearId, NextYearID: selectedNextYearId,
                    CurrentMrahelID: currentMrahelId, NextMrahelID: selectedNextStageId,
                    CurrentGereadID: selectedCurrentGradeId, NextGereadID: selectedNextGradeId,
                    SelectedStudentIDs: Array.from(selectedStudentIds).join(',')
                })
            });
            const json = await res.json();
            if (json.success) {
                alert('تم الترحيل بنجاح');
                setGridData(prev => prev.filter(r => !selectedStudentIds.has(getRowStudentId(r))));
                setSelectedStudentIds(new Set());
            } else {
                alert(json.error || json.message || 'فشل الترحيل');
            }
        } catch(e) { alert('خطأ في الاتصال'); } 
        finally { setLoading(false); }
    };

    if (loadingData) return <div style={{padding:'50px', textAlign:'center'}}>جاري تحميل البيانات...</div>;

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                <div style={cardStyle}>
                    <h2 style={{margin:'0 0 20px', borderBottom:'2px solid #eee', paddingBottom:'10px'}}>🔄 ترحيل الطلاب للعام الجديد</h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        
                        {/* القسم الأول: البيانات الحالية */}
                        <div style={{ padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                            <h3 style={{margin:'0 0 15px', color:'#0369a1'}}>📍 البيانات الحالية (المصدر)</h3>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <div>
                                    <label style={labelStyle}>العام الدراسي</label>
                                    <input type="text" value={currentYearName} readOnly style={{...selectStyle, background:'#e5e7eb', cursor:'not-allowed'}} />
                                </div>
                                <div>
                                    <label style={labelStyle}>المرحلة</label>
                                    <input type="text" value={currentMrahelName} readOnly style={{...selectStyle, background:'#e5e7eb', cursor:'not-allowed'}} />
                                </div>
                                <div>
                                    <label style={labelStyle}>الصف الحالي</label>
                                    <select value={selectedCurrentGradeId || ''} onChange={e => setSelectedCurrentGradeId(Number(e.target.value))} style={selectStyle}>
                                        <option value="">اختر الصف</option>
                                        {currentGrades.map(g => <option key={getId(g)} value={getId(g)}>{getName(g)}</option>)}
                                    </select>
                                </div>
                                <button onClick={handleShowData} disabled={loading} style={btnPrimary}>
                                    👁️ عرض الطلاب للترحيل
                                </button>
                            </div>
                        </div>

                        {/* القسم الثاني: بيانات الترحيل */}
                        <div style={{ padding: '15px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                            <h3 style={{margin:'0 0 15px', color:'#b45309'}}>➡️ بيانات الترحيل (الوجهة)</h3>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <div>
                                    <label style={labelStyle}>العام الجديد</label>
                                    <select value={selectedNextYearId || ''} onChange={e => setSelectedNextYearId(Number(e.target.value))} style={selectStyle}>
                                        <option value="">اختر</option>
                                        {nextYears.map(y => <option key={getId(y)} value={getId(y)}>{getName(y)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>المرحلة الجديدة</label>
                                    <select value={selectedNextStageId || ''} onChange={e => { 
                                        setSelectedNextStageId(Number(e.target.value)); 
                                        // لاحظ: الـ useEffect هو اللي هيختار الصف تلقائي لو المرحلة تغيرت
                                    }} style={selectStyle}>
                                        <option value="">اختر</option>
                                        {nextStages.map(s => <option key={getId(s)} value={getId(s)}>{getName(s)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>الصف الجديد</label>
                                    <select value={selectedNextGradeId || ''} onChange={e => setSelectedNextGradeId(Number(e.target.value))} style={selectStyle}>
                                        <option value="">اختر</option>
                                        {nextGrades.map(g => <option key={getId(g)} value={getId(g)}>{getName(g)}</option>)}
                                    </select>
                                </div>
                                
                                {/* ملاحظة توجيهية */}
                                {selectedNextStageId && selectedNextStageId !== currentMrahelId && (
                                    <div style={{fontSize: '12px', color: '#b45309', background: '#fff7ed', padding: '8px', borderRadius: '4px'}}>
                                        ℹ️ تم اختيار المرحلة الجديدة. تأكد من أن الصف المختار هو الصف الأول في هذه المرحلة (مثلاً: أول إعدادي).
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* الجدول والترحيل */}
                {gridData.length > 0 && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems:'center' }}>
                            <h3 style={{margin:0}}>الطلاب المرشحين للترحيل</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleSelectAll} style={{ ...btnAction, background: '#475569' }}>✅ تحديد كل الناجحين</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...thStyle, width: '50px' }}>اختيار</th>
                                        <th style={thStyle}>م</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>اسم الطالب</th>
                                        <th style={thStyle}>المجموع</th>
                                        <th style={thStyle}>النسبة</th>
                                        <th style={thStyle}>الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gridData.map((row, idx) => {
                                        const id = getRowStudentId(row);
                                        const status = row['الحالة العامة'];
                                        const canTransfer = status === 'ناجح' && id > 0;
                                        
                                        let rowBg = 'white';
                                        if (status === 'دور ثاني') rowBg = '#fff7ed';
                                        if (status === 'باقي للاعادة' || status === 'راسب') rowBg = '#fef2f2';

                                        return (
                                            <tr key={id || idx} style={{ background: rowBg }}>
                                                <td style={tdStyle}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedStudentIds.has(id)}
                                                        onChange={() => handleToggleStudent(id, status)}
                                                        disabled={!canTransfer}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>{idx + 1}</td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{row['اسم الطالب']}</td>
                                                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{row['مجموع الدرجات']}</td>
                                                <td style={tdStyle}>{row['المجموع الكلي %']}</td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: 'white',
                                                        background: status === 'ناجح' ? '#16a34a' : status === 'دور ثاني' ? '#ea580c' : '#dc2626'
                                                    }}>
                                                        {status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ textAlign: 'left', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                             <button onClick={handleTransfer} disabled={loading || selectedStudentIds.size === 0} style={btnAction}>
                                🚀 ترحيل المحددين ({selectedStudentIds.size})
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}