export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDangerous = false }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm px-4 py-8 flex items-center justify-center">
      <div className="max-w-sm w-full rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-2xl">
        {title ? (
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        ) : null}
        
        <p className="text-slate-300 mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              isDangerous
                ? 'border border-red-500/50 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                : 'border border-teal-500/50 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
