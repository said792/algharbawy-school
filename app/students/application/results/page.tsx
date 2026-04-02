'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// تعريف واجهة بيانات الطالب بناءً على SQL اللي أرسلته
interface AcceptedStudent {
    'رقم الطالب': number;
    'كود الطالب': string;
    'اسم الطالب': string;
    'الرقم القومى': string;
    'درجة الاختبار 1': string;
    'درجة اختبار2': string;
    'درجة المقابلة': string;
    'حاله القبول': string;
}

export default function AcceptedStudentsPage() {
    const { user, work } = useAuthStore();
    
    const schoolId = user?.schoolId;
    const yearId = work?.yearId;
    const schoolName = user?.schoolName;
    const yearName = work?.yearName;

    const [students, setStudents] = useState<AcceptedStudent[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // ==========================================
    // === جلب بيانات المقبولين (Logic 31) ===
    // ==========================================
    const fetchStudents = async () => {
        if (!schoolId || !yearId) return;

        setLoading(true);
        let isMounted = true;
        
        const doFetch = async () => {
            try {
                // استخدام inpout=31 كما في الإجراء
                const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=31`);
                const data = await res.json();
                
                if (isMounted && data.success) {
                    setStudents(data.data || []);
                } else if (isMounted) {
                    setStudents([]);
                }
            } catch (err) {
                console.error("Error fetching accepted students:", err);
                if (isMounted) setStudents([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        doFetch();
        return () => { isMounted = false; };
    };

    useEffect(() => {
        fetchStudents();
    }, [schoolId, yearId]);

    const filteredStudents = students.filter(s =>
        (s['اسم الطالب'] && s['اسم الطالب'].includes(searchTerm)) ||
        (s['كود الطالب'] && s['كود الطالب'].includes(searchTerm)) ||
        (s['الرقم القومى'] && s['الرقم القومى'].includes(searchTerm))
    );

    // الإحصائيات (تركيز على عدد المقبولين)
    const stats = useMemo(() => {
        const total = students.length;
        return { total };
    }, [students]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800" dir="rtl">
            <div className="w-full max-w-full px-4 md:px-8 py-8 space-y-8">
                
                {/* --- Header: تدرج أخضر زمردي للدلالة على القبول --- */}
                <div className="relative w-full bg-gradient-to-l from-emerald-600 via-teal-700 to-green-800 rounded-[2rem] p-6 md:p-8 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400 opacity-10 rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="text-white">
                            <div className="flex items-center gap-2 mb-1 opacity-90 bg-white/10 w-fit px-3 py-1 rounded-lg">
                                <i className="fa-solid fa-certificate text-yellow-300"></i>
                                <span className="text-xs font-bold tracking-widest uppercase">نتائج القبول النهائية</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mt-2">
                                قائمة الطلاب <span className="text-emerald-200">المقبولين</span>
                            </h1>
                            <p className="mt-2 text-emerald-100 text-base font-medium opacity-90">
                                بيانات الدرجات والموقف النهائي للعام الحالي
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                                <div className="bg-white/20 text-white w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0">
                                    <i className="fa-solid fa-school"></i>
                                </div>
                                <div className="text-white overflow-hidden">
                                    <p className="text-[10px] text-emerald-200 font-bold uppercase mb-0.5">المدرسة</p>
                                    <p className="text-lg font-bold truncate">{schoolName || '---'}</p>
                                </div>
                            </div>
                            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                                <div className="bg-white/20 text-white w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0">
                                    <i className="fa-solid fa-calendar-check"></i>
                                </div>
                                <div className="text-white overflow-hidden">
                                    <p className="text-[10px] text-emerald-200 font-bold uppercase mb-0.5">العام</p>
                                    <p className="text-lg font-bold truncate">{yearName || '---'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Stats Row --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="إجمالي المقبولين" value={stats.total} icon="fa-user-check" color="emerald" />
                    {/* كروت إضافية للشكل الجمالي */}
                    <StatCard title="نسبة النجاح" value="100%" icon="fa-percent" color="teal" />
                    <StatCard title="تاريخ الإعلان" value="اليوم" icon="fa-calendar-day" color="green" />
                </div>

                {/* --- Actions Bar --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="relative w-full md:w-1/3">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 text-lg">
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </div>
                        <input
                            type="text"
                            className="w-full py-3 pr-12 pl-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold text-base text-slate-700"
                            placeholder="بحث عن طالب مقبول..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        onClick={fetchStudents}
                        disabled={loading}
                        className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                    >
                        <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i>
                        تحديث البيانات
                    </button>
                </div>

                {/* --- Table Container --- */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-4">
                            <i className="fa-solid fa-circle-notch fa-spin text-6xl text-emerald-500"></i>
                            <p className="text-xl font-bold text-slate-600">جاري جلب قوائم القبول...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-slate-50/80 text-slate-600 font-black text-sm uppercase tracking-wider border-b-2 border-slate-200">
                                    <tr>
                                        <th className="p-5 w-16 text-center text-slate-400">#</th>
                                        <th className="p-5 text-slate-700 text-base">بيانات الطالب</th>
                                        <th className="p-5 text-center w-32 text-slate-700 text-base">الاختبار 1</th>
                                        <th className="p-5 text-center w-32 text-slate-700 text-base">الاختبار 2</th>
                                        <th className="p-5 text-center w-32 text-slate-700 text-base">المقابلة</th>
                                        <th className="p-5 text-center w-40 text-slate-700 text-base">الموقف</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => (
                                        <tr key={student['رقم الطالب']} className="group hover:bg-emerald-50/30 transition-colors duration-200">
                                            <td className="p-5 text-center align-middle">
                                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-bold text-lg group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            
                                            {/* بيانات الطالب */}
                                            <td className="p-5 align-middle">
                                                <div className="flex flex-col gap-2">
                                                    <h2 className="text-xl font-black text-slate-800 leading-none">{student['اسم الطالب']}</h2>
                                                    
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-fit">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-400 font-bold text-xs">الكود:</span>
                                                            <span className="font-mono font-bold text-slate-700">{student['كود الطالب']}</span>
                                                        </div>
                                                        <div className="w-px h-4 bg-slate-300"></div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-400 font-bold text-xs">الرقم القومي:</span>
                                                            <span className="font-mono font-bold text-slate-700">{student['الرقم القومى']}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* درجات الاختبارات (عرض فقط) */}
                                            <td className="p-3 text-center align-middle">
                                                <div className="inline-block bg-white border-2 border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-black text-lg shadow-sm">
                                                    {student['درجة الاختبار 1']}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center align-middle">
                                                <div className="inline-block bg-white border-2 border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-black text-lg shadow-sm">
                                                    {student['درجة اختبار2']}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center align-middle">
                                                <div className="inline-block bg-white border-2 border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-black text-lg shadow-sm">
                                                    {student['درجة المقابلة']}
                                                </div>
                                            </td>

                                            {/* الحالة */}
                                            <td className="p-5 text-center align-middle">
                                                <span className="px-5 py-2 rounded-full bg-emerald-100 text-emerald-700 font-black border border-emerald-200 shadow-sm inline-flex items-center gap-2 text-sm">
                                                    <i className="fa-solid fa-check-double"></i>
                                                    {student['حاله القبول']}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center text-slate-300">
                                                <div className="text-8xl mb-6 opacity-20 text-slate-600"><i className="fa-solid fa-user-xmark"></i></div>
                                                <p className="text-2xl font-bold text-slate-500">لا يوجد طلاب مقبولين حتى الآن</p>
                                                <p className="text-slate-400 mt-2">يرجى التأكد من إعلان النتائج</p>
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

// مكون الإحصائيات (دعم الألوان الجديدة)
function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: string; color: string }) {
    const styles: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        teal: 'bg-teal-50 text-teal-600 border-teal-100',
        green: 'bg-green-50 text-green-600 border-green-100',
    };
    const currentStyle = styles[color] || styles.emerald;

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