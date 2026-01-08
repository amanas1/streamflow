import { RadioStation } from "../types";

export const isAiAvailable = (): boolean => {
    return false;
};

export const curateStationList = async (
    stations: RadioStation[],
    category: string,
    description: string
): Promise<string[]> => {
    // Fallback: return all stations (no filtering)
    return stations.map(s => s.stationuuid);
};