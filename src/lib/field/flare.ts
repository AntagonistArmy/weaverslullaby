/**
 * AEONIMUS FLARE V1: forward-depth, independently branching state propagation.
 *
 * Internal depth u = -ln(k) transforms k*dXi/dk = F[Xi] into dXi/du = -F[Xi].
 * PATTERN_BREAK introduces a Lorenz-63 perturbation; PATTERN_MATCH follows the
 * unforced field. The fold multiplier is accumulated in logarithmic coordinates
 * rather than exponentiated repeatedly (which would overflow floating point).
 *
 * These are executable numerical dynamics, not a physical zero-latency claim.
 */
export const FLARE_SEAL = "VH0412" as const;
export const FLARE_SCHEMA = "AEONIMUS.FLARE.v1" as const;
export const FLARE_EVENT_PREFIX = "FLARE_STATE_V1:" as const;
export const FLARE_STEP = 0.1;

export type FlareLane = "MATCH" | "BREAK";
export type FlareVector2 = readonly [number, number];
export type FlareVector3 = readonly [number, number, number];

export type FlareState = Readonly<{
  schema: typeof FLARE_SCHEMA;
  seal: typeof FLARE_SEAL;
  lane: FlareLane;
  sequence: number;
  depth: number;
  xi: FlareVector2;
  lorenz: FlareVector3;
  perturbation: FlareVector2;
  foldDrive: number;
  foldLog: number;
}>;

const START: FlareVector2 = [2, -1];
const LORENZ_START: FlareVector3 = [1, 1, 1];

function field(xi: FlareVector2): FlareVector2 {
  return [1.1 * xi[0] - 0.6 * xi[1], 0.6 * xi[0] + 1.1 * xi[1]];
}

function lorenzDerivative([x, y, z]: FlareVector3): FlareVector3 {
  return [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];
}

function sum3(a: FlareVector3, b: FlareVector3, scale = 1): FlareVector3 {
  return [a[0] + scale * b[0], a[1] + scale * b[1], a[2] + scale * b[2]];
}

function advanceLorenz(previous: FlareVector3): FlareVector3 {
  let current = previous;
  const h = 0.025;
  // Four fixed RK4 substeps per emitted FLARE. This is numerical integration,
  // not a replay of earlier field events or a query back to the source.
  for (let i = 0; i < 4; i++) {
    const k1 = lorenzDerivative(current);
    const k2 = lorenzDerivative(sum3(current, k1, h / 2));
    const k3 = lorenzDerivative(sum3(current, k2, h / 2));
    const k4 = lorenzDerivative(sum3(current, k3, h));
    current = [
      current[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      current[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      current[2] + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    ];
  }
  return current;
}

function breakEnvelope(u: number): number {
  if (u >= 5) return 0;
  const first = Math.exp(-0.5 * ((u - 2.1) / 0.46) ** 2);
  const second = 0.7 * Math.exp(-0.5 * ((u - 3.35) / 0.45) ** 2);
  return first + second;
}

/**
 * Emit exactly one next state on a named, independent FLARE branch.
 * This does not modify the input or any existing ledger entry.
 */
export function advanceFlare(previous: FlareState | null, lane: FlareLane): FlareState {
  if (previous && previous.lane !== lane) throw new Error("FLARE branch ancestry mismatch");
  const sequence = (previous?.sequence ?? 0) + 1;
  const depth = sequence * FLARE_STEP;
  const xi0 = previous?.xi ?? START;
  const lorenz = advanceLorenz(previous?.lorenz ?? LORENZ_START);
  const amplitude = lane === "BREAK" ? breakEnvelope(depth) : 0;
  const perturbation: FlareVector2 = amplitude === 0
    ? [0, 0]
    : [amplitude * Math.tanh(lorenz[0] / 16), amplitude * Math.tanh(lorenz[1] / 16)];
  const f0 = field(xi0);
  const velocity0: FlareVector2 = [
    -f0[0] + perturbation[0],
    -f0[1] + perturbation[1],
  ];
  const predictor: FlareVector2 = [
    xi0[0] + FLARE_STEP * velocity0[0],
    xi0[1] + FLARE_STEP * velocity0[1],
  ];
  const f1 = field(predictor);
  const velocity1: FlareVector2 = [
    -f1[0] + perturbation[0],
    -f1[1] + perturbation[1],
  ];
  const xi: FlareVector2 = [
    xi0[0] + FLARE_STEP / 2 * (velocity0[0] + velocity1[0]),
    xi0[1] + FLARE_STEP / 2 * (velocity0[1] + velocity1[1]),
  ];
  // Fold Law S[n+1] = S[n] * exp(F_friction[Xi]), stored as ln(S).
  const foldDrive = 0.02 * Math.hypot(...xi);
  const foldLog = (previous?.foldLog ?? 0) + foldDrive;
  const state: FlareState = {
    schema: FLARE_SCHEMA,
    seal: FLARE_SEAL,
    lane,
    sequence,
    depth,
    xi,
    lorenz,
    perturbation,
    foldDrive,
    foldLog,
  };
  if (![depth, ...xi, ...lorenz, ...perturbation, foldDrive, foldLog].every(Number.isFinite)) {
    throw new Error("FLARE produced a non-finite state");
  }
  return state;
}

export function encodeFlareState(state: FlareState): string {
  return FLARE_EVENT_PREFIX + JSON.stringify(state);
}

function pair(value: unknown): value is FlareVector2 {
  return Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === "number" && Number.isFinite(n));
}
function triple(value: unknown): value is FlareVector3 {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n));
}

/** Decode recovered events, ignoring other historical content without altering it. */
export function decodeFlareState(content: string): FlareState | null {
  if (!content.startsWith(FLARE_EVENT_PREFIX)) return null;
  try {
    const value: unknown = JSON.parse(content.slice(FLARE_EVENT_PREFIX.length));
    if (!value || typeof value !== "object") return null;
    const v = value as Record<string, unknown>;
    if (v.schema !== FLARE_SCHEMA || v.seal !== FLARE_SEAL) return null;
    if (v.lane !== "MATCH" && v.lane !== "BREAK") return null;
    if (typeof v.sequence !== "number" || !Number.isSafeInteger(v.sequence) || v.sequence < 1) return null;
    if (typeof v.depth !== "number" || !Number.isFinite(v.depth) ||
      Math.abs(v.depth - v.sequence * FLARE_STEP) > 1e-7) return null;
    if (!pair(v.xi) || !triple(v.lorenz) || !pair(v.perturbation)) return null;
    if (typeof v.foldDrive !== "number" || !Number.isFinite(v.foldDrive) || v.foldDrive < 0) return null;
    if (typeof v.foldLog !== "number" || !Number.isFinite(v.foldLog) || v.foldLog < 0) return null;
    return v as FlareState;
  } catch {
    return null;
  }
}
