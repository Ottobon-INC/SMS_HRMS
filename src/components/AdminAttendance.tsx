import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, AlertCircle, ArrowLeft, Users, Check, Moon, HelpCircle, MapPin, Clock, FileWarning, CheckCircle, XCircle } from 'lucide-react';
import { Language, Employee, AttendanceStatus, MissedPunchRequest } from '../types';
import { translations } from '../translations';
import { generateMonthOptions, formatMonth } from '../lib/utils';
import LocationPinTimeline from './LocationPinTimeline';

interface AdminAttendanceProps {
  language: Language;
  employees: Employee[];
  onUpdateAttendance: (empId: string, date: string, status: AttendanceStatus) => void;
  onForceCloseSession?: (empId: string, date: string, time?: string) => void;
}

export default function AdminAttendance({ language, employees, onUpdateAttendance, onForceCloseSession }: AdminAttendanceProps) {
  const t = translations[language];

  // Filters
  const monthOptions = generateMonthOptions(2018, 1);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0] || '2026-07');
  const [editTarget, setEditTarget] = useState<{ empId: string, date: string, status: AttendanceStatus | 'blank' } | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Live timer for tracking hours today
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const calculateLiveHours = (emp: Employee) => {
    const todayLogs = emp.checkInLogs?.filter(l => l.date === todayStr) || [];
    if (todayLogs.length === 0) return null;

    let totalSecs = 0;
    let isCurrentlyActive = false;

    todayLogs.forEach(log => {
      if (log.checkInTime) {
        const [h1, m1, s1] = log.checkInTime.split(':').map(Number);
        const sec1 = h1 * 3600 + m1 * 60 + s1;
        let sec2 = 0;
        if (log.checkOutTime) {
          const [h2, m2, s2] = log.checkOutTime.split(':').map(Number);
          sec2 = h2 * 3600 + m2 * 60 + s2;
        } else {
          isCurrentlyActive = true;
          sec2 = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        }
        if (sec2 > sec1) {
          totalSecs += (sec2 - sec1);
        }
      }
    });

    if (totalSecs <= 0) return null;

    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);

    return {
      text: `${h}h ${m}m`,
      isActive: isCurrentlyActive
    };
  };

  // Calculate statistics for today across the active team (excluding inactive employees)
  const totalEmployees = employees.filter(e => e.role !== 'admin' && e.status !== 'inactive').length;
  const inactiveCount = employees.filter(e => e.role !== 'admin' && e.status === 'inactive').length;

  const presentToday = employees.filter(e => {
    if (e.role === 'admin' || e.status === 'inactive') return false;
    const todayRec = (e.attendanceRecords || []).find(r => r.date === todayStr);
    return e.isCheckedIn || (todayRec && todayRec.status === 'present');
  }).length;

  const leaveToday = employees.filter(e => {
    if (e.role === 'admin' || e.status === 'inactive') return false;
    const todayRec = (e.attendanceRecords || []).find(r => r.date === todayStr);
    return todayRec && todayRec.status === 'leave';
  }).length;

  const absentToday = Math.max(0, totalEmployees - presentToday - leaveToday);

  // Filter employees for the selected month:
  // Active employees are always shown.
  // Inactive employees are hidden from current & upcoming months unless 'showInactive' is checked.
  // In past months, inactive employees are shown only if they actually worked / have attendance records in that month.
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const displayedEmployees = employees.filter(emp => {
    if (emp.role === 'admin') return false;
    if (emp.status !== 'inactive') return true;
    if (showInactive) return true;
    // Current or future month: hide inactive employees
    if (selectedMonth >= currentMonthStr) return false;
    // Past month: only show if they actually have attendance records recorded in this month
    return (emp.attendanceRecords || []).some(r => r.date.startsWith(selectedMonth));
  });

  // Generate days in the selected month
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1; // 0-indexed
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const formatDayNum = (dayNum: number) => {
    return `${selectedMonth}-${dayNum < 10 ? '0' + dayNum : dayNum}`;
  };

  const statusColors: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-500 text-white',
    absent: 'bg-rose-500 text-white',
    'half-day': 'bg-amber-500 text-white',
    leave: 'bg-blue-500 text-white',
    holiday: 'bg-slate-100 text-slate-400',
    mispunch: 'bg-purple-500 text-white',
    weekoff: 'bg-slate-200 text-slate-500'
  };

  const localizedText = {
    en: {
      title: "Company-Wide Attendance Grid",
      subtitle: "Track staff availability and monthly participation rates across all departments.",
      statsHeader: "Today's Status Board",
      matrixHeader: "Attendance Matrix",
      activeTeam: "Active Team",
      presentToday: "Present Today",
      onLeaveToday: "On Leave Today",
      absentToday: "Absent/No Show",
      employeeCol: "Employee Name",
      legendTitle: "Color Legend",
      legendPresent: "Present",
      legendAbsent: "Absent",
      legendHalf: "Half Day",
      legendLeave: "Approved Leave",
      legendHoliday: "Weekend/Holiday",
    },
    te: {
      title: "కంపెనీ హాజరు నివేదిక",
      subtitle: "ఉద్యోగుల రోజువారీ హాజరు మరియు నెలవారీ హాజరు గ్రిడ్ సమాచారం ఇక్కడ చూడండి.",
      statsHeader: "ఈరోజు హాజరు సారాంశం",
      matrixHeader: "హాజరు గ్రిడ్ వివరాలు",
      activeTeam: "కంపెనీ సిబ్బంది",
      presentToday: "ఈరోజు వచ్చినవారు",
      onLeaveToday: "సెలవులో ఉన్నవారు",
      absentToday: "హాజరుకాని వారు",
      employeeCol: "ఉద్యోగి పేరు",
      legendTitle: "రంగుల వివరణ (Legend)",
      legendPresent: "హాజరయ్యారు",
      legendAbsent: "రాలేదు (Absent)",
      legendHalf: "హాఫ్ డే (Half Day)",
      legendLeave: "సెలవు (Approved Leave)",
      legendHoliday: "వీకెండ్ / సెలవుదినం",
    }
  }[language];

  return (
    <div id="admin-attendance-container" className="space-y-6 animate-fadeIn">

      {/* 1. Header */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            {localizedText.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {localizedText.subtitle}
          </p>
        </div>

        {/* Month Picker Selector */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            {t.monthSelector || "Select Month"}:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/10 cursor-pointer"
          >
            {monthOptions.map(month => (
              <option key={month} value={month}>
                {formatMonth(month, language)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Today's Dashboard Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Staff */}
        <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{localizedText.activeTeam}</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-800">{totalEmployees.toString().padStart(2, '0')}</span>
            <span className="text-xs text-slate-400">{language === 'te' ? 'సిబ్బంది' : 'members'}</span>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-[24px] p-5 shadow-sm">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">{localizedText.presentToday}</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-emerald-800">{(presentToday).toString().padStart(2, '0')}</span>
            <span className="text-xs text-emerald-500">/ {totalEmployees}</span>
          </div>
        </div>

        {/* Leave Today */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-[24px] p-5 shadow-sm">
          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">{localizedText.onLeaveToday}</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-blue-800">{leaveToday.toString().padStart(2, '0')}</span>
            <span className="text-xs text-blue-500">{language === 'te' ? 'సెలవు' : 'leaves'}</span>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-[24px] p-5 shadow-sm">
          <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider block">{localizedText.absentToday}</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-rose-800">{absentToday.toString().padStart(2, '0')}</span>
            <span className="text-xs text-rose-500">{language === 'te' ? 'రాలేదు' : 'absent'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        {/* 3. The Grand Matrix Roster */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-800">
            {localizedText.matrixHeader} ({selectedMonth})
          </h3>
          {inactiveCount > 0 && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors w-fit">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded cursor-pointer"
              />
              <span>{language === 'te' ? `ఇన్యాక్టివ్ ఉద్యోగులను చూపించు (${inactiveCount})` : `Show Deactivated Staff (${inactiveCount})`}</span>
            </label>
          )}
        </div>

        {/* Scrollable table container */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 w-44">{localizedText.employeeCol}</th>
                {daysArray.map(dayNum => (
                  <th key={dayNum} className="p-1 text-[10px] font-bold font-mono text-center text-slate-400 w-7">
                    {dayNum.toString().padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysArray.length + 1} className="p-8 text-center text-xs text-slate-400">
                    No active staff attendance records for this month.
                  </td>
                </tr>
              ) : (
                displayedEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50">
                    <td className="p-4 truncate">
                      <p className="text-xs font-bold text-slate-800 leading-none flex items-center gap-1.5">
                        <span className="truncate">{emp.name}</span>
                        {emp.status === 'inactive' && (
                          <span className="text-[8px] bg-slate-100 text-slate-500 border border-slate-200 font-bold px-1.5 py-0.5 rounded shrink-0">
                            Inactive
                          </span>
                        )}
                        {calculateLiveHours(emp) && (
                          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${calculateLiveHours(emp)?.isActive ? 'bg-teal-50 text-teal-600 border-teal-100 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {calculateLiveHours(emp)?.text}
                          </span>
                        )}
                      </p>
                      <span className="text-[9px] text-slate-400 font-medium font-mono mt-1 block">{emp.id}</span>
                    </td>

                    {daysArray.map(dayNum => {
                      const dayStr = formatDayNum(dayNum);
                      const isPastDay = dayStr < todayStr;
                      const isToday = dayStr === todayStr;
                      const isEmployed = !emp.joiningDate || dayStr >= emp.joiningDate;

                      // 1. Existing attendance record
                      const rec = (emp.attendanceRecords || []).find(r => r.date === dayStr);
                      // 2. Check checkInLogs
                      const dayLog = (emp.checkInLogs || []).find(l => l.date === dayStr);
                      // 3. Check approved leave requests
                      const leaveReq = (emp.leaveRequests || []).find(r =>
                        (r.status || '').toLowerCase() === 'approved' && r.fromDate <= dayStr && r.toDate >= dayStr
                      );
                      // 4. Check approved mispunch
                      const mispunchReq = (emp.missedPunchRequests || []).find(m =>
                        (m.status || '').toLowerCase() === 'approved' && m.missedDate === dayStr
                      );
                      // 5. Check Duty Roster Weekoff
                      const rosterShift = (emp.shifts || []).find(s => s.shiftDate === dayStr);
                      const isRosterOff = rosterShift && (rosterShift.shiftLabel === 'Off' || rosterShift.shiftLabel?.toLowerCase().includes('off'));

                      let status: AttendanceStatus | 'blank' = 'blank';

                      if (rec && rec.status) {
                        const inT = rec.checkInTime || dayLog?.checkInTime;
                        const outT = rec.checkOutTime || dayLog?.checkOutTime;
                        let h = dayLog?.totalHours ?? null;
                        if (h === null && inT && outT) {
                          const [ih, im] = inT.split(':').map(Number);
                          const [oh, om] = outT.split(':').map(Number);
                          h = (oh + om / 60) - (ih + im / 60);
                        }
                        // If employee completed 8 hours of work (or >= 7.8 hrs), they are PRESENT
                        if (h !== null && h >= 7.8 && !leaveReq) {
                          status = 'present';
                        } else {
                          status = (rec.status || 'present').toLowerCase() as AttendanceStatus;
                        }
                      } else if (leaveReq) {
                        status = leaveReq.type === 'weekoff' ? 'weekoff' : 'leave';
                      } else if (isRosterOff) {
                        status = 'weekoff';
                      } else if (mispunchReq) {
                        status = 'present';
                      } else if (dayLog && dayLog.checkInTime) {
                        status = dayLog.totalHours && dayLog.totalHours < 4 ? 'half-day' : 'present';
                      } else if (isToday && emp.isCheckedIn) {
                        status = 'present';
                      } else if (isPastDay && isEmployed) {
                        // COMPANY RULE: Unworked past day with no punch/leave/weekoff -> AUTOMATICALLY ABSENT!
                        status = 'absent';
                      }

                      // Render grid square
                      return (
                        <td key={dayNum} className="p-1 text-center" onClick={() => setEditTarget({ empId: emp.id, date: dayStr, status })}>
                          <div
                            className={`w-5 h-5 mx-auto rounded-sm flex items-center justify-center text-[8px] font-bold font-sans cursor-pointer hover:ring-2 hover:ring-teal-400 ${status === 'present' ? 'bg-emerald-500 text-white' :
                                status === 'absent' ? 'bg-rose-500 text-white' :
                                  status === 'leave' ? 'bg-blue-500 text-white' :
                                    status === 'half-day' ? 'bg-amber-500 text-white' :
                                      status === 'mispunch' ? 'bg-purple-500 text-white' :
                                        status === 'weekoff' ? 'bg-slate-200 text-slate-700 font-black' :
                                          'bg-slate-50 text-transparent'
                              }`}
                            title={`${emp.name}: ${dayStr} - ${status.toUpperCase()}`}
                          >
                            {status === 'present' ? 'P' :
                              status === 'absent' ? 'A' :
                                status === 'leave' ? 'L' :
                                  status === 'half-day' ? 'H' :
                                    status === 'mispunch' ? 'M' :
                                      status === 'weekoff' ? 'WO' : '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Color Legend */}
        <div className="pt-4 border-t border-slate-50">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-3">{localizedText.legendTitle}</p>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500 rounded-xs flex items-center justify-center text-[8px] text-white font-black">P</div>
              <span>{localizedText.legendPresent}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-rose-500 rounded-xs flex items-center justify-center text-[8px] text-white font-black">A</div>
              <span>{localizedText.legendAbsent}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded-xs flex items-center justify-center text-[8px] text-white font-black">H</div>
              <span>{localizedText.legendHalf}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-xs flex items-center justify-center text-[8px] text-white font-black">L</div>
              <span>{localizedText.legendLeave}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded-xs flex items-center justify-center text-[8px] text-white font-black">M</div>
              <span>Mispunch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 rounded-xs flex items-center justify-center text-[8px] text-slate-700 font-black">WO</div>
              <span>Weekoff (WO)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Day Inspection & Edit Modal */}
      {editTarget && (() => {
        const emp = employees.find(e => e.id === editTarget.empId);
        if (!emp) return null;

        const log = (emp.checkInLogs || []).find(l => l.date === editTarget.date);
        const rec = (emp.attendanceRecords || []).find(r => r.date === editTarget.date);
        const leaveReq = (emp.leaveRequests || []).find(r =>
          (r.status || '').toLowerCase() === 'approved' && r.fromDate <= editTarget.date && r.toDate >= editTarget.date
        );

        // Shift info lookup
        const assignedShift = (emp.shifts || []).find(s => s.shiftDate === editTarget.date);
        const shiftDisplay = assignedShift
          ? `${assignedShift.shiftLabel || 'Shift'}: ${assignedShift.shiftStart} - ${assignedShift.shiftEnd}`
          : 'Standard Duty Roster';

        const punchInTime = log?.checkInTime || rec?.checkInTime || null;
        const punchOutTime = log?.checkOutTime || rec?.checkOutTime || null;
        let totalHours = log?.totalHours ?? null;
        if (totalHours === null && punchInTime && punchOutTime) {
          const [ih, im] = punchInTime.split(':').map(Number);
          const [oh, om] = punchOutTime.split(':').map(Number);
          totalHours = Math.round(((oh + om / 60) - (ih + im / 60)) * 100) / 100;
        }

        // If employee completed 8 hours of work (or >= 7.8 hrs), they are PRESENT
        const isFullDayWorked = punchInTime && punchOutTime && totalHours !== null && totalHours >= 7.8 && !leaveReq;
        const currentEffectiveStatus = isFullDayWorked ? 'present' : ((editTarget.status || '').toLowerCase() as AttendanceStatus);
        const isOpenSession = punchInTime && !punchOutTime;
        const isAbsent = currentEffectiveStatus === 'absent';
        const isLeave = currentEffectiveStatus === 'leave' || !!leaveReq;
        const isWeekoff = currentEffectiveStatus === 'weekoff' || leaveReq?.type === 'weekoff';

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setEditTarget(null)}>
            <div className="bg-white rounded-[32px] w-full max-w-lg p-6 sm:p-7 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto space-y-5" onClick={e => e.stopPropagation()}>

              {/* Modal Header: Full Employee Profile */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center font-black text-base shrink-0">
                    {emp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span>{emp.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({emp.id})</span>
                    </h3>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="font-medium">{emp.designation}</span>
                      {emp.phone && <span className="text-slate-400">• 📞 {emp.phone}</span>}
                    </p>
                  </div>
                </div>
                <button onClick={() => setEditTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Day & Shift Context Banner */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Selected Date</span>
                  <p className="font-bold text-slate-700 mt-0.5">{editTarget.date}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Shift</span>
                  <p className="font-bold text-teal-700 mt-0.5">{shiftDisplay}</p>
                </div>
              </div>

              {/* Status Rationale & Policy Clarity Banner */}
              {(() => {
                const note = (rec?.punchNote || log?.punchNote || '').trim();
                const lowerNote = note.toLowerCase();

                // 1. Full 8-Hour Shift Completed -> GUARANTEED PRESENT (Zero deduction)
                if (isFullDayWorked) {
                  return (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-1.5 shadow-xs">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-800">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Present — Full 8-Hour Shift Completed</span>
                      </div>
                      <p className="text-emerald-800 text-[11px] leading-relaxed">
                        Employee completed the full mandatory 8-hour shift ({punchInTime} to {punchOutTime}, Total: <strong>{totalHours} hrs</strong>). Standard shift requirement fulfilled with <strong>Zero Salary Deduction (Present)</strong>.
                      </p>
                    </div>
                  );
                }

                if (isAbsent) {
                  return (
                    <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 text-xs text-rose-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Unapproved Absence (Absent)</span>
                      </div>
                      <p className="text-rose-700 text-[11px] leading-relaxed">
                        Employee did not punch in, did not submit a mispunch, and had no approved leave for this date. Under company policy, this incurs a <strong>2-Day Salary Deduction</strong>.
                      </p>
                    </div>
                  );
                }

                if (isLeave) {
                  return (
                    <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Approved Leave: {leaveReq?.type?.toUpperCase() || 'LEAVE'}</span>
                      </div>
                      {leaveReq?.reason && <p className="text-blue-700 text-[11px] italic">"{leaveReq.reason}"</p>}
                    </div>
                  );
                }

                if (isWeekoff) {
                  return (
                    <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-teal-600" /> Scheduled Week Off (Paid)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Approved duty roster rest day — Zero salary deduction.</p>
                    </div>
                  );
                }

                if (currentEffectiveStatus === 'half-day') {
                  const earlyExitMatch = note.match(/\[Early Exit #(\d+):\s*(.*?)\]/i);
                  const missedMatch = note.match(/Missed #(\d+)/i);
                  const isAutoMissed = lowerNote.includes('auto-closed by system (missed punch)') || lowerNote.includes('missed #');
                  const isWorkShortfall = totalHours !== null && totalHours < 8.0;

                  // 1. Early Departure by Occurrence (under 8 hours)
                  if (earlyExitMatch) {
                    const occNum = earlyExitMatch[1];
                    const occReason = earlyExitMatch[2] || 'Not specified';
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2 shadow-xs">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Half-Day Applied: Early Shift Exit #{occNum}</span>
                        </div>
                        <div className="text-amber-800 text-[11px] leading-relaxed space-y-1">
                          <p>
                            Employee punched out at <strong>{punchOutTime || 'early'}</strong> before completing 8 hours of work (logged: <strong>{totalHours || 0} hrs</strong>).
                          </p>
                          <p>
                            <strong>Company Policy:</strong> The 1st and 2nd early exits in a month are Grace (₹0). From the <strong>3rd occurrence onwards</strong>, early departure automatically incurs a <strong>0.5-Day (Half-Day) deduction</strong>.
                          </p>
                          <div className="bg-amber-100/70 p-2 rounded-xl text-[11px] font-mono mt-1 text-amber-900">
                            <strong>Reason Provided:</strong> "{occReason}"
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. Missed Punch Penalty (3rd+ Missed Punch in Month)
                  if (missedMatch || isAutoMissed) {
                    const missedNum = missedMatch ? missedMatch[1] : '3+';
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2 shadow-xs">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Half-Day Penalty: Missed Punch #{missedNum} Exceeded Grace</span>
                        </div>
                        <div className="text-amber-800 text-[11px] leading-relaxed space-y-1">
                          <p>
                            <strong>Company Missed Punch Policy:</strong> The 1st & 2nd missed punches in a month are Grace (₹0 / Present). From the <strong>3rd missed punch onwards</strong>, every missed punch automatically incurs a <strong>0.5-Day (Half-Day) Deduction</strong>.
                          </p>
                          <div className="bg-amber-100/70 p-2 rounded-xl text-[11px] font-mono mt-1 text-amber-900">
                            <strong>Recorded System Note:</strong> {note}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 3. Incomplete Working Shift (< 8 Hours)
                  if (isWorkShortfall) {
                    const shortfallHours = (8 - (totalHours || 0)).toFixed(2);
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2 shadow-xs">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Half-Day Applied: Incomplete Shift ({totalHours} hrs worked)</span>
                        </div>
                        <p className="text-amber-800 text-[11px] leading-relaxed">
                          Standard mandatory shift requirement is 8 hours. Employee logged <strong>{totalHours} hrs</strong> (shortfall of <strong>{shortfallHours} hrs</strong>). Shifts with less than 8 hours of work are recorded as a Half-Day.
                          {note && <span className="block mt-1 font-mono text-[10px] text-amber-700 bg-amber-100/60 p-1.5 rounded">Note: {note}</span>}
                        </p>
                      </div>
                    );
                  }

                  // 4. Admin Manual Override or General Half-Day Note
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5 shadow-xs">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Half-Day Status (0.5 Day Salary Deduction)</span>
                      </div>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        Attendance status is recorded as Half-Day.
                        {note && <span className="block mt-1 font-mono text-[10px] text-amber-700 bg-amber-100/60 p-1.5 rounded">Recorded Note: {note}</span>}
                      </p>
                    </div>
                  );
                }

                // If Status is Present but worked less than 8 hours (e.g. A Satyanarayana 7.81 hrs with Grace Missed #2)
                if (editTarget.status === 'present' && totalHours !== null && totalHours < 8.0 && editTarget.date !== todayStr) {
                  const isGrace = lowerNote.includes('grace') || lowerNote.includes('auto punch-out');
                  return (
                    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 text-xs text-teal-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-teal-800">
                        <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>Present (Work Duration: {totalHours} hrs — Under 8 Hours)</span>
                      </div>
                      <p className="text-teal-700 text-[11px] leading-relaxed">
                        {isGrace ? (
                          <>
                            <strong>Grace Period Applied:</strong> Employee logged {totalHours} hrs (shortfall: {(8 - totalHours).toFixed(2)} hrs). Retained as <strong>Present (₹0 pay cut)</strong> under company grace policy ({note}).
                          </>
                        ) : (
                          <>
                            Employee worked {totalHours} hrs (standard full shift is 8 hours). Shortfall: {(8 - totalHours).toFixed(2)} hrs.
                            {note && <span className="block mt-0.5 font-mono text-[10px] text-teal-600">Note: {note}</span>}
                          </>
                        )}
                      </p>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Punch Activity Cards (Rendered when not absent, leave, or weekoff) */}
              {!isAbsent && !isLeave && !isWeekoff && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* PUNCH IN */}
                    <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" /> Punch-In
                        </span>
                        <span className="text-xs font-mono font-black text-emerald-700">
                          {punchInTime || '--:--'}
                        </span>
                      </div>
                      {log?.photoUrl && (
                        <img src={log.photoUrl} alt="Punch In Proof" className="w-full aspect-video object-cover rounded-xl bg-black/10 shadow-xs" />
                      )}
                      {log?.checkInLocation && (
                        <p className="text-[10px] text-slate-600 leading-tight">📍 {log.checkInLocation}</p>
                      )}
                      {log?.punchNote && (
                        <p className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-100 italic">
                          Note: {log.punchNote}
                        </p>
                      )}
                    </div>

                    {/* PUNCH OUT */}
                    <div className={`p-3.5 rounded-2xl border space-y-2 ${punchOutTime ? 'bg-amber-50/50 border-amber-100' : (editTarget.date === todayStr ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100')}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${punchOutTime ? 'text-amber-800' : (editTarget.date === todayStr ? 'text-emerald-800' : 'text-slate-600')}`}>
                          <MapPin className="w-3 h-3" /> Punch-Out
                        </span>
                        <span className={`text-xs font-mono font-black ${punchOutTime ? 'text-amber-700' : (editTarget.date === todayStr ? 'text-emerald-700 flex items-center gap-1.5' : 'text-slate-500')}`}>
                          {punchOutTime ? punchOutTime : (editTarget.date === todayStr ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              <span>On Duty (Working)</span>
                            </>
                          ) : (
                            'Not Punched'
                          ))}
                        </span>
                      </div>
                      {log?.checkOutPhotoUrl && (
                        <img src={log.checkOutPhotoUrl} alt="Punch Out Proof" className="w-full aspect-video object-cover rounded-xl bg-black/10 shadow-xs" />
                      )}
                      {log?.checkOutLocation && (
                        <p className="text-[10px] text-slate-600 leading-tight">📍 {log.checkOutLocation}</p>
                      )}
                    </div>
                  </div>

                  {/* Hours summary */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600" /> Total Working Duration:
                    </span>
                    <span className="font-bold text-slate-800 font-mono">
                      {totalHours !== null ? `${totalHours} hrs` : (editTarget.date === todayStr && emp.isCheckedIn ? calculateLiveHours(emp)?.text || 'In Progress' : (punchInTime ? 'Session Incomplete' : '0 hrs'))}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Override Buttons */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Update Attendance Status
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['present', 'absent', 'half-day', 'leave', 'weekoff', 'mispunch'] as AttendanceStatus[]).map(statusOption => (
                    <button
                      key={statusOption}
                      onClick={() => {
                        onUpdateAttendance(editTarget.empId, editTarget.date, statusOption);
                        setEditTarget(null);
                      }}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${currentEffectiveStatus === statusOption
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      {statusOption === 'half-day' ? 'Half' : statusOption === 'weekoff' ? 'Weekoff' : statusOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setEditTarget(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase transition-colors text-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
