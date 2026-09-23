type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconDashboard({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconLibrary({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 19.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14" />
      <path d="M10 19.5V4.8a1 1 0 0 1 .78-.97l3.9-.9a1 1 0 0 1 1.22.97v15.6" />
      <path d="M16 19.5l3.3-1a1 1 0 0 0 .7-.96V7.3a1 1 0 0 0-1.3-.95L16 7.2" />
      <path d="M3 19.5h18" />
    </svg>
  );
}

export function IconSparkles({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M11 3.5l1.4 3.6a2 2 0 0 0 1.15 1.15l3.6 1.4-3.6 1.4a2 2 0 0 0-1.15 1.15L11 15.8l-1.4-3.6a2 2 0 0 0-1.15-1.15L4.85 9.65l3.6-1.4A2 2 0 0 0 9.6 7.1L11 3.5z" />
      <path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  );
}

export function IconInbox({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3.5 13l2.4-7.3a1 1 0 0 1 .95-.7h10.3a1 1 0 0 1 .95.7L20.5 13" />
      <path d="M3.5 13v5.5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V13" />
      <path d="M3.5 13h4.6l1 2.1a1 1 0 0 0 .9.57h4a1 1 0 0 0 .9-.57l1-2.1h4.6" />
    </svg>
  );
}

export function IconUpload({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 15.5V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 7h14" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7l.7 12a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4.5 12.5l5 5 10-10.5" />
    </svg>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3.5l9.5 16.5H2.5L12 3.5z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSpinner({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

export function IconFile({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6.5 3.5h7l4 4v13a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
      <path d="M13.2 3.5v3.8a1 1 0 0 0 1 1h3.8" />
    </svg>
  );
}

export function IconQuiz({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.1.9-1.1 1.7" />
      <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrivia({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3.5l2.1 4.4 4.9.7-3.5 3.4.8 4.9-4.3-2.3-4.3 2.3.8-4.9-3.5-3.4 4.9-.7z" />
    </svg>
  );
}

export function IconDigest({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" />
    </svg>
  );
}
