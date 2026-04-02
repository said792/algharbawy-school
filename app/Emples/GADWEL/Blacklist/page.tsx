'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore'; 
import { API_URL } from '@/lib/config';

// === Types ===
interface Employee {
    id: number;
    name: string;
}

// ✅ تعديل النوع ليتطابق مع أسماء الأعمدة العربية من API 78
interface Period {
    'الرقم': number;
    'الحصة': string;
    'بداية الحصة': string;
    'نهاية الحصة': string;
}

interface RestrictionItem {
    ID: number;
    EmploeArName: string;
    PeriodName: string;
}

export default function BlackListPage() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId;

    // === State ===
    const [restrictions, setRestrictions] = useState<RestrictionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
    
    const [teachers, setTeachers] = useState<Employee[]>([]);
    const [periods, setPeriods] = useState<Period[]>([]); // ✅ النوع المعدل

    const [formData, setFormData] = useState({
        id: 0,
        teacherId: '',
        periodId: '',
    });

    // === 1. جلب البيانات الأساسية ===
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            
            // جلب القيود - رقم 82
            try {
                const res = await fetch(`${API_URL}/api/getData/82`);
                const data = await res.json();
                if (data.success) setRestrictions(data.data || []);
                else if (data.data) setRestrictions(data.data);
            } catch (e) { console.error(e); }

            // جلب المعلمين - رقم 14
            if (schoolId) {
                try {
                    const resEmp = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
                    const jsonEmp = await resEmp.json();
                    if (jsonEmp.success && Array.isArray(jsonEmp.data)) setTeachers(jsonEmp.data);
                } catch (err) { console.error(err); }
            }

            // ✅ جلب الحصص - رقم 78
            try {
                const resPeriods = await fetch(`${API_URL}/api/getData/78`);
                const jsonPeriods = await resPeriods.json();
                if (jsonPeriods.success) {
                    setPeriods(jsonPeriods.data || []);
                    console.log(' الحصص:', jsonPeriods.data); // للتحقق
                } else if (jsonPeriods.data) {
                    setPeriods(jsonPeriods.data);
                }
            } catch (err) { 
                console.error('خطأ في جلب الحصص:', err); 
            }

            setLoading(false);
        };
        fetchInitialData();
    }, [schoolId]);

    // === Helpers ===
    const getNextId = async (): Promise<number> => {
        try {
            const res = await fetch(`${API_URL}/api/getData/81`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                return Number(Object.values(data.data[0])[0]) || 1;
            }
            return 1;
        } catch { return 1; }
    };

    // ✅ تعديل البحث ليتطابق مع الاسم العربي
    const findTeacherId = (name: string) => {
        return teachers.find(t => t.name === name)?.id || null;
    };

    // ✅ تعديل البحث ليتطابق مع "الحصة" بدلاً من PeriodName
    const findPeriodId = (name: string) => {
        return periods.find(p => p['الحصة'] === name)?.['الرقم'] || null;
    };

    const openAddModal = async () => {
        const nextId = await getNextId();
        setFormData({ id: nextId, teacherId: '', periodId: '' });
        setModalMode('add');
        setIsModalOpen(true);
    };

    const openEditModal = (item: RestrictionItem) => {
        const tId = findTeacherId(item.EmploeArName);
        const pId = findPeriodId(item.PeriodName); // ✅ يستخدم الدالة المعدلة

        setFormData({
            id: item.ID,
            teacherId: tId ? String(tId) : '',
            periodId: pId ? String(pId) : '',
        });
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const openDeleteModal = (item: RestrictionItem) => {
        const tId = findTeacherId(item.EmploeArName);
        const pId = findPeriodId(item.PeriodName); // ✅ يستخدم الدالة المعدلة

        setFormData({
            id: item.ID,
            teacherId: tId ? String(tId) : '',
            periodId: pId ? String(pId) : '',
        });
        setModalMode('delete');
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (modalMode !== 'delete') {
            if (!formData.teacherId || !formData.periodId) {
                alert('يرجى اختيار المعلم والحصة');
                return;
            }
        }

        let operation = 2;
        if (modalMode === 'edit') operation = 3;
        if (modalMode === 'delete') operation = 4;

        try {
            const res = await fetch(`${API_URL}/api/manage-three-int`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sch1: formData.id,
                    sch2: parseInt(formData.teacherId),
                    sch3: parseInt(formData.periodId),
                    input: operation
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Server Error:", errorText);
                alert(`حدث خطأ: ${res.status}`);
                return;
            }

            const result = await res.json();
            
            if (result.success) {
                alert(result.message);
                setIsModalOpen(false);
                window.location.reload();
            } else {
                alert(result.error || result.message || 'فشلت العملية');
            }
        } catch (err) {
            console.error("Network Error:", err);
            alert('حدث خطأ في الاتصال');
        }
    };

    // === Styles ===
    const headerStyle: React.CSSProperties = { 
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
        borderRadius: 16, padding: 24, marginBottom: 24, 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
    };
    const cardStyle: React.CSSProperties = { 
        background: 'white', borderRadius: 16, padding: 20, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)' 
    };
    const addBtnStyle: React.CSSProperties = { 
        background: 'white', color: '#dc2626', border: 'none', 
        padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 
    };
    const editBtnStyle: React.CSSProperties = { 
        marginLeft: 5, background: '#eff6ff', color: '#2563eb', 
        border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' 
    };
    const deleteBtnStyle: React.CSSProperties = { 
        background: '#fef2f2', color: '#dc2626', border: 'none', 
        padding: '6px 12px', borderRadius: 8, cursor: 'pointer' 
    };
    const overlayStyle: React.CSSProperties = { 
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 
    };
    const modalStyle: React.CSSProperties = { 
        background: 'white', padding: 24, borderRadius: 16, 
        width: 450, maxHeight: '90vh', overflowY: 'auto' 
    };
    const inputStyle: React.CSSProperties = { 
        width: '100%', padding: 10, borderRadius: 8, 
        border: '1px solid #ccc', fontSize: '14px' 
    };
    const labelStyle: React.CSSProperties = { 
        display: 'block', marginBottom: '5px', 
        fontWeight: '600', fontSize: '13px', color: '#475569' 
    };
    const modalActionsStyle: React.CSSProperties = { 
        marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 
    };
    const cancelBtnStyle: React.CSSProperties = { 
        padding: '10px 20px', background: '#f1f5f9', color: '#475569', 
        border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' 
    };
    const saveBtnStyle: React.CSSProperties = { 
        padding: '10px 22px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
        color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, 
        cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' 
    };
    const deleteConfirmBtnStyle: React.CSSProperties = { 
        padding: '10px 22px', background: '#dc2626', color: 'white', 
        border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' 
    };
    const thStyle: React.CSSProperties = { 
        padding: 12, borderBottom: '1px solid #e5e7eb', 
        textAlign: 'right', color: '#64748b', fontWeight: 600 
    };
    const tdStyle: React.CSSProperties = { 
        padding: 12, borderBottom: '1px solid #f1f5f9', color: '#334155' 
    };
    const warningBadgeStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#fef2f2',
        color: '#dc2626',
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: '12px',
        fontWeight: 600
    };

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <h2 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '24px' }}>🚫</span>
                        القائمة السوداء للمعلمين
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0 0' }}>
                        تحديد الحصص التي لا يمكن للمعلم التدريس فيها
                    </p>
                </div>
                <button style={addBtnStyle} onClick={openAddModal}>
                    ➕ إضافة قيد جديد
                </button>
            </div>

            {/* Info Box */}
            <div style={{ 
                background: '#fff7ed', border: '1px solid #fed7aa', 
                borderRadius: 12, padding: '15px 20px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 10 
            }}>
                <span style={{ fontSize: '20px' }}>ℹ️</span>
                <p style={{ margin: 0, color: '#9a3412', fontSize: '14px' }}>
                    يتم استخدام هذه القائمة لمنع المعلم من التدريس في حصص معينة (مثلاً: الحصة الأولى أو الأخيرة)
                </p>
            </div>

            {/* Table */}
            <div style={cardStyle}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</div>
                ) : restrictions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
                        <p>لا توجد قيود مسجلة في القائمة السوداء</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={thStyle}>الرقم</th>
                                <th style={thStyle}>المعلم</th>
                                <th style={thStyle}>الحصة المحظورة</th>
                                <th style={thStyle}>الحالة</th>
                                <th style={thStyle}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {restrictions.map((item, index) => (
                                <tr key={item.ID || index} style={{ transition: 'background 0.2s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={tdStyle}>{item.ID}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{item.EmploeArName}</td>
                                    <td style={tdStyle}>{item.PeriodName}</td>
                                    <td style={tdStyle}>
                                        <span style={warningBadgeStyle}>
                                            🚫 محظور
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <button style={editBtnStyle} onClick={() => openEditModal(item)}>
                                            ✏️ تعديل
                                        </button>
                                        <button style={deleteBtnStyle} onClick={() => openDeleteModal(item)}>
                                            🗑️ حذف
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={overlayStyle} onClick={() => setIsModalOpen(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>
                                {modalMode === 'add' ? '➕' : modalMode === 'edit' ? '✏️' : '🗑️'}
                            </span>
                            {modalMode === 'add' 
                                ? 'إضافة قيد جديد' 
                                : modalMode === 'edit' 
                                    ? 'تعديل القيد' 
                                    : 'حذف القيد'
                            }
                        </h3>

                        {modalMode !== 'delete' ? (
                            <>
                                {/* ID */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={labelStyle}>الرقم</label>
                                    <input 
                                        value={formData.id} 
                                        disabled 
                                        style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} 
                                    />
                                </div>

                                {/* المعلم */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={labelStyle}>👨‍🏫 المعلم</label>
                                    <select 
                                        value={formData.teacherId} 
                                        onChange={e => setFormData({ ...formData, teacherId: e.target.value })} 
                                        style={inputStyle}
                                    >
                                        <option value="">اختر المعلم...</option>
                                        {teachers.map((t, i) => (
                                            <option key={t.id || i} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* ✅ الحصة - معدل ليتطابق مع الأسماء العربية */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={labelStyle}>⏰ الحصة المحظورة</label>
                                    <select
                                        value={formData.periodId}
                                        onChange={e => setFormData({ ...formData, periodId: e.target.value })}
                                        style={inputStyle}
                                    >
                                        <option value="">اختر الحصة...</option>
                                        {periods.map((p, i) => (
                                            <option key={p['الرقم'] || i} value={p['الرقم']}>
                                                {p['الحصة']} ({p['بداية الحصة']} - {p['نهاية الحصة']})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* تنبيه */}
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: 8,
                                    padding: '10px 15px',
                                    marginTop: '15px'
                                }}>
                                    <p style={{ margin: 0, color: '#dc2626', fontSize: '13px' }}>
                                        ⚠️ سيتم منع المعلم المحدد من التدريس في هذه الحصة
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
                                <p style={{ fontSize: '16px', color: '#334155', marginBottom: '10px' }}>
                                    هل أنت متأكد من حذف هذا القيد؟
                                </p>
                                <p style={{ fontSize: '14px', color: '#64748b' }}>
                                    سيتمكن المعلم من التدريس في هذه الحصة مرة أخرى
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={modalActionsStyle}>
                            <button style={cancelBtnStyle} onClick={() => setIsModalOpen(false)}>
                                إلغاء
                            </button>
                            <button
                                style={modalMode === 'delete' ? deleteConfirmBtnStyle : saveBtnStyle}
                                onClick={handleSubmit}
                            >
                                {modalMode === 'delete' ? '🗑️ حذف' : '💾 حفظ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}