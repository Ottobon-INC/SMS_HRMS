import React, { useState, useEffect } from 'react';
import { FileWarning, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Language, Employee, MissedPunchRequest } from '../types';
import { translations } from '../translations';
import { fetchMissedPunchRequests, approveMissedPunchRequest, rejectMissedPunchRequest } from '../lib/services/missed-punch-service';

interface AdminMissedPunchesProps {
  language: Language;
  employees: Employee[];
  adminId: string;
}

export default function AdminMissedPunches({ language, employees, adminId }: AdminMissedPunchesProps) {
  const t = translations[language];
  const [missedRequests, setMissedRequests] = useState<MissedPunchRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  useEffect(() => {
    loadMissedRequests();
  }, []);

  const loadMissedRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await fetchMissedPunchRequests();
      setMissedRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleApproveMissedPunch = async (req: MissedPunchRequest) => {
    try {
      await approveMissedPunchRequest(req.id, req.employeeId, req.missedDate, '18:00:00', adminId, 'Approved by admin via dashboard');
      await loadMissedRequests();
    } catch (err) {
      alert("Failed to approve request.");
    }
  };

  const handleRejectMissedPunch = async (req: MissedPunchRequest) => {
    try {
      await rejectMissedPunchRequest(req.id, adminId, 'Rejected by admin via dashboard');
      await loadMissedRequests();
    } catch (err) {
      alert("Failed to reject request.");
    }
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.name || empId;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <FileWarning className="w-6 h-6 text-amber-500" />
            {language === 'te' ? 'మిస్ అయిన పంచ్ అవుట్స్' : 'Missed Punch Requests'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' 
              ? 'ఉద్యోగులు సమర్పించిన పెండింగ్ అభ్యర్థనలను సమీక్షించండి.' 
              : 'Review and approve missed punch-out requests submitted by employees.'}
          </p>
        </div>
        <button
          onClick={loadMissedRequests}
          className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
        >
          {language === 'te' ? 'రిఫ్రెష్' : 'Refresh'}
        </button>
      </div>

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
              const empName = getEmployeeName(req.employeeId);
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';

              return (
                <div key={req.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border rounded-2xl gap-4 transition-all ${
                  isPending ? 'bg-amber-50/30 border-amber-200' : 
                  isApproved ? 'bg-emerald-50/20 border-emerald-100' : 'bg-rose-50/20 border-rose-100'
                }`}>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-slate-800">{empName}</h4>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isPending ? 'bg-amber-100 text-amber-700' : 
                        isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Missed Date: <span className="font-bold text-slate-700">{req.missedDate}</span></p>
                    {req.reason && (
                      <p className="text-[10px] mt-2 text-slate-600 bg-white/50 p-2 rounded-lg border border-slate-100/50">
                        <span className="font-bold">Reason:</span> {req.reason}
                      </p>
                    )}
                  </div>
                  
                  {isPending && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleRejectMissedPunch(req)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> {language === 'te' ? 'తిరస్కరించు' : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleApproveMissedPunch(req)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" /> {language === 'te' ? 'ఆమోదించు' : 'Approve (6:00 PM)'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
