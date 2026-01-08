import { GoogleGenAI, Type } from "@google/genai";
import { RadioStation } from "../types";

export const isAiAvailable = (): boolean => {
    return !!process.env.API_KEY;
};

export const curateStationList = async (
    stations: RadioStation[],
    category: string,
    description: string
): Promise<string[]> => {
    if (!process.env.API_KEY) return stations.map(s => s.stationuuid);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Create a simplified list for the model to save tokens
    const stationList = stations.map(s => ({
        id: s.stationuuid,
        name: s.name,
        tags: s.tags
    }));

    const prompt = `
    I have a list of radio stations. 
    Category: ${category}
    Description: ${description}
    
    Please select the best stations from the list that match this category and mood.
    Return the station IDs (uuids) of the selected stations.
    
    Stations:
    ${JSON.stringify(stationList)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        selectedIds: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || '{}');
        if (json.selectedIds && Array.isArray(json.selectedIds)) {
            return json.selectedIds;
        }
        return stations.map(s => s.stationuuid);
    } catch (error) {
        console.error("Gemini curation failed:", error);
        return stations.map(s => s.stationuuid);
    }
};