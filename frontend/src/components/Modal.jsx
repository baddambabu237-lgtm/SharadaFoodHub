import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warmgray-900/60 backdrop-blur-sm animate-fadein">
      <div className="relative w-full max-w-lg overflow-hidden bg-white rounded-2xl shadow-xl border border-warmgray-100 dark:bg-warmgray-800 dark:border-warmgray-700 animate-slideup max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-warmgray-100 dark:border-warmgray-700">
          <h3 className="text-lg font-bold text-warmgray-900 dark:text-white font-display">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-warmgray-400 hover:bg-warmgray-50 hover:text-warmgray-600 dark:hover:bg-warmgray-700 dark:hover:text-warmgray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
