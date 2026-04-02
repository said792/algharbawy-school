'use client';
import { API_URL } from '@/lib/config';
import { useState, useEffect } from 'react';

type User = {
  UserId: number;
  UserName: string;
  Password: string;
  RoleNam: string;
  RoleId: number;
  PersonName: string;
  PersonID: number;
  PersonType: number;
  ModriaNam: string;
  ModriaID: number;
  EdaraNam: string;
  EdaraID: number;
  SchoolNam: string;
  SchoolID: number;
  IsActive: boolean;
  [key: string]: any;
};

type Role = { RoleId?: number; RoleNam?: string; الرقم?: number; الدور?: string; [key: string]: any };
type Modria = { ModriaID?: number; ModriaNam?: string; الرقم?: number; المديرية?: string; [key: string]: any };
type Edara = { الرقم?: number; الادارة?: string; المديرية?: string; [key: string]: any };
type School = { الرقم?: number; المدرسة?: string; الادارة?: string; [key: string]: any };
type Person = { PersonID: number; PersonName: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modriat, setModriat] = useState<Modria[]>([]);
  const [edarat, setEdarat] = useState<Edara[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [nextId, setNextId] = useState(1);
  
  // حالات الفلترة
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterSchool, setFilterSchool] = useState(''); // جديد
  const [filterActive, setFilterActive] = useState('');

  const [formData, setFormData] = useState({
    UserName: '',
    Password: '',
    PersonID: 0,
    PersonType: 0,
    RoleId: 0,
    ModriaID: 0,
    ModriaNam: '', 
    EdaraID: 0,
    EdaraNam: '',
    SchoolID: 0,
    SchoolNam: '',
    IsActive: true
  });

  // Helpers
  const getId = (item: any) => item['الرقم'] || item.RoleId || item.ModriaID || item.EdaraID || item.SchoolID || Object.values(item)[0];
  const getName = (item: any, type: string) => {
    if (type === 'role') return item['الدور'] || item.RoleNam || Object.values(item)[1];
    if (type === 'modria') return item['المديرية'] || item.ModriaNam || Object.values(item)[1];
    if (type === 'edara') return item['الادارة'] || Object.values(item)[1];
    if (type === 'school') return item['المدرسة'] || Object.values(item)[1];
    return '';
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchModriat();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/9`);
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/7`);
      const data = await res.json();
      setRoles(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchModriat = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getData/1`);
      const data = await res.json();
      setModriat(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchEdarat = async (modriaName: string) => {
    if (!modriaName) return;
    try {
      const res = await fetch(`${API_URL}/api/search?inpot=2&scher=${encodeURIComponent(modriaName)}`);
      const data = await res.json();
      setEdarat(data.data || []);
    } catch (err) { console.error(err); setEdarat([]); }
  };

  const fetchSchools = async (modriaName: string, edaraName: string) => {
    if (!modriaName || !edaraName) return;
    try {
      const res = await fetch(`${API_URL}/api/search2?inpot=2&SCHER1=${encodeURIComponent(modriaName)}&SCHER2=${encodeURIComponent(edaraName)}`);
      const data = await res.json();
      setSchools(data.data || []);
    } catch (err) { console.error(err); setSchools([]); }
  };

  const fetchPersons = async (typeName: string, schoolName: string) => {
    if (!typeName || !schoolName) return;
    try {
      const res = await fetch(`${API_URL}/api/search2?inpot=36&SCHER1=${encodeURIComponent(typeName)}&SCHER2=${encodeURIComponent(schoolName)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPersons(data.data);
      } else {
        setPersons([]);
      }
    } catch (err) { console.error(err); setPersons([]); }
  };

  const getNextId = async (): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/api/getData/10`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const row = data.data[0];
        const id = row[''] || Object.values(row)[0];
        return Number(id) || 1;
      }
      return 1;
    } catch (err) {
      return users.length > 0 ? Math.max(...users.map((u: any) => u['الرقم'] || u.UserId || 0)) + 1 : 1;
    }
  };

  // Handlers
  const handleModriaChange = (modriaId: number) => {
    const selected = modriat.find(m => getId(m) === modriaId);
    const name = selected ? getName(selected, 'modria') : '';
    
    setFormData({ 
      ...formData, 
      ModriaID: modriaId, ModriaNam: name, 
      EdaraID: 0, EdaraNam: '', SchoolID: 0, SchoolNam: '', PersonID: 0, PersonType: 0 
    });
    setEdarat([]); setSchools([]); setPersons([]);
    if (modriaId) fetchEdarat(name);
  };

  const handleEdaraChange = (edaraId: number) => {
    const selected = edarat.find(e => getId(e) === edaraId);
    const name = selected ? getName(selected, 'edara') : '';
    
    setFormData({ 
      ...formData, 
      EdaraID: edaraId, EdaraNam: name, 
      SchoolID: 0, SchoolNam: '', PersonID: 0, PersonType: 0 
    });
    setSchools([]); setPersons([]);
    if (edaraId) fetchSchools(formData.ModriaNam, name);
  };

  const handleSchoolChange = (schoolId: number) => {
    const selected = schools.find(s => getId(s) === schoolId);
    const name = selected ? getName(selected, 'school') : '';

    setFormData({ 
      ...formData, SchoolID: schoolId, SchoolNam: name, PersonID: 0, PersonType: 0 
    });
    setPersons([]);
  };

  const handlePersonTypeChange = (type: number) => {
    const typeName = type === 1 ? 'الطالب' : 'موظف';
    setFormData({ ...formData, PersonType: type, PersonID: 0 });
    setPersons([]);
    if (type && formData.SchoolNam) fetchPersons(typeName, formData.SchoolNam);
  };

  const openAddModal = async () => {
    const id = await getNextId();
    setNextId(id);
    setEditingUser(null);
    setFormData({
      UserName: '', Password: '', PersonID: 0, PersonType: 0, RoleId: 0,
      ModriaID: 0, ModriaNam: '', EdaraID: 0, EdaraNam: '', SchoolID: 0, SchoolNam: '',
      IsActive: true
    });
    setEdarat([]); setSchools([]); setPersons([]);
    setIsModalOpen(true);
  };

      const openEditModal = async (user: User) => {
    setEditingUser(user);

    // 1. تجهيز الأسماء من بيانات المستخدم (للتأكد من وجودها)
    const modName = user.ModriaNam || user['المديرية'] || '';
    const edaName = user.EdaraNam || user['الادارة'] || '';
    const schName = user.SchoolNam || user['المدرسة'] || '';
    const roleName = user.RoleNam || user['الدور'] || '';

    // 2. إيجاد الـ ID الصحيح للدور بناءً على الاسم (حل مشكلة عدم ظهور الدور)
    const roleItem = roles.find(r => getName(r, 'role') === roleName);
    const correctRoleId = roleItem ? getId(roleItem) : (user.RoleId || 0);

    // 3. إيجاد الـ ID الصحيح للمديرية بناءً على الاسم
    const modItem = modriat.find(m => getName(m, 'modria') === modName);
    const correctModId = modItem ? getId(modItem) : (user.ModriaID || 0);

    // 4. تعبئة البيانات الأساسية للمستخدم (الاسم، الباسورد، الدور، الحالة)
    // هذا يضمن ظهور الاسم والدور فوراً
    setFormData({
      UserName: user.UserName,
      Password: user.Password,
      PersonID: user.PersonID || 0,
      PersonType: user.PersonType || 0,
      RoleId: correctRoleId, // استخدام الـ ID الصحيح
      ModriaID: correctModId,
      ModriaNam: modName,
      EdaraID: 0, // سيتم تحديثه بعد تحميل القائمة
      EdaraNam: edaName,
      SchoolID: 0, // سيتم تحديثه بعد تحميل القائمة
      SchoolNam: schName,
      IsActive: user.IsActive
    });

    setIsModalOpen(true); // فتح الموديل فوراً بالبيانات الأساسية

    // 5. تحميل القوائم الفرعية بشكل متسلسل (Cascade)
    
    // أ. تحميل الإدارات
    if (modName) {
      try {
        const resEdarat = await fetch(`${API_URL}/api/search?inpot=2&scher=${encodeURIComponent(modName)}`);
        const dataEdarat = await resEdarat.json();
        const edList = dataEdarat.data || [];
        setEdarat(edList);

        // إيجاد الـ ID الصحيح للإدارة
        const edItem = edList.find((e: any) => getName(e, 'edara') === edaName);
        if (edItem) {
          const correctEdId = getId(edItem);
          // تحديث الـ Form بـ ID الإدارة
          setFormData(prev => ({ ...prev, EdaraID: correctEdId }));

          // ب. تحميل المدارس
          if (edaName) {
            const resSchools = await fetch(`${API_URL}/api/search2?inpot=2&SCHER1=${encodeURIComponent(modName)}&SCHER2=${encodeURIComponent(edaName)}`);
            const dataSchools = await resSchools.json();
            const scList = dataSchools.data || [];
            setSchools(scList);

            // إيجاد الـ ID الصحيح للمدرسة
            const scItem = scList.find((s: any) => getName(s, 'school') === schName);
            if (scItem) {
              const correctScId = getId(scItem);
              // تحديث الـ Form بـ ID المدرسة
              setFormData(prev => ({ ...prev, SchoolID: correctScId }));

              // ج. تحميل الأشخاص
              if (user.PersonType && schName) {
                const typeName = user.PersonType === 1 ? 'الطالب' : 'موظف';
                const resPersons = await fetch(`${API_URL}/api/search2?inpot=36&SCHER1=${encodeURIComponent(typeName)}&SCHER2=${encodeURIComponent(schName)}`);
                const dataPersons = await resPersons.json();
                setPersons(dataPersons.data || []);
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };
    const handleSave = async () => {
    if (!formData.UserName || !formData.Password || !formData.RoleId) {
      alert('يرجى ملء الحقول المطلوبة');
      return;
    }
    try {
      const operation = editingUser ? 2 : 1;
      const body = editingUser 
        ? { ...formData, UserId: editingUser.UserId, operation }
        : { ...formData, UserId: nextId, operation };

      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ UserId: userId, operation: 3 })
      });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch (err) { console.error(err); }
  };

 const selectedRoleObj = roles.find(r => String(getId(r)) === String(filterRole));
  const selectedRoleName = selectedRoleObj ? getName(selectedRoleObj, 'role') : '';

  // استخراج قائمة المدارس الفريدة للفلترة
  const uniqueSchools = [...new Set(users.map(u => u.SchoolNam || u['المدرسة']).filter(Boolean))];

  const filteredUsers = users.filter(user => {
    const userName = user.UserName || user['اسم المستخدم'] || '';
    const personName = user.PersonName || user['الشخص'] || '';
    
    // 1. البحث النصي
    const matchSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        personName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. فلترة الدور (مقارنة بالاسم)
    const userRoleName = user.RoleNam || user['الدور'];
    // نقارن اسم الدور في صف المستخدم مع اسم الدور المختار في الفلتر
    const matchRole = !filterRole || userRoleName === selectedRoleName;

    // 3. فلترة المدرسة
    const userSchoolName = user.SchoolNam || user['المدرسة'];
    const matchSchool = !filterSchool || userSchoolName === filterSchool;
    
    // 4. فلترة الحالة
    const matchActive = filterActive === '' || 
                        (filterActive === 'active' && user.IsActive) ||
                        (filterActive === 'inactive' && !user.IsActive);

    return matchSearch && matchRole && matchSchool && matchActive;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        borderRadius: '20px', padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fa-solid fa-users-gear" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>إدارة المستخدمين</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>إنشاء وتعديل صلاحيات المستخدمين</p>
          </div>
        </div>
        <button onClick={openAddModal} style={{
          background: 'white', color: '#1d4ed8', border: 'none', padding: '12px 28px', borderRadius: '12px',
          fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <i className="fa-solid fa-plus"></i> إضافة مستخدم
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px'
      }}>
        <div>
          <label style={filterLabelStyle}><i className="fa-solid fa-search" style={{ marginLeft: '5px' }}></i> بحث</label>
          <input type="text" placeholder="بحث بالاسم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={filterInputStyle} />
        </div>
        
        <div>
          <label style={filterLabelStyle}><i className="fa-solid fa-user-shield" style={{ marginLeft: '5px' }}></i> الدور</label>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={filterInputStyle}>
            <option value="">كل الأدوار</option>
            {roles.map((r, i) => (<option key={i} value={getId(r)}>{getName(r, 'role')}</option>))}
          </select>
        </div>

        <div>
          <label style={filterLabelStyle}><i className="fa-solid fa-school" style={{ marginLeft: '5px' }}></i> المدرسة</label>
          <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} style={filterInputStyle}>
            <option value="">كل المدارس</option>
            {uniqueSchools.map((name, i) => (<option key={i} value={name}>{name}</option>))}
          </select>
        </div>

        <div>
          <label style={filterLabelStyle}>الحالة</label>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} style={filterInputStyle}>
            <option value="">الكل</option>
            <option value="active">نشط</option>
            <option value="inactive">متوقف</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>المستخدم</th>
              <th style={thStyle}>الشخص</th>
              <th style={thStyle}>الدور</th>
              <th style={thStyle}>المديرية</th>
              <th style={thStyle}>الإدارة</th>
              <th style={thStyle}>المدرسة</th>
              <th style={thStyle}>الحالة</th>
              <th style={thStyle}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا يوجد مستخدمين</td></tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.UserId || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
                      }}>
                        {(user.UserName || '?').charAt(0)}
                      </div>
                      <span style={{ fontWeight: '500' }}>{user.UserName}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{user.PersonName || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: '500' }}>
                      {user.RoleNam || '-'}
                    </span>
                  </td>
                  <td style={tdStyle}>{user.ModriaNam || '-'}</td>
                  <td style={tdStyle}>{user.EdaraNam || '-'}</td>
                  <td style={tdStyle}>{user.SchoolNam || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                      background: user.IsActive ? '#dcfce7' : '#fee2e2', color: user.IsActive ? '#166534' : '#991b1b'
                    }}>
                      {user.IsActive ? 'نشط' : 'متوقف'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => openEditModal(user)} style={editBtnStyle}><i className="fa-solid fa-pen"></i></button>
                      <button onClick={() => handleDelete(user.UserId)} style={deleteBtnStyle}><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setIsModalOpen(false)}>
          <div style={{...modalStyle, width: '600px', maxWidth: '95%'}} onClick={e => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3>{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '70vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                <div className="form-group">
                  <label style={labelStyle}>اسم المستخدم *</label>
                  <input type="text" style={inputStyle} value={formData.UserName} onChange={(e) => setFormData({ ...formData, UserName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label style={labelStyle}>كلمة المرور *</label>
                  <input type="password" style={inputStyle} value={formData.Password} onChange={(e) => setFormData({ ...formData, Password: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>الدور *</label>
                  <select style={inputStyle} value={formData.RoleId} onChange={(e) => setFormData({ ...formData, RoleId: parseInt(e.target.value) })}>
                    <option value={0}>اختر الدور</option>
                    {roles.map((r, i) => (<option key={i} value={getId(r)}>{getName(r, 'role')}</option>))}
                  </select>
                </div>

                <hr style={{ gridColumn: '1 / -1', border: '0', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

                <div className="form-group">
                  <label style={labelStyle}>المديرية</label>
                  <select style={inputStyle} value={formData.ModriaID} onChange={(e) => handleModriaChange(parseInt(e.target.value))}>
                    <option value={0}>اختر المديرية</option>
                    {modriat.map((m, i) => (<option key={i} value={getId(m)}>{getName(m, 'modria')}</option>))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={labelStyle}>الإدارة</label>
                  <select style={inputStyle} value={formData.EdaraID} onChange={(e) => handleEdaraChange(parseInt(e.target.value))} disabled={!formData.ModriaID}>
                    <option value={0}>{formData.ModriaID ? 'اختر الإدارة' : 'اختر المديرية أولاً'}</option>
                    {edarat.map((e, i) => (<option key={i} value={getId(e)}>{getName(e, 'edara')}</option>))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>المدرسة</label>
                  <select style={inputStyle} value={formData.SchoolID} onChange={(e) => handleSchoolChange(parseInt(e.target.value))} disabled={!formData.EdaraID}>
                    <option value={0}>{formData.EdaraID ? 'اختر المدرسة' : 'اختر الإدارة أولاً'}</option>
                    {schools.map((s, i) => (<option key={i} value={getId(s)}>{getName(s, 'school')}</option>))}
                  </select>
                </div>

                <hr style={{ gridColumn: '1 / -1', border: '0', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

                <div className="form-group">
                  <label style={labelStyle}>نوع الشخص</label>
                  <select style={inputStyle} value={formData.PersonType} onChange={(e) => handlePersonTypeChange(parseInt(e.target.value))} disabled={!formData.SchoolID}>
                    <option value={0}>{formData.SchoolID ? 'اختر النوع' : 'اختر المدرسة أولاً'}</option>
                    <option value={2}>موظف</option>
                    <option value={1}>طالب</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={labelStyle}>الشخص</label>
                  <select style={inputStyle} value={formData.PersonID} onChange={(e) => setFormData({ ...formData, PersonID: parseInt(e.target.value) })} disabled={!formData.PersonType}>
                    <option value={0}>{formData.PersonType ? 'اختر الشخص' : 'اختر النوع أولاً'}</option>
                    {persons.map((p, i) => (<option key={i} value={p.PersonID}>{p.PersonName}</option>))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.IsActive} onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })} />
                    مستخدم نشط
                  </label>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsModalOpen(false)} style={cancelBtnStyle}>إلغاء</button>
              <button onClick={handleSave} style={saveBtnStyle}>{editingUser ? 'تعديل' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#64748b', fontSize: '13px', borderBottom: '2px solid #e2e8f0' };
const tdStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'center', fontSize: '14px', color: '#334155' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '13px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' };

const editBtnStyle: React.CSSProperties = { background: '#eff6ff', color: '#2563eb', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' };
const deleteBtnStyle: React.CSSProperties = { background: '#fef2f2', color: '#dc2626', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' };

const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' };
const modalHeaderStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' };

const cancelBtnStyle: React.CSSProperties = { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' };
const saveBtnStyle: React.CSSProperties = { padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' };

// Filter Styles
const filterLabelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569', fontSize: '14px' };
const filterInputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' };