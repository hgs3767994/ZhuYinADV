import type { ReactNode } from 'react';

interface ImageMenuButtonProps {
  image: string;
  label: string;
  onClick: () => void;
  className?: string;
  children?: ReactNode;
}

export function ImageMenuButton({
  image,
  label,
  onClick,
  className = '',
  children
}: ImageMenuButtonProps) {
  return (
    <button className={`image-menu-button ${className}`} onClick={onClick} aria-label={label}>
      <img src={image} alt="" draggable="false" />
      {children}
    </button>
  );
}
