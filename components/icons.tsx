type IconProps = { className?: string };

export function PizzaIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.6c3.9 0 7 .9 9 2.1-1.4 5.7-4.8 11.2-9 17.2-4.2-6-7.6-11.5-9-17.2 2-1.2 5.1-2.1 9-2.1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 8.2c4.2-1.6 8.8-1.6 13 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="9.8" cy="12" r="1.05" fill="currentColor" />
      <circle cx="14.1" cy="14.2" r="1.05" fill="currentColor" />
    </svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M11.8 4.8 6.6 10l5.2 5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M8.2 4.8 13.4 10l-5.2 5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M5.5 7V3.8h9V7M5.5 14.5H4a1.3 1.3 0 0 1-1.3-1.3V9.6A1.6 1.6 0 0 1 4.3 8h11.4a1.6 1.6 0 0 1 1.6 1.6v3.6a1.3 1.3 0 0 1-1.3 1.3h-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5.5"
        y="12"
        width="9"
        height="4.8"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <rect
        x="7"
        y="7"
        width="9"
        height="9"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M13 7V5.8A1.8 1.8 0 0 0 11.2 4H5.8A1.8 1.8 0 0 0 4 5.8v5.4A1.8 1.8 0 0 0 5.8 13H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M4.5 6.2h11M8.2 6.2V4.6h3.6v1.6M6 6.2l.6 9.2h6.8l.6-9.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M10 3.5v8.2m0 0 3.2-3.2M10 11.7 6.8 8.5M4 14.5v1.2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M10 13.5V5.3m0 0L6.8 8.5M10 5.3l3.2 3.2M4 14.5v1.2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WarningIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M10 3.4 17 16H3l7-12.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 8v3.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="13.7" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path
        d="m4.8 10.4 3.4 3.4 7-7.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.2l1.2-4.3a8.5 8.5 0 1 1 15.8-4.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 7.8c.2-.5.9-.5 1.1 0l.7 1.6c.1.3 0 .6-.2.8l-.5.4c-.2.2-.3.5-.2.7.4.9 1.1 1.6 2 2 .2.1.5 0 .7-.2l.4-.5c.2-.2.5-.3.8-.2l1.6.7c.5.2.5.9 0 1.1-.6.4-1.4.7-2.2.5-2.9-.6-5.1-2.8-5.7-5.7-.2-.8.1-1.6.5-2.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TeamIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <circle cx="7.6" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.8 16c.4-2.6 2.3-4.1 4.8-4.1s4.4 1.5 4.8 4.1M12.6 4.8a2.4 2.4 0 0 1 0 4.6M14.4 12.2c1.6.4 2.6 1.7 2.9 3.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
