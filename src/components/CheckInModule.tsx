import React, { useState, useEffect, useRef } from 'react';
import { Clock, ListCollapse, LogIn, LogOut, Camera, X } from 'lucide-react';
import { Language, CheckInLog } from '../types';
import { translations } from '../translations';

interface CheckInModuleProps {
  language: Language;
  isCheckedIn: boolean;
  onToggleCheckIn: (photoData?: string) => void;
  logs: CheckInLog[];
  todayWorkedSeconds: number;
}

export default function CheckInModule({
  language,
  isCheckedIn,
  onToggleCheckIn,
  logs,
  todayWorkedSeconds
}: CheckInModuleProps) {
  const t = translations[language];
  const [runningSeconds, setRunningSeconds] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available");
      }
      // Open modal first so the video element mounts
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      
      // Give React a moment to render the modal and attach the ref
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      alert(language === 'te' ? "కెమెరా అందుబాటులో లేదు. ఫోటో లేకుండా హాజరు నమోదు చేయబడుతుంది." : "Camera unavailable. Checking in without photo.");
      setIsCameraOpen(false);
      onToggleCheckIn(); // Fallback check-in
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const handleCaptureAndCheckIn = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        stopCamera();
        onToggleCheckIn(photoData);
      }
    }
  };

  const handleMainButtonClick = () => {
    if (isCheckedIn) {
      // Check out doesn't need photo
      onToggleCheckIn();
    } else {
      // Check in needs photo
      startCamera();
    }
  };

  // If checked in, we have a live timer running
  useEffect(() => {
    let timer: any;
    if (isCheckedIn) {
      // Find the last open log entry to calculate elapsed seconds from it
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter(l => l.date === today);
      const activeLog = todayLogs.find(l => l.checkOutTime === null);
      
      if (activeLog) {
        const calculateElapsed = () => {
          const now = new Date();
          const [h, m, s] = activeLog.checkInTime.split(':').map(Number);
          const checkInDate = new Date();
          checkInDate.setHours(h, m, s, 0);
          
          let diffMs = now.getTime() - checkInDate.getTime();
          if (diffMs < 0) diffMs = 0; // Guard
          return Math.floor(diffMs / 1000);
        };

        setRunningSeconds(calculateElapsed());

        timer = setInterval(() => {
          setRunningSeconds(calculateElapsed());
        }, 1000);
      }
    } else {
      setRunningSeconds(0);
    }

    return () => clearInterval(timer);
  }, [isCheckedIn, logs]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate cumulative today's total including completed sessions and running session
  const completedTodaySeconds = logs
    .filter(l => l.date === new Date().toISOString().split('T')[0] && l.checkOutTime !== null)
    .reduce((acc, log) => {
      if (log.checkInTime && log.checkOutTime) {
        const [h1, m1, s1] = log.checkInTime.split(':').map(Number);
        const [h2, m2, s2] = log.checkOutTime.split(':').map(Number);
        const sec1 = h1 * 3600 + m1 * 60 + s1;
        const sec2 = h2 * 3600 + m2 * 60 + s2;
        return acc + (sec2 - sec1);
      }
      return acc;
    }, 0);

  const totalSecondsToday = completedTodaySeconds + (isCheckedIn ? runningSeconds : 0);

  // Get only today's logs for display
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === todayStr);

  return (
    <div id="check-in-module-container" className="space-y-6">
      {/* Upper Status Panel */}
      <div id="status-panel" className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
        <div id="status-text-block" className="space-y-2 text-center md:text-left">
          <span className="text-[10px] bg-slate-100 px-3 py-1 text-slate-500 font-bold uppercase tracking-wider rounded-full inline-block">
            {t.currentStatusLabel}
          </span>
          <div className="flex items-center justify-center md:justify-start gap-2.5 mt-2">
            <span className={`inline-block w-3 h-3 rounded-full ${isCheckedIn ? 'bg-teal-500 animate-pulse' : 'bg-amber-500'}`} />
            <h2 className="text-2xl font-black text-slate-800">
              {isCheckedIn ? t.checkedIn : t.checkedOut}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {isCheckedIn 
              ? (language === 'te' ? 'మీరు ఈరోజు పని ప్రారంభించారు. సమయం రికార్డ్ అవుతోంది.' : 'You have initiated your duty. Live clock is active.') 
              : (language === 'te' ? 'పని ప్రారంభించడానికి క్రింది బటన్ నొక్కండి.' : 'Verify check-in to initiate logging.')
            }
          </p>
        </div>

        {/* Live Timer Visual */}
        <div id="live-timer-badge" className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm">
          <div className="bg-teal-50 p-3 rounded-xl text-teal-600">
            <Clock className={`w-6 h-6 ${isCheckedIn ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              {t.workTimerLabel}
            </span>
            <span className="text-3xl font-black font-mono text-slate-800 tracking-tight block">
              {formatTime(totalSecondsToday)}
            </span>
            {isCheckedIn && (
              <span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest animate-pulse block mt-0.5">
                ● {t.runningLive}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Check-In Button Widget */}
      <div id="button-card" className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-8">
        <div className="max-w-md">
          <h3 className="text-xl font-bold text-slate-800">
            {isCheckedIn ? (language === 'te' ? "ఈరోజు పని ముగిస్తారా?" : "Done for the day?") : (language === 'te' ? "హాజరు వేసుకుంటారా?" : "Log Your Entry?")}
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {isCheckedIn 
              ? (language === 'te' ? "పని పూర్తయిన తర్వాత పని ముగించండి (Check Out) క్లిక్ చేయండి." : "Click below to complete your current shift and log total hours.")
              : (language === 'te' ? "మీ డ్యూటీ టైమ్ కౌంట్ ప్రారంభించడానికి పనిలోకి రండి (Check In) క్లిక్ చేయండి." : "This records your entry time precisely on the cloud server.")
            }
          </p>
        </div>

        {/* Big Rounded Action Button styled precisely like the design HTML checkin circles */}
        <button
          id="check-in-toggle-btn"
          onClick={handleMainButtonClick}
          className={`group flex flex-col items-center justify-center w-48 h-48 md:w-52 md:h-52 rounded-full border-[12px] shadow-xl transition-all duration-300 cursor-pointer active:scale-95 ${
            isCheckedIn 
              ? 'border-rose-50 bg-rose-500 hover:bg-rose-600 shadow-rose-200 text-white'
              : 'border-teal-50 bg-teal-600 hover:bg-teal-700 shadow-teal-100 text-white'
          }`}
        >
          {isCheckedIn ? (
            <>
              <LogOut className="w-10 h-10 mb-2 group-hover:-translate-y-0.5 transition-transform" />
              <span className="font-black text-xs uppercase tracking-wider px-3 text-center leading-tight">
                {t.btnCheckOut}
              </span>
              <span className="text-[10px] opacity-80 mt-1">వెళ్ళిపోండి</span>
            </>
          ) : (
            <>
              <LogIn className="w-10 h-10 mb-2 group-hover:translate-y-0.5 transition-transform" />
              <span className="font-black text-xs uppercase tracking-wider px-3 text-center leading-tight">
                {t.btnCheckIn}
              </span>
              <span className="text-[10px] opacity-80 mt-1">లోపలికి రండి</span>
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 font-mono">
          Logged using your local timezone: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Daily Timeline Logs */}
      <div id="logs-timeline" className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <ListCollapse className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-800">
            {t.logTitle}
          </h3>
        </div>

        {todayLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            {t.noData}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">{t.logHeaderTime}</th>
                  <th className="py-3 px-4">{t.logInTime}</th>
                  <th className="py-3 px-4">{t.logOutTime}</th>
                  <th className="py-3 px-4 text-right">{t.logDuration}</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((log, idx) => {
                  let durationStr = t.runningLive;
                  if (log.checkOutTime && log.checkInTime) {
                    const [h1, m1, s1] = log.checkInTime.split(':').map(Number);
                    const [h2, m2, s2] = log.checkOutTime.split(':').map(Number);
                    const elapsed = (h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1);
                    const h = Math.floor(elapsed / 3600);
                    const m = Math.floor((elapsed % 3600) / 60);
                    const s = elapsed % 60;
                    durationStr = `${h}h ${m}m ${s}s`;
                  }
                  
                  return (
                    <tr key={log.id} className="border-b border-slate-50 last:border-b-0 text-slate-700 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-400">
                        Session #{idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                          <LogIn className="w-3 h-3 text-emerald-500" />
                          {log.checkInTime}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.checkOutTime ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-1 rounded">
                            <LogOut className="w-3 h-3 text-amber-500" />
                            {log.checkOutTime}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                            {t.runningLive}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {durationStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-600" />
                {language === 'te' ? "ఫోటో తీయండి" : "Photo Check-In"}
              </h3>
              <button onClick={stopCamera} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="relative bg-black aspect-video flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-4 border-teal-500/30 m-4 rounded-xl pointer-events-none"></div>
            </div>

            <div className="p-6 flex flex-col items-center">
              <p className="text-xs text-slate-500 mb-4 text-center">
                {language === 'te' ? "హాజరు నమోదు చేయడానికి దయచేసి మీ ఫోటో తీయండి." : "Please capture your photo to record attendance."}
              </p>
              <button
                onClick={handleCaptureAndCheckIn}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-teal-500/25 transition-all flex items-center gap-2 w-full justify-center active:scale-95"
              >
                <Camera className="w-5 h-5" />
                {language === 'te' ? "ఫోటో తీసి చెక్-ఇన్ చేయండి" : "Capture & Check In"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
