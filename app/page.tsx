'use client';

import DashboardLayout from './components/DashboardLayout';
import { useAuthStore } from '@/store/authStore';

// استيراد اللوحات الجديدة
import HrDashboard from './components/dashboards/HrDashboard';
import StudentAffairsDashboard from './components/dashboards/StudentAffairsDashboard';
import ExamDashboard from './components/dashboards/ExamDashboard';
import StoreDashboard from './components/dashboards/StoreDashboard';
import TeacherDashboard from './components/dashboards/TeacherDashboard';
import StudentDashboard from './components/dashboards/StudentDashboard'; // نفترض أننا أنشأناها أو نستخدم القديمة
import SchoolManagerDashboard from './components/dashboards/SchoolManagerDashboard';
import GeneralManagerDashboard from './components/dashboards/GeneralManagerDashboard';

export default function Dashboard() {
  const { user } = useAuthStore();

  // دالة توجيه ذكية بناءً على الدور
  const renderDashboard = () => {
    if (!user) return null;

    // 1. شئون العاملين
    if (user.role === 'مسئول شئون عاملين' || user.role === 'مسؤول شئون عاملين') {
      return <HrDashboard />;
    }
    
    // 2. شئون الطلاب
    if (user.role === 'مسئول شئون طلاب' || user.role === 'مسؤول شئون طلاب') {
      return <StudentAffairsDashboard />;
    }

    // 3. الكنترول
    if (user.role === 'مسئول الكنترول' || user.role === 'مسؤول الكنترول') {
      return <ExamDashboard />;
    }

    // 4. المخازن
    if (user.role === 'مسئول المخازن' || user.role === 'مسؤول المخازن') {
      return <StoreDashboard />;
    }

    // 5. المعلم
    if (user.role === 'المعلم') {
      return <TeacherDashboard />;
    }

    // 6. الطالب
    if (user.role === 'الطالب') {
      return <StudentDashboard />; // قم بإنشاء هذا الملف أو استخدم كود الطالب القديم
    }
 // 7. المدرسة
    if (user.role === 'مدير المدرسة' || user.role === 'مدير المدرسة') {
      return <SchoolManagerDashboard />; // قم بإنشاء هذا الملف أو استخدم كود الطالب القديم
    }
// 7. المدرسة
    if (user.role === 'المدير العام' || user.role === 'المدير العام') {
      return <GeneralManagerDashboard />; // قم بإنشاء هذا الملف أو استخدم كود الطالب القديم
    }  
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
}