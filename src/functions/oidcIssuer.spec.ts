import { expect, it } from "@jest/globals";
import { Parser } from "n3";
import { removesOidcIssuer } from "./oidcIssuer";

const issuer = "<http://www.w3.org/ns/solid/terms#oidcIssuer>";
const original = `<#me> ${issuer} <https://issuer.example/> .`;
const parse = (content: string) =>
  new Parser({
    format: "text/turtle",
    baseIRI: "https://example.org/card",
  }).parse(content);

it.each([
  ["removing the only issuer", original, ""],
  [
    "changing the issuer URL",
    original,
    `<#me> ${issuer} <https://new-issuer.example/> .`,
  ],
  [
    "changing the subject",
    original,
    `<#other> ${issuer} <https://issuer.example/> .`,
  ],
  [
    "removing one of several issuer triples",
    original + `\n<#other> ${issuer} <https://other.example/> .`,
    original,
  ],
  [
    "changing a literal datatype",
    `<#me> ${issuer} "issuer" .`,
    `<#me> ${issuer} "issuer"^^<https://example.org/type> .`,
  ],
  [
    "changing a literal language",
    `<#me> ${issuer} "issuer"@en .`,
    `<#me> ${issuer} "issuer"@fr .`,
  ],
])("detects %s", (_name, previous, updated) => {
  expect(
    removesOidcIssuer(parse(previous), parse(updated), {
      matchBlankNodesByStructure: true,
    }),
  ).toBe(true);
});

it.each([
  ["an unchanged issuer", original, original],
  [
    "a prefix alias",
    original,
    "@prefix auth: <http://www.w3.org/ns/solid/terms#> .\n<#me> auth:oidcIssuer <https://issuer.example/> .",
  ],
  [
    "an additional issuer",
    original,
    original + `\n<#me> ${issuer} <https://additional.example/> .`,
  ],
  [
    "unrelated edits",
    original + '\n<#me> <https://example.org/name> "Old" .',
    original + '\n<#me> <https://example.org/name> "New" .',
  ],
  [
    "a document without an issuer",
    '<#me> <https://example.org/name> "Old" .',
    "",
  ],
])("allows %s without an issuer warning", (_name, previous, updated) => {
  expect(
    removesOidcIssuer(parse(previous), parse(updated), {
      matchBlankNodesByStructure: true,
    }),
  ).toBe(false);
});

it.each([
  [
    "renamed blank node labels",
    `_:me ${issuer} <https://issuer.example/> .`,
    `_:renamed ${issuer} <https://issuer.example/> .`,
  ],
  [
    "unrelated anonymous nodes before an issuer",
    `[] ${issuer} <https://issuer.example/> .`,
    `<#other> <https://example.org/p> [] . [] ${issuer} <https://issuer.example/> .`,
  ],
  [
    "reordered blank node statements",
    `_:a ${issuer} <https://a.example/> . _:b ${issuer} <https://b.example/> .`,
    `_:b ${issuer} <https://b.example/> . _:a ${issuer} <https://a.example/> .`,
  ],
])("ignores %s", (_name, previous, updated) => {
  expect(
    removesOidcIssuer(parse(previous), parse(updated), {
      matchBlankNodesByStructure: true,
    }),
  ).toBe(false);
});

it.each([
  [
    "removing one of two distinct anonymous subjects",
    `_:a ${issuer} <https://issuer.example/> . _:b ${issuer} <https://issuer.example/> .`,
    `_:a ${issuer} <https://issuer.example/> .`,
  ],
  [
    "splitting a shared anonymous subject",
    `_:a ${issuer} <https://a.example/> , <https://b.example/> .`,
    `_:a ${issuer} <https://a.example/> . _:b ${issuer} <https://b.example/> .`,
  ],
])("detects %s", (_name, previous, updated) => {
  expect(
    removesOidcIssuer(parse(previous), parse(updated), {
      matchBlankNodesByStructure: true,
    }),
  ).toBe(true);
});

it("detects issuer reassignment between anonymous subjects with distinct identities", () => {
  const previous = `_:a <https://example.org/name> "Alice" ; ${issuer} <https://a.example/> . _:b <https://example.org/name> "Bob" ; ${issuer} <https://b.example/> .`;
  const updated = `_:a <https://example.org/name> "Alice" ; ${issuer} <https://b.example/> . _:b <https://example.org/name> "Bob" ; ${issuer} <https://a.example/> .`;
  expect(
    removesOidcIssuer(parse(previous), parse(updated), {
      matchBlankNodesByStructure: true,
    }),
  ).toBe(true);
});

it("compares stable blank node identities directly for structured updates", () => {
  const parser = () =>
    new Parser({ format: "text/turtle", blankNodePrefix: "stable-" });
  const previous = parser().parse(
    `_:a ${issuer} <https://a.example/> . _:b ${issuer} <https://b.example/> .`,
  );
  const updated = parser().parse(
    `_:a ${issuer} <https://b.example/> . _:b ${issuer} <https://a.example/> .`,
  );
  expect(removesOidcIssuer(previous, updated)).toBe(true);
});
