import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Camera, X, MapPin, AlertCircle, Lock, Clock, Monitor, ShieldCheck } from "lucide-react";
import { Language, CheckInLog, AttendanceRecord, LeaveBalance, Payslip, Employee } from "../types";
import { translations } from "../translations";
import LocationPinTimeline from "./LocationPinTimeline";
import TickerAlert from "./TickerAlert";
import { submitMissedPunchRequest } from "../lib/services/missed-punch-service";
import { fetchRoster } from "../lib/services/roster-service";
import { getShiftPunchInWindow } from "../lib/utils/shift-window";

interface DashboardSnapshotProps {
  language: Language;
  currentUser: Employee;
  isCheckedIn: boolean;
  logs: CheckInLog[];
  attendanceRecords: AttendanceRecord[];
  leaveBalance: LeaveBalance;
  payslips: Payslip[];
  setActiveTab: (tab: string) => void;
  onToggleCheckIn: (photoData?: string, punchType?: import("../types").PunchType, punchNote?: string, statusOverride?: import("../types").AttendanceStatus) => Promise<{success: boolean, geoError?: any, error?: string} | void>;
  pins: import("../types").LocationPin[];
  onAddPin: (pinType: import("../types").PinType, label?: string, photoData?: string) => Promise<{ success: boolean; error?: string }>;
}

export default function DashboardSnapshot({ language, currentUser, isCheckedIn, logs, attendanceRecords, leaveBalance, payslips, setActiveTab, onToggleCheckIn, pins, onAddPin }: DashboardSnapshotProps) {
  const t = translations[language];

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPinCameraOpen, setIsPinCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [geoError, setGeoError] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [punchType, setPunchType] = useState<import("../types").PunchType>("in_office");
  const [punchNote, setPunchNote] = useState("");
  const [isEarlyPunchModalOpen, setIsEarlyPunchModalOpen] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");
  const [isHalfDayEarly, setIsHalfDayEarly] = useState(false);
  const [statusOverride, setStatusOverride] = useState<import("../types").AttendanceStatus | undefined>(undefined);
  const [missedPunchDate, setMissedPunchDate] = useState<string | null>(null);
  const [missedPunchReason, setMissedPunchReason] = useState("");
  const [missedPunchType, setMissedPunchType] = useState<'in' | 'out'>('out');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinType, setPinType] = useState<import("../types").PinType>("field_visit");
  const [pinLabel, setPinLabel] = useState("");
  const [isPinning, setIsPinning] = useState(false);
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
      // To get the start of the week for fetchRoster
      const d = new Date(today);
      const day = d.getDay() || 7; 
      if (day !== 1) d.setDate(d.getDate() - (day - 1));
      d.setHours(0, 0, 0, 0);
      const weekStartStr = d.toLocaleDateString('en-CA');
      
      const data = await fetchRoster(weekStartStr);
      const todayStr = today.toLocaleDateString('en-CA');
      const activeShift = data.find(s => s.employeeId === currentUser.id && s.shiftDate === todayStr && s.isPublished !== false);
      setTodayShift(activeShift || null);
    };
    fetchTodayShift();

    const handleRosterUpdated = () => fetchTodayShift();
    window.addEventListener('hrms:roster-updated', handleRosterUpdated);
    return () => window.removeEventListener('hrms:roster-updated', handleRosterUpdated);
  }, [currentUser.id]);

  // BUG FIX: Attach stream using useEffect so the video DOM element is guaranteed to be mounted
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
        // BUG FIX: Use `ideal` constraint so it works on all Android cameras
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } }, audio: false });
      } catch (firstErr: any) {
        if (firstErr.name === "NotAllowedError") throw firstErr;
        // Retry without constraints for NotFoundError / OverconstrainedError
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      // Open modal AFTER stream is ready so useEffect attaches it immediately
      isForPin ? setIsPinCameraOpen(true) : setIsCameraOpen(true);
    } catch (err: any) {
      console.warn("Camera not available:", err.name, err.message);
      const isNoCamera = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError';
      const isPermissionDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      if (isPermissionDenied) {
        alert(language === 'te' ? 'కెమెరా అనుమతి నిరాకరించబడింది. బ్రౌజర్ సెట్టింగ్స్‌లో కెమెరా అనుమతి ఇవ్వండి.' : 'Camera permission denied. Please allow Camera access in your browser address bar and reload.');
      } else if (!isNoCamera) {
        // Only alert for unexpected errors, not for missing hardware
        alert(language === 'te' ? 'కెమెరా అందుబాటులో లేదు. ఫోటో లేకుండా ముందుకు వెళ్తాము.' : `Camera error: ${err.message}. Proceeding without photo.`);
      }
      // Silently proceed without photo (no alert for NotFoundError on desktop with no camera)
      isForPin ? handlePinSubmit(undefined) : proceedWithCheckIn(undefined);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
    setIsPinCameraOpen(false);
  };

  const proceedWithCheckIn = async (photoData?: string) => {
    setLastPhotoData(photoData);
    setIsProcessing(true);
    const result = await onToggleCheckIn(photoData, punchType, punchNote, statusOverride);
    setIsProcessing(false);
    if (result && !result.success) {
      if (result.geoError) setGeoError(result.geoError);
      else if (result.error) {
        if (result.error.startsWith("missed_punchout:")) {
          setMissedPunchType('out');
          setMissedPunchDate(result.error.split(":")[1]);
          setRequestSubmitted(false);
        } else {
          alert(result.error);
        }
      }
    }
  };

  const handleCaptureAndCheckIn = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const MAX_WIDTH = 400;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > MAX_WIDTH) { h = Math.floor(h * (MAX_WIDTH / w)); w = MAX_WIDTH; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const photoData = canvas.toDataURL("image/jpeg", 0.55);
    stopCamera();
    await proceedWithCheckIn(photoData);
  };

  const handleSubmitMissedPunchRequest = async () => {
    if (!missedPunchDate) return;
    setIsSubmittingRequest(true);
    try {
      await submitMissedPunchRequest(currentUser.id, missedPunchDate, missedPunchType, missedPunchReason);
      if (missedPunchType === 'in') {
        // Start active attendance session so employee can complete their 8 hours and punch out
        await onToggleCheckIn(undefined, 'in_office', `[Missed Punch-In: ${missedPunchReason}]`);
      }
      setRequestSubmitted(true);
    } catch (err: any) {
      alert("Failed to submit: " + (err.message || JSON.stringify(err)));
    } finally { setIsSubmittingRequest(false); }
  };

  const handlePinSubmit = async (photoData?: string) => {
    setIsPinning(true);
    const result = await onAddPin(pinType, pinLabel, photoData);
    setIsPinning(false);
    if (result.success) { setIsPinModalOpen(false); setPinLabel(""); }
    else alert(result.error || "Failed to pin location");
  };

  const handleCaptureAndPin = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL("image/jpeg", 0.55);
    stopCamera();
    await handlePinSubmit(photoData);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.date === todayStr);
  const latestCheckIn = todayLogs[todayLogs.length - 1];
  const hasCheckedOutToday = !!(latestCheckIn && latestCheckIn.checkOutTime !== null);
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const presentDays = attendanceRecords.filter(r => r.date.startsWith(currentMonthStr) && r.status === "present").length;
  const sickLeft = leaveBalance.sick.allowed - leaveBalance.sick.taken;
  const casualLeft = leaveBalance.casual.allowed - leaveBalance.casual.taken;
  let totalLeft = sickLeft + casualLeft;
  if (leaveBalance.maternity) totalLeft += leaveBalance.maternity.allowed - leaveBalance.maternity.taken;
  if (leaveBalance.paternity) totalLeft += leaveBalance.paternity.allowed - leaveBalance.paternity.taken;
  const todayWorkedSecs = logs.filter(l => l.date === todayStr && l.checkOutTime !== null).reduce((acc, log) => {
    if (log.checkInTime && log.checkOutTime) {
      const [h1,m1,s1] = log.checkInTime.split(":").map(Number);
      const [h2,m2,s2] = log.checkOutTime.split(":").map(Number);
      return acc + ((h2*3600+m2*60+s2)-(h1*3600+m1*60+s1));
    } return acc;
  }, 0);
  const todayWorkedHrs = (todayWorkedSecs / 3600).toFixed(2);
  const latestPayslip = payslips[0];
  const formattedSalary = latestPayslip
    ? new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(latestPayslip.basicPay+latestPayslip.allowances.reduce((a,x)=>a+x.amount,0)-latestPayslip.deductions.reduce((a,x)=>a+x.amount,0))
    : "₹28,450";
  const salaryMonth = latestPayslip ? (language==="te"?"నికర జీతం":`Net Salary`) : "Net Salary";

  const monthlyEarlyExits = attendanceRecords.filter(r => 
    r.date.startsWith(currentMonthStr) && 
    (r.status === 'half-day' || (r.punchNote && r.punchNote.includes('Early Exit')))
  ).length;

  const shiftWindow = getShiftPunchInWindow(todayShift);
  const isShiftLate = !isCheckedIn && !hasCheckedOutToday && currentUser.status !== 'inactive' && shiftWindow.isLate;

  const handlePunchButtonClick = () => {
    if (currentUser.status === 'inactive' || hasCheckedOutToday) return;

    if (!isCheckedIn) {
      if (shiftWindow.isLate) {
        setMissedPunchType('in');
        setMissedPunchDate(todayStr);
        setMissedPunchReason('');
        setRequestSubmitted(false);
        return;
      }
    }

    if (isCheckedIn) {
      // Check if punching out before 8 full hours
      const checkInTime = latestCheckIn?.checkInTime;
      let isEarly = false;
      if (checkInTime) {
        const now = new Date();
        const [h, m, s] = checkInTime.split(':').map(Number);
        const inDate = new Date();
        inDate.setHours(h, m, s || 0, 0);
        const workedHrs = (now.getTime() - inDate.getTime()) / (1000 * 3600);
        if (workedHrs < 8.0) {
          isEarly = true;
        }
      }

      if (isEarly) {
        setIsHalfDayEarly(monthlyEarlyExits >= 2);
        setIsEarlyPunchModalOpen(true);
        return;
      }
    }

    startCamera(false);
  };

  const handleConfirmEarlyPunchOut = () => {
    if (!earlyReason.trim()) {
      alert(language === 'te' ? 'దయచేసి ముందుగా వెళ్ళడానికి సరైన కారణాన్ని నమోదు చేయండి.' : 'Please enter a mandatory reason for early departure.');
      return;
    }

    const exitNum = monthlyEarlyExits + 1;
    const isPenaltyHalfDay = monthlyEarlyExits >= 2 || isHalfDayEarly;
    const note = `[Early Exit #${exitNum}: ${earlyReason.trim()}]`;

    setPunchNote(prev => prev ? `${prev} | ${note}` : note);
    if (isPenaltyHalfDay) {
      setStatusOverride('half-day');
    }

    setIsEarlyPunchModalOpen(false);
    startCamera(false);
  };

  return (
    <div id="dashboard-snapshot-container" className="space-y-6 sm:space-y-8 animate-fadeIn">
      <TickerAlert employees={[currentUser]} />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div id="today-status-snap" className="lg:col-span-8 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-4 text-center sm:text-left">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {currentUser.status === 'inactive' ? (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                    {language === 'te' ? 'ఖాతా నిలిపివేయబడింది (Deactivated)' : 'Account Deactivated'}
                  </span>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isCheckedIn?"bg-teal-100 text-teal-700 animate-pulse":"bg-slate-100 text-slate-500"}`}>
                    {isCheckedIn?(language==="te"?"పనిలో ఉన్నారు":"Active Now"):(language==="te"?"హాజరు కాలేదు":"Not Checked-In")}
                  </span>
                )}
                {currentUser.status !== 'inactive' && (
                  todayShift ? (
                    todayShift.shiftLabel === 'Off' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Weekly Off
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {todayShift.shiftLabel} ({todayShift.shiftStart} - {todayShift.shiftEnd}{todayShift.isOvernight ? ' +1' : ''})
                      </span>
                    )
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200/60">
                      Regular Hours (09:00 - 17:00)
                    </span>
                  )
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mt-3 leading-tight">
                {currentUser.status === 'inactive'
                  ? (language === 'te' ? 'అకౌంట్ నిలిపివేయబడింది' : 'Account Inactive')
                  : (isCheckedIn ? t.checkedIn : t.checkedOut)}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {currentUser.status === 'inactive'
                  ? (language === 'te' 
                      ? 'మీ అకౌంట్ అడ్మినిస్ట్రేషన్ ద్వారా నిలిపివేయబడింది. హాజరు పంచ్ రికార్డ్ చేయడం సాధ్యపడదు.' 
                      : 'Your account has been deactivated by administration. Attendance punches cannot be recorded.')
                  : isCheckedIn
                    ? `${language==="te"?"మీరు విజయవంతంగా లోపలికి వచ్చారు":"You are checked in"} (${latestCheckIn?.checkInTime||""})`
                    : hasCheckedOutToday
                      ? (language==="te"?"ఈ రోజు మీ షిఫ్ట్ ముగిసింది":"You have completed your shift for today.")
                      : todayShift?.shiftLabel==='Off'
                        ? (language==="te"?"ఈ రోజు మీకు సెలవు (వీక్లీ ఆఫ్)":"Today is your scheduled weekly off day.")
                        : isShiftLate
                          ? (language === 'te'
                              ? `⚠️ షిఫ్ట్ పంచ్-ఇన్ సమయం (${shiftWindow.cutoffTime}) దాటిపోయింది. దయచేసి మిస్డ్ పంచ్ అప్లై చేసి పని ప్రారంభించండి.`
                              : `⚠️ Punch-in cutoff (${shiftWindow.cutoffTime}) expired. Apply Missed Punch to start shift.`)
                          : (language==="te"?"మీ హాజరును ఇప్పుడే రికార్డ్ చేయండి":"Tap to register your shift presence today.")}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-4">
              {todayShift?.shiftLabel === 'Off' ? (
                [{label:"Schedule",val:"Weekly Off"},{label:"Worked Today",val:isCheckedIn?"Live Running":`${todayWorkedHrs} hrs`},{label:"Duty Status",val:"Scheduled Off"}].map(item=>(
                  <div key={item.label} className="text-center bg-slate-50 px-4 py-2 rounded-xl min-w-[100px]">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">{item.label}</p>
                    <p className="text-xs font-bold text-slate-700">{item.val}</p>
                  </div>
                ))
              ) : (
                [{label:"Shift Start",val:latestCheckIn?.checkInTime || todayShift?.shiftStart || "09:00 AM"},{label:"Worked Today",val:isCheckedIn?"Live Running":`${todayWorkedHrs} hrs`},{label:"Shift Stops",val:latestCheckIn?.checkOutTime || todayShift?.shiftEnd || "05:00 PM"}].map(item=>(
                  <div key={item.label} className="text-center bg-slate-50 px-4 py-2 rounded-xl min-w-[100px]">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">{item.label}</p>
                    <p className="text-xs font-bold text-slate-700">{item.val}</p>
                  </div>
                ))
              )}
            </div>
            {isCheckedIn && currentUser.status !== 'inactive' && (
              <div className="mt-6 flex justify-center sm:justify-start">
                <button onClick={()=>setIsPinModalOpen(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-colors active:scale-95 border border-slate-200">
                  <MapPin className="w-4 h-4 text-rose-500"/>
                  {language==="te"?"లొకేషన్ పిన్ చేయండి":"Pin Location Now"}
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <button 
              id="go-to-checkin-tab" 
              onClick={hasCheckedOutToday || currentUser.status === 'inactive' ? undefined : handlePunchButtonClick} 
              disabled={hasCheckedOutToday || isProcessing || currentUser.status === 'inactive'} 
              className={`w-40 h-40 rounded-full border-[12px] flex flex-col items-center justify-center text-white transition-all duration-300 relative ${
                currentUser.status === 'inactive' || hasCheckedOutToday
                  ? "border-slate-100 bg-slate-300 cursor-not-allowed"
                  : isShiftLate
                    ? "border-amber-100 bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-200 active:scale-95 cursor-pointer"
                    : isCheckedIn
                      ? "border-rose-50 bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-200 active:scale-95 cursor-pointer"
                      : "border-teal-50 bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-100 active:scale-95 cursor-pointer"
              }`}
            >
              {isProcessing ? (
                <span className="text-xs font-bold animate-pulse">Processing...</span>
              ) : currentUser.status === 'inactive' ? (
                <>
                  <span className="font-black uppercase tracking-tighter text-xs text-center px-2">Deactivated</span>
                  <span className="text-[9px] opacity-80 mt-1">నిలిపివేయబడింది</span>
                </>
              ) : isShiftLate ? (
                <>
                  <Lock className="w-6 h-6 mb-1 text-white animate-pulse" />
                  <span className="font-black uppercase tracking-tighter text-xs">Window Closed</span>
                  <span className="text-[9px] opacity-90 mt-0.5">Apply Missed Punch</span>
                </>
              ) : (
                <>
                  <span className="font-black uppercase tracking-tighter text-sm">{hasCheckedOutToday?"Completed":isCheckedIn?"Punch Out":"Punch In"}</span>
                  <span className="text-[10px] opacity-80 mt-1">{hasCheckedOutToday?"పూర్తయింది":isCheckedIn?"వెళ్ళిపోండి":"లోపలికి రండి"}</span>
                </>
              )}
            </button>

            {/* Desktop System Terminal Punch Option (No Camera) */}
            {!isCheckedIn && !hasCheckedOutToday && currentUser.status !== 'inactive' && (
              <button
                type="button"
                onClick={() => {
                  if (shiftWindow.isLate) {
                    setMissedPunchType('in');
                    setMissedPunchDate(todayStr);
                    setMissedPunchReason('');
                    setRequestSubmitted(false);
                    return;
                  }
                  setIsSystemModalOpen(true);
                }}
                className={`mt-3 text-[11px] font-semibold flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  shiftWindow.isLate 
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                    : 'text-slate-500 hover:text-teal-700 bg-slate-50 hover:bg-slate-100 border-slate-200/80'
                }`}
              >
                {shiftWindow.isLate ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Monitor className="w-3.5 h-3.5 text-teal-600" />}
                <span>
                  {shiftWindow.isLate
                    ? (language === 'te' ? '🔒 సమయం దాటింది - మిస్డ్ పంచ్ అప్లై చేయండి' : '🔒 Cutoff Expired - Apply Missed Punch')
                    : (language === 'te' ? '🖥️ సిస్టమ్ పంచ్-ఇన్ (నో కెమెరా)' : '🖥️ System Punch-in (No Camera)')}
                </span>
              </button>
            )}
          </div>
        </div>

        {pins.filter(p=>p.date===todayStr).length>0&&(<div className="lg:col-span-12"><LocationPinTimeline language={language} pins={pins.filter(p=>p.date===todayStr)}/></div>)}

        <div id="leaves-balance-snap" onClick={()=>setActiveTab("leave")} className="lg:col-span-4 bg-teal-600 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-lg shadow-teal-100/50 min-h-[250px] cursor-pointer group hover:bg-teal-700 transition-all duration-300">
          <div className="relative z-10"><h3 className="text-lg font-bold tracking-tight">{t.snapLeaveTitle}</h3><p className="text-teal-100 text-xs">సెలవు నిల్వ</p></div>
          <div className="relative z-10 flex items-baseline gap-1.5 my-3"><span className="text-6xl font-black leading-none">{totalLeft.toString().padStart(2,"0")}</span><span className="text-teal-100 uppercase text-xs font-bold tracking-wider">{t.leaveLeftOf.split(" ")[0]}</span></div>
          <div className="relative z-10 bg-white/10 rounded-2xl p-4 flex justify-between items-center text-xs"><div><p className="font-semibold">{t.leaveSick.split(" ")[0]}: {sickLeft} days</p><p className="opacity-70 mt-0.5 italic">{t.btnSubmitLeave.split(" ")[0]}</p></div><div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:translate-x-1.5 transition-all">→</div></div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-teal-500 rounded-full opacity-40 pointer-events-none"/>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">{t.attendance}</h4>
              <span className="text-teal-600 font-bold text-xs uppercase">{new Date().toLocaleString("en-IN",{month:"long",year:"numeric"}).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-end gap-2.5 h-24 my-4">
              {[40,70,55,80,65].map((h,i)=>(<div key={i} className="flex-1 bg-slate-100 rounded-t-lg hover:bg-slate-200 transition-colors" style={{height:`${h}%`}}/>))}
              <div className="flex-1 bg-teal-500 rounded-t-lg h-full shadow-md shadow-teal-500/20"/>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">{language==="te"?`ఈ నెలలో మీరు ${presentDays} రోజులు పనికి హాజరయ్యారు.`:`You have been recorded present for ${presentDays} days this month.`}</p>
            <button onClick={()=>setActiveTab("attendance")} className="mt-4 text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer">{language==="te"?"హాజరు షీట్ చూడండి":"View Full Sheet"}</button>
          </div>
        </div>
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-6"><h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">{t.payroll}</h4><button onClick={()=>setActiveTab("payroll")} className="text-teal-600 font-bold text-xs underline cursor-pointer hover:text-teal-700">View PDF</button></div>
            <div className="py-2"><p className="text-xs text-slate-400 mb-1">{salaryMonth}</p><p className="text-3xl font-black text-slate-800 tracking-tighter">{formattedSalary}</p></div>
          </div>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex gap-3 items-start"><div className="text-amber-600 shrink-0 mt-0.5"><Sparkles className="w-4 h-4 fill-amber-500 text-amber-500"/></div><p className="text-[10px] text-amber-800 leading-tight font-medium">{language==="te"?"మీ జీతం బ్యాంక్ ఖాతాకు నేరుగా జమ చేయబడింది.":"Credited directly via bank transfer."}</p></div>
            <button onClick={()=>setActiveTab("payroll")} className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center">{language==="te"?"జీతం రశీదు తెరవండి":"Open Salary Slips"}</button>
          </div>
        </div>
      </section>

      {/* Camera Modal — Punch In/Out */}
      {isCameraOpen&&(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Camera className="w-5 h-5 text-teal-600"/>{language==="te"?"ఫోటో తీయండి":isCheckedIn?"Photo Punch-Out":"Photo Punch-In"}</h3>
              <button onClick={stopCamera} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
            </div>
            <div className="relative bg-black aspect-video"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/><canvas ref={canvasRef} className="hidden"/><div className="absolute inset-0 border-4 border-teal-500/30 m-4 rounded-xl pointer-events-none"/></div>
            <div className="p-6 flex flex-col items-center gap-4">
              {!isCheckedIn&&(<div className="w-full"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.selectPunchType||"Punch Category"}</label><div className="grid grid-cols-2 gap-3">{(["in_office","out_of_office"] as const).map(pt=>(<button key={pt} onClick={()=>setPunchType(pt)} className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${punchType===pt?"border-teal-500 bg-teal-50 text-teal-700":"border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}>{pt==="in_office"?(t.punchTypeInOffice||"In Office"):(t.punchTypeOutOfOffice||"Medical Camp")}</button>))}</div></div>)}
              {punchType==="out_of_office"&&!isCheckedIn&&(<div className="w-full"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{language==="te"?"లొకేషన్ నోట్":"Location Note (Required)"}</label><input type="text" value={punchNote} onChange={e=>setPunchNote(e.target.value)} placeholder={language==="te"?"మీరు ఎక్కడ ఉన్నారో రాయండి...":"e.g. Medical Camp, Field Visit..."} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"/></div>)}
              <p className="text-xs text-slate-500 text-center">{language==="te"?"హాజరు నమోదు చేయడానికి దయచేసి మీ ఫోటో తీయండి.":"Please capture your photo to record attendance."}</p>
              <button onClick={()=>{if(punchType==="out_of_office"&&!isCheckedIn&&!punchNote.trim()){alert(language==="te"?"దయచేసి ఒక నోట్ రాయండి.":"Please enter a location note.");return;}handleCaptureAndCheckIn();}} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 w-full justify-center active:scale-95"><Camera className="w-5 h-5"/>{language==="te"?(isCheckedIn?"ఫోటో తీసి పంచ్ అవుట్ చేయండి":"ఫోటో తీసి పంచ్ ఇన్ చేయండి"):(isCheckedIn?"Capture & Punch Out":"Capture & Punch In")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal — Pin Location */}
      {isPinCameraOpen&&(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Camera className="w-5 h-5 text-teal-600"/>{language==="te"?"పిన్ ఫోటో":"Pin Photo"}</h3><button onClick={stopCamera} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button></div>
            <div className="relative bg-black aspect-video"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/><canvas ref={canvasRef} className="hidden"/><div className="absolute inset-0 border-4 border-teal-500/30 m-4 rounded-xl pointer-events-none"/></div>
            <div className="p-6"><button onClick={handleCaptureAndPin} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 w-full justify-center active:scale-95"><Camera className="w-5 h-5"/>{language==="te"?"ఫోటో తీయండి":"Capture & Pin"}</button></div>
          </div>
        </div>
      )}

      {/* Early Punch-Out Modal */}
      {isEarlyPunchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {language === 'te' ? 'ముందుగా పంచ్ అవుట్ (Early Exit)' : 'Early Punch-Out Detected'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'te' ? 'పూర్తి 8 గంటల పని సమయం పూర్తికాలేదు' : 'Full 8-hour shift has not yet elapsed'}
                </p>
              </div>
            </div>

            {/* Shift Progress Warning */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Shift Requirement: 8.0 hrs</span>
                <span className="font-mono text-teal-600 font-bold">Checked in: {latestCheckIn?.checkInTime}</span>
              </div>
              
              {/* Strike Counter Notice */}
              <div className={`p-3 rounded-xl border text-xs font-medium ${
                monthlyEarlyExits < 2 
                  ? 'bg-amber-50/70 text-amber-800 border-amber-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {monthlyEarlyExits < 2 ? (
                  <p>
                    <span className="font-bold">Occurrence {monthlyEarlyExits + 1} of 3 (Grace Period):</span>{' '}
                    {language === 'te' 
                      ? 'నెలలో మొదటి 2 సార్లు ముందుగా వెళ్ళేందుకు అనుమతి ఉంది. తప్పనిసరి కారణం తెలియజేయాలి.' 
                      : 'Permitted with mandatory explanation. Grace period applies for the first 2 occurrences.'}
                  </p>
                ) : monthlyEarlyExits === 2 ? (
                  <p>
                    <span className="font-bold">⚠️ 3rd Occurrence Alert:</span>{' '}
                    {language === 'te' 
                      ? 'ఇది ఈ నెలలో మీ 3వ ముందస్తు నిష్క్రమణ! ఈ రోజు హాజరు "హాఫ్-డే లీవ్" (0.5 రోజు కట్) గా నమోదు చేయబడుతుంది.' 
                      : 'This is your 3rd early exit this month. Your attendance today will be recorded as Half-Day (0.5 day deduction).'}
                  </p>
                ) : (
                  <p>
                    <span className="font-bold">⚠️ Exceeded 3 Early Exits ({monthlyEarlyExits} previously):</span>{' '}
                    {language === 'te' 
                      ? 'పరిమితి మించిన ప్రతి ముందస్తు నిష్క్రమణకు "హాఫ్-డే లీవ్" (0.5 రోజు కట్) వర్తిస్తుంది.' 
                      : 'Every subsequent early departure is recorded as a Half-Day (0.5 day deduction).'}
                  </p>
                )}
              </div>
            </div>

            {/* Mandatory Reason Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {language === 'te' ? 'ముందుగా వెళ్ళడానికి గల కారణం (తప్పనిసరి) *' : 'Reason for Early Departure (Mandatory) *'}
              </label>
              <textarea
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder={language === 'te' ? 'కారణం రాయండి (ఉదా: అత్యవసర వైద్య పరిస్థితి, అనుమతి తీసుకున్నది...)' : 'Please state reason (e.g. medical appointment, personal emergency...)'}
                rows={3}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>

            {/* Half-Day Option Checkbox */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="half-day-early-checkbox"
                checked={isHalfDayEarly || monthlyEarlyExits >= 2}
                disabled={monthlyEarlyExits >= 2}
                onChange={(e) => setIsHalfDayEarly(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:opacity-70"
              />
              <label htmlFor="half-day-early-checkbox" className="text-xs text-slate-700 cursor-pointer font-medium">
                <span className="font-bold text-slate-800">
                  {language === 'te' ? 'హాఫ్-డే లీవ్‌గా గుర్తించండి (Half Day)' : 'Mark as Half-Day Leave'}
                </span>
                {monthlyEarlyExits >= 2 && (
                  <span className="block text-[10px] text-rose-500 font-semibold">
                    (Mandatory per 3rd occurrence policy)
                  </span>
                )}
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEarlyPunchModalOpen(false);
                  setEarlyReason("");
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs uppercase cursor-pointer"
              >
                {language === 'te' ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmEarlyPunchOut}
                disabled={!earlyReason.trim()}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-xs uppercase cursor-pointer shadow-md shadow-teal-600/20"
              >
                {language === 'te' ? 'ధృవీకరించండి' : 'Confirm & Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missed Punch Modal (In and Out) */}
      {missedPunchDate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            {!requestSubmitted ? (
              <>
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  {missedPunchType === 'in' 
                    ? (language === 'te' ? 'పంచ్-ఇన్ సమయం మించిపోయింది' : 'Missed Punch-In Request')
                    : (language === 'te' ? 'పంచ్ అవుట్ మిస్ అయింది' : 'Missed Punch-Out Detected')}
                </h3>
                <p className="text-sm text-slate-500 text-left bg-amber-50 rounded-xl p-3 border border-amber-100">
                  {missedPunchType === 'in'
                    ? (language === 'te' 
                        ? `మీ షిఫ్ట్ ప్రారంభ సమయం కంటే 30 నిమిషాలు దాటినందున డైరెక్ట్ పంచ్-ఇన్ లాక్ చేయబడింది. దయచేసి కారణంతో మిస్డ్ పంచ్ అప్లై చేసి 8 గంటల పని ప్రారంభించండి.` 
                        : `The 30-minute punch-in window from your shift start has expired. Please apply with a clear mandatory reason to begin your 8-hour shift.`)
                    : (language === 'te' 
                        ? `మీరు ${missedPunchDate} న పంచ్ అవుట్ చేయలేదు. దయచేసి అడ్మిన్‌కు అభ్యర్థన సమర్పించండి.` 
                        : `You did not punch out on ${missedPunchDate}. Please submit a request to Admin.`)}
                </p>
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'te' ? 'కారణం (తప్పనిసరి) *' : 'Reason (Mandatory) *'}
                  </label>
                  <textarea
                    value={missedPunchReason}
                    onChange={(e) => setMissedPunchReason(e.target.value)}
                    placeholder={missedPunchType === 'in' 
                      ? (language === 'te' ? 'ఆలస్యానికి గల కారణం రాయండి...' : 'State reason (e.g. traffic delay, emergency work, forgot to punch)...')
                      : (language === 'te' ? 'ఉదా: అత్యవసర పరిస్థితి వలన పంచ్ అవుట్ చేయలేదు...' : 'e.g. Emergency departure, forgotten punch out...')}
                    rows={3}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setMissedPunchDate(null);
                      setMissedPunchReason("");
                    }}
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
                        : (language === 'te' ? 'అభ్యర్థన పంపు' : 'Submit Request')}
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
                  {language === 'te' ? 'అభ్యర్థన పంపబడింది!' : 'Request Submitted!'}
                </h3>
                <p className="text-sm text-slate-500">
                  {missedPunchType === 'in'
                    ? (language === 'te' 
                        ? 'మీ మిస్డ్ పంచ్-ఇన్ అభ్యర్థన నమోదు చేయబడింది మరియు షిఫ్ట్ ప్రారంభించబడింది. దయచేసి 8 గంటలు పూర్తిచేసి తప్పనిసరిగా పంచ్ అవుట్ చేయండి.' 
                        : 'Your missed punch-in request has been logged and your attendance session is live! Please complete your 8 hours and compulsorily punch out.')
                    : (language === 'te' 
                        ? 'మీ అభ్యర్థన అడ్మిన్‌కు పంపబడింది. ఆమోదించబడిన తర్వాత సాధారణంగా పంచ్ ఇన్ చేయవచ్చు.' 
                        : 'Your request has been sent to Admin. Once approved, you can punch in normally.')}
                </p>
                <button
                  onClick={() => {
                    setMissedPunchDate(null);
                    setMissedPunchReason("");
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

      {/* Geo-fence Error Modal with Camp Duty Option */}
      {geoError && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {language === 'te' ? 'ఆఫీస్ పరిధికి వెలుపల ఉన్నారు' : 'Outside Office Boundary'}
            </h3>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
              {geoError.nearestOfficeName === "No configured locations"
                ? "No Office Locations configured."
                : `You are ${geoError.distance}m away from ${geoError.nearestOfficeName}.`}
            </p>

            <div className="text-left bg-teal-50/60 p-4 rounded-2xl border border-teal-100 space-y-3">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>{language === 'te' ? 'మెడికల్ క్యాంప్ లేదా ఫీల్డ్ డ్యూటీ లో ఉన్నారా?' : 'On duty at a Medical Camp or Field Visit?'}</span>
              </div>
              <p className="text-[11px] text-teal-700 leading-relaxed">
                {language === 'te' 
                  ? 'క్యాంప్ లేదా ఫీల్డ్ వర్క్ లో ఉన్నప్పుడు ఇక్కడ కారణం రాసి పంచ్ ఇన్ చేయవచ్చు. ఇది అడ్మిన్‌కు వెంటనే నోటిఫై చేయబడుతుంది.' 
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

      {/* System Terminal Punch-in Modal (Desktop / No Camera) */}
      {isSystemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
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
                  if (shiftWindow.isLate) {
                    alert(language === 'te' 
                      ? `షిఫ్ట్ పంచ్-ఇన్ సమయం (${shiftWindow.cutoffTime}) దాటిపోయింది. దయచేసి మిస్డ్ పంచ్ అప్లై చేయండి.`
                      : `The 30-minute punch-in window from your shift start has expired (${shiftWindow.cutoffTime}). Please apply for a Missed Punch.`);
                    setIsSystemModalOpen(false);
                    setMissedPunchType('in');
                    setMissedPunchDate(todayStr);
                    setMissedPunchReason('');
                    return;
                  }
                  // Generate canvas badge
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
                    ctx.fillText(`EMP: ${currentUser.name} (${currentUser.id})`, 20, 65);
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

      {/* Pin Location Modal */}
      {isPinModalOpen&&(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-500"/>{language==="te"?"లొకేషన్ పిన్ చేయండి":"Pin Current Location"}</h3><button onClick={()=>setIsPinModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-700 mb-2">{language==="te"?"పిన్ రకం":"Pin Type"}</label><select value={pinType} onChange={e=>setPinType(e.target.value as import("../types").PinType)} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"><option value="field_visit">Field Visit / ఫీల్డ్ విజిట్</option><option value="medical_camp">Medical Camp / మెడికల్ క్యాంప్</option><option value="client_site">Client Site / క్లయింట్ సైట్</option><option value="delivery">Delivery / డెలివరీ</option><option value="other">Other / ఇతర</option></select></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-2">{language==="te"?"వివరాలు (ఐచ్ఛికం)":"Label (Optional)"}</label><input type="text" value={pinLabel} onChange={e=>setPinLabel(e.target.value)} placeholder={language==="te"?"ఉదా: గాజువాక క్యాంప్":"e.g. Gajuwaka Medical Camp"} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"/></div>
              <div className="pt-2 flex flex-col gap-3">
                <button onClick={()=>startCamera(true)} disabled={isPinning} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"><Camera className="w-4 h-4"/>{isPinning?"Processing...":(language==="te"?"ఫోటోతో పిన్ చేయండి":"Capture Photo & Pin")}</button>
                <button onClick={()=>handlePinSubmit(undefined)} disabled={isPinning} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50">{language==="te"?"ఫోటో లేకుండా పిన్ చేయండి":"Skip Photo & Pin"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
