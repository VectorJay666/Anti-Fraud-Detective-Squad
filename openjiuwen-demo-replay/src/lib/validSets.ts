import type { Dossier, RulesDoc, ValidSets } from "../types";

export function buildValidSets(dossier: Dossier, rules: RulesDoc): ValidSets {
  const evidence = new Set(
    (dossier.evidence || []).map((e) => e.id).filter((id): id is string => Boolean(id))
  );
  const ruleIds = new Set(
    (rules.rules || []).map((r) => r.id).filter((id): id is string => Boolean(id))
  );
  return { evidence, ruleIds };
}

export function isFabricated(
  id: string,
  kind: "evidence" | "rule",
  valid: ValidSets
): boolean {
  if (kind === "evidence") return !valid.evidence.has(id);
  return !valid.ruleIds.has(id);
}
