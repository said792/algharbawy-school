'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === 1. Interfaces ===
interface StudentFormData {
    'الرقم': number;
    'SchoolID': number;
    'MrahelID': number;
    'YerID': number;
    'CoedSTUD': string;
    'RkemStudKawme': string;
    'BarsDay': string;
    'MohafzaBars': string;
    'StudentTyb': string;
    'StudentDiana': string;
    'StudentNadchnalte': string;
    'Day': string;
    'Monses': string;
    'Yeair': string;
    'ArbStudName': string;
    'EngStudName': string;
    'StudentEmail': string;
    'StudentAdres': string;
    'StudEnAdres': string;
    'FazesName': string;
    'FazerKawme': string;
    'الرقم القومي': string;
    'FazerTele': string;
    'FazerJop': string;
    'MazerNam': string;
    'MazerKwme': string;
    'MazerTele': string;
    'MazerJop': string;
    'WElaeaTElem': string;
    'GereadID': string;
    'الصف': string;
    'الفصل': string;
    'ClasesID': string;
    'HaletKeaed': string;
    'HelseStud': string;
    'Masrwfat': string;
    'language_won': string;
    'language_two': string;
    'stud_img': string;
    'ST_Status': string;
    // تم إضافة حقول الشعبة
    'ShoabaID': string;
    'الشعبة': string;
}

interface Option { id: number | string; name: string; }

interface StudentListItem {
    StudentID?: number;
    'الرقم'?: number;
    'رقم الطالب'?: number;
    'كود الطالب': string;
    'الاسم بالعربى': string;
    'الرقم القومى': string;
    'الصف': string | undefined;
    'الفصل': string | undefined;
    'الشعبة': string | undefined; // إضافة الشعبة للقائمة
    'ArbStudName'?: string;
}

export default function StudentsListPage() {
    const { user, work } = useAuthStore();
    
    const schoolId = user?.schoolId || 0;
    const schoolName = user?.schoolName || '';
    const stageId = work?.stageId || 0;
    const stageName = work?.stageName || '';
    const yearId = work?.yearId || 0;
    const yearName = work?.yearName || '';

    const initialFormState: StudentFormData = {
        'الرقم': 0, 'SchoolID': schoolId, 'MrahelID': Number(stageId) || 0,
        'YerID': yearId || 0,
        'CoedSTUD': '', 'RkemStudKawme': '', 'BarsDay': '', 'MohafzaBars': '',
        'StudentTyb': 'ذكر', 'StudentDiana': 'مسلم', 'StudentNadchnalte': 'مصري',
        'Day': '', 'Monses': '', 'Yeair': '',
        'ArbStudName': '', 'EngStudName': '', 'StudentAdres': '', 'StudEnAdres': '',
        'StudentEmail': '', 'FazesName': '', 'FazerKawme': '', 'FazerTele': '',
        'FazerJop': '', 'MazerNam': '', 'MazerKwme': '', 'MazerTele': '',
        'MazerJop': '', 'WElaeaTElem': '', 'GereadID': '', 'ClasesID': '',
        'HaletKeaed': 'قيد', 'HelseStud': 'سليم', 'Masrwfat': 'لا يوجد',
        'language_won': '', 'language_two': '', 'stud_img': '', 'ST_Status': 'نشط',
        'الرقم القومي': '', 'الصف': '', 'الفصل': '',
        'ShoabaID': '', 'الشعبة': '' // القيم الابتدائية للشعبة
    };

    const [formData, setFormData] = useState<StudentFormData>(initialFormState);
    const [studentsList, setStudentsList] = useState<StudentListItem[]>([]);
    const [grades, setGrades] = useState<Option[]>([]);
    const [classes, setClasses] = useState<Option[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [studentAge, setStudentAge] = useState<string>('-');
    const [searchTerm, setSearchTerm] = useState('');

    // --- جلب قائمة الطلاب ---
    useEffect(() => {
        fetchStudentsList();
    }, [schoolName, stageName, yearName]);

    const fetchStudentsList = async () => {
        if (!schoolName || !stageName || !yearName) {
            console.warn("Missing School, Stage, or Year names for search3");
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({
                SCHER1: schoolName,
                SCHER2: stageName,
                SCHER3: yearName,
                inpot: '10'
            });

            const res = await fetch(`${API_URL}/api/search3?${params.toString()}`);
            
            if (!res.ok) throw new Error(`Server Error: ${res.status}`);
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                console.error("Expected JSON but got HTML:", text.substring(0, 200));
                throw new Error("Invalid response format from server");
            }
            const data = await res.json();
            if (data.success) {
                setStudentsList(data.data);
            }
        } catch (e) { 
            console.error("Error fetching students list:", e); 
            alert("فشل تحميل قائمة الطلاب. تأكد من رابط الـ API.");
        }
        finally { setLoading(false); }
    };

    // --- جلب الصفوف والفصول ---
    useEffect(() => {
        const fetchGrades = async () => {
            if (!schoolName || !stageName) return;
            try {
                const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                if (!res.ok) return;
                const json = await res.json();
                if (json.success) setGrades(json.data.map((g: any) => ({ id: g['الرقم'], name: g['الصف الدراسى'] })));
            } catch (e) { console.error(e); }
        };
        fetchGrades();
    }, [schoolName, stageName]);

    useEffect(() => {
        const fetchClasses = async () => {
            if (!formData.GereadID || !schoolName || !stageName) { setClasses([]); return; }
            const selectedGrade = grades.find(g => g.id == formData.GereadID);
            const gradeName = selectedGrade ? selectedGrade.name : '';
            if (!gradeName) return;
            try {
                const res = await fetch(`${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${gradeName}&inpot=3`);
                if (!res.ok) return;
                const json = await res.json();
                if (json.success) setClasses(json.data.map((c: any) => ({ id: c['الرقم'] || c['ClasesID'], name: c['الفصل'] || c['ClasesName'] })));
                else setClasses([]);
            } catch (e) { console.error(e); setClasses([]); }
        };
        fetchClasses();
    }, [formData.GereadID, schoolName, stageName, grades]);

    // --- منطق الرقم القومي والعمر ---
    useEffect(() => {
        const id = formData.RkemStudKawme;
        if (id?.length === 14 && /^\d+$/.test(id)) {
            const cc = id[0]; const y = id.slice(1,3); const m = id.slice(3,5); const d = id.slice(5,7);
            if (+m > 12 || +d > 31) return;
            const fy = cc === '2' ? `19${y}` : cc === '3' ? `20${y}` : '';
            const gn = (+id[12] % 2 === 0) ? 'أنثى' : 'ذكر';
            const gv = getGovName(+id.slice(7,9));
            setFormData(p => ({ ...p, BarsDay: `${fy}-${m}-${d}`, Day: d, Monses: m, Yeair: fy, StudentTyb: gn, MohafzaBars: gv }));
        }
    }, [formData.RkemStudKawme]);

    useEffect(() => {
        let academicYear = 0;
        if (work?.yearName) { const match = work.yearName.match(/\d{4}/); if (match) academicYear = parseInt(match[0]); }
        if (academicYear === 0 && yearId && yearId > 2000) academicYear = yearId;
        if (!formData.BarsDay || academicYear === 0) { setStudentAge('-'); return; }
        const birthDate = new Date(formData.BarsDay);
        if (isNaN(birthDate.getTime())) { setStudentAge('تاريخ غير صحيح'); return; }
        const academicYearStart = new Date(academicYear, 9, 1);
        let years = academicYearStart.getFullYear() - birthDate.getFullYear();
        let months = academicYearStart.getMonth() - birthDate.getMonth();
        if (months < 0) { years--; months += 12; }
        if (years < 0) setStudentAge('بيانات غير متوافقة');
        else setStudentAge(`${years} سنة و ${months} شهر`);
    }, [formData.BarsDay, work?.yearName, yearId]);

    // ==========================================================
    // دالة جلب البيانات الكاملة
    // ==========================================================
    const getFullStudentDetails = async (studentId: number): Promise<StudentFormData | null> => {
    try {
        const res = await fetch(`${API_URL}/api/getData1/6?id=${studentId}`); 
        if (!res.ok) return null;
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
            const student = data.data[0];
            const gradeId = student['GereadID'] ? String(student['GereadID']) : '';
            const classId = student['ClasesID'] ? String(student['ClasesID']) : '';
            // محاولة جلب بيانات الشعبة من الاستعلام التفصيلي إذا وجدت
            const shoabaId = student['ShoabaID'] ? String(student['ShoabaID']) : '';
            const shoabaName = student['ShoabaName'] || student['الشعبة'] || '';

            let img = student['stud_img'] || '';
            if (img) setPreviewImage(img);

            return {
                ...initialFormState,
                'الرقم': student['الرقم'] || student['StudentID'] || 0,
                'SchoolID': initialFormState.SchoolID, 
                'MrahelID': initialFormState.MrahelID,
                'YerID': initialFormState.YerID,

                'CoedSTUD': student['كود الطالب'] || '',
                'RkemStudKawme': student['الرقم القومى'] || '',
                'ArbStudName': student['الاسم بالعربى'] || '',
                'EngStudName': student['الاسم بالانجليزى'] || '',
                'StudentAdres': student['العنوان'] || '',
                'StudentEmail': student['الايميل'] || '',
                'FazesName': student['اسم الاب'] || '',
                'FazerKawme': student['رقم قومى الأب'] || '',
                'FazerTele': student['تليفون الاب'] || '',
                'FazerJop': student['وظيفته'] || '',
                'MazerNam': student['اسم الام'] || '',
                'MazerKwme': student['رقم قومى الام'] || '',
                'MazerTele': student['تليفون الام'] || '', 
                'MazerJop': student['وظيفة الام'] || '',
                'WElaeaTElem': student['ولاية تعليمية'] || '',
                'GereadID': gradeId, 
                'ClasesID': classId, 
                'الصف': student['الصف'] || '',
                'الفصل': student['الفصل'] || '',
                'ShoabaID': shoabaId,
                'الشعبة': shoabaName,
                'HaletKeaed': student['حالة القيد'] || 'قيد',
                'HelseStud': student['الحالة الصحية'] || 'سليم',
                'Masrwfat': student['موقف المصروفات'] || 'لا يوجد',
                'ST_Status': student['موقف الطالب'] || 'نشط',
                'stud_img': img,
            };
        }
    } catch (e) { console.error(e); }
    return null;
};

    const getStudentId = (s: StudentListItem): number => Number(s['StudentID'] || s['الرقم'] || s['رقم الطالب'] || 0);

   const handleEditStudent = async (studentId: number) => {
    if (selectedStudentId === studentId && isEditing) return;
    if (loading) return;

    setLoading(true);
    try {
        const studentToEdit = studentsList.find(s => getStudentId(s) === studentId);
        if (!studentToEdit) return;

        const fullDetails = await getFullStudentDetails(studentId);
        
        const rawNationalId = fullDetails?.RkemStudKawme ?? studentToEdit['الرقم القومى'] ?? '';
        const cleanNationalId = String(rawNationalId).replace(/\D/g, '').trim();

        // إذا لم تأتِ الشعبة من التفاصيل، نأخذها من القائمة
        const shoabaFromList = studentToEdit['الشعبة'] || '';

        setFormData(prev => ({
            ...prev,
            ...(fullDetails || {}),
            RkemStudKawme: cleanNationalId,
            'الشعبة': fullDetails?.['الشعبة'] || shoabaFromList,
        }));

        setIsEditing(true);
        setSelectedStudentId(studentId);

    } catch (e) {
        console.error("فشل تحميل بيانات الطالب:", e);
        alert('فشل تحميل بيانات الطالب');
    } finally {
        setLoading(false);
    }
};

    const handleNewStudent = () => {
        setFormData(initialFormState);
        setIsEditing(false);
        setSelectedStudentId(null);
        setPreviewImage(null);
        setStudentAge('-');
        const fetchId = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData/19`);
                if (!res.ok) return;
                const data = await res.json();
                if (data.success && data.data?.[0]) {
                    const id = Object.values(data.data[0])[0];
                    setFormData(prev => ({ ...prev, 'الرقم': Number(id) || 1 }));
                }
            } catch (e) { console.error(e); }
        };
        fetchId();
    };

    const save = async () => {
        if (!formData.ArbStudName || !formData.RkemStudKawme) return alert('الاسم والرقم القومي مطلوبين');
        setLoading(true);
        try {
            let cleanImg = formData.stud_img;
            if (cleanImg && cleanImg.startsWith('data:')) cleanImg = cleanImg.split(',')[1];
            
            const payload = { 
                StudentID: formData['الرقم'],
                SchoolID: formData.SchoolID,
                MrahelID: formData.MrahelID,
                 YerID: Number(formData.YerID) || 0,
                CoedSTUD: formData.CoedSTUD || '',
                RkemStudKawme: formData.RkemStudKawme || '',
                BarsDay: formData.BarsDay || null,
                MohafzaBars: formData.MohafzaBars || '',
                StudentTyb: formData.StudentTyb || '',
                StudentDiana: formData.StudentDiana || '',
                StudentNadchnalte: formData.StudentNadchnalte || '',
                Day: formData.Day || '',
                Monses: formData.Monses || '',
                Yeair: formData.Yeair || '',
                ArbStudName: formData.ArbStudName || '',
                EngStudName: formData.EngStudName || '',
                StudentAdres: formData.StudentAdres || '',
                StudEnAdres: formData.StudEnAdres || '',
                StudentEmail: formData.StudentEmail || '',
                FazesName: formData.FazesName || '',
                FazerKawme: formData.FazerKawme || '',
                FazerTele: formData.FazerTele || '',
                FazerJop: formData.FazerJop || '',
                MazerNam: formData.MazerNam || '',
                MazerKwme: formData.MazerKwme || '', 
                MazerTele: formData.MazerTele || '',
                MazerJop: formData.MazerJop || '',
                WElaeaTElem: formData.WElaeaTElem || '',
                GereadID: formData.GereadID ? parseInt(formData.GereadID) : 0,
                ClasesID: formData.ClasesID ? parseInt(formData.ClasesID) : 0,
                HaletKeaed: formData.HaletKeaed || '',
                HelseStud: formData.HelseStud || '',
                Masrwfat: formData.Masrwfat || '',
                language_won: formData.language_won || '',
                language_two: formData.language_two || '',
                stud_img: cleanImg,
                ST_Status: formData.ST_Status || '',
                // إضافة الشعبة في الطلب
                ShoabaID: formData.ShoabaID ? parseInt(formData.ShoabaID) : 0,
                INPOT: isEditing ? 2 : 1 
            };

            const res = await fetch(`${API_URL}/api/student`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Save failed");
            }

            const data = await res.json();
            if (data.success) { 
                alert(isEditing ? 'تم التعديل بنجاح' : 'تمت الإضافة بنجاح'); 
                fetchStudentsList();
                if (!isEditing) handleNewStudent();
                else setIsEditing(false);
            } else alert('خطأ: ' + data.message);
        } catch (err: any) { 
            console.error(err); 
            alert('خطأ في الاتصال: ' + err.message); 
        }
        finally { setLoading(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;
        try {
            const res = await fetch(`${API_URL}/api/student`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ StudentID: id, INPOT: 3 })
            });
            const data = await res.json();
            if (data.success) {
                alert('تم الحذف بنجاح');
                fetchStudentsList();
            }
        } catch { alert('فشل الاتصال'); }
    };

    const handleChange = (e: React.ChangeEvent<any>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    
    const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const r = new FileReader();
            r.onload = () => { 
                setFormData(p => ({ ...p, stud_img: r.result as string })); 
                setPreviewImage(r.result as string); 
            };
            r.readAsDataURL(e.target.files[0]);
        }
    };

    const getGovName = (c: number) => ({ 1:"القاهرة",2:"الإسكندرية",3:"بورسعيد",4:"السويس",11:"دمياط",12:"الدقهلية",13:"الشرقية",14:"القليوبية",15:"كفر الشيخ",16:"الغربية",17:"المنوفية",18:"البحيرة",19:"الإسماعيلية",21:"الجيزة",22:"بني سويف",23:"الفيوم",24:"المنيا",25:"أسيوط",26:"سوهاج",27:"قنا",28:"أسوان",29:"الأقصر",31:"البحر الأحمر",32:"الوادي الجديد",33:"مطروح",34:"شمال سيناء",35:"جنوب سيناء",88:"خارج القطر" }[c] || 'غير معروف');

    const filteredStudents = studentsList.filter(s => 
        (s['الاسم بالعربى'] || '').includes(searchTerm) || 
        (s['كود الطالب'] || '').includes(searchTerm) || 
        (s['الرقم القومى'] || '').includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800" dir="rtl">
            <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
                {/* === HERO HEADER === */}
                <div className="relative bg-gradient-to-l from-emerald-700 via-teal-800 to-cyan-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden text-white">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full blur-[100px] opacity-30 translate-x-1/3 -translate-y-1/3"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-bold mb-4 backdrop-blur-md border border-white/20">
                                <i className="fa-solid fa-users-gear text-yellow-300"></i>
                                <span>إدارة و تعديل الطلاب</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-2">سجل <span className="text-emerald-200">الطلاب</span></h1>
                            <p className="text-emerald-100 text-lg opacity-90">اختر طالباً للتعديل أو أضف طالباً جديداً</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <InfoCard title="المدرسة" value={schoolName} sub={`ID: ${schoolId}`} icon="fa-school" />
                            <InfoCard title="المرحلة" value={stageName} sub={`ID: ${stageId}`} icon="fa-layer-group" />
                            <InfoCard title="العام" value={yearName} icon="fa-calendar-check" />
                        </div>
                    </div>
                </div>

                {/* === MAIN CONTENT === */}
                <div className="grid grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* SIDEBAR: Student List */}
                    <div className="lg:col-span-4 flex flex flex-col gap-6 h-[calc(100vh-140px)]">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="بحث بالاسم أو الكود..." 
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pr-12 focus:border-emerald-500 outline-none font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <i className="fa-solid fa-search absolute left-4 top-4 text-slate-400"></i>
                            </div>
                            <button onClick={handleNewStudent} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2">
                                <i className="fa-solid fa-plus"></i> طالب جديد
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex flex-col">
                            <div className="bg-slate-50 p-3 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider flex justify-between">
                                <span>قائمة الطلاب ({filteredStudents.length})</span>
                                <button onClick={fetchStudentsList} className="hover:text-emerald-600"><i className="fa-solid fa-rotate"></i></button>
                            </div>
                            <div className="overflow-y-auto flex-1 custom-scrollbar p-2 space-y-2">
                                {loading ? <div className="text-center p-4"><i className="fa-solid fa-spinner fa-spin text-emerald-500 text-4xl"></i></div> : 
                                filteredStudents.length > 0 ? filteredStudents.map((student) => {
                                    const currentId = getStudentId(student);
                                    return (
                                        <div 
                                            key={currentId}
                                            onClick={() => handleEditStudent(currentId)}
                                            className={`group cursor-pointer p-4 rounded-xl border-2 transition-all hover:shadow-md ${selectedStudentId === currentId ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100 hover:border-emerald-300'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-800 text-lg leading-tight mb-1">
                                                        {student['الاسم بالعربى'] || student['ArbStudName'] || 'بدون اسم'}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
                                                        {student['كود الطالب'] && (
                                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                                                                {student['كود الطالب']}
                                                            </span>
                                                        )}
                                                        {student['الصف'] && (
                                                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                                                                {student['الصف']}
                                                            </span>
                                                        )}
                                                        {student['الفصل'] && (
                                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                                                {student['الفصل']}
                                                            </span>
                                                        )}
                                                        {/* إضافة عرض الشعبة في القائمة الجانبية */}
                                                        {student['الشعبة'] && (
                                                            <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-medium border border-purple-100">
                                                                {student['الشعبة']}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditStudent(currentId); }} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                                                        <i className="fa-solid fa-pen"></i>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(currentId); }} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                                        <i className="fa-solid fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center p-8 text-slate-400">
                                        <p>لا يوجد طلاب</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FORM GRID */}
                    <div className="lg:col-span-8 space-y-6">
                        {selectedStudentId ? (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 mb-6">
                                <i className="fa-solid fa-pen-to-square text-xl"></i>
                                <div>
                                    <h3 className="font-bold">وضع التعديل</h3>
                                    <p className="text-sm">أنت تقوم الآن بتعديل بيانات الطالب برقم: {selectedStudentId}</p>
                                </div>
                                <button onClick={() => { setSelectedStudentId(null); setIsEditing(false); setFormData(initialFormState); setPreviewImage(null); }} className="text-sm font-bold underline hover:text-red-600">إلغاء التعديل</button>
                            </div>
                        ) : (
                            <div className="bg-blue-50 border border-blue-200 p-8 rounded-2xl text-center text-blue-800 mb-6">
                                <i className="fa-solid fa-arrow-left text-4xl mb-4 opacity-50"></i>
                                <h2 className="text-2xl font-bold mb-2">اختر طالباً من القائمة</h2>
                                <p>أو اضغط على "طالب جديد" لتسجيل بيانات جديدة</p>
                            </div>
                        )}
                        
                        {/* 1. Personal Data with Image Upload */}
                        <SectionCard title="البيانات الشخصية" icon="fa-id-card" color="violet">
                            <div className="space-y-8">
                                {/* ✅ مكون رفع الصورة الجديد */}
                                <div className="flex flex-col md:flex-row items-start gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    {/* منطقة المعاينة */}
                                    <div className="relative w-32 h-32 shrink-0">
                                        <div className="w-full h-full rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-200 flex items-center justify-center relative">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Student" className="w-full h-full object-cover" />
                                            ) : (
                                                <i className="fa-solid fa-user text-slate-400 text-4xl"></i>
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 right-0 p-1">
                                            <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                                        </div>
                                    </div>

                                    {/* منطقة الرفع */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <label className="cursor-pointer flex-1 bg-white border-2 border-dashed border-emerald-300 rounded-xl p-4 hover:bg-emerald-50 hover:border-emerald-500 transition-all group relative overflow-hidden">
                                                <div className="flex items-center justify-center gap-3 text-slate-600 font-medium group-hover:text-emerald-700 z-10">
                                                    <i className="fa-solid fa-camera text-xl"></i>
                                                    <span>اضغط لاختيار صورة الطالب</span>
                                                    <span className="text-xs text-slate-400 font-normal">(JPG, PNG)</span>
                                                </div>
                                                <input type="file" onChange={handleImg} className="hidden" accept="image/*" />
                                            </label>
                                            
                                            {previewImage && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(null); setFormData(p => ({ ...p, stud_img: '' })); }}
                                                    className="px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 font-bold text-sm transition-colors"
                                                >
                                                    حذف الصورة
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">يُفضل صورة واضحة، خلفية بيضاء، لتظهر بشكل أفضل في الشهادات والتقارير.</p>
                                    </div>
                                </div>

                                {/* الحقول النصية */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputFull label="الاسم بالعربي (رباعي)" name="ArbStudName" value={formData.ArbStudName} onChange={handleChange} required autoFocus />
                                    <InputFull label="الاسم بالإنجليزي" name="EngStudName" value={formData.EngStudName} onChange={handleChange} />
                                    <InputFull label="الرقم القومي" name="RkemStudKawme" value={formData.RkemStudKawme} onChange={handleChange} maxLength={14} required mono />
                                    <InputFull label="الجنسية" name="StudentNadchnalte" value={formData.StudentNadchnalte} onChange={handleChange} />
                                    <SelectInput label="النوع" name="StudentTyb" value={formData.StudentTyb} onChange={handleChange} opts={['ذكر','أنثى']} />
                                    <SelectInput label="الديانة" name="StudentDiana" value={formData.StudentDiana} onChange={handleChange} opts={['مسلم','مسيحي']} />
                                    <InputFull label="تاريخ الميلاد" name="BarsDay" type="date" value={formData.BarsDay} onChange={handleChange} />
                                    <InputFull label="محافظة الميلاد" name="MohafzaBars" value={formData.MohafzaBars} onChange={handleChange} readOnly />
                                </div>
                            </div>
                        </SectionCard>

                        {/* 2. Address */}
                        <SectionCard title="العنوان وبيانات الاتصال" icon="fa-map-location-dot" color="blue">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2"><InputFull label="العنوان بالعربي" name="StudentAdres" value={formData.StudentAdres} onChange={handleChange} /></div>
                                <div className="md:col-span-2"><InputFull label="العنوان بالإنجليزي" name="StudEnAdres" value={formData.StudEnAdres} onChange={handleChange} /></div>
                                <InputFull label="الإدارة التعليمية" name="WElaeaTElem" value={formData.WElaeaTElem} onChange={handleChange} />
                                <InputFull label="البريد الإلكتروني" name="StudentEmail" type="email" value={formData.StudentEmail} onChange={handleChange} />
                            </div>
                        </SectionCard>

                        {/* 3. Parents */}
                        <SectionCard title="بيانات ولي الأمر" icon="fa-users" color="indigo">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h4 className="text-indigo-600 font-bold border-b border-indigo-100 pb-2 mb-4">بيانات الأب</h4>
                                    <InputFull label="الاسم" name="FazesName" value={formData.FazesName} onChange={handleChange} />
                                    <InputFull label="رقم قومى الأب" name="FazerKawme" value={formData.FazerKawme} onChange={handleChange} />
                                    <InputFull label="التليفون" name="FazerTele" value={formData.FazerTele} onChange={handleChange} />
                                    <InputFull label="الوظيفة" name="FazerJop" value={formData.FazerJop} onChange={handleChange} />
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-pink-600 font-bold border-b border-pink-100 pb-2 mb-4">بيانات الأم</h4>
                                    <InputFull label="الاسم" name="MazerNam" value={formData.MazerNam} onChange={handleChange} />
                                    <InputFull label="رقم قومى الام" name="MazerKwme" value={formData.MazerKwme} onChange={handleChange} />
                                    <InputFull label="التليفون" name="MazerTele" value={formData.MazerTele} onChange={handleChange} />
                                    <InputFull label="الوظيفة" name="MazerJop" value={formData.MazerJop} onChange={handleChange} />
                                </div>
                            </div>
                        </SectionCard>

                        {/* 4. Academic */}
                        <SectionCard title="البيانات الدراسية" icon="fa-graduation-cap" color="emerald">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الصف الدراسي</label>
                                    <select name="GereadID" value={formData.GereadID ?? ''} onChange={handleChange} className="w-full h-12 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white font-medium text-slate-700">
                                        <option value="">اختر الصف...</option>
                                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الفصل</label>
                                    <select name="ClasesID" value={formData.ClasesID ?? ''} onChange={handleChange} disabled={!formData.GereadID} className="w-full h-12 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-400">
                                        <option value="">{!formData.GereadID ? 'اختر الصف أولاً' : 'اختر الفصل...'}</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <SelectInput label="حالة القيد" name="HaletKeaed" value={formData.HaletKeaed} onChange={handleChange} opts={['مستجد','ناجح','راسب','منقول']} />
                                <InputFull label="اللغة الأولى" name="language_won" value={formData.language_won} onChange={handleChange} />
                                <InputFull label="اللغة الثانية" name="language_two" value={formData.language_two} onChange={handleChange} />
                                {/* حقل الشعبة (مخفي للتعديل حالياً حتى يتم إعداد API للحفظ، لكن البيانات موجودة في النموذج) */}
                                {formData['الشعبة'] && (
                                    <div className="col-span-1">
                                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">الشعبة</label>
                                        <div className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-600 flex items-center font-medium">
                                            {formData['الشعبة']}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        {/* 5. Admin */}
                        <SectionCard title="البيانات الإدارية" icon="fa-clipboard-check" color="slate">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputFull label="الحالة الصحية" name="HelseStud" value={formData.HelseStud} onChange={handleChange} />
                                <InputFull label="موقف المصروفات" name="Masrwfat" value={formData.Masrwfat} onChange={handleChange} />
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">موقف الطالب</label>
                                    <select name="ST_Status" value={formData.ST_Status ?? ''} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none bg-white text-slate-700 font-medium">
                                        <option value="نشط">نشط</option>
                                        <option value="موقوف">موقوف</option>
                                        <option value="مرحل">مرحل</option>
                                    </select>
                                </div>
                            </div>
                        </SectionCard>

                        {/* ACTIONS */}
                        {selectedStudentId && (
                             <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-4 z-40">
                                <div className="flex items-center gap-3 text-slate-500">
                                    <i className="fa-solid fa-circle-info text-xl"></i>
                                    <span className="text-sm font-medium">أنت تقوم بتعديل بيانات الطالب رقم: {formData['الرقم']}</span>
                                </div>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <button onClick={() => { setSelectedStudentId(null); setIsEditing(false); setFormData(initialFormState); setPreviewImage(null); }} className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-all flex justify-center items-center gap-2">إلغاء</button>
                                    <button onClick={save} disabled={loading} className="flex-1 md:flex-none px-10 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold transition-all shadow-lg shadow-emerald-200 flex justify-center items-center gap-3 text-xl disabled:opacity-50">
                                        {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> جاري الحفظ...</> : <><i className="fa-solid fa-save"></i> حفظ التعديلات</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Helper Components ---
function InfoCard({ title, value, sub, icon }: any) {
    return (
        <div className="bg-white/10 backdrop-blur-md border border border-white/20 p-4 rounded-2xl flex items-center gap-4 min-w-[180px]">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl text-white shrink-0">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
                <p className="text-[10px] text-white/70 font-bold uppercase mb-1">{title}</p>
                <p className="text-lg font-bold text-white leading-tight">{value}</p>
                <p className="text-xs text-white/60 font-mono">{sub}</p>
            </div>
        </div>
    );
}
function SectionCard({ title, icon, color, children }: any) {
    const colors: any = { violet: 'bg-violet-50 text-violet-600 border-violet-200', blue: 'bg-blue-50 text-blue-600 border-blue-200', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200', emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200', slate: 'bg-slate-50 text-slate-600 border-slate-200' };
    const c = colors[color] || colors.violet;
    return (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className={`p-6 border-b border-slate-100 flex items-center gap-3 ${c}`}>
                <i className={`fa-solid ${icon} text-2xl opacity-80`}></i>
                <h3 className="text-2xl font-bold">{title}</h3>
            </div>
            <div className="p-8">{children}</div>
        </div>
    );
}
function InputFull({ label, name, value, onChange, type = "text", required = false, readOnly = false, mono = false, maxLength }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">{label} {required && <span className="text-rose-500">*</span>}</label>
            <input type={type} name={name} value={value ?? ''} onChange={onChange} readOnly={readOnly} maxLength={maxLength} required={required} className={`w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-700 font-medium ${readOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'} ${mono ? 'font-mono text-lg tracking-widest' : ''}`} />
        </div>
    );
}
function SelectInput({ label, name, value, onChange, opts }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">{label}</label>
            <select name={name} value={value ?? ''} onChange={onChange} className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white text-slate-700 font-medium">
                {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}