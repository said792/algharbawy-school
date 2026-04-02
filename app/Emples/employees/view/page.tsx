'use client';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { useAuthStore } from "@/store/authStore";

interface Employee {
  EmploeID: number;
  EmploeArName: string;
  NationId: string;
  WazefaName?: string; 
  EmploeStats: string;
}

// === 1. مكون المحتوى ===
function EmployeesContent() {
  const router = useRouter();
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams();

  // ✨ استخراج البيانات من الرابط (لو تم فتحها من لوحة تحكم المدير)
  const externalSchoolId = searchParams.get('schoolId');
  const externalSchoolName = searchParams.get('schoolName');
  
  // تحديد الـ ID واسم المدرسة اللي هيتم العمل عليها
  const targetSchoolId = externalSchoolId || user?.schoolId;
  const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة الحالية';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  // حالات العرض
  const [viewType, setViewType] = useState<'active' | 'suspended'>('active');
  
  // حالات الإحصائيات
  const [activeCount, setActiveCount] = useState(0);
  const [suspendedCount, setSuspendedCount] = useState(0);

  // ✅ متغير للتأكد من تحميل الصفحة (لمنع مشكلة الهيدريشن زي صفحة الغياب بالظبط)
  const [mounted, setMounted] = useState(false);

  // === 1. التأكد من تحميل الصفحة ===
  useEffect(() => {
    setMounted(true);
  }, []);

  // === 2. التحقق من تسجيل الدخول ===
  useEffect(() => {
    if (mounted && (!user || !work)) {
      window.location.href = '/login'; 
    }
  }, [mounted, user, work]);

  // === 3. جلب الإحصائيات عند تحميل الصفحة أو تغيير المدرسة الهدف ===
  useEffect(() => {
    if (mounted && targetSchoolId) fetchStats(targetSchoolId);
  }, [mounted, targetSchoolId]);

  // === 4. جلب بيانات الجدول بناءً على التبويب المختار ===
  useEffect(() => {
    if (mounted && targetSchoolId) fetchEmployees(targetSchoolId, viewType);
  }, [mounted, targetSchoolId, viewType]);

  // === 5. الفلترة بالبحث ===
  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(
      employees.filter(e =>
        e.EmploeArName?.toLowerCase().includes(s) ||
        e.NationId?.includes(s) ||
        e.WazefaName?.toLowerCase().includes(s)
      )
    );
  }, [search, employees]);

  const fetchStats = async (schoolId: string | number | undefined) => {
    if(!schoolId) return;
    try {
      const resActive = await fetch(`${API_URL}/api/getData1/14?id=${schoolId}`);
      const dataActive = await resActive.json();
      setActiveCount(dataActive.success ? (dataActive.data?.length || 0) : 0);

      const resSuspended = await fetch(`${API_URL}/api/getData1/27?id=${schoolId}`);
      const dataSuspended = await resSuspended.json();
      setSuspendedCount(dataSuspended.success ? (dataSuspended.data?.length || 0) : 0);
    } catch (err) {
      console.error("Error fetching stats", err);
    }
  };

  const fetchEmployees = async (schoolId: string | number | undefined, type: 'active' | 'suspended') => {
    if(!schoolId) return;
    try {
      setLoading(true);
      const inpot = type === 'active' ? 14 : 27;
      const res = await fetch(`${API_URL}/api/getData1/${inpot}?id=${schoolId}`);
      
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        const formattedData = data.data.map((item: any) => ({
          EmploeID: item.id, 
          EmploeArName: item.name || 'غير معروف',
          NationId: item.nationalId || '',
          WazefaName: item.job || 'غير محدد',
          EmploeStats: item.status || (type === 'active' ? 'نشط' : 'موقوف'),
        }));
        setEmployees(formattedData);
        setFiltered(formattedData);
      } else {
        setEmployees([]);
        setFiltered([]);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ في جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل تريد حذف الموظف نهائياً؟")) return;
    try {
      const res = await fetch(`${API_URL}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: 3, EmploeID: id })
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(prev => prev.filter(e => e.EmploeID !== id));
        setFiltered(prev => prev.filter(e => e.EmploeID !== id));
        if (targetSchoolId) fetchStats(targetSchoolId);
      } else {
        alert("فشل حذف الموظف");
      }
    } catch (err) {
      alert("خطأ في الاتصال بالسيرفر");
    }
  };

  const handleEdit = (id: number | string) => {
    if (!id && id !== 0) return alert("خطأ: لا يوجد رقم تعريف للموظف!");
    router.push(`/Emples/employees/Edit/${id}`);
  };

  // ✅ منع العرض أثناء التحميل الأولي
  if (!mounted) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحميل النظام...</div>;
  }

  // التحقق النهائي
  if (!user || !work) {
     return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري تحويلك لصفحة الدخول...</div>;
  }

  // === التنسيقات ===
  const containerStyle: React.CSSProperties = {
    padding: "30px", maxWidth: 1400, margin: "auto", direction: "rtl", 
    fontFamily: "Tajawal, sans-serif", background: "#f1f5f9", minHeight: "100vh"
  };

  const cardStyle: React.CSSProperties = {
    background: "white", borderRadius: 16, boxShadow: "0 4px 15px rgba(0,0,0,0.05)", 
    border: "1px solid #e2e8f0", overflow: "hidden"
  };

  const statCard = (bg: string, color: string, border: string): React.CSSProperties => ({
    flex: 1, minWidth: "200px", padding: "20px", borderRadius: 16, 
    background: bg, color: color, borderLeft: `6px solid ${border}`,
    display: "flex", flexDirection: "column", justifyContent: "center"
  });

  return (
    <div style={containerStyle}>
      
      {/* الهيدر (عرض اسم المدرسة ديناميكياً) */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", color: "white", padding: "30px", borderRadius: 20, marginBottom: 25, boxShadow: "0 10px 20px rgba(30, 58, 138, 0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px" }}>👥 إدارة الموظفين</h1>
            <p style={{ margin: "5px 0 0", opacity: 0.9, fontSize: "14px" }}>{displaySchoolName} - عرض وإدارة بيانات الموظفين وحالتهم الوظيفية</p>
          </div>
          <button
            onClick={() => router.push("/employees/add")}
            style={{ background: "white", color: "#1e3a8a", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: "bold", cursor: "pointer", fontSize: "15px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            + إضافة موظف جديد
          </button>
        </div>
      </div>

      {/* كروت الإحصائيات */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "25px", flexWrap: "wrap" }}>
        <div style={statCard("#f0fdf4", "#166534", "#22c55e")}>
          <span style={{ fontSize: "14px", opacity: 0.8 }}>موظفين نشطين</span>
          <span style={{ fontSize: "32px", fontWeight: "bold", marginTop: "5px" }}>{activeCount}</span>
        </div>
        <div style={statCard("#fef2f2", "#991b1b", "#ef4444")}>
          <span style={{ fontSize: "14px", opacity: 0.8 }}>موظفين موقفين</span>
          <span style={{ fontSize: "32px", fontWeight: "bold", marginTop: "5px" }}>{suspendedCount}</span>
        </div>
        <div style={statCard("#eff6ff", "#1e40af", "#3b82f6")}>
          <span style={{ fontSize: "14px", opacity: 0.8 }}>إجمالي الموظفين</span>
          <span style={{ fontSize: "32px", fontWeight: "bold", marginTop: "5px" }}>{activeCount + suspendedCount}</span>
        </div>
      </div>

      {/* كارت الفلاتر والبحث */}
      <div style={{ ...cardStyle, padding: "20px", marginBottom: "25px" }}>
        <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: "4px", gap: "4px" }}>
            <button
              onClick={() => setViewType('active')}
              style={{
                background: viewType === 'active' ? "white" : "transparent",
                color: viewType === 'active' ? "#166534" : "#64748b",
                border: "none", padding: "10px 25px", borderRadius: 10, fontWeight: "bold",
                cursor: "pointer", boxShadow: viewType === 'active' ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s"
              }}>
              ✅ النشطين
            </button>
            <button
              onClick={() => setViewType('suspended')}
              style={{
                background: viewType === 'suspended' ? "white" : "transparent",
                color: viewType === 'suspended' ? "#991b1b" : "#64748b",
                border: "none", padding: "10px 25px", borderRadius: 10, fontWeight: "bold",
                cursor: "pointer", boxShadow: viewType === 'suspended' ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s"
              }}>
              🚫 الموقفين
            </button>
          </div>

          <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
            <input
              placeholder="بحث بالاسم، الرقم القومي، أو الوظيفة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "12px 15px 12px 40px", borderRadius: 10,
                border: "2px solid #e2e8f0", outline: "none", fontSize: "14px",
                background: "#f8fafc"
              }}
            />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "18px" }}>🔍</span>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div style={cardStyle}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, fontWeight: "bold", color: "#3b82f6" }}>
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>⏳</div>
            جاري تحميل بيانات الموظفين...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={thStyle}>م</th>
                <th style={thStyle}>الاسم بالكامل</th>
                <th style={thStyle}>الرقم القومي</th>
                <th style={thStyle}>الوظيفة</th>
                <th style={{...thStyle, textAlign: "center"}}>الحالة</th>
                <th style={{...thStyle, textAlign: "center"}}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((emp, index) => (
                <tr key={emp.EmploeID ? `emp-${emp.EmploeID}` : `emp-row-${index}`}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
                  
                  <td style={{...tdStyle, color: "#94a3b8", fontWeight: "bold"}}>{index + 1}</td>
                  <td style={{...tdStyle, fontWeight: "bold", color: "#0f172a"}}>{emp.EmploeArName}</td>
                  <td style={{...tdStyle, fontFamily: "monospace", direction: "ltr", textAlign: "right"}}>{emp.NationId}</td>
                  <td style={tdStyle}>{emp.WazefaName}</td>
                  
                  <td style={{...tdStyle, textAlign: "center"}}>
                    <span style={{
                      padding: "6px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold",
                      background: emp.EmploeStats === "نشط" ? "#dcfce7" : "#fee2e2",
                      color: emp.EmploeStats === "نشط" ? "#166534" : "#991b1b"
                    }}>
                      {emp.EmploeStats === "نشط" ? "● نشط" : "● موقوف"}
                    </span>
                  </td>

                  <td style={{...tdStyle, textAlign: "center"}}>
                    <button 
                      onClick={() => handleEdit(emp.EmploeID)} 
                      style={{...btnStyle, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe"}}
                      onMouseEnter={e => { e.currentTarget.style.background = "#2563eb"; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; }}>
                      تعديل
                    </button>
                    <button 
                      onClick={() => handleDelete(emp.EmploeID)} 
                      style={{...btnStyle, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", marginRight: "8px"}}
                      onMouseEnter={e => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}>
                      حذف
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 50, color: "#94a3b8", fontSize: "16px" }}>
                    {search ? "لا توجد نتائج مطابقة للبحث" : `لا يوجد موظفين ${viewType === 'active' ? 'نشطين' : 'موقفين'}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// === 2. المكون الرئيسي مع الـ Suspense ===
export default function EmployeesPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl' }}>جاري التحميل...</div>}>
      <EmployeesContent />
    </Suspense>
  );
}

// === تنسيقات مساعدة ===
const thStyle: React.CSSProperties = {
  padding: "16px 20px", textAlign: "right" as const, fontSize: "13px", 
  fontWeight: "bold", color: "#64748b"
};

const tdStyle: React.CSSProperties = {
  padding: "16px 20px", textAlign: "right" as const, fontSize: "14px", color: "#334155"
};

const btnStyle: React.CSSProperties = {
  border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", 
  fontWeight: "bold", fontSize: "13px", transition: "all 0.2s"
};