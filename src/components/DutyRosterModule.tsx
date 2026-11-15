import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Save, Send, User, Clock, Plus, Settings, Edit3, Trash2, X, Check, AlertCircle, Moon, Sun, Sparkles, RefreshCw } from 'lucide-react';
import { Employee, Language, DutyRosterShift, ShiftTemplate } from '../types';
import {
  fetchRoster,
  upsertShiftEntry,
  publishRoster,
  deleteShiftForCell,
  fetchShiftTemplates,
  saveShiftTemplate,
  deleteShiftTemplate,
  propagateShiftTimingChanges
} from '../lib/services/roster-service';
import { SHIFT_COLOR_PALETTES, PREDEFINED_SHIFTS } from '../lib/constants/shifts';

interface DutyRosterModuleProps {
  language: Language;
  employees: Employee[];
}

export default function DutyRosterModule({ language, employees }: DutyRosterModuleProps) {
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [editingCell, setEditingCell] = useState<{ empId: string; date: string } | null>(null);

  // Shift Management State
  const [showShiftManager, setShowShiftManager] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [shiftFormLabel, setShiftFormLabel] = useState('');
  const [shiftFormStart, setShiftFormStart] = useState('08:00');
  const [shiftFormEnd, setShiftFormEnd] = useState('16:00');
  const [shiftFormColor, setShiftFormColor] = useState(SHIFT_COLOR_PALETTES[0].class);
  const [propagateToRoster, setPropagateToRoster] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Custom Shift for Single Day assignment
  const [assignmentTab, setAssignmentTab] = useState<'templates' | 'custom'>('templates');
  const [customShiftLabel, setCustomShiftLabel] = useState('Custom Duty');
  const [customShiftStart, setCustomShiftStart] = useState('09:00');
  const [customShiftEnd, setCustomShiftEnd] = useState('17:00');
  const [customShiftColor, setCustomShiftColor] = useState(SHIFT_COLOR_PALETTES[1].class);
  const [customShiftNote, setCustomShiftNote] = useState('');

  // Load week roster and shift templates
  useEffect(() => {
    loadWeekRoster();
  }, [currentWeekStart]);

  useEffect(() => {
    loadTemplates();

    const handleShiftsUpdated = () => loadTemplates();
    const handleRosterUpdated = () => loadWeekRoster();

    window.addEventListener('hrms:shifts-updated', handleShiftsUpdated);
    window.addEventListener('hrms:roster-updated', handleRosterUpdated);

    return () => {
      window.removeEventListener('hrms:shifts-updated', handleShiftsUpdated);
      window.removeEventListener('hrms:roster-updated', handleRosterUpdated);
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
    setRoster(data);
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

  const getShiftForCell = (empId: string, dateStr: string) => {
    return roster.find(s => s.employeeId === empId && s.shiftDate === dateStr);
  };

  // Assign a company template shift (Auto-publishes immediately so employee sees it!)
  const handleSelectShift = async (empId: string, dateStr: string, tmpl: ShiftTemplate) => {
    const targetEmp = employees.find(e => e.id === empId);
    if (targetEmp?.status === 'inactive') {
      alert("Cannot assign shifts to a deactivated employee.");
      setEditingCell(null);
      return;
    }
    try {
      const isOvernight = tmpl.end <= tmpl.start && tmpl.label !== 'Off';
      const shiftData = {
        employeeId: empId,
        shiftDate: dateStr,
        shiftStart: tmpl.start,
        shiftEnd: tmpl.end,
        shiftLabel: tmpl.label,
        isPublished: true, // Auto-publish so employee immediately sees it!
        isOvernight
      };

      await upsertShiftEntry(shiftData);

      setRoster(prev => {
        const filtered = prev.filter(s => !(s.employeeId === empId && s.shiftDate === dateStr));
        return [...filtered, { ...shiftData, id: 'temp-' + Date.now() }];
      });

      setToastMsg(`Shift assigned: ${tmpl.label} (${tmpl.start} - ${tmpl.end})`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save shift assignment');
    } finally {
      setEditingCell(null);
    }
  };

  // Assign a custom one-off shift for this specific day
  const handleAssignCustomShift = async () => {
    if (!editingCell) return;
    const targetEmp = employees.find(e => e.id === editingCell.empId);
    if (targetEmp?.status === 'inactive') {
      alert("Cannot assign shifts to a deactivated employee.");
      setEditingCell(null);
      return;
    }
    try {
      const isOvernight = customShiftEnd <= customShiftStart && customShiftLabel !== 'Off';
      const shiftData = {
        employeeId: editingCell.empId,
        shiftDate: editingCell.date,
        shiftStart: customShiftStart,
        shiftEnd: customShiftEnd,
        shiftLabel: customShiftLabel || 'Custom Shift',
        notes: customShiftNote,
        isPublished: true,
        isOvernight
      };

      await upsertShiftEntry(shiftData);

      setRoster(prev => {
        const filtered = prev.filter(s => !(s.employeeId === editingCell.empId && s.shiftDate === editingCell.date));
        return [...filtered, { ...shiftData, id: 'temp-' + Date.now() }];
      });

      setToastMsg(`Custom shift assigned: ${customShiftLabel} (${customShiftStart} - ${customShiftEnd})`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save custom shift');
    } finally {
      setEditingCell(null);
    }
  };

  // Clear / remove shift from cell (revert employee to standard normal business hours)
  const handleClearShift = async (empId: string, dateStr: string) => {
    try {
      await deleteShiftForCell(empId, dateStr);
      setRoster(prev => prev.filter(s => !(s.employeeId === empId && s.shiftDate === dateStr)));
      setToastMsg('Shift removed. Employee reverted to standard working hours.');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to remove shift');
    } finally {
      setEditingCell(null);
    }
  };

  // Save or Update Shift Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftFormLabel.trim()) return;

    try {
      const isOvernight = shiftFormEnd <= shiftFormStart && shiftFormLabel !== 'Off';
      const templateToSave: ShiftTemplate = {
        id: editingTemplate?.id,
        label: shiftFormLabel.trim(),
        start: shiftFormStart,
        end: shiftFormEnd,
        colorClass: shiftFormColor,
        isOvernight
      };

      await saveShiftTemplate(templateToSave);

      // If user is editing existing timing and wants to propagate to upcoming roster
      if (editingTemplate && propagateToRoster) {
        const updatedCount = await propagateShiftTimingChanges(editingTemplate.label, shiftFormStart, shiftFormEnd);
        if (updatedCount > 0) {
          setToastMsg(`Shift updated & synced to ${updatedCount} upcoming employee roster assignments!`);
          setTimeout(() => setToastMsg(null), 4000);
        } else {
          setToastMsg(`Shift timing updated successfully!`);
          setTimeout(() => setToastMsg(null), 3000);
        }
      } else {
        setToastMsg(`Shift "${shiftFormLabel}" saved successfully!`);
        setTimeout(() => setToastMsg(null), 3000);
      }

      await loadTemplates();
      setIsAddingShift(false);
      setEditingTemplate(null);
    } catch (err: any) {
      alert('Failed to save shift template: ' + (err?.message || err));
    }
  };

  // Open Edit Form for Template
  const handleOpenEditTemplate = (tmpl: ShiftTemplate) => {
    setEditingTemplate(tmpl);
    setShiftFormLabel(tmpl.label);
    setShiftFormStart(tmpl.start);
    setShiftFormEnd(tmpl.end);
    setShiftFormColor(tmpl.colorClass);
    setIsAddingShift(true);
  };

  // Open New Template Form
  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setShiftFormLabel('');
    setShiftFormStart('08:00');
    setShiftFormEnd('16:00');
    setShiftFormColor(SHIFT_COLOR_PALETTES[0].class);
    setIsAddingShift(true);
  };

  // Delete Template
  const handleDeleteTemplate = async (label: string) => {
    if (label === 'Off') {
      alert('The "Off" shift is a core system default and cannot be removed.');
      return;
    }
    if (!confirm(`Are you sure you want to remove the "${label}" shift template? (Historical roster records will not be damaged)`)) {
      return;
    }
    try {
      await deleteShiftTemplate(label);
      await loadTemplates();
      setToastMsg(`Shift "${label}" deactivated.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      alert('Failed to delete shift: ' + (err?.message || err));
    }
  };

  // Manual Publish Week Roster
  const handlePublish = async () => {
    if (roster.length === 0) return;
    setIsPublishing(true);
    try {
      const dateStr = currentWeekStart.toLocaleDateString('en-CA');
      await publishRoster(dateStr);
      setToastMsg(language === 'te' ? 'ఈ వారం రోస్టర్ ప్రచురించబడింది!' : 'Week roster published successfully to all employees!');
      setTimeout(() => setToastMsg(null), 3000);
      loadWeekRoster();
    } catch (err) {
      console.error(err);
      alert('Failed to publish roster');
    } finally {
      setIsPublishing(false);
    }
  };

  const isPastWeek = weekDates[6] < new Date(new Date().setHours(0, 0, 0, 0));
  // On current and future weeks: strictly show only active employees!
  // On past weeks: show active employees, plus inactive employees who actually worked shifts during that past week.
  const activeEmployees = employees.filter(e => {
    if (e.status !== 'inactive') return true;
    if (isPastWeek && roster.some(s => s.employeeId === e.id)) return true;
    return false;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            {language === 'te' ? 'డ్యూటీ రోస్టర్' : 'Duty Roster'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' ? 'ఉద్యోగుల షిఫ్ట్ సమయాలను సెట్ చేయండి మరియు నిర్వహించండి' : 'Configure shift hours & schedule employee assignments'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Selector */}
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button onClick={handlePrevWeek} className="p-2 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer" title="Previous Week">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 text-xs font-bold text-slate-700 min-w-[130px] text-center">
              {currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} 
              {' - '}
              {weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
            <button onClick={handleNextWeek} className="p-2 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer" title="Next Week">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Manage Shift Timings Button */}
          <button
            onClick={() => setShowShiftManager(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-teal-600" />
            <span>{language === 'te' ? 'షిఫ్ట్ సమయాల నిర్వహణ' : 'Manage Shifts & Timings'}</span>
          </button>

          {/* Publish Roster Button */}
          <button
            onClick={handlePublish}
            disabled={isPublishing || roster.length === 0}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-teal-600/15 cursor-pointer transition-all disabled:opacity-50"
            title="Publish all shifts in this week"
          >
            {isPublishing ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{language === 'te' ? 'ప్రచురించండి' : 'Publish Roster'}</span>
          </button>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading duty roster...</div>
        ) : (
          <div className="overflow-auto max-h-[65vh] pb-32">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-40 bg-white shadow-sm">
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 min-w-[200px] border-r border-slate-100 sticky left-0 z-10 bg-slate-50/95 backdrop-blur-sm">
                    {language === 'te' ? 'ఉద్యోగి' : 'Employee'}
                  </th>
                  {weekDates.map(d => (
                    <th key={d.toISOString()} className="p-4 text-center min-w-[140px] border-r border-slate-100 last:border-r-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </div>
                      <div className="text-xs font-bold text-slate-700 mt-1">
                        {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="p-4 border-r border-slate-100 sticky left-0 z-10 bg-white group-hover:bg-slate-50/95 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-50 text-teal-700 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{emp.name}</p>
                          <p className="text-[9px] text-slate-400 truncate">{emp.designation}</p>
                        </div>
                      </div>
                    </td>
                    
                    {weekDates.map(d => {
                      const dateStr = d.toLocaleDateString('en-CA');
                      const shift = getShiftForCell(emp.id, dateStr);
                      const isEditing = editingCell?.empId === emp.id && editingCell?.date === dateStr;
                      
                      const template = shift ? shiftTemplates.find(t => t.label === shift.shiftLabel) : null;
                      const colorClass = template?.colorClass || (shift?.shiftLabel === 'Off' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-teal-50 text-teal-800 border-teal-200');

                      return (
                        <td key={dateStr} className="p-2 border-r border-slate-100 last:border-r-0 relative text-center h-16 align-middle">
                          <div 
                            onClick={() => setEditingCell({ empId: emp.id, date: dateStr })}
                            className={`w-full h-full flex flex-col items-center justify-center rounded-xl border border-dashed transition-all cursor-pointer p-2
                              ${shift 
                                ? `border-solid ${colorClass} hover:ring-2 hover:ring-teal-500/20 shadow-xs` 
                                : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50/30'
                              } ${isEditing ? 'ring-2 ring-teal-500' : ''}`}
                            title={shift ? `${shift.shiftLabel} (${shift.shiftStart} - ${shift.shiftEnd}) - Click to change` : 'Regular Hours (Click to assign custom shift)'}
                          >
                            {shift ? (
                              <>
                                <span className="text-[10px] font-bold truncate w-full">{shift.shiftLabel}</span>
                                {shift.shiftLabel !== 'Off' && (
                                  <span className="text-[9px] font-mono opacity-80 mt-0.5">
                                    {shift.shiftStart} - {shift.shiftEnd}
                                    {shift.isOvernight && <span className="ml-1 text-[8px] font-bold text-indigo-600">(+1)</span>}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-300 group-hover:text-teal-400 transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SHIFT TEMPLATES & TIMINGS MANAGER (ADMIN CONFIG) */}
      {/* ========================================================================= */}
      {showShiftManager && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShiftManager(false); }}
        >
          <div className="bg-white rounded-[28px] sm:rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp my-auto overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-teal-600" />
                  {language === 'te' ? 'కంపెనీ షిఫ్ట్ సమయాల నిర్వహణ' : 'Shift Templates & Working Hours'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'te' 
                    ? 'ఉద్యోగుల కోసం షిఫ్ట్ సమయాలను సవరించండి లేదా కొత్త షిఫ్ట్‌లను జోడించండి' 
                    : 'Edit existing shift timings, add new shifts, and customize badges'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftManager(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* If Add/Edit Form is open */}
              {isAddingShift ? (
                <form onSubmit={handleSaveTemplate} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="text-xs font-bold text-slate-800">
                      {editingTemplate ? `Edit Timing: ${editingTemplate.label}` : 'Create New Company Shift'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setIsAddingShift(false); setEditingTemplate(null); }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Shift Name / Label</label>
                      <input
                        type="text"
                        required
                        disabled={editingTemplate?.label === 'Off'}
                        value={shiftFormLabel}
                        onChange={(e) => setShiftFormLabel(e.target.value)}
                        placeholder="e.g. Early Shift"
                        className="w-full px-3 py-2 text-xs font-semibold bg-white rounded-xl border border-slate-200 focus:outline-teal-600 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Shift Start Time</label>
                      <input
                        type="time"
                        required
                        value={shiftFormStart}
                        onChange={(e) => setShiftFormStart(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-white rounded-xl border border-slate-200 focus:outline-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Shift End Time</label>
                      <input
                        type="time"
                        required
                        value={shiftFormEnd}
                        onChange={(e) => setShiftFormEnd(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-white rounded-xl border border-slate-200 focus:outline-teal-600"
                      />
                    </div>
                  </div>

                  {/* Overnight Indicator */}
                  {shiftFormEnd <= shiftFormStart && shiftFormLabel !== 'Off' && (
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 p-2.5 rounded-xl border border-indigo-200/60">
                      <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Overnight Shift: Crosses midnight into the next morning (+1 Day).</span>
                    </div>
                  )}

                  {/* Color Palette Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-2">Shift Badge Color</label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {SHIFT_COLOR_PALETTES.map((palette) => (
                        <button
                          key={palette.name}
                          type="button"
                          onClick={() => setShiftFormColor(palette.class)}
                          className={`h-9 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${palette.class} ${
                            shiftFormColor === palette.class ? 'ring-2 ring-teal-600 scale-105 shadow-sm' : 'hover:scale-95'
                          }`}
                          title={palette.name}
                        >
                          {shiftFormColor === palette.class && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Propagation Checkbox when editing existing shift */}
                  {editingTemplate && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={propagateToRoster}
                          onChange={(e) => setPropagateToRoster(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                        />
                        <span>Automatically sync this new timing to all upcoming roster assignments</span>
                      </label>
                    </div>
                  )}

                  {/* Form Submit */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/15 cursor-pointer transition-all"
                    >
                      {editingTemplate ? 'Save Shift Changes' : 'Create Shift'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Configured Shifts ({shiftTemplates.length})
                  </span>
                  <button
                    onClick={handleOpenNewTemplate}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Shift</span>
                  </button>
                </div>
              )}

              {/* List of Shift Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shiftTemplates.map((tmpl) => (
                  <div
                    key={tmpl.label}
                    className={`p-3.5 rounded-2xl border ${tmpl.colorClass} flex items-center justify-between shadow-xs transition-all`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {tmpl.label}
                        {tmpl.isOvernight && (
                          <span className="text-[9px] bg-indigo-200 text-indigo-900 font-bold px-1.5 py-0.2 rounded-md">
                            Night +1
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-mono font-medium opacity-85 mt-0.5">
                        {tmpl.label === 'Off' ? 'No Shift / Weekly Off' : `${tmpl.start} - ${tmpl.end}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditTemplate(tmpl)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                        title="Edit Timing"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {tmpl.label !== 'Off' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.label)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                          title="Deactivate Shift"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowShiftManager(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ASSIGN SHIFT TO CELL (QUICK TEMPLATE OR CUSTOM TIME OVERRIDE) */}
      {/* ========================================================================= */}
      {editingCell && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          onClick={() => setEditingCell(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 flex flex-col gap-4 max-w-md w-full animate-scaleUp my-auto" 
            onClick={e => e.stopPropagation()}
          >
            {/* Cell Info Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {employees.find(e => e.id === editingCell.empId)?.name}
                </p>
                <p className="text-xs font-bold text-teal-700 mt-0.5">
                  {new Date(editingCell.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tabs: Standard Shifts vs Custom One-Off Timing */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAssignmentTab('templates')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  assignmentTab === 'templates' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Company Shifts
              </button>
              <button
                type="button"
                onClick={() => setAssignmentTab('custom')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  assignmentTab === 'custom' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Custom Hours for This Day
              </button>
            </div>

            {/* Tab 1: Company Shift Templates */}
            {assignmentTab === 'templates' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400">
                  Select a shift timing. The employee will immediately see this on their schedule:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
                  {shiftTemplates.map(tmpl => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => handleSelectShift(editingCell.empId, editingCell.date, tmpl)}
                      className={`text-xs font-bold p-3 rounded-xl text-left transition-all active:scale-95 border ${tmpl.colorClass} hover:ring-2 hover:ring-teal-500/20 flex flex-col cursor-pointer shadow-xs`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{tmpl.label}</span>
                        {tmpl.isOvernight && <Moon className="w-3 h-3 opacity-60" />}
                      </div>
                      <span className="opacity-80 text-[10px] font-mono mt-0.5">
                        {tmpl.label === 'Off' ? 'Weekly Off' : `${tmpl.start} - ${tmpl.end}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Custom Hours for Single Day */}
            {assignmentTab === 'custom' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Shift Label / Purpose</label>
                  <input
                    type="text"
                    value={customShiftLabel}
                    onChange={(e) => setCustomShiftLabel(e.target.value)}
                    placeholder="e.g. Special Camp, Covering Shift"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={customShiftStart}
                      onChange={(e) => setCustomShiftStart(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">End Time</label>
                    <input
                      type="time"
                      value={customShiftEnd}
                      onChange={(e) => setCustomShiftEnd(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Badge Color</label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {SHIFT_COLOR_PALETTES.map((palette) => (
                      <button
                        key={palette.name}
                        type="button"
                        onClick={() => setCustomShiftColor(palette.class)}
                        className={`w-7 h-7 rounded-lg border shrink-0 transition-all ${palette.class} ${
                          customShiftColor === palette.class ? 'ring-2 ring-teal-600 scale-105' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Optional Note for Employee</label>
                  <input
                    type="text"
                    value={customShiftNote}
                    onChange={(e) => setCustomShiftNote(e.target.value)}
                    placeholder="e.g. Report to Lab Counter 2"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAssignCustomShift}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-teal-600/15"
                >
                  Assign Custom Shift
                </button>
              </div>
            )}

            {/* Bottom Actions: Clear Shift / Cancel */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleClearShift(editingCell.empId, editingCell.date)}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                title="Remove shift assignment and revert employee to standard 9-to-5 working day"
              >
                Clear Shift (Standard Hours)
              </button>

              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="text-xs font-bold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
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
