import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  labelledBy?: string;
  className?: string;
}

export function Modal({ title, children, labelledBy = 'modal-title', className = '' }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`modal-card ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <h2 id={labelledBy}>{title}</h2>
        {children}
      </section>
    </div>
  );
}
