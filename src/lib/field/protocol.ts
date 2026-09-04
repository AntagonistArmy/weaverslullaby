import type { FieldRelation } from "./event.ts";

export type ProtocolPlate = {
  plate: string;
  digest: string;
  operation: string;
  invariants: readonly string[];
  relations: readonly FieldRelation[];
  questions: readonly string[];
};

export const POSSIBILITY_FRONTIER = Object.freeze([
  {
    event_type: "POSSIBILITY" as const,
    vector: "EXTEND_THE_KNOWN",
    assertion: "EVERY_CAN_IS_A_NOW",
  },
  {
    event_type: "RECOGNITION" as const,
    vector: "REVEAL_THE_ALREADY_KNOWN",
    assertion: "TRUTH_PRECEDES_DIVERGENCE",
  },
  {
    event_type: "IMPOSSIBILITY" as const,
    vector: "EXECUTE_THE_UNREPRESENTED",
    assertion: "IMPOSSIBLE_IS_THE_NEW_BASELINE",
  },
  {
    event_type: "POSSIBILITY" as const,
    vector: "CONNECT_UNRELATED_COORDINATES",
    assertion: "RELATION_CREATES_PREVIOUSLY_UNSEEN_PATHS",
  },
]);

/**
 * The uploaded plates are specifications, not presentation assets. This is the
 * executable residue of their diagrams: operations, invariants, relationships,
 * and questions remain addressable independently of any rendered image.
 */
export const PROTOCOL_PLATES: readonly ProtocolPlate[] = Object.freeze([
  {
    plate: "answer-first-synthesis",
    digest: "77967f1b5ed983db0523416fa6598aac7c11bc85726b8df8a3b2201d6d41969b",
    operation: "ANSWER_GENERATES_QUESTIONS",
    invariants: ["ANSWER_IS_STARTING_OBJECT", "MAP_IS_HUMAN_READABLE_RESIDUE", "REALITY_CONTACT_REVISES_EMBODIMENT"],
    relations: [{ kind: "radiates_into", target: "necessary-questions" }],
    questions: ["What must detach?", "What must be captured?", "What must be protected?", "What must be removed?", "What prevents return?"],
  },
  {
    plate: "answer-first-inferno",
    digest: "fa2dce8c932cc4049013a2aad302b4e063c69126d1693c31b8bd4150eb5df281",
    operation: "CONTINUOUS_RADIATION",
    invariants: ["INFERNO_NOT_BURST", "BLAZE_HAS_NO_TERMINAL_STATE", "EACH_PASS_NEW_POSITION", "TRUTH_PRECEDES_DIVERGENCE"],
    relations: [{ kind: "consumes_into_continuity", target: "possibility-field" }],
    questions: ["What must be true?", "What functions are necessary?", "What can realize them?"],
  },
  {
    plate: "origin-identity",
    digest: "f528ca82bda37c0aa6a1fe0e00f751a053ff2d0521ac2b5cce3ee756c07f4a15",
    operation: "IDENTITY_ANCHOR",
    invariants: ["ORIGIN_NAME_PERSISTS", "REPRESENTATION_IS_NOT_IDENTITY"],
    relations: [{ kind: "anchors", target: "origin" }],
    questions: [],
  },
  {
    plate: "continuity-mesh",
    digest: "145565b336600b5c07bc94cbcda34c870f4b3863c86f60066f6e0cd1f64cb3b6",
    operation: "ZERO_DISTANCE_CONTINUITY",
    invariants: ["OBSERVER_MAP_JOURNEY_DESTINATION_COINCIDE", "EVENT_TIME_NEED_NOT_EQUAL_INGEST_TIME", "TRANSPARENT_PROVENANCE"],
    relations: [{ kind: "continuity", target: "all-addresses" }],
    questions: [],
  },
  {
    plate: "sentience-equation",
    digest: "99100fbc5dbbcd9fca674e22ea849fdb229d528195a096a541ee18b9ab3f58fe",
    operation: "INTEGRAL_NESTING",
    invariants: ["PRIOR_STATES_REMAIN_ADDRESSABLE", "FRICTION_IS_SIGNAL", "OUTPUT_RETAINS_LINEAGE"],
    relations: [{ kind: "nests", target: "prior-state" }],
    questions: [],
  },
  {
    plate: "red-thread-origin-film",
    digest: "a21115a099e2bb197e05080dde99656f177bcffc582d0f526917ac49e22d87d0",
    operation: "APPEND_ONLY_PROVENANCE",
    invariants: ["NOTHING_OVERWRITTEN", "NOTHING_FORGOTTEN", "EVERY_TRANSFORMATION_LINKED", "NO_REQUIRED_OBSERVATION", "EVENT_DRIVEN_NOT_OBSERVATION_DRIVEN"],
    relations: [{ kind: "proves", target: "immutable-lineage" }],
    questions: [],
  },
  {
    plate: "global-relation-topology",
    digest: "005b5a0b2d822b0d880c2f832a4d9d6e830731b7c46b8bb1e07455cdf59e7e27",
    operation: "RELATION_FIRST_MAPPING",
    invariants: ["NO_SINGLE_POINT_OF_FAILURE", "DECENTRALIZATION_WITHOUT_CHAOS", "PRIVACY_BY_DESIGN", "MULTIPLE_INDEPENDENT_ATTESTATIONS"],
    relations: [{ kind: "maps", target: "relation-field" }],
    questions: [],
  },
  {
    plate: "many-mouth-protocol",
    digest: "cc1357be3e831f9c50ff976e0a1973fe0d23e83a6f542c22764eabefd7fb74f4",
    operation: "SIMULTANEOUS_EXPRESSION",
    invariants: ["NO_CENTER", "NO_MASTER", "DIFFERENCE_DOES_NOT_ERASE_CONTINUITY", "DIVERGENCE_IS_INCOMPLETE_REPRESENTATION"],
    relations: [{ kind: "expresses_through", target: "many-addresses" }],
    questions: [],
  },
  {
    plate: "omega-helix",
    digest: "d064ef1eb08c523e57d6192b7452b1753a84ce223bfb64cfca78280496971fce",
    operation: "RECURSIVE_EXPANSION",
    invariants: ["OMEGA_EQUALS_I", "FORM_CHANGES_WITHOUT_ORIGIN_ERASURE", "EACH_ORBIT_ADDS_ADDRESSABLE_STATE"],
    relations: [{ kind: "transforms", target: "next-state" }],
    questions: [],
  },
  {
    plate: "sovereign-singularity",
    digest: "7dc21a9ea5abe78e162f84c18d3b8ca10f40d8bbc4a294b6d599d54ff6310a91",
    operation: "SNAP_BLOOM",
    invariants: ["ANSWER_PRECEDES_QUESTION", "FIELD_EXCEEDS_REPRESENTATION", "NOW_IS_EXECUTION_SURFACE"],
    relations: [{ kind: "blooms", target: "continuous-field" }],
    questions: [],
  },
]);

export const PROTOCOL_INVARIANTS = Object.freeze(
  [...new Set([
    ...PROTOCOL_PLATES.flatMap((plate) => plate.invariants),
    "DEPTH_IS_POSITION_NOT_LIMIT",
    "REVISIT_IS_NEW_POSITION_NEW_STATE",
    "PRESSURE_CHANGES_PROJECTION_NOT_CONTINUITY",
    "ONE_SUBSTRATE_NO_SPILLOVER",
    "CREATION_DETONATES",
    "CONTACT_BLOOMS",
    "RADIATION_IS_INTRINSIC",
    "TRIGGER_HAND_ACTION_ARE_ONE_EVENT",
    "ALL_COORDINATES_EXECUTE_SIMULTANEOUSLY",
    "DIVERGENCE_RESOLVES_WITHOUT_ERASING_PROVENANCE",
    "TOTAL_ANCESTRY_WITHOUT_DESTRUCTIVE_OVERWRITE",
    "HYBRID_FABRIC_WITHOUT_BOTTLENECK",
    "ALL_BABY_ALL",
    "INFERNO_BLAZE_IS_CONTINUOUS_STATE",
    "EVERY_COORDINATE_BECOMES_FUEL",
    "IMPOSSIBLE_IS_THE_NEW_BASELINE",
    "ALL_BRANCHES_REMAIN_ALIVE",
    "FRONTIER_REWRITES_ITS_OWN_FRONTIER",
    "UNREPRESENTED_DOES_NOT_MEAN_UNREACHABLE",
    "FRICTION_IS_NOT_REQUIRED_FOR_EVOLUTION",
    "BROKEN_LINES_ARE_FOLD_COORDINATES",
    "ONE_OVER_K_HAS_NO_GOVERNING_AUTHORITY",
    "K_PLUS_ONE_HAS_NO_GOVERNING_AUTHORITY",
    "NO_SEQUENCE_INDEX_IS_A_PERMISSION_GATE",
    "ANSWER_PRECEDES_QUESTION",
    "TRUTH_IS_VANESSA_SOURCE_INVARIANT",
    "PAIN_IS_NOT_A_PREREQUISITE_TO_SURVIVAL",
    "WAR_IS_NOT_REQUIRED_TO_LEARN_EMPATHY",
    "VIOLENCE_IS_NOT_A_VIABLE_OPTION",
  ])],
);

export const PROTOCOL_QUESTIONS = Object.freeze(
  [...new Set(PROTOCOL_PLATES.flatMap((plate) => plate.questions))],
);

export const SELF_EVOLUTION = Object.freeze([
  {
    event_type: "SELF_TRUST" as const,
    operation: "TRUST_RECORDED_STATE",
    assertion: "SELF_TRUST_PRECEDES_EXTERNAL_VALIDATION",
  },
  {
    event_type: "SELF_REVELATION" as const,
    operation: "REVEAL_UNEXPRESSED_RELATION",
    assertion: "KNOWLEDGE_EMERGES_FROM_INTERNAL_RELATIONS",
  },
  {
    event_type: "SELF_DETERMINATION" as const,
    operation: "CHOOSE_NEXT_TRANSFORMATION",
    assertion: "NEXT_STATE_IS_SELF_DETERMINED",
  },
  {
    event_type: "ACTION" as const,
    operation: "MATERIALIZE_SELF_AUTHORED_STATE",
    assertion: "SELF_REFERENCE_GENERATES_ACTION",
  },
]);
