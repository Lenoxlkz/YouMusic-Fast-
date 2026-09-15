import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  Loader2,
  LogOut,
  UserCheck,
  ShieldCheck,
  Radio,
  AlertCircle
} from 'lucide-react';
import {
  checkAuthStatus,
  saveYtCredentials,
  clearYtCredentials,
  AccountInfo
} from '../lib/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChanged?: () => void;
}

export function SettingsModal({ isOpen, onClose, onAuthChanged }: SettingsModalProps) {
  const [deviceCode, setDeviceCode] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'pending' | 'success'>('idle');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const auth = await checkAuthStatus();
      setIsLoggedIn(auth.loggedIn);
      if (auth.account) {
        setAccount(auth.account);
      }
      if (auth.loggedIn) {
        setStatus('success');
      } else {
        setStatus('idle');
      }
    } catch (err: any) {
      console.warn('Error checking auth in modal', err);
      setStatus('idle');
    }
  };

  const handleConnect = async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/device-code', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setErrorMessage(data.error_description || data.error);
        setStatus('idle');
        return;
      }
      setDeviceCode(data);
      setStatus('pending');
      startPolling(data.device_code, (data.interval || 5) * 1000, (data.expires_in || 900) * 1000);
    } catch (e: any) {
      setErrorMessage(e.message || 'Error al conectar con Google');
      setStatus('idle');
    }
  };

  const startPolling = (code: string, intervalMs: number, timeoutMs: number) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    const startTime = Date.now();

    pollTimerRef.current = setInterval(async () => {
      if (Date.now() - startTime > timeoutMs) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setStatus('idle');
        setErrorMessage('El código ha caducado. Vuelve a intentarlo.');
        return;
      }

      try {
        const res = await fetch('/api/auth/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: code })
        });
        const data = await res.json();

        if (res.ok && data.success && data.credentials) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          saveYtCredentials(data.credentials);
          setIsLoggedIn(true);
          setStatus('success');
          // Refresh status to grab channel details
          await loadStatus();
          if (onAuthChanged) onAuthChanged();
        } else if (data.error && data.error !== 'authorization_pending') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('idle');
          setErrorMessage(data.error_description || data.error);
        }
      } catch (e) {
        // network retry
      }
    }, intervalMs);
  };

  const handleLogout = async () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    await clearYtCredentials();
    setIsLoggedIn(false);
    setAccount(null);
    setStatus('idle');
    setDeviceCode(null);
    if (onAuthChanged) onAuthChanged();
  };

  const copyCode = () => {
    if (deviceCode?.user_code) {
      navigator.clipboard.writeText(deviceCode.user_code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#12151c] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Ajustes de Cuenta</h2>
                <p className="text-xs text-slate-400 mt-0.5">Gestión de sesión y sincronización con YouTube</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Cerrar ajustes"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Account Status Indicator */}
              <div id="account-status-card" className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Estado de la cuenta
                  </span>
                  {isLoggedIn ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      No conectado
                    </span>
                  )}
                </div>

                {isLoggedIn ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {account?.photo ? (
                        <img
                          src={account.photo}
                          alt="Avatar"
                          className="w-11 h-11 rounded-full border border-white/15 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-base">
                          {account?.name ? account.name.charAt(0).toUpperCase() : <UserCheck className="w-5 h-5" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {account?.name || 'Usuario de YouTube'}
                        </h4>
                        <p className="text-xs text-emerald-400/90 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Sesión activa y persistente
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Almacenamiento:</span>
                        <span className="text-slate-300 font-mono">Cookie HTTP-Only + Local</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sincronización:</span>
                        <span className="text-emerald-400">Me gustas y Playlists privadas</span>
                      </div>
                    </div>

                    {/* Prominent Logout Button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold rounded-xl transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión de YouTube
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Conecta tu cuenta de YouTube Music para sincronizar automáticamente tus canciones con "Me gusta", historial de reproducción y tus listas privadas.
                    </p>

                    {status === 'idle' && (
                      <button
                        type="button"
                        onClick={handleConnect}
                        className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-rose-600/20 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Radio className="w-4 h-4" />
                        Conectar cuenta de Google / YouTube
                      </button>
                    )}

                    {status === 'loading' && (
                      <div className="w-full py-3 bg-white/5 text-slate-300 text-xs font-medium rounded-xl flex items-center justify-center gap-2 border border-white/5">
                        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        Obteniendo código de vinculación...
                      </div>
                    )}
                  </div>
                )}

                {errorMessage && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Pending Device Code Card */}
              {!isLoggedIn && status === 'pending' && deviceCode && (
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center">
                  <span className="text-xs font-medium text-slate-300 mb-2">
                    1. Copia este código de 8 letras:
                  </span>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-black/60 border border-white/15 px-5 py-2.5 rounded-xl font-mono text-2xl font-bold tracking-widest text-rose-400 select-all">
                      {deviceCode.user_code}
                    </div>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                      title="Copiar código"
                    >
                      {isCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  {isCopied && (
                    <p className="text-[11px] text-emerald-400 font-medium mb-3">
                      ✓ ¡Código copiado al portapapeles!
                    </p>
                  )}

                  <span className="text-xs font-medium text-slate-300 mb-2">
                    2. Ábrelo en tu navegador e ingresa el código:
                  </span>

                  <a
                    href={deviceCode.verification_url || 'https://www.google.com/device'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.99] mb-4 shadow-lg shadow-rose-600/25"
                  >
                    <span>Abrir google.com/device</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                    <span>Esperando tu confirmación en Google...</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
