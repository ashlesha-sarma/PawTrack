import React from 'react';

function IconBase({ className = 'w-5 h-5', strokeWidth = 1.8, children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoMark({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7.15 10.2a2.35 2.35 0 1 0 0-4.7 2.35 2.35 0 0 0 0 4.7Zm9.7 0a2.35 2.35 0 1 0 0-4.7 2.35 2.35 0 0 0 0 4.7Zm-4.85-1.4a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Zm-5.3 7.55c0-2.6 2.55-4.75 5.3-4.75s5.3 2.15 5.3 4.75c0 1.55-1.35 2.75-3 2.75H9.7c-1.65 0-3-1.2-3-2.75Z" />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </IconBase>
  );
}

export function MoonIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 14.2A7.6 7.6 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z" />
    </IconBase>
  );
}

export function MenuIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

export function XIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </IconBase>
  );
}

export function ChevronDownIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function ArrowRightIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </IconBase>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </IconBase>
  );
}

export function UserIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M18 20a6 6 0 0 0-12 0" />
      <circle cx="12" cy="8" r="4" />
    </IconBase>
  );
}

export function SettingsIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.26 1 1.51H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.39-1.51 1Z" />
    </IconBase>
  );
}

export function LogoutIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </IconBase>
  );
}

export function SearchIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function FilterIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </IconBase>
  );
}

export function MapPinIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 21s-6-5.4-6-11a6 6 0 1 1 12 0c0 5.6-6 11-6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  );
}

export function HeartIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m12 20-1.1-1C5.1 13.8 2 11 2 7.5A4.5 4.5 0 0 1 6.5 3 5 5 0 0 1 12 6.1 5 5 0 0 1 17.5 3 4.5 4.5 0 0 1 22 7.5c0 3.5-3.1 6.3-8.9 11.5L12 20Z" />
    </IconBase>
  );
}

export function ShieldCheckIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 6v5c0 5 3.4 8.9 7 10 3.6-1.1 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

export function SyringeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m14.5 4.5 5 5" />
      <path d="m7 7 10 10" />
      <path d="m6 8 2-2 10 10-2 2a2.83 2.83 0 0 1-4 0L6 12a2.83 2.83 0 0 1 0-4Z" />
      <path d="M3 21l6-6M14 5l2-2M17 8l2-2" />
    </IconBase>
  );
}

export function StethoscopeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 3v6a4 4 0 0 0 8 0V3" />
      <path d="M8 3v4M14 3v4" />
      <path d="M14 14a5 5 0 1 0 5 5v-2" />
      <circle cx="19" cy="15" r="2" />
    </IconBase>
  );
}

export function CalendarIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="4" width="18" height="17" rx="2" />
    </IconBase>
  );
}

export function HomeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m3 11 9-7 9 7" />
      <path d="M5 10.5V20h14v-9.5" />
    </IconBase>
  );
}

export function ClipboardIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4.5h6a1.5 1.5 0 0 0-3-1.5h0A1.5 1.5 0 0 0 9 4.5Z" />
      <path d="M9 10h6M9 14h6" />
    </IconBase>
  );
}

export function BuildingIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 21V6a2 2 0 0 1 2-2h8v17M14 9h6v12M8 8h2M8 12h2M8 16h2M16 13h2M16 17h2" />
    </IconBase>
  );
}

export function MailIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </IconBase>
  );
}

export function ClockIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function UsersIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-1.5a3.5 3.5 0 0 0-3.5-3.5h-1A3.5 3.5 0 0 0 8 19.5V21" />
      <circle cx="12" cy="10" r="3" />
      <path d="M19 21v-1a3 3 0 0 0-2.4-2.9M5 21v-1a3 3 0 0 1 2.4-2.9M17 7.5a2.5 2.5 0 1 1 0 5M7 7.5a2.5 2.5 0 1 0 0 5" />
    </IconBase>
  );
}

export function CheckCircleIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </IconBase>
  );
}

export function XCircleIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </IconBase>
  );
}

export function AlertTriangleIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v4M12 17h.01" />
    </IconBase>
  );
}

export function CameraIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </IconBase>
  );
}

export function ShareIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 11 7-4M8.2 13l7 4" />
    </IconBase>
  );
}

export function CopyIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M5 15V7a2 2 0 0 1 2-2h8" />
    </IconBase>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </IconBase>
  );
}

export function DogIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 11V8l2-2 3 1 2-2h4l2 2v6l-2 4H9l-4-6Z" />
      <path d="M10 13h4M9 11h.01M15 11h.01" />
    </IconBase>
  );
}

export function CatIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m7 7 2-3 3 2 3-2 2 3v5a5 5 0 0 1-10 0V7Z" />
      <path d="M9 11h.01M15 11h.01M10 14c.7.7 2.3.7 3 0M8 16l-2 1M16 16l2 1" />
    </IconBase>
  );
}

export function PawIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 10.5a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6ZM16 10.5a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6ZM12 8.5A1.8 1.8 0 1 1 12 4.9a1.8 1.8 0 0 1 0 3.6ZM9 18c-1.3 0-2.2-.9-2.2-2 0-2 2.3-3.7 5.2-3.7s5.2 1.7 5.2 3.7c0 1.1-.9 2-2.2 2H9Z" />
    </IconBase>
  );
}

export function GenderIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="13" r="4" />
      <path d="M11 17v4M9 19h4M15 9l5-5M16 4h4v4" />
    </IconBase>
  );
}
