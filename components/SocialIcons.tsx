export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 2a8 8 0 0 1 6.6 12.5l-.3.5.6 2.2-2.3-.6-.5.3A8 8 0 1 1 12 4Zm-3.3 3.7c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.1 1.8 2.8 4.3 3.8 2.1.9 2.5.7 3 .6.4 0 1.3-.5 1.5-1 .2-.5.2-1 .1-1.1-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.1-.3.2-.5.1a6 6 0 0 1-1.8-1.1 6.6 6.6 0 0 1-1.3-1.6c-.1-.2 0-.4.1-.5l.5-.6c.1-.2.2-.3.1-.5l-.8-1.9c-.1-.3-.3-.3-.5-.3h-.4Z" />
    </svg>
  );
}

export function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 3c.3 1.8 1.5 3.2 3.3 3.6.4.1.9.2 1.3.2v2.9c-1.3 0-2.6-.4-3.7-1.1v6c0 3-2.4 5.4-5.4 5.4S4 17.6 4 14.6c0-2.9 2.2-5.2 5-5.4v2.9c-1.2.2-2.1 1.2-2.1 2.5 0 1.4 1.1 2.5 2.5 2.5s2.6-1.1 2.6-2.5V3H14Z" />
    </svg>
  );
}
