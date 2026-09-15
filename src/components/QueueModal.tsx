import React, { useState } from 'react';
import {
  X,
  Trash2,
  Play,
  Music,
  Shuffle,
  ChevronUp,
  ChevronDown,
  Plus,
  FolderPlus,
  ListPlus,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, UserPlaylist } from '../types';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Song[];
  currentIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onClearQueue: () => void;
  onMoveTrack: (fromIndex: number, toIndex: number) => void;
  onShuffleQueue: () => void;
  playlists: UserPlaylist[];
  onCreatePlaylistFromQueue: (name: string) => void;
  onAddQueueToPlaylist: (playlistId: string) => void;
}

export const QueueModal: React.FC<QueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  currentIndex,
  onSelectTrack,
  onRemoveTrack,
  onClearQueue,
  onMoveTrack,
  onShuffleQueue,
  playlists,
  onCreatePlaylistFromQueue,
  onAddQueueToPlaylist,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveToNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || queue.length === 0) return;
    onCreatePlaylistFromQueue(newPlaylistName.trim());
    setNewPlaylistName('');
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSaveModal(false);
    }, 1200);
  };

  const handleSaveToExisting = () => {
    if (!selectedPlaylistId || queue.length === 0) return;
    onAddQueueToPlaylist(selectedPlaylistId);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSaveModal(false);
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="queue-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            id="queue-modal-container"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg max-h-[85vh] h-[640px] flex flex-col liquid-glass-nav rounded-3xl border border-white/15 overflow-hidden shadow-2xl bg-[#0d121f]/95 text-slate-100"
          >
            {/* Header */}
            <div
              id="queue-modal-header"
              className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5"
            >
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Cola de Reproducción
                </h3>
                <p className="text-xs text-slate-400">
                  {queue.length} {queue.length === 1 ? 'canción' : 'canciones'} • Reordena y gestiona
                </p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {queue.length > 1 && (
                  <button
                    id="queue-shuffle-now-btn"
                    type="button"
                    onClick={onShuffleQueue}
                    className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-all cursor-pointer"
                    title="Aleatorizar orden de la cola"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">Aleatorizar</span>
                  </button>
                )}

                {queue.length > 0 && (
                  <button
                    id="queue-save-playlist-btn"
                    type="button"
                    onClick={() => setShowSaveModal(true)}
                    className="flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors cursor-pointer"
                    title="Guardar cola en lista de reproducción"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Guardar lista</span>
                  </button>
                )}

                {queue.length > 0 && (
                  <button
                    id="queue-clear-btn"
                    type="button"
                    onClick={onClearQueue}
                    className="text-xs text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Vaciar cola"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  id="queue-close-btn"
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            {queue.length > 0 && (
              <div className="px-5 py-2.5 bg-black/20 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {currentIndex >= 0 ? `Reproduciendo #${currentIndex + 1}` : 'Lista preparada'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Usa las flechas ▲ ▼ para cambiar el orden
                </span>
              </div>
            )}

            {/* List */}
            <div id="queue-tracks-list" className="flex-1 overflow-y-auto p-4 space-y-2">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                    <Music className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">La cola está vacía</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Usa el icono <span className="text-rose-400 font-bold">+</span> en cualquier canción para añadirla a la cola.
                    </p>
                  </div>
                </div>
              ) : (
                queue.map((track, idx) => {
                  const isCurrent = idx === currentIndex;
                  const canMoveUp = idx > 0;
                  const canMoveDown = idx < queue.length - 1;

                  return (
                    <div
                      key={`${track.videoId}-${idx}`}
                      className={`group relative flex items-center gap-3 p-2.5 rounded-2xl border transition-all select-none ${
                        isCurrent
                          ? 'bg-rose-500/15 border-rose-500/40 text-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                      }`}
                    >
                      {/* Reorder Buttons (Move Up / Down) */}
                      <div className="flex flex-col items-center justify-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          disabled={!canMoveUp}
                          onClick={() => onMoveTrack(idx, idx - 1)}
                          className={`w-6 h-4 flex items-center justify-center rounded transition-colors ${
                            canMoveUp
                              ? 'text-slate-400 hover:text-white hover:bg-white/15 cursor-pointer'
                              : 'text-slate-600 opacity-30 cursor-not-allowed'
                          }`}
                          title="Mover arriba en la cola"
                          aria-label="Mover pista arriba"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-slate-500 font-medium">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={!canMoveDown}
                          onClick={() => onMoveTrack(idx, idx + 1)}
                          className={`w-6 h-4 flex items-center justify-center rounded transition-colors ${
                            canMoveDown
                              ? 'text-slate-400 hover:text-white hover:bg-white/15 cursor-pointer'
                              : 'text-slate-600 opacity-30 cursor-not-allowed'
                          }`}
                          title="Mover abajo en la cola"
                          aria-label="Mover pista abajo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Thumbnail with Play indicator */}
                      <button
                        type="button"
                        onClick={() => onSelectTrack(idx)}
                        className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 cursor-pointer shadow-sm"
                        title="Reproducir esta canción"
                      >
                        {track.thumbnails?.[0]?.url ? (
                          <img
                            src={track.thumbnails[0].url}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div
                          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                            isCurrent ? 'opacity-100 bg-black/60' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </button>

                      {/* Song Title & Artist */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onSelectTrack(idx)}
                      >
                        <h4
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            isCurrent ? 'text-rose-300' : 'text-slate-100 group-hover:text-white'
                          }`}
                        >
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>

                      {/* Duration and Remove Action */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {track.durationFormatted && (
                          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                            {track.durationFormatted}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveTrack(idx)}
                          className="text-slate-400 hover:text-rose-400 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                          title="Eliminar de la cola"
                          aria-label="Eliminar pista de la cola"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Save to Playlist Sub-Modal */}
            {showSaveModal && (
              <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-md flex flex-col p-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-rose-400" />
                    <h4 className="font-bold text-white">Guardar cola en Lista de Reproducción</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className="w-8 h-8 rounded-full bg-white/10 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                  {/* Create New Playlist */}
                  <form onSubmit={handleSaveToNew} className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-300">
                      Crear nueva lista con estas canciones:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="Ej. Mis Favoritas, Fiesta 2025..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="submit"
                        disabled={!newPlaylistName.trim()}
                        className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Crear</span>
                      </button>
                    </div>
                  </form>

                  {/* Add to existing playlist */}
                  {playlists.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-white/10">
                      <label className="block text-xs font-semibold text-slate-300">
                        O añadir a una lista existente:
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {playlists.map((pl) => (
                          <button
                            key={pl.id}
                            type="button"
                            onClick={() => setSelectedPlaylistId(pl.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                              selectedPlaylistId === pl.id
                                ? 'bg-rose-500/20 border-rose-500/40 text-white'
                                : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium">{pl.title}</p>
                              <p className="text-xs text-slate-400">{pl.songs.length} pistas</p>
                            </div>
                            {selectedPlaylistId === pl.id && (
                              <Check className="w-4 h-4 text-rose-400" />
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={!selectedPlaylistId}
                        onClick={handleSaveToExisting}
                        className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Añadir canciones a la lista seleccionada
                      </button>
                    </div>
                  )}

                  {saveSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>¡Lista guardada con éxito!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
