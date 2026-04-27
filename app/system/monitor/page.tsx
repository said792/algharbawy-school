'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

export default function MonitorPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [bellSettings, setBellSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playedNotifications, setPlayedNotifications] = useState<Set<string>>(new Set());
  const schoolId = localStorage.getItem('schoolId');

  // 1. دالة تشغيل الصوت
  const playSound = (periodId: number, type: 'start' | 'end') => {
    // البحث عن صوت مخصص لهذه الحصة
    const setting = bellSettings.find((b) => b.PeriodID === periodId);
    
    // إذا وجدنا صوتاً مخصصاً
    if (setting && setting.SoundURL) {
      const audio = new Audio(`${API_URL}${setting.SoundURL}`);
      audio.play().catch(e => console.log("فشل تشغيل الصوت:", e));
    } 
    // الجرس الافتراضي
    else {
      const msg = type === 'start' ? 'بداية الحصة' : 'نهاية الحصة';
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(msg);
        u.lang = 'ar-EG';
        window.speechSynthesis.speak(u);
      } else {
        // ملف افتراضي
        new Audio('/bell.mp3').play().catch(() => {});
      }
    }
  };

  // 2. جلب البيانات (الحصص + الإعدادات)
  const fetchData = async () => {
    setLoading(true);
    try {
      // جلب الحصص
      const pRes = await fetch(`${API_URL}/api/getData/78`); // INPOT 78 للحصص
      const pData = await pRes.json();

      // جلب الأصوات
      const bRes = await fetch(`${API_URL}/api/bell/sounds?schoolId=${schoolId}`);
      const bData = await bRes.json();

      if (pData.success) {
        const mapped = pData.data.map((item: any) => ({
          PeriodID: item['الرقم'],
          PeriodName: item['الحصة'],
          StartTime: item['بداية الحصة'],
          EndTime: item['نهاية الحصة']
        }));
        setPeriods(mapped);
      }

      if (bData.success) {
        setBellSettings(bData.data);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 3. المؤقت (Timer) - يعمل كل ثانية
  useEffect(() => {
    if (!periods.length) return;

    const interval = setInterval(() => {
      const now = new Date();
      // الحصول على الوقت بصيغة HH:mm:ss
      const currentTime = now.toLocaleTimeString('en-GB', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });

      periods.forEach(p => {
        // عند البداية
        if (currentTime === p.StartTime) {
          const key = `start-${p.PeriodID}`;
          if (!playedNotifications.has(key)) {
            playSound(p.PeriodID, 'start');
            setPlayedNotifications(prev => new Set(prev).add(key));
          }
        }

        // عند النهاية
        if (currentTime === p.EndTime) {
          const key = `end-${p.PeriodID}`;
          if (!playedNotifications.has(key)) {
            playSound(p.PeriodID, 'end');
            setPlayedNotifications(prev => new Set(prev).add(key));
          }
        }
      });

    }, 1000); // كل ثانية

    return () => clearInterval(interval);
  }, [periods, bellSettings, playedNotifications]);

  // Styles
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
  const headerStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: 16, padding: 20, marginBottom: 24, textAlign: 'center', color: 'white' };

  return (
    <div style={{ padding: 20, direction: 'rtl' }}>
      <div style={headerStyle}>
        <h1>🔔 نظام المراقبة والجرس</h1>
        <p>جاري مراقبة الوقت وتشغيل الجرس تلقائياً...</p>
      </div>

      {loading ? <p>جاري التحميل...</p> : (
        <div>
           {/* الساعة الحالية */}
           <div style={{...cardStyle, fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#333' }}>
             🕐 <span id="clock">--:--:--</span>
           </div>

          {periods.map(p => {
            const hasSound = bellSettings.find(b => b.PeriodID === p.PeriodID);
            return (
              <div key={p.PeriodID} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{p.PeriodName}</strong>
                  <span style={{ color: '#666' }}>
                    {p.StartTime?.substring(0,5)} ➜ {p.EndTime?.substring(0,5)}
                  </span>
                  {hasSound && <span style={{ color: 'orange', fontSize: '12px' }}>🔊 صوت مخصص</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}