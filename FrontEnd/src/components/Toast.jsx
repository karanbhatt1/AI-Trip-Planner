import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ isOpen, type = 'info', title, message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, duration]);

  if (!isOpen) return null;

  const styles = {
    success: { bg: 'bg-emerald-900/90', border: 'border-emerald-600', icon: CheckCircle, iconColor: 'text-emerald-500' },
    error: { bg: 'bg-red-900/90', border: 'border-red-600', icon: AlertCircle, iconColor: 'text-red-400' },
    warning: { bg: 'bg-amber-900/90', border: 'border-amber-600', icon: AlertCircle, iconColor: 'text-amber-400' },
    info: { bg: 'bg-blue-900/90', border: 'border-blue-600', icon: Info, iconColor: 'text-blue-400' },
  };

  const style = styles[type];
  const IconComponent = style.icon;

  return (
    <div className={`fixed top-6 right-6 z-50 ${style.bg} border ${style.border} rounded-lg p-4 shadow-2xl backdrop-blur-md max-w-sm animate-slide-in`}>
      <div className="flex items-start gap-3">
        <IconComponent className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && <h4 className="font-semibold text-white text-sm">{title}</h4>}
          {message && <p className={`text-sm ${title ? 'text-slate-200 mt-1' : 'text-white'}`}>{message}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-white transition flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
