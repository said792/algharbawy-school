'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

export default function SetupFeesPage() {
  const { user, work } = useAuthStore();
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const yearId = work?.yearId;

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  
  // بيانات الفورم
  const [feeId, setFeeId] = useState<number | null>(null); // لتخزين ID السجل الحالي
  const [installmentCount, setInstallmentCount] = useState<number>(1);
  const [installments, setInstallments] = useState<number[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  
  // حالة الأزرار
  const [isExisting, setIsExisting] = useState(false); // هل السجل موجود؟
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // جلب الصفوف
  useEffect(() => {
    const fetchGrades = async () => {
      if (!schoolName || !stageName) return;
      try {
        const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
        const json = await res.json();
        if (json.success) setGrades(json.data);
      } catch (e) { console.error(e); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  // === البحث التلقائي عند اختيار الصف ===
  useEffect(() => {
    const fetchFeeData = async () => {
        if (!selectedGradeId || !yearId) {
            resetForm(); // لو مفيش اختيار نمسح البيانات
            return;
        }

        setLoadingData(true);
        try {
            // نبحث بالرقم (INPOT 21)
            const res = await fetch(`${API_URL}/api/search/scher2int?sch1=${selectedGradeId}&sch2=${yearId}&inpot=25`);
            const json = await res.json();

            if (json.success && json.data && json.data.length > 0) {
                // === يوجد بيانات سابقة (تعديل) ===
                const record = json.data[0];
                setFeeId(record.FeeID);
                setIsExisting(true);

                // ملء الحقول
                setInstallmentCount(record.InstallmentCount || 1);
                
                const loadedInst = [
                    record.Inst1Amount || 0,
                    record.Inst2Amount || 0,
                    record.Inst3Amount || 0,
                    record.Inst4Amount || 0
                ];
                // قطع المصفوفة حسب العدد
                setInstallments(loadedInst.slice(0, record.InstallmentCount));
                setTotalAmount(record.TotalAmount || 0);

            } else {
                // === لا يوجد بيانات (إضافة) ===
                resetForm();
            }
        } catch(e) {
            console.error(e);
            resetForm();
        } finally {
            setLoadingData(false);
        }
    };

    fetchFeeData();
  }, [selectedGradeId, yearId]);

  // تحديث عدد الأقساط (Re-initialize array when count changes)
  useEffect(() => {
    setInstallments(prev => {
        const newInst = Array(installmentCount).fill(0);
        prev.forEach((val, idx) => {
            if(idx < installmentCount) newInst[idx] = val;
        });
        return newInst;
    });
  }, [installmentCount]);

  // حساب المجموع تلقائياً
  useEffect(() => {
    const total = installments.reduce((sum, val) => sum + (Number(val) || 0), 0);
    setTotalAmount(total);
  }, [installments]);

  const handleAmountChange = (index: number, value: number) => {
    const updated = [...installments];
    updated[index] = value;
    setInstallments(updated);
  };

  // دالة مساعدة لمسح الفورم
  const resetForm = () => {
      setFeeId(null);
      setIsExisting(false);
      setInstallmentCount(1);
      setInstallments([0]);
      setTotalAmount(0);
  };

  // === دوال الحفظ والتعديل والحذف ===

  const handleSave = async (operationType: number) => {
    if (!selectedGradeId || !yearId) return alert('اختر الصف');
    
    setLoading(true);
    try {
      const payload = {
        FeeID: feeId || 0, // 0 للإضافة، الرقم للتعديل
        GradeID: selectedGradeId,
        YerID: yearId,
        TotalAmount: totalAmount,
        InstallmentCount: installmentCount,
        Installments: installments,
        INPOT: operationType // 1=إضافة, 2=تعديل, 3=حذف
      };

      const res = await fetch(`${API_URL}/api/fees/grade-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(operationType === 3 ? '✅ تم الحذف بنجاح' : '✅ تم الحفظ بنجاح');
        
        if (operationType === 3) {
            // بعد الحذف نرجع للوضع إضافة
            resetForm();
        } else {
            // بعد الحفظ نبحث عن البيانات تاني لنحدث الـ state (يصبح تعديل)
            // أو نعتمد على إن الـ API يرجع الـ ID الجديد
            setIsExisting(true); 
            // نعمل refresh للبيانات
            setSelectedGradeId(selectedGradeId); 
        }
      } else {
        alert('❌ فشل العملية');
      }
    } catch (e) {
      alert('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '800px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '20px' };
  const headerStyle: React.CSSProperties = { marginBottom: '20px', color: '#15803d', borderBottom: '2px solid #dcfce7', paddingBottom: '10px' };
  const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #ccc', width: '100%', textAlign: 'center', fontWeight: 'bold' };
  
  // ألوان الأزرار
  const btnAdd: React.CSSProperties = { padding: '15px 30px', borderRadius: '10px', background: '#16a34a', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' };
  const btnEdit: React.CSSProperties = { ...btnAdd, background: '#2563eb' }; // أزرق
  const btnDelete: React.CSSProperties = { ...btnAdd, background: '#dc2626' }; // أحمر
  const btnDisabled: React.CSSProperties = { ...btnAdd, background: '#d1d5db', cursor: 'not-allowed', opacity: 0.6 };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={headerStyle}>💰 تحديد مصروفات الصف</h2>
        
        {/* اختيار الصف */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اختر الصف الدراسي</label>
          <select 
            value={selectedGradeId || ''} 
            onChange={(e) => setSelectedGradeId(Number(e.target.value))}
            style={{...inputStyle, textAlign: 'right', maxWidth: '300px'}}
            disabled={loadingData}
          >
            <option value="">{loadingData ? 'جاري التحميل...' : '-- اختر --'}</option>
            {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
          </select>
        </div>

        {/* باقي الفورم يظهر فقط لما نختار صف */}
        {selectedGradeId && (
          <>
            {/* عدد الأقساط */}
            <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '16px' }}>عدد الأقساط:</label>
              <select 
                value={installmentCount} 
                onChange={(e) => setInstallmentCount(Number(e.target.value))}
                style={{...inputStyle, width: '80px', fontSize: '16px'}}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            {/* جدول الأقساط */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    <th style={thStyle}>القسط رقم</th>
                    <th style={thStyle}>قيمة القسط (جنيه)</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((amount, idx) => (
                    <tr key={idx}>
                      <td style={{...tdStyle, fontWeight: 'bold', color: '#166534'}}>{idx + 1}</td>
                      <td style={tdStyle}>
                        <input 
                          type="number" 
                          value={amount} 
                          onChange={(e) => handleAmountChange(idx, Number(e.target.value))}
                          style={inputStyle} 
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#dcfce7', fontWeight: 'bold' }}>
                    <td style={tdStyle}>الإجمالي</td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '20px', color: '#14532d' }}>
                        {totalAmount.toFixed(2)}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* أزرار التحكم */}
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                {/* زر الحفظ (إضافة) - يظهر لما السجل غير موجود */}
                <button 
                    onClick={() => handleSave(1)} 
                    disabled={loading || isExisting} 
                    style={isExisting ? btnDisabled : btnAdd}
                >
                    {loading ? 'جاري...' : '💾 حفظ جديد'}
                </button>

                {/* زر التعديل - يظهر لما السجل موجود */}
                <button 
                    onClick={() => handleSave(2)} 
                    disabled={loading || !isExisting} 
                    style={!isExisting ? btnDisabled : btnEdit}
                >
                    {loading ? 'جاري...' : '✏️ تعديل'}
                </button>

                {/* زر الحذف - يظهر لما السجل موجود */}
                <button 
                    onClick={() => {
                        if(confirm('هل أنت متأكد من حذف هذه البيانات؟')) handleSave(3);
                    }} 
                    disabled={loading || !isExisting} 
                    style={!isExisting ? btnDisabled : btnDelete}
                >
                    🗑️ حذف
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '15px', textAlign: 'center', borderBottom: '2px solid #bbf7d0', color: '#166534', fontSize: '16px' };
const tdStyle: React.CSSProperties = { padding: '15px', borderBottom: '1px solid #e5e7eb' };