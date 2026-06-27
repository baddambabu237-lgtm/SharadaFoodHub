import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Remove toast after 3 seconds (aligns with 3s animation sequence)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const success = useCallback((msg) => show(msg, 'success'), [show]);
  const error = useCallback((msg) => show(msg, 'error'), [show]);
  const info = useCallback((msg) => show(msg, 'info'), [show]);

  const remove = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {/* Toast Render Overlay container */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-notification pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-lg border text-xs font-semibold ${
              t.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/90 dark:border-green-900 dark:text-green-300'
                : t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/90 dark:border-red-900 dark:text-red-300'
                : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/90 dark:border-blue-900 dark:text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span className="leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => remove(t.id)}
              className="ml-3 text-warmgray-400 hover:text-warmgray-600 dark:hover:text-white shrink-0 p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
