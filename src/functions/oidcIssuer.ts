import type { Quad } from "@rdfjs/types";

const oidcIssuer = "http://www.w3.org/ns/solid/terms#oidcIssuer";
type Triple = Pick<Quad, "subject" | "predicate" | "object">;
type Triples = Iterable<Triple>;
const positions = ["subject", "predicate", "object"] as const;

export function removesOidcIssuer(
  previous: Triples,
  updated: Triples,
  options: { matchBlankNodesByStructure?: boolean } = {},
): boolean {
  const originals = Array.from(previous);
  const candidates = Array.from(updated);
  const issuers = originals.filter(
    ({ predicate }) =>
      predicate.termType === "NamedNode" && predicate.value === oidcIssuer,
  );
  if (issuers.length === 0) return false;

  // Structured edits retain node identities. A changed statement removes its
  // original subject/predicate/object triple, even if another issuer remains.
  if (
    !options.matchBlankNodesByStructure ||
    issuers.every((triple) =>
      positions.every((position) => triple[position].termType !== "BlankNode"),
    )
  ) {
    return issuers.some(
      (original) =>
        !candidates.some((candidate) =>
          positions.every((position) =>
            original[position].equals(candidate[position]),
          ),
        ),
    );
  }

  // Separately parsed Turtle has document-scoped blank node labels. Include
  // connected statements so that issuer reassignment between distinct anonymous
  // subjects cannot be mistaken for simply renaming their labels.
  const blankNodes = new Set<string>();
  const rememberBlankNodes = (triple: Triple) => {
    for (const position of positions) {
      if (triple[position].termType === "BlankNode")
        blankNodes.add(triple[position].value);
    }
  };
  const statements = new Set(issuers);
  issuers.forEach(rememberBlankNodes);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const triple of originals) {
      if (
        !statements.has(triple) &&
        positions.some(
          (position) =>
            triple[position].termType === "BlankNode" &&
            blankNodes.has(triple[position].value),
        )
      ) {
        statements.add(triple);
        rememberBlankNodes(triple);
        expanded = true;
      }
    }
  }

  if (statements.size > 1000) return true;

  const matches = Array.from(statements)
    .map((original) => ({
      original,
      candidates: candidates.filter((candidate) =>
        positions.every((position) =>
          original[position].termType === "BlankNode"
            ? candidate[position].termType === "BlankNode"
            : original[position].equals(candidate[position]),
        ),
      ),
    }))
    .sort((a, b) => a.candidates.length - b.candidates.length);
  if (matches.some((match) => match.candidates.length === 0)) return true;

  // Ambiguous anonymous graphs must not freeze the editor. If preservation
  // cannot be established within this budget, ask for confirmation conservatively.
  let attempts = 0;
  const preservesStatements = (
    index: number,
    mapping: Map<string, string>,
    reverseMapping: Map<string, string>,
  ): boolean => {
    if (index === matches.length) return true;
    const match = matches[index];
    for (const candidate of match.candidates) {
      if (++attempts > 10000) return false;
      const nextMapping = new Map(mapping);
      const nextReverseMapping = new Map(reverseMapping);
      let compatible = true;
      for (const position of positions) {
        const before = match.original[position];
        const after = candidate[position];
        if (before.termType !== "BlankNode") continue;
        if (nextMapping.has(before.value)) {
          if (nextMapping.get(before.value) !== after.value) compatible = false;
        } else {
          if (nextReverseMapping.has(after.value)) compatible = false;
          nextMapping.set(before.value, after.value);
          nextReverseMapping.set(after.value, before.value);
        }
      }
      if (
        compatible &&
        preservesStatements(index + 1, nextMapping, nextReverseMapping)
      )
        return true;
    }
    return false;
  };

  return !preservesStatements(0, new Map(), new Map());
}
