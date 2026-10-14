interface SpeakerIconProps {
  className?: string;
}

export function SpeakerIcon({ className = 'speaker-icon' }: SpeakerIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 52 40"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="13" width="12" height="14" rx="3" fill="#475569" />
      <path d="M14 13 28 3v34L14 27Z" fill="#e2e8f0" />
      <path
        d="M33 12c4 4 4 12 0 16M38 6c8 8 8 20 0 28"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
