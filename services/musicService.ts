import { Track } from '../types';

export const fetchTracks = async (query: string, offset: number = 0): Promise<Track[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const genres = ['LoFi', 'Jazz', 'Phonk', 'Ambient', 'Rock', 'Electronic', 'Synthwave'];
    const genre = query && genres.some(g => g.toLowerCase() === query.toLowerCase()) 
        ? query 
        : genres[Math.floor(Math.random() * genres.length)];
    
    // Generate mock tracks
    return Array.from({ length: 10 }, (_, i) => {
        const id = offset + i;
        const seed = id * 123; // Deterministic random seed per track ID
        return {
            id: `track_${id}`,
            title: `${genre} flow ${id + 1}`,
            artist: `StreamArtist ${Math.floor(Math.random() * 100)}`,
            // Using a reliable copyright-free source or placeholder
            audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', 
            coverUrl: `https://picsum.photos/seed/${seed}/300/300`,
            duration: 120 + Math.floor(Math.random() * 180),
            tags: [genre, 'StreamFlow', 'Copyright Free']
        };
    });
};