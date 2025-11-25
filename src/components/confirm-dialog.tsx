import {
  useEffect,
  useId,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disableOutsideClick?: boolean;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  loading = false,
  loadingLabel = "Confirmando...",
  disableOutsideClick = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = description ? useId() : undefined;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  const handleOverlayClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (disableOutsideClick || loading) {
      return;
    }

    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onMouseDown={handleOverlayClick}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-[32px] p-6 shadow-xl",
          "neu-card-reversed space-y-4"
        )}
      >
        <header className="space-y-2">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <div
              id={descriptionId}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {description}
            </div>
          ) : null}
        </header>
        <footer className="flex justify-end gap-3">
          <button
            type="button"
            className={cn(
              "neu-button rounded-[24px] px-4 py-2 text-sm font-semibold",
              "text-muted-foreground"
            )}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "neu-button rounded-[24px] px-4 py-2 text-sm font-semibold",
              "text-destructive"
            )}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
