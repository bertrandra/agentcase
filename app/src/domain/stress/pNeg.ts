/** @calc-zone stress */
/**
 * The one set of risk-tone thresholds for a probability of loss, whichever Monte Carlo produced it:
 * `pNetNeg` = P(net benefit < 0) of the decision engine (stress/simulate.ts), `pSavNeg` = P(horizon-end savings < 0) of the
 * driver-level P4 layer (model/mcs.ts). Above BRICK the figure is red (and a "strong" verdict is impossible); above AMBER it is a caution.
 */
export const PNEG_BRICK = 0.2;
export const PNEG_AMBER = 0.1;
export type PNegTone = 'brick' | 'amber' | 'teal';

export const pNegTone = (p: number): PNegTone => (p > PNEG_BRICK ? 'brick' : p > PNEG_AMBER ? 'amber' : 'teal');
