import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/* Brand red aligned with Sentra logo / MyTelkomsel-like accent */
const PRIMARY = '#A00000';
const SECONDARY = 'currentColor';

export const IconHome = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke={SECONDARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={SECONDARY} fillOpacity="0.1" />
    <path d="M9 22V12H15V22" fill={PRIMARY} />
  </svg>
);

export const IconCategory = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" fill={PRIMARY} />
    <rect x="14" y="3" width="7" height="7" rx="1.5" fill={SECONDARY} fillOpacity="0.4" stroke={SECONDARY} strokeWidth="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" fill={PRIMARY} />
    <rect x="3" y="14" width="7" height="7" rx="1.5" fill={SECONDARY} fillOpacity="0.4" stroke={SECONDARY} strokeWidth="1.5" />
  </svg>
);

export const IconCart = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke={SECONDARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={SECONDARY} fillOpacity="0.1" />
    <path d="M3 6H21" stroke={SECONDARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconOrders = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill={PRIMARY} />
    <path d="M2 17L12 22L22 17" stroke={SECONDARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12L12 17L22 12" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 7V17L12 22V12L2 7Z" fill={SECONDARY} fillOpacity="0.2" />
  </svg>
);

export const IconUser = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M20 21C20 19.6044 20.0001 17.5 16.5 16.5C14.5 15.9282 13.5 15 12 15C10.5 15 9.5 15.9282 7.5 16.5C4 17.5 4 19.6044 4 21" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="7" r="4" stroke={SECONDARY} strokeWidth="2" fill={SECONDARY} fillOpacity="0.1" />
  </svg>
);

/** Login / sign-in door icon — used in bottom nav when guest */
export const IconLogin = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke={SECONDARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={SECONDARY} fillOpacity="0.08" />
    <path d="M10 17l5-5-5-5" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 12H3" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconBell = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

