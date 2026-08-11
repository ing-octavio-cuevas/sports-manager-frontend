import { useEffect, useRef } from 'react';
import { lockScroll, unlockScroll } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmStyle?: 'danger' | 'primary';
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel, confirmText = 'Eliminar', confirmStyle = 'danger' }: ConfirmDialogProps) {
  const locked = useRef(false);

  useEffect(() => {
    if (open && !locked.current) {
      locked.current = true;
      lockScroll();
    } else if (!open && locked.current) {
      locked.current = false;
      unlockScroll();
    }
    return () => {
      if (locked.current) {
        locked.current = false;
        unlockScroll();
      }
    };
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
