import { GoogleGenAI, Type } from "@google/genai";
import { RadioStation } from "../types";

export const isAiAvailable = (): boolean => {
    try {
        return !!process.env.API_KEY;
    } catch (e) {
        return false;
    }
};

export const curateStationList = async (
    stations: RadioStation[],
    category: string,
    description: string
): Promise<string[]> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API Key is missing for AI curation.");
        return stations.map(s => s.stationuuid);
    }

    const ai = new GoogleGenAI({ apiKey });

    // Prepare minimal station data to save context
    const simplifiedStations = stations.map(s => ({
        id: s.stationuuid,
        name: s.name,
        tags: s.tags,
        country: s.country
    }));

    const prompt = `You are a professional radio curator.
Task: Select the best stations from the list below that strictly fit the category "${category}" (${description}).
Return a JSON array containing the "id" of the selected stations.
Select between 5 and 20 stations that best match the vibe.

List:
${JSON.stringify(simplifiedStations)}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const text = response.text;
        if (!text) return stations.map(s => s.stationuuid);
        
        const selectedIds = JSON.parse(text) as string[];
        return selectedIds;
    } catch (error) {
        console.error("Gemini curation error:", error);
        // Fallback to original list
        return stations.map(s => s.stationuuid);
    }
};