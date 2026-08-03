import React, { useState, useEffect } from 'react';
import { History, FileWarning, RefreshCw } from 'lucide-react';
import { Language, Employee, MissedPunchRequest } from '../types';
import { translations } from '../translations';
import { fetchEmployeeMissedPunches } from '../lib/services/missed-punch-service';

interface EmployeeMissedPunchesProps {
  language: Language;
  currentUser: Employee;
}

export default function EmployeeMissedPunches({ language, currentUser }: EmployeeMissedPunchesProps) {
  const t = translations[language];
  const [requests, setRequests] = useState<MissedPunchRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [currentUser.id]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployeeMissedPunches(currentUser.id);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-teal-600" />
            {language === 'te' ? 'నా మిస్ అయిన పంచ్ అభ్యర్థనలు' : 'My Missed Punch Requests'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' 
              ? 'మీరు సమర్పించిన మిస్ అయిన పంచ్ అవుట్ అభ్యర్థనల స్థితిని చూడండి.' 
              : 'Track the status of your submitted missed punch-out requests.'}
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{language === 'te' ? 'రిఫ్రెష్' : 'Refresh'}</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
            Loading...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileWarning className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            {language === 'te' ? 'మీరు ఎలాంటి అభ్యర్థనలు సమర్పించలేదు' : 'You have not submitted any missed punch requests.'}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';

              return (
                <div key={req.id} className="p-5 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-bold text-slate-800">{req.missedDate}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isPending ? 'bg-amber-100 text-amber-700' : 
                          isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {language === 'te' ? 'సమర్పించిన తేదీ:' : 'Submitted on:'} {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {(req.reason || req.adminNote) && (
                      <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 sm:max-w-xs w-full">
                        {req.reason && (
                          <p className="text-slate-600"><span className="font-bold">Reason:</span> {req.reason}</p>
                        )}
                        {req.adminNote && (
                          <p className="text-slate-600"><span className="font-bold">Admin Note:</span> {req.adminNote}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
