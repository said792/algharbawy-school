'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { useAuthStore } from "@/store/authStore";
// استيراد مكتبة الإكسل
import * as XLSX from 'xlsx';

// --- 1. داتا تايب شاملة لكل الحقول من الـ SQL ---
interface Employee {
  id: number;
  code: string;
  nationalId: string;
  birthDate: string;
  birthPlace: string;
  gender: string;
  religion: string;
  nationality: string;
  name: string;
  maritalStatus: string;
  nameEn: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  workStatus: string;
  job: string;
  startDate: string;
  financialGrade: string;
  hireDate: string;
  subject: string;
  specialization: string;
  qualificationType: string;
  university: string;
  qualification: string;
  grade: string;
  qualificationDate: string;
  transferredFrom: string;
  transferredTo: string;
  decisionNumber: string;
  classesCount: number;
  status: string;
  image: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const componentRef = useRef<HTMLDivElement>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // الفلاتر
  const [filters, setFilters] = useState({
    name: "",
    code: "",
    job: "",
    specialization: "",
    subject: "",
    nationalId: "",
  });

  // تعريف كل الأعمدة
  const [columnsConfig, setColumnsConfig] = useState([
    { key: "image", label: "الصورة", visible: false },
    { key: "code", label: "الكود", visible: true },
    { key: "name", label: "الاسم", visible: true },
    { key: "nationalId", label: "الرقم القومي", visible: true },
    { key: "job", label: "المسمى الوظيفي", visible: true },
    { key: "specialization", label: "التخصص", visible: true },
    { key: "subject", label: "المادة", visible: true },
    { key: "phone", label: "الهاتف", visible: false },
    { key: "email", label: "البريد الإلكتروني", visible: false },
    { key: "gender", label: "النوع", visible: false },
    { key: "religion", label: "الديانة", visible: false },
    { key: "nationality", label: "الجنسية", visible: false },
    { key: "maritalStatus", label: "الحالة الاجتماعية", visible: false },
    { key: "address", label: "العنوان", visible: false },
    { key: "startDate", label: "تاريخ التعيين", visible: false },
    { key: "hireDate", label: "تاريخ المباشرة", visible: false },
    { key: "financialGrade", label: "الدرجة المالية", visible: false },
    { key: "qualification", label: "المؤهل", visible: false },
    { key: "university", label: "الجامعة", visible: false },
    { key: "grade", label: "التقدير", visible: false },
    { key: "status", label: "الحالة", visible: true },
    { key: "workStatus", label: "حالة العمل", visible: false },
  ]);

  const [showColMenu, setShowColMenu] = useState(false);

  useEffect(() => {
    if (user?.schoolId) fetchEmployees(user.schoolId);
  }, [user]);

  // === تعديل الدالة لاستخدام منطق الـ Mapping من الكود الثاني ===
  const fetchEmployees = async (schoolId: number) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
      
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();

      if (data.success && data.data) {
        // نقوم بربط البيانات القادمة (API Keys) مع الحقول الموجودة في الـ Interface
        const formattedData = data.data.map((item: any) => {
          return {
            // تعديل أسماء الحقول لتتوافق مع الجدول
            id: item.id || 0,
            code: item.code || item.EmploeKoed || '',
            name: item.name || item.EmploeArName || 'غير معروف',
            nationalId: item.nationalId || item.NationId || '',
            job: item.job || item.WazefaName || 'غير محدد',
            specialization: item.specialization || item.TagassName || '',
            subject: item.subject || item.SabgektName || '',
            status: item.status || item.EmploeStates || 'نشط',
            
            // باقي الحقول (نحاول جلبها بأي اسم محتمل)
            image: item.image || item.Emploe_iemeg || '',
            birthDate: item.birthDate || item.DateBaric || '',
            birthPlace: item.birthPlace || item.MhafzaBaric || '',
            gender: item.gender || item.EmploeTyp || '',
            religion: item.religion || item.EmploeReling || '',
            nationality: item.nationality || item.EmploeVachnalte || '',
            maritalStatus: item.maritalStatus || item.EmploeStats || '',
            nameEn: item.nameEn || item.EmploeEnName || '',
            address: item.address || item.EmploeAdres || '',
            phone: item.phone || item.EmploeFoen || '',
            whatsapp: item.whatsapp || item.EmploeWats || '',
            email: item.email || item.EmploeEmail || '',
            workStatus: item.workStatus || item.JopStats || '',
            startDate: item.startDate || item.DateTeieen || '',
            financialGrade: item.financialGrade || item.DrgaMalName || '',
            hireDate: item.hireDate || item.DateEstlam || '',
            qualificationType: item.qualificationType || item.NoMoehelName || '',
            university: item.university || item.gamea || '',
            qualification: item.qualification || item.MoehelName || '',
            grade: item.grade || item.takderir || '',
            qualificationDate: item.qualificationDate || item.moehel_Date || '',
            transferredFrom: item.transferredFrom || item.MNKWEL_MEN || '',
            transferredTo: item.transferredTo || item.SchoolName || '',
            decisionNumber: item.decisionNumber || item.RKEM_KRAER || '',
            classesCount: item.classesCount || item.EmplweNSClass || 0,
          };
        });

        setEmployees(formattedData);
        setFiltered(formattedData);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ في جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  // دالة الفلترة
  useEffect(() => {
    const s = filters;
    const result = employees.filter((e) => {
      return (
        e.name?.toLowerCase().includes(s.name.toLowerCase()) &&
        e.code?.toLowerCase().includes(s.code.toLowerCase()) &&
        e.nationalId?.includes(s.nationalId) &&
        e.job?.toLowerCase().includes(s.job.toLowerCase()) &&
        e.specialization?.toLowerCase().includes(s.specialization.toLowerCase()) &&
        e.subject?.toLowerCase().includes(s.subject.toLowerCase())
      );
    });
    setFiltered(result);
  }, [filters, employees]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleColumn = (index: number) => {
    const newConfig = [...columnsConfig];
    newConfig[index].visible = !newConfig[index].visible;
    setColumnsConfig(newConfig);
  };

  // --- دالة تصدير إكسل محسنة (باستخدام مكتبة xlsx) ---
  const exportToExcel = () => {
    const visibleCols = columnsConfig.filter(c => c.visible);
    
    // تجهيز البيانات بصيغة Key-Value بناء على الأعمدة الظاهرة
    const excelData = filtered.map(emp => {
      const row: any = {};
      visibleCols.forEach(col => {
        // نستخدم الاسم العربي كـ Header في الإكسل
        row[col.label] = emp[col.key as keyof Employee] || "-";
      });
      return row;
    });

    // إنشاء الورقة
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // ضبط عرض الأعمدة تلقائياً (ميزة إضافية)
    const wscols = visibleCols.map(() => ({ wch: 20 })); // عرض 20 لكل عمود
    worksheet['!cols'] = wscols;

    // إنشاء المصنف
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير الموظفين");

    // حفظ الملف
    XLSX.writeFile(workbook, "Employee_Report.xlsx");
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    let bg = "#f1f5f9", color = "#64748b";
    if (status === "نشط") { bg = "#dcfce7"; color = "#166534"; }
    else if (status === "موقوف") { bg = "#fee2e2"; color = "#991b1b"; }
    else if (status === "إجازة") { bg = "#e0f2fe"; color = "#075985"; }
    
    return (
      <span style={{
        padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold",
        backgroundColor: bg, color: color, whiteSpace: "nowrap"
      }}>
        {status}
      </span>
    );
  };

  const getImageSrc = (img: string) => {
    if (!img) return "/avatar.png";
    if (img.startsWith("http")) return img;
    return `${API_URL}/${img}`;
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "auto", direction: "rtl", fontFamily: "Tajawal, sans-serif" }} ref={componentRef}>
      
      {/* --- Header & Actions --- */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ color: "#1e3a8a", fontWeight: "800", fontSize: "24px", margin: 0 }}>📋 سجل الموظفين الشامل</h2>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={exportToExcel} style={actionButton("#107c41")}>
            📥 تصدير Excel
          </button>
          <button onClick={handlePrint} style={actionButton("#2563eb")}>
            🖨️ طباعة التقرير
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowColMenu(!showColMenu)} style={actionButton("#475569")}>
              ⚙️ الأعمدة
            </button>
            {showColMenu && (
              <div style={columnMenuStyle}>
                <div style={{ padding: "5px", borderBottom: "1px solid #eee", marginBottom: "5px", fontWeight: "bold", fontSize: "12px" }}>
                  حدد الأعمدة للعرض:
                </div>
                {columnsConfig.map((col, idx) => (
                  <label key={col.key} style={checkboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumn(idx)}
                      style={{ marginLeft: "8px", accentColor: "#1e3a8a" }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Filters --- */}
      <div className="no-print" style={{
        background: "white", padding: "20px", borderRadius: "12px",
        marginBottom: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        border: "1px solid #e2e8f0"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px" }}>
          {[
            { id: "name", ph: "اسم الموظف" },
            { id: "nationalId", ph: "الرقم القومي" },
            { id: "code", ph: "كود الموظف" },
            { id: "job", ph: "المسمى الوظيفي" },
            { id: "specialization", ph: "التخصص" },
            { id: "subject", ph: "المادة" },
          ].map((field) => (
            <input
              key={field.id}
              placeholder={field.ph}
              value={filters[field.id as keyof typeof filters]}
              onChange={(e) => handleFilterChange(field.id, e.target.value)}
              style={inputStyle}
            />
          ))}
        </div>
        <div style={{ marginTop: "15px", textAlign: "left" }}>
          <button 
            onClick={() => setFilters({ name: "", code: "", job: "", specialization: "", subject: "", nationalId: "" })}
            style={{ ...secondaryButton, fontSize: "13px" }}
          >
            مسح الفلاتر
          </button>
        </div>
      </div>

      {/* --- Table Area --- */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 50, color: "#3b82f6" }}>جاري التحميل...</div>
      ) : (
        <div style={{
            background: "white", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            overflow: "hidden", border: "1px solid #e2e8f0"
          }}>
          <div style={{ overflowX: "auto", maxHeight: "70vh" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
              <thead>
                <tr style={{ background: "#1e3a8a", color: "white", position: "sticky", top: 0, zIndex: 10 }}>
                  {columnsConfig.filter(c => c.visible).map((col) => (
                    <th key={col.key} style={thStyle}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((emp, idx) => (
                  <tr key={emp.id} style={{
                    borderBottom: "1px solid #f1f5f9",
                    backgroundColor: idx % 2 === 0 ? "white" : "#f8fafc",
                    transition: "0.2s"
                  }}>
                    {columnsConfig.filter(c => c.visible).map((col) => (
                      <td key={col.key} style={tdStyle}>
                        {col.key === "image" ? (
                          <img 
                            src={getImageSrc(emp.image)} 
                            alt="img" 
                            style={{ width: "35px", height: "35px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
                          />
                        ) : col.key === "status" ? (
                          getStatusBadge(emp.status)
                        ) : (
                          emp[col.key as keyof Employee] || "-"
                        )}
                      </td>
                    ))}
                  </tr>
                )) : (
                  <tr><td colSpan={columnsConfig.length} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>لا توجد بيانات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Styles for Print (تحسينات الطباعة) --- */}
      <style jsx global>{`
        @media print {
          /* إجبار الطباعة على وضع أفقي (Landscape) ومسافات صغيرة */
          @page {
            size: landscape;
            margin: 10mm;
          }

          .no-print {
            display: none !important;
          }

          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 11pt; /* حجم خط مناسب للقراءة */
          }

          /* إخفاء الحواف والظلال */
          div {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* تنسيق الجدول للطباعة */
          table {
            width: 100% !important;
            border: 1px solid #000 !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }

          thead {
            display: table-header-group; /* تكرار الهيدر في كل صفحة */
          }

          th {
            background-color: #ddd !important;
            color: black !important;
            border: 1px solid #000 !important;
            padding: 8px !important;
            font-size: 10pt;
            white-space: nowrap;
          }

          td {
            border: 1px solid #000 !important;
            padding: 6px !important;
            font-size: 10pt;
            color: #000;
          }

          /* منع كسر الصفوف في منتصف الموظف */
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          /* إخفاء الصور لتوفير الحبر */
          img {
            display: none !important;
          }
          
          /* إخفاء بادجات الحالة وتحويلها لنص عادي */
          span {
            background: none !important;
            color: black !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

/* --- Styles Objects --- */
const thStyle = {
  padding: "12px 15px",
  textAlign: "right" as const,
  fontSize: "13px",
  fontWeight: "700",
  whiteSpace: "nowrap" as const,
  borderBottom: "2px solid #1e40af"
};

const tdStyle = {
  padding: "10px 15px",
  textAlign: "right" as const,
  fontSize: "13px",
  color: "#334155",
  verticalAlign: "middle" as const,
  whiteSpace: "nowrap" as const
};

const inputStyle = {
  width: "100%",
  padding: "10px 15px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  outline: "none",
  fontSize: "14px",
  fontFamily: "inherit",
  transition: "border 0.2s"
};

const actionButton = (bg: string) => ({
  backgroundColor: bg,
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
});

const secondaryButton = {
  background: "white",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  padding: "8px 16px",
  cursor: "pointer",
  color: "#475569",
  fontWeight: "bold"
};

const columnMenuStyle = {
  position: "absolute" as const,
  top: "100%",
  left: "0",
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
  zIndex: 50,
  minWidth: "200px",
  maxHeight: "300px",
  overflowY: "auto" as const,
  padding: "10px"
};

const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  padding: "6px 0",
  cursor: "pointer",
  fontSize: "13px",
  color: "#334155",
  borderBottom: "1px solid #f8fafc"
};