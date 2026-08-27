import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const isUz = language === 'uz';

  return (
    <button
      type="button"
      onClick={() => setLanguage(isUz ? 'en' : 'uz')}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white/90 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer select-none"
      title={isUz ? "Switch to English" : "O'zbekchaga o'tish"}
      aria-label="Toggle language"
    >
      <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center bg-slate-100 shadow-xs">
        <img
          src={isUz ? 'https://flagcdn.com/uz.svg' : 'https://flagcdn.com/gb.svg'}
          alt={isUz ? 'O\'zbekiston bayrog\'i' : 'UK Flag'}
          className="w-full h-full object-cover object-center"
        />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
        {isUz ? 'UZ' : 'ENG'}
      </span>
    </button>
  );
};

