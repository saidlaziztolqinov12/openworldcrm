import React from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  required = false,
  placeholder = '90 123 4567'
}) => {
  const cleanDigits = (value || '').replace(/^\+998/, '').replace(/\D/g, '').slice(0, 9);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChange(digits ? `+998${digits}` : '+998');
  };

  return (
    <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
      <div className="bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono font-bold px-3 py-2.5 flex items-center gap-1.5 text-xs sm:text-sm select-none border-r border-slate-200 dark:border-slate-700 shrink-0">
        <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>+998</span>
      </div>
      <input
        type="tel"
        required={required}
        value={cleanDigits}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={9}
        className="w-full px-3.5 py-2.5 bg-transparent text-sm font-mono font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none"
      />
    </div>
  );
};
