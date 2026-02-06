export interface TextInfo {
  id: string;
  title: string;
  author?: string;
  wordCount: number;
  uniqueWords: number;
}

export interface WordFrequency {
  word: string;
  frequency: number;
  rank: number;
}

export interface ZipfData {
  textId: string;
  title: string;
  words: WordFrequency[];
  zipfExponent: number;
  rSquared: number;
}

export interface ChartDataPoint {
  logRank: number;
  logFrequency: number;
  rank: number;
  frequency: number;
  word: string;
  textId: string;
  textTitle: string;
}
