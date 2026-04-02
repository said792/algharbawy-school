'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- Types ---
interface MovementRecord {
  'نوع الحركة': string;
  'نوع الإجازة': string;
  'الكمية': number;
  'التاريخ': string;
  'الرصيد المتبقي': number;
}

interface Employee {
  id: number;
  name: string;
  [key: string]: any;
}

export default function EmployeeLeaveHistoryPage() {
  const { user, work } = useAuthStore();
  const yearName = useAuthStore(state => state.work?.yearName);
  
  // --- State ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [yearId, setYearId] = useState<number | null>(null); 
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEmps, setFetchingEmps] = useState(false);
  
  // --- تعديل هام: حالة لتخزين الرصيد الحالي لكل نوع ---
  const [currentBalances, setCurrentBalances] = useState({
    casual: 0,    // رصيد العارضة
    regular: 0    // رصيد الاعتيادية
  });

  // 1. جلب الموظفين
  useEffect(() => {
    if (!user?.schoolId) return;
    
    const fetchEmployees = async () => {
      setFetchingEmps(true);
      try {
        const res = await fetch(`${API_URL}/api/getData1/14?id=${user.schoolId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setEmployees(data.data);
        }
      } catch (err) { 
        console.error('Error fetching employees:', err); 
      } finally {
        setFetchingEmps(false);
      }
    };

    fetchEmployees();
  }, [user?.schoolId]);

  // 2. مزامنة العام
  useEffect(() => {
    if (work?.yearId) {
      setYearId(work.yearId);
    }
  }, [work?.yearId]);

  // 3. جلب الرصيد الحالي (الجديد) - يعمل عند اختيار الموظف
  useEffect(() => {
    if (selectedEmpId && yearId) {
      fetchCurrentBalances(selectedEmpId, yearId);
    }
  }, [selectedEmpId, yearId]);

  const fetchCurrentBalances = async (empId: string, yId: number) => {
    try {
      // دالة مساعدة لجلب رصيد نوع معين
      const getBalance = async (leaveType: string) => {
        try {
          const res = await fetch(
            `${API_URL}/api/search/complex?sch1=${empId}&sch2=${yId}&sch3=${leaveType}&inpout=14`
          );
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            // نأخذ العمود 'رصيد حديث' كما في كودك
            return data.data[0]['رصيد حديث'] || 0;
          }
          return 0;
        } catch (err) {
          return 0;
        }
      };

      // جلب الرصيدين بالتوازي
      const [casualBal, regularBal] = await Promise.all([
        getBalance('عارضة'),
        getBalance('اعتيادية')
      ]);

      setCurrentBalances({ casual: casualBal, regular: regularBal });
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  };

  // --- جلب سجل الحركات (التاريخ) ---
  const fetchHistory = async () => {
    if (!selectedEmpId || !yearId) {
      alert('يرجى اختيار الموظف والتأكد من العام الدراسي');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/item-movement?sche=${selectedEmpId}&sche1=${yearId}&inpot=2&startDate=${startDate || ''}&endDate=${endDate || ''}`
      );
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`خطأ ${res.status}: ${errorText.substring(0, 100)}`);
      }

      const result = await res.json();

      if (result.success && result.data) {
        setMovements(result.data);
      } else {
        setMovements([]);
      }
    } catch (err: any) {
      console.error(err);
      alert(`حدث خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // --- STYLES ---
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '40px 20px',
    fontFamily: 'Tajawal, sans-serif',
    direction: 'rtl',
  };

  const glassCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const inputWrapperStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    color: '#4a5568',
    fontWeight: 'bold',
    fontSize: '14px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    background: '#fff',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'Tajawal, sans-serif',
    color: '#2d3748',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(102, 126, 234, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    fontFamily: 'Tajawal, sans-serif',
  };

  return (
    <div style={containerStyle}>
      <div style={glassCardStyle}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            color: '#2d3748',
            marginBottom: '10px',
            background: 'linear-gradient(to right, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            سجل حركة رصيد الإجازات
          </h1>
          <p style={{ color: '#718096', fontSize: '16px' }}>
            تتبع تفصيلي للرصيد والإجازات المستحقة
          </p>
        </div>

        {/* Filters Form */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          
          {/* الموظف */}
          <div style={inputWrapperStyle}>
            <label style={labelStyle}>اختر الموظف</label>
            {fetchingEmps ? (
              <div style={{ padding: '14px', color: '#a0aec0' }}>جاري تحميل الموظفين...</div>
            ) : (
              <select 
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- اختر اسم الموظف --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* العام الدراسي */}
          <div style={inputWrapperStyle}>
            <label style={labelStyle}>العام الدراسي</label>
            <input 
              type="text" 
              value={yearName || yearId || ''} 
              disabled 
              style={{ ...inputStyle, backgroundColor: '#f7fafc', color: '#718096', cursor: 'not-allowed' }}
            />
          </div>

          {/* التواريخ */}
          <div style={inputWrapperStyle}>
            <label style={labelStyle}>من تاريخ</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={inputWrapperStyle}>
            <label style={labelStyle}>إلى تاريخ</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <button 
          onClick={fetchHistory} 
          style={buttonStyle}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(102, 126, 234, 0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)'; }}
        >
          {loading ? 'جاري البحث...' : 'عرض السجل'}
        </button>

      </div>

      {/* Results Section */}
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{
            width: '50px', height: '50px', border: '5px solid #e2e8f0', 
            borderTop: '5px solid #667eea', borderRadius: '50%', 
            margin: '0 auto', animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '15px', color: '#718096' }}>جاري جلب البيانات...</p>
        </div>
      ) : (
        <>
          {/* Balance Card (Updated to show two balances) */}
          {(selectedEmpId && yearId) && (
            <div style={{
              ...glassCardStyle,
              marginTop: '30px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: 'white',
              display: 'grid',
              gridTemplateColumns: '1fr 1px 1fr', // عمودين مع خط فاصل بينهم
              gap: '20px',
              border: 'none'
            }}>
              
              {/* Left: Casual Balance */}
              <div style={{ padding: '10px' }}>
                <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>الرصيد الحالي (عارضة)</div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: '#fbbf24' }}>
                  {currentBalances.casual}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>يوم متاح</div>
              </div>

              {/* Divider Line */}
              <div style={{ background: 'rgba(255,255,255,0.1)', margin: '0 10px' }}></div>

              {/* Right: Regular Balance */}
              <div style={{ padding: '10px' }}>
                <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>الرصيد الحالي (اعتيادية)</div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: '#60a5fa' }}>
                  {currentBalances.regular}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>يوم متاح</div>
              </div>

            </div>
          )}

          {/* Timeline List */}
          <div style={{ maxWidth: '800px', margin: '30px auto', position: 'relative', padding: '10px' }}>
            {movements.length > 0 && (
              <div style={{
                position: 'absolute', right: '29px', top: '20px', bottom: '20px',
                width: '2px', background: '#e2e8f0', zIndex: 0
              }}></div>
            )}

            {movements.map((move, idx) => {
              const isAddition = move['نوع الحركة'] === 'إضافة';
              const color = isAddition ? '#10b981' : '#ef4444'; 
              const bgBadge = isAddition ? '#d1fae5' : '#fee2e2';
              const txtBadge = isAddition ? '#065f46' : '#991b1b';
              
              return (
                <div key={idx} style={{
                  position: 'relative',
                  marginBottom: '25px',
                  paddingRight: '60px',
                  zIndex: 1,
                  animation: `fadeIn 0.5s ease-out ${idx * 0.1}s forwards`,
                  opacity: 0
                }}>
                  <div style={{
                    position: 'absolute', right: '20px', top: '20px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'white', border: `4px solid ${color}`,
                    zIndex: 2, boxShadow: '0 0 0 3px white'
                  }}></div>

                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    border: '1px solid #f1f5f9',
                    transition: 'all 0.3s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#a0aec0', marginBottom: '4px' }}>
                          {formatDate(move['التاريخ'])}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748' }}>
                          {move['نوع الإجازة']}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                        background: bgBadge, color: txtBadge
                      }}>
                        {move['نوع الحركة']}
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                      borderTop: '1px dashed #edf2f7', paddingTop: '15px'
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>الكمية</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: color, direction: 'ltr' }}>
                          {isAddition ? '+' : '-'}{move['الكمية']}
                        </div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', color: '#718096' }}>الرصيد بعد</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4a5568' }}>
                          {move['الرصيد المتبقي']}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {movements.length === 0 && !loading && selectedEmpId && (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>📂</div>
              <h3 style={{ color: '#4a5568', marginBottom: '10px' }}>لا توجد حركات</h3>
              <p style={{ color: '#a0aec0' }}>لم يتم العثور على سجل إجازات لهذا الموظف في الفترة المحددة</p>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}