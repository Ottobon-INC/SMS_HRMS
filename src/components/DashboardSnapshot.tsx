import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight, Home, Calendar, Moon, Landmark, Receipt, Camera, X, MapPin, AlertCircle } from 'lucide-react';
import { Language, CheckInLog, AttendanceRecord, LeaveBalance, Payslip, Employee } from '../types';
import { translations } from '../translations';
import LocationPinTimeline from './LocationPinTimeline';
import TickerAlert from './TickerAlert';
import { submitMissedPunchRequest } from '../lib/services/missed-punch-service';

interface DashboardSnapshotProps {
  language: Language;
  currentUser: Employee;
  isCheckedIn: boolean;
  logs: CheckInLog[];
  attendanceRecords: AttendanceRecord[];
  leaveBalance: LeaveBalance;
  payslips: Payslip[];
  setActiveTab: (tab: string) => void;
  onToggleCheckIn: (photoData?: string, punchType?: import('../types').PunchType, punchNote?: string) => Promise<{success: boolean, geoError?: any, error?: string} | void>;
  pins: import('../types').LocationPin[];
  onAddPin: (pinType: import('../types').PinType, label?: string, photoData?: string) => Promise<{ success: boolean; error?: string }>;
}

export default function DashboardSnapshot({
  language,
  currentUser,
  isCheckedIn,
  logs,
  attendanceRecords,
  leaveBalance,
  payslips,
  setActiveTab,
  onToggleCheckIn,
  pins,
  onAddPin
}: DashboardSnapshotProps) {
  const t = translations[language];

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [geoError, setGeoError] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [punchType, setPunchType] = useState<import('../types').PunchType>('in_office');
  const [punchNote, setPunchNote] = useState('');
  const [missedPunchDate, setMissedPunchDate] = useState<string | null>(null);
  const [missedPunchReason, setMissedPunchReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleSubmitMissedPunchRequest = async () => {
    if (!missedPunchDate) return;
    setIsSubmittingRequest(true);
    try {
      await submitMissedPunchRequest(currentUser.id, missedPunchDate, 'out', missedPunchReason);
      setRequestSubmitted(true);
    } catch (err: any) {
      alert('Failed to submit request: ' + (err.message || JSON.stringify(err)));
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Pin states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinType, setPinType] = useState<import('../types').PinType>('field_visit');
  const [pinLabel, setPinLabel] = useState('');
  const [isPinCameraOpen, setIsPinCameraOpen] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const startCamera = async (isForPin: boolean = false) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available");
      }
      // Open modal first so the video element mounts
      if (isForPin) {
        setIsPinCameraOpen(true);
      } else {
        setIsCameraOpen(true);
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
      } catch (firstErr: any) {
        if (firstErr.name === 'NotAllowedError') {
          throw firstErr;
        }
        console.warn("First camera attempt failed, retrying...", firstErr);
        await new Promise(resolve => setTimeout(resolve, 800));
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
      }
      streamRef.current = stream;
      
      // Give React a moment to render the modal and attach the ref
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err: any) {
      console.error("Camera access denied or unavailable", err);
      const errorMessage = err.name === 'NotAllowedError' ? 'Permission denied' : (err.message || 'Unknown error');
      alert(language === 'te' ? `కెమెరా అందుబాటులో లేదు (${errorMessage}). ఫోటో లేకుండా ముందుకు వెళ్తాము.` : `Camera unavailable (${errorMessage}). Proceeding without photo.`);
      if (isForPin) {
        setIsPinCameraOpen(false);
        handlePinSubmit(undefined);
      } else {
        setIsCameraOpen(false);
        const result = await onToggleCheckIn(undefined, punchType, punchNote); // Fallback check-in
        if (result && !result.success) {
          if (result.geoError) {
            setGeoError(result.geoError);
          } else if (result.error) {
            if (result.error.startsWith('missed_punchout:')) {
              setMissedPunchDate(result.error.split(':')[1]);
            } else if (result.error.startsWith('pending_request:')) {
              const d = result.error.split(':')[1];
              alert(language === 'te' 
                ? `మీరు ఇప్పటికే ${d} తేదీ కోసం మిస్ పంచ్ అభ్యర్థనను సమర్పించారు. అడ్మిన్ ఆమోదం కోసం దయచేసి వేచి ఉండండి.` 
                : `You already submitted a mispunch request for ${d}. Please wait for admin approval.`);
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
      // Calculate downscaled dimensions (max 480px width)
      const MAX_WIDTH = 480;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > MAX_WIDTH) {
        height = Math.floor(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        // Use lower quality JPEG to shrink size massively
        const photoData = canvas.toDataURL('image/jpeg', 0.6);
        stopCamera();
        
        setIsProcessing(true);
        const result = await onToggleCheckIn(photoData, punchType, punchNote);
        setIsProcessing(false);
        
        if (result && !result.success) {
          if (result.geoError) {
            setGeoError(result.geoError);
          } else if (result.error) {
            if (result.error.startsWith('missed_punchout:')) {
              setMissedPunchDate(result.error.split(':')[1]);
            } else if (result.error.startsWith('pending_request:')) {
              const d = result.error.split(':')[1];
              alert(language === 'te' 
                ? `మీరు ఇప్పటికే ${d} తేదీ కోసం మిస్ పంచ్ అభ్యర్థనను సమర్పించారు. అడ్మిన్ ఆమోదం కోసం దయచేసి వేచి ఉండండి.` 
                : `You already submitted a mispunch request for ${d}. Please wait for admin approval.`);
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
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        stopCamera();
        await handlePinSubmit(photoData);
      }
    }
  };

  const handleMainButtonClick = () => {
    startCamera(false);
  };

  // Find today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === todayStr);
  const latestCheckIn = todayLogs[todayLogs.length - 1];
  const hasCheckedOutToday = latestCheckIn && latestCheckIn.checkOutTime !== null;

  // Calculate stats for current month dynamically
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthRecords = attendanceRecords.filter(r => r.date.startsWith(currentMonthStr));
  const presentDays = currentMonthRecords.filter(r => r.status === 'present').length;
  const absentDays = currentMonthRecords.filter(r => r.status === 'absent').length;
  const halfDays = currentMonthRecords.filter(r => r.status === 'half-day').length;
  const leavesTaken = currentMonthRecords.filter(r => r.status === 'leave').length;

  // Calculate leave balance details
  const sickLeft = leaveBalance.sick.allowed - leaveBalance.sick.taken;
  const casualLeft = leaveBalance.casual.allowed - leaveBalance.casual.taken;
  let totalLeft = sickLeft + casualLeft;
  if (leaveBalance.maternity) {
    totalLeft += leaveBalance.maternity.allowed - leaveBalance.maternity.taken;
  }
  if (leaveBalance.paternity) {
    totalLeft += leaveBalance.paternity.allowed - leaveBalance.paternity.taken;
  }

  // Calculate cumulative today's total worked hours
  const todayWorkedSecs = logs
    .filter(l => l.date === todayStr && l.checkOutTime !== null)
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
  
  const todayWorkedHrs = (todayWorkedSecs / 3600).toFixed(2);

  // Latest payslip amount (e.g. May 2026 or June 2026)
  const latestPayslip = payslips[0];
  const formattedSalary = latestPayslip
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(latestPayslip.basicPay + latestPayslip.allowances.reduce((acc, a) => acc + a.amount, 0) - latestPayslip.deductions.reduce((acc, d) => acc + d.amount, 0))
    : '₹28,450';

  const salaryMonth = latestPayslip
    ? (language === 'te' ? 'నికర జీతం' : `${latestPayslip.month.split('-')[1] === '06' ? 'June' : 'May'} Net Salary`)
    : 'May Net Salary';

  return (
    <div id="dashboard-snapshot-container" className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Ticker Alerts for Employee */}
      <TickerAlert employees={[currentUser]} />

      {/* 1. First Row: Section with Checked-In Hero & Leave Balance */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COL-SPAN-8: Active Check-In Banner */}
        <div 
          id="today-status-snap" 
          className="lg:col-span-8 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-4 text-center sm:text-left">
            <div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isCheckedIn 
                  ? 'bg-teal-100 text-teal-700 animate-pulse' 
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {isCheckedIn ? (language === 'te' ? "పనిలో ఉన్నారు" : "Active Now") : (language === 'te' ? "హాజరు కాలేదు" : "Not Checked-In")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mt-3 leading-tight">
                {isCheckedIn ? t.checkedIn : t.checkedOut}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {isCheckedIn 
                  ? `${language === 'te' ? 'మీరు విజయవంతంగా లోపలికి వచ్చారు' : 'You are checked in'} (${latestCheckIn?.checkInTime || ''})`
                  : hasCheckedOutToday 
                    ? (language === 'te' ? 'ఈ రోజు మీ షిఫ్ట్ ముగిసింది' : 'You have completed your shift for today.')
                    : (language === 'te' ? 'మీ హాజరును ఇప్పుడే రికార్డ్ చేయండి' : 'Tap to register your shift presence today.')
                }
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-4">
              <div className="text-center bg-slate-50 px-4 py-2 rounded-xl min-w-[100px]">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Shift Start</p>
                <p className="text-xs font-bold text-slate-700">{latestCheckIn?.checkInTime || "09:00 AM"}</p>
              </div>
              <div className="text-center bg-slate-50 px-4 py-2 rounded-xl min-w-[100px]">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Worked Today</p>
                <p className="text-xs font-bold text-slate-700">
                  {isCheckedIn ? "Live Running" : `${todayWorkedHrs} hrs`}
                </p>
              </div>
              <div className="text-center bg-slate-50 px-4 py-2 rounded-xl min-w-[100px]">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Shift Stops</p>
                <p className="text-xs font-bold text-slate-700">{latestCheckIn?.checkOutTime || "Pending"}</p>
              </div>
            </div>

            {isCheckedIn && (
              <div className="mt-6 flex justify-center sm:justify-start">
                <button
                  onClick={() => setIsPinModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-colors active:scale-95 border border-slate-200"
                >
                  <MapPin className="w-4 h-4 text-rose-500" />
                  {language === 'te' ? 'లొకేషన్ పిన్ చేయండి' : 'Pin Location Now'}
                </button>
              </div>
            )}
          </div>

          <button
            id="go-to-checkin-tab"
            onClick={hasCheckedOutToday ? undefined : handleMainButtonClick}
            disabled={hasCheckedOutToday}
            className={`w-40 h-40 rounded-full border-[12px] flex flex-col items-center justify-center text-white group transition-all duration-300 ${
              hasCheckedOutToday
                ? 'border-slate-100 bg-slate-300 cursor-not-allowed shadow-none'
                : isCheckedIn 
                  ? 'border-rose-50 bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-200 active:scale-95 cursor-pointer' 
                  : 'border-teal-50 bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-100 active:scale-95 cursor-pointer'
            }`}
          >
            <span className="font-black uppercase tracking-tighter text-sm">
              {hasCheckedOutToday ? "Completed" : isCheckedIn ? "Punch Out" : "Punch In"}
            </span>
            <span className="text-[10px] opacity-80 mt-1">
              {hasCheckedOutToday ? "పూర్తయింది" : isCheckedIn ? "వెళ్ళిపోండి" : "లోపలికి రండి"}
            </span>
            {isProcessing && (
              <span className="absolute -top-2 -right-2 flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-teal-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* Location Pin History - Display below check in section if they have pins today */}
        {pins.filter(p => p.date === todayStr).length > 0 && (
          <div className="lg:col-span-12">
            <LocationPinTimeline language={language} pins={pins.filter(p => p.date === todayStr)} />
          </div>
        )}

        {/* COL-SPAN-4: Solid Teal Leave Balance Box */}
        <div 
          id="leaves-balance-snap"
          onClick={() => setActiveTab('leave')}
          className="lg:col-span-4 bg-teal-600 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-lg shadow-teal-100/50 min-h-[250px] cursor-pointer group hover:bg-teal-700 transition-all duration-300"
        >
          <div className="relative z-10">
            <h3 className="text-lg font-bold tracking-tight">{t.snapLeaveTitle}</h3>
            <p className="text-teal-100 text-xs">సెలవు నిల్వ</p>
          </div>
          
          <div className="relative z-10 flex items-baseline gap-1.5 my-3">
            <span className="text-6xl font-black leading-none">{totalLeft.toString().padStart(2, '0')}</span>
            <span className="text-teal-100 uppercase text-xs font-bold tracking-wider">{t.leaveLeftOf.split(' ')[0]}</span>
          </div>

          <div className="relative z-10 bg-white/10 rounded-2xl p-4 flex justify-between items-center text-xs">
            <div>
              <p className="font-semibold">{t.leaveSick.split(' ')[0]}: {sickLeft} days</p>
              <p className="opacity-70 mt-0.5 italic">{t.btnSubmitLeave.split(' ')[0]}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:translate-x-1.5 transition-all">
              →
            </div>
          </div>

          {/* Absolute background circle decor */}
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-teal-500 rounded-full opacity-40 pointer-events-none" />
        </div>

      </section>

      {/* 2. Second Row: Section with Attendance chart, Payroll summary */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: Attendance Custom Bar widget */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">{t.attendance}</h4>
              <span className="text-teal-600 font-bold text-xs uppercase">JULY 2026</span>
            </div>

            {/* Aesthetic representation bar chart */}
            <div className="flex justify-between items-end gap-2.5 h-24 my-4">
              <div className="flex-1 bg-slate-100 rounded-t-lg h-[40%] hover:bg-slate-200 transition-colors" />
              <div className="flex-1 bg-slate-100 rounded-t-lg h-[70%] hover:bg-slate-200 transition-colors" />
              <div className="flex-1 bg-slate-100 rounded-t-lg h-[55%] hover:bg-slate-200 transition-colors" />
              <div className="flex-1 bg-slate-100 rounded-t-lg h-[80%] hover:bg-slate-200 transition-colors" />
              <div className="flex-1 bg-slate-100 rounded-t-lg h-[65%] hover:bg-slate-200 transition-colors" />
              <div className="flex-1 bg-teal-500 rounded-t-lg h-full shadow-md shadow-teal-500/20" />
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              {language === 'te' 
                ? `ఈ జూలైలో మీరు ${presentDays} రోజులు పనికి హాజరయ్యారు.` 
                : `You've been recorded present for ${presentDays} days this month.`
              }
            </p>
            <button
              onClick={() => setActiveTab('attendance')}
              className="mt-4 text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              {language === 'te' ? "హాజరు షీట్ చూడండి" : "View Full Sheet"}
            </button>
          </div>
        </div>

        {/* CARD 2: Payroll widget */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">{t.payroll}</h4>
              <button 
                onClick={() => setActiveTab('payroll')} 
                className="text-teal-600 font-bold text-xs underline cursor-pointer hover:text-teal-700"
              >
                View PDF
              </button>
            </div>

            <div className="py-2">
              <p className="text-xs text-slate-400 mb-1">{salaryMonth}</p>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">{formattedSalary}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex gap-3 items-start">
              <div className="text-amber-600 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <p className="text-[10px] text-amber-800 leading-tight font-medium">
                {language === 'te' 
                  ? "మీ జీతం బ్యాంక్ ఖాతాకు నేరుగా జమ చేయబడింది." 
                  : "Credited directly via bank transfer in simple & honest calculations."
                }
              </p>
            </div>
            
            <button
              onClick={() => setActiveTab('payroll')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
            >
              {language === 'te' ? "జీతం రశీదు తెరవండి" : "Open Salary Slips"}
            </button>
          </div>
        </div>

      </section>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-600" />
                {language === 'te' ? "ఫోటో తీయండి" : "Photo Punch-In"}

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
              <div className="w-full mb-6">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t.selectPunchType || "Punch Category"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPunchType('in_office')}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      punchType === 'in_office' 
                        ? 'border-teal-500 bg-teal-50 text-teal-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    {t.punchTypeInOffice || "In Office"}
                  </button>
                  <button
                    onClick={() => setPunchType('out_of_office')}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      punchType === 'out_of_office' 
                        ? 'border-teal-500 bg-teal-50 text-teal-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    {t.punchTypeOutOfOffice || "Medical Camp"}
                  </button>
                </div>
              </div>

              {punchType === 'out_of_office' && (
                <div className="w-full mb-6">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {language === 'te' ? 'లొకేషన్ నోట్ (తప్పనిసరి)' : 'Location Note (Required)'}
                  </label>
                  <input
                    type="text"
                    value={punchNote}
                    onChange={(e) => setPunchNote(e.target.value)}
                    placeholder={language === 'te' ? 'మీరు ఎక్కడ ఉన్నారో రాయండి...' : 'Enter your location (e.g., Medical Camp, Field Visit)...'}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
              )}
              <p className="text-xs text-slate-500 mb-4 text-center">
                {language === 'te' ? "హాజరు నమోదు చేయడానికి దయచేసి మీ ఫోటో తీయండి." : "Please capture your photo to record attendance."}
              </p>
      {/* Missed Punch Out Error Modal */}
      {missedPunchDate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scaleUp">

            {!requestSubmitted ? (
              <>
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  {language === 'te' ? 'పంచ్ అవుట్ మిస్ అయింది' : 'Missed Punch-Out Detected'}
                </h3>
                <p className="text-sm text-slate-500 text-left bg-amber-50 rounded-xl p-3 border border-amber-100">
                  {language === 'te'
                    ? `మీరు ${missedPunchDate} న పంచ్ అవుట్ చేయలేదు. అడ్మిన్ అనుమతి వచ్చిన తర్వాత మాత్రమే పంచ్ ఇన్ చేయవచ్చు.`
                    : `You did not punch out on ${missedPunchDate}. To punch in today, please submit a request to Admin to close that session.`
                  }
                </p>

                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'te' ? 'కారణం (ఐచ్ఛికం)' : 'Reason (Optional)'}
                  </label>
                  <textarea
                    value={missedPunchReason}
                    onChange={(e) => setMissedPunchReason(e.target.value)}
                    placeholder={language === 'te' ? 'ఉదా: అత్యవసర పరిస్థితి కారణంగా వెళ్ళిపోయాను' : 'e.g. Had an emergency and forgot to punch out'}
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
                    disabled={isSubmittingRequest}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md disabled:opacity-60"
                  >
                    {isSubmittingRequest
                      ? (language === 'te' ? 'పంపుతున్నారు...' : 'Submitting...')
                      : (language === 'te' ? 'అడ్మిన్‌కు అభ్యర్థించు' : 'Request Admin Access')
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
                  {language === 'te'
                    ? 'మీ అభ్యర్థన అడ్మిన్‌కు పంపబడింది. అప్రూవ్ అయిన తర్వాత మీరు పంచ్ ఇన్ చేయవచ్చు.'
                    : 'Your request has been sent to Admin. Once approved, you can punch in normally.'
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
              <button
                onClick={() => {
                  if (punchType === 'out_of_office' && !punchNote.trim()) {
                    alert(language === 'te' ? 'దయచేసి ఒక నోట్ రాయండి.' : 'Please enter a note.');
                    return;
                  }
                  handleCaptureAndCheckIn();
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-teal-500/25 transition-all flex items-center gap-2 w-full justify-center active:scale-95"
              >
                <Camera className="w-5 h-5" />
                {language === 'te' ? "ఫోటో తీసి పంచ్ ఇన్ చేయండి" : "Capture & Punch In"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missed Punch Out Error Modal */}
      {missedPunchDate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scaleUp">
      
            {!requestSubmitted ? (
              <>
                {/* Warning Header */}
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  {language === 'te' ? 'పంచ్ అవుట్ మిస్ అయింది' : 'Missed Punch-Out Detected'}
                </h3>
                <p className="text-sm text-slate-500 text-left bg-amber-50 rounded-xl p-3 border border-amber-100">
                  {language === 'te'
                    ? `మీరు ${missedPunchDate} న పంచ్ అవుట్ చేయలేదు. అడ్మిన్ అనుమతి వచ్చిన తర్వాత మాత్రమే పంచ్ ఇన్ చేయవచ్చు.`
                    : `You did not punch out on ${missedPunchDate}. To punch in today, please submit a request to Admin to close that session.`
                  }
                </p>
      
                {/* Reason Input */}
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'te' ? 'కారణం (ఐచ్ఛికం)' : 'Reason (Optional)'}
                  </label>
                  <textarea
                    value={missedPunchReason}
                    onChange={(e) => setMissedPunchReason(e.target.value)}
                    placeholder={language === 'te' ? 'ఉదా: అత్యవసర పరిస్థితి కారణంగా వెళ్ళిపోయాను' : 'e.g. Had an emergency and forgot to punch out'}
                    rows={3}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
      
                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setMissedPunchDate(null); setMissedPunchReason(''); }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs uppercase tracking-wider"
                  >
                    {language === 'te' ? 'రద్దు' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSubmitMissedPunchRequest}
                    disabled={isSubmittingRequest}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md disabled:opacity-60"
                  >
                    {isSubmittingRequest
                      ? (language === 'te' ? 'పంపుతున్నారు...' : 'Submitting...')
                      : (language === 'te' ? 'అడ్మిన్‌కు అభ్యర్థించు' : 'Request Admin Access')
                    }
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
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
                  {language === 'te'
                    ? 'మీ అభ్యర్థన అడ్మిన్‌కు పంపబడింది. అప్రూవ్ అయిన తర్వాత మీరు పంచ్ ఇన్ చేయవచ్చు.'
                    : 'Your request has been sent to Admin. Once approved, you can punch in normally.'
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

      {/* Geo-fence Error Modal */}
      {geoError && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Outside Allowed Area</h3>
              <p className="text-sm text-slate-500">
                {geoError.nearestOfficeName === "No configured locations"
                  ? "Punch-in failed because no Office Locations have been configured in the system yet. Please configure an Office Location first."
                  : `You are currently ${geoError.distance} meters away from ${geoError.nearestOfficeName}. You must be within the allowed radius to punch in.`
                }
              </p>
            </div>
            <button
              onClick={() => setGeoError(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors uppercase tracking-wider text-xs"
            >
              Okay
            </button>
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
                  onChange={(e) => setPinType(e.target.value as import('../types').PinType)}
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
    </div>
  );
}
