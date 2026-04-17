import { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const showToast = (type, title, message) => {
    setToast({ isOpen: true, type, title, message });
  };

  const hideToast = () => {
    setToast({ isOpen: false, type: 'info', title: '', message: '' });
  };

  const value = {
    toast,
    showToast,
    hideToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}