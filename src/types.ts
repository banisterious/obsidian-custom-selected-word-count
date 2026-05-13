export interface CountResult {
	words: number;
	characters: number;
	sentences: number;
}

export interface WordCountHistoryEntry {
	count: number;
	characterCount?: number;
	sentenceCount?: number;
	date: Date;
}
