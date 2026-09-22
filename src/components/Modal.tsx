import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  labelledBy?: string;
}

export function Modal({ title, children, labelledBy = 'modal-title' }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <h2 id={labelledBy}>{title}</h2>
        {children}
      </section>
    </div>
  );
}
