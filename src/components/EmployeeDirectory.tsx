import React, { useState } from 'react';
import { Plus, Edit3, Trash2, ArrowLeft, Calendar, Moon, Landmark, User, Mail, DollarSign, CalendarDays, Eye, EyeOff } from 'lucide-react';
import { Language, Employee, LeaveType } from '../types';
import { translations } from '../translations';
import AttendanceModule from './AttendanceModule';
import LeaveModule from './LeaveModule';
import PayrollModule from './PayrollModule';

interface EmployeeDirectoryProps {
  language: Language;
  employees: Employee[];
  onAddEmployee: (emp: Partial<Employee>) => void;
  onUpdateEmployee: (id: string, emp: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdatePayslip: (empId: string, payslip: any) => void;
  // Propagate actions on employee's leave
  onApproveEmployeeLeave: (empId: string, reqId: string) => void;
  onRejectEmployeeLeave: (empId: string, reqId: string) => void;
  onApplyEmployeeLeave: (empId: string, type: LeaveType, from: string, to: string, reason: string) => void;
  onUpdateLeaveBalances: (empId: string, type: LeaveType, allotted: number, used: number) => void;
}

export default function EmployeeDirectory({
  language,
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdatePayslip,
  onApproveEmployeeLeave,
  onRejectEmployeeLeave,
  onApplyEmployeeLeave,
  onUpdateLeaveBalances,
}: EmployeeDirectoryProps) {
  const t = translations[language];

  // UI state
  const [inspectingEmpId, setInspectingEmpId] = useState<string | null>(null);
  const [inspectSubTab, setInspectSubTab] = useState<'attendance' | 'leave' | 'payroll'>('attendance');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState('');
  const [formBasicSalary, setFormBasicSalary] = useState(40000);
  const [formRole, setFormRole] = useState<'admin' | 'employee'>('employee');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [showPassword, setShowPassword] = useState(false);

  const activeEmployee = employees.find(e => e.id === inspectingEmpId);

  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormDesignation('');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormBasicSalary(45000);
    setFormRole('employee');
    setFormPhone('');
    setFormPassword('');
    setFormStatus('active');
    setShowAddModal(true);
  };

  const handleOpenEdit = (emp: Employee, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid inspecting triggers
    setEditTargetId(emp.id);
    setFormName(emp.name);
    setFormEmail(emp.email);
    setFormDesignation(emp.designation);
    setFormJoiningDate(emp.joiningDate);
    setFormBasicSalary(emp.basicSalary || 45000);
    setFormRole(emp.role || 'employee');
    setFormPhone(emp.phone || '');
    setFormPassword(emp.password || '');
    setFormStatus(emp.status || 'active');
    setShowEditModal(true);
  };

  // Save New Employee
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formDesignation) {
      alert(language === 'te' ? 'దయచేసి అన్ని వివరాలు పూరించండి' : 'Please fill all fields');
      return;
    }
    
    try {
      await onAddEmployee({
        id: `EMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        name: formName,
        email: formEmail,
        designation: formDesignation,
        joiningDate: formJoiningDate,
        basicSalary: Number(formBasicSalary),
        role: formRole,
        phone: formPhone,
        password: formPassword,
        status: formStatus
      });
      setShowAddModal(false);
    } catch (error: any) {
      alert("Failed to add employee: " + (error?.message || error?.details || JSON.stringify(error)));
    }
  };

  // Save Edited Employee
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formDesignation || !editTargetId) return;
    onUpdateEmployee(editTargetId, {
      name: formName,
      email: formEmail,
      designation: formDesignation,
      joiningDate: formJoiningDate,
      basicSalary: Number(formBasicSalary),
      role: formRole,
      phone: formPhone,
      password: formPassword,
      status: formStatus
    });
    setShowEditModal(false);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      language === 'te' 
        ? `${name}ని ఉద్యోగుల లిస్ట్ నుండి తొలగించాలనుకుంటున్నారా?` 
        : `Are you sure you want to remove ${name} from the roster?`
    );
    if (confirmed) {
      onDeleteEmployee(id);
      if (inspectingEmpId === id) setInspectingEmpId(null);
    }
  };

  // Texts
  const dirText = {
    en: {
      title: "Employee Roster Directory",
      subtitle: "Review operational metrics, roster info, and manage employee profiles.",
      btnNew: "Add New Employee",
      colEmp: "Employee Info",
      colDesignation: "Designation",
      colJoin: "Joining Date",
      colStatus: "Attendance Today",
      colActions: "Actions",
      addTitle: "Onboard New Employee",
      editTitle: "Modify Employee Profile",
      labelName: "Full Name",
      labelEmail: "Official Email Address",
      labelRole: "Job Designation",
      labelJoin: "Joining Date",
      labelSalary: "Monthly Basic Salary (₹)",
      btnSave: "Save Profile",
      backDir: "Back to Directory List",
      inspecting: "Inspecting Profile:",
      tabAttend: "Attendance Logs",
      tabLeave: "Leave & Balances",
      tabPayroll: "Payslip Portal",
      deleteEmployee: "Remove Employee Profile",
    },
    te: {
      title: "ఉద్యోగుల డైరెక్టరీ",
      subtitle: "హాజరు స్థితి, సెలవుల బ్యాలెన్స్ చూడండి మరియు కంపెనీ ఉద్యోగులను నియమించండి.",
      btnNew: "కొత్త ఉద్యోగిని చేర్చండి",
      colEmp: "ఉద్యోగి వివరాలు",
      colDesignation: "హోదా / Designation",
      colJoin: "చేరిన తేదీ",
      colStatus: "ఈరోజు హాజరు",
      colActions: "పనులు / Actions",
      addTitle: "కొత్త ఉద్యోగి నమోదు",
      editTitle: "ఉద్యోగి వివరాలు మార్చండి",
      labelName: "ఉద్యోగి పేరు",
      labelEmail: "ఈమెయిల్ చిరునామా",
      labelRole: "ఉద్యోగ బాధ్యత (Designation)",
      labelJoin: "జాయినింగ్ తేదీ",
      labelSalary: "నెలవారీ బేసిక్ జీతం (₹)",
      btnSave: "వివరాలు సేవ్ చేయండి",
      backDir: "డైరెక్టరీ లిస్ట్‌కు తిరిగి వెళ్ళండి",
      inspecting: "ఉద్యోగి ప్రొఫైల్ పరిశీలన:",
      tabAttend: "హాజరు పట్టిక",
      tabLeave: "సెలవుల నిల్వ",
      tabPayroll: "జీతం రశీదులు",
      deleteEmployee: "ఉద్యోగిని తొలగించండి",
    }
  }[language];

  // Helper for determining today's status badge
  const getTodayStatusBadge = (emp: Employee) => {
    if (emp.role === 'admin') {
      return (
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-100">
          {language === 'te' ? 'అడ్మిన్' : 'Admin'}
        </span>
      );
    }
    
    if (emp.isCheckedIn) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t.checkedIn}
        </span>
      );
    }

    // Check if on leave today
    const todayStr = new Date().toISOString().split('T')[0];
    const isLeaveToday = emp.attendanceRecords.find(r => r.date === todayStr && r.status === 'leave');
    if (isLeaveToday) {
      return (
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          {language === 'te' ? 'సెలవు' : 'On Leave'}
        </span>
      );
    }

    // Default checked out
    return (
      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500 border border-slate-200/50">
        {language === 'te' ? 'హాజరు కాలేదు' : 'Checked Out'}
      </span>
    );
  };

  // --- INSPECTION MODE PANEL ---
  if (inspectingEmpId && activeEmployee) {
    return (
      <div id="directory-inspect-view" className="space-y-6 animate-fadeIn">
        {/* Inspection Header */}
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setInspectingEmpId(null)}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-100 transition-all cursor-pointer"
              title={dirText.backDir}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">{dirText.inspecting}</p>
              <h2 className="text-xl font-bold font-display text-slate-800">{activeEmployee.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{activeEmployee.designation} • {activeEmployee.id} • {activeEmployee.email}</p>
            </div>
          </div>

          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 w-full md:w-auto">
            <button
              onClick={() => setInspectSubTab('attendance')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                inspectSubTab === 'attendance' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dirText.tabAttend}</span>
            </button>
            <button
              onClick={() => setInspectSubTab('leave')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                inspectSubTab === 'leave' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{dirText.tabLeave}</span>
            </button>
            <button
              onClick={() => setInspectSubTab('payroll')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                inspectSubTab === 'payroll' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>{dirText.tabPayroll}</span>
            </button>
          </div>
        </div>

        {/* Render Selected View */}
        <div className="bg-white rounded-[32px] p-1 border border-slate-100 shadow-sm min-h-[400px]">
          {inspectSubTab === 'attendance' && (
            <div className="p-4 sm:p-6">
              <AttendanceModule
                language={language}
                attendanceRecords={activeEmployee.attendanceRecords}
              />
            </div>
          )}

          {inspectSubTab === 'leave' && (
            <div className="p-4 sm:p-6">
              <LeaveModule
                language={language}
                leaveBalance={activeEmployee.leaveBalance}
                leaveRequests={activeEmployee.leaveRequests}
                onApplyLeave={(type, from, to, reason) => onApplyEmployeeLeave(activeEmployee.id, type, from, to, reason)}
                onApproveLeave={(reqId) => onApproveEmployeeLeave(activeEmployee.id, reqId)}
                onRejectLeave={(reqId) => onRejectEmployeeLeave(activeEmployee.id, reqId)}
                onUpdateBalances={(type, allotted, used) => onUpdateLeaveBalances(activeEmployee.id, type, allotted, used)}
              />
            </div>
          )}

          {inspectSubTab === 'payroll' && (
            <div className="p-4 sm:p-6">
              <PayrollModule
                language={language}
                payslips={activeEmployee.payslips}
                onUpdatePayslip={(payslip) => onUpdatePayslip(activeEmployee.id, payslip)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STANDARD DIRECTORY GRID LIST ---
  return (
    <div id="directory-roster-view" className="space-y-6 animate-fadeIn">
      
      {/* Directory Title Panel */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            {dirText.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {dirText.subtitle}
          </p>
        </div>

        <button
          id="btn-add-employee"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-teal-600/15 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{dirText.btnNew}</span>
        </button>
      </div>

      {/* Roster Listing Card */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-5 text-[10px] font-black uppercase tracking-wider text-slate-400">{dirText.colEmp}</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-wider text-slate-400">{dirText.colDesignation}</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-wider text-slate-400">{dirText.colJoin}</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-wider text-slate-400">{dirText.colStatus}</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">{dirText.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  id={`roster-row-${emp.id}`}
                  onClick={() => setInspectingEmpId(emp.id)}
                  className="hover:bg-slate-50/50 cursor-pointer transition-all group"
                >
                  {/* Name and ID */}
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-50 text-teal-700 w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs group-hover:scale-105 transition-all">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{emp.id} • {emp.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Designation */}
                  <td className="p-5">
                    <span className="text-xs font-semibold text-slate-600">{emp.designation}</span>
                  </td>

                  {/* Joining Date */}
                  <td className="p-5">
                    <span className="text-xs text-slate-500 font-mono">{emp.joiningDate}</span>
                  </td>

                  {/* Attendance status */}
                  <td className="p-5">
                    {getTodayStatusBadge(emp)}
                  </td>

                  {/* Actions */}
                  <td className="p-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => handleOpenEdit(emp, e)}
                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        title={dirText.editTitle}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      
                      {emp.role !== 'admin' && (
                        <button
                          onClick={(e) => handleDelete(emp.id, emp.name, e)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={dirText.deleteEmployee}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD EMPLOYEE DIALOG MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-6 sm:p-8 shadow-xl animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{dirText.addTitle}</h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelName}</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelEmail}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelRole}</label>
                  <input
                    type="text"
                    required
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelSalary}</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      required
                      value={formBasicSalary}
                      onChange={(e) => setFormBasicSalary(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelJoin}</label>
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={formJoiningDate}
                    onChange={(e) => setFormJoiningDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'admin' | 'employee')}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  {dirText.btnSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT EMPLOYEE DIALOG MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-6 sm:p-8 shadow-xl animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{dirText.editTitle}</h3>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelName}</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelEmail}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelRole}</label>
                  <input
                    type="text"
                    required
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelSalary}</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      required
                      value={formBasicSalary}
                      onChange={(e) => setFormBasicSalary(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{dirText.labelJoin}</label>
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={formJoiningDate}
                    onChange={(e) => setFormJoiningDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'admin' | 'employee')}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  {dirText.btnSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
