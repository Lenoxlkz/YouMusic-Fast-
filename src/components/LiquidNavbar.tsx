import React from 'react';
import { Play, Compass, Library, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { NavigationTab } from '../types';

interface LiquidNavbarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isPlayingSong?: boolean;
}

export const LiquidNavbar: React.FC<LiquidNavbarProps> = ({
  activeTab,
  onTabChange,
  isPlayingSong = false,
}) => {
  return (
    <motion.nav
      id="liquid-navbar-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2 sm:gap-3 select-none px-2 max-w-full"
      role="navigation"
      aria-label="Navegación principal"
    >
      {/* Left Capsule Pill: iOS Liquid Glass Capsule */}
      <div
        id="liquid-nav-main-pill"
        className="h-14 sm:h-[58px] rounded-full bg-[#141822]/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_12px_36px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.16)] flex items-center p-1 sm:p-1.5 gap-1 sm:gap-1.5"
      >
        {/* Tab: Reproducir */}
        <button
          id="nav-tab-reproducir"
          type="button"
          onClick={() => onTabChange('play')}
          className={`relative flex flex-col items-center justify-center h-full px-3.5 sm:px-5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
            activeTab === 'play'
              ? 'bg-black/60 border border-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(0,0,0,0.4)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          aria-current={activeTab === 'play' ? 'page' : undefined}
          title="Reproducir música"
        >
          <div className="relative flex items-center justify-center w-4 h-4 mb-0.5">
            <Play
              className={`w-3.5 h-3.5 transition-transform ${
                activeTab === 'play' ? 'fill-white stroke-white' : 'stroke-current fill-none'
              }`}
            />
            {isPlayingSong && activeTab === 'play' && (
              <span className="absolute -top-1 -right-1.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] leading-none tracking-wide font-medium">Reproducir</span>
        </button>

        {/* Tab: Explorar */}
        <button
          id="nav-tab-explorar"
          type="button"
          onClick={() => onTabChange('explore')}
          className={`flex flex-col items-center justify-center h-full px-3.5 sm:px-5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
            activeTab === 'explore'
              ? 'bg-black/60 border border-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(0,0,0,0.4)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          aria-current={activeTab === 'explore' ? 'page' : undefined}
          title="Explorar géneros y tendencias"
        >
          <div className="flex items-center justify-center w-4 h-4 mb-0.5">
            <Compass
              className={`w-3.5 h-3.5 ${
                activeTab === 'explore' ? 'stroke-white stroke-[2.4]' : 'stroke-current stroke-[1.8]'
              }`}
            />
          </div>
          <span className="text-[10px] sm:text-[11px] leading-none tracking-wide font-medium">Explorar</span>
        </button>

        {/* Tab: Biblioteca */}
        <button
          id="nav-tab-biblioteca"
          type="button"
          onClick={() => onTabChange('library')}
          className={`flex flex-col items-center justify-center h-full px-3.5 sm:px-5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
            activeTab === 'library'
              ? 'bg-black/60 border border-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(0,0,0,0.4)] font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          aria-current={activeTab === 'library' ? 'page' : undefined}
          title="Tu biblioteca e historial"
        >
          <div className="flex items-center justify-center w-4 h-4 mb-0.5">
            <Library
              className={`w-3.5 h-3.5 ${
                activeTab === 'library' ? 'stroke-white stroke-[2.4]' : 'stroke-current stroke-[1.8]'
              }`}
            />
          </div>
          <span className="text-[10px] sm:text-[11px] leading-none tracking-wide font-medium">Biblioteca</span>
        </button>
      </div>

      {/* Right Circular Button for Search: Symmetrical iOS Liquid Glass Circle */}
      <button
        id="nav-circular-search-btn"
        type="button"
        onClick={() => onTabChange('search')}
        className={`w-14 h-14 sm:w-[58px] sm:h-[58px] rounded-full bg-[#141822]/85 backdrop-blur-2xl border flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-[0_12px_36px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.16)] flex-shrink-0 ${
          activeTab === 'search'
            ? 'border-white/40 bg-white/20 text-white shadow-[0_0_24px_rgba(255,255,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)]'
            : 'border-white/[0.12] text-slate-400 hover:text-white hover:bg-white/[0.08]'
        }`}
        aria-current={activeTab === 'search' ? 'page' : undefined}
        title="Buscar música"
        aria-label="Buscar música"
      >
        <Search className="w-5 h-5 stroke-[2.2]" />
      </button>
    </motion.nav>
  );
};
