const ALLOWED_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
];

export function normalizeYoutubeUrl(inputUrl: string): string | null {
  try {
    const url = new URL(inputUrl.trim());
    
    // Check protocol
    if (url.protocol !== 'https:') return null;
    
    // Check host
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.includes(host)) return null;
    
    let videoId: string | null = null;
    
    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] ?? null;
      } else if (url.pathname.startsWith('/live/')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] ?? null;
      }
    }
    
    if (!videoId || videoId.length !== 11 || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return null;
    }
    
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    return null;
  }
}

export function extractVideoId(inputUrl: string): string | null {
  const normalized = normalizeYoutubeUrl(inputUrl);
  if (!normalized) return null;
  return new URL(normalized).searchParams.get('v');
}
