import React, { useState } from 'react';
import { Calendar, UserCheck, AlertCircle, ArrowLeft, Users, Check, Moon, HelpCircle } from 'lucide-react';
import { Language, Employee, AttendanceStatus } from '../types';
import { translations } from '../translations';

interface AdminAttendanceProps {
  language: Language;
  employees: Employee[];
  onUpdateAttendance: (empId: string, date: string, status: AttendanceStatus) => void;
}

export default function AdminAttendance({ language, employees, onUpdateAttendance }: AdminAttendanceProps) {
  const t = translations[language];

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [editTarget, setEditTarget] = useState<{empId: string, date: string, status: AttendanceStatus | 'blank'} | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate statistics for today across the team
  const totalEmployees = employees.filter(e => e.role !== 'admin').length;
  
  const presentToday = employees.filter(e => {
    if (e.role === 'admin') return false;
    const todayRec = e.attendanceRecords.find(r => r.date === todayStr);
    return e.isCheckedIn || (todayRec && todayRec.status === 'present');
  }).length;

  const leaveToday = employees.filter(e => {
    if (e.role === 'admin') return false;
    const todayRec = e.attendanceRecords.find(r => r.date === todayStr);
    return todayRec && todayRec.status === 'leave';
  }).length;

  const absentToday = Math.max(0, totalEmployees - presentToday - leaveToday);

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
    holiday: 'bg-slate-200 text-slate-400'
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
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
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

      {/* 3. The Grand Matrix Roster */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-800">
          {localizedText.matrixHeader} ({selectedMonth})
        </h3>

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
              {employees
                .filter(emp => emp.role !== 'admin')
                .map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50">
                    <td className="p-4 truncate">
                      <p className="text-xs font-bold text-slate-800 leading-none">{emp.name}</p>
                      <span className="text-[9px] text-slate-400 font-medium font-mono mt-1 block">{emp.id}</span>
                    </td>
                    
                    {daysArray.map(dayNum => {
                      const dayStr = formatDayNum(dayNum);
                      const rec = emp.attendanceRecords.find(r => r.date === dayStr);
                      const status: AttendanceStatus | 'blank' = rec ? rec.status : 'blank';
                      
                      // Render grid square
                      return (
                        <td key={dayNum} className="p-1 text-center" onClick={() => setEditTarget({empId: emp.id, date: dayStr, status})}>
                          <div 
                            className={`w-5 h-5 mx-auto rounded-sm flex items-center justify-center text-[8px] font-bold font-sans cursor-pointer hover:ring-2 hover:ring-teal-400 ${
                              status === 'present' ? 'bg-emerald-500 text-white' :
                              status === 'absent' ? 'bg-rose-500 text-white' :
                              status === 'leave' ? 'bg-blue-500 text-white' :
                              status === 'half-day' ? 'bg-amber-500 text-white' :
                              status === 'holiday' ? 'bg-slate-100 text-slate-400' :
                              'bg-slate-50 text-transparent'
                            }`}
                            title={`${emp.name}: ${dayStr} - ${status.toUpperCase()}`}
                          >
                            {status === 'present' ? 'P' : 
                             status === 'absent' ? 'A' : 
                             status === 'leave' ? 'L' : 
                             status === 'half-day' ? 'H' : 
                             status === 'holiday' ? 'W' : '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
              <div className="w-4 h-4 bg-slate-100 rounded-xs flex items-center justify-center text-[8px] text-slate-400 font-black">W</div>
              <span>{localizedText.legendHoliday}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-xl animate-scaleUp" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-600" />
              Update Attendance
            </h3>
            
            <p className="text-sm font-semibold text-slate-600 mb-4 border-b pb-2">
              {employees.find(e => e.id === editTarget.empId)?.name} • {editTarget.date}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(['present', 'absent', 'half-day', 'leave', 'holiday'] as AttendanceStatus[]).map(statusOption => (
                <button
                  key={statusOption}
                  onClick={() => {
                    onUpdateAttendance(editTarget.empId, editTarget.date, statusOption);
                    setEditTarget(null);
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    editTarget.status === statusOption 
                      ? 'bg-teal-50 border-teal-200 text-teal-700 ring-2 ring-teal-500/20' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{statusOption}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
