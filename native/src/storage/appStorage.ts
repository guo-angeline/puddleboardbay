/**
 * AsyncStorage shells for the ptw-* keys the web app keeps in localStorage.
 * Same key names on purpose: the two platforms never share a device, but a
 * grep for a key must find both implementations.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "ptw-favorites";
const RECENT_KEY = "ptw-recent";

export async function loadFavorites(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

export async function saveFavorites(favorites: Set<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    /* storage full / unavailable */
  }
}

export async function loadRecentIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export async function saveRecentIds(ids: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
