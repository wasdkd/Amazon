import React from 'react';
import { useCommunity } from '../context/CommunityContext';
import { CheckCircle2, AlertCircle, Info, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastNotification: React.FC = () => {
  const { toasts, dismissToast } = useCommunity();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgClass = 'bg-white/95 border-slate-200 text-slate-800';
          let icon = <Info className="w-5 h-5 text-indigo-500 shrink-0" />;

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-50/95 border-emerald-200 text-emerald-900';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
          } else if (toast.type === 'nudge') {
            bgClass = 'bg-amber-50/95 border-amber-300 text-amber-900 shadow-amber-200/50';
            icon = <Zap className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />;
          } else if (toast.type === 'warning') {
            bgClass = 'bg-rose-50/95 border-rose-200 text-rose-900';
            icon = <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg backdrop-blur-md flex items-start gap-3 ${bgClass}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold leading-snug">{toast.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{toast.message}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
