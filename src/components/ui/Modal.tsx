import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  extraWide?: boolean;
  className?: string;
}

export default function Modal({ open, onClose, title, children, wide, extraWide, className }: ModalProps) {
  if (!open) return null;
  return (
    <div className={`modal-overlay ${className || ''}`} onClick={onClose}>
      <div className={`modal-content ${extraWide ? 'modal-extra-wide' : wide ? 'modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
