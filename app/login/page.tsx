'use client';

import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

type Role = { id: number; name: string };
type School = { id: number; name: string };

// قائمة الأدوار التي لا تتطلب اختيار مدرسة
const ROLES_WITHOUT_SCHOOL = ['المدير العام', 'مدير الإدارة', 'Super Admin'];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/7`);
      const data = await res.json();
      if (data.success && data.data) {
        setRoles(data.data.map((r: any) => ({
          id: r['الرقم'] || r.EntityID || r.ID || 0,
          name: r['الدور'] || r.EntityName || r.RoleNam || ''
        })));
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  const fetchSchoolsByRole = async (roleName: string) => {
    setLoadingSchools(true);
    try {
      const res = await fetch(`${API_URL}/api/search?inpot=5&scher=${encodeURIComponent(roleName)}`);
      const data = await res.json();

      if (data.success && data.data) {
        setSchools(data.data.map((s: any) => ({
          id: s.EntityID || s['EntityID'] || Object.values(s)[0],
          name: s.EntityName || s['EntityName'] || Object.values(s)[1]
        })));
      } else {
        setSchools([]);
      }
    } catch (err) {
      console.error(err);
      setSchools([]);
    } finally {
      setLoadingSchools(false);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value;
    const role = roles.find(r => String(r.id) === roleId);
    const roleName = role?.name || '';
    
    setSelectedRole(roleId);
    setSelectedRoleName(roleName);
    setSelectedSchool(''); 
    setSchools([]);
    
    // جلب المدارس فقط إذا لم يكن الدور من الأدوار المستثناة
    if (role && !ROLES_WITHOUT_SCHOOL.includes(roleName)) {
      fetchSchoolsByRole(roleName);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    
    // التحقق من المدرسة فقط إذا كان الدور يتطلب ذلك
    const requiresSchool = !ROLES_WITHOUT_SCHOOL.includes(selectedRoleName);
    
    if (requiresSchool) {
      if (schools.length === 0) {
        setError('لا توجد مدارس متاحة لهذا الدور أو لم يتم تحميلها بعد');
        return;
      }
      if (!selectedSchool) {
        setError('يرجى اختيار المدرسة');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        username,
        password,
        schoolId: selectedSchool ? parseInt(selectedSchool) : null, 
        selectedRoleName: selectedRoleName
      };

      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        if (data.roleMismatch) {
          setError(data.message || 'الدور المختار غير مطابق لصلاحيات المستخدم');
          setLoading(false);
          return;
        }

        // ✅✅✅ التعديل المهم هنا: تجهيز البيانات لتناسب الـ Store
        // السيرفر يرسل currentMrahelID و currentYerID داخل lastSettings
        // لكن الـ Store يتوقعها في المستوى الرئيسي
        const formattedUser = {
          ...data.user,
          currentMrahelID: data.user.lastSettings?.mrahelId,
          currentYerID: data.user.lastSettings?.yerId,
          // الأسماء ستكون undefined هنا، وهذا طبيعي، سيتم جلبها لاحقاً
        };

        login(formattedUser);
        router.push('/'); 
      } else {
        setError(data.message || 'خطأ في تسجيل الدخول');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('حدث خطأ في الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  const requiresSchool = selectedRoleName ? !ROLES_WITHOUT_SCHOOL.includes(selectedRoleName) : false;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2744 0%, #1e40af 50%, #0f2744 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #2563eb, #1e40af)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px'
          }}>
            <i className="fa-solid fa-school-flag" style={{ fontSize: '36px', color: 'white' }}></i>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>نظام المدرسة</h1>
          <p style={{ color: '#64748b', margin: '5px 0 0' }}>تسجيل الدخول</p>
        </div>

        <form onSubmit={handleLogin}>
          {/* حقل الدور */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              <i className="fa-solid fa-user-shield" style={{ marginLeft: '8px' }}></i>
              الدور
            </label>
            <select
              value={selectedRole}
              onChange={handleRoleChange}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '15px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            >
              <option value="">اختر الدور</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* حقل المدرسة */}
          {selectedRole && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                <i className="fa-solid fa-school" style={{ marginLeft: '8px' }}></i>
                المدرسة
              </label>
              
              {loadingSchools ? (
                <div style={{ padding: '14px', color: '#64748b', textAlign: 'center' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> جاري جلب المدارس...
                </div>
              ) : requiresSchool ? (
                schools.length > 0 ? (
                  <select
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '15px',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="">اختر المدرسة</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '10px', color: '#ef4444', fontSize: '13px', background: '#fef2f2', borderRadius: '8px' }}>
                    لا توجد مدارس مرتبطة بهذا الدور
                  </div>
                )
              ) : (
                <div style={{ padding: '14px', color: '#059669', fontSize: '14px', background: '#ecfdf5', borderRadius: '12px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                  <i className="fa-solid fa-check-circle" style={{ marginLeft: '5px' }}></i>
                  تسجيل الدخول بصلاحيات عامة (غير مرتبط بمدرسة)
                </div>
              )}
            </div>
          )}

          {/* حقل اسم المستخدم */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              <i className="fa-solid fa-user" style={{ marginLeft: '8px' }}></i>
              اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '15px',
                outline: 'none'
              }}
            />
          </div>

          {/* حقل كلمة المرور */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              <i className="fa-solid fa-lock" style={{ marginLeft: '8px' }}></i>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '15px',
                outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginLeft: '8px' }}></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1e40af)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                جاري التحقق...
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket"></i>
                تسجيل الدخول
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}