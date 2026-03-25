"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Download, Search, Loader2, AlertCircle, CheckCircle2, Circle, Mail, Phone } from 'lucide-react';

// 🔥 쿠팡 다이나믹 배너 컴포넌트 (중복 제거 및 슬림화 버전)
const CoupangBanner = ({ id }: { id: string }) => {
  useEffect(() => {
    const scriptId = 'coupang-ads-script';
    
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://ads-partners.coupang.com/g.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const renderBanner = () => {
      const target = document.getElementById(id);
      if (!target) return;

      if (typeof window !== 'undefined' && (window as any).PartnersCoupang) {
        // 1. 기존에 생성된 내용이 있다면 삭제 (중복 생성 방지)
        target.innerHTML = ''; 

        new (window as any).PartnersCoupang.G({
          "id": 975156,
          "template": "carousel",
          "trackingCode": "AF5884485",
          "width": "100%",
          "height": "140",
          "tsource": "",
          "containerId": id 
        });

        // 2. 외부로 튕겨나간 iframe이 있다면 현재 target으로 수집 (단, 1개만 유지)
        setTimeout(() => {
          const misplaced = document.querySelectorAll(`iframe[src*="coupang"]`);
          misplaced.forEach(el => {
            if (target && !target.contains(el)) {
              const otherContainer = el.closest('[id^="coupang-ads-"]');
              if (!otherContainer || otherContainer.id === id) {
                 if (target.children.length > 0) el.remove(); // 이미 있으면 삭제
                 else target.appendChild(el);
              }
            }
          });
        }, 500);
      } else {
        setTimeout(renderBanner, 300);
      }
    };

    renderBanner();
  }, [id]);

  return (
    <div className="mt-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all p-1 min-h-[142px] flex items-center justify-center">
        <div id={id} className="w-full flex justify-center items-center overflow-hidden h-[140px]"></div>
      </div>
      <p className="text-center mt-3 text-[9px] font-bold text-slate-300 opacity-80 uppercase tracking-tight">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
};

export default function TubeAudioMP3() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [range, setRange] = useState({ start: 0, end: 100 });
  const [mode, setMode] = useState<'audio' | 'video'>('audio');
  
  const [audioQuality, setAudioQuality] = useState(''); 
  const [videoQuality, setVideoQuality] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  
  const [includeQualityInName, setIncludeQualityInName] = useState(true);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const currentQuality = mode === 'audio' ? audioQuality : videoQuality;
  const isHighQuality = mode === 'video' && (videoQuality === '720' || videoQuality === '1080');

  const resetAll = () => {
    setUrl('');
    setVideoInfo(null);
    setAudioQuality('');
    setVideoQuality('');
    setDownloading(false);
    setProgress(0);
    setRange({ start: 0, end: 100 });
    setCustomFileName('');
  };

  const getVId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const fetchInfo = async () => {
    if (!url) return alert("URL을 입력해주세요!");
    setLoading(true);
    setVideoInfo(null);
    setAudioQuality(''); 
    setVideoQuality('');
    try {
      const res = await fetch(`http://localhost:8000/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setVideoInfo(data);
      setRange({ start: 0, end: data.duration });
      setCustomFileName(data.title);
    } catch (e) { alert("정보를 가져오지 못했습니다."); }
    setLoading(false);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!dragging || !sliderRef.current || !videoInfo) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newValue = Math.round((offsetX / rect.width) * videoInfo.duration);
    if (dragging === 'start') {
      setRange(prev => ({ ...prev, start: Math.min(newValue, prev.end - 1) }));
    } else {
      setRange(prev => ({ ...prev, end: Math.max(newValue, prev.start + 1) }));
    }
  };

  const handleMouseUp = () => setDragging(null);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragging]);

  const handleDownload = async () => {
    if (!currentQuality) return;
    setDownloading(true);
    setProgress(5);

    const queryParams = new URLSearchParams({
      url: url,
      start: range.start.toString(),
      end: range.end.toString(),
      mode: mode,
      quality: currentQuality,
      filename: customFileName || "TubeAudio"
    });

    const eventSource = new EventSource(`http://localhost:8000/progress?${queryParams.toString()}`);
    eventSource.onmessage = (event) => {
      const p = parseFloat(event.data);
      if (!isNaN(p)) setProgress((prev) => Math.max(prev, p));
      if (p >= 100) eventSource.close();
    };

    const fakeProgress = setInterval(() => setProgress(prev => (prev < 98 ? prev + 0.3 : prev)), 800);
    
    try {
      const res = await fetch(`http://tubeaudio-mp3-production.up.railway.app${queryParams.toString()}`);
      if (!res.ok) throw new Error("Download failed");
      
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      const ext = mode === 'audio' ? 'mp3' : 'mp4';
      
      const finalName = includeQualityInName 
        ? `${customFileName || "TubeAudio"}_${currentQuality}.${ext}`
        : `${customFileName || "TubeAudio"}.${ext}`;
      
      a.download = finalName;
      a.click();
    } catch (e) { 
      alert("다운로드 중 오류가 발생했습니다."); 
    } finally { 
      clearInterval(fakeProgress); 
      setProgress(100); 
      eventSource.close(); 
      setTimeout(() => { setDownloading(false); setProgress(0); }, 1000); 
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-6 text-[#1E293B]">
      <div className="flex-1 w-full flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col items-center py-12 text-center">
          <h1 
            onClick={resetAll}
            className="text-5xl font-black tracking-tighter text-indigo-600 mb-2 cursor-pointer hover:opacity-80 transition-all active:scale-95 select-none"
          >
            TubeAudio-MP3
          </h1>
          <p className="text-slate-400 font-medium italic">Music Major's Professional Trimmer</p>
        </div>

        <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl shadow-indigo-100 p-2 flex border border-slate-100 mb-10">
          <input 
            className="flex-1 px-6 outline-none font-medium bg-transparent" 
            placeholder="유튜브 주소를 입력하세요..." 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) fetchInfo();
            }}
          />
          <button 
            onClick={fetchInfo} 
            disabled={loading} 
            className="bg-indigo-600 text-white px-8 py-4 rounded-[1.6rem] font-bold hover:bg-indigo-700 transition-all"
          >
            {loading ? <Loader2 className="animate-spin"/> : <Search size={20}/>}
          </button>
        </div>

        {/* 검색 전 메인 하단 광고 */}
        {!videoInfo && (
          <div className="w-full max-w-2xl">
            <CoupangBanner id="coupang-ads-home" />
          </div>
        )}

        {videoInfo && (
          <div className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-500">
            
            <div className="mb-10 overflow-hidden rounded-[2rem] bg-black aspect-video shadow-lg relative group">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${getVId(url)}?start=${range.start}&end=${range.end}&rel=0`} allowFullScreen></iframe>
            </div>

            <div className="mb-12 px-2">
              <div className="flex justify-between items-end mb-8">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start</span>
                  <span className="text-3xl font-black text-indigo-600 leading-none">{formatTime(range.start)}</span>
                </div>
                <div className="text-indigo-600 font-black text-sm bg-indigo-50 px-4 py-1 rounded-full border border-indigo-100 italic">
                  {range.end - range.start}s selected
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End</span>
                  <span className="text-3xl font-black text-indigo-600 leading-none">{formatTime(range.end)}</span>
                </div>
              </div>

              <div ref={sliderRef} className="relative h-4 bg-slate-100 rounded-full cursor-pointer select-none">
                <div className="absolute h-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all" 
                     style={{ left: `${(range.start / videoInfo.duration) * 100}%`, width: `${((range.end - range.start) / videoInfo.duration) * 100}%` }}></div>
                <div onMouseDown={() => setDragging('start')} onTouchStart={() => setDragging('start')} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white border-4 border-indigo-600 rounded-full shadow-xl z-30 flex items-center justify-center transition-transform ${dragging === 'start' ? 'scale-125' : 'hover:scale-110'}`} style={{ left: `${(range.start / videoInfo.duration) * 100}%` }}>
                  <div className="w-1 h-3 bg-indigo-100 rounded-full"></div>
                </div>
                <div onMouseDown={() => setDragging('end')} onTouchStart={() => setDragging('end')} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white border-4 border-indigo-600 rounded-full shadow-xl z-30 flex items-center justify-center transition-transform ${dragging === 'end' ? 'scale-125' : 'hover:scale-110'}`} style={{ left: `${(range.end / videoInfo.duration) * 100}%` }}>
                  <div className="w-1 h-3 bg-indigo-100 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="mb-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
              <div className="flex justify-between items-center mb-2 px-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filename</label>
                <button 
                  onClick={() => setIncludeQualityInName(!includeQualityInName)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-all ${includeQualityInName ? 'text-indigo-600' : 'text-slate-400'}`}
                >
                  {includeQualityInName ? <CheckCircle2 size={14}/> : <Circle size={14}/>}
                  <span>Quality Suffix</span>
                </button>
              </div>
              <div className="flex items-center bg-white rounded-2xl border px-4 py-3 shadow-sm">
                <input type="text" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} className="flex-1 outline-none font-bold text-slate-700 bg-transparent" />
                <span className="text-slate-300 font-bold ml-2">
                  {includeQualityInName ? `_${currentQuality || '?'}` : ''}.{mode === 'audio' ? 'mp3' : 'mp4'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${mode === 'audio' ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-white'}`} onClick={() => setMode('audio')}>
                <div className="font-bold text-indigo-600 mb-4 tracking-tighter uppercase">Audio Option</div>
                <div className="flex gap-2">
                  {['128', '320'].map(q => (
                    <button key={q} onClick={(e) => { e.stopPropagation(); setMode('audio'); setAudioQuality(q); }} 
                      className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${audioQuality === q && mode === 'audio' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border text-slate-400 hover:border-indigo-200'}`}>
                      {q}k
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${mode === 'video' ? 'border-rose-500 bg-rose-50/30' : 'border-slate-100 bg-white'}`} onClick={() => setMode('video')}>
                <div className="font-bold text-rose-600 mb-4 tracking-tighter uppercase">Video Option</div>
                <div className="flex flex-wrap gap-2">
                  {['144', '360', '720', '1080'].map(q => (
                     <button key={q} onClick={(e) => { e.stopPropagation(); setMode('video'); setVideoQuality(q); }} 
                      className={`px-3 py-2 rounded-xl font-bold text-sm transition-all ${videoQuality === q && mode === 'video' ? 'bg-rose-500 text-white shadow-lg' : 'bg-white border text-slate-400 hover:border-rose-200'}`}>
                       {q}p
                     </button>
                  ))}
                </div>
              </div>
            </div>

            {isHighQuality && !downloading && (
              <div className="mb-6 flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-2xl border border-amber-100 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} />
                <span className="text-sm font-bold">HD(720p 이상) 추출은 병합 과정으로 인해 시간이 다소 소요될 수 있습니다.</span>
              </div>
            )}

            {downloading && (
              <div className="mb-6 px-2">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-indigo-600 animate-pulse">Processing...</span>
                  <span className="text-sm font-black text-indigo-600">{Math.floor(progress)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border">
                  <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button onClick={handleDownload} disabled={downloading || !currentQuality} 
              className="w-full bg-[#1E293B] hover:bg-black text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl disabled:bg-slate-300 disabled:text-slate-500">
              {downloading ? <Loader2 className="animate-spin" /> : <Download />} 
              {!currentQuality ? "SELECT QUALITY FIRST" : downloading ? "CONVERTING..." : "CONVERT NOW"}
            </button>

            {/* 결과 하단 광고 */}
            <CoupangBanner id="coupang-ads-result" />

          </div>
        )}
      </div>

      <footer className="w-full max-w-3xl mt-20 mb-10 pt-10 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-4">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Developed by</p>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Music Tech Lab</h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            <a 
              href="mailto:gheon1009@gmail.com" 
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-indigo-100 border border-slate-100 transition-all">
                <Mail size={16} />
              </div>
              <span className="text-sm font-semibold tracking-tight">gheon1009@gmail.com</span>
            </a>
            
            <a 
              href="tel:+821050275086" 
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-indigo-100 border border-slate-100 transition-all">
                <Phone size={16} />
              </div>
              <span className="text-sm font-semibold tracking-tight">+82 10-5027-5086</span>
            </a>
          </div>
        </div>
        <p className="text-center mt-12 text-[10px] font-bold text-slate-300 uppercase tracking-widest select-none">
          © 2026 TRINITY Project. All rights reserved.
        </p>
      </footer>
    </div>
  );
}