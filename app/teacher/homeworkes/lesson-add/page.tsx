'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/config';

export default function AddExplanationPage() {
  const { user } = useAuthStore();
  
  // المعلم هو المستخدم الحالي
  const EmploeID = user?.personId; 
  const schoolId = user?.schoolId || 1;
const personId = user?.personId || 0;

  // --- Data States ---
  const [courses, setCourses] = useState<any[]>([]);
  
  // --- Form States ---
  const [courseId, setCourseId] = useState('');
  const [lessonTitle, setLessonTitle] = useState(''); // عنوان الدرس الرئيسي
  const [contentTitle, setContentTitle] = useState(''); // عنوان الفيديو/الملف
  const [activeTab, setActiveTab] = useState('video');
  
  // --- File States ---
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- Recording States ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [loading, setLoading] = useState(false);

  // --- Effects ---
  useEffect(() => {
      const fetchCourses = async () => {
          if(schoolId) {
              try {
                  const res = await fetch(`${API_URL}/api/getData1/17?id=${personId}`);
                  const json = await res.json();
                  if (json.success) setCourses(json.data || []);
              } catch(e) { console.error(e); }
          }
      };
      fetchCourses();
    }, [personId]);
  

  // --- Logic: Reset & Tabs ---
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    resetMedia();
  };

  const resetMedia = () => {
    setUploadFile(null);
    setRecordedBlob(null);
    setPreviewUrl(null);
    stopCamera();
  };

  // --- Logic: File Upload ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setRecordedBlob(null);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // --- Logic: Recording ---
  const startCamera = async (video: boolean, audio: boolean) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
        streamRef.current = stream;
        if(videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        }
    } catch (err) {
        alert('تأكد من السماح للكاميرا والميكروفون في المتصفح.');
    }
  };

  const stopCamera = () => {
    if(streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        if(videoRef.current) videoRef.current.srcObject = null;
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    const videoMode = activeTab === 'video';
    await startCamera(videoMode, true);
    
    setTimeout(() => {
        if(streamRef.current) {
            const mediaRecorder = new MediaRecorder(streamRef.current);
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: videoMode ? 'video/webm' : 'audio/webm' });
                setRecordedBlob(blob);
                setPreviewUrl(URL.createObjectURL(blob));
                setUploadFile(null);
                stopCamera();
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
        }
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  // --- Logic: Submit ---
  const handleSubmit = async () => {
    if(!courseId || !lessonTitle || !contentTitle) return alert('الرجاء اختيار الكورس وكتابة عنوان الدرس وعنوان المحتوى');
    if(!uploadFile && !recordedBlob) return alert('الرجاء رفع ملف أو تسجيل فيديو/صوت');
    if(!EmploeID) return alert('خطأ: لم يتم التعرف على هوية المعلم');

    setLoading(true);
    const formData = new FormData();
    formData.append('courseId', courseId);
    formData.append('EmploeID', String(EmploeID));
    formData.append('schoolId', String(schoolId));
    formData.append('lessonTitle', lessonTitle);
    formData.append('contentTitle', contentTitle);
    formData.append('type', activeTab);
    
    if(uploadFile) {
        formData.append('file', uploadFile);
    } else if(recordedBlob) {
        const filename = activeTab === 'video' ? 'recording.webm' : 'audio.webm';
        formData.append('file', recordedBlob, filename);
    }

    try {
        const res = await fetch(`${API_URL}/api/explanations`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if(data.success) {
            alert('تم إضافة الشرح بنجاح!');
            // نفضي الحقول عشان نضيف شرح تاني لنفس الدرس بسهولة
            setContentTitle(''); 
            resetMedia();
        } else {
            alert(data.error || 'حدث خطأ');
        }
    } catch(e) { alert('فشل الاتصال'); }
    finally { setLoading(false); }
  };

  // --- Styles ---
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px', color: '#334155' };
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '20px' };
  const primaryBtn: React.CSSProperties = { background: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', width: '100%' };
  const tabActive: React.CSSProperties = { background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: '600' };
  const tabNormal: React.CSSProperties = { background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: '600' };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>📚 إضافة شرح جديد</h2>

      <div style={cardStyle}>
        {/* Basic Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>اختر الكورس</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={inputStyle}>
              <option value="">-- اختر الكورس --</option>
              {courses.map(c => <option key={c['الرقم']} value={c['الرقم']}>{c['اسم الكورس']}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>عنوان الدرس الرئيسي</label>
            <input 
                type="text" 
                value={lessonTitle} 
                onChange={(e) => setLessonTitle(e.target.value)} 
                style={inputStyle} 
                placeholder="مثال: الدرس الأول - الوحدة الأولى" 
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>عنوان المحتوى (الفيديو / الملف)</label>
            <input 
                type="text" 
                value={contentTitle} 
                onChange={(e) => setContentTitle(e.target.value)} 
                style={inputStyle} 
                placeholder="مثال: شرح المفهوم الأول" 
            />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '5px', borderBottom: '2px solid #e2e8f0' }}>
            {[
                { id: 'video', label: 'فيديو', icon: 'fa-video' },
                { id: 'audio', label: 'صوت', icon: 'fa-microphone' },
                { id: 'image', label: 'صور', icon: 'fa-image' },
                { id: 'pdf', label: 'PDF', icon: 'fa-file-pdf' }
            ].map(tab => (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={activeTab === tab.id ? tabActive : tabNormal}>
                    <i className={`fa-solid ${tab.icon}`} style={{ marginLeft: '5px' }}></i> {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px', background: '#f8fafc', minHeight: '300px', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
            
            {/* Video Tab */}
            {activeTab === 'video' && (
                <div>
                    <input type="file" accept="video/*" onChange={handleFileChange} id="video-upload" style={{display: 'none'}} />
                    <button onClick={() => document.getElementById('video-upload')?.click()} style={{...primaryBtn, background: '#3b82f6', marginBottom: '15px'}}>
                        <i className="fa-solid fa-upload" style={{marginLeft: '5px'}}></i> رفع ملف فيديو جاهز
                    </button>

                    <div style={{textAlign: 'center', color: '#94a3b8', margin: '10px 0'}}>أو قم بالتسجيل المباشر</div>

                    <div style={{ textAlign: 'center' }}>
                        <video ref={videoRef} width="100%" height="auto" style={{background: '#000', borderRadius: '8px', marginBottom: '10px', maxHeight: '400px'}} controls={!!previewUrl} muted={!previewUrl}></video>
                        
                        {!isRecording && !previewUrl && (
                            <button onClick={startRecording} style={{...primaryBtn, background: '#ef4444'}}>
                                <i className="fa-solid fa-circle" style={{marginLeft: '5px'}}></i> بدء التسجيل
                            </button>
                        )}
                        {isRecording && (
                            <button onClick={stopRecording} style={{...primaryBtn, background: '#64748b'}}>
                                <i className="fa-solid fa-stop" style={{marginLeft: '5px'}}></i> إنهاء التسجيل
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Audio Tab */}
            {activeTab === 'audio' && (
                <div style={{ textAlign: 'center' }}>
                    <input type="file" accept="audio/*" onChange={handleFileChange} id="audio-upload" style={{display: 'none'}} />
                    <button onClick={() => document.getElementById('audio-upload')?.click()} style={{...primaryBtn, background: '#3b82f6', marginBottom: '20px'}}>
                        <i className="fa-solid fa-upload"></i> رفع ملف صوتي
                    </button>
                    
                    <div style={{margin: '20px 0', color: '#94a3b8'}}>أو التسجيل المباشر</div>

                    <div style={{ height: '100px', background: '#e2e8f0', borderRadius: '50%', width: '100px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-microphone" style={{fontSize: '40px', color: isRecording ? '#ef4444' : '#64748b'}}></i>
                    </div>

                    {previewUrl && <audio controls src={previewUrl} style={{width: '100%', marginBottom: '10px'}}></audio>}

                    {!isRecording && !previewUrl && (
                        <button onClick={startRecording} style={{...primaryBtn, background: '#8b5cf6'}}>
                            <i className="fa-solid fa-circle"></i> بدء التسجيل
                        </button>
                    )}
                    {isRecording && (
                        <button onClick={stopRecording} style={{...primaryBtn, background: '#ef4444'}}>
                            <i className="fa-solid fa-stop"></i> إيقاف
                        </button>
                    )}
                </div>
            )}

            {/* Image Tab */}
            {activeTab === 'image' && (
                <div style={{ textAlign: 'center' }}>
                    <input type="file" accept="image/*" onChange={handleFileChange} id="image-upload" style={{display: 'none'}} />
                    {previewUrl && <img src={previewUrl} style={{maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />}
                    <button onClick={() => document.getElementById('image-upload')?.click()} style={{...primaryBtn, background: '#f59e0b'}}>
                        <i className="fa-solid fa-image"></i> اختيار صورة
                    </button>
                </div>
            )}

            {/* PDF Tab */}
            {activeTab === 'pdf' && (
                <div style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <input type="file" accept="application/pdf" onChange={handleFileChange} id="pdf-upload" style={{display: 'none'}} />
                    {uploadFile && <p style={{color: '#10b981', fontWeight: '600', fontSize: '18px', marginBottom: '15px'}}><i className="fa-solid fa-file-pdf"></i> {uploadFile.name}</p>}
                    <button onClick={() => document.getElementById('pdf-upload')?.click()} style={{...primaryBtn, background: '#ef4444'}}>
                        <i className="fa-solid fa-file-pdf"></i> اختيار ملف PDF
                    </button>
                </div>
            )}
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
            <button onClick={handleSubmit} disabled={loading} style={{...primaryBtn, width: 'auto', padding: '12px 40px', fontSize: '16px'}}>
                {loading ? 'جاري الحفظ...' : 'حفظ الشرح'}
            </button>
        </div>
      </div>
    </div>
  );
}