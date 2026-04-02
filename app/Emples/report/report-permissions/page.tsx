'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

// --- Types ---
interface PermissionRecord {
  الرقم: number;
  الموظف: string;
  'نوع الاذن': string;
  'تاريخ الاذن': string;
  'بداية من': string;
  'الى': string;
  'مدة الاذن': string;
  'حالة الاذن': string;
  'اجمالى الاذون': number;
}

interface EmployeeProfile {
  الموظف: string;
  permissions: { typeName: string; count: number; details: string[] }[];
}

export default function PermissionsDashboardPage() {
  const { user, work } = useAuthStore();
  
  const targetSchoolId = user?.schoolId;
  const displaySchoolName = user?.schoolName || 'المدرسة الحالية';

  const [rawData, setRawData] = useState<PermissionRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalPermissions: 0,
    typeBreakdown: {} as { [key: string]: number }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!targetSchoolId || !work?.yearId) return;
      
      setLoading(true);
      try {
        // Request data with number 39
        const res = await fetch(`${API_URL}/api/leaves/data?schoolId=${targetSchoolId}&yearId=${work.yearId}&inpout=39`);
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          setRawData(data.data);
          
          // 1. Calculate Stats
          const uniqueEmployees = new Set(data.data.map((item: PermissionRecord) => item['الموظف']));
          const typeCounts: { [key: string]: number } = {};
          
          data.data.forEach((item: PermissionRecord) => {
            const pType = item['نوع الاذن'] || 'غير محدد';
            typeCounts[pType] = (typeCounts[pType] || 0) + 1;
          });

          setStats({
            totalEmployees: uniqueEmployees.size,
            totalPermissions: data.data.length,
            typeBreakdown: typeCounts
          });

          // 2. Group Data for Employees
          const grouped: { [key: string]: EmployeeProfile } = {};

          data.data.forEach((item: PermissionRecord) => {
            const empKey = item['الموظف'];
            const pType = item['نوع الاذن'] || 'إذن';

            if (!grouped[empKey]) {
              grouped[empKey] = { الموظف: empKey, permissions: [] };
            }

            let pObj = grouped[empKey].permissions.find(p => p.typeName === pType);
            if (!pObj) {
              pObj = { typeName: pType, count: 0, details: [] };
              grouped[empKey].permissions.push(pObj);
            }

            pObj.count++;
            pObj.details.push(
              `${item['تاريخ الاذن'] ? new Date(item['تاريخ الاذن']).toLocaleDateString('ar-EG') : ''} (${item['مدة الاذن'] || '-'})`
            );
          });

          setEmployees(Object.values(grouped));
        } else {
            setRawData([]);
            setEmployees([]);
            setStats({ totalEmployees: 0, totalPermissions: 0, typeBreakdown: {} });
        }
      } catch (e) { 
        console.error(e); 
      }
      finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, [targetSchoolId, work]);

  // Function to determine permission color based on type
  const getPermissionColor = (typeName: string) => {
    if (typeName.includes('مرضي')) return '#3b82f6'; // Blue
    if (typeName.includes('عارضة')) return '#10b981'; // Green
    if (typeName.includes('بقاء')) return '#f59e0b'; // Orange
    return '#6b7280'; // Gray
  };

  return (
    <div style={{ padding: 30, direction: 'rtl', background: '#f0f9ff', minHeight: '100vh' }}>
      
      {/* Main Header */}
      <div style={{ background: 'linear-gradient(to right, #3b82f6, #1d4ed8)', color: 'white', padding: 40, borderRadius: 20, marginBottom: 30, textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>📋 لوحة متابعة الإذونات</h1>
        <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>{displaySchoolName} - تقرير إذونات الموظفين</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: 15 }}>جاري تحميل البيانات...</div>
      ) : (
        <>
          {/* Stats Summary Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
            
            {/* Total Employees Card */}
            <div style={{ background: 'white', padding: 20, borderRadius: 15, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderRight: '5px solid #3b82f6' }}>
              <h3 style={{ margin: 0, color: '#1e3a8a' }}>{stats.totalEmployees}</h3>
              <small style={{ color: '#64748b' }}>عدد الموظفين لديهم إذونات</small>
            </div>

            {/* Total Permissions Card */}
            <div style={{ background: 'white', padding: 20, borderRadius: 15, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderRight: '5px solid #10b981' }}>
              <h3 style={{ margin: 0, color: '#065f46' }}>{stats.totalPermissions}</h3>
              <small style={{ color: '#64748b' }}>إجمالي عدد الإذونات</small>
            </div>

            {/* Type Breakdown Cards (Dynamic) */}
            {Object.entries(stats.typeBreakdown).map(([typeName, count]) => (
              <div key={typeName} style={{ background: 'white', padding: 20, borderRadius: 15, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', textAlign: 'center', borderRight: `5px solid ${getPermissionColor(typeName)}` }}>
                <h3 style={{ margin: 0, color: getPermissionColor(typeName) }}>{count}</h3>
                <small style={{ color: '#64748b' }}>{typeName}</small>
              </div>
            ))}
          </div>

          {/* Employee Cards Display */}
          <div style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
          }}>
            {employees.map((emp, idx) => (
              <div key={idx} style={{ background: 'white', borderRadius: 15, overflow: 'hidden', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)', border: '1px solid #e2e8f0' }}>
                
                {/* Card Header */}
                <div style={{ background: '#1e3a8a', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{emp.الموظف}</h3>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>    
                    {emp.permissions.reduce((acc, curr) => acc + curr.count, 0)} إذونات
                  </span>
                </div>

                {/* Permission Details */}
                <div style={{ padding: 15 }}>
                  {emp.permissions.map((p, i) => (
                    <div key={i} style={{ marginBottom: 10, background: '#f8fafc', padding: 10, borderRadius: 8, borderRight: `4px solid ${getPermissionColor(p.typeName)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontWeight: 'bold', color: '#334155' }}>{p.typeName}</span>
                        <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{p.count}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {p.details.slice(0, 3).map((d, k) => (
                          <div key={k} style={{ marginTop: 2 }}>📅 {d}</div>
                        ))}
                        {p.details.length > 3 && <div style={{color: '#3b82f6'}}>+{p.details.length - 3} المزيد</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}