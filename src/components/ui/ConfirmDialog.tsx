import { useEffect } from 'react';

let confirmCount = 0;

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmStyle?: 'danger' | 'primary';
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel, confirmText = 'Eliminar', confirmStyle = 'danger' }: ConfirmDialogProps) {
  useEffect(() => {
    if (open) {
      confirmCount++;
      document.body.style.overflow = 'hidden';
      return () => {
        confirmCount--;
        if (confirmCount <= 0) {
          confirmCount = 0;
          // Don't restore overflow here — let Modal handle it
        }
      };
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 300 }} onClick={onCancel}>
      <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ marginBottom: '1.5rem', fontSize: '1.05rem' }}>{message}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
            <button className={`btn btn-${confirmStyle}`} onClick={onConfirm}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
