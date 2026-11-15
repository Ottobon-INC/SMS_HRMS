import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Moon, CheckCircle2 } from 'lucide-react';
import { Language, DutyRosterShift, ShiftTemplate } from '../types';
import { fetchRoster, fetchShiftTemplates } from '../lib/services/roster-service';
import { PREDEFINED_SHIFTS } from '../lib/constants/shifts';

interface EmployeeRosterProps {
  language: Language;
  employeeId: string;
}

export default function EmployeeRoster({ language, employeeId }: EmployeeRosterProps) {
  // Safe week start calculation using setDate
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay() || 7; // Monday = 1, Sunday = 7
    if (day !== 1) {
      d.setDate(d.getDate() - (day - 1));
    }
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [roster, setRoster] = useState<DutyRosterShift[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>(PREDEFINED_SHIFTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWeekRoster();
  }, [currentWeekStart, employeeId]);

  useEffect(() => {
    loadTemplates();

    const handleRosterUpdated = () => loadWeekRoster();
    const handleShiftsUpdated = () => loadTemplates();

    window.addEventListener('hrms:roster-updated', handleRosterUpdated);
    window.addEventListener('hrms:shifts-updated', handleShiftsUpdated);

    return () => {
      window.removeEventListener('hrms:roster-updated', handleRosterUpdated);
      window.removeEventListener('hrms:shifts-updated', handleShiftsUpdated);
    };
  }, []);

  const loadTemplates = async () => {
    const templates = await fetchShiftTemplates();
    setShiftTemplates(templates);
  };

  const loadWeekRoster = async () => {
    setIsLoading(true);
    const dateStr = currentWeekStart.toLocaleDateString('en-CA');
    const data = await fetchRoster(dateStr);
    // Show shifts for this employee that are active/published
    setRoster(data.filter(s => s.employeeId === employeeId && s.isPublished !== false));
    setIsLoading(false);
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const getShiftForCell = (dateStr: string) => {
    return roster.find(s => s.shiftDate === dateStr);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Panel */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            {language === 'te' ? 'నా డ్యూటీ రోస్టర్' : 'My Duty Roster'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' 
              ? 'ఈ వారం మీ షిఫ్ట్ సమయాలను ఇక్కడ చూడండి (కేటాయించని రోజుల్లో సాధారణ పని గంటలు వర్తిస్తాయి)' 
              : 'Your assigned work shift schedule for the week. Standard hours apply on unassigned days.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button onClick={handlePrevWeek} className="p-2 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer" title="Previous Week">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-1 text-xs font-bold text-slate-700 min-w-[140px] text-center">
            {currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} 
            {' - '}
            {weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
          <button onClick={handleNextWeek} className="p-2 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer" title="Next Week">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-slate-400">Loading your schedule...</div>
        ) : (
          weekDates.map(d => {
            const dateStr = d.toLocaleDateString('en-CA');
            const shift = getShiftForCell(dateStr);
            const template = shift ? shiftTemplates.find(t => t.label === shift.shiftLabel) : null;
            const colorClass = template?.colorClass || (shift?.shiftLabel === 'Off' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-teal-50 text-teal-800 border-teal-200');
            const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

            return (
              <div 
                key={dateStr} 
                className={`bg-white rounded-2xl p-4 border shadow-sm flex flex-col gap-3 relative transition-all ${
                  isToday ? 'border-teal-400 ring-2 ring-teal-400/20 shadow-md' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                {isToday && (
                  <span className="absolute -top-2.5 right-3 bg-teal-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                    Today
                  </span>
                )}
                
                <div className="flex flex-col items-center pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-slate-700">
                    {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center min-h-[90px]">
                  {shift ? (
                    shift.shiftLabel === 'Off' ? (
                      /* Scheduled Off */
                      <div className="w-full flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                        <span className="text-xs font-bold text-center">Weekly Off</span>
                        <span className="text-[10px] opacity-70 mt-1">Scheduled Off Day</span>
                      </div>
                    ) : (
                      /* Assigned Active Shift */
                      <div className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border border-solid ${colorClass}`}>
                        <div className="flex items-center gap-1 justify-center w-full">
                          <span className="text-xs font-bold text-center truncate">{shift.shiftLabel}</span>
                          {shift.isOvernight && <Moon className="w-3 h-3 text-indigo-700 shrink-0" title="Crosses Midnight" />}
                        </div>
                        <div className="flex items-center gap-1 mt-1 opacity-90 font-mono">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="text-[10px] font-bold">
                            {shift.shiftStart} - {shift.shiftEnd}
                            {shift.isOvernight && <span className="text-[8px] font-black ml-1 text-indigo-700">(+1)</span>}
                          </span>
                        </div>
                        {shift.notes && (
                          <span className="text-[9px] opacity-75 mt-1 text-center italic line-clamp-1" title={shift.notes}>
                            {shift.notes}
                          </span>
                        )}
                      </div>
                    )
                  ) : (
                    /* Default Regular Business Hours (Unassigned Day) */
                    <div className="w-full flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-slate-500">
                      <span className="text-[11px] font-bold text-slate-600">Regular Schedule</span>
                      <div className="flex items-center gap-1 mt-1 opacity-75 font-mono">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-semibold">09:00 - 17:00</span>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5">Standard Hours</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
