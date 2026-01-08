import { RadioStation } from '../types';
import { RADIO_BROWSER_MIRRORS } from '../constants';

const CACHE_KEY_PREFIX = 'streamflow_station_cache_v9_'; // Increment version to invalidate old cache
const CACHE_TTL_MINUTES = 30;

interface CacheEntry {
    data: RadioStation[];
    timestamp: number; 
}

const HARDCODED_STATIONS: RadioStation[] = [
    {
        changeuuid: 'nature-radio-rain-001',
        stationuuid: 'nature-radio-rain-001',
        name: 'Nature Radio Rain',
        url: 'https://cdn.pixabay.com/download/audio/2022/07/04/audio_3d69af9730.mp3',
        url_resolved: 'https://cdn.pixabay.com/download/audio/2022/07/04/audio_3d69af9730.mp3',
        homepage: 'https://zeno.fm/radio/nature-radio-rain/',
        favicon: 'https://d3403e54c2.clvaw-cdnwnd.com/5e297b47565c697c4596102607590202/200000033-2592525926/nature-radio-logo-2.png',
        tags: 'nature,rain,ambient,sleep,relaxation',
        country: 'Global',
        state: '',
        language: 'English',
        votes: 1000000, 
        codec: 'MP3',
        bitrate: 128
    }
];

// Stations explicitly moved to the Islamic category - Restricted to 3
const HARDCODED_ISLAMIC: RadioStation[] = [
    {
        changeuuid: 'mohammed-ayyub-001',
        stationuuid: 'mohammed-ayyub-001',
        name: '..mohammed_ayyub',
        url: 'https://backup.qurango.net/radio/mohammed_ayyub',
        url_resolved: 'https://backup.qurango.net/radio/mohammed_ayyub',
        homepage: '',
        favicon: '',
        tags: 'islamic,quran',
        country: 'Saudi Arabia',
        state: '',
        language: 'Arabic',
        votes: 85000,
        codec: 'MP3',
        bitrate: 128
    },
    {
        changeuuid: 'tarateel-quran-001',
        stationuuid: 'tarateel-quran-001',
        name: '. quran',
        url: 'https://backup.qurango.net/radio/tarateel',
        url_resolved: 'https://backup.qurango.net/radio/tarateel',
        homepage: '',
        favicon: '',
        tags: 'islamic,quran',
        country: 'Saudi Arabia',
        state: '',
        language: 'Arabic',
        votes: 80000,
        codec: 'MP3',
        bitrate: 128
    },
    {
        changeuuid: 'maher-al-muaiqly-001',
        stationuuid: 'maher-al-muaiqly-001',
        name: 'إذاعة ماهر المعيقلي .',
        url: 'https://backup.qurango.net/radio/maher',
        url_resolved: 'https://backup.qurango.net/radio/maher',
        homepage: '',
        favicon: '',
        tags: 'islamic,quran',
        country: 'Saudi Arabia',
        state: '',
        language: 'Arabic',
        votes: 88000,
        codec: 'MP3',
        bitrate: 128
    },
    {
        changeuuid: 'beautiful-recitation-001',
        stationuuid: 'beautiful-recitation-001',
        name: 'beautiful recitation',
        url: 'https://backup.qurango.net/radio/mix',
        url_resolved: 'https://backup.qurango.net/radio/mix',
        homepage: '',
        favicon: '',
        tags: 'islamic,quran',
        country: 'Global',
        state: '',
        language: 'Arabic',
        votes: 70000,
        codec: 'MP3',
        bitrate: 128
    }
];

const MOVED_TO_ISLAMIC_NAMES = [
    "..mohammed_ayyub",
    ". quran",
    "إذاعة ماهر المعيقلي .",
    "beautiful recitation"
];

const WORLD_MUSIC_TAGS = ['vietnamese', 'vietnam', 'japanese', 'russian', 'spanish', 'italian', 'french', 'kazakh', 'kyrgyz', 'kavkaz', 'oriental', 'chinese'];

const getFromCache = (key: string): RadioStation[] | null => {
    try {
        const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
        if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            const now = Date.now();
            if (now - entry.timestamp < CACHE_TTL_MINUTES * 60 * 1000) {
                return entry.data;
            }
            localStorage.removeItem(CACHE_KEY_PREFIX + key);
        }
    } catch (e) {
        localStorage.removeItem(CACHE_KEY_PREFIX + key);
    }
    return null;
};

const setToCache = (key: string, data: RadioStation[]) => {
    try {
        const entry: CacheEntry = { data, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
    } catch (e) {}
};

const promiseAny = <T>(promises: Promise<T>[]): Promise<T> => {
    return new Promise((resolve, reject) => {
        let rejectedCount = 0;
        const errors: any[] = [];
        if (promises.length === 0) {
            return reject(new Error("No promises provided"));
        }
        promises.forEach((p, i) => {
            p.then(resolve).catch(err => {
                errors[i] = err;
                rejectedCount++;
                if (rejectedCount === promises.length) {
                    reject(new Error("All mirrors failed"));
                }
            });
        });
    });
};

const fetchAcrossMirrorsFast = async (path: string, urlParams: string): Promise<RadioStation[]> => {
    const query = urlParams ? `?${urlParams}` : '';
    
    const fetchPromises = RADIO_BROWSER_MIRRORS.map(async (baseUrl) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); 

        try {
            const response = await fetch(`${baseUrl}/${path}${query}`, {
                mode: 'cors',
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Mirror status not OK');
            return await response.json();
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    });

    try {
        return await promiseAny(fetchPromises);
    } catch (e) {
        console.warn("All fast mirrors failed, trying fallback...");
        throw new Error("Station source unavailable");
    }
};

const filterStations = (data: RadioStation[], currentTag?: string) => {
    if (!Array.isArray(data)) return [];
    
    const uniqueStations = new Map();
    const len = data.length;

    // Blocklist based on user request to remove specific stations
    const BLOCKED_NAMES = [
        "تفسير بن عثيمين رحمه الله",
        "صور من حياة الصحابة",
        "تراتيل",
        "إذاعة طريق السلف",
        "Radio Marca",
        "Erzincan Cem Radyo",
        "Fm.94.4",
        "Classic Vinyl HD",
        "Adroit Jazz Underground",
        "Спокойное радио",
        "Test",
        "Stream",
        "My Radio"
    ];

    // Regex to detect Arabic characters
    const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const isWorldMusic = currentTag && WORLD_MUSIC_TAGS.includes(currentTag);
    const isVietnamese = currentTag === 'vietnamese' || currentTag === 'vietnam';
    const isKyrgyz = currentTag === 'kyrgyz';
    
    for (let i = 0; i < len; i++) {
      const station = data[i];
      if (!station || !station.url_resolved) continue;

      // 1. QUALITY CHECK: Bitrate
      let minBitrate = 96;
      // High Quality Requirement for World Music Categories
      if (isWorldMusic) {
          minBitrate = 96; // Slightly relaxed to 96k for world music availability, 128k preferred
      }
      if (station.bitrate > 0 && station.bitrate < minBitrate) continue;

      // 2. QUALITY CHECK: Test Streams
      if (station.name.toLowerCase().includes('test')) continue;

      // 3. Permanent Blocklist
      if (BLOCKED_NAMES.some(n => station.name.includes(n))) continue;

      // 4. Filter moved stations if NOT in Islamic category
      if (currentTag !== 'islamic' && currentTag !== 'muslim') {
          if (MOVED_TO_ISLAMIC_NAMES.some(n => station.name === n || station.name.includes(n))) continue;
      }

      // WORLD MUSIC CLEANUP (No Talk/News/Religion)
      if (isWorldMusic) {
          const t = (station.tags || '').toLowerCase();
          const n = station.name.toLowerCase();

          // Vietnamese Exception
          if (isVietnamese) {
              if (t.includes('tin tức') || n.includes('tin tức') || t.includes('news')) continue;
          } 
          // Kyrgyz Exception: Allow mixed content but filter strict "news" if it's the *only* thing
          else if (isKyrgyz) {
              // Filter out explicit news/talk stations, but be careful not to kill music stations that have news
              if ((t.includes('news') || t.includes('talk')) && !t.includes('pop') && !t.includes('music') && !t.includes('hit')) continue;
          }
          else {
              // General cleanup for other world music
              if (t.includes('news') || t.includes('talk') || t.includes('politics') || t.includes('sport')) continue;
          }

          // Strict cleanup for Oriental/Eastern
          if (currentTag === 'oriental') {
              if (
                  t.includes('islam') || 
                  t.includes('quran') || 
                  t.includes('religion') || 
                  t.includes('recitation') ||
                  t.includes('bible')
              ) continue;
          }
      }

      // STRICT CLEANUP FOR CLASSICAL CATEGORY
      if (currentTag === 'classical') {
          const t = (station.tags || '').toLowerCase();
          const n = station.name.toLowerCase();
          
          if (t.includes('news') || t.includes('talk') || t.includes('speech') || t.includes('conversation') || t.includes('politics')) continue;

          if (
              t.includes('religio') || 
              t.includes('catholic') || 
              t.includes('christian') || 
              t.includes('church') || 
              t.includes('bible') || 
              t.includes('vatican') || 
              t.includes('islam') || 
              t.includes('quran') || 
              t.includes('muslim') ||
              t.includes('sheikh') ||
              t.includes('gospel') ||
              t.includes('worship') ||
              t.includes('prayer') ||
              t.includes('spirit') ||
              t.includes('orthodox') ||
              t.includes('chant') ||
              t.includes('sermon') ||
              t.includes('messianic') ||
              t.includes('torah') ||
              n.includes('radio maria') ||
              n.includes('esperance') ||
              n.includes('vatican')
          ) continue;

          if (ARABIC_CHAR_REGEX.test(station.name)) continue;
      }
      
      const url = station.url_resolved;
      if (url.charCodeAt(4) !== 115) continue; // Must be https
      
      const codec = (station.codec || '').toLowerCase();
      const isBrowserCompatible = 
        codec.includes('mp3') || 
        codec.includes('aac') || 
        url.includes('.mp3') || 
        url.includes('.aac') ||
        codec === '';

      if (isBrowserCompatible) {
        const existing = uniqueStations.get(station.name);
        if (!existing || station.votes > existing.votes) {
            uniqueStations.set(station.name, station);
        }
      }
    }

    return Array.from(uniqueStations.values())
        .sort((a: any, b: any) => b.votes - a.votes) as RadioStation[];
};

export const fetchStationsByTag = async (tag: string, limit: number = 30): Promise<RadioStation[]> => {
  let lowerTag = tag.toLowerCase();
  
  if (lowerTag === 'islamic' || lowerTag === 'muslim') {
      return HARDCODED_ISLAMIC;
  }

  // MAP VIETNAMESE to VIETNAM tag which is more common in API
  if (lowerTag === 'vietnamese') {
      lowerTag = 'vietnam';
  }

  const cacheKey = `tag_v9_${lowerTag}_l${limit}`;
  const cachedData = getFromCache(cacheKey);
  if (cachedData) return cachedData;

  try {
    let data: RadioStation[] = [];
    const fetchLimit = Math.max(20, Math.ceil(limit * 4));
    const urlParams = `limit=${fetchLimit}&order=votes&reverse=true&hidebroken=true`;

    // Special Handling for Vietnamese to ensuring specific terms are found
    if (lowerTag === 'vietnam') {
        // Fetch by country (broadest) AND by specific Vietnamese keywords requested
        const [countryData, musicData, radioData] = await Promise.all([
            fetchAcrossMirrorsFast(`bycountry/vietnam`, urlParams),
            fetchAcrossMirrorsFast(`byname/âm nhạc`, urlParams), // "Music" in Vietnamese
            fetchAcrossMirrorsFast(`byname/đài`, urlParams)      // "Station" in Vietnamese
        ]);
        data = [...countryData, ...musicData, ...radioData];
    } 
    // Special Handling for Kyrgyz
    else if (lowerTag === 'kyrgyz') {
        const [countryData, nameData, bishkekData, obonData] = await Promise.all([
            fetchAcrossMirrorsFast(`bycountry/kyrgyzstan`, urlParams),
            fetchAcrossMirrorsFast(`byname/кыргыз`, urlParams),
            fetchAcrossMirrorsFast(`byname/bishkek`, urlParams),
            fetchAcrossMirrorsFast(`byname/obon`, urlParams)
        ]);
        data = [...countryData, ...nameData, ...bishkekData, ...obonData];
    }
    else {
        // Standard tag search
        data = await fetchAcrossMirrorsFast(`bytag/${lowerTag}`, urlParams);
    }
    
    let result = filterStations(data, lowerTag).slice(0, limit);
    
    const hardcoded = HARDCODED_STATIONS.filter(s => s.tags.includes(lowerTag) || (lowerTag === 'nature' && s.name.includes('Nature')));
    if (hardcoded.length > 0) {
        const newStations = hardcoded.filter(h => !result.some(r => r.url_resolved === h.url_resolved));
        result = [...newStations, ...result];
    }
    
    if (result.length > 0) {
        setToCache(cacheKey, result);
    }
    return result;
  } catch (error) {
    const hardcoded = HARDCODED_STATIONS.filter(s => s.tags.includes(lowerTag));
    if (hardcoded.length > 0) return hardcoded;
    
    return [];
  }
};

export const fetchStationsByUuids = async (uuids: string[]): Promise<RadioStation[]> => {
    if (uuids.length === 0) return [];
    const cacheKey = `uuids_v9_${uuids.sort().join('_')}`;
    const cachedData = getFromCache(cacheKey);
    if (cachedData) return cachedData;

    try {
        const fetchPromises = uuids.slice(0, 15).map(uuid => 
            fetchAcrossMirrorsFast(`byuuid/${uuid}`, '')
        );
        const results = await Promise.all(fetchPromises);
        const result = filterStations(results.flat());
        
        const allHardcoded = [...HARDCODED_STATIONS, ...HARDCODED_ISLAMIC];
        const hardcodedFavs = allHardcoded.filter(s => uuids.includes(s.stationuuid));
        
        if (hardcodedFavs.length > 0) {
             const combined = [...hardcodedFavs, ...result.filter(r => !hardcodedFavs.some(h => h.url_resolved === r.url_resolved))];
             setToCache(cacheKey, combined);
             return combined;
        }

        setToCache(cacheKey, result);
        return result;
    } catch (error) {
        const allHardcoded = [...HARDCODED_STATIONS, ...HARDCODED_ISLAMIC];
        const hardcodedFavs = allHardcoded.filter(s => uuids.includes(s.stationuuid));
        if (hardcodedFavs.length > 0) return hardcodedFavs;
        return [];
    }
};