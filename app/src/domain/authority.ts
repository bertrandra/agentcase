/** @calc-zone delivery-views */
/** The AI authority levels of an artefact, from the least to the most autonomous (the engagement context caps them: `authorityCap`). */
export const AUTH_LEVELS = ['Assistance', 'Copilot', 'Supervised autonomous', 'Autonomous'] as const;

/** Rank 1..4 of each authority level: the one ordering the report, the verification checks, the commercial tiers and the agent directory read. */
export const AUTH_ORDER: Readonly<Record<string, number>> = Object.fromEntries(AUTH_LEVELS.map((l, i) => [l, i + 1]));

/** Rank of an artefact's authority level, `fallback` for an unknown one. */
export const authRank = (aiAuth: string, fallback = 1): number => AUTH_ORDER[aiAuth] ?? fallback;
