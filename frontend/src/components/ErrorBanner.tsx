interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-900">
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        className="rounded-md border border-rose-400 px-2 py-1 text-xs font-semibold"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  );
}
