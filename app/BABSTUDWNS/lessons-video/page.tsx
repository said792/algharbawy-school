'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';
import { useSearchParams } from 'next/navigation';

// === 1. المكون الداخلي (يحتوي على المنطق) ===
function StudentExplanationsContent() {
    const { user } = useAuthStore();
    const schoolId = user?.schoolId;
    const studentId = user?.personId;
    
    // قراءة الباراميتر من الرابط
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get('tab');

    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [explanations, setExplanations] = useState<any[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingContent, setLoadingContent] = useState(false);
    
    const [activeItem, setActiveItem] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState('video'); // القيمة الافتراضية

    // === المنطق الجديد: تحديد الوضع (مقفول أم حر) ===
    // لو فيه tab في الرابط، يبقى الوضع مقفول (مخفي التبويبات)
    const isLockedMode = tabFromUrl && ['video', 'audio', 'pdf', 'image'].includes(tabFromUrl);

    // تحديث التبويب عند تغيير الرابط
    useEffect(() => {
        if (isLockedMode) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl, isLockedMode]);

    // 1. جلب الكورسات
    useEffect(() => {
        const fetchMyCourses = async () => {
            if (!schoolId || !studentId) return;
            setLoadingCourses(true);
            try {
                const res = await fetch(`${API_URL}/api/getData1/48?id=${schoolId}`);
                const data = await res.json();
                if (data.success && data.data) {
                    const myEnrollments = data.data.filter((e: any) => 
                        String(e.StudentID || e['كود الطالب']) === String(studentId)
                    );
                    const uniqueCourses = Array.from(new Map(myEnrollments.map((e: any) => 
                        [e.CourseID || e['كود الكورس'], { 
                            id: e.CourseID || e['كود الكورس'], 
                            name: e.CourseName || e['الكورس'] 
                        }]
                    )).values());
                    setMyCourses(uniqueCourses as any[]);
                    if (uniqueCourses.length > 0) setSelectedCourse(String((uniqueCourses[0] as any).id));
                }
            } catch (err) { console.error("Error", err); } 
            finally { setLoadingCourses(false); }
        };
        fetchMyCourses();
    }, [schoolId, studentId]);

    // 2. جلب الشروحات
    useEffect(() => {
        const fetchContent = async () => {
            if (!selectedCourse) return;
            setLoadingContent(true);
            try {
                const res = await fetch(`${API_URL}/api/explanations?courseId=${selectedCourse}&schoolId=${schoolId}`);
                const data = await res.json();
                if (data.success) setExplanations(data.data || []);
                else setExplanations([]);
            } catch (err) { console.error("Error", err); } 
            finally { setLoadingContent(false); }
        };
        fetchContent();
    }, [selectedCourse, schoolId]);

    const tabConfig = [
        { id: 'video', label: 'فيديوهات', icon: 'fa-video' },
        { id: 'audio', label: 'صوتيات', icon: 'fa-headphones' },
        { id: 'pdf', label: 'ملفات PDF', icon: 'fa-file-pdf' },
        { id: 'image', label: 'صور', icon: 'fa-image' }
    ];

    const availableTypes = useMemo(() => {
        return new Set(explanations.map(item => item.MediaType));
    }, [explanations]);

    // === تعديل: التبويبات تظهر فقط إذا لم يكن الوضع مقفولاً ===
    const visibleTabs = useMemo(() => {
        if (isLockedMode) return []; // لا تعرض تبويبات لو الوضع مقفول
        return tabConfig.filter(tab => availableTypes.has(tab.id));
    }, [availableTypes, isLockedMode]);

    useEffect(() => {
        // لا نغير التبويب تلقائياً لو الوضع مقفول
        if (isLockedMode) return; 
        if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
            setActiveTab(visibleTabs[0].id);
        }
    }, [visibleTabs, activeTab, isLockedMode]);

    const filteredItems = useMemo(() => {
        return explanations.filter(item => item.MediaType === activeTab);
    }, [explanations, activeTab]);

    const protectMedia = (e: React.MouseEvent | React.DragEvent) => {
        e.preventDefault();
        return false;
    };

    return (
        <div style={{ padding: '20px', background: '#f1f5f9', minHeight: '100vh' }} onContextMenu={(e) => e.preventDefault()}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', padding: '25px', borderRadius: '20px', marginBottom: '30px', color: 'white', boxShadow: '0 10px 30px rgba(15, 118, 110, 0.3)', textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>🎓 منصة الشروحات التعليمية</h1>
                    <p style={{ margin: '5px 0 0', opacity: 0.9 }}>
                        {isLockedMode ? `عرض ${tabConfig.find(t => t.id === activeTab)?.label || ''}` : 'متابعة الدروس والفيديوهات الخاصة بك'}
                    </p>
                </div>

                {/* Course Selector */}
                <div style={{ marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontWeight: '600' }}>
                        <i className="fa-solid fa-book-open" style={{fontSize: '20px', color: '#10b981'}}></i>
                        <span>المادة:</span>
                    </div>
                    <select 
                        value={selectedCourse} 
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        disabled={loadingCourses}
                        style={{ flex: 1, minWidth: '200px', padding: '12px 15px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '16px', fontWeight: '500', cursor: 'pointer', outline: 'none' }}
                    >
                        {loadingCourses ? (
                            <option key="loading" value="">جاري التحميل...</option>
                        ) : myCourses.length === 0 ? (
                            <option key="empty" value="">لا توجد كورسات مسجلة</option>
                        ) : (
                            myCourses.map((c: any, i: number) => (
                                <option key={c.id || `course-${i}`} value={c.id}>{c.name}</option>
                            ))
                        )}
                    </select>
                </div>

                {/* === التبويبات (تظهر فقط في الوضع الحر) === */}
                {visibleTabs.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0', background: 'white', borderRadius: '12px 12px 0 0', padding: '10px 10px 0' }}>
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '12px 25px', border: 'none', background: 'transparent',
                                    borderBottom: activeTab === tab.id ? '3px solid #10b981' : '3px solid transparent',
                                    color: activeTab === tab.id ? '#10b981' : '#64748b', fontWeight: '600', fontSize: '15px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                                }}
                            >
                                <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content Area */}
                {loadingContent ? (
                    <div style={{ textAlign: 'center', padding: '80px' }}>
                        <i className="fa-solid fa-spinner fa-spin fa-3x" style={{color: '#10b981'}}></i>
                    </div>
                ) : explanations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', color: '#94a3b8' }}>
                        <i className="fa-solid fa-box-open fa-4x" style={{ marginBottom: '20px', opacity: 0.5 }}></i>
                        <p style={{fontSize: '18px'}}>لا يوجد محتوى لهذا الكورس حالياً</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                     <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: visibleTabs.length > 0 ? '0 0 12px 12px' : '12px', color: '#94a3b8' }}>
                        <p>لا توجد عناصر في هذا القسم</p>
                    </div>
                ) : (
                    <div style={{ background: 'white', padding: '20px', borderRadius: visibleTabs.length > 0 ? '0 0 12px 12px' : '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {filteredItems.map((item: any) => (
                                <ContentCard key={item.ExplanationID} item={item} onClick={() => setActiveItem(item)} protectMedia={protectMedia} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {activeItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setActiveItem(null)} onContextMenu={protectMedia}>
                    <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{margin: 0}}>{activeItem.ContentTitle}</h4>
                            <button onClick={() => setActiveItem(null)} style={{ background: '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px' }}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <MediaViewer item={activeItem} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// === 2. المكونات المساعدة ===
const ContentCard = ({ item, onClick, protectMedia }: { item: any, onClick: () => void, protectMedia: (e: any) => void }) => {
    const type = item.MediaType;
    const fileUrl = `${API_URL}${item.FileURL}`;

    const renderThumbnail = () => {
        switch (type) {
            case 'video': return <div style={{position: 'relative', height: '160px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><video src={fileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} muted controlsList="nodownload" onContextMenu={protectMedia} onDragStart={protectMedia} /><i className="fa-solid fa-play-circle" style={{position: 'absolute', fontSize: '40px', color: 'white', opacity: 0.9}}></i></div>;
            case 'audio': return <div style={{ height: '160px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}><i className="fa-solid fa-headphones fa-3x" style={{marginBottom: '15px'}}></i><span style={{fontWeight: '600'}}>ملف صوتي</span></div>;
            case 'image': return <img src={fileUrl} alt={item.ContentTitle} style={{ width: '100%', height: '160px', objectFit: 'cover' }} onContextMenu={protectMedia} onDragStart={protectMedia} />;
            case 'pdf': return <div style={{ height: '160px', background: '#eff6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}><i className="fa-solid fa-file-pdf fa-3x" style={{ marginBottom: '10px' }}></i><span style={{ fontWeight: '600' }}>ملف PDF</span></div>;
            default: return <div style={{ height: '160px', background: '#f1f5f9' }}></div>;
        }
    };

    return (
        <div onClick={onClick} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #e2e8f0' }}>
            {renderThumbnail()}
            <div style={{ padding: '15px' }}>
                {item.LessonTitle && <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '5px', fontWeight: '600' }}>📂 {item.LessonTitle}</div>}
                <h4 style={{ margin: '0 0 5px', fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>{item.ContentTitle}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}><i className="fa-regular fa-calendar" style={{ marginLeft: '4px' }}></i>{new Date(item.CreatedAt).toLocaleDateString('ar-EG')}</span>
                </div>
            </div>
        </div>
    );
};

const MediaViewer = ({ item }: { item: any }) => {
    const fileUrl = `${API_URL}${item.FileURL}`;
    const prevent = (e: React.MouseEvent) => e.preventDefault();

    switch (item.MediaType) {
        case 'video': return <video src={fileUrl} controls style={{ width: '100%', maxHeight: '70vh', background: '#000' }} controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture onContextMenu={prevent} onDragStart={prevent} />;
        case 'audio': return <div style={{padding: '40px', background: '#f8fafc', textAlign: 'center'}}><i className="fa-solid fa-music fa-4x" style={{color: '#6366f1', marginBottom: '20px'}}></i><h4 style={{marginBottom: '15px', color: '#334155'}}>{item.ContentTitle}</h4><audio controls src={fileUrl} style={{ width: '100%' }} controlsList="nodownload" onContextMenu={prevent} /></div>;
        case 'image': return <img src={fileUrl} alt={item.ContentTitle} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} onContextMenu={prevent} onDragStart={prevent} />;
        case 'pdf': return <div style={{ height: '70vh', background: '#f1f5f9' }}><iframe src={`${fileUrl}#toolbar=0&navpanes=0`} style={{ width: '100%', height: '100%', border: 'none' }} onContextMenu={prevent}></iframe></div>;
        default: return <div>Unsupported format</div>;
    }
};

// === 3. التصدير الافتراضي (مغلف بـ Suspense) ===
export default function StudentExplanationsPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 50, direction: 'rtl' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i> جاري التحميل...</div>}>
            <StudentExplanationsContent />
        </Suspense>
    );
}