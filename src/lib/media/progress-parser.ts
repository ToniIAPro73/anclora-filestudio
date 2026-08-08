export function parseProgress(line: string): number | null {
  // yt-dlp: [download]  12.3% of 10.00MiB at 1.23MiB/s ETA 00:01
  const ytMatch = line.match(/\[download\]\s+([\d.]+)%/);
  if (ytMatch) {
    return parseFloat(ytMatch[1]);
  }

  // FFmpeg: time=00:01:23.45 (requires duration context)
  // This returns null from parseProgress because we need total duration
  // to compute percentage. Use parseFfmpegTimeProgress() for that.
  return null;
}

/**
 * Parse FFmpeg progress line and compute percentage from duration.
 * FFmpeg outputs lines like:
 *   "frame=  120 fps= 30 q=28.0 size=    1024kB time=00:00:04.00 bitrate= 2097.2kbits/s speed=  1x"
 * Returns percentage (0-100) if duration is known, or the current time in seconds if not.
 */
export function parseFfmpegTimeProgress(
  line: string,
  totalDurationSeconds?: number | null,
): { percent: number | null; currentTimeSeconds: number } | null {
  const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.?\d*)/);
  if (!timeMatch) return null;

  const hours = parseFloat(timeMatch[1]);
  const minutes = parseFloat(timeMatch[2]);
  const seconds = parseFloat(timeMatch[3]);
  const currentTime = hours * 3600 + minutes * 60 + seconds;

  if (totalDurationSeconds && totalDurationSeconds > 0) {
    return {
      percent: Math.min(100, (currentTime / totalDurationSeconds) * 100),
      currentTimeSeconds: currentTime,
    };
  }

  return {
    percent: null, // indeterminate without total duration
    currentTimeSeconds: currentTime,
  };
}
