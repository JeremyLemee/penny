const oidcIssuer = "http://www.w3.org/ns/solid/terms#oidcIssuer";

type Triples = Iterable<{
  predicate: { termType: string; value: string };
}>;

export function hasOidcIssuer(triples: Triples): boolean {
  for (const { predicate } of Array.from(triples)) {
    if (predicate.termType === "NamedNode" && predicate.value === oidcIssuer) {
      return true;
    }
  }
  return false;
}

export function removesOidcIssuer(
  previous: Triples,
  updated: Triples,
): boolean {
  return hasOidcIssuer(previous) && !hasOidcIssuer(updated);
}
