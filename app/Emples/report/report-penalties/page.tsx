'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- Types ---
interface LeaveRecord {
  'مسلسل': number;
  'الموظف': string;
  'الوظيفة'?: string; 
  'نوع الاجازة': string;
  'تاريخ البدء': string;
  'تاريخ الانتهاء': string;
  'اليوم': string; 
  'المدة': number;
  'حالة الإجازة': string;
  'رصيد سابق': number;
  'رصيد حديث': number;
  'إجمالي الرصيد': number;
  'إجمالي الحاصل عليه': number;
  'رصيد السنة': number;
}

interface SchoolInfo {
  SchoolNam: string;
  SchoolLogo?: string;
  // تمت الإضافة مرة أخرى لدعم التصميم القديم ولكن سنقوم بتركها فارغة
  ModriaNam?: string; 
  EdaraNam?: string;
}

export default function AllLeavesPage() {
  const { user, work } = useAuthStore();
  
  const schoolId = user?.schoolId;
  const yearId = work?.yearId;
  const yearName = work?.yearName;
  
  const schoolInfo: SchoolInfo = {
    SchoolNam: user?.schoolName || 'المدرسة التجريبية',
    ModriaNam: '', // فارغة كما طلبت
    EdaraNam: ''   // فارغة كما طلبت
  };

  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [filtered, setFiltered] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    name: "",
    type: "",
    date: ""
  });

  const [columnsConfig, setColumnsConfig] = useState([
    { key: "مسلسل", label: "م", visible: true },
    { key: "الموظف", label: "الموظف", visible: true },
    { key: "وظيفة", label: "الوظيفة", visible: true },
    { key: "نوع الاجازة", label: "نوع الإجازة", visible: true },
    { key: 'تاريخ البدء', label: 'تاريخ البدء', visible: true },
    { key: 'تاريخ الانتهاء', label: 'تاريخ الانتهاء', visible: true },
    { key: "المدة", label: "المدة", visible: true },
    { key: "حالة الإجازة", label: "الحالة", visible: true },
    { key: "رصيد السنة", label: "رصيد السنة", visible: false },
    { key: "actions", label: "طباعة", visible: true },
  ]);

  // جلب البيانات
  useEffect(() => {
    if (!schoolId || !yearId) return;
    setLoading(true);
    
    const fetchLeaves = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${schoolId}&yearId=${yearId}&inpout=34`);
        const data = await res.json();
        if (data.success) {
          setLeaves(data.data);
          setFiltered(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [schoolId, yearId]);

  // الفلترة
  useEffect(() => {
    const { name, type, date } = filters;
    const result = leaves.filter((item) => {
      const matchName = item['الموظف']?.toLowerCase().includes(name.toLowerCase());
      const matchType = type ? item['نوع الاجازة'] === type : true;
      let matchDate = true;
      if (date) {
        const searchDate = new Date(date);
        const start = new Date(item['تاريخ البدء']);
        const end = new Date(item['تاريخ الانتهاء']);
        matchDate = searchDate >= start && searchDate <= end;
      }
      return matchName && matchType && matchDate;
    });
    setFiltered(result);
  }, [filters, leaves]);

  const getStatusBadge = (status: string) => {
    if (!status) return <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', fontSize: '12px' }}>-</span>;
    let color = '#64748b';
    let bg = '#f1f5f9';
    if (status.includes('مؤكدة')) { color = '#166534'; bg = '#dcfce7'; }
    else if (status.includes('رفض')) { color = '#991b1b'; bg = '#fee2e2'; }
    return <span style={{ padding: '2px 8px', borderRadius: '6px', background: bg, color: color, fontSize: '12px', fontWeight: '600' }}>{status}</span>;
  };

  // دالة الطباعة (تمت كتابتها لتطابق كود C# تماماً مع Absolute Positioning)
  const handlePrint = (item: LeaveRecord) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const empName = item['الموظف'] || '';
    const jobName = item['الوظيفة'] || 'موظف';
    const leaveType = item['نوع الاجازة'] || 'إجازة';
    const dateStart = item['تاريخ البدء'];
    const dateEnd = item['تاريخ الانتهاء'];
    const duration = item['المدة'];

    // حساب أسماء الأيام
    const startDayName = dateStart ? new Date(dateStart).toLocaleDateString('ar-EG', { weekday: 'long' }) : '';
    const endDayName = dateEnd ? new Date(dateEnd).toLocaleDateString('ar-EG', { weekday: 'long' }) : '';

    // البيانات الفارغة كما طلبت
    const directorate = schoolInfo.ModriaNam || ""; 
    const administration = schoolInfo.EdaraNam || "";
    const schoolName = schoolInfo.SchoolNam;

    const printHTML = `
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>طلب اجازة</title>
        <style>
          @page { margin: 0; size: A4; }
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 0;
            position: relative;
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
          }
          
          /* الأنماط العامة */
          .header-text { position: absolute; right: 20px; text-align: right; font-weight: bold; font-size: 18px; line-height: 40px; }
          .logo-img { position: absolute; left: 50px; top: 50px; width: 100px; height: 100px; object-fit: contain; }
          .line-separator { position: absolute; left: 50px; right: 20px; border-bottom: 4px solid black; }
          
          .center-title { position: absolute; left: 50%; transform: translateX(-50%); text-align: center; font-weight: bold; font-size: 18px; }
          .right-text { position: absolute; right: 50px; text-align: right; font-weight: bold; font-size: 14px; line-height: 35px; width: 80%; }
          
          /* الجدول */
          .data-table { position: absolute; left: 50px; right: 50px; border-collapse: collapse; width: calc(100% - 100px); }
          .data-table th, .data-table td { border: 2px solid black; padding: 10px; text-align: center; font-weight: bold; font-size: 14px; }
          
          /* التواقيع */
          .sig-row { position: absolute; right: 50px; text-align: right; font-weight: bold; font-size: 14px; }
          .sig-dots { letter-spacing: 2px; }

        </style>
      </head>
      <body>

        <!-- اللوجو (أقصى اليسار) -->
        <!-- تم استخدام placeholder إذا لم يوجد لوجو -->
        <img src="${schoolInfo.SchoolLogo || 'https://via.placeholder.com/100'}" class="logo-img" alt="Logo" />

        <!-- الهيدر (أقصى اليمين) -->
        <div class="header-text" style="top: 50px;">
          المديرية: ${directorate}<br/>
          الإدارة: ${administration}<br/>
          المدرسة: ${schoolName}
        </div>

        <!-- الخط الفاصل -->
        <div class="line-separator" style="top: 170px;"></div>

        <!-- العنوان الرئيسي -->
        <div class="center-title" style="top: 210px;">طلب اجازة</div>

        <!-- السيد الأستاذ -->
        <div class="right-text" style="top: 250px;">السيد الاستاذ / مدير عام الادارة</div>

        <!-- تحية طيبة -->
        <div class="center-title" style="top: 290px;">تحية طيبة وبعد</div>

        <!-- مقدمة لسيادتكم -->
        <div class="right-text" style="top: 320px;">
          مقدمة لسيادتكم: ${empName}            الوظيفة : ${jobName}
        </div>

        <!-- التابع لادارة -->
        <div class="right-text" style="top: 360px;">
          التابع لادارة  : ${administration}           مدرسة : ${schoolName}
        </div>

        <!-- أرجو الموافقة -->
        <div class="right-text" style="top: 400px;">
          أرجو من سياداتكم التكرم بالموافقة على إعطائي اجازة لمدة : ${duration}
        </div>

        <!-- الفترة -->
        <div class="right-text" style="top: 440px;">
          و ذلك فى الفترة من يوم :${startDayName}  الموافق   : ${dateStart}   الى يوم   :${endDayName}   الموافق   : ${dateEnd}
        </div>

        <!-- على أن يقوم بعملي -->
        <div class="right-text" style="top: 480px;">
          على ان يقوم بعملي السيد : ........................................................  والذي يعمل بوظيفة : ......................... 
        </div>

        <!-- وعنواني -->
        <div class="right-text" style="top: 520px;">
          وعنواني اثناء الاجازة هو  : .............................................................................:   
        </div>

        <!-- القائم بالعمل / طالب الاجازة -->
        <div class="right-text" style="top: 560px;">
           القائم بالعمل                                                                        طالب الاجازة    
        </div>

        <!-- الاسم -->
        <div class="right-text" style="top: 600px;">
           الاسم                                                                                الاسم    : ${empName} 
        </div>

        <!-- التوقيع -->
        <div class="right-text" style="top: 640px;">
           التوقيع                                                                             التوقيع     
        </div>

        <!-- جدول الرصيد (يبدأ تقريباً عند Y=680) -->
        <table class="data-table" style="top: 680px;">
          <tr>
            <th>رصيد السنوات السابقة</th>
            <th>الرصيد المتبقي</th>
            <th>الإجازة الممنوحة</th>
            <th>الإجازة المستحقة</th>
          </tr>
          <tr>
            <td>${item['رصيد سابق'] || 0}</td>
            <td>${item['إجمالي الرصيد'] || 0}</td>
            <td>${item['إجمالي الحاصل عليه'] || 0}</td>
            <td>${item['رصيد السنة'] || 0}</td>
          </tr>
        </table>

        <!-- التواقيع الإدارية (Y تبدأ من حوالي 790) -->
        <!-- المواقع بالنسبة لليمين: شؤون العاملين (أقصى اليمين)، مدير المدرسة (وسط)، مدير الإدارة (يسار) -->
        <div class="sig-row" style="top: 800px; right: 50px;">شؤون العاملين</div>
        <div class="sig-row" style="top: 800px; right: 400px;">مدير المدرسة:</div>
        <div class="sig-row" style="top: 800px; right: 600px;">مدير الإدارة</div>

        <div class="sig-row sig-dots" style="top: 830px; right: 50px;">......................</div>
        <div class="sig-row sig-dots" style="top: 830px; right: 400px;">......................</div>
        <div class="sig-row sig-dots" style="top: 830px; right: 600px;">......................</div>

        <!-- إقرار القيام بالإجازة -->
        <div class="center-title" style="top: 890px;">اقرار القيام بالإجازة</div>

        <!-- نص الإقرار -->
        <div class="right-text" style="top: 940px;">
          اقر بأنني اديت أعمالي المصلحية حتى يوم .............. الموافق      /       /    وهو اخر يوم 
        </div>

        <div class="right-text" style="top: 980px;">
          قبل قيامي بالإجازة الاعتيادية المرخص لي بها وبياناتها بعالي 
        </div>

        <!-- التواقيع الأخيرة -->
        <div class="sig-row" style="top: 1050px; right: 50px;">طالب الاجازة</div>
        <div class="sig-row" style="top: 1050px; right: 350px;">مسئول شئون العاملين</div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      
      <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', padding: '25px', borderRadius: '16px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📊 سجل الإجازات (طباعة رسمية)</h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>مطابق للنموذج الرسمي</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>العام الدراسي</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{yearName || yearId}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {/* Filters */}
        <div style={{ padding: '20px', borderBottom: '1px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <input
              placeholder="بحث بالاسم..."
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', flex: '1' }}
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', flex: '1' }}
            >
              <option value="">كل الأنواع</option>
              <option value="اعتيادية">اعتيادية</option>
              <option value="عارضة">عارضة</option>
              <option value="مرضية">مرضية</option>
            </select>
            <button 
              onClick={() => setFilters({ name: '', type: '', date: '' })}
              style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
            >
              مسح الفلاتر
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#059669' }}>جاري تحميل البيانات...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0fdf4', color: '#065f46' }}>
                {columnsConfig.map(col => col.visible && (
                  <th key={col.key} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '2px solid #059669' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((item, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', transition: '0.2s' }}>
                  {columnsConfig.map((col) => {
                    if (!col.visible) return null;

                    if (col.key === 'حالة الإجازة') {
                      return (
                        <td key={col.key} style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          {getStatusBadge(item['حالة الإجازة'])}
                        </td>
                      );
                    }
                    if (col.key === 'actions') {
                      return (
                        <td key={col.key} style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          <button 
                            onClick={() => handlePrint(item)}
                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                          >
                            🖨️ طباعة
                          </button>
                        </td>
                      );
                    }
                    if (col.key === 'تاريخ البدء' || col.key === 'تاريخ الانتهاء') {
                      const val = String(item[col.key as keyof LeaveRecord]);
                      return <td key={col.key} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        {val ? val.split('T')[0] : '-'}
                      </td>;
                    }
                    
                    if (col.key === 'مسلسل' || col.key === 'المدة' || col.key === 'رصيد السنة' || col.key === 'إجمالي الرصيد') {
                        const val = item[col.key as keyof LeaveRecord];
                        return <td key={col.key} style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          {val !== undefined && val !== null ? val.toString() : '-'}
                        </td>;
                    }

                    return <td key={col.key} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                      {item[col.key as keyof LeaveRecord] || "-"}
                    </td>;
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={columnsConfig.filter(c => c.visible).length} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    لا توجد بيانات
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