export type Sample = (() => void) | { prep: () => void; run: () => void };
