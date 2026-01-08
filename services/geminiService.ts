import { GoogleGenAI } from "";
import { RadioStation } from 

const API_KEY = process.env.API_KEY || '';

export const isAiAvailable = (): boolean => {
    return !!API_KEY;
};

export const curateStationList = async (
    stations: RadioStation[], 
    category: string, 
    description: string
): Promise<string[]> => {
    if (!API_KEY) {
        // Fallback if no API key: return first 15 stations
        return stations.slice(0, 15).map(s => s.stationuuid);
    }

    try {
        
        
        // Prepare a simplified list for the model to keep tokens low
        const stationList = stations.slice(0, 50).map(s => 
            `UUID: ${s.stationuuid}, Name: ${s.name}, Tags: ${s.tags}, Country: ${s.country}`
        ).join('\n');

        const prompt = `
        Act as a music curator. 
        I need a list of station UUIDs from the provided list that best match this Category: "${category}" and Description: "${description}".
        
        List of Stations:
        ${stationList}
        
        Return ONLY a raw JSON array of strings (station UUIDs). No markdown, no explanation.
        Example: ["uuid1", "uuid2"]
        `;

        const response = await ai.models.generateContent({
            model:
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        const text = response.text;
        if (!text) return stations.slice(0, 15).map(s => s.stationuuid);
        
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : stations.slice(0, 15).map(s => s.stationuuid);

    } catch (e) {
        console.error("AI Curation failed:", e);
        return stations.slice(0, 15).map(s => s.stationuuid);
    }
};