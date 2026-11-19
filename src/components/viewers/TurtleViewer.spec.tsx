import { FluentBundle, FluentResource } from "@fluent/bundle";
import { LocalizationProvider, ReactLocalization } from "@fluent/react";
import { expect, it } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "fs";
import ReactModal from "react-modal";
import { TurtleViewer } from "./TurtleViewer";

// Keep Jest global so Next's SWC transformer hoists the module mocks.
declare const jest: typeof import("@jest/globals").jest;

const mockSave = jest
  .fn<(content: string) => Promise<void>>()
  .mockResolvedValue(undefined);
let mockOriginalContent = "";
jest.mock("../../hooks/turtle", () => ({
  useTurtle: () => ({
    data: { content: mockOriginalContent },
    save: mockSave,
  }),
}));
jest.mock("../../functions/hasAccess", () => ({ hasAccess: () => true }));

function editAndSave(
  content: string,
  original = '<#me> <https://example.org/name> "Original" .',
) {
  mockOriginalContent = original;
  const bundle = new FluentBundle("en-GB");
  bundle.addResource(
    new FluentResource(readFileSync("src/translations/en-GB.ftl", "utf8")),
  );
  ReactModal.setAppElement(document.createElement("div"));
  render(
    <LocalizationProvider l10n={new ReactLocalization([bundle])}>
      <TurtleViewer url="https://example.org/data.ttl" onClose={jest.fn()} />
    </LocalizationProvider>,
  );
  fireEvent.change(screen.getByRole("textbox"), { target: { value: content } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

it.each([
  '<#me> <https://example.org/name> "Updated" .',
  '@prefix ex: <https://example.org/> .\n<#me> ex:items ("one" "two") .',
  "",
])("saves valid Turtle without confirmation: %s", async (content) => {
  editAndSave(content);
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(content));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it.each([
  '<#me> missing:name "Updated" .',
  '<#me> <https://example.org/name> "Updated"',
  '<#graph> { <#me> <https://example.org/name> "Updated" . }',
])(
  "pauses saving invalid Turtle and displays the parser error: %s",
  (content) => {
    editAndSave(content);
    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").textContent).toMatch(/not valid Turtle/);
    expect(screen.getByRole("dialog").textContent).toMatch(/line \d/);
    expect(screen.getByRole("button", { name: "Save anyway" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  },
);

it("keeps edits and does not save when the user cancels", async () => {
  const content = '<#me> missing:name "Updated" .';
  editAndSave(content);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mockSave).not.toHaveBeenCalled();
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
    content,
  );
});

it("saves invalid Turtle only when the user chooses to proceed", async () => {
  const content = '<#me> missing:name "Updated" .';
  editAndSave(content);
  expect(mockSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save anyway" }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(content));
  expect(mockSave).toHaveBeenCalledTimes(1);
});

const card =
  "@prefix solid: <http://www.w3.org/ns/solid/terms#> .\n<#me> solid:oidcIssuer <https://issuer.example/> .";

it.each([
  card,
  "<#me> <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://issuer.example/> .",
  "@prefix auth: <http://www.w3.org/ns/solid/terms#> .\n<#me> auth:oidcIssuer <https://issuer.example/> .",
])("requires confirmation before removing the last issuer: %s", (original) => {
  editAndSave('<#me> <https://example.org/name> "Updated" .', original);
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/solid:oidcIssuer/);
  expect(screen.getByRole("dialog").textContent).toMatch(/removed or changed/);
});

it("allows the user to save a card without its issuer after confirmation", async () => {
  const content = '<#me> <https://example.org/name> "Updated" .';
  editAndSave(content, card);
  expect(mockSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save anyway" }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(content));
});

it("keeps the draft without saving when issuer removal is cancelled", async () => {
  editAndSave("", card);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mockSave).not.toHaveBeenCalled();
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
});

it.each([
  "<#me> <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://new-issuer.example/> .",
  "<#other> <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://issuer.example/> .",
])("warns when an existing issuer statement changes: %s", (content) => {
  editAndSave(content, card);
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/removed or changed/);
});

it("warns when one issuer is removed while another remains", () => {
  editAndSave(
    card,
    card +
      "\n<#other> <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://other.example/> .",
  );
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/removed or changed/);
});

it.each([
  card +
    "\n<#me> <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://additional.example/> .",
  "@prefix auth: <http://www.w3.org/ns/solid/terms#> .\n<#me> auth:oidcIssuer <https://issuer.example/> .",
])(
  "saves normally when all original issuer triples remain: %s",
  async (content) => {
    editAndSave(content, card);
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(content));
    expect(screen.queryByRole("dialog")).toBeNull();
  },
);

it.each([
  "_:me <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://issuer.example/> .",
  "[] <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://issuer.example/> .",
])(
  "does not mistake parser-generated blank node identities for an issuer change: %s",
  async (content) => {
    const updated = content + "\n# An unrelated comment";
    editAndSave(updated, content);
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(updated));
    expect(screen.queryByRole("dialog")).toBeNull();
  },
);

it("does not apply the issuer constraint when the IRI only occurs as an object", async () => {
  editAndSave(
    "",
    "<#me> <https://example.org/name> <http://www.w3.org/ns/solid/terms#oidcIssuer> .",
  );
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(""));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("also warns about the missing issuer when the new Turtle is invalid", () => {
  editAndSave('<#me> missing:name "Updated" .', card);
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/not valid Turtle/);
  expect(screen.getByRole("dialog").textContent).toMatch(/solid:oidcIssuer/);
});

it("ignores unrelated anonymous nodes added before an unchanged issuer", async () => {
  const original =
    "[] <http://www.w3.org/ns/solid/terms#oidcIssuer> <https://issuer.example/> .";
  const updated = "<#other> <https://example.org/p> [] .\n" + original;
  editAndSave(updated, original);
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(updated));
  expect(screen.queryByRole("dialog")).toBeNull();
});
