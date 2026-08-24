import React from 'react';
import { LogOut } from 'lucide-react';
import { Employee, Language } from '../../types';
import SmsLogo from '../SmsLogo';

interface AppHeaderProps {
  currentUser: Employee;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  englishLabel: string;
  teluguLabel: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  language,
  onLanguageChange,
  onOpenProfile,
  onLogout,
  englishLabel,
  teluguLabel
}) => {
  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  return (
    <header id="main-portal-header" className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40 no-print">
      <div className="w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo Branding */}
        <div className="flex items-center">
          <SmsLogo textSize="text-base sm:text-lg font-black" subtitle={false} />
        </div>

        {/* Right Area Controls: Employee Info, Language Toggle, Logout */}
        <div className="flex items-center gap-4">
          {/* User Profile Card */}
          <button 
            onClick={onOpenProfile}
            className="hidden md:flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 py-1.5 pl-2.5 pr-4 rounded-full border border-slate-100 transition-colors cursor-pointer"
          >
            <div className="bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black">
              {getAvatarInitials(currentUser.name)}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-800 block leading-tight">{currentUser.name}</span>
              <span className="text-[9px] text-slate-400 font-medium block leading-none mt-0.5">{currentUser.id}</span>
            </div>
          </button>

          {/* Logout Icon */}
          <button
            onClick={onLogout}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
            title={language === 'te' ? 'లాగ్ అవుట్' : 'Sign Out'}
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Bilingual Switch Slider (EN ⇄ తె) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              id="toggle-lang-en"
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all uppercase cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {englishLabel}
            </button>
            <button
              id="toggle-lang-te"
              onClick={() => onLanguageChange('te')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                language === 'te'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {teluguLabel}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
