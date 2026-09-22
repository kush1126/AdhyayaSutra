// YouTube Data API v3 utility for fetching educational videos

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  description: string;
  publishedAt: string;
}

export async function searchEducationalVideos(
  query: string,
  maxResults: number = 3
): Promise<YouTubeVideo[]> {
  // If no API key, return empty (graceful degradation)
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not set. Generating placeholder video links.');
    return generateFallbackVideos(query, maxResults);
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: `${query} tutorial educational explained`,
      type: 'video',
      maxResults: String(maxResults),
      videoDuration: 'medium',
      relevanceLanguage: 'en',
      safeSearch: 'strict',
      order: 'relevance',
      key: YOUTUBE_API_KEY,
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return generateFallbackVideos(query, maxResults);
    }

    const data = await response.json();

    return (data.items || []).map((item: any) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || 'Educational Video',
      channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      description: item.snippet?.description || '',
      publishedAt: item.snippet?.publishedAt || '',
    }));
  } catch (error) {
    console.error('YouTube search failed:', error);
    return generateFallbackVideos(query, maxResults);
  }
}

// Fallback: generate YouTube search links when API key isn't available
function generateFallbackVideos(query: string, count: number): YouTubeVideo[] {
  const encodedQuery = encodeURIComponent(query);
  const fallbacks: YouTubeVideo[] = [];

  const channels = [
    { name: 'Khan Academy', id: 'khanacademy' },
    { name: '3Blue1Brown', id: '3blue1brown' },
    { name: 'CrashCourse', id: 'crashcourse' },
    { name: 'Organic Chemistry Tutor', id: 'TheOrganicChemistryTutor' },
    { name: 'freeCodeCamp', id: 'freecodecamp' },
  ];

  for (let i = 0; i < Math.min(count, channels.length); i++) {
    fallbacks.push({
      videoId: '',
      title: `${query} — ${channels[i].name}`,
      channelTitle: channels[i].name,
      thumbnail: `https://placehold.co/320x180/1a1a2e/e94560?text=${encodeURIComponent(channels[i].name)}`,
      description: `Search for "${query}" on ${channels[i].name}`,
      publishedAt: new Date().toISOString(),
    });
  }

  return fallbacks;
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' tutorial')}`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
