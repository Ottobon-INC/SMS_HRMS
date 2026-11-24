import React, { useState, useEffect } from 'react';
import { FileWarning, CheckCircle, XCircle, AlertCircle, Clock, Calendar, Briefcase } from 'lucide-react';
import { Language, Employee, MissedPunchRequest } from '../types';
import { translations } from '../translations';
import { fetchMissedPunchRequests, approveMissedPunchRequest, rejectMissedPunchRequest } from '../lib/services/missed-punch-service';
import { supabase } from '../lib/supabase-client';
import { DB_TABLES } from '../core/database.tables';

interface AdminMissedPunchesProps {
  language: Language;
  employees: Employee[];
  adminId: string;
}

interface RosterShiftInfo {
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
}

export default function AdminMissedPunches({ language, employees, adminId }: AdminMissedPunchesProps) {
  const t = translations[language];
  const [missedRequests, setMissedRequests] = useState<MissedPunchRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [rosterShiftsMap, setRosterShiftsMap] = useState<Record<string, RosterShiftInfo>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectingRequest, setRejectingRequest] = useState<MissedPunchRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    loadMissedRequests();
  }, []);

  const loadMissedRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await fetchMissedPunchRequests();
      setMissedRequests(data);

      if (data.length > 0) {
        const dates = Array.from(new Set(data.map(d => d.missedDate)));
        const { data: rosterShifts } = await supabase
          .from(DB_TABLES.DUTY_ROSTER)
          .select('employee_id, shift_date, shift_start, shift_end, shift_label')
          .in('shift_date', dates);

        const map: Record<string, RosterShiftInfo> = {};
        (rosterShifts || []).forEach((s: any) => {
          map[`${s.employee_id}_${s.shift_date}`] = {
            shiftLabel: s.shift_label || 'Assigned Shift',
            shiftStart: s.shift_start ? s.shift_start.slice(0, 5) : '09:00',
            shiftEnd: s.shift_end ? s.shift_end.slice(0, 5) : '18:00'
          };
        });
        setRosterShiftsMap(map);
      }
    } catch (err) {
      console.error('Failed to load missed punch requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const formatAppliedAt = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      const time = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      const date = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
      return `${time} (${date})`;
    } catch {
      return null;
    }
  };

  const getShiftInfo = (empId: string, date: string): RosterShiftInfo => {
    return rosterShiftsMap[`${empId}_${date}`] || {
      shiftLabel: 'General Shift',
      shiftStart: '09:00',
      shiftEnd: '18:00'
    };
  };

  const handleDirectApprove = async (req: MissedPunchRequest) => {
    setProcessingId(req.id);
    const shiftInfo = getShiftInfo(req.employeeId, req.missedDate);
    try {
      await approveMissedPunchRequest(
        req.id,
        req.employeeId,
        req.missedDate,
        req.punchType,
        adminId,
        {
          createdAt: req.createdAt,
          scheduledShift: shiftInfo,
          adminNote: language === 'te' 
            ? `అడ్మిన్ ద్వారా ఆమోదించబడింది (${shiftInfo.shiftLabel})` 
            : `Approved by admin (${shiftInfo.shiftLabel})`
        }
      );
      await loadMissedRequests();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (req: MissedPunchRequest) => {
    setRejectingRequest(req);
    setRejectNote('');
  };

  const closeRejectModal = () => {
    setRejectingRequest(null);
    setRejectNote('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsRejecting(true);
    try {
      await rejectMissedPunchRequest(
        rejectingRequest.id,
        adminId,
        rejectNote || (language === 'te' ? 'అడ్మిన్ తిరస్కరించారు' : 'Rejected by admin')
      );
      closeRejectModal();
      await loadMissedRequests();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setIsRejecting(false);
    }
  };

  const getEmployee = (empId: string) => {
    return employees.find(e => e.id === empId);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <FileWarning className="w-6 h-6 text-amber-500" />
            {language === 'te' ? 'మిస్ అయిన పంచ్ అభ్యర్థనలు' : 'Missed Punch Requests'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' 
              ? 'ఉద్యోగులు సమర్పించిన పెండింగ్ మిస్డ్ పంచ్-ఇన్ మరియు పంచ్-అవుట్ అభ్యర్థనలను సమీక్షించండి.' 
              : 'Review and 1-click approve missed punch-in and punch-out requests submitted by employees.'}
          </p>
        </div>
        <button
          onClick={loadMissedRequests}
          className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
        >
          {language === 'te' ? 'రిఫ్రెష్' : 'Refresh'}
        </button>
      </div>

      {/* Policy Card */}
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-2 text-amber-800">
            <FileWarning className="w-4 h-4 text-amber-600" />
            <span>{language === 'te' ? 'మిస్డ్ పంచ్ కటింగ్ నిబంధనలు (Missed Punch Policy):' : 'Missed Punch Deduction Policy:'}</span>
          </div>
          <p className="text-amber-700 leading-relaxed">
            {language === 'te'
              ? '1 మరియు 2 మిస్డ్ పంచ్‌లు: ఉచితం / గ్రేస్ (₹0). 3వ మిస్డ్ పంచ్ నుండి ప్రతి ఒక్క మిస్డ్ పంచ్‌కు నేరుగా 0.5 రోజు (హాఫ్-డే) కట్ అవుతుంది (బఫర్ పీరియడ్ లేదు).'
              : '1st & 2nd missed punches: Free / Grace (₹0). From the 3rd missed punch onwards, every single missed punch directly incurs a 0.5 day (Half-Day) deduction.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono shrink-0">
          <span className="bg-white/80 border border-amber-200 px-2.5 py-1 rounded-lg">1–2: ₹0 (Grace)</span>
          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg font-bold">3+: 0.5 Cut / punch</span>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        {isLoadingRequests ? (
          <div className="py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
            Loading...
          </div>
        ) : missedRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
            {language === 'te' ? 'పెండింగ్ అభ్యర్థనలు లేవు' : 'No missed punch requests'}
          </div>
        ) : (
          <div className="space-y-4">
            {missedRequests.map(req => {
              const emp = getEmployee(req.employeeId);
              const empName = emp?.name || req.employeeId;
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const isRejected = req.status === 'rejected';
              const dayRecord = emp?.attendanceRecords?.find(r => r.date === req.missedDate);
              const dayLog = emp?.checkInLogs?.find(l => l.date === req.missedDate);
              const hasCheckIn = !!(dayRecord?.checkInTime || dayLog?.checkInTime);
              const isInvalidOut = req.punchType === 'out' && (!hasCheckIn || dayRecord?.status === 'leave' || dayRecord?.status === 'absent');
              const shift = getShiftInfo(req.employeeId, req.missedDate);
              const appliedTimeStr = formatAppliedAt(req.createdAt);
              const isProcessingThis = processingId === req.id;

              return (
                <div key={req.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border rounded-2xl gap-4 transition-all ${
                  isPending ? 'bg-amber-50/30 border-amber-200' : 
                  isApproved ? 'bg-emerald-50/20 border-emerald-100' : 'bg-rose-50/20 border-rose-100'
                }`}>
                  <div className="space-y-2 flex-1">
                    {/* Employee & Badges Header */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h4 className="text-sm font-bold text-slate-800">{empName}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">({req.employeeId})</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        req.punchType === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {req.punchType === 'in' ? 'PUNCH-IN' : 'PUNCH-OUT'}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isPending ? 'bg-amber-100 text-amber-700' : 
                        isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    {/* Shift & Time Details Bar */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>
                          {language === 'te' ? 'షిఫ్ట్:' : 'Shift:'} <strong className="text-slate-800">{shift.shiftLabel}</strong> ({shift.shiftStart} - {shift.shiftEnd})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {language === 'te' ? 'తేదీ:' : 'Date:'} <strong className="text-slate-700 font-mono">{req.missedDate}</strong>
                        </span>
                      </div>

                      {appliedTimeStr && (
                        <div className="flex items-center gap-1.5 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-lg border border-teal-200/60 font-medium">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>
                            {language === 'te' ? 'దరఖాస్తు సమయం:' : 'Applied At:'} <strong>{appliedTimeStr}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Invalid Punch Out warning */}
                    {isInvalidOut && (
                      <p className="text-[10px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 font-semibold inline-block">
                        ⚠️ {language === 'te' 
                          ? `ఉద్యోగి ఈ తేదీన సెలవు/రాలేదు (${dayRecord?.status?.toUpperCase() || 'హాజరు రికార్డు లేదు'}). పంచ్-అవుట్ వర్తించదు.` 
                          : `Employee was on ${dayRecord?.status?.toUpperCase() || 'NO PUNCH-IN'} on this date. Punch-out is not applicable.`}
                      </p>
                    )}

                    {/* Reason */}
                    {req.reason && (
                      <p className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="font-bold text-slate-700">{language === 'te' ? 'కారణం:' : 'Reason:'}</span> {req.reason}
                      </p>
                    )}

                    {/* Admin Note if resolved */}
                    {req.adminNote && !isPending && (
                      <p className="text-[11px] text-slate-500 italic">
                        Note: {req.adminNote}
                      </p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  {isPending && (
                    <div className="flex gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => openRejectModal(req)}
                        disabled={isProcessingThis}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> {language === 'te' ? 'తిరస్కరించు' : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleDirectApprove(req)}
                        disabled={isInvalidOut || isProcessingThis}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {isProcessingThis 
                            ? (language === 'te' ? 'ఆమోదిస్తోంది...' : 'Approving...') 
                            : (language === 'te' ? 'ఆమోదించు' : 'Approve')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              {language === 'te' ? 'అభ్యర్థన తిరస్కరించండి' : 'Reject Request'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {getEmployee(rejectingRequest.employeeId)?.name || rejectingRequest.employeeId} — {rejectingRequest.missedDate} ({rejectingRequest.punchType.toUpperCase()})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {language === 'te' ? 'తిరస్కరణ కారణం (ఐచ్ఛికం)' : 'Rejection Reason (Optional)'}
                </label>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder={language === 'te' ? 'ఉదా: డ్యూటీకి హాజరు కాలేదు...' : 'e.g., Not present on duty / Invalid reason...'}
                  rows={3}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeRejectModal}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors text-xs uppercase tracking-wider"
                >
                  {language === 'te' ? 'రద్దు' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={isRejecting}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md disabled:opacity-50"
                >
                  {isRejecting ? '...' : (language === 'te' ? 'ఖరారు చేయి' : 'Confirm Reject')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
