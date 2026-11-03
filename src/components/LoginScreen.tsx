import React, { useState } from 'react';
import { KeyRound, Mail, Eye, EyeOff } from 'lucide-react';
import { Language, Employee } from '../types';
import { translations } from '../translations';
import SmsLogo from './SmsLogo';

interface LoginScreenProps {
  language: Language;
  employees: Employee[];
  onLoginSuccess: (employee: Employee) => void;
}

export default function LoginScreen({ language, employees, onLoginSuccess }: LoginScreenProps) {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Translations specifically for Login Screen
  const loginText = {
    en: {
      subtitle: "Please sign in to your HR Portal account.",
      emailLabel: "Email Address",
      passLabel: "Password",
      btnIn: "Sign In",
      errInvalid: "Invalid email or password. Please check your credentials.",
      errInactive: "Your account is inactive. Please contact your administrator.",
    },
    te: {
      subtitle: "దయచేసి మీ హచ్.ఆర్ పోర్టల్ ఖాతాకు లాగిన్ అవ్వండి.",
      emailLabel: "ఈమెయిల్ చిరునామా",
      passLabel: "పాస్‌వర్డ్",
      btnIn: "లాగిన్ అవ్వండి",
      errInvalid: "ఈమెయిల్ లేదా పాస్‌వర్డ్ తప్పు. దయచేసి వివరాలను సరిచూసుకోండి.",
      errInactive: "మీ ఖాతా యాక్టివ్ గా లేదు. దయచేసి అడ్మిన్ ని సంప్రదించండి.",
    }
  }[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(language === 'te' ? 'అన్ని వివరాలు పూరించండి' : 'Please fill all fields');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.employee) {
        if (data.employee.status === 'inactive') {
          setError(loginText.errInactive);
          return;
        }
        if (data.token) {
          localStorage.setItem('hrms_auth_token', data.token);
        }
        onLoginSuccess(data.employee);
        return;
      } else {
        setError(data.error || loginText.errInvalid);
        return;
      }
    } catch {
      // Backend request failed, check if cached employees exist
      const matched = employees.find((emp) => {
        const empEmail = (emp.email || '').trim().toLowerCase();
        const stored = (emp.password || '').trim();
        return empEmail === cleanEmail && (
          stored === cleanPassword ||
          stored.toLowerCase() === cleanPassword.toLowerCase()
        );
      });

      if (matched) {
        if (matched.status === 'inactive') {
          setError(loginText.errInactive);
        } else {
          onLoginSuccess(matched);
        }
        return;
      }

      setError(language === 'te' ? 'సర్వర్ కనెక్ట్ అవ్వడం లేదు' : 'Unable to connect to server. Please verify your connection.');
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans antialiased">
      <div className="w-full max-w-xl bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col p-6 sm:p-10 md:p-12 space-y-8">

        {/* Portal Header */}
        <div className="text-center space-y-4 flex flex-col items-center">
          <SmsLogo className="justify-center" textSize="text-2xl sm:text-3xl font-black" />
          <div className="pt-2 text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              HR MANAGEMENT SYSTEM (HRMS)
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {loginText.subtitle}
          </p>
        </div>

        {/* Form Details */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div id="login-error-msg" className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Email input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {loginText.emailLabel}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="login-email-input"
                type="email"
                placeholder="name@smslabs.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all text-slate-700"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {loginText.passLabel}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all text-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit-btn"
            type="submit"
            className="w-full py-3 sm:py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-98 transition-all text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-md shadow-teal-600/10 cursor-pointer"
          >
            {loginText.btnIn}
          </button>
        </form>

      </div>
    </div>
  );
}
