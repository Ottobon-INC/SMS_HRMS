import React from 'react';
import { IndianRupee, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Language, Employee, AdvanceRequest } from '../types';

interface AdminAdvanceApprovalsProps {
  language: Language;
  employees: Employee[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function AdminAdvanceApprovals({
  language,
  employees,
  onApprove,
  onReject
}: AdminAdvanceApprovalsProps) {
  const pendingRequests: { req: AdvanceRequest; empName: string; empId: string }[] = [];
  
  employees.forEach(emp => {
    emp.advanceRequests?.forEach(req => {
      if (req.status === 'pending') {
        pendingRequests.push({ req, empName: emp.name, empId: emp.id });
      }
    });
  });

  pendingRequests.sort((a, b) => new Date(b.req.submittedAt).getTime() - new Date(a.req.submittedAt).getTime());

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {language === 'te' ? 'అడ్వాన్స్ ఆమోదాలు' : 'Salary Advance Approvals'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'te' ? 'ఉద్యోగుల అడ్వాన్స్ రిక్వెస్ట్‌లను రివ్యూ చేయండి.' : 'Review and manage employee advance pay requests.'}
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100">
              {pendingRequests.length} {language === 'te' ? 'పెండింగ్' : 'Pending'}
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 rounded-[24px] border border-slate-100/50 border-dashed">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-slate-600">
                {language === 'te' ? 'అన్నీ క్లియర్' : 'All caught up!'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'te' ? 'పెండింగ్‌లో ఎలాంటి అభ్యర్థనలు లేవు.' : 'There are no pending advance requests to review.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map(({ req, empName, empId }) => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-200 hover:shadow-md transition-all group flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-50 text-teal-700 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0">
                        {empName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{empName}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{empId}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex-1">
                    <div className="flex items-baseline gap-1 mb-2">
                      <IndianRupee className="w-4 h-4 text-slate-400" />
                      <span className="text-2xl font-black text-slate-800 tracking-tight">
                        {req.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                      "{req.reason}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.submittedAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onReject(req.id)}
                        className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
                        title={language === 'te' ? 'తిరస్కరించండి' : 'Reject'}
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onApprove(req.id)}
                        className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                        title={language === 'te' ? 'ఆమోదించండి' : 'Approve'}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
