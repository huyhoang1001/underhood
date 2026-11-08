import React from 'react';
import { Info, AlertTriangle, Lightbulb, Compass } from 'lucide-react';

interface CalloutProps {
  type?: 'insight' | 'warning' | 'principle' | 'note';
  title?: string;
  children: React.ReactNode;
}

export const Callout: React.FC<CalloutProps> = ({
  type = 'note',
  title,
  children
}) => {
  const getStyles = () => {
    switch (type) {
      case 'insight':
        return {
          icon: <Lightbulb className="w-4 h-4 text-sky-500 shrink-0" />,
          titleColor: 'text-sky-700 dark:text-sky-300',
          border: 'border-sky-200 dark:border-sky-900/60',
          bg: 'bg-sky-50/50 dark:bg-sky-950/20'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
          titleColor: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-900/60',
          bg: 'bg-amber-50/50 dark:bg-amber-950/20'
        };
      case 'principle':
        return {
          icon: <Compass className="w-4 h-4 text-emerald-500 shrink-0" />,
          titleColor: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-200 dark:border-emerald-900/60',
          bg: 'bg-emerald-50/50 dark:bg-emerald-950/20'
        };
      case 'note':
      default:
        return {
          icon: <Info className="w-4 h-4 text-[#78716c] dark:text-[#8b949e] shrink-0" />,
          titleColor: 'text-[#1c1917] dark:text-[#f0f6fc]',
          border: 'border-[#e7e3da] dark:border-[#30363d]',
          bg: 'bg-[#f7f4ee]/70 dark:bg-[#161b22]/70'
        };
    }
  };

  const { icon, titleColor, border, bg } = getStyles();

  return (
    <div
      className={`my-6 p-4 rounded-lg border ${border} ${bg} text-sm leading-relaxed`}
      role="region"
      aria-label={title || type}
    >
      <div className="flex items-center gap-2 font-semibold mb-1.5 text-xs">
        {icon}
        <span className={`tracking-wide uppercase ${titleColor}`}>
          {title || type}
        </span>
      </div>
      <div className="text-[#44403c] dark:text-[#c9d1d9] space-y-2">
        {children}
      </div>
    </div>
  );
};
