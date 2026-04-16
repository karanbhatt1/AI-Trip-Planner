export default function AlertDialog({ isOpen, title, message, onClose, type = "info" }) {
  if (!isOpen) {
    return null;
  }

  const colorClass = {
    error: "border-red-500/40 bg-red-500/10 text-red-300",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    info: "border-teal-500/40 bg-teal-500/10 text-teal-300",
  }[type] || "border-teal-500/40 bg-teal-500/10 text-teal-300";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm px-4 py-8 flex items-center justify-center">
      <div className={`max-w-sm w-full rounded-2xl border ${colorClass} p-6 shadow-2xl`}>
        {title ? (
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
        ) : null}
        
        <p className="mb-6">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition ${
            type === "error"
              ? "border border-red-500/50 bg-red-500/10 text-red-200 hover:bg-red-500/20"
              : type === "success"
              ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
              : type === "warning"
              ? "border border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
              : "border border-teal-500/50 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20"
          }`}
        >
          OK
        </button>
      </div>
    </div>
  );
}
