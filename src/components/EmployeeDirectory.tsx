import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit3, Trash2, ArrowLeft, Calendar, Moon, Landmark, User, Mail, IndianRupee, CalendarDays, Eye, EyeOff, Power, FileText, Printer, Save, RotateCcw, CheckCircle2, RefreshCw, Check, Sparkles, AlertCircle, X } from 'lucide-react';
import { Language, Employee, LeaveType, ExperienceLetterData, Salutation } from '../types';
import { translations } from '../translations';
import AttendanceModule from './AttendanceModule';
import LeaveModule from './LeaveModule';
import PayrollModule from './PayrollModule';
import ExperienceLetter from './ExperienceLetter';
import { getExperienceLetter, saveExperienceLetter, generateDefaultLetter, formatDisplayDate, calculateTenure } from '../lib/services/experience-letter-service';
import { clockOutEmployee } from '../lib/services/attendance-service';

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
  onApplyEmployeeLeave: (empId: string, type: LeaveType, from: string, to: string, reason: string) => Promise<void>;
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
  const [inspectSubTab, setInspectSubTab] = useState<'attendance' | 'leave' | 'payroll' | 'docs'>('attendance');
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  const letterRef = useRef<HTMLDivElement>(null);

  // Experience Letter State
  const [expLetterData, setExpLetterData] = useState<ExperienceLetterData | null>(null);
  const [isEditingLetter, setIsEditingLetter] = useState(false);
  const [isSavingLetter, setIsSavingLetter] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const activeEmployee = employees.find(e => e.id === inspectingEmpId);

  // Auto-fetch experience letter and match joining date when viewing documents
  useEffect(() => {
    if (activeEmployee && inspectSubTab === 'docs') {
      getExperienceLetter(activeEmployee).then(data => {
        setExpLetterData(data);
      });
    }
  }, [activeEmployee?.id, inspectSubTab]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEditModal(false);
        setShowAddModal(false);
        setViewingPhotoUrl(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrintLetter = () => {
    window.print();
  };

  const handleSaveLetter = async () => {
    if (!activeEmployee || !expLetterData) return;
    setIsSavingLetter(true);
    try {
      await saveExperienceLetter(activeEmployee.id, expLetterData);
      setSaveSuccessMsg(language === 'te' ? 'అనుభవ పత్రం విజయవంతంగా భద్రపరచబడింది!' : 'Experience letter saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      setIsEditingLetter(false);
    } catch (err: any) {
      alert('Failed to save experience letter: ' + (err?.message || err));
    } finally {
      setIsSavingLetter(false);
    }
  };

  const handleResetLetter = () => {
    if (!activeEmployee) return;
    const def = generateDefaultLetter(activeEmployee);
    setExpLetterData(def);
    setSaveSuccessMsg(language === 'te' ? 'ప్రొఫైల్ వివరాలతో అనుభవ పత్రం రీసెట్ చేయబడింది!' : 'Experience letter reset to auto-fetched employee profile data!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSyncJoiningDateFromProfile = () => {
    if (!activeEmployee) return;
    const profileJoinDate = activeEmployee.joiningDate || new Date().toISOString().split('T')[0];
    setExpLetterData(prev => {
      const current = prev || generateDefaultLetter(activeEmployee);
      const tenure = calculateTenure(profileJoinDate, current.relievingDate);
      const formattedJoinDate = formatDisplayDate(profileJoinDate);
      const formattedRelieveDate = current.relievingDate ? formatDisplayDate(current.relievingDate) : 'Present';
      return {
        ...current,
        joiningDate: profileJoinDate,
        tenureDuration: tenure.text,
        openingParagraph: current.isCurrentlyEmployed
          ? `This is to certify that ${current.title} ${current.employeeName} (Employee ID: ${current.employeeId}) has been employed with ${current.companyName} since ${formattedJoinDate}.`
          : `This is to certify that ${current.title} ${current.employeeName} (Employee ID: ${current.employeeId}) was employed with ${current.companyName} from ${formattedJoinDate} to ${formattedRelieveDate}.`,
        tenureParagraph: `During their tenure, they have successfully served in the capacity of ${current.designation || 'Staff'}. They have completed approximately ${tenure.text} of service with our organization.`
      };
    });
    setSaveSuccessMsg(language === 'te' ? 'చేరిక తేదీ ప్రొఫైల్ నుండి సమకాలీకరించబడింది!' : 'Joining date synced from employee profile!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleUpdateProfileJoiningDate = async () => {
    if (!activeEmployee || !expLetterData?.joiningDate) return;
    try {
      await onUpdateEmployee(activeEmployee.id, { joiningDate: expLetterData.joiningDate });
      setSaveSuccessMsg(language === 'te' ? 'ఉద్యోగి ప్రొఫైల్‌లో చేరిక తేదీ అప్‌డేట్ చేయబడింది!' : 'Employee profile joining date updated successfully in database!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert('Failed to update employee profile: ' + (err?.message || err));
    }
  };

  const handleRegenerateParagraphs = () => {
    if (!expLetterData) return;
    const formattedJoinDate = formatDisplayDate(expLetterData.joiningDate);
    const formattedRelieveDate = expLetterData.relievingDate ? formatDisplayDate(expLetterData.relievingDate) : 'Present';
    const pronounHeShe = expLetterData.title === 'Ms.' || expLetterData.title === 'Mrs.' ? 'She' : 'He';
    const pronounHimHer = expLetterData.title === 'Ms.' || expLetterData.title === 'Mrs.' ? 'her' : 'him';
    const pronounHisHer = expLetterData.title === 'Ms.' || expLetterData.title === 'Mrs.' ? 'her' : 'his';

    const opening = expLetterData.isCurrentlyEmployed
      ? `This is to certify that ${expLetterData.title} ${expLetterData.employeeName} (Employee ID: ${expLetterData.employeeId}) has been employed with ${expLetterData.companyName} since ${formattedJoinDate}.`
      : `This is to certify that ${expLetterData.title} ${expLetterData.employeeName} (Employee ID: ${expLetterData.employeeId}) was employed with ${expLetterData.companyName} from ${formattedJoinDate} to ${formattedRelieveDate}.`;

    const tenure = `During their tenure, they have successfully served in the capacity of ${expLetterData.designation || 'Staff'}. They have completed approximately ${expLetterData.tenureDuration} of service with our organization.`;

    const conduct = `We have found ${pronounHimHer} to be a dedicated, hardworking, and reliable employee. ${pronounHeShe} possesses good conduct and has maintained a professional attitude towards ${pronounHisHer} responsibilities.`;

    const closing = `We wish ${pronounHimHer} success in all future endeavors.`;

    setExpLetterData({
      ...expLetterData,
      openingParagraph: opening,
      tenureParagraph: tenure,
      conductParagraph: conduct,
      closingParagraph: closing
    });
  };

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
  const [formGender, setFormGender] = useState<'male' | 'female' | 'other' | undefined>(undefined);
  const [formExperience, setFormExperience] = useState<number>(0);
  const [formBankAccountNo, setFormBankAccountNo] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');
  const [formBankAccountType, setFormBankAccountType] = useState<'savings' | 'current'>('savings');

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
    setFormGender(undefined);
    setFormExperience(0);
    setFormBankAccountNo('');
    setFormBankName('');
    setFormBankIfsc('');
    setFormBankAccountType('savings');
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
    setFormGender(emp.gender || undefined);
    setFormExperience(emp.experience || 0);
    setFormBankAccountNo(emp.bankDetails?.accountNumber || '');
    setFormBankName(emp.bankDetails?.bankName || '');
    setFormBankIfsc(emp.bankDetails?.ifsc || '');
    setFormBankAccountType(emp.bankDetails?.accountType || 'savings');
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
        status: formStatus,
        gender: formGender,
        experience: formExperience,
        bankDetails: {
          accountNumber: formBankAccountNo,
          bankName: formBankName,
          ifsc: formBankIfsc,
          accountType: formBankAccountType
        }
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
      status: formStatus,
      gender: formGender,
      experience: formExperience,
      bankDetails: {
        accountNumber: formBankAccountNo,
        bankName: formBankName,
        ifsc: formBankIfsc,
        accountType: formBankAccountType
      }
    });
    setShowEditModal(false);
  };

  const handleToggleStatus = async (id: string, name: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isDeactivating = currentStatus !== 'inactive';
    const confirmed = confirm(
      language === 'te'
        ? (isDeactivating ? `${name} అకౌంట్ నిలిపివేయాలనుకుంటున్నారా? పంచ్-ఇన్, లాగిన్, మెసేజ్‌లు నిలిపివేయబడతాయి.` : `${name} అకౌంట్ తిరిగి యాక్టివేట్ చేయాలనుకుంటున్నారా?`)
        : (isDeactivating ? `Deactivate ${name}'s account? They will not be able to log in, punch in, or chat.` : `Reactivate ${name}'s account?`)
    );
    if (confirmed) {
      if (isDeactivating) {
        const emp = employees.find(e => e.id === id);
        if (emp?.isCheckedIn) {
          try {
            await clockOutEmployee(id, undefined, 'Deactivation Auto-Checkout', '0,0');
          } catch (checkoutErr) {
            console.warn('Auto-checkout on deactivation notice:', checkoutErr);
          }
        }
        await onUpdateEmployee(id, { status: 'inactive', isCheckedIn: false });
        // Cross-tab sync & in-window event
        localStorage.setItem('hrms_status_sync', JSON.stringify({ empId: id, status: 'inactive', timestamp: Date.now() }));
        window.dispatchEvent(new CustomEvent('hrms:employee-status-changed', { detail: { id, status: 'inactive' } }));
      } else {
        await onUpdateEmployee(id, { status: 'active' });
        localStorage.setItem('hrms_status_sync', JSON.stringify({ empId: id, status: 'active', timestamp: Date.now() }));
        window.dispatchEvent(new CustomEvent('hrms:employee-status-changed', { detail: { id, status: 'active' } }));
      }
    }
  };

  const handlePermanentDelete = () => {
    if (!editTargetId) return;
    const emp = employees.find(e => e.id === editTargetId);
    if (!emp) return;

    const inputName = prompt(
      language === 'te'
        ? `శాశ్వతంగా తొలగించడానికి దయచేసి ఉద్యోగి పేరు "${emp.name}" ని టైప్ చేయండి:`
        : `To permanently delete, please type the employee's name "${emp.name}":`
    );

    if (inputName === emp.name) {
      onDeleteEmployee(editTargetId);
      setShowEditModal(false);
      if (inspectingEmpId === editTargetId) setInspectingEmpId(null);
    } else if (inputName !== null) {
      alert(language === 'te' ? 'పేరు సరిపోలలేదు. తొలగింపు రద్దు చేయబడింది.' : 'Name did not match. Deletion cancelled.');
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
      colLocation: "Current Location",
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
      colLocation: "ప్రస్తుత స్థానం",
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
      tabDocs: "పత్రాలు",
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
    const isLeaveToday = (emp.attendanceRecords || []).find(r => r.date === todayStr && r.status === 'leave');
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
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${inspectSubTab === 'attendance' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dirText.tabAttend}</span>
            </button>
            <button
              onClick={() => setInspectSubTab('leave')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${inspectSubTab === 'leave' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{dirText.tabLeave}</span>
            </button>
            <button
              onClick={() => setInspectSubTab('payroll')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${inspectSubTab === 'payroll' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>{dirText.tabPayroll}</span>
            </button>
            <button
              onClick={() => setInspectSubTab('docs')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${inspectSubTab === 'docs' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'పత్రాలు' : 'Documents'}</span>
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
                monthlyQuota={activeEmployee.monthlyQuota!}
                leaveRequests={activeEmployee.leaveRequests}
                gender={activeEmployee.gender}
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
                payslips={activeEmployee.payslips || []}
                employeeName={activeEmployee.name}
                employeeId={activeEmployee.id}
                employeeEmail={activeEmployee.email}
                employeeDesignation={activeEmployee.designation}
                employeeJoiningDate={activeEmployee.joiningDate}
                employeeExperience={activeEmployee.experience}
                employeeBankDetails={activeEmployee.bankDetails}
                onUpdatePayslip={(payslip) => onUpdatePayslip(activeEmployee.id, payslip)}
                onUpdateBankDetails={(bankDetails) => onUpdateEmployee(activeEmployee.id, { bankDetails })}
                attendanceRecords={activeEmployee.attendanceRecords || []}
                leaveRequests={activeEmployee.leaveRequests || []}
                missedPunchRequests={activeEmployee.missedPunchRequests || []}
              />
            </div>
          )}

          {inspectSubTab === 'docs' && (
            <div className="p-4 sm:p-6 flex flex-col items-center w-full">
              {/* Notification Toast */}
              {saveSuccessMsg && (
                <div className="w-full mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-semibold animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                  <button
                    onClick={() => setSaveSuccessMsg(null)}
                    className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Action & Info Toolbar */}
              <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                {/* Auto-matching joining date badge */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-800 text-xs font-medium">
                    <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      {language === 'te' ? 'చేరిక తేదీ (ఆటో-ఫెచ్): ' : 'Auto-fetched Joining Date: '}
                      <strong className="font-bold text-teal-900 font-mono">
                        {formatDisplayDate(activeEmployee.joiningDate || expLetterData?.joiningDate)}
                      </strong>
                    </span>
                  </div>
                  {expLetterData?.updatedAt && (
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {language === 'te' ? 'సవరించిన పత్రం' : 'Customized Letter'}
                    </span>
                  )}
                </div>

                {/* Document Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setIsEditingLetter(!isEditingLetter)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isEditingLetter
                      ? 'bg-slate-800 text-white shadow-sm hover:bg-slate-900'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                      }`}
                  >
                    {isEditingLetter ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>{language === 'te' ? 'పత్రం వీక్షించండి' : 'Preview Document'}</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 text-teal-600" />
                        <span>{language === 'te' ? 'పత్రాన్ని సవరించండి' : 'Edit Experience Letter'}</span>
                      </>
                    )}
                  </button>

                  {isEditingLetter && (
                    <>
                      <button
                        onClick={handleSaveLetter}
                        disabled={isSavingLetter}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/15 transition-all cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSavingLetter ? (language === 'te' ? 'భద్రపరుస్తోంది...' : 'Saving...') : (language === 'te' ? 'భద్రపరచండి' : 'Save Letter')}</span>
                      </button>

                      <button
                        onClick={handleResetLetter}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        title={language === 'te' ? 'ప్రొఫైల్ వివరాలతో రీసెట్ చేయండి' : 'Reset to auto-fetched employee defaults'}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">{language === 'te' ? 'రీసెట్' : 'Reset'}</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={handlePrintLetter}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-teal-600/15 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{language === 'te' ? 'అనుభవ పత్రాన్ని ముద్రించండి' : 'Print Experience Letter'}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible / Expandable Experience Letter Editor Panel */}
              {isEditingLetter && expLetterData && (
                <div className="w-full bg-white rounded-3xl p-6 border border-teal-100 shadow-lg shadow-teal-900/5 mb-8 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-6 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-teal-600" />
                        {language === 'te' ? 'అనుభవ పత్ర వివరాల సవరణ' : 'Customize Experience Letter Fields'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {language === 'te'
                          ? 'చేరిక తేదీ, పదవీ కాలం, సర్టిఫికేషన్ వివరణ మరియు సంతకం వివరాలను ఇక్కడ సవరించండి. ప్రివ్యూ క్రింద వెంటనే మారుతుంది.'
                          : 'Edit joining date, tenure duration, certification paragraphs, and signatory. Live preview updates below.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRegenerateParagraphs}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                      title="Reconstruct professional letter paragraphs using the current field values"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>{language === 'te' ? 'టెంప్లేట్ పునర్నిర్మించండి' : 'Auto-fill Text from Fields'}</span>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Section 1: Letter Meta */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                        {language === 'te' ? '1. పత్రం & జారీ వివరాలు' : '1. Document & Issue Meta'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'రిఫరెన్స్ నంబర్' : 'Reference Number'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.referenceNo}
                            onChange={(e) => setExpLetterData({ ...expLetterData, referenceNo: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-teal-600"
                            placeholder="SMS/HR/EXP/2026/..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'జారీ చేసిన తేదీ' : 'Issue Date'}
                          </label>
                          <input
                            type="date"
                            value={expLetterData.issueDate}
                            onChange={(e) => setExpLetterData({ ...expLetterData, issueDate: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'పత్రం శీర్షిక' : 'Document Title'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.documentTitle}
                            onChange={(e) => setExpLetterData({ ...expLetterData, documentTitle: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-teal-600"
                            placeholder="TO WHOMSOEVER IT MAY CONCERN"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Employee & Joining Date (Auto-Matching) */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          {language === 'te' ? '2. ఉద్యోగి & చేరిక తేదీ (ఆటో-మ్యాచింగ్)' : '2. Employee & Joining Date (Auto-Matching)'}
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSyncJoiningDateFromProfile}
                            className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                            title="Reload joining date from the employee's main directory profile"
                          >
                            <RefreshCw className="w-3 h-3 text-teal-600" />
                            <span>{language === 'te' ? 'ప్రొఫైల్ చేరిక తేదీని తీసుకోండి' : 'Sync Profile Joining Date'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleUpdateProfileJoiningDate}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                            title="Update employee's main profile in database with this joining date"
                          >
                            <Save className="w-3 h-3 text-blue-600" />
                            <span>{language === 'te' ? 'ప్రొఫైల్‌లో అప్‌డేట్ చేయండి' : 'Update in DB Profile'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'గౌరవ సంబోధన' : 'Salutation'}
                          </label>
                          <select
                            value={expLetterData.title}
                            onChange={(e) => setExpLetterData({ ...expLetterData, title: e.target.value as Salutation })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600 bg-white"
                          >
                            <option value="Mr.">Mr.</option>
                            <option value="Ms.">Ms.</option>
                            <option value="Mrs.">Mrs.</option>
                            <option value="Dr.">Dr.</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'ఉద్యోగి పేరు' : 'Employee Name'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.employeeName}
                            onChange={(e) => setExpLetterData({ ...expLetterData, employeeName: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'హోదా' : 'Designation'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.designation}
                            onChange={(e) => setExpLetterData({ ...expLetterData, designation: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                            <span>{language === 'te' ? 'చేరిక తేదీ (Date of Joining)' : 'Date of Joining'}</span>
                            <span className="text-[10px] text-teal-600 font-bold uppercase">Auto</span>
                          </label>
                          <input
                            type="date"
                            value={expLetterData.joiningDate}
                            onChange={(e) => {
                              const newJoin = e.target.value;
                              const tenure = calculateTenure(newJoin, expLetterData.relievingDate);
                              setExpLetterData({
                                ...expLetterData,
                                joiningDate: newJoin,
                                tenureDuration: tenure.text
                              });
                            }}
                            className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-teal-300 bg-teal-50/30 focus:outline-teal-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Status & Tenure */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                        {language === 'te' ? '3. ఉద్యోగ స్థితి & సేవా కాలం' : '3. Employment Status & Tenure Duration'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'ఉద్యోగ స్థితి' : 'Employment Status'}
                          </label>
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => {
                                const tenure = calculateTenure(expLetterData.joiningDate, undefined);
                                setExpLetterData({
                                  ...expLetterData,
                                  isCurrentlyEmployed: true,
                                  relievingDate: undefined,
                                  tenureDuration: tenure.text
                                });
                              }}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${expLetterData.isCurrentlyEmployed
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                              {language === 'te' ? 'ప్రస్తుతం పనిచేస్తున్నారు' : 'Currently Employed'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                const tenure = calculateTenure(expLetterData.joiningDate, todayStr);
                                setExpLetterData({
                                  ...expLetterData,
                                  isCurrentlyEmployed: false,
                                  relievingDate: todayStr,
                                  tenureDuration: tenure.text
                                });
                              }}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${!expLetterData.isCurrentlyEmployed
                                ? 'bg-white text-amber-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                              {language === 'te' ? 'విడుదలయ్యారు (Relieved)' : 'Relieved / Left'}
                            </button>
                          </div>
                        </div>

                        {!expLetterData.isCurrentlyEmployed ? (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              {language === 'te' ? 'విడుదల తేదీ (Relieving Date)' : 'Relieving / Last Working Date'}
                            </label>
                            <input
                              type="date"
                              value={expLetterData.relievingDate || ''}
                              onChange={(e) => {
                                const newRelieve = e.target.value;
                                const tenure = calculateTenure(expLetterData.joiningDate, newRelieve);
                                setExpLetterData({
                                  ...expLetterData,
                                  relievingDate: newRelieve,
                                  tenureDuration: tenure.text
                                });
                              }}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              {language === 'te' ? 'సేవ ముగింపు' : 'Service End Indicator'}
                            </label>
                            <input
                              type="text"
                              disabled
                              value="Present / Till Date"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-medium"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                            <span>{language === 'te' ? 'సేవా కాలం (Tenure Duration)' : 'Tenure Duration'}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const tenure = calculateTenure(expLetterData.joiningDate, expLetterData.relievingDate);
                                setExpLetterData({ ...expLetterData, tenureDuration: tenure.text });
                              }}
                              className="text-[10px] text-teal-600 font-bold hover:underline cursor-pointer"
                            >
                              {language === 'te' ? 'పునఃలెక్కించండి' : 'Recalculate'}
                            </button>
                          </label>
                          <input
                            type="text"
                            value={expLetterData.tenureDuration}
                            onChange={(e) => setExpLetterData({ ...expLetterData, tenureDuration: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-teal-600"
                            placeholder="e.g. 2 years 10 months"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Paragraphs */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                        {language === 'te' ? '4. పత్రంలోని వాక్యాలు (Body Paragraphs)' : '4. Certified Letter Paragraphs'}
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'ప్రారంభ ధృవీకరణ వాక్యం (Opening Statement)' : 'Opening Certification Statement'}
                          </label>
                          <textarea
                            rows={2}
                            value={expLetterData.openingParagraph}
                            onChange={(e) => setExpLetterData({ ...expLetterData, openingParagraph: e.target.value })}
                            className="w-full px-3 py-2 text-xs leading-relaxed rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'పదవీ కాలం & హోదా వాక్యం (Tenure & Designation Statement)' : 'Tenure & Designation Statement'}
                          </label>
                          <textarea
                            rows={2}
                            value={expLetterData.tenureParagraph}
                            onChange={(e) => setExpLetterData({ ...expLetterData, tenureParagraph: e.target.value })}
                            className="w-full px-3 py-2 text-xs leading-relaxed rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'నడవడిక & పనితీరు ధృవీకరణ (Conduct & Character)' : 'Character, Conduct & Reliability Assessment'}
                          </label>
                          <textarea
                            rows={3}
                            value={expLetterData.conductParagraph}
                            onChange={(e) => setExpLetterData({ ...expLetterData, conductParagraph: e.target.value })}
                            className="w-full px-3 py-2 text-xs leading-relaxed rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'ముగింపు ఆకాంక్ష వాక్యం (Closing Wishes)' : 'Closing Wishes'}
                          </label>
                          <textarea
                            rows={2}
                            value={expLetterData.closingParagraph}
                            onChange={(e) => setExpLetterData({ ...expLetterData, closingParagraph: e.target.value })}
                            className="w-full px-3 py-2 text-xs leading-relaxed rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Header & Signatory */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                        {language === 'te' ? '5. సంస్థ & సంతకందారు వివరాలు (Organization & Signatory)' : '5. Organization Header & Signatory'}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'సంస్థ పేరు' : 'Company Name'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.companyName}
                            onChange={(e) => setExpLetterData({ ...expLetterData, companyName: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'ఆఫీస్ చిరునామా' : 'Registered Office Address'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.companyAddress}
                            onChange={(e) => setExpLetterData({ ...expLetterData, companyAddress: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'సంప్రదింపు ఇమెయిల్' : 'HR Contact Email'}
                          </label>
                          <input
                            type="email"
                            value={expLetterData.companyEmail}
                            onChange={(e) => setExpLetterData({ ...expLetterData, companyEmail: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'సంప్రదింపు ఫోన్ నంబర్' : 'Contact Phone Number'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.companyContact}
                            onChange={(e) => setExpLetterData({ ...expLetterData, companyContact: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                            placeholder="+91-905 933 1954 / 0891-2751954"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'సంతకం ఎంటిటీ' : 'Signing Entity Block'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.signatoryEntity}
                            onChange={(e) => setExpLetterData({ ...expLetterData, signatoryEntity: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                            placeholder="For SMS Diagnostics"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'సంతకందారు పేరు' : 'Authorized Signatory Name'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.signatoryName}
                            onChange={(e) => setExpLetterData({ ...expLetterData, signatoryName: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-teal-600"
                            placeholder="Suresh Kumar. R"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {language === 'te' ? 'హోదా / విభాగం' : 'Designation / Title'}
                          </label>
                          <input
                            type="text"
                            value={expLetterData.signatoryDepartment}
                            onChange={(e) => setExpLetterData({ ...expLetterData, signatoryDepartment: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-teal-600"
                            placeholder="Managing Director"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Save / Close Actions */}
                    <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleResetLetter}
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{language === 'te' ? 'డిఫాల్ట్ ప్రొఫైల్ వివరాలతో రీసెట్ చేయండి' : 'Reset All to Employee Defaults'}</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingLetter(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          {language === 'te' ? 'మూసివేయండి' : 'Close Editor'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveLetter}
                          disabled={isSavingLetter}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/15 transition-all cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSavingLetter ? (language === 'te' ? 'భద్రపరుస్తోంది...' : 'Saving...') : (language === 'te' ? 'మార్పులను భద్రపరచండి' : 'Save Changes')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Experience Letter Preview Container */}
              <div className="w-full overflow-x-auto bg-slate-50 p-4 sm:p-8 rounded-2xl border border-slate-200">
                <ExperienceLetter
                  ref={letterRef}
                  letterData={expLetterData || generateDefaultLetter(activeEmployee)}
                  employee={activeEmployee}
                  language={language}
                />
              </div>
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
                <th className="p-5 text-[10px] font-black uppercase tracking-wider text-slate-400">{dirText.colLocation}</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">{dirText.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  id={`roster-row-${emp.id}`}
                  onClick={() => setInspectingEmpId(emp.id)}
                  className={`hover:bg-slate-50/50 cursor-pointer transition-all group ${emp.status === 'inactive' ? 'opacity-50 grayscale' : ''}`}
                >
                  {/* Name and ID */}
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={`min-w-[36px] w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs group-hover:scale-105 transition-all shrink-0 ${emp.status === 'inactive' ? 'bg-slate-200 text-slate-500' : 'bg-teal-50 text-teal-700'}`}>
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                          {emp.name}
                          {emp.status === 'inactive' && <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[9px] rounded uppercase font-bold">Inactive</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{emp.id} • {emp.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Designation */}
                  <td className="p-5">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-xs font-semibold text-slate-600">{emp.designation}</span>
                      {((emp.experience && emp.experience >= 1) || new Date(emp.joiningDate) <= new Date(new Date().setFullYear(new Date().getFullYear() - 1))) && (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          {language === 'te' ? 'అడ్వాన్స్‌కు అర్హులు' : 'Advance Eligible'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Joining Date */}
                  <td className="p-5">
                    <span className="text-xs text-slate-500 font-mono">{emp.joiningDate}</span>
                  </td>

                  {/* Attendance status */}
                  <td className="p-5">
                    <div className="flex flex-col gap-2 items-start">
                      {getTodayStatusBadge(emp)}
                    </div>
                  </td>

                  {/* Location column */}
                  <td className="p-5">
                    {(() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const todayLog = (emp.checkInLogs || []).find(log => log.date === todayStr);

                      if (!todayLog) return <span className="text-slate-300">-</span>;

                      return (
                        <div className="flex flex-col gap-3">
                          {todayLog.photoUrl || todayLog.checkInLocation ? (
                            <div className="flex items-start gap-2">
                              {todayLog.photoUrl && (
                                <img
                                  src={todayLog.photoUrl}
                                  title="Check-in Photo"
                                  onClick={(e) => { e.stopPropagation(); setViewingPhotoUrl(todayLog.photoUrl!); }}
                                  className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all shrink-0 mt-0.5"
                                />
                              )}
                              {todayLog.checkInLocation && (
                                <div className="text-[10px] text-slate-600 font-medium leading-tight flex items-start gap-1">
                                  <span className="text-teal-500 shrink-0 mt-0.5">📍</span>
                                  <span className={todayLog.checkInLocation.toLowerCase().includes('camp') ? 'text-indigo-600 font-bold' : ''}>
                                    {todayLog.checkInLocation}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : null}

                          {todayLog.checkOutPhotoUrl || todayLog.checkOutLocation ? (
                            <div className="flex items-start gap-2">
                              {todayLog.checkOutPhotoUrl && (
                                <img
                                  src={todayLog.checkOutPhotoUrl}
                                  title="Check-out Photo"
                                  onClick={(e) => { e.stopPropagation(); setViewingPhotoUrl(todayLog.checkOutPhotoUrl!); }}
                                  className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:ring-2 hover:ring-rose-400 transition-all shrink-0 mt-0.5"
                                />
                              )}
                              {todayLog.checkOutLocation && (
                                <div className="text-[10px] text-slate-600 font-medium leading-tight flex items-start gap-1">
                                  <span className="text-rose-400 shrink-0 mt-0.5">📍</span>
                                  <span className={todayLog.checkOutLocation.toLowerCase().includes('camp') ? 'text-indigo-600 font-bold' : ''}>
                                    {todayLog.checkOutLocation}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : null}

                          {!todayLog.checkInLocation && !todayLog.checkOutLocation && !todayLog.photoUrl && <span className="text-slate-300">-</span>}
                        </div>
                      );
                    })()}
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
                          onClick={(e) => handleToggleStatus(emp.id, emp.name, emp.status || 'active', e)}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${emp.status === 'inactive'
                            ? 'text-teal-600 hover:bg-teal-50'
                            : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          title={emp.status === 'inactive' ? (language === 'te' ? 'యాక్టివేట్' : 'Reactivate') : (language === 'te' ? 'నిలిపివేయి' : 'Deactivate')}
                        >
                          <Power className="w-3.5 h-3.5" />
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
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="bg-white rounded-[28px] sm:rounded-[32px] w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp my-auto overflow-hidden">
            {/* Sticky Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">{dirText.addTitle}</h3>
                <p className="text-[11px] text-slate-400">Add a new team member to employee directory</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                title={t.cancel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
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
                      <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender</label>
                  <select
                    value={formGender || ''}
                    onChange={(e) => setFormGender(e.target.value as any || undefined)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Experience (Years)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formExperience}
                    onChange={(e) => setFormExperience(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>

                <div className="pt-2 pb-2 mt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-3">{t.bankDetails || 'Bank Details'}</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.bankName || 'Bank Name'}</label>
                      <input type="text" value={formBankName} onChange={e => setFormBankName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.bankAccountNo || 'Account No'}</label>
                      <input type="text" value={formBankAccountNo} onChange={e => setFormBankAccountNo(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.bankIfsc || 'IFSC Code'}</label>
                      <input type="text" value={formBankIfsc} onChange={e => setFormBankIfsc(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.bankAccountType || 'Account Type'}</label>
                      <select value={formBankAccountType} onChange={e => setFormBankAccountType(e.target.value as 'savings' | 'current')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700">
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                      </select>
                    </div>
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
              </div>

              {/* Sticky Footer */}
              <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer shadow-md shadow-teal-600/20"
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
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div className="bg-white rounded-[28px] sm:rounded-[32px] w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp my-auto overflow-hidden">
            {/* Sticky Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">{dirText.editTitle}</h3>
                <p className="text-[11px] text-slate-400">Edit employee details and database record</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                title={t.cancel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
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
                      <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender</label>
                  <select
                    value={formGender || ''}
                    onChange={(e) => setFormGender(e.target.value as any || undefined)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Experience (Years)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formExperience}
                    onChange={(e) => setFormExperience(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>

                <div className="pt-2 pb-2 mt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-3">{t.bankDetails || 'Bank Details'}</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.bankName || 'Bank Name'}</label>
                      <input type="text" value={formBankName} onChange={e => setFormBankName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.bankAccountNo || 'Account No'}</label>
                      <input type="text" value={formBankAccountNo} onChange={e => setFormBankAccountNo(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.bankIfsc || 'IFSC Code'}</label>
                      <input type="text" value={formBankIfsc} onChange={e => setFormBankIfsc(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.bankAccountType || 'Account Type'}</label>
                      <select value={formBankAccountType} onChange={e => setFormBankAccountType(e.target.value as 'savings' | 'current')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700">
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                      </select>
                    </div>
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
              </div>

              {/* Sticky Footer */}
              <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  className="px-3.5 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === 'te' ? 'శాశ్వతంగా తొలగించండి' : 'Permanent Delete'}</span>
                  <span className="sm:hidden">{language === 'te' ? 'తొలగించు' : 'Delete'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer shadow-md shadow-teal-600/20"
                  >
                    {dirText.btnSave}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setViewingPhotoUrl(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewingPhotoUrl(null)}
              className="absolute -top-12 right-0 md:-right-12 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            >
              <Trash2 className="w-6 h-6 hidden" />
              <span className="text-xl font-bold px-2 block leading-none">×</span>
            </button>
            <img src={viewingPhotoUrl} alt="Check In Full" className="w-auto h-auto max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10" />
          </div>
        </div>
      )}
    </div>
  );
}
