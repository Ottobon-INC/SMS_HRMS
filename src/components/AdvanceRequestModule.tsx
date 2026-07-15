import React, { useState } from 'react';
import { IndianRupee, Clock, CheckCircle2, XCircle, Send, AlertCircle, FileText } from 'lucide-react';
import { Language, AdvanceRequest } from '../types';

interface AdvanceRequestModuleProps {
  language: Language;
  advanceRequests: AdvanceRequest[];
  onSubmitAdvance: (amount: number, reason: string) => void;
  isEligible: boolean;
}

export default function AdvanceRequestModule({
  language,
  advanceRequests,
  onSubmitAdvance,
  isEligible
}: AdvanceRequestModuleProps) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason) return;
    
    setIsSubmitting(true);
    onSubmitAdvance(Number(amount), reason);
    setAmount('');
    setReason('');
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold border border-teal-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {language === 'te' ? 'ఆమోదించబడింది' : 'Approved'}
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100">
            <XCircle className="w-3.5 h-3.5" />
            {language === 'te' ? 'తిరస్కరించబడింది' : 'Rejected'}
          </span>
        );
      case 'deducted':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
            <FileText className="w-3.5 h-3.5" />
            {language === 'te' ? 'జీతం నుండి తీసుకోబడింది' : 'Deducted from Pay'}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
            <Clock className="w-3.5 h-3.5" />
            {language === 'te' ? 'పెండింగ్' : 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row gap-8">
          {/* Left Column: Form */}
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {language === 'te' ? 'అడ్వాన్స్ మనీ కోసం అప్లై చేయండి' : 'Request Salary Advance'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'te' ? 'ఒక సంవత్సరం అనుభవం ఉన్నవారు మాత్రమే అర్హులు.' : 'Eligible for employees with 1+ year experience.'}
              </p>
            </div>

            {!isEligible ? (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  {language === 'te' 
                    ? 'మీరు అడ్వాన్స్ తీసుకోవడానికి ఇంకా అర్హత సాధించలేదు (1 సంవత్సరం అనుభవం అవసరం).'
                    : 'You are not eligible for a salary advance. Minimum 1 year of experience required.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {language === 'te' ? 'మొత్తం (₹)' : 'Amount (₹)'}
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {language === 'te' ? 'కారణం' : 'Reason'}
                  </label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 resize-none"
                    placeholder={language === 'te' ? 'సంక్షిప్త కారణం వివరించండి...' : 'Briefly explain why...'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase transition-all tracking-wider cursor-pointer active:scale-95 shadow-md shadow-teal-600/10"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'te' ? 'అప్లై చేయండి' : 'Submit Request'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Column: History */}
          <div className="flex-1 md:border-l md:border-slate-100 md:pl-8">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              {language === 'te' ? 'మీ అడ్వాన్స్ హిస్టరీ' : 'Your Advance Request History'}
            </h3>

            {advanceRequests.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-slate-100/50 border-dashed">
                {language === 'te' ? 'ఎలాంటి అభ్యర్థనలు లేవు' : 'No advance requests found.'}
              </div>
            ) : (
              <div className="space-y-3">
                {advanceRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:shadow-sm transition-shadow">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800 text-sm">{req.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{req.reason}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(req.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                      {getStatusBadge(req.status)}
                      {req.deductedInMonth && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">
                          {req.deductedInMonth}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/30 rounded-full blur-3xl pointer-events-none -mt-16 -mr-16" />
      </div>
    </div>
  );
}
