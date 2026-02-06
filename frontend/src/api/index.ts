import { TextInfo, ZipfData } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export async function fetchTexts(): Promise<TextInfo[]> {
  const response = await fetch(`${API_BASE}/api/texts`);
  if (!response.ok) {
    throw new Error('Failed to fetch texts');
  }
  return response.json();
}

export async function fetchZipfData(textId: string): Promise<ZipfData> {
  const response = await fetch(`${API_BASE}/api/texts/${textId}/zipf`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Zipf data for ${textId}`);
  }
  return response.json();
}

export async function fetchMultipleZipfData(textIds: string[]): Promise<ZipfData[]> {
  const results = await Promise.all(textIds.map(id => fetchZipfData(id)));
  return results;
}
