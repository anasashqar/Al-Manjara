import React from 'react';
import { 
  ShoppingBag, 
  Receipt, 
  CreditCard, 
  Wallet, 
  Settings, 
  X,
  Hammer,
  Layers
} from 'lucide-react';

export type NavSection = 'orders' | 'expenses' | 'financials' | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isOpen: boolean;
  onClose: () => void;
  pendingDebtsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpen,
  onClose,
  pendingDebtsCount,
}) => {
  const navItems: { id: NavSection; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'orders', label: 'الطلبيات', icon: ShoppingBag, badge: pendingDebtsCount },
    { id: 'expenses', label: 'المصاريف', icon: Receipt },
    { id: 'financials', label: 'المالية', icon: Wallet },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const handleNavClick = (section: NavSection) => {
    onSelectSection(section);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop on mobile screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* القائمة ثابتة الظهور على الحاسوب دائماً؛ isOpen يتحكم بها كدرج على الجوال فقط */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-60 bg-[#0e241c] text-white flex flex-col rounded-none transition-transform duration-200 ease-in-out shadow-lg lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Brand Header: h-12 with close toggle */}
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-3.5 bg-[#081711] rounded-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[4px] bg-white flex items-center justify-center text-[#0e241c] shadow-xs">
              <Hammer className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-xs sm:text-sm font-display leading-tight whitespace-nowrap">
                منجرة الإتقان
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 rounded-[6px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="إغلاق القائمة"
            aria-label="إغلاق القائمة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* الأقسام كمربعات متساوية تملأ ارتفاع القائمة */}
        <nav className="flex-1 min-h-0 p-2 grid grid-rows-4 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative min-h-0 flex flex-col items-center justify-center gap-2.5 rounded-[6px] transition-colors ${
                  isActive
                    ? 'bg-[#ea580c] text-white shadow-xs'
                    : 'bg-white/[0.04] text-[#cbd5e1] hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-8 h-8 ${isActive ? 'text-white' : 'text-emerald-400/90'}`} strokeWidth={1.75} />
                <span className="text-base font-bold whitespace-nowrap">{item.label}</span>

                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`absolute top-2 left-2 min-w-6 text-center text-xs font-bold px-1.5 py-0.5 rounded-[6px] ${
                      isActive ? 'bg-black/20 text-white' : 'bg-emerald-950 text-emerald-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
