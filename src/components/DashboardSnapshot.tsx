import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight, Home, Calendar, Moon, Landmark, Receipt, Camera, X } from 'lucide-react';
import { Language, CheckInLog, AttendanceRecord, LeaveBalance, Payslip, Invoice } from '../types';
import { translations } from '../translations';

interface DashboardSnapshotProps {
  language: Language;
  isCheckedIn: boolean;
  logs: CheckInLog[];
  attendanceRecords: AttendanceRecord[];
  leaveBalance: LeaveBalance;
  payslips: Payslip[];
  invoices: Invoice[];
  setActiveTab: (tab: string) => void;
  onToggleCheckIn: (photoData?: string) => void;
}

export default function DashboardSnapshot({
  language,
  isCheckedIn,
  logs,
  attendanceRecords,
  leaveBalance,
  payslips,
  invoices,
  setActiveTab,
  onToggleCheckIn
}: DashboardSnapshotProps) {
  const t = translations[language];

  // Camera State
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

  // Find today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === todayStr);
  const latestCheckIn = todayLogs[todayLogs.length - 1];
  const hasCheckedOutToday = latestCheckIn && latestCheckIn.checkOutTime !== null;

  // Calculate stats for current month (July 2026)
  const currentMonthRecords = attendanceRecords.filter(r => r.date.startsWith('2026-07'));
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
    <div id="dashboard-snapshot-container" className="space-y-8">
      
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
              {hasCheckedOutToday ? "Completed" : isCheckedIn ? "Check Out" : "Check In"}
            </span>
            <span className="text-[10px] opacity-80 mt-1">
              {hasCheckedOutToday ? "పూర్తయింది" : isCheckedIn ? "వెళ్ళిపోండి" : "లోపలికి రండి"}
            </span>
          </button>
        </div>

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

      {/* 2. Second Row: Section with Attendance chart, Payroll summary, Invoices list */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
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

        {/* CARD 3: Invoices widget */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">{t.invoice}</h4>
              <span className="text-[10px] bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-500 font-bold uppercase tracking-wider">
                {invoices.length} TOTAL
              </span>
            </div>

            {/* Invoices list snippet */}
            <div className="space-y-3 mt-4">
              {invoices.slice(0, 2).map((inv, idx) => {
                const totalAmt = inv.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
                const taxAmt = Math.round(totalAmt * (inv.taxPercent / 100));
                const finalAmt = totalAmt + taxAmt;
                const formattedAmt = new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0
                }).format(finalAmt);

                return (
                  <div 
                    key={inv.id} 
                    onClick={() => setActiveTab('invoice')}
                    className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        INV
                      </div>
                      <div className="text-[11px] leading-tight">
                        <p className="font-bold text-slate-800">{inv.clientName.slice(0, 15)}</p>
                        <p className="text-slate-400 mt-0.5">{inv.invoiceNumber} • {formattedAmt}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                );
              })}
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('invoice')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold mt-4 hover:shadow-sm active:scale-95 transition-all cursor-pointer text-center"
          >
            + {language === 'te' ? "కొత్త బిల్లు సృష్టించు" : "New Invoice"}
          </button>
        </div>

      </section>

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
