'use client';

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { API_URL } from "@/lib/config";

// === السطر السحري لإصلاح مشكلة البناء ===
export const dynamic = 'force-dynamic';

// === واجهات بيانات الإجازات (نفس التصميم الأصلي) ===
interface LeaveTypeSummary {
  نوع: string;
  رصيد_السنة: number;
  اجمالي_الحاصل_عليه: number;
  اجمالي_الرصيد: number;
  نسبة_الاستخدام: number;
  تفاصيل: EmployeeCard[];
}

interface EmployeeCard {
  مسلسل: number;
  الموظف: string;
  الوظيفة: string;
  نوع_الاجازة: string;
  تاريخ_البدء: string;
  تاريخ_الانتهاء: string;
  المدة: number;
}

interface EmployeeSummary {
  الموظف: string;
  الوظيفة: string;
  leaveTypes: LeaveTypeSummary[];
}

// === 1. مكون المحتوى (داخل Suspense) ===
function LeaveDashboardContent() {
  const { user, work } = useAuthStore();
  const searchParams = useSearchParams();

  // === منطق قراءة المعرفات (مصلح ليعمل من الجانبين) ===
  const externalSchoolId = searchParams.get('schoolId');
  const externalSchoolName = searchParams.get('schoolName');
  const targetSchoolId = externalSchoolId || user?.schoolId;
  const displaySchoolName = externalSchoolName || user?.schoolName || 'المدرسة';

  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const formatNumber = useCallback((num: number) => new Intl.NumberFormat('ar-EG').format(num || 0), []);

  // === التحقق من تسجيل الدخول (تم الإصلاح) ===
   // === التحقق من تسجيل الدخول (تم التعديل لإصلاح مشكلة التوجيه السريع) ===
  useEffect(() => {
    // نزيد الوقت إلى 500 مللي ثانية لضمان أن بيانات المستخدم (User)
    // قد تم تحميلها من الذاكرة المحلية بالكامل قبل التحقق
    const timer = setTimeout(() => {
      setIsAuthChecked(true);
      
      if (!user) {
        // إذا انقضى الوقت ولا يزال المستخدم غير موجود، عندها نتأكد أنه غير مسجل
        window.location.href = '/login'; 
      }
    }, 500); // <--- التغيير هنا: كان 0 وأصبح 500

    // تنظيف المؤقت عند إلغاء تحميل المكون
    return () => clearTimeout(timer);
  }, [user]);

  // === جلب البيانات (تم الإصلاح لاستخدام targetSchoolId) ===
  useEffect(() => {
    if (!isAuthChecked || !user || !targetSchoolId || !work?.yearId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // استخدام targetSchoolId هنا هو المفتاح ليعمل من المدير العام
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${work.yearId}&inpout=34`);
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          const grouped: { [key: string]: EmployeeSummary } = {};

          data.data.forEach((item: any) => {
            const empKey = item.الموظف;
            const leaveType = item["نوع الاجازة"];

            if (!grouped[empKey]) {
              grouped[empKey] = {
                الموظف: empKey,
                الوظيفة: item.الوظيفة || "—",
                leaveTypes: [],
              };
            }

            let typeObj = grouped[empKey].leaveTypes.find((t: LeaveTypeSummary) => t.نوع === leaveType);

            if (!typeObj) {
              const original = Number(item["رصيد السنة"]) || 0;
              const taken = Number(item["إجمالي الحاصل عليه"]) || 0;
              const available = Number(item["إجمالي الرصيد"]) || 0;
              const percentage = original > 0 ? Math.round((taken / original) * 100) : 0;

              typeObj = {
                نوع: leaveType,
                رصيد_السنة: original,
                اجمالي_الحاصل_عليه: taken,
                اجمالي_الرصيد: available,
                نسبة_الاستخدام: percentage,
                تفاصيل: [],
              };

              grouped[empKey].leaveTypes.push(typeObj);
            }

            typeObj.تفاصيل.push({
              مسلسل: item.مسلسل,
              الموظف: item.الموظف,
              الوظيفة: item.الوظيفة,
              نوع_الاجازة: leaveType,
              تاريخ_البدء: item["تاريخ البدء"],
              تاريخ_الانتهاء: item["تاريخ الانتهاء"],
              المدة: Number(item["المدة"]) || 0,
            });
          });

          Object.values(grouped).forEach((emp) => {
            emp.leaveTypes.sort((a: LeaveTypeSummary, b: LeaveTypeSummary) => a.نوع.localeCompare(b.نوع, "ar"));
          });

          setEmployees(Object.values(grouped));
        } else setEmployees([]);
      } catch (err) {
        console.error(err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetSchoolId, work, isAuthChecked, user]);

  // === منطق العرض ===
  if (!isAuthChecked) {
    return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>جاري التحقق من الصلاحيات...</div>;
  }

  if (!user) {
     return <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>جاري تحويلك لصفحة الدخول...</div>;
  }

  // ✅ هذا هو الجزء المهم الذي يمنع الخروج للدخول عند فتح الصفحة عادية
  if (!work) {
    return (
      <div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
        <div style={{ fontSize: '18px', color: '#64748b', marginBottom: '10px' }}>جاري تحميل بيانات العام الدراسي...</div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>يرجى الانتظار لحظات</div>
      </div>
    );
  }

  // === الواجهة الأصلية (UI) التي تحبها ===
  return (
    <div style={{ padding: 30, direction: "rtl", background: "#f1f5f9", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(to right, #1e3a8a, #7c3aed)",
          color: "white",
          padding: 40,
          borderRadius: 20,
          marginBottom: 40,
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>📊 لوحة متابعة الإجازات</h1>
        <p style={{ margin: "5px 0 0" }}>
          عرض تفصيلي وإداري لرصيد الإجازات - {displaySchoolName}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          جاري تحميل البيانات...
        </div>
      ) : employees.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "30px",
            color: "#94a3b8",
            background: "white",
            borderRadius: 15,
          }}
        >
          لا يوجد بيانات لهذا العام.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: 25,
          }}
        >
          {employees.map((emp: EmployeeSummary, index: number) => {
            const empSummary = emp.leaveTypes.reduce(
              (acc: any, type: LeaveTypeSummary) => {
                acc.totalOriginal += type.رصيد_السنة;
                acc.totalTaken += type.اجمالي_الحاصل_عليه;
                acc.totalAvailable += type.اجمالي_الرصيد;
                return acc;
              },
              { totalOriginal: 0, totalTaken: 0, totalAvailable: 0 }
            );

            return (
              <div
                key={`${emp.الموظف}-${index}`}
                style={{
                  background: "white",
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0,0,0,.08)",
                }}
              >
                <div
                  style={{
                    background: "#4f46e5",
                    color: "white",
                    padding: 20,
                    textAlign: "center",
                  }}
                >
                  <h3 style={{ margin: 0 }}>{emp.الموظف}</h3>
                  <small>{emp.الوظيفة}</small>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    padding: 15,
                    fontWeight: 700,
                    background: "#f9fafb",
                    fontSize: 14,
                  }}
                >
                  <span>رصيد السنة: {formatNumber(empSummary.totalOriginal)}</span>
                  <span>المستخدم: {formatNumber(empSummary.totalTaken)}</span>
                  <span>المتاح: {formatNumber(empSummary.totalAvailable)}</span>
                </div>

                <div style={{ padding: 20 }}>
                  {emp.leaveTypes.map((type: LeaveTypeSummary) => (
                    <div
                      key={`${emp.الموظف}-${type.نوع}`}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 15,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 700,
                        }}
                      >
                        <span>{type.نوع}</span>
                        <span>{type.نسبة_الاستخدام}%</span>
                      </div>

                      <div
                        style={{
                          height: 8,
                          background: "#e5e7eb",
                          borderRadius: 5,
                          marginTop: 8,
                        }}
                      >
                        <div
                          style={{
                            width: `${type.نسبة_الاستخدام}%`,
                            height: "100%",
                            background:
                              type.نسبة_الاستخدام > 70 ? "#ef4444" : "#10b981",
                            borderRadius: 5,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: 10,
                          fontSize: 13,
                        }}
                      >
                        <span>رصيد السنة: {formatNumber(type.رصيد_السنة)}</span>
                        <span>المستخدم: {formatNumber(type.اجمالي_الحاصل_عليه)}</span>
                        <span>المتاح: {formatNumber(type.اجمالي_الرصيد)}</span>
                      </div>

                      <button
                        style={{
                          marginTop: 10,
                          background: "#3b82f6",
                          color: "white",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setExpanded(
                            expanded === `${emp.الموظف}-${type.نوع}`
                              ? null
                              : `${emp.الموظف}-${type.نوع}`
                          )
                        }
                      >
                        عرض التفاصيل
                      </button>

                      {expanded === `${emp.الموظف}-${type.نوع}` && (
                        <div style={{ marginTop: 10, fontSize: 13 }}>
                          {type.تفاصيل.map((d: EmployeeCard) => (
                            <div
                              key={d.مسلسل}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <span>
                                {d.تاريخ_البدء} → {d.تاريخ_الانتهاء}
                              </span>
                              <span>{d.المدة} يوم</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === 2. المكون الرئيسي (ال Wrapper مع Suspense) ===
export default function LeaveDashboardPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>جاري التحميل...</div>}>
      <LeaveDashboardContent />
    </Suspense>
  );
}