import { GoogleGenAI } from "@google/genai";
import { RadioStation } from "../types";

// Access API key safely from process.env, handling potential undefined process in browser
const API_KEY = (typeof process !== 'undefined' ? process.env.API_KEY : undefined) || '';

export const isAiAvailable = (): boolean => {
    return !!API_KEY;
};

export const curateStationList = async (
    stations: RadioStation[],
    category: string,
    description: string
): Promise<string[]> => {
    if (!API_KEY) {
        // Fallback: return first 15 stations if no AI available
        return stations.slice(0, 15).map(s => s.stationuuid);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const prompt = `
You are an AI radio curator.
Category: ${category}
Description: ${description}
Select the best matching stations from the list below based on the category and description.
Return ONLY a valid JSON array of strings, where each string is a stationuuid.
Do not include markdown formatting or explanations.

Stations:
${JSON.stringify(stations.map(s => ({ uuid: s.stationuuid, name: s.name, tags: s.tags })))}
`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) return stations.slice(0, 15).map(s => s.stationuuid);

        try {
            const parsed = JSON.parse(text);
            return Array.isArray(parsed) ? parsed : stations.slice(0, 15).map(s => s.stationuuid);
        } catch (e) {
            console.error("Failed to parse AI response", e);
            return stations.slice(0, 15).map(s => s.stationuuid);
        }

    } catch (e) {
        console.error("AI Curation failed:", e);
        return stations.slice(0, 15).map(s => s.stationuuid);
    }
};