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
jest.mock("../../hooks/turtle", () => ({
  useTurtle: () => ({
    data: { content: '<#me> <https://example.org/name> "Original" .' },
    save: mockSave,
  }),
}));
jest.mock("../../functions/hasAccess", () => ({ hasAccess: () => true }));

function editAndSave(content: string) {
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
