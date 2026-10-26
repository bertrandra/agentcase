/** @calc-zone rate-card-team */
/** Day-rate multiplier of the AI skills (agentic run team, transitional setup roles): the target day rate × 1.15. */
export const AI_SKILL_PREMIUM = 1.15;

/** The premium as a label: "+15%". */
export const aiSkillPremiumLabel = (): string => `+${Math.round((AI_SKILL_PREMIUM - 1) * 100)}%`;
