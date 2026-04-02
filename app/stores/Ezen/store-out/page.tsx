'use client';

import React, { useState, useEffect, Suspense } from 'react'; // 1. إضافة Suspense
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

interface Store { 'الرقم': number; 'اسم المخزن': string; }
interface Item { 'كود الصنف': number; 'اسم الصنف': string; 'الوحدة': string; }
interface Employee { id: number; name: string; }
interface Grade { 'الرقم': number; 'الصف الدراسى': string; }
interface DistributionStudent { StudentID: number; 'اسم الطالب': string; 'الرقم القومى': string; Quantity: number; }

interface IssuanceRow {
    tempId: number;
    ItemID: number | null; ItemName: string; Unit: string;
    StoreID: number | null;
    Quantity: number;
    Stock: number | null;
    isExisting?: boolean;
}

// === 1. مكون المحتوى (الداخلي) ===
function StoreOutContent() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId || 0;
    const mrahelId = work?.stageId || 0;
    const yearId = work?.yearId || 0;
    const schoolName = user?.schoolName || ''; 
    const searchParams = useSearchParams(); // <-- آمن هنا داخل المحتوى

    // Header State
    const [orderId, setOrderId] = useState<number>(1);
    const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [custodyType, setCustodyType] = useState<string>('عهدة شخصية');
    
    // Tabs State
    const [activeTab, setActiveTab] = useState<'issuance' | 'distribution'>('issuance');
    
    // Lookups
    const [stores, setStores] = useState<Store[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    
    // Issuance Tab State
    const [issuanceRows, setIssuanceRows] = useState<IssuanceRow[]>([]);
    
    // Distribution Tab State
    const [distStoreId, setDistStoreId] = useState<number | null>(null);
    const [distItemId, setDistItemId] = useState<number | null>(null);
    const [distItemStock, setDistItemStock] = useState<number | null>(null);
    const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
    const [studentsList, setStudentsList] = useState<DistributionStudent[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Styles
    const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal' };
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px' };
    const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' };
    const thStyle: React.CSSProperties = { padding: '8px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'center', fontSize: '12px' };
    const tdStyle: React.CSSProperties = { padding: '4px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontSize: '12px' };
    const btn: React.CSSProperties = { padding: '8px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: 'white' };

    // === Initialization ===
    useEffect(() => {
        const init = async () => {
            // Fetch Lookups
            const resStores = await fetch(`${API_URL}/api/getData1/19?id=${schoolId}`);
            if (resStores.ok) { const j = await resStores.json(); if (j.success) setStores(j.data); }
            
            const resItems = await fetch(`${API_URL}/api/getData1/20?id=${schoolId}`);
            if (resItems.ok) { const j = await resItems.json(); if (j.success) setItems(j.data); }
            
            const resEmp = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
            if (resEmp.ok) { const j = await resEmp.json(); if (j.success) setEmployees(j.data); }
            
            const resG = await fetch(`${API_URL}/api/search2?SCHER1=${user?.schoolName}&SCHER2=${work?.stageName}&inpot=6`);
            if (resG.ok) { const j = await resG.json(); if (j.success) setGrades(j.data); }

            // Check Edit Mode & Tab Type
            const editId = searchParams.get('editId');
            const tabType = searchParams.get('tab'); // 'issuance' or 'distribution'

            if (editId) {
                setIsEditing(true);
                setOrderId(Number(editId));
                
                if (tabType === 'distribution') {
                    setActiveTab('distribution');
                    loadDistributionData(Number(editId));
                } else {
                    setActiveTab('issuance');
                    loadIssuanceData(Number(editId));
                }
            } else {
                getNextOrderId();
            }
        };
        if (schoolId) init();
    }, [schoolId, searchParams]);

    // === Load Data for Issuance (Regular) ===
    const loadIssuanceData = async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${schoolId}&sch2=${id}&inpot=3`);
            const json = await res.json();
            if (json.success) {
                if (json.data && json.data[0]) {
                    const h = json.data[0];
                    setEmployeeId(h.EmploeID);
                    setCustodyType(h.n_ahdea);
                    setOrderDate(h.IssuanceDate ? h.IssuanceDate.split('T')[0] : '');
                }
                if (json.data2) {
                    const loadedRows = json.data2.map((r: any) => ({
                        tempId: Date.now() + r.SanefID,
                        ItemID: r.SanefID,
                        ItemName: r['اسم الصنف'],
                        StoreID: r.MagzenID,
                        Quantity: r['الكمية المطلوبة'] || r.Quantity,
                        Unit: r['الوحدة'],
                        Stock: r['رصيد الصنف'],
                        isExisting: true
                    }));
                    setIssuanceRows(loadedRows);
                }
            }
        } catch (e) { console.error(e); alert('خطأ في تحميل بيانات الصرف'); }
        finally { setLoading(false); }
    };

    // === Load Data for Distribution ===
    const loadDistributionData = async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${schoolId}&sch2=${id}&inpot=29`);
            const json = await res.json();
            
            if (json.success) {
                if (json.data && json.data[0]) {
                    const h = json.data[0];
                    setEmployeeId(h.EmploeID);
                    setCustodyType(h.n_ahdea || 'عهدة طلاب');
                    setOrderDate(h.IssuanceDate ? h.IssuanceDate.split('T')[0] : '');
                }
                
                if (json.data2 && json.data2.length > 0) {
                    const firstRow = json.data2[0];
                    if (firstRow.SanefID) setDistItemId(firstRow.SanefID);
                    if (firstRow.MagzenID) setDistStoreId(firstRow.MagzenID);
                    if (firstRow.GradeID) setSelectedGradeId(firstRow.GradeID);

                    setStudentsList(json.data2.map((s: any) => ({
                        StudentID: s.StudentID,
                        'اسم الطالب': s['اسم الطالب'],
                        'الرقم القومى': s['الرقم القومى'] || '',
                        Quantity: s.Quantity
                    })));
                }
            }
        } catch (e) { console.error(e); alert('خطأ في تحميل كشف التوزيع'); }
        finally { setLoading(false); }
    };

    const getNextOrderId = async () => {
        try {
            const res = await fetch(`${API_URL}/api/getData/64`);
            const json = await res.json();
            if (json.success && json.data?.[0]) {
                const id = json.data[0]['NextID'] || Object.values(json.data[0])[0];
                setOrderId(Number(id) || 1);
            }
        } catch {}
    };

    const fetchStock = async (itemName: string) => {
        if (!schoolName || !itemName) return 0;
        try {
            const res = await fetch(`${API_URL}/api/search2?SCHER1=${encodeURIComponent(schoolName)}&SCHER2=${encodeURIComponent(itemName)}&inpot=22`);
            const json = await res.json();
            if (json.success && json.data?.[0]) return json.data[0]['الرصيد المتاح'] || 0;
            return 0;
        } catch { return 0; }
    };

    // Issuance Logic
    const addIssuanceRow = () => setIssuanceRows(prev => [...prev, { tempId: Date.now(), ItemID: null, ItemName: '', Unit: '', StoreID: null, Quantity: 1, Stock: null, isExisting: false }]);
    
    const handleIssuanceChange = async (tempId: number, field: string, value: any) => {
        setIssuanceRows(prev => prev.map(row => {
            if (row.tempId === tempId) {
                let updated = { ...row, [field]: value };
                if (field === 'ItemID') {
                    const item = items.find(i => i['كود الصنف'] == value);
                    updated.ItemName = item ? item['اسم الصنف'] : '';
                    updated.Unit = item ? item['الوحدة'] : '';
                    updated.Stock = null;
                }
                if (field === 'StoreID' && row.ItemID && value) {
                    fetchStock(row.ItemName).then(stock => {
                        setIssuanceRows(current => current.map(r => r.tempId === tempId ? {...r, Stock: stock} : r));
                    });
                }
                return updated;
            }
            return row;
        }));
    };
    
    // Distribution Logic
    useEffect(() => {
        if (distItemId) {
            const item = items.find(i => i['كود الصنف'] == distItemId);
            const name = item ? item['اسم الصنف'] : '';
            fetchStock(name).then(setDistItemStock);
        } else { setDistItemStock(null); }
    }, [distItemId]);

    const handleLoadStudents = async () => {
        if (!selectedGradeId || !distItemId) return alert('اختر الصف والصنف أولاً');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/search/scher5int`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ SCHER1: schoolId, SCHER2: mrahelId, SCHER3: yearId, SCHER4: selectedGradeId, SCHER5: distItemId, INPOT: 1 })
            });
            const json = await res.json();
            if (json.success && json.data) {
                setStudentsList(json.data.map((s: any) => ({...s, Quantity: 0})));
            }
        } catch (e) { alert('خطأ'); } finally { setLoading(false); }
    };

    const handleStudentQtyChange = (studentId: number, qty: number) => {
        setStudentsList(prev => prev.map(s => s.StudentID === studentId ? {...s, Quantity: qty} : s));
    };
    
    // === Save ===
    const handleSave = async () => {
        if (!employeeId) return alert('اختر الموظف المستلم');
        setLoading(true);

        try {
            // 1. Header
            if (!isEditing) {
                const headerRes = await fetch(`${API_URL}/api/issuance-orders/manage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, date: orderDate, schoolId, employeeId, sideName: custodyType, inpout: 1 })
                });
                const headerJson = await headerRes.json();
                if (!headerJson.success) throw new Error(headerJson.error);
            }

            // 2. Logic for Saving based on Active Tab
            if (activeTab === 'issuance') {
                for (const row of issuanceRows) {
                    if (row.ItemID && row.StoreID && row.Quantity > 0) {
                        const operation = isEditing && row.isExisting ? 3 : 2;
                        await fetch(`${API_URL}/api/issuance-orders/manage`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId, sanefId: row.ItemID, storeId: row.StoreID, qty: row.Quantity, unit: row.Unit, inpout: operation })
                        });
                    }
                }
            } else {
                if (!distItemId || !distStoreId) {
                    alert('اختر الصنف والمخزن في التوزيع');
                    setLoading(false);
                    return;
                }
                
                for (const student of studentsList) {
                    if (student.Quantity > 0) {
                        await fetch(`${API_URL}/api/issuance-orders/manage`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId, studentId: student.StudentID, sanefId: distItemId, storeId: distStoreId, qty: student.Quantity, unit: items.find(i => i['كود الصنف'] == distItemId)?.['الوحدة'] || '', inpout: 5 })
                        });
                    }
                }
            }

            alert(`✅ تم حفظ الإذن رقم ${orderId}`);
            if (!isEditing) {
                setOrderId(prev => prev + 1); setIssuanceRows([]); setStudentsList([]); setEmployeeId(null);
            }
        } catch (e: any) { alert(e.message || 'خطأ'); } finally { setLoading(false); }
    };

    const totalRequested = studentsList.reduce((acc, s) => acc + s.Quantity, 0);

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={{ margin: 0 }}>📤 {isEditing ? `تعديل إذن رقم ${orderId}` : 'إذن الصرف والتوزيع'}</h2>
                <p>النوع: <strong>{activeTab === 'issuance' ? 'صرف عادي' : 'توزيع طلاب'}</strong></p>
            </div>

            <div style={cardStyle} className="no-print">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>تاريخ الإذن</label>
                        <input style={inputStyle} type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>الموظف المستلم</label>
                        <select style={inputStyle} value={employeeId || ''} onChange={e => setEmployeeId(Number(e.target.value))}>
                            <option value="">اختر الموظف</option>
                            {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontWeight: 'bold' }}>نوع العهدة</label>
                        <select style={inputStyle} value={custodyType} onChange={e => setCustodyType(e.target.value)}>
                            <option value="عهدة شخصية">عهدة شخصية</option>
                            <option value="عهدة فرعية">عهدة فرعية</option>
                            <option value="عهدة طلاب">عهدة طلاب</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '10px' }} className="no-print">
                <button onClick={() => setActiveTab('issuance')} style={{...btn, background: activeTab === 'issuance' ? '#dc2626' : '#ccc', marginRight:'5px'}}>📦 إذن صرف عادي</button>
                <button onClick={() => setActiveTab('distribution')} style={{...btn, background: activeTab === 'distribution' ? '#2563eb' : '#ccc'}}>👥 كشف توزيع</button>
            </div>

            <div style={cardStyle}>
                {activeTab === 'issuance' ? (
                    <>
                        <button onClick={addIssuanceRow} style={{...btn, background: '#16a34a', marginBottom: '10px'}}>➕ إضافة صنف</button>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr><th style={thStyle}>الصنف</th><th style={thStyle}>المخزن</th><th style={thStyle}>الرصيد المتاح</th><th style={thStyle}>الكمية</th><th style={thStyle}>الوحدة</th><th style={thStyle}>حذف</th></tr></thead>
                            <tbody>
                                {issuanceRows.map(row => (
                                    <tr key={row.tempId}>
                                        <td style={tdStyle}><select value={row.ItemID || ''} onChange={e => handleIssuanceChange(row.tempId, 'ItemID', e.target.value)} style={inputStyle}><option value="">اختر</option>{items.map(i => <option key={i['كود الصنف']} value={i['كود الصنف']}>{i['اسم الصنف']}</option>)}</select></td>
                                        <td style={tdStyle}><select value={row.StoreID || ''} onChange={e => handleIssuanceChange(row.tempId, 'StoreID', e.target.value)} style={inputStyle}><option value="">اختر</option>{stores.map(s => <option key={s['الرقم']} value={s['الرقم']}>{s['اسم المخزن']}</option>)}</select></td>
                                        <td style={{...tdStyle, fontWeight:'bold', color: (row.Stock !== null && row.Quantity > row.Stock) ? '#dc2626' : '#16a34a'}}>{row.Stock !== null ? row.Stock : '-'}</td>
                                        <td style={tdStyle}><input type="number" value={row.Quantity} onChange={e => handleIssuanceChange(row.tempId, 'Quantity', e.target.value)} style={{...inputStyle, width:'70px'}} /></td>
                                        <td style={tdStyle}>{row.Unit}</td>
                                        <td style={tdStyle}><button onClick={() => setIssuanceRows(p => p.filter(r => r.tempId !== row.tempId))} style={{color:'red'}}>X</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 150px', gap: '10px', marginBottom: '20px' }}>
                            <div><label style={{fontWeight:'bold'}}>المخزن</label><select value={distStoreId || ''} onChange={e => setDistStoreId(Number(e.target.value))} style={inputStyle}><option value="">اختر</option>{stores.map(s => <option key={s['الرقم']} value={s['الرقم']}>{s['اسم المخزن']}</option>)}</select></div>
                            <div><label style={{fontWeight:'bold'}}>الصنف</label><select value={distItemId || ''} onChange={e => setDistItemId(Number(e.target.value))} style={inputStyle}><option value="">اختر</option>{items.map(i => <option key={i['كود الصنف']} value={i['كود الصنف']}>{i['اسم الصنف']}</option>)}</select></div>
                            <div><label style={{fontWeight:'bold'}}>الرصيد المتاح</label><div style={{...inputStyle, background:'#f3f4f6', fontWeight:'bold'}}>{distItemStock !== null ? distItemStock : '-'}</div></div>
                            <div style={{alignSelf:'flex-end'}}><button onClick={handleLoadStudents} style={{...btn, background:'#2563eb'}}>عرض الطلاب</button></div>
                        </div>
                        <div style={{marginBottom:'10px'}}><label style={{fontWeight:'bold'}}>اختر الصف:</label><select value={selectedGradeId || ''} onChange={e => setSelectedGradeId(Number(e.target.value))} style={{...inputStyle, width:'200px', marginRight:'10px'}}><option value="">اختر</option>{grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}</select></div>
                        <div style={{marginBottom: '10px', fontWeight: 'bold', color: totalRequested > (distItemStock || 0) ? 'red' : 'green', background: '#f8f9fa', padding: '10px'}}>إجمالي الكمية المطلوبة: {totalRequested} (المتاح: {distItemStock ?? '-'})</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr><th style={thStyle}>م</th><th style={thStyle}>اسم الطالب</th><th style={thStyle}>الرقم القومى</th><th style={thStyle}>الكمية</th></tr></thead>
                            <tbody>
                                {studentsList.length === 0 ? (<tr><td colSpan={4} style={{textAlign:'center', color:'#888'}}>اختر الصف والصنف واضغط عرض الطلاب</td></tr>) : (
                                    studentsList.map((s, i) => (
                                        <tr key={s.StudentID}>
                                            <td style={tdStyle}>{i+1}</td><td style={tdStyle}>{s['اسم الطالب']}</td><td style={tdStyle}>{s['الرقم القومى']}</td>
                                            <td style={tdStyle}><input type="number" value={s.Quantity} onChange={e => handleStudentQtyChange(s.StudentID, Number(e.target.value))} style={{...inputStyle, width:'80px'}} /></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            <button onClick={handleSave} disabled={loading} style={{...btn, background: '#0ea5e9', width:'100%', padding:'15px', fontSize:'16px'}}>
                {loading ? 'جاري الحفظ...' : '💾 حفظ الإذن'}
            </button>
        </div>
    );
}

// === 2. المكون الرئيسي (Wrapper) ===
export default function StoreOutPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحميل صفحة الصرف...</div>}>
            <StoreOutContent />
        </Suspense>
    );
}