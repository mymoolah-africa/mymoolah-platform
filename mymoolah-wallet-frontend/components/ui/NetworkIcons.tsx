import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export function VodacomIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#E60000" />
      <path d="M16 6C10.48 6 6 10.48 6 16s4.48 10 10 10 10-4.48 10-10S21.52 6 16 6zm0 17.5c-4.14 0-7.5-3.36-7.5-7.5S11.86 8.5 16 8.5s7.5 3.36 7.5 7.5-3.36 7.5-7.5 7.5z" fill="#fff" />
      <circle cx="16" cy="16" r="3.5" fill="#fff" />
    </svg>
  );
}

export function MTNIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#FFCC00" />
      <text x="16" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="12" fill="#003087">MTN</text>
    </svg>
  );
}

export function CellCIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#000000" />
      <text x="16" y="13" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7" fill="#fff">Cell</text>
      <text x="16" y="23" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="11" fill="#00AEEF">C</text>
    </svg>
  );
}

export function TelkomIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#0054A6" />
      <text x="16" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="8" fill="#fff">TKM</text>
    </svg>
  );
}

export function WhatsAppIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.88L2 22l5.23-1.24A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.62 0-3.13-.48-4.4-1.3l-.31-.19-3.23.77.82-3.14-.21-.33A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.39-5.97c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12s-.62.78-.76.94c-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3s-.84.82-.84 2 .86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" fill="#25D366"/>
    </svg>
  );
}

export function TikTokIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.12V9.01a6.37 6.37 0 00-.82-.05A6.34 6.34 0 003.15 15.3 6.34 6.34 0 009.49 21.64 6.34 6.34 0 0015.83 15.3V8.56a8.29 8.29 0 003.76.94V6.07c-.01 0-.01.62 0 .62z" fill="#000"/>
    </svg>
  );
}

export function FacebookIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
    </svg>
  );
}

export function YouTubeIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
    </svg>
  );
}

export function DataIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2D8CCA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0114.08 0" />
      <path d="M1.42 9a16 16 0 0121.16 0" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <circle cx="12" cy="20" r="1" fill="#2D8CCA" />
    </svg>
  );
}

export function LTEIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="4" width="22" height="16" rx="3" fill="#2D8CCA" />
      <text x="12" y="15" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="8" fill="#fff">LTE</text>
    </svg>
  );
}

export function AllNetworkIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

export function StreamingIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" fill="#e11d48" />
    </svg>
  );
}

export function getNetworkIcon(network: string, size = 32): React.ReactNode {
  const n = (network || '').toLowerCase().replace(/\s+/g, '');
  if (n.includes('vodacom')) return <VodacomIcon size={size} />;
  if (n.includes('mtn')) return <MTNIcon size={size} />;
  if (n.includes('cellc') || n.includes('cell c')) return <CellCIcon size={size} />;
  if (n.includes('telkom')) return <TelkomIcon size={size} />;
  return <DataIcon size={size} />;
}

export function getCategoryIcon(category: string, size = 18): React.ReactNode {
  switch (category) {
    case 'whatsapp': return <WhatsAppIcon size={size} />;
    case 'tiktok': return <TikTokIcon size={size} />;
    case 'facebook': return <FacebookIcon size={size} />;
    case 'youtube': return <YouTubeIcon size={size} />;
    case 'lte': return <LTEIcon size={size} />;
    case 'allnetwork': return <AllNetworkIcon size={size} />;
    case 'streaming': return <StreamingIcon size={size} />;
    default: return <DataIcon size={size} />;
  }
}
