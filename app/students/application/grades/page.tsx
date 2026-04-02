'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// تعريف واجهة بيانات الطالب
interface Student {
    'رقم الطالب': number;
    'كود الطالب': string;
    'اسم الطالب': string;
    'الرقم القومى': string;
    'اسم الاب': string;
    'رقم الهاتف': string;
    'الايميل': string;
    'الاختبار الاول': number | null;
    'الاختبار الثانى': number | null;
    'درجة المقابلة': number | null;
    inputG1: string;
    inputG2: string;
    inputG3: string;
    isSaving: boolean;
}

export default function GradesPage() {
    const { user, work } = useAuthStore();
    const yearId = work?.yearId;
    const schoolId = user?.schoolId;
    const schoolName = user?.schoolName;
    const yearName = work?.yearName;

    const [selectedYear, setSelectedYear] = useState<number>(0);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (yearId) {
            setTimeout(() => {
                setSelectedYear(prev => (prev !== yearId ? yearId : prev));
            }, 0);
        }
    }, [yearId]);

    useEffect(() => {
        if (schoolId && selectedYear && selectedYear !== 0) {
            fetchStudents();
        }
    }, [user, selectedYear]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${schoolId}&sch2=${selectedYear}&inpot=4`);
            const result = await res.json();
            if (result.success && result.data) {
                const mappedData: Student[] = result.data.map((item: any) => ({
                    ...item,
                    inputG1: item['الاختبار الاول'] ? String(item['الاختبار الاول']) : '',
                    inputG2: item['الاختبار الثانى'] ? String(item['الاختبار الثانى']) : '',
                    inputG3: item['درجة المقابلة'] ? String(item['درجة المقابلة']) : '',
                    isSaving: false,
                }));
                setStudents(mappedData);
            } else {
                setStudents([]);
            }
        } catch (err) {
            showNotification('error', 'فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => ({ total: students.length }), [students]);

    const filteredStudents = students.filter(s =>
        s['اسم الطالب'].includes(searchTerm) ||
        s['الرقم القومى'].includes(searchTerm) ||
        s['كود الطالب'].includes(searchTerm)
    );

    const handleInputChange = (id: number, field: 'inputG1' | 'inputG2' | 'inputG3', value: string) => {
        setStudents(prev => prev.map(s => (s['رقم الطالب'] === id ? { ...s, [field]: value } : s)));
    };

    const handleSaveAll = async () => {
        if (students.length === 0) return showNotification('error', 'لا يوجد طلاب للحفظ');
        if (!confirm(`هل أنت متأكد من حفظ درجات ${students.length} طالب؟`)) return;

        setIsSavingAll(true);
        let successCount = 0;
        let failCount = 0;

        for (const student of students) {
            try {
                const res = await fetch(`${API_URL}/api/exams/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: student['رقم الطالب'],
                        grade1: student.inputG1,
                        grade2: student.inputG2,
                        grade3: student.inputG3,
                        passingGrade: 50
                    })
                });
                const result = await res.json();
                if (result.success) successCount++; else failCount++;
            } catch (err) { failCount++; }
        }

        setIsSavingAll(false);
        if (failCount === 0) showNotification('success', `تم حفظ بيانات ${successCount} طالب بنجاح!`);
        else showNotification('error', `تم حفظ ${successCount} طالب، وفشل حفظ ${failCount} طالب.`);
        await fetchStudents();
    };

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800" dir="rtl">
            {notification && (
                <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[60] text-white font-bold text-lg flex items-center gap-3 animate-bounce
                    ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {notification.type === 'success' ? <i className="fa-solid fa-check-circle text-2xl"></i> : <i className="fa-solid fa-circle-exclamation text-2xl"></i>}
                    {notification.message}
                </div>
            )}

            <div className="w-full max-w-full px-4 md:px-8 py-8 space-y-8">
                
                {/* --- Hero Header (Smaller Font Size) --- */}
                <div className="relative w-full bg-gradient-to-l from-blue-700 via-indigo-800 to-blue-900 rounded-[2rem] p-6 md:p-8 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

                    <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                        <div className="text-white">
                            <div className="flex items-center gap-2 mb-1 opacity-80">
                                <i className="fa-solid fa-graduation-cap text-lg"></i>
                                <span className="text-xs font-bold tracking-widest uppercase">نظام إدارة القبول</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight"> {/* تصغير الخط هنا */}
                                تسجيل درجات <span className="text-blue-300">الطلاب الجدد</span>
                            </h1>
                            <p className="mt-2 text-blue-100 text-base font-medium opacity-90"> {/* تصغير الخط هنا */}
                                قم برصد الدرجات وتحديث البيانات بسهولة وسرعة
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                                <div className="bg-white/20 text-white w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0">
                                    <i className="fa-solid fa-school"></i>
                                </div>
                                <div className="text-white overflow-hidden">
                                    <p className="text-[10px] text-blue-200 font-bold uppercase mb-0.5">المدرسة</p>
                                    <p className="text-lg font-bold truncate" title={schoolName}>{schoolName || '---'}</p>
                                </div>
                            </div>

                            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                                <div className="bg-white/20 text-white w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0">
                                    <i className="fa-solid fa-calendar-check"></i>
                                </div>
                                <div className="text-white overflow-hidden">
                                    <p className="text-[10px] text-blue-200 font-bold uppercase mb-0.5">العام</p>
                                    <p className="text-lg font-bold truncate" title={yearName}>{yearName || '---'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Stats & Actions Row --- */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 grid grid-cols-1 gap-6">
                        <StatCard title="إجمالي الطلاب" value={stats.total} icon="fa-users" color="blue" />
                        <StatCard title="تم الرصد" value={students.filter(s => s.inputG1 !== '').length} icon="fa-check-double" color="emerald" />
                    </div>

                    <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="relative w-full md:w-1/2">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 text-lg">
                                <i className="fa-solid fa-magnifying-glass"></i>
                            </div>
                            <input
                                type="text"
                                className="w-full py-3 pr-12 pl-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-base text-slate-700 placeholder-slate-400"
                                placeholder="ابحث عن طالب بالاسم أو الرقم..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-4 w-full md:w-auto">
                            <button 
                                onClick={fetchStudents}
                                disabled={loading || isSavingAll}
                                className="flex-1 md:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-base flex items-center justify-center gap-2"
                            >
                                <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'}`}></i>
                                تحديث
                            </button>
                            <button 
                                onClick={handleSaveAll}
                                disabled={isSavingAll || loading || students.length === 0}
                                className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 font-bold text-base"
                            >
                                {isSavingAll ? <><i className="fa-solid fa-circle-notch fa-spin"></i> جاري الحفظ...</> : <><i className="fa-solid fa-floppy-disk"></i> حفظ الكل</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- Table Container --- */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                    {loading && students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-4">
                            <i className="fa-solid fa-circle-notch fa-spin text-6xl text-blue-500"></i>
                            <p className="text-xl font-bold text-slate-600">جاري تحميل البيانات...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-slate-50/80 backdrop-blur text-slate-600 font-black text-sm uppercase tracking-wider border-b-2 border-slate-200">
                                    <tr>
                                        <th className="p-6 w-20 text-center text-slate-400">#</th>
                                        <th className="p-6 text-slate-700 text-base">بيانات الطالب</th>
                                        <th className="p-6 text-center w-40 text-slate-700 text-base">الاختبار 1</th>
                                        <th className="p-6 text-center w-40 text-slate-700 text-base">الاختبار 2</th>
                                        <th className="p-6 text-center w-40 text-slate-700 text-base">المقابلة</th>
                                        <th className="p-6 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => (
                                        <tr key={student['رقم الطالب']} className={`group hover:bg-blue-50/50 transition-colors duration-200 ${isSavingAll ? 'opacity-50' : ''}`}>
                                            <td className="p-6 text-center align-middle">
                                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            
                                            {/* --- Student Data Cell: One Row Layout with Titles --- */}
                                            <td className="p-6 align-middle">
                                                <div className="flex flex-col gap-3">
                                                    {/* الاسم في صف مستقل */}
                                                    <h2 className="text-xl font-black text-slate-800 leading-none">{student['اسم الطالب']}</h2>
                                                    
                                                    {/* التفاصيل في صف واحد أفقي */}
                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-400 font-bold text-xs whitespace-nowrap">الكود:</span>
                                                            <span className="font-mono font-bold text-slate-700">{student['كود الطالب']}</span>
                                                        </div>
                                                        <div className="w-px h-4 bg-slate-300"></div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-400 font-bold text-xs whitespace-nowrap">الرقم القومي:</span>
                                                            <span className="font-mono font-bold text-slate-700">{student['الرقم القومى']}</span>
                                                        </div>
                                                        <div className="w-px h-4 bg-slate-300"></div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-400 font-bold text-xs whitespace-nowrap">ولي الأمر:</span>
                                                            <span className="font-bold text-slate-600">{student['اسم الاب']}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Inputs */}
                                            {['inputG1', 'inputG2', 'inputG3'].map((field) => (
                                                <td key={field} className="p-4 text-center align-middle">
                                                    <input
                                                        type="number"
                                                        disabled={isSavingAll}
                                                        className={`
                                                            w-full h-14 text-center text-xl font-black rounded-2xl border-2 transition-all duration-200 outline-none
                                                            ${student[field as keyof Student] as string
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md shadow-blue-100' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}
                                                            focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:text-slate-800
                                                            disabled:bg-slate-100 disabled:border-slate-100 disabled:text-slate-300
                                                        `}
                                                        placeholder="--"
                                                        value={student[field as keyof Student] as string}
                                                        onChange={(e) => handleInputChange(student['رقم الطالب'], field as any, e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-2"></td> 
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center text-slate-300">
                                                <div className="text-8xl mb-6 opacity-20 text-slate-600"><i className="fa-solid fa-inbox"></i></div>
                                                <p className="text-3xl font-bold">لا يوجد بيانات</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
    const styles = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };
    const currentStyle = styles[color as keyof typeof styles] || styles.blue;

    return (
        <div className={`p-5 rounded-2xl border shadow-sm ${currentStyle} flex items-center justify-between transition-transform hover:scale-105 duration-300`}>
            <div>
                <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">{title}</p>
                <h3 className="text-3xl font-black text-slate-800">{value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-current opacity-10 shadow-inner`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
        </div>
    );
}