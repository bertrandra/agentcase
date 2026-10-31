/** @calc-zone process-model */
/** Ids of the organisation part (§ 16.3): the default delivery unit, a product's team, a shared line's team. */
export const DEFAULT_UNIT_ID = 'unit-delivery';
export const productTeamId = (productId: string): string => `team-${productId}`;
export const sharedTeamId = (lineId: string): string => `team-shared-${lineId}`;
