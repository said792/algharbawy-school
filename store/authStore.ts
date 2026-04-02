import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =======================================
// أنواع البيانات
// =======================================
export type UserData = {
  modriaId?: number;
  edaraId?: number;
  schoolId?: number;
  schoolName?: string;
  userId?: number; 
  personId?: number;
  personName?: string;
  role?: string;
  username?: string;

  // القيم القادمة من السيرفر (IDs)
  currentMrahelID?: number;
  currentYerID?: number;
  lastSchoolID?: number;
  
  // ✅✅✅ أضفنا الأسماء القادمة من السيرفر
  currentMrahelName?: string; // مثلاً: اسم المرحلة
  currentYerName?: string;    // مثلاً: اسم العام الدراسي
};

export type WorkData = {
  stageId?: number;
  stageName?: string;
  yearId?: number;
  yearName?: string;
};

export type AuthStore = {
  user: UserData | null;
  work: WorkData;
  isLoggedIn: boolean;
  hasWorkData: boolean;

  login: (userData: UserData) => void;
  logout: () => void;
  updateUser: (data: Partial<UserData>) => void;

  setWorkData: (data: WorkData) => void;
  clearWorkData: () => void;
};

// =======================================
// الـ Store
// =======================================
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      work: {},
      isLoggedIn: false,
      hasWorkData: false,

      // تسجيل الدخول
      login: (userData) => set({
        user: userData,
        isLoggedIn: true,
        
        // ✅✅✅ تعبئة الـ work تلقائياً من بيانات الدخول
        work: {
          stageId: userData.currentMrahelID,
          stageName: userData.currentMrahelName, // ربط الاسم
          yearId: userData.currentYerID,
          yearName: userData.currentYerName      // ربط الاسم
        },
        
        // التحقق من وجود البيانات
        hasWorkData: !!(userData.currentMrahelID && userData.currentYerID),
      }),

      // تسجيل الخروج
      logout: () => {
        set({
          user: null,
          isLoggedIn: false,
          hasWorkData: false,
          work: {}
        });
        window.location.href = '/login';
      },

      // تحديث بيانات المستخدم
      updateUser: (data) => set((state) => ({
        user: state.user ? { ...state.user, ...data } : null
      })),

      // حفظ بيانات المرحلة والعام (يستدعى عند التغيير من الداشبورد)
      setWorkData: (data) => set({
        work: data,
        hasWorkData: true
      }),

      // مسح بيانات المرحلة والعام
      clearWorkData: () => set({
        work: {},
        hasWorkData: false
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);