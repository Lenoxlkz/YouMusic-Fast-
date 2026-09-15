import React from 'react';
import { Play, Sparkles, Flame, Radio, Disc3, Headphones } from 'lucide-react';
import { Song } from '../types';

interface ExploreViewProps {
  onPlaySong: (song: Song) => void;
  onSelectGenre: (genre: string) => void;
}

const GENRE_CARDS = [
  { id: 'tendencias', label: 'Tendencias Globales', icon: Flame, color: 'from-amber-500/30 to-rose-600/30' },
  { id: 'pop', label: 'Pop Internacional', icon: Sparkles, color: 'from-pink-500/30 to-purple-600/30' },
  { id: 'latino', label: 'Éxitos Latinos y Reggaetón', icon: Radio, color: 'from-orange-500/30 to-yellow-600/30' },
  { id: 'rock', label: 'Rock Clásico & Moderno', icon: Disc3, color: 'from-blue-500/30 to-cyan-600/30' },
  { id: 'lo-fi', label: 'Lo-Fi Chill & Focus', icon: Headphones, color: 'from-emerald-500/30 to-teal-600/30' },
  { id: 'electronica', label: 'Electrónica & EDM', icon: Sparkles, color: 'from-violet-500/30 to-indigo-600/30' },
];

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectGenre }) => {
  return (
    <div id="explore-view-page" className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-44">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Explorar</h1>
        <p className="text-sm text-slate-400 mt-1">
          Descubre nueva música, categorías y estados de ánimo
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GENRE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectGenre(card.id)}
              className={`group relative overflow-hidden h-36 rounded-3xl p-5 text-left border border-white/10 bg-gradient-to-br ${card.color} backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-white/60 tracking-wider uppercase">
                  Explorar
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-white/90 transition-colors">
                  {card.label}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-white/80 mt-1 font-medium">
                  <span>Ver canciones</span>
                  <Play className="w-3 h-3 fill-white/80" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
