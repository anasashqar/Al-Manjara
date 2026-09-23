import React from 'react';
import { Menu } from 'lucide-react';
import type { WorkshopSettings } from '../../types';

interface HeaderProps {
  settings: WorkshopSettings;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onToggleSidebar,
}) => {
  // Format Arabic full date
  const now = new Date();
  const daysArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const monthsArabic = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const dateGreeting = `${daysArabic[now.getDay()]}، ${now.getDate()} ${monthsArabic[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <header className="sticky top-0 z-30 h-12 bg-white border-b border-slate-300 px-3 sm:px-6 flex items-center justify-between">
      {/* Sidebar Toggle & Greeting */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* القائمة ظاهرة دائماً على الحاسوب؛ الزر لفتحها على الجوال فقط */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-[6px] text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="فتح القائمة"
          aria-label="فتح القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="text-xs sm:text-sm font-bold text-slate-800 font-display">
          مرحبا بك، {settings.managerName || 'أبو أحمد'}{' '}
          <span className="text-slate-400 font-sans font-normal mx-1">|</span>{' '}
          <span className="text-slate-500 font-sans font-normal text-xs">{dateGreeting}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600 font-sans">
        <span className="hidden sm:inline font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-[6px] border border-slate-200 text-xs">
          {settings.workshopName}
        </span>
      </div>
    </header>
  );
};
