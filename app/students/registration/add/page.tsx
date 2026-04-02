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
    'StudentAdres': string;
    'StudEnAdres': string;
    'StudentEmail': string;
    'FazesName': string;
    'FazerKawme': string;
    'FazerTele': string;
    'FazerJop': string;
    'MazerNam': string;
    'MazerKwme': string;
    'MazerTele': string;
    'MazerJop': string;
    'WElaeaTElem': string;
    'GereadID': string;
    'ClasesID': string;
    'HaletKeaed': string;
    'HelseStud': string;
    'Masrwfat': string;
    'language_won': string;
    'language_two': string;
    'stud_img': string;
    'ST_Status': string;
    'ShoabaID': string;
    'الشعبة': string;
}

interface Option { id: number | string; name: string; }

export default function StudentRegistrationPage() {
    const { user, work } = useAuthStore();
    
    const schoolId = user?.schoolId || 0;
    const schoolName = user?.schoolName || '';
    const stageId = work?.stageId || 0;
    const stageName = work?.stageName || '';
    const yearId = work?.yearId || 0;

    const [formData, setFormData] = useState<StudentFormData>({
        'الرقم': 0, 'SchoolID': schoolId, 'MrahelID': stageId, 'YerID': yearId,
        'CoedSTUD': '', 'RkemStudKawme': '', 'BarsDay': '', 'MohafzaBars': '',
        'StudentTyb': 'ذكر', 'StudentDiana': 'مسلم', 'StudentNadchnalte': 'مصري',
        'Day': '', 'Monses': '', 'Yeair': '',
        'ArbStudName': '', 'EngStudName': '', 'StudentAdres': '', 'StudEnAdres': '',
        'StudentEmail': '', 'FazesName': '', 'FazerKawme': '', 'FazerTele': '',
        'FazerJop': '', 'MazerNam': '', 'MazerKwme': '', 'MazerTele': '',
        'MazerJop': '', 'WElaeaTElem': '', 'GereadID': '', 'ClasesID': '',
        'HaletKeaed': 'قيد', 'HelseStud': 'سليم', 'Masrwfat': 'لا يوجد',
        'language_won': '', 'language_two': '', 'stud_img': '', 'ST_Status': 'نشط',
        'ShoabaID': '', 
        'الشعبة': ''
    });

    const [grades, setGrades] = useState<Option[]>([]);
    const [shoabs, setShoabs] = useState<Option[]>([]); // الشعب
    const [classes, setClasses] = useState<Option[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [studentAge, setStudentAge] = useState<string>('-');
    const [hasShoabs, setHasShoabs] = useState(false); // هل الصف الحالي به شعب؟
    const [selectedGradeName, setSelectedGradeName] = useState<string>('');
    const [selectedShoabaName, setSelectedShoabaName] = useState<string>('');

    // --- Effects (جلب البيانات) ---
    
    // 1. جلب رقم الملف
    useEffect(() => {
        const fetchId = async () => {
            try {
                const res = await fetch(`${API_URL}/api/getData/19`);
                const data = await res.json();
                if (data.success && data.data?.[0]) {
                    const id = Object.values(data.data[0])[0];
                    setFormData(p => ({ ...p, 'الرقم': Number(id) || 1 }));
                }
            } catch (e) { console.error(e); }
        };
        if (schoolId) fetchId();
    }, [schoolId]);

    // 2. جلب الصفوف
    useEffect(() => {
        const fetchGrades = async () => {
            if (!schoolName || !stageName) return;
            try {
                const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
                const json = await res.json();
                if (json.success) setGrades(json.data.map((g: any) => ({ id: g['الرقم'], name: g['الصف الدراسى'] })));
            } catch (e) { console.error(e); }
        };
        fetchGrades();
    }, [schoolName, stageName]);

    // ✅ Effect A: عند تغيير الصف -> جلب الشعب وتحديث الحالة
    useEffect(() => {
        // إعادة تعيين البيانات المرتبطة بالشعبة والفصول
        setFormData(p => ({ ...p, ShoabaID: '', ClasesID: '', 'الشعبة': '' }));
        setShoabs([]);
        setClasses([]);
        setHasShoabs(false);
        setSelectedShoabaName('');

        if (!formData.GereadID || !schoolName || !stageName) return;

        const gradeObj = grades.find(g => g.id == formData.GereadID);
        const currentGradeName = gradeObj ? gradeObj.name : '';
        setSelectedGradeName(currentGradeName);

        if (!currentGradeName) return;

        let cancelled = false;

        const fetchDivisions = async () => {
            try {
                // استخدام نفس المنطق الموجود في صفحة الإنذارات (inpot=32)
                const divRes = await fetch(`${API_URL}/api/getData1/32?id=${schoolId}`);
                const divResult = await divRes.json();
                
                if (cancelled) return;

                if (divResult.success && divResult.data) {
                    const gradeDivisions = divResult.data.filter((d: any) => {
                        return d['الصف'] === currentGradeName &&
                            (d['المرحلة'] === stageName || d['MrahelID'] === stageId);
                    });

                    setShoabs(gradeDivisions.map((d: any) => ({ 
                        id: d['الرقم'], 
                        name: d['الشعبة'] 
                    })));
                    
                    setHasShoabs(gradeDivisions.length > 0);
                } else {
                    setHasShoabs(false);
                }
            } catch (err) { 
                console.error(err); 
                if (!cancelled) setHasShoabs(false);
            }
        };

        fetchDivisions();
        return () => { cancelled = true; };
    }, [formData.GereadID, schoolName, stageName, schoolId, stageId, grades]);

    // ✅ Effect B: عند تغيير الشعبة (أو عند تغيير الصف إذا لم يكن به شعب) -> جلب الفصول
    useEffect(() => {
        // إعادة تعيين الفصول فقط
        setClasses([]);
        setFormData(p => ({ ...p, ClasesID: '' }));

        if (!selectedGradeName || !schoolName || !stageName) {
            return;
        }

        // لو في شعب ولسه ما اخترتش → فصول فاضية
        if (hasShoabs && !selectedShoabaName) {
            return;
        }

        let cancelled = false;

        const fetchClasses = async () => {
            try {
                let classUrl: string;
                
                if (hasShoabs && selectedShoabaName) {
                    // حالة وجود شعب: جلب فصول الشعبة (inpot=21)
                    classUrl = `${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&SCHER4=${selectedShoabaName}&inpot=21`;
                } else {
                    // حالة عدم وجود شعب: جلب فصول الصف مباشرة (inpot=3)
                    classUrl = `${API_URL}/api/search3?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${selectedGradeName}&inpot=3`;
                }

                const classRes = await fetch(classUrl);
                const classResult = await classRes.json();
                
                if (cancelled) return;
                
                if (classResult.success && classResult.data) {
                    setClasses(classResult.data.map((c: any) => ({ 
                        id: c['الرقم'] || c['ClasesID'], 
                        name: c['الفصل'] || c['ClasesName'] 
                    })));
                } else {
                    setClasses([]);
                }
            } catch (err) {
                console.error(err);
                if (!cancelled) setClasses([]);
            }
        };

        fetchClasses();
        return () => { cancelled = true; };
    }, [selectedGradeName, schoolName, stageName, hasShoabs, selectedShoabaName]);

    // === حساب العمر ===
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
        let days = academicYearStart.getDate() - birthDate.getDate();
        if (days < 0) { months--; const prevMonthDate = new Date(academicYearStart.getFullYear(), academicYearStart.getMonth(), 0); days += prevMonthDate.getDate(); }
        if (months < 0) { years--; months += 12; }
        if (years < 0) setStudentAge('بيانات غير متوافقة');
        else setStudentAge(`${years} سنة و ${months} شهر`);
    }, [formData.BarsDay, work?.yearName, yearId]);

    // === منطق الرقم القومي ===
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

    const getGovName = (c: number) => ({ 1:"القاهرة",2:"الإسكندرية",3:"بورسعيد",4:"السويس",11:"دمياط",12:"الدقهلية",13:"الشرقية",14:"القليوبية",15:"كفر الشيخ",16:"الغربية",17:"المنوفية",18:"البحيرة",19:"الإسماعيلية",21:"الجيزة",22:"بني سويف",23:"الفيوم",24:"المنيا",25:"أسيوط",26:"سوهاج",27:"قنا",28:"أسوان",29:"الأقصر",31:"البحر الأحمر",32:"الوادي الجديد",33:"مطروح",34:"شمال سيناء",35:"جنوب سيناء",88:"خارج القطر" }[c] || 'غير معروف');

    const handleChange = (e: React.ChangeEvent<any>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));

        // تحديث اسم الشعبة المختار لتستخدمه الـ Effects
        if (name === 'ShoabaID') {
            const selected = shoabs.find(s => s.id == value);
            setSelectedShoabaName(selected ? selected.name : '');
        }
    };
    
    const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const r = new FileReader();
            r.onload = () => { setFormData(p => ({ ...p, stud_img: r.result as string })); setPreviewImage(r.result as string); };
            r.readAsDataURL(e.target.files[0]);
        }
    };
const toIntOrNull = (value: string | number | null | undefined): number | null => {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
};
    const save = async () => {
    if (!formData.ArbStudName || !formData.RkemStudKawme) {
        return alert('الاسم والرقم القومي مطلوبين');
    }

    if (!schoolId || !stageId || !yearId) {
        return alert('لا يمكن الحفظ: تأكد من اختيار المدرسة والمرحلة والعام من الشريط العلوي');
    }

    setLoading(true);

    try {
        let cleanImg = formData.stud_img;

        if (cleanImg && cleanImg.startsWith('data:')) {
            cleanImg = cleanImg.split(',')[1];
        }

        const payload = {
            ...formData,

            // ✅ IDs الأساسية
            StudentID: formData['الرقم'],
            SchoolID: schoolId,
            MrahelID: stageId,
            YerID: yearId,

            // ✅ أهم تعديل هنا
            GereadID: toIntOrNull(formData.GereadID),
            ShoabaID: toIntOrNull(formData.ShoabaID), // 🔥 FIX
            ClasesID: toIntOrNull(formData.ClasesID),

            // ✅ الصورة
            stud_img: cleanImg,

            // ✅ نوع العملية
            INPOT: 1
        };

        console.log("Payload:", payload); // للتأكد

        const res = await fetch(`${API_URL}/api/student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            alert('تم الحفظ بنجاح');
            window.location.reload();
        } else {
            alert('خطأ: ' + (data.message || 'حدث خطأ غير متوقع'));
        }

    } catch (err) {
        console.error(err);
        alert('خطأ في الاتصال');
    } finally {
        setLoading(false);
    }
};
    return (
        <div className="min-h-screen bg-slate-100 font-sans" dir="rtl">
            <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
                {/* === HERO HEADER === */}
                <div className="relative bg-gradient-to-l from-violet-700 via-purple-800 to-indigo-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden text-white">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-30 translate-x-1/3 -translate-y-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400 rounded-full blur-[80px] opacity-30 -translate-x-1/2 translate-y-1/2"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-bold mb-4 backdrop-blur-md border border-white/20">
                                <i className="fa-solid fa-graduation-cap text-yellow-300"></i>
                                <span>نظام القيد الأساسي</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-2">تسجيل طالب <span className="text-violet-200">جديد</span></h1>
                            <p className="text-violet-200 text-lg opacity-90">أدخل بيانات الطالب بدقة لضمان سجل أكاديمي صحيح</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <InfoCard title="المدرسة" value={schoolName} sub={`ID: ${schoolId}`} icon="fa-school" />
                            <InfoCard title="المرحلة" value={stageName} sub={`ID: ${stageId}`} icon="fa-layer-group" />
                            <InfoCard title="العام" value={yearId.toString()} icon="fa-calendar-check" />
                        </div>
                    </div>
                </div>

                {/* === MAIN CONTENT === */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* SIDEBAR */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center sticky top-8">
                            {/* Image Section */}
                            <div className="relative w-48 h-48 mx-auto mb-8 group">
                                <div className="w-full h-full rounded-full bg-slate-100 border-4 border-white shadow-xl overflow-hidden">
                                    {previewImage ? <img src={previewImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><i className="fa-solid fa-user text-5xl mb-2"></i><span className="text-xs">صورة الطالب</span></div>}
                                </div>
                                <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                    <div className="text-center text-white transform scale-90 group-hover:scale-100 transition-transform">
                                        <i className="fa-solid fa-camera text-3xl mb-1"></i>
                                        <span className="block text-sm font-bold">رفع صورة</span>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImg} />
                                </label>
                            </div>

                            {/* Info Cards */}
                            <div className="grid grid-cols-1 gap-4 mb-8">
                                <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 flex justify-between items-center">
                                    <div className="text-right">
                                        <span className="text-xs text-violet-400 font-bold uppercase block mb-1">رقم الملف</span>
                                        <span className="text-3xl font-black text-violet-700 block">{formData['الرقم']}</span>
                                    </div>
                                    <i className="fa-solid fa-hashtag text-3xl text-violet-200"></i>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                    <div className="text-right">
                                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1">كود الطالب</span>
                                        <span className="text-lg font-bold text-slate-700 block truncate">{formData.CoedSTUD || 'تلقائي'}</span>
                                    </div>
                                    <i className="fa-solid fa-barcode text-3xl text-slate-200"></i>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex justify-between items-center shadow-sm">
                                    <div className="text-right">
                                        <span className="text-xs text-amber-500 font-bold uppercase block mb-1">العمر (1/10)</span>
                                        <span className="text-xl font-black text-amber-700 block">{studentAge}</span>
                                    </div>
                                    <i className="fa-solid fa-hourglass-half text-3xl text-amber-200"></i>
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <div className="pt-6 border-t border-slate-100 space-y-4">
                                <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold mb-2">إجراءات الحفظ</div>
                                <button onClick={save} disabled={loading} className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold transition-all shadow-lg shadow-violet-200 flex justify-center items-center gap-3 text-xl disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                    {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> جاري الحفظ...</> : <><i className="fa-solid fa-floppy-disk text-2xl"></i> حفظ البيانات</>}
                                </button>
                                <button onClick={() => window.location.reload()} className="w-full py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold transition-all flex justify-center items-center gap-2">
                                    <i className="fa-solid fa-xmark"></i>
                                    إلغاء / مسح
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* FORM GRID */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* 1. Personal Data */}
                        <SectionCard title="البيانات الشخصية" icon="fa-id-card" color="violet">
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
                                    <InputFull label="الرقم القومي" name="FazerKawme" value={formData.FazerKawme} onChange={handleChange} />
                                    <InputFull label="التليفون" name="FazerTele" value={formData.FazerTele} onChange={handleChange} />
                                    <InputFull label="الوظيفة" name="FazerJop" value={formData.FazerJop} onChange={handleChange} />
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-pink-600 font-bold border-b border-pink-100 pb-2 mb-4">بيانات الأم</h4>
                                    <InputFull label="الاسم" name="MazerNam" value={formData.MazerNam} onChange={handleChange} />
                                    <InputFull label="الرقم القومي" name="MazerKwme" value={formData.MazerKwme} onChange={handleChange} />
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
                                    <select name="GereadID" value={formData.GereadID} onChange={handleChange} className="w-full h-12 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white font-medium text-slate-700">
                                        <option value="">اختر الصف...</option>
                                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>

                                {/* القائمة الشرطية للشعب (تظهر فقط إذا كان الصف يملك شعب) */}
                                {hasShoabs && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2">الشعبة</label>
                                        <select name="ShoabaID" value={formData.ShoabaID} onChange={handleChange} className="w-full h-12 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white font-medium text-slate-700">
                                            <option value="">اختر الشعبة...</option>
                                            {shoabs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الفصل</label>
                                    <select 
                                        name="ClasesID" 
                                        value={formData.ClasesID} 
                                        onChange={handleChange} 
                                        disabled={!selectedGradeName || (hasShoabs && !selectedShoabaName)} 
                                        className="w-full h-12 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">
                                            {!selectedGradeName ? 'اختر الصف أولاً' : (hasShoabs && !selectedShoabaName ? 'اختر الشعبة أولاً' : 'اختر الفصل...')}
                                        </option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {selectedGradeName && classes.length === 0 && !hasShoabs && <p className="text-xs text-red-500 mt-1">لا توجد فصول لهذا الصف</p>}
                                    {hasShoabs && selectedShoabaName && classes.length === 0 && <p className="text-xs text-red-500 mt-1">لا توجد فصول لهذه الشعبة</p>}
                                </div>

                                {/* باقي الحقول */}
                                <SelectInput label="حالة القيد" name="HaletKeaed" value={formData.HaletKeaed} onChange={handleChange} opts={['قيد','ناجح','راسب','منقول']} />
                                <InputFull label="اللغة الأولى" name="language_won" value={formData.language_won} onChange={handleChange} />
                                <InputFull label="اللغة الثانية" name="language_two" value={formData.language_two} onChange={handleChange} />
                            </div>
                        </SectionCard>

                        {/* 5. Admin */}
                        <SectionCard title="البيانات الإدارية" icon="fa-clipboard-check" color="slate">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputFull label="الحالة الصحية" name="HelseStud" value={formData.HelseStud} onChange={handleChange} />
                                <InputFull label="موقف المصروفات" name="Masrwfat" value={formData.Masrwfat} onChange={handleChange} />
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">موقف الطالب</label>
                                    <select name="ST_Status" value={formData.ST_Status} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none bg-white text-slate-700 font-medium">
                                        <option value="نشط">نشط</option>
                                        <option value="موقوف">موقوف</option>
                                        <option value="مرحل">مرحل</option>
                                    </select>
                                </div>
                            </div>
                        </SectionCard>

                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Helper Components ---

function InfoCard({ title, value, sub, icon }: any) {
    return (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 min-w-[180px]">
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

function InputFull({ label, name, value, onChange, type = "text", required = false, readOnly = false, mono = false, maxLength, placeholder }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">{label} {required && <span className="text-rose-500">*</span>}</label>
            <input 
                type={type} name={name} value={value} onChange={onChange} readOnly={readOnly} maxLength={maxLength} required={required} placeholder={placeholder}
                className={`w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-slate-700 font-medium ${readOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'} ${mono ? 'font-mono text-lg tracking-widest' : ''}`}
            />
        </div>
    );
}

function SelectInput({ label, name, value, onChange, opts }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">{label}</label>
            <select 
                name={name} 
                value={value} 
                onChange={onChange} 
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none bg-white text-slate-700 font-medium"
            >
                {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}