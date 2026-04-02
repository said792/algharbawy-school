'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Grade {
  'الرقم': number;
  'الصف الدراسى': string;
}

interface Student {
  StudentID: number;
  ArbStudName: string;
  StudSex?: string; 
  SetingNum?: number;
  SecretNum?: number;
}

interface Committee {
    "الرقم": number;
    "اللجنة": string;
}

interface DistributionPlan {
    committeeName: string;
    startSeat: number;
    endSeat: number;
    studentCount: number;
}

export default function ExamSeatingPage() {
  const { user, work } = useAuthStore();
  
  const schoolId = user?.schoolId;
  const schoolName = user?.schoolName;
  const stageName = work?.stageName;
  const stageId = work?.stageId; // ✅ جلب رقم المرحلة
  const yearName = work?.yearName;

  // === State ===
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');

  // إدخالات التوزيع
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [startSeatNumber, setStartSeatNumber] = useState<number>(1);
  const [lastSeatNumber, setLastSeatNumber] = useState<number>(0);
  const [studentsPerCommittee, setStudentsPerCommittee] = useState<number>(20);
  
  const [distributionPlan, setDistributionPlan] = useState<DistributionPlan[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0f766e, #14b8a6)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(15, 118, 110, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '20px', border: '1px solid #ccfbf1' };
  const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', width: '100%' };
  const readonlyStyle: React.CSSProperties = { ...inputStyle, background: '#f1f5f9', color: '#475569', fontWeight: 'bold' };
  const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', cursor: 'pointer', fontWeight: 'bold' };
  const btnWarning: React.CSSProperties = { ...btnPrimary, background: '#f59e0b' };
  const thStyle: React.CSSProperties = { padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#374151', textAlign: 'center' };
  const tdStyle: React.CSSProperties = { padding: '10px', fontSize: '14px', textAlign: 'center' };

  // === 1. جلب الصفوف ===
  useEffect(() => {
    const fetchGrades = async () => {
        if (!schoolName || !stageName) return;
        setLoadingGrades(true);
        try {
            const res = await fetch(`${API_URL}/api/search2?SCHER1=${schoolName}&SCHER2=${stageName}&inpot=6`);
            const json = await res.json();
            if (json.success) setGrades(json.data);
        } catch (err) { console.error(err); } 
        finally { setLoadingGrades(false); }
    };
    fetchGrades();
  }, [schoolName, stageName]);

  // === 2. عند اختيار الصف (جلب العدد واللجان) ===
  useEffect(() => {
    if (!selectedGradeName) return;

    const fetchData = async () => {
        setLoading(true);
        setDistributionPlan([]);
        try {
            // أ. جلب الإحصائيات (INPOT 11)
            const resStats = await fetch(`${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&inpot=11`);
            const jsonStats = await resStats.json();
            
            if (jsonStats.success && jsonStats.data?.[0]) {
                const data = jsonStats.data[0];
                const count = Number(data['NumberOfClasses'] || data['العدد'] || 0);
                const firstSeat = Number(data['FirstSeatNumber'] || data['اول رقم'] || 1);
                const lastSeat = Number(data['LastSeatNumber'] || data['اخر رقم'] || 0);

                setTotalStudentsCount(count);
                setStartSeatNumber(firstSeat);
                setLastSeatNumber(lastSeat > 0 ? lastSeat : (firstSeat + count - 1));
            } else {
                setTotalStudentsCount(0);
                setStartSeatNumber(1);
                setLastSeatNumber(0);
            }

            // ب. جلب اللجان (INPOT 25)
            const resCom = await fetch(`${API_URL}/api/getData1/25?id=${schoolId}`);
            const jsonCom = await resCom.json();
            if (jsonCom.success && jsonCom.data) {
                setCommittees(jsonCom.data);
            } else {
                setCommittees([]);
                alert('تنبيه: لا توجد لجان مسجلة لهذه المدرسة.');
            }

        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    fetchData();
  }, [selectedGradeName, schoolName, stageName, yearName, schoolId]);

  // === 3. تحديث آخر رقم جلوس تلقائياً ===
  useEffect(() => {
      if (totalStudentsCount > 0 && startSeatNumber > 0) {
          setLastSeatNumber(startSeatNumber + totalStudentsCount - 1);
      }
  }, [totalStudentsCount, startSeatNumber]);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedGradeId(id);
    const gradeObj = grades.find(g => g['الرقم'] === id);
    if (gradeObj) setSelectedGradeName(gradeObj['الصف الدراسى']);
    setStudents([]);
    setDistributionPlan([]);
  };

  // === 4. دالة التوزيع ===
  const handleDistribute = () => {
      if (committees.length === 0) return alert('لا توجد لجان متاحة للتوزيع.');
      if (studentsPerCommittee <= 0) return alert('يرجى تحديد عدد الطلاب في اللجنة.');

      const totalCapacity = committees.length * studentsPerCommittee;
      if (totalCapacity < totalStudentsCount) {
          alert(`خطأ: عدد الطلاب (${totalStudentsCount}) أكبر من السعة الإجمالية للجان (${totalCapacity}).`);
          return;
      }

      const plan: DistributionPlan[] = [];
      let currentSeat = startSeatNumber;
      let remainingStudents = totalStudentsCount;

      for (let i = 0; i < committees.length; i++) {
          if (remainingStudents <= 0) break;

          const committee = committees[i];
          let countInCommittee = Math.min(remainingStudents, studentsPerCommittee);
          
          // اللجنة الأخيرة تأخذ المتبقي
          if (i === committees.length - 1) {
              countInCommittee = remainingStudents;
          }

          const start = currentSeat;
          const end = currentSeat + countInCommittee - 1;

          plan.push({
              committeeName: committee['اللجنة'],
              startSeat: start,
              endSeat: end,
              studentCount: countInCommittee
          });

          currentSeat = end + 1;
          remainingStudents -= countInCommittee;
      }

      setDistributionPlan(plan);
  };

  // === 5. تطبيق التوزيع والحفظ ===
  const handleApplyAndSave = async () => {
      if (distributionPlan.length === 0) return;
      if (!stageId || !selectedGradeId || !schoolId) return alert('بيانات النظام ناقصة (المرحلة أو الصف أو المدرسة)');
      
      if (!confirm('هل تريد تطبيق هذا التوزيع وحفظه في قاعدة البيانات؟')) return;

      setLoading(true);
      try {
          // 1. جلب الطلاب (INPOT 8)
          const resStud = await fetch(`${API_URL}/api/search4?SCHER1=${schoolName}&SCHER2=${stageName}&SCHER3=${yearName}&SCHER4=${selectedGradeName}&inpot=8`);
          const jsonStud = await resStud.json();

          if (!jsonStud.success || !jsonStud.data) {
              throw new Error('فشل جلب قائمة الطلاب');
          }

          // 2. ترتيب الطلاب أبجدياً (إصلاح الخطأ هنا)
          const allStudents: Student[] = jsonStud.data.map((s: any) => ({
              StudentID: s['الرقم'] || s.StudentID,
              ArbStudName: s['الاسم بالعربى'] || s.ArbStudName,
              StudSex: s['النوع'] || s.StudSex || 'ذكر',
              SetingNum: s['رقم الجلوس'] || 0,
              SecretNum: s['الرقم السرى'] || 0
          })).sort((a: Student, b: Student) => a.ArbStudName.localeCompare(b.ArbStudName));

          let studentIndex = 0;
          let successCount = 0;

          // 3. المرور على خطة التوزيع والحفظ
          for (const row of distributionPlan) {
              const count = row.studentCount;

              // أ. حفظ سجل التوزيع (اللجنة + أرقام الجلوس)
              const distPayload = {
                  SchoolID: schoolId,
                  MrahelID: stageId,
                  GereadID: selectedGradeId,
                  committee_name: row.committeeName,
                  StartSeatNumber: row.startSeat,
                  EndSeatNumber: row.endSeat,
                  StudentsCount: row.studentCount
              };

              // استدعاء الـ Endpoint الجديد
              await fetch(`${API_URL}/api/committees/distribution`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(distPayload)
              });

              // ب. تحديث أرقام جلوس الطلاب في هذه اللجنة
              for (let i = 0; i < count; i++) {
                  if (studentIndex >= allStudents.length) break;
                  
                  const student = allStudents[studentIndex];
                  student.SetingNum = row.startSeat + i;

                  try {
                      const seatPayload = {
                          StudentID: student.StudentID,
                          seat_number: student.SetingNum,
                          secret_number: student.SecretNum || 0,
                          SchoolID: schoolId
                      };
                      
                      const res = await fetch(`${API_URL}/api/exam/seats`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(seatPayload)
                      });
                      const data = await res.json();
                      if(data.success) successCount++;
                  } catch (e) {
                      console.error(`Error saving student ${student.StudentID}`, e);
                  }
                  studentIndex++;
              }
          }

          alert(`✅ تم حفظ خطة التوزيع وتحديث أرقام جلوس ${successCount} طالب بنجاح.`);
          setDistributionPlan([]);

      } catch (err: any) {
          alert('❌ حدث خطأ: ' + err.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>🏫 توزيع الطلاب على اللجان</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>توزيع آلي لأرقام الجلوس</p>
        </div>
        <div style={{ fontSize: '50px' }}>📊</div>
      </div>

      {/* اختيار الصف */}
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>المدرسة</label>
                <input type="text" value={schoolName || ''} readOnly style={readonlyStyle} />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>المرحلة</label>
                <input type="text" value={stageName || ''} readOnly style={readonlyStyle} />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>الصف الدراسي</label>
                <select value={selectedGradeId || ''} onChange={handleGradeChange} style={inputStyle} disabled={loadingGrades}>
                    <option value="">{loadingGrades ? 'جاري...' : '-- اختر الصف --'}</option>
                    {grades.map(g => <option key={g['الرقم']} value={g['الرقم']}>{g['الصف الدراسى']}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* إعدادات التوزيع */}
      {totalStudentsCount > 0 && (
        <div style={{...cardStyle, borderLeft: '5px solid #14b8a6'}}>
            <h3 style={{marginTop:0, marginBottom:'15px', color:'#0f766e'}}>إعدادات التوزيع</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>عدد الطلاب</label>
                    <input type="number" value={totalStudentsCount} readOnly style={readonlyStyle} />
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>أول رقم جلوس</label>
                    <input type="number" value={startSeatNumber} onChange={e => setStartSeatNumber(Number(e.target.value))} style={inputStyle} />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>آخر رقم جلوس</label>
                    <input type="number" value={lastSeatNumber} readOnly style={readonlyStyle} />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>عدد الطلاب في اللجنة</label>
                    <input type="number" value={studentsPerCommittee} onChange={e => setStudentsPerCommittee(Number(e.target.value))} style={inputStyle} placeholder="مثال: 20" />
                </div>

                <div>
                    <button onClick={handleDistribute} style={{...btnWarning, width: '100%', height: '42px'}}>
                        ⚡ بدء التوزيع
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* خطة التوزيع */}
      {distributionPlan.length > 0 && (
        <div style={cardStyle}>
            <h3 style={{marginTop:0, marginBottom:'15px', color:'#0f766e'}}>📋 خطة التوزيع المقترحة</h3>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f1f5f9' }}>
                        <tr>
                            <th style={thStyle}>اللجنة</th>
                            <th style={thStyle}>من رقم</th>
                            <th style={thStyle}>إلى رقم</th>
                            <th style={thStyle}>العدد</th>
                        </tr>
                    </thead>
                    <tbody>
                        {distributionPlan.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{...tdStyle, fontWeight: 'bold'}}>{row.committeeName}</td>
                                <td style={tdStyle}>{row.startSeat}</td>
                                <td style={tdStyle}>{row.endSeat}</td>
                                <td style={tdStyle}>{row.studentCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setDistributionPlan([])} style={{...btnPrimary, background: '#ef4444'}}>إلغاء</button>
                <button onClick={handleApplyAndSave} disabled={loading} style={btnPrimary}>
                    {loading ? 'جاري الحفظ...' : '💾 تطبيق وحفظ'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}