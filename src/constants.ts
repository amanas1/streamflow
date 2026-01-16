
import { CategoryInfo, UserProfile, Achievement, PassportData } from './types';
import { CloudIcon, FireIcon, MusicNoteIcon, GlobeIcon, MoonIcon, HeartIcon } from './components/Icons';
import React from 'react';

export const RADIO_BROWSER_MIRRORS = [
    'https://all.api.radio-browser.info/json/stations',
    'https://de1.api.radio-browser.info/json/stations',
    'https://at1.api.radio-browser.info/json/stations',
    'https://nl1.api.radio-browser.info/json/stations',
    'https://fr1.api.radio-browser.info/json/stations',
    'https://uk1.api.radio-browser.info/json/stations'
];

export const DEFAULT_VOLUME = 0.5;

export const GENRES: CategoryInfo[] = [
    { id: 'jazz', name: 'Jazz', color: 'from-amber-400 to-orange-600', description: 'Smooth rhythms and improvisations.' },
    { id: 'blues', name: 'Blues', color: 'from-blue-600 to-indigo-800', description: 'Soulful rhythms and melancholic melodies.' },
    { id: 'rock', name: 'Rock', color: 'from-red-600 to-purple-900', description: 'Energetic beats and powerful guitars.' },
    { id: 'classical', name: 'Classical', color: 'from-blue-200 to-slate-400', description: 'Timeless masterpieces and symphonies.' },
    { id: 'electronic', name: 'Electronic', color: 'from-cyan-400 to-blue-600', description: 'Synthesized sounds and modern beats.' },
    { id: 'hiphop', name: 'Hip Hop', color: 'from-green-400 to-yellow-600', description: 'Rhythmic speech and street culture.' },
    { id: 'pop', name: 'Pop', color: 'from-pink-400 to-rose-600', description: 'Catchy melodies and chart-topping hits.' },
    { id: 'rnb', name: 'R&B', color: 'from-violet-500 to-fuchsia-600', description: 'Rhythm and Blues, soulful and smooth.' },
    { id: 'reggae', name: 'Reggae', color: 'from-green-500 to-yellow-500', description: 'Relaxed Jamaican rhythms and vibes.' },
    { id: 'soul', name: 'Soul', color: 'from-rose-400 to-orange-400', description: 'Deeply emotional vocal music.' },
    { id: 'islamic', name: 'Faith & Religion', color: 'from-emerald-600 to-teal-900', description: 'Spiritual readings, prayers, and religious texts.' }
];

export const ERAS: CategoryInfo[] = [
    { id: '60s', name: '60s', color: 'from-yellow-300 to-orange-500', description: 'The era of peace, love, and rock & roll.' },
    { id: '70s', name: '70s', color: 'from-orange-500 to-red-600', description: 'Disco, funk, and the rise of stadium rock.' },
    { id: '80s', name: '80s', color: 'from-fuchsia-500 to-indigo-600', description: 'Synth-pop, big hair, and MTV classics.' },
    { id: '90s', name: '90s', color: 'from-teal-400 to-blue-500', description: 'Grunge, rave culture, and the golden age of R&B.' },
    { id: '00s', name: '00s', color: 'from-slate-400 to-slate-600', description: 'The digital revolution and fusion genres.' }
];

export const MOODS: CategoryInfo[] = [
    { id: 'chill', name: 'Chill', type: 'mood', color: 'from-blue-400 to-indigo-500', description: 'Relaxing tunes for a peaceful mind.' },
    { id: 'energy', name: 'Energy', type: 'mood', color: 'from-yellow-400 to-orange-500', description: 'Upbeat tracks to get you moving.' },
    { id: 'focus', name: 'Focus', type: 'mood', color: 'from-emerald-400 to-teal-600', description: 'Background music for work and study.' },
    { id: 'romantic', name: 'Romantic', type: 'mood', color: 'from-rose-400 to-pink-600', description: 'Melodies for special moments.' },
    { id: 'dark', name: 'Club', type: 'mood', color: 'from-slate-800 to-black', description: 'Powerful beats for club enthusiasts.' },
    { id: 'vietnamese', name: 'Vietnamese', type: 'mood', color: 'from-red-500 to-yellow-500', description: 'Music from Vietnam.' },
    { id: 'japanese', name: 'Japanese', type: 'mood', color: 'from-red-400 to-pink-400', description: 'Music from Japan.' },
    { id: 'russian', name: 'Russian', type: 'mood', color: 'from-blue-600 to-red-600', description: 'Music from Russia.' },
    { id: 'spanish', name: 'Spanish', type: 'mood', color: 'from-yellow-400 to-red-500', description: 'Music from Spain.' },
    { id: 'italian', name: 'Italian', type: 'mood', color: 'from-green-500 to-red-500', description: 'Music from Italy.' },
    { id: 'french', name: 'French', type: 'mood', color: 'from-blue-500 to-red-500', description: 'Music from France.' },
    { id: 'kazakh', name: 'Kazakh', type: 'mood', color: 'from-cyan-400 to-yellow-300', description: 'Music from Kazakhstan.' },
    { id: 'kyrgyz', name: 'Kyrgyz', type: 'mood', color: 'from-red-500 to-yellow-400', description: 'Music from Kyrgyzstan.' },
    { id: 'kavkaz', name: 'Caucasian', type: 'mood', color: 'from-stone-500 to-stone-700', description: 'Music from the Caucasus.' },
    { id: 'oriental', name: 'Eastern', type: 'mood', color: 'from-amber-500 to-orange-600', description: 'Oriental rhythms.' },
    { id: 'chinese', name: 'Chinese', type: 'mood', color: 'from-red-600 to-yellow-400', description: 'Music from China.' },
];

export const EFFECTS: CategoryInfo[] = [
    { id: 'nature', name: 'Nature', type: 'effect', color: 'from-green-400 to-emerald-600', description: 'Pure sounds of the wild.' },
    { id: 'rain', name: 'Rain', type: 'effect', color: 'from-blue-400 to-slate-600', description: 'Soothing rain and storms.' },
    { id: 'ocean', name: 'Ocean', type: 'effect', color: 'from-cyan-400 to-blue-600', description: 'Waves and sea breeze.' },
    { id: 'forest', name: 'Forest', type: 'effect', color: 'from-emerald-600 to-green-800', description: 'Woodland ambience.' },
    { id: 'storm', name: 'Storm', type: 'effect', color: 'from-slate-600 to-purple-900', description: 'Thunder and heavy rain.' },
];

export const COUNTRIES_DATA = [
  { name: 'Argentina', lat: -38.41, lon: -63.61, cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata'] },
  { name: 'Australia', lat: -25.27, lon: 133.77, cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'] },
  { name: 'Austria', lat: 47.51, lon: 14.55, cities: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck'] },
  { name: 'Belgium', lat: 50.50, lon: 4.46, cities: ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège'] },
  { name: 'Brazil', lat: -14.23, lon: -51.92, cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza'] },
  { name: 'Canada', lat: 56.13, lon: -106.34, cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa'] },
  { name: 'China', lat: 35.86, lon: 104.19, cities: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu'] },
  { name: 'Denmark', lat: 56.26, lon: 9.50, cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg'] },
  { name: 'Egypt', lat: 26.82, lon: 30.80, cities: ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said'] },
  { name: 'Finland', lat: 61.92, lon: 25.74, cities: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu'] },
  { name: 'France', lat: 46.22, lon: 2.21, cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice'] },
  { name: 'Germany', lat: 51.16, lon: 10.45, cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'] },
  { name: 'Greece', lat: 39.07, lon: 21.82, cities: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa'] },
  { name: 'India', lat: 20.59, lon: 78.96, cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'] },
  { name: 'Italy', lat: 41.87, lon: 12.56, cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo'] },
  { name: 'Japan', lat: 36.20, lon: 138.25, cities: ['Tokyo', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka'] },
  { name: 'Kazakhstan', lat: 48.01, lon: 66.92, cities: ['Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe'] },
  { name: 'Kyrgyzstan', lat: 41.20, lon: 74.76, cities: ['Bishkek', 'Osh', 'Jalal-Abad', 'Karakol', 'Naryn'] },
  { name: 'Mexico', lat: 23.63, lon: -102.55, cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Toluca'] },
  { name: 'Netherlands', lat: 52.13, lon: 5.29, cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'] },
  { name: 'Norway', lat: 60.47, lon: 8.46, cities: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Bærum'] },
  { name: 'Poland', lat: 51.91, lon: 19.14, cities: ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań'] },
  { name: 'Portugal', lat: 39.39, lon: -8.22, cities: ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga'] },
  { name: 'Russia', lat: 61.52, lon: 105.31, cities: ['Moscow', 'Saint Petersburg', 'Kazan', 'Novosibirsk', 'Yekaterinburg'] },
  { name: 'Saudi Arabia', lat: 23.88, lon: 45.07, cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'] },
  { name: 'South Korea', lat: 35.90, lon: 127.76, cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon'] },
  { name: 'Spain', lat: 40.46, lon: -3.74, cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza'] },
  { name: 'Sweden', lat: 60.12, lon: 18.64, cities: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås'] },
  { name: 'Switzerland', lat: 46.81, lon: 8.22, cities: ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern'] },
  { name: 'Turkey', lat: 38.96, lon: 35.24, cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'] },
  { name: 'UAE', lat: 23.42, lon: 53.84, cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman'] },
  { name: 'UK', lat: 55.37, lon: -3.43, cities: ['London', 'Birmingham', 'Glasgow', 'Liverpool', 'Manchester'] },
  { name: 'Ukraine', lat: 48.37, lon: 31.16, cities: ['Kyiv', 'Kharkiv', 'Odesa', 'Dnipro', 'Donetsk'] },
  { name: 'USA', lat: 37.09, lon: -95.71, cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'] },
  { name: 'Uzbekistan', lat: 41.37, lon: 64.58, cities: ['Tashkent', 'Samarkand', 'Bukhara', 'Andijan', 'Namangan'] },
].sort((a, b) => a.name.localeCompare(b.name));

export const DEMO_USERS: UserProfile[] = [];

export const NEWS_MESSAGES: Record<string, string[]> = {
    en: [
        "📻 Live Network: All communications are relayed in real-time. No logs exist on any server.",
        "🔒 E2EE Active: Messages and media are encrypted end-to-end between browsers.",
        "🌊 Ephemeral Policy: Chat history lives only in your RAM and is cleared on page refresh.",
        "📞 P2P Calls: Voice and video streams are routed directly between peers."
    ],
    ru: [
        "📻 Прямой эфир: Все сообщения передаются в реальном времени без логов на сервере.",
        "🔒 E2EE Активен: Чат и медиа зашифрованы между браузерами (End-to-End).",
        "🌊 Эфемерность: История чата живет только в оперативной памяти и удаляется при обновлении страницы.",
        "📞 P2P Звонки: Аудио и видео потоки идут напрямую между пользователями."
    ]
};

export const TRANSLATIONS: Record<string, any> = {
    en: {
        genres: 'Genres', eras: 'Eras', moods: 'Moods', effects: 'Effects', favorites: 'Favorites',
        listeningTo: 'Listening to', loadMore: 'Load More',
        visualizer: 'Visualizer', eq: 'Equalizer', look: 'Appearance', ambience: 'Ambience', fx: 'Effects FX', sleep: 'Sleep Timer',
        vizGalaxy: 'Galaxy', resetFlat: 'Reset Flat', sleepTimer: 'Sleep Timer', turnOffTimer: 'Turn Off', alarm: 'Alarm', on: 'On', off: 'Off', alarm_set: 'Alarm set to', cardColor: 'Card Tint', developerNews: 'System Status', interfaceLanguage: 'Language',
        findFriends: 'Live Relay', completeProfile: 'Join Network', displayName: 'Session Name', gender: 'Gender', male: 'Male', female: 'Female', other: 'Other', age: 'Age', country: 'Country', city: 'City', saveAndEnter: 'Join Live', login: 'Login', any: 'Any', search: 'Search', knock: 'Connect',
        tutorialWelcome: 'Welcome to StreamFlow', gotIt: 'Got it', privacyDisclaimer: 'Messages are ephemeral. No data is stored on servers. F5 wipes all traces.',
        next: 'Next', manualTitle: 'System Policy', manualIntro: 'Pure real-time relay. No archives. No persistence.', whoAreYou: 'Join Hub', createProfile: 'Set a session name to connect.', uploadPhoto: 'Photo', saveProfile: 'Start Session', joinCommunity: 'Connect',
        privateChat: 'REAL-TIME RELAY', authTitle: 'Ephemeral Sessions', authDesc: 'Zero persistence communication. No message history is kept on server or local storage.', signInGuest: 'Enter Relay', online: 'Online Now', today: 'Session', recording: 'Streaming...', send: 'TRANSMIT', noUsers: 'Alone in space', showAll: 'Refresh'
    },
    ru: {
        genres: 'Жанры', eras: 'Эпохи', moods: 'Настроение', effects: 'Эффекты', favorites: 'Избранное',
        listeningTo: 'В эфире', loadMore: 'Загрузить еще',
        visualizer: 'Визуал', eq: 'Звук', look: 'Стиль', ambience: 'Атмосфера', fx: 'Эффекты', sleep: 'Сон',
        vizGalaxy: 'Космос', resetFlat: 'Сброс', sleepTimer: 'Режим сна', turnOffTimer: 'Отключить', alarm: 'Будильник', on: 'Вкл', off: 'Выкл', alarm_set: 'Разбудить в', cardColor: 'Оттенок блоков', developerNews: 'Статус Системы', interfaceLanguage: 'Язык',
        findFriends: 'Живая Сеть', completeProfile: 'Вход в эфир', displayName: 'Имя Сессии', gender: 'Пол', male: 'Мужской', female: 'Женский', other: 'Другой', age: 'Возраст', country: 'Страна', city: 'Город', saveAndEnter: 'Войти', login: 'Логин', any: 'Неважно', search: 'Найти', knock: 'Связаться',
        tutorialWelcome: 'Добро пожаловать', gotIt: 'Понятно', privacyDisclaimer: 'Сообщения эфемерны. История не сохраняется. F5 удаляет всё.',
        next: 'Далее', manualTitle: 'Политика Системы', manualIntro: 'Чистый ретранслятор. Без архивов. Без следов.', whoAreYou: 'Вход', createProfile: 'Укажите имя для текущей сессии.', uploadPhoto: 'Фото', saveProfile: 'Начать', joinCommunity: 'Подключиться',
        privateChat: 'ЖИВОЙ РЕТРАНСЛЯТОР', authTitle: 'Эфемерные Сессии', authDesc: 'Общение без сохранения истории. Данные не пишутся ни на диск, ни на сервер.', signInGuest: 'Войти в Сеть', online: 'В Сети', today: 'Сессия', recording: 'Стриминг...', send: 'ОТПРАВИТЬ', noUsers: 'Тишина в эфире', showAll: 'Обновить'
    }
};
