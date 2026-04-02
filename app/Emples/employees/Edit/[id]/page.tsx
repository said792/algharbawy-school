'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  
const { id } = useParams<{ id: string }>();
const employeeId = id;

console.log("Employee ID:", employeeId);
  const [formData, setFormData] = useState({
    EmploeID: 0,
    EmploeKoed: '',
    NationId: '',
    DateBaric: '',
    MhafzaBaric: '',
    EmploeTyp: '',
    EmploeReling: '',
    EmploeVachnalte: 'مصري', 
    EmploeArName: '',
    EmploeStats: '', 
    EmploeEnName: '', 
    EmploeAdres: '', 
    EmploeFoen: '', 
    EmploeWats: '', 
    EmploeEmail: '', 
    JopStats: '', 
    WazefaID: '', 
    DateEstlam: '', 
    DrgaMalID: '', 
    DateTeieen: '', 
    SabgektID: '', 
    TagassID: '', 
    NoMoehelID: '', 
    gamea: '', 
    MoehelID: '', 
    takderir: '', 
    moehel_Date: '', 
    MNKWEL_MEN: '', 
    SchoolID: user?.schoolId || '', 
    RKEM_KRAER: '', 
    EmplweNSClass: '', 
    EmploeStates: 'نشط', 
    Emploe_iemeg: null as string | null
  });

  const [lists, setLists] = useState({
    jobs: [], grades: [], subjects: [], specializations: [], qualTypes: [], qualifications: []
  });

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // === 1. جلب القوائم ===
  useEffect(() => {
    const fetchLists = async () => {
      try {
        setListsLoading(true);
        const fetchWithFallback = async (url: string) => {
            try {
                const res = await fetch(url);
                const data = await res.json();
                return data.success ? data.data : [];
            } catch (e) { return []; }
        };

        const [jobs, grades, subjects, specs, qualTypes, quals] = await Promise.all([
            fetchWithFallback(`${API_URL}/api/getData/29`), 
            fetchWithFallback(`${API_URL}/api/getData/31`), 
            fetchWithFallback(`${API_URL}/api/getData/35`), 
            fetchWithFallback(`${API_URL}/api/getData/33`), 
            fetchWithFallback(`${API_URL}/api/getData/27`), 
            fetchWithFallback(`${API_URL}/api/getData/25`)  
        ]);

        setLists({ jobs, grades, subjects, specializations: specs, qualTypes, qualifications: quals });
      } catch (err) {
        console.error("Error fetching lists:", err);
      } finally {
        setListsLoading(false);
      }
    };
    fetchLists();
  }, []);

  // === 2. جلب بيانات الموظف (تم التعديل لمعالجة البيانات) ===
  useEffect(() => {
    if (!employeeId) { return; }

    const fetchEmployeeData = async () => {
      try {
        setPageLoading(true);
        const res = await fetch(`${API_URL}/api/getData1/16?id=${employeeId}`);

        if (!res.ok) throw new Error("فشل جلب البيانات");
        
        const data = await res.json();
console.log("API Response:", data);
        if (data.success && data.data) {

  const emp = Array.isArray(data.data)
    ? data.data[0]
    : data.data;

  console.log("Employee Data:", emp);
          
          const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            return dateStr.split('T')[0];
          };

          // دالة مساعدة لاستخراج القيمة بعدة أسماء محتملة
          const getValue = (obj: any, keys: string[]) => {
            for (const key of keys) {
              if (obj[key] !== undefined && obj[key] !== null) return obj[key];
            }
            return '';
          };

         setFormData({
  EmploeID: emp.id || 0,
  EmploeKoed: emp.code || '',
  NationId: emp.nationalId ? String(emp.nationalId).replace('.','').replace('e+','') : '',
  DateBaric: emp.birthDate ? emp.birthDate.split('T')[0] : '',
  MhafzaBaric: emp.birthPlace || '',
  EmploeTyp: emp.gender || '',
  EmploeReling: emp.religion || '',
  EmploeVachnalte: emp.nationality || 'مصري',
  EmploeArName: emp.name || '',
  EmploeStats: emp.maritalStatus || '',
  EmploeEnName: emp.nameEn || '',
  EmploeAdres: emp.address || '',
  EmploeFoen: emp.phone ? String(emp.phone) : '',
  EmploeWats: emp.whatsapp || '',
  EmploeEmail: emp.email || '',
  JopStats: emp.workStatus || '',
  WazefaID: '',
  DateEstlam: emp.startDate ? emp.startDate.split('T')[0] : '',
  DrgaMalID: '',
  DateTeieen: emp.hireDate ? emp.hireDate.split('T')[0] : '',
  SabgektID: '',
  TagassID: '',
  NoMoehelID: '',
  gamea: emp.university || '',
  MoehelID: '',
  takderir: '',
  moehel_Date: emp.qualificationDate ? emp.qualificationDate.split('T')[0] : '',
  MNKWEL_MEN: emp.transferredFrom || '',
  SchoolID: user?.schoolId || '',
  RKEM_KRAER: emp.decisionNumber || '',
  EmplweNSClass: emp.classesCount || '',
  EmploeStates: emp.status || 'نشط',
  Emploe_iemeg: null
});

          if (emp.Emploe_iemeg) setPreviewImage(emp.Emploe_iemeg);
        } else {
          alert("لم يتم العثور على بيانات الموظف");
          router.push('/employees/view');
        }
      } catch (err) {
        console.error("Error fetching employee:", err);
        alert("حدث خطأ في جلب البيانات");
      } finally {
        setPageLoading(false);
      }
    };

    fetchEmployeeData();
  }, [employeeId, router, user]);

  // === 3. منطق الرقم القومي (تم الإصلاح) ===
  useEffect(() => {
    const id = formData.NationId;

    // تم إضافة شرط id للتحقق من وجود القيمة قبل استخدام length
    if (id && id.length === 14 && /^\d+$/.test(id)) {
      const centuryCode = id.charAt(0);
      const year = id.substring(1, 3); 
      const month = id.substring(3, 5); 
      const day = id.substring(5, 7); 

      const m = parseInt(month, 10);
      const d = parseInt(day, 10);
      
      if (m < 1 || m > 12 || d < 1 || d > 31) return;

      let fullYear = "";
      if (centuryCode === "2") fullYear = "19" + year;
      else if (centuryCode === "3") fullYear = "20" + year;
      else return;

      const birthDate = `${fullYear}-${month}-${day}`;
      const genderDigit = parseInt(id.charAt(12), 10);
      const gender = (genderDigit % 2 === 0) ? "أنثى" : "ذكر";
      const govCodeStr = id.substring(7, 9); 
      const govCodeNum = parseInt(govCodeStr, 10);
      const governorate = getGovernorateName(govCodeNum);

      setFormData(prev => ({
        ...prev,
        DateBaric: birthDate,
        EmploeTyp: gender,
        MhafzaBaric: governorate
      }));
    }
  }, [formData.NationId]);

  const getGovernorateName = (code: number) => {
    const governorates: { [key: number]: string } = {
      1: "القاهرة", 2: "الإسكندرية", 3: "بور سعيد", 4: "السويس", 11: "دمياط",
      12: "الدقهلية", 13: "الشرقية", 14: "القليوبية", 15: "كفر الشيخ", 16: "الغربية",
      17: "المنوفية", 18: "البحيرة", 19: "الإسماعيلية", 21: "الجيزة", 22: "بني سويف",
      23: "الفيوم", 24: "المنيا", 25: "أسيوط", 26: "سوهاج", 27: "قنا",
      28: "أسوان", 29: "الأقصر", 31: "البحر الأحمر", 32: "الوادي الجديد", 33: "مطروح",
      34: "شمال سيناء", 35: "جنوب سيناء", 88: "مواليد الخارج"
    };
    return governorates[code] || "غير معروف";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, Emploe_iemeg: reader.result as string }));
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderOptions = (data: any[]) => {
    return data.map((item, index) => {
      const id = item['الرقم'] || item['ID'] || Object.values(item)[0];
      const name = item['الاسم'] || item['الوظيفة'] || item['الدرجة المالية'] || item['مادة التدريس'] || item['التخصص'] || item['المؤهل'] || Object.values(item)[1];
      return <option key={index} value={id}>{name}</option>;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        WazefaID: parseInt(formData.WazefaID) || null,
        DrgaMalID: parseInt(formData.DrgaMalID) || null,
        SabgektID: parseInt(formData.SabgektID) || null,
        TagassID: parseInt(formData.TagassID) || null,
        NoMoehelID: parseInt(formData.NoMoehelID) || null,
        MoehelID: parseInt(formData.MoehelID) || null,
        SchoolID: parseInt(String(formData.SchoolID)) || null, 
        EmploeID: parseInt(String(formData.EmploeID)) || 0,
        operation: 2 
      };

      const res = await fetch(`${API_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('تم تحديث بيانات الموظف بنجاح');
        router.push('/Emples/employees/view');
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const AddButton = ({ path, label }: { path: string, label: string }) => (
    <button type="button" onClick={() => router.push(path)} title={`إضافة ${label} جديد`}
      style={{ padding: '0 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
      +
    </button>
  );

  const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' };
  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' };
  const selectContainerStyle = { display: 'flex', gap: '5px' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#334155' };
  const sectionTitleStyle = { borderBottom: '2px solid #1e40af', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' };

  if (pageLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}><h2>جاري تحميل بيانات الموظف...</h2></div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#1e40af' }}>تعديل بيانات موظف</h1>
      
      {listsLoading ? <div style={{textAlign:'center', padding:'20px'}}>جاري تحميل القوائم...</div> : (
      
      <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        
        <div style={{ marginBottom: '20px', padding: '10px', background: '#e0f2fe', borderRadius: '6px', color: '#0369a1', fontWeight: 'bold', textAlign: 'center' }}>
          رقم الموظف: {formData.EmploeID}
        </div>

        {/* حقول الفورم تبقى كما هي */}
        <h3 style={sectionTitleStyle}>البيانات الشخصية</h3>
        <div style={formGridStyle}>
            <div><label style={labelStyle}>الاسم بالعربي *</label><input type="text" name="EmploeArName" value={formData.EmploeArName} onChange={handleChange} required style={inputStyle} /></div>
            <div><label style={labelStyle}>الاسم بالإنجليزي</label><input type="text" name="EmploeEnName" value={formData.EmploeEnName} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>الرقم القومي *</label><input type="text" name="NationId" value={formData.NationId} onChange={handleChange} maxLength={14} required style={inputStyle} placeholder="14 رقم" /></div>
            <div><label style={labelStyle}>تاريخ الميلاد</label><input type="date" name="DateBaric" value={formData.DateBaric} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>النوع</label><select name="EmploeTyp" value={formData.EmploeTyp} onChange={handleChange} style={inputStyle}><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option></select></div>
            <div><label style={labelStyle}>الديانة</label><select name="EmploeReling" value={formData.EmploeReling} onChange={handleChange} style={inputStyle}><option value="">اختر...</option><option value="مسلم">مسلم</option><option value="مسيحي">مسيحي</option></select></div>
            <div><label style={labelStyle}>الحالة الاجتماعية</label><input type="text" name="EmploeStats" value={formData.EmploeStats} onChange={handleChange} style={inputStyle} placeholder="أعزب / متزوج ..." /></div>
            <div><label style={labelStyle}>الجنسية</label><input type="text" name="EmploeVachnalte" value={formData.EmploeVachnalte} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>محافظة الميلاد</label><input type="text" name="MhafzaBaric" value={formData.MhafzaBaric} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>العنوان</label><input type="text" name="EmploeAdres" value={formData.EmploeAdres} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>رقم الهاتف</label><input type="text" name="EmploeFoen" value={formData.EmploeFoen} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>ال WhatsApp</label><input type="text" name="EmploeWats" value={formData.EmploeWats} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>البريد الإلكتروني</label><input type="email" name="EmploeEmail" value={formData.EmploeEmail} onChange={handleChange} style={inputStyle} /></div>
        </div>

        <h3 style={sectionTitleStyle}>بيانات الوظيفة</h3>
        <div style={formGridStyle}>
            <div><label style={labelStyle}>كود الموظف</label><input type="text" name="EmploeKoed" value={formData.EmploeKoed} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>الوظيفة</label><div style={selectContainerStyle}><select name="WazefaID" value={formData.WazefaID} onChange={handleChange} style={inputStyle}><option value="">اختر الوظيفة...</option>{renderOptions(lists.jobs)}</select><AddButton path="/system/muahalat-wazayif/job" label="وظيفة" /></div></div>
            <div><label style={labelStyle}>تاريخ التعيين</label><input type="date" name="DateTeieen" value={formData.DateTeieen} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>تاريخ استلام العمل</label><input type="date" name="DateEstlam" value={formData.DateEstlam} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>الدرجة المالية</label><div style={selectContainerStyle}><select name="DrgaMalID" value={formData.DrgaMalID} onChange={handleChange} style={inputStyle}><option value="">اختر الدرجة...</option>{renderOptions(lists.grades)}</select><AddButton path="/system/muahalat-wazayif/financial-grade" label="درجة مالية" /></div></div>
            <div><label style={labelStyle}>حالة العمل</label><input type="text" name="JopStats" value={formData.JopStats} onChange={handleChange} style={inputStyle} /></div>
             <div><label style={labelStyle}>حالة الموظف</label><select name="EmploeStates" value={formData.EmploeStates} onChange={handleChange} style={inputStyle}><option value="نشط">نشط</option><option value="منتهي خدمة">منتهي خدمة</option><option value="اجازة">أجازة</option><option value="عارض">عارض</option></select></div>
            <div><label style={labelStyle}>عدد الحصص</label><input type="text" name="EmplweNSClass" value={formData.EmplweNSClass} onChange={handleChange} style={inputStyle} /></div>
        </div>

        <h3 style={sectionTitleStyle}>المؤهل الدراسي</h3>
        <div style={formGridStyle}>
            <div><label style={labelStyle}>الجامعة</label><input type="text" name="gamea" value={formData.gamea} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>نوع المؤهل</label><div style={selectContainerStyle}><select name="NoMoehelID" value={formData.NoMoehelID} onChange={handleChange} style={inputStyle}><option value="">اختر النوع...</option>{renderOptions(lists.qualTypes)}</select><AddButton path="/system/muahalat-wazayif/qualType" label="نوع مؤهل" /></div></div>
            <div><label style={labelStyle}>المؤهل</label><div style={selectContainerStyle}><select name="MoehelID" value={formData.MoehelID} onChange={handleChange} style={inputStyle}><option value="">اختر المؤهل...</option>{renderOptions(lists.qualifications)}</select><AddButton path="/system/muahalat-wazayif/qualification" label="مؤهل" /></div></div>
            <div><label style={labelStyle}>التقدير</label><input type="text" name="takderir" value={formData.takderir} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>تاريخ المؤهل</label><input type="date" name="moehel_Date" value={formData.moehel_Date} onChange={handleChange} style={inputStyle} /></div>
        </div>

        <h3 style={sectionTitleStyle}>البيانات الإدارية والمناقلات</h3>
        <div style={formGridStyle}>
            <div><label style={labelStyle}>مادة التدريس</label><div style={selectContainerStyle}><select name="SabgektID" value={formData.SabgektID} onChange={handleChange} style={inputStyle}><option value="">اختر المادة...</option>{renderOptions(lists.subjects)}</select><AddButton path="/system/hikal-dirasaa/subject" label="مادة" /></div></div>
            <div><label style={labelStyle}>التخصص</label><div style={selectContainerStyle}><select name="TagassID" value={formData.TagassID} onChange={handleChange} style={inputStyle}><option value="">اختر التخصص...</option>{renderOptions(lists.specializations)}</select><AddButton path="/system/muahalat-wazayif/specialization" label="تخصص" /></div></div>
            <div><label style={labelStyle}>منقول من</label><input type="text" name="MNKWEL_MEN" value={formData.MNKWEL_MEN} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>منقول إلي (المدرسة الحالية)</label><select name="SchoolID" value={formData.SchoolID} disabled style={{...inputStyle, backgroundColor: '#e2e8f0', color: '#64748b', cursor: 'not-allowed'}}><option value={user?.schoolId}>{user?.schoolName || 'المدرسة الحالية'}</option></select></div>
            <div><label style={labelStyle}>رقم القرار</label><input type="text" name="RKEM_KRAER" value={formData.RKEM_KRAER} onChange={handleChange} style={inputStyle} /></div>
        </div>
        
        <div style={{ marginTop: '20px', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
            <label style={{...labelStyle, marginBottom: '10px'}}>صورة الموظف</label>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ width: '100%' }} />
            {previewImage && (
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <img src={previewImage} alt="Preview" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '50%', border: '4px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                </div>
            )}
        </div>

        <div style={{ marginTop: '40px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => router.back()} style={{ padding: '12px 25px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>إلغاء</button>
            <button type="submit" disabled={loading} style={{ padding: '12px 40px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>{loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
        </div>
      </form>
      )}
    </div>
  );
}