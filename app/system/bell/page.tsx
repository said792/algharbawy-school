'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '@/lib/config';

// === Types ===
interface Period {
    PeriodID: number;
    PeriodName: string;
    StartTime: string; // Format: 'HH:mm:ss' or 'HH:mm'
    EndTime: string;
}

// === Styles (باستخدام any لتجنب مشاكل التوافق) ===
const headerStyle: any = {
    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const cardStyle: any = {
    background: 'white',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
};

const addBtnStyle: any = {
    background: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600
};

const editBtnStyle: any = {
    marginRight: 8,
    background: '#eff6ff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 8,
    cursor: 'pointer'
};

const deleteBtnStyle: any = {
    background: '#fef2f2',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 8,
    cursor: 'pointer'
};

const overlayStyle: any = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50
};

const modalStyle: any = {
    background: 'white',
    padding: 24,
    borderRadius: 16,
    width: 400,
    maxWidth: '90%'
};

const inputStyle: any = {
    width: '100%',
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
    border: '1px solid #ccc'
};

const modalActionsStyle: any = {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12
};

const cancelBtnStyle: any = {
    padding: '10px 20px',
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer'
};

const saveBtnStyle: any = {
    padding: '10px 22px',
    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
};

const deleteConfirmBtnStyle: any = {
    padding: '10px 22px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
};

const thStyle: any = {
    padding: 12,
    borderBottom: '1px solid #e5e7eb'
};

const tdStyle: any = {
    padding: 12,
    textAlign: 'center'
};

// Special styles for Bell interface
const clockCardStyle: any = {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    borderRadius: 16,
    padding: 30,
    textAlign: 'center',
    marginBottom: 24,
    boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
};

const statusCardStyle: any = {
    borderLeft: '8px solid',
    padding: 20,
    borderRadius: 8,
    background: 'white',
    marginBottom: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
};

export default function SystemBellPage() {
    // === State ===
    const [periods, setPeriods] = useState<Period[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ id: 0, name: '', startTime: '', endTime: '' });

    // Bell State
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [isSystemActive, setIsSystemActive] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
    const [nextPeriod, setNextPeriod] = useState<Period | null>(null);
    const lastTriggeredRef = useRef<{ time: string; type: 'start' | 'end' } | null>(null);

    // === Effects ===

    // 1. Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // Using Bell API endpoint
            const res = await fetch(`${API_URL}/api/periods`);
            const data = await res.json();
            
            if (data.success && data.data) {
                setPeriods(data.data);
            } else {
                setPeriods([]);
            }
        } catch (err) {
            console.error(err);
            alert('فشل تحميل البيانات');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Clock & Schedule Check
    useEffect(() => {
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        const checkInterval = setInterval(() => {
            checkSchedule();
        }, 1000);

        return () => {
            clearInterval(clockInterval);
            clearInterval(checkInterval);
        };
    }, [isSystemActive, periods]);

    // === Logic ===

    const speak = (text: string) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const checkSchedule = () => {
        if (!isSystemActive || periods.length === 0) return;

        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

        let foundCurrent = false;

        periods.forEach((period) => {
            const startTimeClean = period.StartTime.substring(0, 5); // HH:mm
            const endTimeClean = period.EndTime.substring(0, 5);     // HH:mm

            // Start Trigger
            if (currentTimeStr === startTimeClean) {
                if (lastTriggeredRef.current?.time !== startTimeClean || lastTriggeredRef.current?.type !== 'start') {
                    console.log(`Ring: Start of ${period.PeriodName}`);
                    speak(`بدأت الحصة ${period.PeriodName}`);
                    setCurrentPeriod(period);
                    lastTriggeredRef.current = { time: startTimeClean, type: 'start' };
                }
            }

            // End Trigger
            if (currentTimeStr === endTimeClean) {
                if (lastTriggeredRef.current?.time !== endTimeClean || lastTriggeredRef.current?.type !== 'end') {
                    console.log(`Ring: End of ${period.PeriodName}`);
                    speak(`انتهت الحصة ${period.PeriodName}`);
                    
                    const currentIndex = periods.findIndex(p => p.PeriodID === period.PeriodID);
                    if (currentIndex < periods.length - 1) {
                        const nextP = periods[currentIndex + 1];
                        setTimeout(() => {
                            speak(`يبدأ الآن الطابور، ${nextP.PeriodName}`);
                        }, 3000);
                    }
                    
                    lastTriggeredRef.current = { time: endTimeClean, type: 'end' };
                    foundCurrent = false;
                }
            }

            // Determine Active Period (for display)
            if (currentTimeStr > startTimeClean && currentTimeStr < endTimeClean) {
                setCurrentPeriod(period);
                foundCurrent = true;
            }
        });

        if (!foundCurrent) {
            const next = periods.find(p => p.StartTime.substring(0, 5) > currentTimeStr);
            setNextPeriod(next || null);
        }
    };

    // 3. Modal Handlers (Reuse from PeriodsListPage)
    const getNextId = async (): Promise<number> => {
        try {
            const res = await fetch(`${API_URL}/api/getData/77`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                // Value might be unnamed column
                return Number(Object.values(data.data[0])[0]) || 1;
            }
        } catch { return 1; }
        return 1;
    };

    const openAddModal = async () => {
        const nextId = await getNextId();
        setFormData({ id: nextId, name: '', startTime: '', endTime: '' });
        setModalMode('add');
        setIsModalOpen(true);
    };

    const openEditModal = (p: Period) => {
        setFormData({
            id: p.PeriodID,
            name: p.PeriodName,
            startTime: p.StartTime?.substring(0, 5) || '',
            endTime: p.EndTime?.substring(0, 5) || ''
        });
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const openDeleteModal = (p: Period) => {
        setFormData({
            id: p.PeriodID,
            name: p.PeriodName,
            startTime: '',
            endTime: ''
        });
        setModalMode('delete');
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (modalMode !== 'delete') {
            if (!formData.name) {
                alert('يرجى إدخال اسم الحصة');
                return;
            }
            if (formData.endTime <= formData.startTime) {
                alert('وقت النهاية لازم يكون بعد وقت البداية');
                return;
            }
        }

        let operation = 1; // Add
        if (modalMode === 'edit') operation = 2;
        if (modalMode === 'delete') operation = 3;

        try {
            const res = await fetch(`${API_URL}/api/period`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: formData.id,
                    name: formData.name,
                    startTime: formData.startTime + ':00',
                    endTime: formData.endTime + ':00',
                    inpot: operation
                })
            });

            const result = await res.json();
            if (result.success) {
                alert(modalMode === 'delete' ? 'تم الحذف' : 'تم الحفظ بنجاح');
                setIsModalOpen(false);
                fetchData();
            } else {
                alert(result.message || 'فشلت العملية');
            }
        } catch (err) {
            console.log(err);
            alert('حدث خطأ');
        }
    };

    const formatTimeDisplay = (timeStr: string) => {
        if (!timeStr) return '--:--';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'م' : 'ص';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm}`;
    };

    return (
        <div style={{ padding: '20px', direction: 'rtl', minHeight: '100vh' }}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <h2 style={{ color: 'white', margin: 0 }}>نظام الجرس المدرسي</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                        إدارة الفترات الزمنية (الحصص)
                    </p>
                </div>
                <button style={addBtnStyle} onClick={openAddModal}>
                    إضافة حصة
                </button>
            </div>

            {/* Table Card */}
            <div style={cardStyle}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        جاري التحميل...
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={thStyle}>الرقم</th>
                                <th style={thStyle}>الحصة</th>
                                <th style={thStyle}>الوقت</th>
                                <th style={thStyle}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>
                                        لا توجد بيانات
                                    </td>
                                </tr>
                            ) : (
                                periods.map((p, index) => (
                                    <tr key={p.PeriodID || index}>
                                        <td style={tdStyle}>{p.PeriodID}</td>
                                        <td style={tdStyle}>{p.PeriodName}</td>
                                        <td style={tdStyle}>
                                            {formatTimeDisplay(p.StartTime)} - {formatTimeDisplay(p.EndTime)}
                                        </td>
                                        <td style={tdStyle}>
                                            <button style={editBtnStyle} onClick={() => openEditModal(p)}>
                                                تعديل
                                            </button>
                                            <button style={deleteBtnStyle} onClick={() => openDeleteModal(p)}>
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Bell Interface */}
            <div style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', borderRadius: 20, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    {/* Clock Card */}
                    <div style={clockCardStyle}>
                        <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>
                            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>الساعة الحالية</div>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                            onClick={() => setIsSystemActive(!isSystemActive)}
                            style={{
                                ...addBtnStyle,
                                flex: 1,
                                padding: '15px',
                                fontSize: '18px',
                                background: isSystemActive ? '#ef4444' : '#10b981',
                                color: 'white'
                            }}
                        >
                            {isSystemActive ? 'إيقاف النظام' : 'تشغيل النظام'}
                        </button>
                        <button 
                            onClick={() => speak("بدأت الحصة الأولى، انتبه للطابور")}
                            style={{ ...addBtnStyle, background: '#6366f1', color: 'white' }}
                        >
                            تجربة الصوت
                        </button>
                    </div>

                    {/* Monitoring Indicator */}
                    {isSystemActive && (
                        <div style={{ 
                            background: '#ecfdf5', 
                            padding: '10px 15px', 
                            borderRadius: 8, 
                            color: '#047857', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            border: '1px solid #a7f3d0'
                        }}>
                            <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                            النظام يراقب الوقت حالياً...
                        </div>
                    )}

                    {/* Status Card */}
                    {currentPeriod ? (
                        <div style={{ ...statusCardStyle, borderLeft: '8px solid #10b981' }}>
                            <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '5px' }}>🔴 الحصة الحالية جارية</div>
                            <h3 style={{ fontSize: '24px', margin: '0' }}>{currentPeriod.PeriodName}</h3>
                            <div style={{ fontSize: '20px', color: '#4b5563' }}>
                                {formatTimeDisplay(currentPeriod.StartTime)} - {formatTimeDisplay(currentPeriod.EndTime)}
                            </div>
                        </div>
                    ) : (
                        <div style={{ ...statusCardStyle, borderLeft: '8px solid #f59e0b' }}>
                            <div style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '5px' }}>⏳ استراحة / طابور</div>
                            {nextPeriod ? (
                                <div style={{ color: '#64748b', fontSize: '18px' }}>
                                    القادمة: {nextPeriod.PeriodName}
                                </div>
                            ) : (
                                <div style={{ color: '#9ca3af' }}>انتهى اليوم الدراسي</div>
                            )}
                            <div style={{ fontSize: '20px', color: '#9ca3af' }}>
                                --:--
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={overlayStyle} onClick={() => setIsModalOpen(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 20 }}>
                            {modalMode === 'add' && 'إضافة حصة جديدة'}
                            {modalMode === 'edit' && 'تعديل الحصة'}
                            {modalMode === 'delete' && 'حذف الحصة'}
                        </h3>

                        {modalMode !== 'delete' ? (
                            <>
                                <input 
                                    value={formData.id} 
                                    readOnly 
                                    disabled 
                                    placeholder="الرقم (تلقائي)" 
                                    style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} 
                                />
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="اسم الحصة"
                                    style={inputStyle}
                                />
                                
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <label style={{ flex: 1 }}>من:</label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                    <label style={{ flex: 1 }}>إلى:</label>
                                    <input 
                                        type="time"
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                </div>
                            </>
                        ) : (
                            <p style={{ marginBottom: 20, color: '#dc2626', fontWeight: 'bold' }}>
                                هل أنت متأكد من حذف الحصة "{formData.name}" ؟
                            </p>
                        )}

                        <div style={modalActionsStyle}>
                            <button
                                style={cancelBtnStyle}
                                onClick={() => setIsModalOpen(false)}
                            >
                                إلغاء
                            </button>

                            <button
                                style={
                                    modalMode === 'delete'
                                        ? deleteConfirmBtnStyle
                                        : saveBtnStyle
                                }
                                onClick={handleSubmit}
                            >
                                {modalMode === 'delete' ? 'حذف' : 'حفظ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}