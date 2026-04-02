import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
});

// 1. إعدادات العرض واللون (Viewport & Theme Color)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // لمنع التكبير في التطبيق (اختياري)
  themeColor: '#0f766e', // لون الشريط العلوي في الموبايل
};

// 2. إعدادات الميتا داتا والأيقونات والـ Manifest
export const metadata: Metadata = {
  title: "الغرباوى للادارة المدرسية",
  description: "نظام متكامل لإدارة المدارس والبيانات المدرسية",
  
  // ربط ملف الـ Manifest
  manifest: "/manifest.json",

  // إعدادات خاصة بـ Apple (للأيفون)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "الغرباوى", // الاسم اللي يظهر تحت الأيقونة في الـ App Switcher
  },

  // تعريف الأيقونات بشكل صحيح
  icons: {
    // أيقونات عامة (للأندرويد والويب)
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    // أيقونات آبل (الأيفون)
    apple: [
      { url: '/icon-192x192.png' }, // تأكد أن الصورة موجودة في public
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* هنا بنضيف الفونتس يدوياً لإننا محتاجينها */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={tajawal.className}>
        {children}
      </body>
    </html>
  );
}