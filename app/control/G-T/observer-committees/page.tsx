'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Teacher { id: number; name: string; }
interface Term { "الرقم": number; "التيرم": string; }
interface Schedule { 
    "تاريخ الاختبار": string; 
    "الفترة": string; 
    "GereadID": number; 
    "المادة": string; 
}
interface Committee { id: number; committee_name: string; }
interface DistributionResult {
    ExamDate: string;
    ExamPeriod: string;
    SubjectName: string;
    CommitteeName: string;
    Teacher1: string;
    Teacher2: string;
    GradeID: number;
}

export default function TeacherDistributionPage() {
  const { user, work } = useAuthStore();
  const schoolId = user?.schoolId || 0;
  const yearId = work?.yearId || 0;

  const [terms, setTerms] = useState<Term[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]); // IDs of selected teachers
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [distributionResult, setDistributionResult] = useState<DistributionResult[]>([]);
  const [teacherStats, setTeacherStats] = useState<string>('');

  // === 1. جلب التيرمات والمعلمين ===
  useEffect(() => {
    // جلب التيرمات (INPOT 22)
    const fetchTerms = async () => {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=22`);
        const json = await res.json();
        if (json.success) setTerms(json.data);
    };
    
    // جلب المعلمين (INPOT 46)
    const fetchTeachers = async () => {
        const res = await fetch(`${API_URL}/api/getData1/46?id=${schoolId}`);
        const json = await res.json();
        if (json.success) {
            // تحويل الأسماء للشكل المطلوب
            const data = json.data.map((t: any) => ({
                id: t['الرقم'],
                name: t['الاسم بالعربى']
            }));
            setTeachers(data);
        }
    };

    if(schoolId) {
        fetchTerms();
        fetchTeachers();
    }
  }, [schoolId]);

  // === 2. اختيار/إلغاء اختيار معلم ===
  const toggleTeacher = (id: number) => {
      setSelectedTeachers(prev => 
          prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
      );
  };
  const selectAllTeachers = () => {
      setSelectedTeachers(teachers.map(t => t.id));
  };

  // === 3. خوارزمية التوزيع (ترجمة كود C#) ===
  const handleDistribution = async () => {
      if (!selectedTermId) return alert('اختر التيرم أولاً');
      if (selectedTeachers.length < 2) return alert('اختر عدد كافي من المعلمين (على الأقل 2)');

      setLoading(true);
      try {
          // 1. جلب جدول الامتحانات (INPOT 16)
          const termObj = terms.find(t => t['الرقم'] === selectedTermId);
          const resSched = await fetch(`${API_URL}/api/search/complex?sch1=${schoolId}&sch2=${yearId}&sch3=${termObj?.['التيرم'] || ''}&inpout=16`);
          const jsonSched = await resSched.json();
          
          if (!jsonSched.success || jsonSched.data.length === 0) {
              alert('لا توجد مواعيد امتحانات لهذا التيرم');
              setLoading(false);
              return;
          }

          const schedules: Schedule[] = jsonSched.data;

          // 2. تهيئة المتغيرات للتوزيع
          const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
          const idPool = [...selectedTeachers];
          
          // خرط المعلمين (Shuffle)
          const shuffleArray = (array: any[]) => array.sort(() => Math.random() - 0.5);
          shuffleArray(idPool);

          // خرائط التتبع
          const teacherCommitteesMap = new Map<number, Set<number>>(); // تتبع اللجان لكل معلم
          const teacherPairMap = new Map<string, number>(); // تتبع تكرار الثنائيات
          const teacherAssignmentCount = new Map<number, number>(); // عداد المهام
          idPool.forEach(id => teacherAssignmentCount.set(id, 0));

          const results: DistributionResult[] = [];

          // تجميع الجدول حسب (تاريخ + فترة + صف)
          const groups = schedules.reduce((acc, curr) => {
              const key = `${curr["تاريخ الاختبار"]}-${curr["الفترة"]}-${curr["GereadID"]}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(curr);
              return acc;
          }, {} as Record<string, Schedule[]>);

          // 3. تنفيذ التوزيع لكل مجموعة
          for (const key in groups) {
              const group = groups[key];
              const { "تاريخ الاختبار": examDate, "الفترة": examPeriod, "GereadID": gradeId } = group[0];
              
              // جلب اللجان النشطة لهذا الصف
              const resCom = await fetch(`${API_URL}/api/committees/active?schoolId=${schoolId}&gradeId=${gradeId}`);
              const jsonCom = await resCom.json();
              const committees: Committee[] = jsonCom.data || [];

              if (committees.length === 0) continue;

              // تجهيز معلمين متاحين لهذه الفترة (نسخة من الـ Pool وخلطها)
              let available = [...idPool];
              shuffleArray(available);

              // منطق الاستبعاد (Excess Handling) لو عدد المعلمين أكبر من المطلوب بكثير
              const totalNeeded = committees.length * 2;
              if (available.length > totalNeeded) {
                  // هنا يمكن تطبيق منطق الـ Skip Queue لو أردت، للتبسيط هنأخذ العدد المطلوب عشوائياً
                  available = available.slice(0, totalNeeded);
              }

              const usedInSlot = new Set<number>();

              for (const com of committees) {
                  // البحث عن ثنائي
                  // المرحلة الأولى: البحث عن ثنائي لم يعمل في هذه اللجنة من قبل
                  let bestPair: [number, number] | null = null;
                  
                  // محاولة إيجاد زوج
                  const candidates = available.filter(id => !usedInSlot.has(id));
                  
                  // بحث بسيط عن زوج (يمكن تطويره ليكون أكثر تعقيداً مثل كود C#)
                  // هنا نهتم بالعدالة (أقل عدد مهام)
                  candidates.sort((a, b) => (teacherAssignmentCount.get(a) || 0) - (teacherAssignmentCount.get(b) || 0));

                  if (candidates.length >= 2) {
                      // نأخذ أول اثنين (الأقل شدهم شغل)
                      const t1 = candidates[0];
                      // نحاول ندور تاني مختلف
                      const t2 = candidates[1];
                      
                      bestPair = [t1, t2];
                  }

                  if (bestPair) {
                      const [t1, t2] = bestPair;
                      
                      // تسجيل التوزيع
                      results.push({
                          ExamDate: examDate,
                          ExamPeriod: examPeriod,
                          SubjectName: group.map(s => s["المادة"]).join(' + '),
                          CommitteeName: com.committee_name,
                          Teacher1: teacherMap.get(t1) || '',
                          Teacher2: teacherMap.get(t2) || '',
                          GradeID: gradeId
                      });

                      usedInSlot.add(t1);
                      usedInSlot.add(t2);

                      // تحديث الإحصائيات
                      teacherAssignmentCount.set(t1, (teacherAssignmentCount.get(t1) || 0) + 1);
                      teacherAssignmentCount.set(t2, (teacherAssignmentCount.get(t2) || 0) + 1);

                      // تحديث خرائط التتبع
                      if (!teacherCommitteesMap.has(t1)) teacherCommitteesMap.set(t1, new Set());
                      teacherCommitteesMap.get(t1)?.add(com.id);
                      
                      if (!teacherCommitteesMap.has(t2)) teacherCommitteesMap.set(t2, new Set());
                      teacherCommitteesMap.get(t2)?.add(com.id);
                  }
              }
          }

          setDistributionResult(results);

          // 4. إعداد التقرير
          let report = "📊 إحصائية التوزيع:\n\n";
          let sortedStats = Array.from(teacherAssignmentCount.entries()).sort((a,b) => b[1] - a[1]);
          sortedStats.forEach(([id, count]) => {
              report += `${teacherMap.get(id)}: ${count} مرات\n`;
          });
          setTeacherStats(report);
          alert(report);

      } catch (err) {
          console.error(err);
          alert('حدث خطأ أثناء التوزيع');
      } finally {
          setLoading(false);
      }
  };

   // === 4. الحفظ (معدل ليدعم الحذف أولاً) ===
  const handleSave = async () => {
      if (distributionResult.length === 0) return alert('لا توجد بيانات للحفظ');
      if (!selectedTermId) return alert('اختر التيرم أولاً');

      if (!confirm('هذا الإجراء سيحذف أي توزيع سابق لهذا التيرم ويحفظ التوزيع الجديد. هل أنت متأكد؟')) return;

      setSaving(true);
      try {
          // 1. حذف التوزيع القديم لهذا التيرم (INPOT = 2)
          await fetch(`${API_URL}/api/exam/distribution`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  SchoolID: schoolId,
                  YearID: yearId,
                  TiremID: selectedTermId,
                  INPOT: 2 // عملية الحذف الشامل
              })
          });

          // 2. حفظ التوزيع الجديد صف صف (INPOT = 1)
          let savedCount = 0;
          for (const row of distributionResult) {
              // تحويل التاريخ لصيغة YYYY-MM-DD
              const dateToSend = new Date(row.ExamDate).toISOString().split('T')[0];

              await fetch(`${API_URL}/api/exam/distribution`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      ExamDate: dateToSend,
                      ExamPeriod: row.ExamPeriod,
                      SubjectName: row.SubjectName,
                      CommitteeName: row.CommitteeName,
                      Teacher1: row.Teacher1,
                      Teacher2: row.Teacher2,
                      SchoolID: schoolId,
                      YearID: yearId,
                      TiremID: selectedTermId,
                      INPOT: 1 // عملية الإضافة
                  })
              });
              savedCount++;
          }

          alert(`✅ تم تحديث التوزيع بنجاح. تم حفظ ${savedCount} سجل.`);
      } catch (err) {
          console.error(err);
          alert('خطأ في الحفظ');
      } finally {
          setSaving(false);
      }
  };

  // === Styles ===
  const containerStyle: React.CSSProperties = { padding: '30px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal', background: '#f8fafc', minHeight: '100vh' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0f766e, #14b8a6)', color: 'white', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(15, 118, 110, 0.4)' };
  const cardStyle: React.CSSProperties = { background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '20px', border: '1px solid #ccfbf1' };
  const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', cursor: 'pointer', fontWeight: 'bold' };
  const inputStyle: React.CSSProperties = { padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{margin:0, fontSize:'28px'}}>👨‍🏫 توزيع المعلمين على اللجان</h1>
        <p style={{margin:'5px 0 0', opacity:0.9}}>نظام توزيع ذكي وعادل</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* القائمة الجانبية (التحكم) */}
        <div style={cardStyle}>
            <h3 style={{marginTop:0, color:'#0f766e'}}>إعدادات التوزيع</h3>
            
            <div style={{marginBottom:'15px'}}>
                <label style={{fontWeight:'bold'}}>اختر التيرم</label>
                <select value={selectedTermId || ''} onChange={e => setSelectedTermId(Number(e.target.value))} style={inputStyle}>
                    <option value="">-- اختر --</option>
                    {terms.map(t => <option key={t['الرقم']} value={t['الرقم']}>{t['التيرم']}</option>)}
                </select>
            </div>

            <div style={{marginBottom:'15px'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <label style={{fontWeight:'bold'}}>اختر المعلمين</label>
                    <button onClick={selectAllTeachers} style={{...btnPrimary, background:'#e2e8f0', color:'#475569', padding:'2px 8px', fontSize:'12px'}}>اختيار الكل</button>
                </div>
                
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '5px' }}>
                    {teachers.map(t => (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '5px', cursor: 'pointer', background: selectedTeachers.includes(t.id) ? '#f0fdfa' : 'transparent' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedTeachers.includes(t.id)} 
                                onChange={() => toggleTeacher(t.id)}
                                style={{ marginLeft: '10px', accentColor: '#0f766e' }}
                            />
                            {t.name}
                        </label>
                    ))}
                </div>
                <p style={{fontSize:'12px', color:'#64748b', marginTop:'5px'}}>عدد المختارين: {selectedTeachers.length}</p>
            </div>

            <button onClick={handleDistribution} disabled={loading} style={{...btnPrimary, width:'100%', marginBottom:'10px'}}>
                {loading ? 'جاري التوزيع...' : '⚡ بدء التوزيع الذكي'}
            </button>
            
            {distributionResult.length > 0 && (
                <button onClick={handleSave} disabled={saving} style={{...btnPrimary, width:'100%', background:'#dc2626'}}>
                    {saving ? 'جاري الحفظ...' : '💾 حفظ التوزيع'}
                </button>
            )}

            {teacherStats && (
                <div style={{marginTop:'15px', padding:'10px', background:'#f1f5f9', borderRadius:'8px', fontSize:'12px', whiteSpace:'pre-wrap'}}>
                    {teacherStats}
                </div>
            )}
        </div>

        {/* الجدول الرئيسي */}
        <div style={cardStyle}>
            <h3 style={{marginTop:0, color:'#0f766e'}}>📋 نتيجة التوزيع ({distributionResult.length})</h3>
            
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={thStyle}>التاريخ</th>
                            <th style={thStyle}>الفترة</th>
                            <th style={thStyle}>المادة</th>
                            <th style={thStyle}>اللجنة</th>
                            <th style={thStyle}>ملاحظ 1</th>
                            <th style={thStyle}>ملاحظ 2</th>
                        </tr>
                    </thead>
                    <tbody>
                        {distributionResult.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={tdStyle}>{new Date(row.ExamDate).toLocaleDateString('ar-EG')}</td>
                                <td style={tdStyle}>{row.ExamPeriod}</td>
                                <td style={tdStyle}>{row.SubjectName}</td>
                                <td style={{...tdStyle, fontWeight:'bold'}}>{row.CommitteeName}</td>
                                <td style={{...tdStyle, color: '#0f766e'}}>{row.Teacher1}</td>
                                <td style={{...tdStyle, color: '#0f766e'}}>{row.Teacher2}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' };
const tdStyle: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #f3f4f6' };