'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ClearancePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('ar-EG');

  /* ===============================
     🔹 تحميل الموظفين التابعين للمدرسة
  =============================== */
  useEffect(() => {
    if (!user?.schoolId) return;

    const fetchEmployeesBySchool = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getData1/14?id=${user.schoolId}`);
        const data = await res.json();
        if (data.success) setEmployees(data.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchEmployeesBySchool();
  }, [user]);

  /* ===============================
     🔹 عند اختيار موظف
  =============================== */
    /* ===============================
     🔹 عند اختيار موظف (تعديل بسيط للتأكد)
  =============================== */
  const handleSelect = async (id: number) => {
    setSelectedId(id);

    if (!id) {
      setEmployee(null);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/getData1/16?id=${id}`);
      const data = await res.json();
      
      // نتأكد من وجود البيانات
      if (data.success && data.data.length > 0) {
        const empData = data.data[0];
        // نقوم بعمل تطابق بسيط لضمان توفر حقل EmploeID
        // في حال كانت الـ API ترجع الحقل باسم id فقط
        const fullEmployee = {
          ...empData,
          EmploeID: empData.EmploeID || empData.id 
        };
        setEmployee(fullEmployee);
      } else {
        setEmployee(null);
      }
    } catch (err) {
      console.error(err);
      setEmployee(null);
    }
  };

    /* ===============================
     🔹 تغيير الحالة (المعدل للعمل مع Partial Update)
  =============================== */
  const handleChangeStatus = async (newStatus: string) => {
    if (!employee) return;
    setLoading(true);

    try {
      // نرسل فقط المطلوب (التعريف والحالة الجديدة)
      // مع التأكد من أن اسم الحقل يطابق المتغير في الـ SQL
      const payload = {
        EmploeID: employee.EmploeID || employee.id, // التأكد من ID
        EmploeStates: newStatus,                     // الحالة الجديدة
        operation: 2                                  // عملية التعديل
      };

      console.log("Sending Payload:", payload);

      const res = await fetch(`${API_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        alert(`تم تغيير الحالة بنجاح إلى: ${newStatus}`);
        router.push('/employees/view');
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };
  /* ===============================
     🔹 طباعة الصفحة
  =============================== */
  const handlePrint = () => {
    if (!employee) return;
    window.print();
  };

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: '0 auto', direction: 'rtl', fontFamily: 'Segoe UI, Tahoma, sans-serif' }}>
      
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#7c3aed,#4c1d95)',
        color: 'white',
        padding: 25,
        borderRadius: 18,
        marginBottom: 30,
        boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: 0 }}>إخلاء طرف</h2>
        <p style={{ marginTop: 10 }}>إدارة إنهاء خدمة الموظفين</p>
      </div>

      {/* اختيار الموظف */}
      <div style={{
        background: 'white',
        padding: 30,
        borderRadius: 18,
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
      }}>
        <div style={{ marginBottom: 25 }}>
          <label style={{ fontWeight: 'bold' }}>اختر الموظف</label>
          <select
            value={selectedId ?? ''}
            onChange={(e) => handleSelect(Number(e.target.value))}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginTop: 10 }}
          >
            <option value="">اختر موظف</option>
            {employees.length > 0 ? (
              employees.map((emp, index) => (
                <option key={emp.id ?? index} value={emp.id}>
                  {emp.name}
                </option>
              ))
            ) : (
              <option value="" disabled>لا يوجد موظفين لهذه المدرسة</option>
            )}
          </select>
        </div>

        {/* عرض بيانات الموظف */}
        {employee && (
          <div style={{
            background: '#f3f4f6',
            padding: 25,
            borderRadius: 12,
            lineHeight: 2,
            fontSize: 18,
            marginBottom: 20
          }}>
            في يوم {formattedDate} <br /><br />
            تم اخلاء طرف الاستاذ / {employee.name} <br /><br />
            الذى يعمل بوظيفة {employee.job} <br /><br />
            وذلك بناء على طلب الاستقالة المقدم منه
            وبعد موافقة الشريك الصناعى على الطلب.
            <br /><br />
            <div style={{
              marginTop: 40,
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold'
            }}>
              <span>امين العهدة</span>
              <span>ش.ع</span>
              <span>ش.ط</span>
              <span>التقييم و الامتحانات</span>
            </div>
          </div>
        )}

        {/* أزرار تغيير الحالة + طباعة */}
        {employee && (
          <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
            <button
              onClick={() => handleChangeStatus("موقوف")}
              disabled={loading}
              style={{
                flex: 1,
                background: '#e11d48',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              إيقاف الموظف
            </button>

            <button
              onClick={() => handleChangeStatus("مخلى طرفه")}
              disabled={loading}
              style={{
                flex: 1,
                background: '#10b981',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              إخلاء الطرف
            </button>

            <button
              onClick={handlePrint}
              style={{
                flex: 1,
                background: '#6366f1',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 10,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              طباعة الصفحة
            </button>
          </div>
        )}

      </div>
    </div>
  );
}