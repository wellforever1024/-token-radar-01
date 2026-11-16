// Token Radar, model radar-2: one sealed snapshot in, one ranked board out.
//
// The board covers every slug on the snapshot's watchlist (the floor, never a
// ceiling) and adds every pre-token protocol below that floor which passes the
// watchlist's own exclusion rules. A protocol is pre-token when its record
// carries no token at all: no market cap, no CoinGecko id, no symbol. The
// snapshot's live-token protocols are kept apart and shown with the market's
// own values, never mixed into the ranked board.
//
// Implied value is fitted, not asserted. The curve comes from the snapshot's
// own live-token protocols: 92 of them are like-for-like with the board
// (no exchange, no bridge, no liquid staking, no versioned pool, no wrapped
// or staked product). On those 92, log10(market cap) against log10(TVL) fits
//   log10(mcap) = 3.957838 + 0.394000 * log10(tvl)
// and the full formula below was blind-tested on them in five folds: the
// median prediction misses the true market cap by a factor of 3.57, a third
// of predictions land within a factor of 2, 45% within a factor of 3. The
// starter's flat 0.25 x TVL scores 4.46 on the same blind test, so the
// fitted curve earns its place. TVL alone explains little of the variation
// (R2 0.09), which is why every value below carries a wide band: the middle
// half of blind-test errors runs from x0.31 to x4.98.
//
//   base      = 10 ** (3.957838 + 0.394000 * log10(tvl_usd))
//   growth    = clamp(change_7d, -60, 120) per cent
//   growthMul = 1 + 0.25 * growth / 100            (0.85 .. 1.30)
//   maturity  = 0.80 + 0.20 * min(age_days, 1095) / 1095   (0.80 .. 1.00)
//   implied   = max(1, round(base * growthMul * maturity))
//   low       = round(implied * 0.31)   high = round(implied * 4.98)
//
// The two adjustments are bounded on purpose: they can move a protocol a
// little against its neighbours, never overturn what its size says. Age
// unknown uses 859 days, the median age of the 92 calibration protocols.
// No protocol name is ever special-cased: the same function scores every row.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The fitted constants and the blind-test figures, as the dashboard states them. */
export interface Calibration {
  live_protocols: number;
  intercept: number;
  slope: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  band_low: number;
  band_high: number;
  median_miss: number;
  within_x2_pct: number;
  within_x3_pct: number;
  starter_median_miss: number;
  r2: number;
}

export const CALIBRATION: Calibration = {
  live_protocols: 92,
  intercept: 3.957838,
  slope: 0.394,
  growth_weight: 0.25,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.8,
  maturity_range: 0.2,
  maturity_days: 1095,
  unknown_age_days: 859,
  band_low: 0.31,
  band_high: 4.98,
  median_miss: 3.57,
  within_x2_pct: 33.7,
  within_x3_pct: 44.6,
  starter_median_miss: 4.46,
  r2: 0.09,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** The verdict bands on implied value, in whole US dollars. */
export const VERDICT_LEAD = 25_000_000;
export const VERDICT_WATCH = 10_000_000;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  verdict: string;
  farm_cost_usd: number;
  model: {
    base_value_usd: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  verdict: string;
  farm_cost_usd: number;
  base_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value next to the model's fitted one, never mixed into the ranking. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  fitted_value_usd: number;
  fitted_ratio: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: Calibration;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The fitted curve's value for a TVL, before the bounded adjustments. */
export function fittedValue(tvlUsd: number, cal: Calibration = CALIBRATION): number {
  return 10 ** (cal.intercept + cal.slope * Math.log10(Math.max(1, tvlUsd)));
}

/** The three multipliers and the implied value one protocol gets, with its band. */
export function impliedValue(protocol: SnapshotProtocol, asOf: string, cal: Calibration = CALIBRATION): {
  implied: number;
  low: number;
  high: number;
  base: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(cal.growth_cap, Math.max(cal.growth_floor, rawGrowth));
  const growthMult = 1 + cal.growth_weight * (growthPct / 100);
  const ageForModel = age ?? cal.unknown_age_days;
  const maturityMult =
    cal.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), cal.maturity_days) / cal.maturity_days) * cal.maturity_range;
  const base = fittedValue(protocol.tvl_usd, cal);
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult));
  return {
    implied,
    low: Math.max(1, Math.round(implied * cal.band_low)),
    high: Math.max(1, Math.round(implied * cal.band_high)),
    base: Math.max(1, Math.round(base)),
    growthPct,
    growthMult,
    maturityMult,
    age,
  };
}

/** The verdict from the implied value: a judgement, stated as one, not a price. */
export function verdictFor(impliedUsd: number): string {
  if (impliedUsd >= VERDICT_LEAD) return 'Lead';
  if (impliedUsd >= VERDICT_WATCH) return 'Watch';
  return 'Long shot';
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** Categories that are a wrapped, staked or bridged product of another protocol, never a launch of their own. */
const WRAPPED_CATEGORIES = new Set([
  'CEX',
  'Bridge',
  'Canonical Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
]);
/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** A name that begins with an exchange's name. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is a wrapped, staked or bridged product of something that already trades, by the watchlist's own definition. */
export function isWrappedProduct(p: SnapshotProtocol): boolean {
  return (
    WRAPPED_CATEGORIES.has(p.category ?? '') ||
    VERSIONED.test(p.name) ||
    WRAPPED_WORD.test(p.name) ||
    EXCHANGE_PREFIX.test(p.name)
  );
}

/** Whether a protocol is one the board may rank: pre-token and not a wrapped product of one that trades. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && !isWrappedProduct(p);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** Gas for the first transaction, from the position's size. */
function setupGasFor(capital: number): number {
  return capital >= 150 ? 8 : 4;
}

/** Gas for the whole plan: the setup plus about $2 a week for the hold. */
function gasTotalFor(holdDays: number, setupGas: number): number {
  return setupGas + 2 * Math.ceil(holdDays / 7);
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time,
 * and a last step that nets the whole plan against the implied band. The plan
 * is derived from the protocol's own record (category, chains, TVL, age) and
 * the model's own band, never from a hand-written list of names.
 */
export function farmSteps(
  p: SnapshotProtocol,
  age: number | null,
  lowUsd: number,
  highUsd: number,
): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const setupGas = setupGasFor(capital);
  const gasTotal = gasTotalFor(hold, setupGas);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${setupGas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `All in, about $${gasTotal} of gas over ${hold} days, with $${capital} locked but retrievable, against an implied launch band of $${lowUsd.toLocaleString('en-US')} to $${highUsd.toLocaleString('en-US')}. No launch is promised: this ranks what it would be worth if it happens.`,
      cost: `about $${gasTotal} of gas in total`,
      time: '5 minutes to log',
    },
  ];
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, cal: Calibration = CALIBRATION): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every pre-token protocol below the watchlist floor that passes the watchlist's own
  // exclusion rules. Never a replacement for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, cal);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => {
    const steps = farmSteps(s.p, s.age, s.low, s.high);
    const capital = capitalFor(s.p);
    const gasTotal = gasTotalFor(holdDaysFor(s.age), setupGasFor(capital));
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: s.implied,
      implied_low_usd: s.low,
      implied_high_usd: s.high,
      verdict: verdictFor(s.implied),
      farm_cost_usd: gasTotal,
      model: {
        base_value_usd: s.base,
        growth_pct: s.growthPct,
        growth_multiplier: round4(s.growthMult),
        maturity_multiplier: round4(s.maturityMult),
        age_days: s.age,
      },
      farm_steps: steps.map(stepText),
    };
  });
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The live-token protocols, by market cap, for the dashboard's Live token view, with the model's fitted value beside the market's own. */
export function liveRows(snapshot: Snapshot, cal: Calibration = CALIBRATION): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => {
      const fitted = Math.max(1, Math.round(fittedValue(p.tvl_usd, cal)));
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        chains: p.chains,
        tvl_usd: p.tvl_usd,
        mcap_usd: p.mcap_usd,
        change_7d: p.change_7d,
        fitted_value_usd: fitted,
        fitted_ratio: p.mcap_usd === null ? null : round4(p.mcap_usd / fitted),
      };
    });
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_low_usd: row.implied_low_usd,
    implied_high_usd: row.implied_high_usd,
    verdict: row.verdict,
    farm_cost_usd: row.farm_cost_usd,
    base_value_usd: row.model.base_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, cal: Calibration = CALIBRATION): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, cal);
  const live = liveRows(snapshot, cal);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model: cal,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (!Number.isSafeInteger(r.implied_low_usd) || r.implied_low_usd <= 0 || r.implied_low_usd > r.implied_value_usd) return `${r.slug} has a broken low band`;
    if (!Number.isSafeInteger(r.implied_high_usd) || r.implied_high_usd < r.implied_value_usd) return `${r.slug} has a broken high band`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
