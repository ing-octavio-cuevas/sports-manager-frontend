import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

// Shared scroll lock counter between Modal and ConfirmDialog
export let scrollLockCount = 0;
export function lockScroll() {
  if (scrollLockCount === 0) {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
  }
  scrollLockCount++;
}
export function unlockScroll() {
  scrollLockCount--;
  if (scrollLockCount <= 0) {
    scrollLockCount = 0;
    const scrollY = document.body.style.top;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
  }
}

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
