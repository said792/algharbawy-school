'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '@/lib/config';

// === Interfaces ===
interface Period {
    PeriodID: number;
    PeriodName: string;
    StartTime: string; // Format: 'HH:mm:ss' from DB
    EndTime: string;
}

export default function SchoolBellPage() {
    const [periods, setPeriods] = useState<Period[]>([]);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [isSystemActive, setIsSystemActive] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
    const [nextPeriod, setNextPeriod] = useState<Period | null>(null);
    
    // مرجع لتجنب تكرار الجرس في الدقيقة الواحدة
    const lastTriggeredRef = useRef<{ time: string; type: 'start' | 'end' } | null>(null);

       // === 1. جلب بيانات الحصص ===
    useEffect(() => {
        const fetchPeriods = async () => {
            try {
                console.log("جاري الاتصال بـ:", `${API_URL}/api/periods`);
                const res = await fetch(`${API_URL}/api/periods`);
                
                // تحقق من الحالة
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`خطأ في السيرفر: ${res.status} - ${errorText}`);
                }

                const data = await res.json();
                console.log("بيانات الحصص:", data);
                
                if (data.success) {
                    setPeriods(data.data);
                } else {
                    alert("فشل جلب البيانات من قاعدة البيانات");
                }
            } catch (err: any) {
                console.error("Failed to load periods", err);
                alert(`فشل الاتصال!\nالتفاصيل: ${err.message}\n\nتأكد من إضافة كود API في السيرفر.`);
            }
        };
        fetchPeriods();
    }, []);

    // === 2. دالة تحويل النص إلى كلام (Text-to-Speech) ===
    const speak = (text: string) => {
        if (!('speechSynthesis' in window)) {
            console.warn("المتصفح لا يدعم القراءة الصوتية");
            return;
        }

        // إلغاء أي قراءة سابقة لتجنب التداخل
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG'; // اللغة العربية
        utterance.rate = 0.9;   // سرعة النطق
        utterance.pitch = 1;    // نبرة الصوت
        utterance.volume = 1;   // مستوى الصوت

        window.speechSynthesis.speak(utterance);
    };

    // === 3. منطق المقارنة والتنبيه (The Bell Logic) ===
    const checkSchedule = () => {
        if (!isSystemActive || periods.length === 0) return;

        const now = new Date();
        // تنسيق الوقت الحالي إلى HH:mm للمقارنة (مثال: 08:00)
        const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

        let foundCurrent = false;

        periods.forEach((period) => {
            // تنظيف الوقت من قاعدة البيانات ليكون HH:mm
            const startTimeClean = period.StartTime.substring(0, 5); 
            const endTimeClean = period.EndTime.substring(0, 5);

            // التحقق من بداية الحصة
            if (currentTimeStr === startTimeClean) {
                // نتأكد أننا لم نطلق التنبيه لهذا الوقت من قبل
                if (lastTriggeredRef.current?.time !== startTimeClean || lastTriggeredRef.current?.type !== 'start') {
                    console.log(`Ring: Start of ${period.PeriodName}`);
                    speak(`بدأت الحصة ${period.PeriodName}`);
                    setCurrentPeriod(period);
                    lastTriggeredRef.current = { time: startTimeClean, type: 'start' };
                }
            }

            // التحقق من نهاية الحصة
            if (currentTimeStr === endTimeClean) {
                if (lastTriggeredRef.current?.time !== endTimeClean || lastTriggeredRef.current?.type !== 'end') {
                    console.log(`Ring: End of ${period.PeriodName}`);
                    // رسالة النهاية
                    speak(`انتهت الحصة ${period.PeriodName}`);
                    
                    // البحث عن الحصة التالية للإعلان عنها (طابور أو حصة جديدة)
                    const currentIndex = periods.findIndex(p => p.PeriodID === period.PeriodID);
                    if (currentIndex < periods.length - 1) {
                        const nextP = periods[currentIndex + 1];
                        setTimeout(() => {
                            speak(`يبدأ الان الطابور، ${nextP.PeriodName}`);
                        }, 3000); // انتظار 3 ثواني بين الرسائل
                    }

                    lastTriggeredRef.current = { time: endTimeClean, type: 'end' };
                    foundCurrent = false; // الحصة انتهت
                }
            }

            // تحديد الحصة الحالية الجارية (للعرض فقط)
            if (currentTimeStr > startTimeClean && currentTimeStr < endTimeClean) {
                setCurrentPeriod(period);
                foundCurrent = true;
            }
        });

        if (!foundCurrent) {
            // إذا لم نكن في حصة، ابحث عن القادمة
            const next = periods.find(p => p.StartTime.substring(0, 5) > currentTimeStr);
            setNextPeriod(next || null);
        }
    };

    // === 4. المؤقت الدائم (Every Second) ===
    useEffect(() => {
        // تحديث الساعة الرقمية
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // فحص الجدول والتنبيه
        const checkInterval = setInterval(() => {
            checkSchedule();
        }, 1000);

        return () => {
            clearInterval(clockInterval);
            clearInterval(checkInterval);
        };
    }, [isSystemActive, periods]); // إعادة التشغيل عند تفعيل النظام أو تغيير الجدول

    // تنسيق الوقت للعرض
    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'م' : 'ص';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm}`;
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-4xl space-y-8">
                
                {/* العنوان والتحكم */}
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-amber-400 to-orange-600">
                        🏫 الجرس المدرسي الذكي
                    </h1>
                    <p className="text-slate-400">نظام آلي لإدارة الحصص والتنبيه الصوتي التلقائي</p>

                    {/* الساعة الرئيسية */}
                    <div className="inline-block bg-slate-800 rounded-3xl px-12 py-6 shadow-2xl border border-slate-700">
                        <div className="text-7xl font-mono font-bold tracking-widest text-amber-400">
                            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>
                        <div className="text-center text-slate-500 mt-2 text-sm uppercase tracking-widest">
                            الوقت الحالي
                        </div>
                    </div>

                    {/* أزرار التحكم */}
                    <div className="flex flex-col items-center gap-4">
                        <button 
                            onClick={() => setIsSystemActive(!isSystemActive)}
                            className={`px-10 py-4 rounded-2xl font-bold text-xl transition-all shadow-lg flex items-center gap-3 transform hover:scale-105 ${
                                isSystemActive 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                        >
                            <i className={`fa-solid ${isSystemActive ? 'fa-stop' : 'fa-play'}`}></i>
                            {isSystemActive ? (
                                <span>النظام يعمل (انقر للإيقاف)</span>
                            ) : (
                                <span>تشغيل النظام (مرة واحدة فقط)</span>
                            )}
                        </button>
                        
                        {/* مؤشر الحالة الجديد */}
                        {isSystemActive && (
                            <div className="flex items-center gap-3 text-green-400 text-sm font-bold bg-green-900/30 px-6 py-2 rounded-full border border-green-500/50 animate-pulse mt-2">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                النظام يراقب الوقت حالياً...
                            </div>
                        )}

                        {/* زر تجريبي للصوت */}
                        <button 
                            onClick={() => speak("اختبار الصوت، بدأت الحصة الأولى")}
                            className="text-sm px-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        >
                            <i className="fa-solid fa-volume-high ml-2"></i> تجربة الصوت
                        </button>
                    </div>
                </div>

                {/* بطاقة الحالة */}
                {currentPeriod ? (
                    <div className="bg-linear-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-center shadow-2xl border border-emerald-400 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="relative z-10">
                            <div className="text-emerald-100 text-xl font-bold mb-2 animate-pulse">🔴 الحصة الحالية جارية الآن</div>
                            <h2 className="text-4xl font-black mb-2">{currentPeriod.PeriodName}</h2>
                            <div className="text-2xl font-mono opacity-90">
                                {formatTime(currentPeriod.StartTime)} - {formatTime(currentPeriod.EndTime)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-3xl p-8 text-center border border-slate-700">
                        <div className="text-slate-400 text-xl font-bold mb-2">⏳ استراحة / الطابور</div>
                        {nextPeriod ? (
                            <div className="text-slate-300 text-lg">
                                الحصة القادمة: <span className="text-amber-400 font-bold">{nextPeriod.PeriodName}</span>
                            </div>
                        ) : (
                            <div className="text-slate-500">انتهى اليوم الدراسي</div>
                        )}
                    </div>
                )}

                {/* جدول الحصص */}
                <div className="bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-700">
                    <h3 className="text-2xl font-bold mb-6 text-slate-200 border-b border-slate-700 pb-4">📅 جدول اليوم</h3>
                    <div className="grid gap-3">
                        {periods.map((period) => (
                            <div 
                                key={period.PeriodID}
                                className={`flex justify-between items-center p-4 rounded-2xl transition-all ${
                                    currentPeriod?.PeriodID === period.PeriodID
                                        ? 'bg-amber-500 text-black font-bold scale-[1.02] shadow-lg shadow-amber-500/20'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                            >
                                <span className="text-lg">{period.PeriodName}</span>
                                <span className="font-mono bg-black/20 px-3 py-1 rounded-lg">
                                    {formatTime(period.StartTime)} - {formatTime(period.EndTime)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}