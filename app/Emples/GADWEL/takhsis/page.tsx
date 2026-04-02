'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore'; 
import { API_URL } from '@/lib/config';

// === Types ===
interface Employee {
    id: number;
    name: string;
}

interface Subject {
    'الرقم': number;
    'المادة': string;
}

interface Grade {
    'الرقم': number;
    'الصف الدراسى': string;
}

interface ClassItem {
    'الرقم': number;
    'الفصل': string;
}

interface Assignment {
    'الرقم': number;
    'المعلم': string;
    'المادة': string;
    'الفصل': string;
    'الصف': string;
    'نصاب الفصل': number;
}

export default function TeacherAssignmentsPage() {
    const { user, work } = useAuthStore();
    const schoolId = user?.schoolId;
    const schoolName = user?.schoolName;
    const stageName = work?.stageName;

    // === State ===
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete'>('add');
    
    const [teachers, setTeachers] = useState<Employee[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);

    const [loadingClasses, setLoadingClasses] = useState(false);
    const [editingItem, setEditingItem] = useState<Assignment | null>(null);

    // ✅ حالات النصاب الجديدة
    const [teacherQuota, setTeacherQuota] = useState<number | null>(null);
    const [isFetchingQuota, setIsFetchingQuota] = useState(false);

    const [formData, setFormData] = useState({
        id: 0,
        teacherId: '',
        subjectId: '',
        classId: '',
        gradeId: '', 
        periods: ''
    });

    // === 1. جلب البيانات الأساسية ===
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const resAssign = await fetch(`${API_URL}/api/getData/80`);
                const dataAssign = await resAssign.json();
                if (dataAssign.data) setAssignments(dataAssign.data);
            } catch (e) { console.error(e); }

            if (schoolId) {
                try {
                    const resEmp = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
                    const jsonEmp = await resEmp.json();
                    if (jsonEmp.success && Array.isArray(jsonEmp.data)) setTeachers(jsonEmp.data);
                } catch (err) { console.error(err); }
            }

            try {
                const resSub = await fetch(`${API_URL}/api/getData/35`);
                const jsonSub = await resSub.json();
                if (jsonSub.success) setSubjects(jsonSub.data || []);
            } catch (err) { console.error(err); }

            if (schoolName && stageName) {
                try {
                    const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                    const json = await res.json();
                    if (json.success) setGrades(json.data);
                } catch(e) { console.error(e); }
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [schoolId, schoolName, stageName]);

    // === 2. جلب الفصول عند تغيير الصف ===
    useEffect(() => {
        const fetchClasses = async () => {
            const selectedGradeObj = grades.find(g => g['الرقم'] === Number(formData.gradeId));
            const gradeName = selectedGradeObj ? selectedGradeObj['الصف الدراسى'] : '';

            if (!gradeName || !schoolName || !stageName) { setClasses([]); return; }

            setLoadingClasses(true);
            try {
                const res = await fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${gradeName}&inpot=3`);
                const json = await res.json();
                if (json.success) setClasses(json.data);
            } catch (err) { console.error(err); setClasses([]); }
            finally { setLoadingClasses(false); }
        };
        
        if (formData.gradeId) fetchClasses();
        setFormData(prev => ({ ...prev, classId: '' }));
    }, [formData.gradeId, schoolName, stageName, grades]);

    // === 3. ملء حقل الفصل تلقائياً بعد وصول بيانات الفصول ===
    useEffect(() => {
        if (modalMode === 'edit' && editingItem && classes.length > 0 && !formData.classId) {
            const classId = classes.find(c => c['الفصل'] === editingItem['الفصل'])?.['الرقم'];
            if (classId) {
                setFormData(prev => ({ ...prev, classId: String(classId) }));
            }
        }
    }, [classes, editingItem, modalMode, formData.classId]);

    // === Helpers ===
    const getNextId = async (): Promise<number> => {
        try {
            const res = await fetch(`${API_URL}/api/getData/79`);
            const data = await res.json();
            if (data.data && data.data.length > 0) return Number(Object.values(data.data[0])[0]) || 1;
            return 1;
        } catch { return 1; }
    };

    const findTeacherId = (name: string) => teachers.find(t => t.name === name)?.id;
    const findSubjectId = (name: string) => subjects.find(s => s['المادة'] === name)?.['الرقم'];

    // ✅ دالة جلب النصاب عند تغيير المعلم
    const handleTeacherChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        setFormData({ ...formData, teacherId: selectedId });
        setTeacherQuota(null); // تصفير النصاب القديم
        
        if (selectedId) {
            const teacher = teachers.find(t => String(t.id) === selectedId);
            if (teacher) {
                setIsFetchingQuota(true);
                try {
                    // جلب النصاب من API رقم 12
                    const res = await fetch(`${API_URL}/api/search?inpot=12&scher=${encodeURIComponent(teacher.name)}`);
                    const json = await res.json();
                    if (json.success && json.data && json.data.length > 0) {
                        const quota = json.data[0]['عدد الحصص'];
                        setTeacherQuota(quota); // ممكن يكون Null من الداتا بيز
                    } else {
                        setTeacherQuota(null);
                    }
                } catch (err) {
                    console.error(err);
                    setTeacherQuota(null);
                }
                setIsFetchingQuota(false);
            }
        }
    };

    const openAddModal = async () => {
        const nextId = await getNextId();
        setEditingItem(null);
        setTeacherQuota(null); // ✅ تصفير النصاب عند فتح الإضافة
        setFormData({ id: nextId, teacherId: '', subjectId: '', classId: '', gradeId: '', periods: '' });
        setModalMode('add');
        setIsModalOpen(true);
    };

    const openEditModal = (item: Assignment) => {
        setEditingItem(item);
        const tId = findTeacherId(item['المعلم']);
        const sId = findSubjectId(item['المادة']);
        const gradeObj = grades.find(g => g['الصف الدراسى'] === item['الصف']);
        const gId = gradeObj ? gradeObj['الرقم'] : '';

        setTeacherQuota(null); // ✅ تصفير النصاب (هيجيب مع تغيير المعلم لو اتعدل)
        setFormData({
            id: item['الرقم'],
            teacherId: tId ? String(tId) : '',
            subjectId: sId ? String(sId) : '',
            classId: '',
            gradeId: gId ? String(gId) : '', 
            periods: String(item['نصاب الفصل'])
        });
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const openDeleteModal = (item: Assignment) => {
        setEditingItem(item);
        setTeacherQuota(null);
        setFormData({ id: item['الرقم'], teacherId: '', subjectId: '', classId: '', gradeId: '', periods: '' });
        setModalMode('delete');
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (modalMode !== 'delete') {
            if (!formData.teacherId || !formData.subjectId || !formData.classId || !formData.periods) {
                alert('يرجى ملء جميع الحقول');
                return;
            }
        }

        let operation = 1;
        if (modalMode === 'edit') operation = 2;
        if (modalMode === 'delete') operation = 3;

        try {
            const res = await fetch(`${API_URL}/api/teacherAssignment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: formData.id,
                    teacherId: parseInt(formData.teacherId),
                    subjectId: parseInt(formData.subjectId),
                    classId: parseInt(formData.classId),
                    periods: parseInt(formData.periods),
                    inpot: operation
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Server Error Details:", errorText);
                alert(`حدث خطأ في السيرفر: ${res.status}`);
                return;
            }

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                alert("السيرفر رد ببيانات غير صحيحة");
                return;
            }

            const result = await res.json();
            
            if (result.success) {
                alert(result.message);
                setIsModalOpen(false);
                window.location.reload();
            } else {
                alert(result.message || 'فشلت العملية');
            }
        } catch (err) {
            console.error("Network Error:", err);
            alert('حدث خطأ في الاتصال بالسيرفر');
        }
    };

    // === Styles ===
    const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', borderRadius: 16, padding: 24, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' };
    const addBtnStyle: React.CSSProperties = { background: 'white', color: '#0d9488', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 };
    const editBtnStyle: React.CSSProperties = { marginLeft: 5, background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' };
    const deleteBtnStyle: React.CSSProperties = { background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' };
    const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
    const modalStyle: React.CSSProperties = { background: 'white', padding: 24, borderRadius: 16, width: 450, maxHeight: '90vh', overflowY: 'auto' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: '14px' };
    const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px', color: '#475569' };
    const modalActionsStyle: React.CSSProperties = { marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 };
    const cancelBtnStyle: React.CSSProperties = { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' };
    const saveBtnStyle: React.CSSProperties = { padding: '10px 22px', background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(20,184,166,0.3)' };
    const deleteConfirmBtnStyle: React.CSSProperties = { padding: '10px 22px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' };
    const thStyle: React.CSSProperties = { padding: 12, borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: '#64748b', fontWeight: 600 };
    const tdStyle: React.CSSProperties = { padding: 12, borderBottom: '1px solid #f1f5f9', color: '#334155' };
    
    // ✅ ستايلات حالة النصاب
    const quotaBoxStyle: React.CSSProperties = { fontSize: '13px', color: '#0d9488', marginTop: 5, background: '#f0fdfa', padding: '8px 12px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const warningBoxStyle: React.CSSProperties = { fontSize: '13px', color: '#dc2626', marginTop: 5, background: '#fef2f2', padding: '8px 12px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 };
    const editEmpBtnStyle: React.CSSProperties = { background: '#dc2626', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 5, fontSize: '12px', cursor: 'pointer', textDecoration: 'none', fontWeight: 'bold' };

    return (
        <div style={{ padding: '20px' }}>
            <div style={headerStyle}>
                <div>
                    <h2 style={{ color: 'white', margin: 0 }}>تخصيص حصص المعلمين</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>ربط المعلمين بالمواد والفصول الدراسية</p>
                </div>
                <button style={addBtnStyle} onClick={openAddModal}>إضافة تخصيص</button>
            </div>

            <div style={cardStyle}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={thStyle}>الرقم</th>
                                <th style={thStyle}>المعلم</th>
                                <th style={thStyle}>المادة</th>
                                <th style={thStyle}>الصف</th>
                                <th style={thStyle}>الفصل</th>
                                <th style={thStyle}>عدد الحصص</th>
                                <th style={thStyle}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>لا توجد بيانات</td></tr>
                            ) : (
                                assignments.map((item, index) => (
                                    <tr key={item['الرقم'] || index}>
                                        <td style={tdStyle}>{item['الرقم']}</td>
                                        <td style={tdStyle}>{item['المعلم']}</td>
                                        <td style={tdStyle}>{item['المادة']}</td>
                                        <td style={tdStyle}>{item['الصف']}</td>
                                        <td style={tdStyle}>{item['الفصل']}</td>
                                        <td style={tdStyle}>{item['نصاب الفصل']}</td>
                                        <td style={tdStyle}>
                                            <button style={editBtnStyle} onClick={() => openEditModal(item)}>تعديل</button>
                                            <button style={deleteBtnStyle} onClick={() => openDeleteModal(item)}>حذف</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={overlayStyle} onClick={() => setIsModalOpen(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 20 }}>
                            {modalMode === 'add' ? 'إضافة تخصيص جديد' : modalMode === 'edit' ? 'تعديل التخصيص' : 'حذف التخصيص'}
                        </h3>

                        {modalMode !== 'delete' ? (
                            <>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={labelStyle}>الرقم</label>
                                    <input value={formData.id} disabled style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} />
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={labelStyle}>المعلم</label>
                                    {/* ✅ تم تغيير onChange لاستدعاء دالة جلب النصاب */}
                                    <select value={formData.teacherId} onChange={handleTeacherChange} style={inputStyle}>
                                        <option value="">اختر المعلم...</option>
                                        {teachers.map((t, i) => (
                                            <option key={t.id || i} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>

                                    {/* ✅ شاشة التحميل */}
                                    {isFetchingQuota && (
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: 5 }}>جاري التحقق من النصاب...</div>
                                    )}

                                    {/* ✅ حالة النجاح: وجود نصاب */}
                                    {!isFetchingQuota && teacherQuota !== null && teacherQuota > 0 && (
                                        <div style={quotaBoxStyle}>
                                            <span>✅ نصاب المعلم الإجمالي: <strong>{teacherQuota} حصة</strong></span>
                                        </div>
                                    )}

                                    {/* ✅ حالة الخطأ: لا يوجد نصاب أو نصاب صفر */}
                                    {!isFetchingQuota && formData.teacherId && (teacherQuota === null || teacherQuota === 0) && (
                                        <div style={warningBoxStyle}>
                                            <span>⚠️ المعلم ليس لديه نصاب (حصص) محدد!</span>
                                            {/* زر يودي لصفحة تعديل الموظف */}
                                            <a href="/Emples/employees/view" style={editEmpBtnStyle}>
                                                تعديل بيانات الموظف
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={labelStyle}>المادة</label>
                                    <select value={formData.subjectId} onChange={e => setFormData({ ...formData, subjectId: e.target.value })} style={inputStyle}>
                                        <option value="">اختر المادة...</option>
                                        {subjects.map((s, i) => (
                                            <option key={s['الرقم'] || i} value={s['الرقم']}>{s['المادة']}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={labelStyle}>الصف الدراسي</label>
                                    <select 
                                        value={formData.gradeId} 
                                        onChange={e => setFormData({ ...formData, gradeId: e.target.value })} 
                                        style={inputStyle}
                                    >
                                        <option value="">اختر الصف...</option>
                                        {grades.map(g => (
                                            <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={labelStyle}>الفصل</label>
                                    <select
                                        value={formData.classId}
                                        onChange={e => setFormData({ ...formData, classId: e.target.value })}
                                        style={inputStyle}
                                        disabled={!formData.gradeId || loadingClasses}
                                    >
                                        <option value="">{loadingClasses ? 'جاري تحميل الفصول...' : 'اختر الفصل...'}</option>
                                        {classes.map(c => (
                                            <option key={c['الرقم']} value={c['الرقم']}>{c['الفصل']}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={labelStyle}>عدد الحصص</label>
                                    <input type="number" value={formData.periods} onChange={e => setFormData({ ...formData, periods: e.target.value })} placeholder="مثال: 5" style={inputStyle} />
                                </div>
                            </>
                        ) : (
                            <p style={{ marginBottom: 20 }}>هل أنت متأكد من حذف هذا التخصيص؟</p>
                        )}

                        <div style={modalActionsStyle}>
                            <button style={cancelBtnStyle} onClick={() => setIsModalOpen(false)}>إلغاء</button>
                            <button
                                style={modalMode === 'delete' ? deleteConfirmBtnStyle : saveBtnStyle}
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