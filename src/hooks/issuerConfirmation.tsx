import { SolidDataset, toRdfJsDataset } from "@inrupt/solid-client";
import { useCallback, useState } from "react";
import { removesOidcIssuer } from "../functions/oidcIssuer";
import { Modal } from "../components/ui/modal";
import { Button } from "../components/ui/forms";
import { useL10n } from "./l10n";

export function useIssuerConfirmation() {
  const [pending, setPending] = useState<{ update: () => void }>();
  const l10n = useL10n();
  const requestUpdate = useCallback(
    (previous: SolidDataset, updated: SolidDataset, update: () => void) => {
      if (
        removesOidcIssuer(toRdfJsDataset(previous), toRdfJsDataset(updated))
      ) {
        setPending({ update });
      } else {
        update();
      }
    },
    [],
  );

  const confirmation = (
    <Modal
      isOpen={pending !== undefined}
      onRequestClose={() => setPending(undefined)}
      contentLabel={l10n.getString("oidc-issuer-missing-heading")}
      size="sm"
    >
      <div className="space-y-5">
        <h2 className="text-2xl font-bold">
          {l10n.getString("oidc-issuer-missing-heading")}
        </h2>
        <p>{l10n.getString("oidc-issuer-missing-description")}</p>
        <div className="flex space-x-5">
          <Button
            value={l10n.getString("turtle-invalid-cancel-button")}
            className="flex-grow p-2"
            autoFocus
            onClick={() => setPending(undefined)}
          />
          <Button
            value={l10n.getString("turtle-invalid-proceed-button")}
            className="flex-grow p-2"
            onClick={() => {
              if (pending) {
                setPending(undefined);
                pending.update();
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );

  return { requestUpdate, confirmation };
}
