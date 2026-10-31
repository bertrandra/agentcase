/** @calc-zone stress */
import type { McStats } from '../stress';

export interface PfStressOpts {
  /** draws per product (the same for all) */
  draws: number;
  /** seed of the run; each product derives its own stream from it (see `productSeed`) */
  seed: number;
  /** global correlation between products, 0 (independent) to 1 (common shocks) */
  rho: number;
}

/** Stats of a group of net-benefit draws plus the spread figure used to compare a portfolio with its products. */
export interface StressStats extends McStats {
  /** (P90 - P10) / |P50|: the relative width of the distribution; null when the median is 0 */
  relSpread: number | null;
}

export interface ProductStress {
  id: string;
  name: string;
  waveId: string;
  month0: number;
  /** the product's own distribution (its standalone law, whatever rho), on the months it has inside the portfolio horizon */
  stats: StressStats;
  /** correlation of the product's draws with the portfolio draws (its share of the aggregate risk) */
  r: number;
  /** the same inside the product's wave */
  rWave: number;
  /**
   * the product's net benefit per draw, in draw order (not sorted): a group of products (a wave, a unit of the organisation, B10d) adds these
   * draw by draw, so any selection is read from the one run without drawing again
   */
  perDraw: number[];
}

export interface WaveStress {
  id: string;
  name: string;
  productIds: string[];
  stats: StressStats;
  /** the wave's net benefit per draw (sum over its products, each cut at the portfolio horizon), sorted ascending */
  outcomes: number[];
}

/**
 * The risk-reduction figure of the portfolio, on the downside (P10): `sumP10` is the sum of the standalone P10 of the planned products,
 * `p10` the P10 of the portfolio, `reduction = p10 - sumP10` >= 0 under diversification (independent products), 0 for common shocks (rho = 1).
 */
export interface Diversification { sumP10: number; p10: number; reduction: number }

export interface PfStress {
  draws: number;
  seed: number;
  rho: number;
  /** portfolio net benefit per draw (sum over the planned products, each cut at the portfolio horizon), sorted ascending */
  outcomes: number[];
  stats: StressStats;
  products: ProductStress[];
  waves: WaveStress[];
  diversification: Diversification;
  /** inputs behind the run (`pfStressFingerprint`): the run is stale when the live value differs */
  fingerprint: number;
}

/** Draws are produced product by product, so a caller can yield to the screen between two products. */
export interface PfStressJob { steps: number; step(i: number): void; finish(): PfStress }
