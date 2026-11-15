import React, { useState, useEffect, useRef } from 'react';
import { Clock, ListCollapse, LogIn, LogOut, Camera, X, MapPin, Building2, Stethoscope, Plus, AlertCircle, Lock, Monitor, ShieldCheck } from 'lucide-react';
import { Language, CheckInLog, PunchType, LocationPin, PinType } from '../types';
import { translations } from '../translations';
import LocationPinTimeline from './LocationPinTimeline';
import { submitMissedPunchRequest } from '../lib/services/missed-punch-service';
import { fetchRoster } from '../lib/services/roster-service';
import { getShiftPunchInWindow } from '../lib/utils/shift-window';

interface CheckInModuleProps {
  language: Language;
  employeeId: string;
  isCheckedIn: boolean;
  onToggleCheckIn: (photoData?: string, punchType?: PunchType, punchNote?: string) => Promise<{success: boolean, geoError?: any, error?: string} | void>;
  logs: CheckInLog[];
  todayWorkedSeconds: number;
  pins: LocationPin[];
  onAddPin: (pinType: PinType, label?: string, photoData?: string) => Promise<{ success: boolean; error?: string }>;
}

export default function CheckInModule({
  language,
  employeeId,
  isCheckedIn,
  onToggleCheckIn,
  logs,
  todayWorkedSeconds,
  pins,
  onAddPin
}: CheckInModuleProps) {
  const t = translations[language];
  const [runningSeconds, setRunningSeconds] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedPunchType, setSelectedPunchType] = useState<PunchType>('in_office');
  const [punchNote, setPunchNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [geoError, setGeoError] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState(false);
  const [missedPunchDate, setMissedPunchDate] = useState<string | null>(null);
  const [missedPunchReason, setMissedPunchReason] = useState('');
  const [missedPunchType, setMissedPunchType] = useState<'in' | 'out'>('out');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [todayShift, setTodayShift] = useState<import("../types").DutyRosterShift | null>(null);
  const [lastPhotoData, setLastPhotoData] = useState<string | undefined>(undefined);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [systemReason, setSystemReason] = useState("Desktop PC without Webcam");
  const [systemCustomDetails, setSystemCustomDetails] = useState("");
  const [campReason, setCampReason] = useState("Medical Camp");
  const [campDetails, setCampDetails] = useState("");

  useEffect(() => {
    const fetchTodayShift = async () => {
      const today = new Date();
      const d = new Date(today);
      const day = d.getDay() || 7; 
      if (day !== 1) d.setDate(d.getDate() - (day - 1));
      d.setHours(0, 0, 0, 0);
      const weekStartStr = d.toLocaleDateString('en-CA');
      
      const data = await fetchRoster(weekStartStr);
      const todayStr = today.toLocaleDateString('en-CA');
      const activeShift = data.find(s => s.employeeId === employeeId && s.shiftDate === todayStr && s.isPublished !== false);
      setTodayShift(activeShift || null);
    };
    fetchTodayShift();

    const handleRosterUpdated = () => fetchTodayShift();
    window.addEventListener('hrms:roster-updated', handleRosterUpdated);
    return () => window.removeEventListener('hrms:roster-updated', handleRosterUpdated);
  }, [employeeId]);
  
  const handleSubmitMissedPunchRequest = async () => {
    if (!missedPunchDate) return;
    setIsSubmittingRequest(true);
    try {
      await submitMissedPunchRequest(employeeId, missedPunchDate, missedPunchType, missedPunchReason);
      if (missedPunchType === 'in') {
        await onToggleCheckIn(undefined, 'in_office', `[Missed Punch-In: ${missedPunchReason}]`);
      }
      setRequestSubmitted(true);
    } catch (err: any) {
      alert('Failed to submit request: ' + (err?.message || JSON.stringify(err)));
    } finally {
      setIsSubmittingRequest(false);
    }
  };
  
  // Pin states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinType, setPinType] = useState<PinType>('field_visit');
  const [pinLabel, setPinLabel] = useState('');
  const [isPinCameraOpen, setIsPinCameraOpen] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // BUG FIX: Attach stream via useEffect so video element is guaranteed to be mounted
  useEffect(() => {
    if ((isCameraOpen || isPinCameraOpen) && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen, isPinCameraOpen]);

  const startCamera = async (isForPin: boolean = false) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Access the app over HTTPS.");
      }
      let stream: MediaStream;
      try {
        // BUG FIX: Use `ideal` constraint so it works on all Android cameras without NotFoundError
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'user' } }, 
          audio: false 
        });
      } catch (firstErr: any) {
        if (firstErr.name === 'NotAllowedError') {
          throw firstErr; // Permission denied — can't retry
        }
        // For NotFoundError, OverconstrainedError — retry without constraints
        console.warn("Camera with constraints failed, retrying without:", firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      // BUG FIX: Open modal AFTER stream is ready so useEffect attaches srcObject immediately
      if (isForPin) {
        setIsPinCameraOpen(true);
      } else {
        setIsCameraOpen(true);
      }
    } catch (err: any) {
      console.warn("Camera not available:", err.name, err.message);
      const isNoCamera = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError';
      const isPermissionDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      if (isPermissionDenied) {
        alert(language === 'te' ? 'కెమెరా అనుమతి నిరాకరించబడింది. బ్రౌజర్ సెట్టింగ్స్‌లో కెమెరా అనుమతి ఇవ్వండి.' : 'Camera permission denied. Please tap the lock icon in the address bar and allow Camera, then reload.');
      } else if (!isNoCamera) {
        alert(language === 'te' ? 'కెమెరా అందుబాటులో లేదు. ఫోటో లేకుండా హాజరు నమోదు చేయబడుతుంది.' : `Camera error: ${err.message}. Proceeding without photo.`);
      }
      // For NotFoundError: silently proceed without photo
      if (isForPin) {
        handlePinSubmit(undefined);
      } else {
        setLastPhotoData(undefined);
        const result = await onToggleCheckIn(undefined, selectedPunchType, punchNote);
        if (result && !result.success) {
          if (result.geoError) {
            setGeoError(result.geoError);
          } else if (result.error) {
            if (result.error.startsWith('missed_punchout:')) {
              setMissedPunchType('out');
              setMissedPunchDate(result.error.split(':')[1]);
              setRequestSubmitted(false);
            } else {
              alert(result.error);
            }
          }
        }
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsPinCameraOpen(false);
  };

  const handleCaptureAndCheckIn = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.55);
        setLastPhotoData(photoData);
        stopCamera();

        setIsProcessing(true);
        const result = await onToggleCheckIn(photoData, selectedPunchType, punchNote);
        setIsProcessing(false);

        if (result && !result.success) {
          if (result.geoError) {
            setGeoError(result.geoError);
          } else if (result.error) {
            if (result.error.startsWith('missed_punchout:')) {
              setMissedPunchType('out');
              setMissedPunchDate(result.error.split(':')[1]);
              setRequestSubmitted(false);
            } else {
              alert(result.error);
            }
          }
        }
      }
    }
  };

  const handlePinSubmit = async (photoData?: string) => {
    setIsPinning(true);
    const result = await onAddPin(pinType, pinLabel, photoData);
    setIsPinning(false);
    
    if (result.success) {
      setIsPinModalOpen(false);
      setPinLabel('');
    } else {
      alert(result.error || 'Failed to pin location');
    }
  };

  const handleCaptureAndPin = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.55);
        stopCamera();
        await handlePinSubmit(photoData);
      }
    }
  };

  const shiftWindow = getShiftPunchInWindow(todayShift);
  const isShiftLate = !isCheckedIn && shiftWindow.isLate;

  // Main button click — for punch-in show category selector; for punch-out go directly to camera
  const handleMainButtonClick = () => {
    if (isCheckedIn) {
      // Punch-out: show confirmation prompt first
      setShowEndShiftConfirm(true);
    } else {
      if (shiftWindow.isLate) {
        const todayStr = new Date().toISOString().split('T')[0];
        setMissedPunchType('in');
        setMissedPunchDate(todayStr);
        setMissedPunchReason('');
        setRequestSubmitted(false);
        return;
      }
      // Punch-in: show category selector first
      setIsCategoryOpen(true);
    }
  };

  const handleCategorySelect = (type: PunchType) => {
    setSelectedPunchType(type);
    if (type === 'out_of_office') {
      setShowNoteInput(true);
    } else {
      setPunchNote('');
      setIsCategoryOpen(false);
      startCamera();
    }
  };

  const handleNoteSubmit = () => {
    if (!punchNote.trim()) {
      alert(language === 'te' ? 'దయచేసి ఒక నోట్ రాయండి.' : 'Please enter a note.');
      return;
    }
    setShowNoteInput(false);
    setIsCategoryOpen(false);
    startCamera();
  };

  // Live timer
  useEffect(() => {
    let timer: any;
    if (isCheckedIn) {
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
          if (diffMs < 0) diffMs = 0;
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

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === todayStr);

  const punchTypeBadge = (punchType?: PunchType) => {
    if (!punchType || punchType === 'in_office') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-[9px] font-bold border border-teal-100">
          <Building2 className="w-2.5 h-2.5" />
          {t.punchTypeInOffice}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[9px] font-bold border border-orange-100">
        <Stethoscope className="w-2.5 h-2.5" />
        {t.punchTypeOutOfOffice}
      </span>
    );
  };

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
              : (language === 'te' ? 'పని ప్రారంభించడానికి క్రింది బటన్ నొక్కండి.' : 'Verify punch-in to initiate logging.')
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

      {/* Main Punch Button Widget */}
      <div id="button-card" className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-8">
        <div className="max-w-md">
          <h3 className="text-xl font-bold text-slate-800">
            {isCheckedIn
              ? (language === 'te' ? "ఈరోజు పని ముగిస్తారా?" : "Done for the day?")
              : (language === 'te' ? "హాజరు వేసుకుంటారా?" : "Log Your Entry?")
            }
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {isCheckedIn
              ? (language === 'te' ? "పని పూర్తయిన తర్వాత పంచ్ అవుట్ క్లిక్ చేయండి." : "Click below to complete your current shift and log total hours.")
              : isShiftLate
                ? (language === 'te' 
                    ? `⚠️ షిఫ్ట్ పంచ్-ఇన్ సమయం (${shiftWindow.cutoffTime}) దాటిపోయింది. దయచేసి మిస్డ్ పంచ్ అప్లై చేసి పని ప్రారంభించండి.` 
                    : `⚠️ Punch-in cutoff (${shiftWindow.cutoffTime}) expired. Apply Missed Punch to start shift.`)
                : (language === 'te' ? "మీ డ్యూటీ టైమ్ కౌంట్ ప్రారంభించడానికి పంచ్ ఇన్ క్లిక్ చేయండి." : "This records your entry time precisely on the cloud server.")
            }
          </p>
        </div>

        {/* Big Punch Button */}
        <button
          id="punch-toggle-btn"
          onClick={handleMainButtonClick}
          disabled={isProcessing}
          className={`group flex flex-col items-center justify-center w-48 h-48 md:w-52 md:h-52 rounded-full border-[12px] shadow-xl transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-60 ${
            isCheckedIn
              ? 'border-rose-50 bg-rose-500 hover:bg-rose-600 shadow-rose-200 text-white'
              : isShiftLate
                ? 'border-amber-50 bg-amber-500 hover:bg-amber-600 shadow-amber-200 text-white'
                : 'border-teal-50 bg-teal-600 hover:bg-teal-700 shadow-teal-100 text-white'
          }`}
        >
          {isProcessing ? (
            <span className="text-xs font-bold animate-pulse">Processing...</span>
          ) : isCheckedIn ? (
            <>
              <LogOut className="w-10 h-10 mb-2 group-hover:-translate-y-0.5 transition-transform" />
              <span className="font-black text-xs uppercase tracking-wider px-3 text-center leading-tight">
                {t.btnCheckOut}
              </span>
              <span className="text-[10px] opacity-80 mt-1">వెళ్ళిపోండి</span>
            </>
          ) : isShiftLate ? (
            <>
              <Lock className="w-10 h-10 mb-2 text-white animate-pulse" />
              <span className="font-black text-xs uppercase tracking-wider px-3 text-center leading-tight">
                Window Closed
              </span>
              <span className="text-[10px] opacity-90 mt-1">Apply Missed Punch</span>
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

        {/* Desktop System Terminal Punch Option (No Camera) */}
        {!isCheckedIn && (
          <button
            type="button"
            onClick={() => setIsSystemModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-2.5 px-6 rounded-xl border border-slate-200 text-xs transition-all cursor-pointer shadow-xs"
          >
            <Monitor className="w-4 h-4 text-teal-600" />
            <span>{language === 'te' ? '🖥️ సిస్టమ్ పంచ్-ఇన్ (నో కెమెరా)' : '🖥️ System Punch-in (No Camera)'}</span>
          </button>
        )}

        <p className="text-xs text-slate-400 font-mono">
          Logged using your local timezone: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        
        {isCheckedIn && (
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="mt-6 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl transition-all active:scale-95"
          >
            <MapPin className="w-5 h-5 text-rose-500" />
            {language === 'te' ? 'లొకేషన్ పిన్ చేయండి' : 'Pin Location Now'}
          </button>
        )}
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
                  <th className="py-3 px-4">Type</th>
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
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                            <LogIn className="w-3 h-3 text-emerald-500" />
                            {log.checkInTime}
                          </span>
                          {log.photoUrl && (
                            <a href={log.photoUrl} target="_blank" rel="noreferrer">
                              <img src={log.photoUrl} className="w-6 h-6 object-cover rounded shadow-sm border border-slate-200 hover:scale-110 transition-transform" title="Punch-in Photo" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
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
                          {log.checkOutPhotoUrl && (
                            <a href={log.checkOutPhotoUrl} target="_blank" rel="noreferrer">
                              <img src={log.checkOutPhotoUrl} className="w-6 h-6 object-cover rounded shadow-sm border border-slate-200 hover:scale-110 transition-transform" title="Punch-out Photo" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {punchTypeBadge(log.punchType)}
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

      {/* Location Pin Timeline */}
      <LocationPinTimeline language={language} pins={pins} />

      {/* === Punch Type Category Selector Modal === */}
      {isCategoryOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {t.selectPunchType}
              </h3>
              <button onClick={() => setIsCategoryOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-400 text-center mb-4">
                {language === 'te' ? 'మీరు ఎక్కడ నుండి పంచ్ ఇన్ చేస్తున్నారు?' : 'Where are you punching in from?'}
              </p>
              {/* In Office */}
              <button
                id="punch-type-in-office"
                onClick={() => handleCategorySelect('in_office')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-teal-100 bg-teal-50/50 hover:bg-teal-50 hover:border-teal-400 transition-all group cursor-pointer active:scale-95"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">{t.punchTypeInOffice}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {language === 'te' ? 'ఆఫీసు నుండి పంచ్ ఇన్ చేయండి' : 'Punching in from your office location'}
                  </p>
                </div>
              </button>

              {/* Out of Office — Medical Camp */}
              <button
                id="punch-type-out-of-office"
                onClick={() => handleCategorySelect('out_of_office')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-orange-100 bg-orange-50/50 hover:bg-orange-50 hover:border-orange-400 transition-all group cursor-pointer active:scale-95"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">{t.punchTypeOutOfOffice}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {language === 'te' ? 'మెడికల్ క్యాంప్ లేదా ఇతర బాహ్య స్థలం నుండి' : 'At a medical camp or external field location'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Input Modal for Out of Office */}
      {showNoteInput && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">
              {language === 'te' ? 'లొకేషన్ నోట్ (తప్పనిసరి)' : 'Location Note (Required)'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'te' ? 'మీరు ఎక్కడ ఉన్నారో రాయండి (ఉదా: మెడికల్ క్యాంప్, ఫీల్డ్ విజిట్).' : 'Please enter where you are punching in from.'}
            </p>
            <input
              type="text"
              value={punchNote}
              onChange={(e) => setPunchNote(e.target.value)}
              placeholder={language === 'te' ? 'ఇక్కడ రాయండి...' : 'Enter location note...'}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNoteInput(false); setIsCategoryOpen(false); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors uppercase tracking-wider text-xs"
              >
                {language === 'te' ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                onClick={handleNoteSubmit}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-xs"
              >
                {language === 'te' ? 'కొనసాగించు' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-600" />
                {language === 'te' ? "ఫోటో తీయండి" : `Photo ${isCheckedIn ? "Punch-Out" : "Punch-In"}`}
                {!isCheckedIn && (
                  <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedPunchType === 'in_office' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'}`}>
                    {selectedPunchType === 'in_office' ? t.punchTypeInOffice : t.punchTypeOutOfOffice}
                  </span>
                )}
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
                {language === 'te'
                  ? (isCheckedIn ? "ఫోటో తీసి పంచ్ అవుట్ చేయండి" : "ఫోటో తీసి పంచ్ ఇన్ చేయండి")
                  : (isCheckedIn ? "Capture & Punch Out" : "Capture & Punch In")
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Shift Confirmation Modal */}
      {showEndShiftConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">
              {language === 'te' ? 'పని ముగించాలనుకుంటున్నారా?' : 'End Shift Confirmation'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {language === 'te' 
                ? `మీరు ఈరోజు పని చేసిన సమయం: ${formatTime(totalSecondsToday)}. దయచేసి నిర్ధారించండి.` 
                : `You have logged ${formatTime(totalSecondsToday)} today. Are you sure you want to punch out?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndShiftConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors uppercase tracking-wider text-xs"
              >
                {language === 'te' ? 'కొనసాగించు' : 'Keep Working'}
              </button>
              <button
                onClick={() => {
                  setShowEndShiftConfirm(false);
                  startCamera();
                }}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors uppercase tracking-wider text-xs"
              >
                {language === 'te' ? 'నిర్ధారించు' : 'Confirm End Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin Location Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                {language === 'te' ? 'లొకేషన్ పిన్ చేయండి' : 'Pin Current Location'}
              </h3>
              <button onClick={() => setIsPinModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {language === 'te' ? 'పిన్ రకం' : 'Pin Type'}
                </label>
                <select 
                  value={pinType}
                  onChange={(e) => setPinType(e.target.value as PinType)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                >
                  <option value="field_visit">Field Visit / ఫీల్డ్ విజిట్</option>
                  <option value="medical_camp">Medical Camp / మెడికల్ క్యాంప్</option>
                  <option value="client_site">Client Site / క్లయింట్ సైట్</option>
                  <option value="delivery">Delivery / డెలివరీ</option>
                  <option value="other">Other / ఇతర</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {language === 'te' ? 'వివరాలు (ఐచ్ఛికం)' : 'Label (Optional)'}
                </label>
                <input
                  type="text"
                  value={pinLabel}
                  onChange={(e) => setPinLabel(e.target.value)}
                  placeholder={language === 'te' ? 'ఉదా: గాజువాక క్యాంప్' : 'e.g. Gajuwaka Medical Camp'}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={() => startCamera(true)}
                  disabled={isPinning}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  {isPinning ? 'Processing...' : (language === 'te' ? 'ఫోటోతో పిన్ చేయండి' : 'Capture Photo & Pin')}
                </button>
                <button
                  onClick={() => handlePinSubmit(undefined)}
                  disabled={isPinning}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {language === 'te' ? 'ఫోటో లేకుండా పిన్ చేయండి' : 'Skip Photo & Pin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pin Camera Modal */}
      {isPinCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-600" />
                {language === 'te' ? "పిన్ ఫోటో" : "Pin Photo"}
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
              <button
                onClick={handleCaptureAndPin}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 w-full justify-center active:scale-95"
              >
                <Camera className="w-5 h-5" />
                {language === 'te' ? "ఫోటో తీయండి" : "Capture & Pin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geo-fence Error Modal with Camp Duty Option */}
      {geoError && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <MapPin className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                {language === 'te' ? 'ఆఫీస్ పరిధికి వెలుపల ఉన్నారు' : 'Outside Allowed Area'}
              </h3>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
                {geoError.nearestOfficeName === "No configured locations"
                  ? "No Office Locations configured in the system yet."
                  : `You are currently ${geoError.distance} meters away from ${geoError.nearestOfficeName}.`}
              </p>
            </div>

            <div className="text-left bg-teal-50/60 p-4 rounded-2xl border border-teal-100 space-y-3">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>{language === 'te' ? 'మెడికల్ క్యాంప్ లేదా ఫీల్డ్ డ్యూటీ లో ఉన్నారా?' : 'On duty at a Medical Camp or Field Visit?'}</span>
              </div>
              <p className="text-[11px] text-teal-700 leading-relaxed">
                {language === 'te' 
                  ? 'క్యాంప్ వివరాలు నమోదు చేసి పంచ్ ఇన్ చేయవచ్చు. ఇది అడ్మిన్‌కు వెంటనే నోటిఫై చేయబడుతుంది.' 
                  : 'You can punch in by specifying the camp site details. Admin will be instantly notified with your GPS coordinates.'}
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {language === 'te' ? 'డ్యూటీ రకం' : 'Duty Type'}
                </label>
                <select
                  value={campReason}
                  onChange={(e) => setCampReason(e.target.value)}
                  className="w-full border border-teal-200 bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="Medical Camp">Medical Camp (మెడికల్ క్యాంప్)</option>
                  <option value="Mobile Sample Collection">Mobile Sample Collection (శాంపిల్ సేకరణ)</option>
                  <option value="Patient Home Visit">Patient Home Visit (రోగి ఇంటి సందర్శన)</option>
                  <option value="Hospital Referral Visit">Hospital Referral Visit (హాస్పిటల్ విజిట్)</option>
                  <option value="Other Field Assignment">Other Field Duty (ఇతర ఫీల్డ్ వర్క్)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {language === 'te' ? 'క్యాంప్ స్థలం వివరాలు (తప్పనిసరి) *' : 'Camp / Site Location Details (Mandatory) *'}
                </label>
                <input
                  type="text"
                  value={campDetails}
                  onChange={(e) => setCampDetails(e.target.value)}
                  placeholder={language === 'te' ? 'ఉదా: గాజువాక క్యాంప్, స్టీల్ ప్లాంట్ డ్రైవ్...' : 'e.g. Gajuwaka Camp, Steel Plant Colony...'}
                  className="w-full border border-teal-200 bg-white rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <button
                type="button"
                disabled={!campDetails.trim() || isProcessing}
                onClick={async () => {
                  if (!campDetails.trim()) return;
                  const note = `[CAMP DUTY: ${campReason} - ${campDetails.trim()}]`;
                  setIsProcessing(true);
                  const res = await onToggleCheckIn(lastPhotoData, 'camp', note);
                  setIsProcessing(false);
                  if (res && res.success) {
                    setGeoError(null);
                    setCampDetails('');
                  } else if (res && res.error) {
                    alert(res.error);
                  }
                }}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>{language === 'te' ? 'క్యాంప్ పంచ్-ఇన్ చేయండి' : 'Punch In for Camp Duty'}</span>
              </button>
            </div>

            <button
              onClick={() => setGeoError(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors uppercase tracking-wider text-xs cursor-pointer"
            >
              {language === 'te' ? 'రద్దు చేయండి' : 'Close / Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Missed Punch Error Modal (In & Out) */}
      {missedPunchDate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scaleUp">

            {!requestSubmitted ? (
              <>
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  {missedPunchType === 'in'
                    ? (language === 'te' ? 'పంచ్-ఇన్ సమయం మించిపోయింది' : 'Missed Punch-In Request')
                    : (language === 'te' ? 'పంచ్ అవుట్ మిస్ అయింది' : 'Missed Punch-Out Detected')
                  }
                </h3>
                <p className="text-sm text-slate-500 text-left bg-amber-50 rounded-xl p-3 border border-amber-100">
                  {missedPunchType === 'in'
                    ? (language === 'te'
                        ? `మీ షిఫ్ట్ ప్రారంభ సమయం కంటే 30 నిమిషాలు దాటినందున డైరెక్ట్ పంచ్-ఇన్ లాక్ చేయబడింది. దయచేసి కారణంతో మిస్డ్ పంచ్ అప్లై చేసి పని ప్రారంభించండి.`
                        : `The 30-minute punch-in window from your shift start has expired. Please apply with a clear mandatory reason to begin your 8-hour shift.`)
                    : (language === 'te'
                        ? `మీరు ${missedPunchDate} న పంచ్ అవుట్ చేయలేదు. అడ్మిన్ అనుమతి కోసం దయచేసి అభ్యర్థన సమర్పించండి.`
                        : `You did not punch out on ${missedPunchDate}. Please submit a request to Admin to resolve that session.`
                      )
                  }
                </p>

                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'te' ? 'కారణం (తప్పనిసరి) *' : 'Reason (Mandatory) *'}
                  </label>
                  <textarea
                    value={missedPunchReason}
                    onChange={(e) => setMissedPunchReason(e.target.value)}
                    placeholder={missedPunchType === 'in'
                      ? (language === 'te' ? 'ఆలస్యానికి గల కారణం రాయండి...' : 'State reason (e.g. traffic delay, emergency duty, forgot to punch)...')
                      : (language === 'te' ? 'ఉదా: అత్యవసర పరిస్థితి కారణంగా పంచ్ అవుట్ చేయలేదు...' : 'e.g. System crash, rushed out for emergency...')
                    }
                    rows={3}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setMissedPunchDate(null); setMissedPunchReason(''); }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs uppercase tracking-wider"
                  >
                    {language === 'te' ? 'రద్దు' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSubmitMissedPunchRequest}
                    disabled={isSubmittingRequest || !missedPunchReason.trim()}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md"
                  >
                    {isSubmittingRequest
                      ? (language === 'te' ? 'పంపుతున్నారు...' : 'Submitting...')
                      : missedPunchType === 'in'
                        ? (language === 'te' ? 'అప్లై & పని ప్రారంభించు' : 'Apply & Start Shift')
                        : (language === 'te' ? 'అభ్యర్థన పంపు' : 'Submit Request')
                    }
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  {language === 'te' ? 'అభ్యర్థన పంపబడింది' : 'Request Submitted!'}
                </h3>
                <p className="text-sm text-slate-500">
                  {missedPunchType === 'in'
                    ? (language === 'te'
                        ? 'మీ మిస్డ్ పంచ్-ఇన్ అభ్యర్థన నమోదు చేయబడింది మరియు షిఫ్ట్ ప్రారంభించబడింది. దయచేసి 8 గంటలు పూర్తిచేసి తప్పనిసరిగా పంచ్ అవుట్ చేయండి.'
                        : 'Your missed punch-in request has been logged and your attendance session is live! Please complete your full 8 hours and compulsorily punch out.')
                    : (language === 'te'
                        ? 'మీ అభ్యర్థన అడ్మిన్‌కు పంపబడింది. అప్రూవ్ అయిన తర్వాత మీరు పంచ్ ఇన్ చేయవచ్చు.'
                        : 'Your request has been sent to Admin. Once approved, you can punch in normally.'
                      )
                  }
                </p>
                <button
                  onClick={() => {
                    setMissedPunchDate(null);
                    setMissedPunchReason('');
                    setRequestSubmitted(false);
                  }}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md"
                >
                  {language === 'te' ? 'సరే' : 'Got It'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* System Terminal Punch-in Modal (Desktop / No Camera) */}
      {isSystemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto">
              <Monitor className="w-7 h-7 text-teal-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {language === 'te' ? 'సిస్టమ్ టెర్మినల్ పంచ్-ఇన్' : 'Desktop System Punch-in'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'te' 
                ? 'వెబ్‌క్యామ్ లేని డెస్క్‌టాప్ లేదా ల్యాబ్ కంప్యూటర్ల కోసం' 
                : 'For lab workstations, testing benches, or desktops without webcams'}
            </p>

            <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {language === 'te' ? 'కారణాన్ని ఎంచుకోండి' : 'Select Reason (Mandatory)'}
                </label>
                <select
                  value={systemReason}
                  onChange={(e) => setSystemReason(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="Desktop PC without Webcam">Desktop PC without Webcam</option>
                  <option value="Lab Workstation Terminal">Lab Workstation Terminal</option>
                  <option value="Camera Driver / Hardware Malfunction">Camera Driver / Hardware Issue</option>
                  <option value="Browser Camera Permission Blocked">Browser Permission Blocked</option>
                  <option value="Other Technical Reason">Other Technical Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {language === 'te' ? 'అదనపు వివరాలు (ఐచ్ఛికం)' : 'Terminal Notes (Optional)'}
                </label>
                <input
                  type="text"
                  value={systemCustomDetails}
                  onChange={(e) => setSystemCustomDetails(e.target.value)}
                  placeholder={language === 'te' ? 'ఉదా: ల్యాబ్ PC 3, బయోకెమిస్ట్రీ డిపార్ట్‌మెంట్' : 'e.g. Lab PC-3, Pathology Department'}
                  className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-teal-800 leading-tight">
                  {language === 'te' 
                    ? 'ఈ పంచ్ సిస్టమ్ టెర్మినల్ బ్యాడ్జ్‌తో రికార్డ్ అవుతుంది మరియు మీ 8 గంటల పని సమయం ప్రారంభమవుతుంది.' 
                    : 'A verified terminal badge will be generated for your attendance record, and your 8-hour shift begins.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSystemModalOpen(false);
                  setSystemCustomDetails('');
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs uppercase cursor-pointer"
              >
                {language === 'te' ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={async () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 200;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(0, 0, 400, 200);
                    ctx.fillStyle = '#10b981';
                    ctx.font = 'bold 15px monospace';
                    ctx.fillText('🖥️ SYSTEM TERMINAL PUNCH', 20, 35);
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '12px monospace';
                    ctx.fillText(`EMP CODE: ${employeeId}`, 20, 65);
                    ctx.fillText(`TIME: ${new Date().toLocaleString('en-IN')}`, 20, 92);
                    ctx.fillText(`REASON: ${systemReason}`, 20, 118);
                    if (systemCustomDetails) {
                      ctx.fillText(`NOTE: ${systemCustomDetails.substring(0, 32)}`, 20, 144);
                    }
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = 'bold 11px monospace';
                    ctx.fillText('STATUS: VERIFIED DESKTOP WORKSTATION', 20, 175);
                  }
                  const badgeData = canvas.toDataURL('image/png');
                  const note = `[🖥️ System Terminal: ${systemReason}${systemCustomDetails ? ` - ${systemCustomDetails}` : ''}]`;
                  setIsProcessing(true);
                  const res = await onToggleCheckIn(badgeData, 'system_terminal', note);
                  setIsProcessing(false);
                  setIsSystemModalOpen(false);
                  if (res && res.error) {
                    alert(res.error);
                  }
                }}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>{language === 'te' ? 'పంచ్ ఇన్' : 'Punch In'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Shift Confirmation Modal */}
      {showEndShiftConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {language === 'te' ? 'పని ముగించాలనుకుంటున్నారా?' : 'End your shift?'}
            </h3>
            <p className="text-sm text-slate-500">
              {language === 'te' 
                ? 'మీరు ఇప్పుడు పంచ్ అవుట్ చేస్తే ఈ సెషన్ రికార్డ్ అవుతుంది. నిర్ధారించండి.' 
                : 'Are you sure you want to end your shift? This will clock you out for the current session.'}
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowEndShiftConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs uppercase tracking-wider"
              >
                {language === 'te' ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowEndShiftConfirm(false);
                  startCamera();
                }}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md"
              >
                {language === 'te' ? 'ముగించు' : 'Check Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
