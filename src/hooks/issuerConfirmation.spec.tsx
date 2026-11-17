import { FluentBundle, FluentResource } from "@fluent/bundle";
import { LocalizationProvider, ReactLocalization } from "@fluent/react";
import { expect, it, jest } from "@jest/globals";
import {
  createSolidDataset,
  createThing,
  setThing,
  setUrl,
  SolidDataset,
} from "@inrupt/solid-client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "fs";
import ReactModal from "react-modal";
import { useIssuerConfirmation } from "./issuerConfirmation";

function card() {
  return setThing(
    createSolidDataset(),
    setUrl(
      createThing({ url: "https://example.org/card#me" }),
      "http://www.w3.org/ns/solid/terms#oidcIssuer",
      "https://issuer.example/",
    ),
  );
}

function renderUpdate(previous: SolidDataset, updated: SolidDataset) {
  const save = jest.fn<() => void>();
  function Editor() {
    const { requestUpdate, confirmation } = useIssuerConfirmation();
    return (
      <>
        <button onClick={() => requestUpdate(previous, updated, save)}>
          Update
        </button>
        {confirmation}
      </>
    );
  }
  const bundle = new FluentBundle("en-GB");
  bundle.addResource(
    new FluentResource(readFileSync("src/translations/en-GB.ftl", "utf8")),
  );
  ReactModal.setAppElement(document.createElement("div"));
  render(
    <LocalizationProvider l10n={new ReactLocalization([bundle])}>
      <Editor />
    </LocalizationProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Update" }));
  return save;
}

it("does not perform a structured update until issuer removal is confirmed", () => {
  const save = renderUpdate(card(), createSolidDataset());
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/solid:oidcIssuer/);
  fireEvent.click(screen.getByRole("button", { name: "Save anyway" }));
  expect(save).toHaveBeenCalledTimes(1);
});

it("does not perform a structured update when issuer removal is cancelled", async () => {
  const save = renderUpdate(card(), createSolidDataset());
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(save).not.toHaveBeenCalled();
});

it("does not require confirmation for a document that never had an issuer", () => {
  const save = renderUpdate(createSolidDataset(), createSolidDataset());
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("does not require confirmation when the updated dataset still has an issuer", () => {
  const save = renderUpdate(card(), card());
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).toBeNull();
});
