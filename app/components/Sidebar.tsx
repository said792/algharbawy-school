'use client';
import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

// 1. إضافة 'general_manager' للأنواع
type UserRole = 'admin' | 'school_admin' | 'student_affairs' | 'hr' | 'exam' | 'storekeeper' | 'teacher' | 'student' | 'general_manager';

const rolePermissions: Record<UserRole, string[]> = {
  // المدير العام: صلاحيات محددة جداً (فقط قسم المدير العام)
  'general_manager': [
    'general_manager'
  ],
  // مسئول الاعدادات (Admin): له صلاحيات النظام والهيكل لكن ليس بالضرورة تقارير المدير العام
  'admin': [
    'system_admin',
    'school_settings',
    'hr',
    'students',
    'exam',
    'store',
    'teacher_portal',
    'student_portal'
  ],
  'school_admin': [
    'system_admin',
    'school_settings',
    'hr',
    'students',
    'exam',
    'store',
    'teacher_portal',
    'student_portal'
  ],
  'student_affairs': ['students'],
  'hr': ['hr'],
  'exam': ['exam'],
  'storekeeper': ['store'],
  'teacher': ['teacher_portal'],
  'student': ['student_portal']
};

export default function Sidebar() {
  const router = useRouter();
  const { user, logout, isLoggedIn } = useAuthStore();
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    if (user) {
      const role = mapRole(user.role);
      setUserRole(role);
    }
    setLoading(false);
  }, [user, isLoggedIn, router]);

  const mapRole = (roleName: string | undefined): UserRole => {
    if (!roleName) return 'admin';

    const roleMap: Record<string, UserRole> = {
      'مسئول الاعدادات': 'admin',
      'المدير العام': 'general_manager', // 2. توجيه الدور للنوع الجديد
      'مدير المدرسة': 'school_admin',
      'مسئول شئون طلاب': 'student_affairs',
      'مسئول شئون عاملين': 'hr',
      'مسئول الكنترول': 'exam',
      'مسئول المخازن': 'storekeeper',
      'المعلم': 'teacher',
      'الطالب': 'student',
    };

    return roleMap[roleName.trim()] || 'admin';
  };

  const hasPermission = (section: string): boolean => {
    return rolePermissions[userRole]?.includes(section) || false;
  };

  if (loading) {
    return (
      <aside className="sidebar">
        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
        </div>
      </aside>
    );
  }

  if (!user) return null;

  return (
    <aside className="sidebar">

      <div className="logo-area">
        <i className="fa-solid fa-school-flag"></i>
        <span>نظام المدرسة</span>
      </div>

      <div className="user-info">
        <div className="user-avatar">
          <i className="fa-solid fa-user"></i>
        </div>
        <div className="user-details">
          <span className="user-name">{user?.username || 'المستخدم'}</span>
          <span className="user-role">{user?.role || ''}</span>
        </div>
        <button className="logout-btn" onClick={logout} title="تسجيل الخروج">
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>

      <div className="menu-container">

        {/* === قسم المدير العام === */}
        {hasPermission('general_manager') && (
          <MenuSection title="المدير العام" icon="fa-user-tie" color="red" defaultOpen>

            <SubMenuSection title="لوحة التحكم" icon="fa-gauge">
              <MenuLink href="/general/dashboard" icon="fa-chart-line">لوحة عامة</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="التقارير الشاملة" icon="fa-file-lines">
              <MenuLink href="/Moder_Ame/general/reports/students" icon="fa-user-graduate">تقرير الطلاب</MenuLink>
              <MenuLink href="/Moder_Ame/Emples/comprehensive" icon="fa-user-tie">تقرير الموظفين</MenuLink>
              <MenuLink href="/Moder_Ame/general/reports/finance" icon="fa-coins">تقرير مالي</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="متابعة الأداء" icon="fa-chart-column">
              <MenuLink href="/Moder_Ame/general/performance/schools" icon="fa-school">أداء المدارس</MenuLink>
              <MenuLink href="/Moder_Ame/general/performance/teachers" icon="fa-chalkboard-user">أداء المعلمين</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="الإشراف العام" icon="fa-eye">
              <MenuLink href="/Moder_Ame/general/monitoring/attendance1" icon="fa-calendar-check">متابعة حضور الطلاب</MenuLink>
              <MenuLink href="/Moder_Ame/general/monitoring/attendance" icon="fa-calendar-check">متابعة حضور المعلمين</MenuLink>
              <MenuLink href="/Moder_Ame/general/monitoring/exams" icon="fa-file-pen">متابعة الامتحانات</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="الإعدادات العليا" icon="fa-gear">
              <MenuLink href="/Moder_Ame/general/settings/system" icon="fa-sliders">إعدادات النظام</MenuLink>
              <MenuLink href="/users" icon="fa-lock">الصلاحيات</MenuLink>
            </SubMenuSection>

          </MenuSection>
        )}

       
        
        {/* === قسم مسئول النظام === */}
        {hasPermission('system_admin') && (
          <MenuSection title="مسئول النظام" icon="fa-user-shield" color="blue">
            <MenuLink href="/users" icon="fa-users-gear">المستخدمين</MenuLink>

            <SubMenuSection title="الهيكل الإدارى" icon="fa-building-columns">
              <MenuLink href="/system/hikal-adaraa/moderia" icon="fa-building-columns">المديريات</MenuLink>
              <MenuLink href="/system/hikal-adaraa/administration" icon="fa-landmark">الإدارات</MenuLink>
              <MenuLink href="/system/hikal-adaraa/school" icon="fa-school">المدارس</MenuLink>
            </SubMenuSection>
          </MenuSection>
        )}

        {/* === قسم اعدادات مدرسية === */}
        {hasPermission('school_settings') && (
          <MenuSection title="اعدادات مدرسية" icon="fa-sliders" color="purple">
            
            <SubMenuSection title="الهيكل الدراسى" icon="fa-graduation-cap">
              <MenuLink href="/system/hikal-dirasaa/year" icon="fa-calendar-days">العام الدراسي</MenuLink>
              <MenuLink href="/system/hikal-dirasaa/stage" icon="fa-layer-group">المراحل</MenuLink>
              <MenuLink href="/system/hikal-dirasaa/grade" icon="fa-chalkboard-user">الصفوف</MenuLink>
              <MenuLink href="/system/hikal-dirasaa/division" icon="fa-chalkboard">الشعبة</MenuLink>
              <MenuLink href="/system/hikal-dirasaa/class" icon="fa-chalkboard">الفصول</MenuLink>
              <MenuLink href="/system/hikal-dirasaa/subject" icon="fa-book">المواد</MenuLink>
                <MenuLink href="/system/bell" icon="fa-book">الجرس المدرسى</MenuLink>
               <MenuLink href="/system/monitor" icon="fa-book">الجرس المدرسى1</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="المؤهلات والوظائف" icon="fa-briefcase">
              <MenuLink href="/system/muahalat-wazayif/qualType" icon="fa-certificate">أنواع المؤهل</MenuLink>
              <MenuLink href="/system/muahalat-wazayif/qualification" icon="fa-graduation-cap">المؤهلات</MenuLink>
              <MenuLink href="/system/muahalat-wazayif/job" icon="fa-briefcase">الوظائف</MenuLink>
              <MenuLink href="/system/muahalat-wazayif/financial-grade" icon="fa-coins">الدرجات المالية</MenuLink>
              <MenuLink href="/system/muahalat-wazayif/specialization" icon="fa-user-graduate">التخصصات</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="المجموعات المدرسية (الكورسات)" icon="fa-chalkboard-user">
              <MenuLink href="/system/majmueati-kursat/add" icon="fa-plus-circle">إضافة كورس</MenuLink>
               <MenuLink href="/system/majmueati-kursat/calendar" icon="fa-calendar-alt"> تحديد مواعيد الكورسات</MenuLink>      
               <MenuLink href="/system/majmueati-kursat/register-student" icon="fa-user-plus">تسجيل طالب</MenuLink>
              <MenuLink href="/system/majmueati-kursat/attendance" icon="fa-clipboard-user">حضور</MenuLink>
              <MenuLink href="/system/majmueati-kursat/payments" icon="fa-cash-register">مدفوعات</MenuLink>
               <MenuLink href="/system/majmueati-kursat/reporets" icon="fa-chart-bar">التقارير </MenuLink>
               <MenuLink href="/system/majmueati-kursat/reporets1" icon="fa-file-lines">تقرير شامل </MenuLink>
            </SubMenuSection>

          </MenuSection>
        )}

        {/* === قسم الموظفين === */}
        {hasPermission('hr') && (
          <MenuSection title="الموظفين" icon="fa-user-tie" color="green">
            <SubMenuSection title="بيانات أساسية" icon="fa-id-card">
              <MenuLink href="/Emples/employees/add-transfer" icon="fa-file-signature">اقرار قيام بالعمل</MenuLink>
              <MenuLink href="/Emples/employees/add" icon="fa-user-plus">اضافة موظف</MenuLink>
              <MenuLink href="/Emples/employees/clearance" icon="fa-pen-to-square">اخلاء طرف</MenuLink>
              <MenuLink href="/Emples/employees/search" icon="fa-magnifying-glass">بحث عن معلمين</MenuLink>
              <MenuLink href="/Emples/employees/view" icon="fa-users">عرض المعلمين</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="الإجازات" icon="fa-calendar-check">
              <MenuLink href="/Emples/leave/leave-balance" icon="fa-database">اضافة رصيد اجازات</MenuLink>
              <MenuLink href="/Emples/leave/request" icon="fa-file-pen">تسجيل طلب اجازة</MenuLink>
              <MenuLink href="/Emples/leave/search-leave" icon="fa-magnifying-glass">بحث عن اجازة</MenuLink>
              <MenuLink href="/Emples/leave/view-leaves" icon="fa-list">عرض الاجازات</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="الأذونات" icon="fa-clock">
              <MenuLink href="/Emples/permission/request-permission" icon="fa-file-pen">تسجيل طلب اذن</MenuLink>
              <MenuLink href="/Emples/permission/search-permission" icon="fa-magnifying-glass">بحث عن اذن</MenuLink>
              <MenuLink href="/Emples/permission/view-permissions" icon="fa-list">عرض الأذونات</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="التدريبات" icon="fa-chalkboard-user">
              <MenuLink href="/Emples/training/add-training" icon="fa-plus-circle">اضافة تدريب</MenuLink>
              <MenuLink href="/Emples/training/search-training" icon="fa-magnifying-glass">بحث</MenuLink>
              <MenuLink href="/Emples/training/view-trainings" icon="fa-list">عرض</MenuLink>
              <MenuLink href="/Emples/training/print-training-path" icon="fa-print">طباعة خط سير</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="الجزاءات" icon="fa-gavel">
              <MenuLink href="/Emples/penalty/add-penalty-type" icon="fa-plus-circle">اضافة نوع جزاء</MenuLink>
              <MenuLink href="/Emples/penalty/record-penalty" icon="fa-file-pen">تسجيل جزاء</MenuLink>
              <MenuLink href="/Emples/penalty/search-penalty" icon="fa-magnifying-glass">بحث</MenuLink>
              <MenuLink href="/Emples/penalty/view-penalties" icon="fa-list">عرض</MenuLink>
            </SubMenuSection>

             <SubMenuSection title="الجدول المدرسى" icon="fa-table-cells">
                 <MenuLink href="/Emples/GADWEL/view" icon="fa-eye">عرض الجدول</MenuLink>
                 <MenuLink href="/Emples/GADWEL/adde" icon="fa-plus">إضافة حصة</MenuLink>
                  <MenuLink href="/Emples/GADWEL/takhsis" icon="fa-user-gear">تخصيص الحصص</MenuLink>
                 <MenuLink href="/Emples/GADWEL/tawzie-alhisas" icon="fa-diagram-project">توزيع الحصص</MenuLink>
                  <MenuLink href="/Emples/GADWEL/Blacklist" icon="fa-ban">القائمة السوداء</MenuLink>
                 </SubMenuSection>

            <SubMenuSection title="التقارير" icon="fa-chart-bar">
              <MenuLink href="/Emples/report/report-leaves" icon="fa-file-lines">تقرير متنوعة شاملة</MenuLink>
              <MenuLink href="/Emples/report/report-leave-balance" icon="fa-chart-line">حركة رصيد الاجازات</MenuLink>
              <MenuLink href="/Emples/report/report-trainings" icon="fa-file-lines">تقرير المستحقبن للصرف</MenuLink>
              <MenuLink href="/Emples/report/report-permissions" icon="fa-file-lines">تقرير الأذونات</MenuLink>
              <MenuLink href="/Emples/report/report-penalties" icon="fa-file-lines">طباعة طلب اجازة</MenuLink>
              <MenuLink href="/students/reports/teket?type=employees" icon="fa-user-tie">بطاقات الموظفين</MenuLink>
              <MenuLink href="/Emples/report/report-comprehensive" icon="fa-file-chart-pie">تقرير مجمع</MenuLink>
            </SubMenuSection>
          </MenuSection>
        )}

        {/* === قسم الطلاب === */}
        {hasPermission('students') && (
          <MenuSection title="الطلاب" icon="fa-user-graduate" color="cyan">
            <SubMenuSection title="بيانات أساسية" icon="fa-id-card">
              <SubMenuSection title="التقديم إلى المدرسة" icon="fa-school">
                <MenuLink href="/students/application/new" icon="fa-file-circle-plus">تسجيل طلب تقديم</MenuLink>
                <MenuLink href="/students/application/grades" icon="fa-square-poll-vertical">تسجيل درجات الاختبار</MenuLink>
                <MenuLink href="/students/application/results" icon="fa-file-lines">عرض نتيجة الاختبار</MenuLink>
                <MenuLink href="/students/application/files" icon="fa-folder-open">استلام الملفات</MenuLink>
              </SubMenuSection>

              <SubMenuSection title="تسجيل بيانات طالب" icon="fa-user-plus">
                <MenuLink href="/students/registration/add" icon="fa-user-plus">اضافة بيانات طالب جديد</MenuLink>
                <MenuLink href="/students/registration/edit" icon="fa-pen-to-square">تعديل بيانات طالب</MenuLink>
                <MenuLink href="/students/registration/editNo" icon="fa-pen-to-square">تعديل بيانات </MenuLink>
                  <MenuLink href="/students/registration/distribution1" icon="fa-arrows-to-dot">توزيع الطلاب على الشعب</MenuLink>
                <MenuLink href="/students/registration/distribution" icon="fa-arrows-to-dot">التوزيع</MenuLink>
                <MenuLink href="/students/registration/lists" icon="fa-list">عرض القوائم</MenuLink>
              </SubMenuSection>
            </SubMenuSection>

            <SubMenuSection title="الغياب والانذارات" icon="fa-calendar-xmark">
              <SubMenuSection title="التسجيل" icon="fa-pen-to-square">
                <MenuLink href="/attendance/register/by-name" icon="fa-user">تسجيل غياب بالاسم</MenuLink>
                <MenuLink href="/attendance/register/by-class" icon="fa-chalkboard">تسجيل غياب بالفصل</MenuLink>
                <MenuLink href="/attendance/register/warning" icon="fa-bell">تسجيل إنذار</MenuLink>
                <MenuLink href="/attendance/register/penalty" icon="fa-gavel">تسجيل عقوبة</MenuLink>
              </SubMenuSection>
              <SubMenuSection title="العرض والبحث" icon="fa-magnifying-glass">
                <MenuLink href="/attendance/search/absence" icon="fa-user-clock">بحث عن غياب</MenuLink>
                <MenuLink href="/attendance/search/warning" icon="fa-bell">بحث عن إنذار</MenuLink>
                <MenuLink href="/attendance/search/penalty" icon="fa-gavel">بحث عن عقوبة</MenuLink>
                <MenuLink href="/attendance/search/warnings" icon="fa-bell-on">عرض الانذارات</MenuLink>
                <MenuLink href="/attendance/search/penalties" icon="fa-gavel">عرض العقوبات</MenuLink>
                <MenuLink href="/attendance/search/absences" icon="fa-calendar-xmark">عرض الغياب</MenuLink>
              </SubMenuSection>
            </SubMenuSection>

            <SubMenuSection title="الاذونات والمصروفات" icon="fa-wallet">
              <SubMenuSection title="الذونات" icon="fa-file-invoice-dollar">
                <MenuLink href="/fees/allowances/add" icon="fa-plus-circle">تسجيل اذونات</MenuLink>
                <MenuLink href="/fees/allowances/search" icon="fa-magnifying-glass">بحث اذونات</MenuLink>
                <MenuLink href="/fees/allowances/view" icon="fa-list">عرض الاذونات</MenuLink>
              </SubMenuSection>
              <SubMenuSection title="المصروفات" icon="fa-coins">
                <MenuLink href="/fees/expenses/add" icon="fa-plus-circle">تحديد المصروفات و الاقساط</MenuLink>
                <MenuLink href="/fees/expenses/TsgelMsrof1" icon="fa-plus-circle">تسجيل مصروفات حكومية</MenuLink>
                <MenuLink href="/fees/expenses/TsgelMsrof2" icon="fa-plus-circle">تسجيل مصروفات خاصة</MenuLink>
                <MenuLink href="/fees/expenses/search" icon="fa-magnifying-glass">بحث مصروفات</MenuLink>
                <MenuLink href="/fees/expenses/view" icon="fa-list">عرض المصروفات</MenuLink>
              </SubMenuSection>
            </SubMenuSection>
            
            <SubMenuSection title="التقارير" icon="fa-file-lines">
              <MenuLink href="/students/reports/attendance" icon="fa-clipboard-list">تقرير الحضور</MenuLink>
              <MenuLink href="/students/reports/discipline" icon="fa-gavel">تقرير الانذارات</MenuLink>
              <MenuLink href="/fees/expenses/view" icon="fa-wallet">تقرير المصروفات</MenuLink>
              <MenuLink href="/students/reports/ahsaeiat" icon="fa-file-chart-pie">الاحصائيات</MenuLink>
               <MenuLink href="/students/reports/teket?type=students" icon="fa-user-graduate"> بطاقات الطلاب</MenuLink>
            </SubMenuSection>
          </MenuSection>
        )}

        {/* === قسم الكنترول === */}
        {hasPermission('exam') && (
          <MenuSection title="الكنترول" icon="fa-file-pen" color="orange">
            <SubMenuSection title="تجهيز و إعدادات" icon="fa-gear">
              <SubMenuSection title="التجهيز" icon="fa-screwdriver-wrench">
                <MenuLink href="/control/teghez/term" icon="fa-calendar-plus">إضافة تيرم</MenuLink>
                <MenuLink href="/control/teghez/month" icon="fa-calendar-days">إضافة شهر</MenuLink>
                <MenuLink href="/control/teghez/seat-numbers" icon="fa-hashtag">وضع أرقام الجلوس والسرى</MenuLink>
                <MenuLink href="/control/teghez/committees" icon="fa-users">إضافة اللجان</MenuLink>
                <MenuLink href="/control/teghez/students-committees" icon="fa-user-group">توزيع الطلاب على اللجان</MenuLink>
                <MenuLink href="/control/teghez/subjects" icon="fa-book">تجهيز المواد للرصد</MenuLink>
              </SubMenuSection>

              <SubMenuSection title="جدول الاختبارات و توزيع العمل" icon="fa-table">
                <MenuLink href="/control/G-T/exam-schedule" icon="fa-calendar">جدول الامتحانات</MenuLink>
                <MenuLink href="/control/G-T/work-distribution" icon="fa-diagram-project">توزيع العمل باللجان</MenuLink>
                <MenuLink href="/control/G-T/observer-committees" icon="fa-eye">توزيع لجان الملاحظة</MenuLink>
                <MenuLink href="/control/G-T/distribution-view" icon="fa-list">عرض التوزيع</MenuLink>
              </SubMenuSection>

              <SubMenuSection title="العرض و الطباعة" icon="fa-print">
                <MenuLink href="/control/Print/seat-ticket" icon="fa-id-card">طباعة تيكت رقم الجلوس</MenuLink>
                <MenuLink href="/control/Print/observer-print" icon="fa-print">طباعة لجان الملاحظة</MenuLink>
                <MenuLink href="/control/Print/call-list" icon="fa-file-lines">طباعة كشوف المناداة</MenuLink>
              </SubMenuSection>
            </SubMenuSection>

            <SubMenuSection title="رصد الدرجات" icon="fa-pen-to-square">
              <SubMenuSection title="الدرجات الشهرية و أعمال السنة" icon="fa-clipboard-list">
                <MenuLink href="/control/grades/evaluations" icon="fa-check">تسجيل التقييمات</MenuLink>
                <MenuLink href="/control/grades/exams" icon="fa-file-pen">تسجيل الاختبارات</MenuLink>
                <MenuLink href="/control/grades/sheets" icon="fa-table">الشيتات</MenuLink>
                <MenuLink href="/control/grades/Next-exams" icon="fa-table-cells">تسجيل الدور الثانى</MenuLink>
                <MenuLink href="/control/grades/review" icon="fa-magnifying-glass"> الشيت الكامل</MenuLink>
              </SubMenuSection>
              <SubMenuSection title="العرض و الشهادات" icon="fa-chart-column">
                <MenuLink href="/control/results/statistics" icon="fa-chart-pie">الإحصائيات و النتائج</MenuLink>
                <MenuLink href="/control/results/certificates" icon="fa-award">الشهادات</MenuLink>
              </SubMenuSection>
            </SubMenuSection>

            <SubMenuSection title="الترحيل" icon="fa-right-left">
              <MenuLink href="/control/grades/approve" icon="fa-circle-check">اعتماد الدرجات</MenuLink>
              <MenuLink href="/control/students/promote" icon="fa-arrow-up">ترحيل الطلاب</MenuLink>
              <MenuLink href="/control/students/promoted-report" icon="fa-file-lines">تقرير المرحلين</MenuLink>
            </SubMenuSection>
          </MenuSection>
        )}

        {/* === قسم المخازن === */}
        {hasPermission('store') && (
          <MenuSection title="المخازن" icon="fa-boxes-stacked" color="gray">
            <SubMenuSection title="المخازن والأصناف" icon="fa-warehouse">
              <MenuLink href="/stores/Magzn/Add" icon="fa-plus-circle">إضافة مخزن</MenuLink>
              <MenuLink href="/stores/Magzn/inventory-items" icon="fa-tags">تكويد الأصناف</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="الأذونات" icon="fa-file-invoice">
              <MenuLink href="/stores/Ezen/store-in" icon="fa-arrow-down-wide-short">تسجيل إذن إضافة</MenuLink>
              <MenuLink href="/stores/Ezen/store-out" icon="fa-arrow-up-wide-short">تسجيل إذن صرف</MenuLink>
              <MenuLink href="/stores/Ezen/store-edit" icon="fa-pen-to-square">تعديل إذن</MenuLink>
              <MenuLink href="/stores/Ezen/store-distribution" icon="fa-list-check">كشف توزيع</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="التقارير" icon="fa-chart-pie">
              <MenuLink href="/stores/report/report-balance" icon="fa-scale-balanced">رصيد الأصناف</MenuLink>
              <MenuLink href="/stores/report/report-item-movement" icon="fa-arrow-right-arrow-left">حركة صنف</MenuLink>
              <MenuLink href="/stores/report/report-store-movement" icon="fa-arrows-spin">حركة المخازن</MenuLink>
              <MenuLink href="/stores/report/report-inventory" icon="fa-clipboard-list">جرد المخازن</MenuLink>
              <MenuLink href="/stores/report/report-inventory-form" icon="fa-file-lines">نموذج جرد</MenuLink>
            </SubMenuSection>
          </MenuSection>
        )}

        {/* === قسم بوابة المعلم === */}
        {hasPermission('teacher_portal') && (
          <MenuSection title="بوابة المعلم" icon="fa-chalkboard-user" color="teal">
            <SubMenuSection title="الكورسات" icon="fa-graduation-cap">
             <MenuLink href="/teacher/course/majmueati-kursat" icon="fa-plus-circle">إضافة كورس</MenuLink>
              <MenuLink href="/teacher/course/register-single" icon="fa-user-plus">تسجيل طالب بالكورس</MenuLink>
              <MenuLink href="/teacher/course/attendance" icon="fa-clipboard-user">تسجيل (حضور وغياب)</MenuLink>
              <MenuLink href="/teacher/course/payments" icon="fa-cash-register">تسجيل مدفوعات</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="الواجبات والاختبارات والشروحات" icon="fa-book-open">
              <MenuLink href="/teacher/homeworkes/homework-add" icon="fa-pen-to-square">إضافة واجب</MenuLink>
              <MenuLink href="/teacher/homeworkes/quiz-add" icon="fa-file-circle-question">إضافة اختبار</MenuLink>
              <MenuLink href="/teacher/homeworkes/lesson-add" icon="fa-person-chalkboard">إضافة شرح</MenuLink>
              <MenuLink href="/teacher/homeworkes/grades-view" icon="fa-chart-simple">الدرجات (واجب - اختبار)</MenuLink>
            </SubMenuSection>
             <SubMenuSection title="تقارير الكورسات و المجموعات" icon="fa-chart-bar">
              <MenuLink href="/teacher/report/attendance" icon="fa-user-check">تقرير الحضور</MenuLink>
              <MenuLink href="/teacher/report/absence" icon="fa-user-xmark">تقرير عام</MenuLink>
              <MenuLink href="/teacher/report/payments" icon="fa-money-bill-wave">كورساتى</MenuLink>
            </SubMenuSection>

             <SubMenuSection title="'تقديم طلبات'" icon="fa-chart-bar">
              <MenuLink href="/teacher/leave/request" icon="fa-file-pen">تسجيل طلب اجازة</MenuLink>
              <MenuLink href="/teacher/leave/request-permission" icon="fa-file-pen">تسجيل طلب اذن</MenuLink>
            </SubMenuSection>
              <SubMenuSection title="'تسجيل غياب طالب'" icon="fa-chart-bar">
              <MenuLink href="/attendance/register/by-name" icon="fa-user">تسجيل غياب بالاسم</MenuLink>
                <MenuLink href="/attendance/register/by-class" icon="fa-chalkboard">تسجيل غياب بالفصل</MenuLink>
            </SubMenuSection>
            
          </MenuSection>
        )}

        {/* === قسم بوابة الطالب === */}
        {hasPermission('student_portal') && (
          <MenuSection title="بوابة الطالب" icon="fa-user-graduate" color="rose">
            <SubMenuSection title="الشروحات" icon="fa-person-chalkboard">
             {/* فيديوهات */}
  <MenuLink href="/BABSTUDWNS/lessons-video?tab=video" icon="fa-video">
    مشاهدة فيديو
  </MenuLink>
  
  {/* صوتيات */}
  <MenuLink href="/BABSTUDWNS/lessons-video?tab=audio" icon="fa-headphones">
    استماع إلى صوت
  </MenuLink>
  
  {/* ملفات PDF */}
  <MenuLink href="/BABSTUDWNS/lessons-video?tab=pdf" icon="fa-file-pdf">
    ملفات PDF
  </MenuLink>
  
  {/* صور (اختياري) */}
  <MenuLink href="/BABSTUDWNS/lessons-video?tab=image" icon="fa-image">
    صور توضيحية
  </MenuLink>

            </SubMenuSection>

            <SubMenuSection title="الواجبات والاختبارات" icon="fa-pen-ruler">
              <MenuLink href="/BABSTUDWNS/homework-solve" icon="fa-pen">حل واجب</MenuLink>
              <MenuLink href="/BABSTUDWNS/quiz-solve" icon="fa-clipboard-question">حل اختبار</MenuLink>
              <MenuLink href="/BABSTUDWNS/grades" icon="fa-chart-simple">الدرجات (واجب - اختبار)</MenuLink>
            </SubMenuSection>

            <SubMenuSection title="الحضور والمدفوعات" icon="fa-wallet">
              <MenuLink href="/BABSTUDWNS/attendance" icon="fa-money-bill-transfer">حركة مدفوعات ومتأخرات</MenuLink>
              <MenuLink href="/BABSTUDWNS/payments" icon="fa-calendar-days">حركة حضور وغياب</MenuLink>
              <MenuLink href="/BABSTUDWNS/courses" icon="fa-book-open">عرض الكورسات</MenuLink>
            </SubMenuSection>
          </MenuSection>
        )}
      </div>
    </aside>
  );
}

// Menu Helper Components
function MenuSection({ title, icon, defaultOpen, color, children }: { title: string; icon: string; defaultOpen?: boolean; color: string; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen || false);
  
  // استخدام الـ class الجديد للالوان
  const colorClass = `section-color-${color}`;
  
  return (
    <div className={`menu-section ${colorClass}`}>
      <div className="menu-section-title" onClick={() => setOpen(!open)}>
        <i className={`fa-solid ${icon}`}></i>
        <span>{title}</span>
        <i className={`fa-solid fa-chevron-down arrow ${open ? 'rotate' : ''}`}></i>
      </div>
      <div className={`menu-section-content ${open ? 'open' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function SubMenuSection({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="submenu-section">
      <div className="submenu-title" onClick={() => setOpen(!open)}>
        <i className={`fa-solid ${icon}`}></i>
        <span>{title}</span>
        <i className={`fa-solid fa-chevron-down submenu-arrow ${open ? 'rotate' : ''}`}></i>
      </div>
      <div className={`submenu-content ${open ? 'open' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: string; children: ReactNode }) {
  return (
    <a href={href}>
      <i className={`fa-solid ${icon}`}></i>
      <span>{children}</span>
    </a>
  );
}