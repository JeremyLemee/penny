import { UrlString } from "@inrupt/solid-client";
import React, {
  FC,
  FormEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { MdCheck } from "react-icons/md";
import { Parser, Quad } from "n3";
import { SectionHeading } from "../ui/headings";
import { ClientLocalized } from "../ClientLocalized";
import { HasAccess } from "../HasAccess";
import { useTurtle } from "../../hooks/turtle";
import { useL10n } from "../../hooks/l10n";
import { Spinner } from "../ui/Spinner";
import { Modal } from "../ui/modal";
import { Button } from "../ui/forms";
import { removesOidcIssuer } from "../../functions/oidcIssuer";

interface Props {
  url: UrlString;
  onClose: () => void;
}

export const TurtleViewer: FC<Props> = (props) => {
  const file = useTurtle(props.url);

  const [turtleToRestore, setTurtleToRestore] = useState<string>();
  const [formContent, setFormContent] = useState<string>();
  const [pendingUpdate, setPendingUpdate] = useState<{
    content: string;
    error?: string;
    issuerChanged: boolean;
  }>();
  const l10n = useL10n();

  const saveContent = useCallback(
    (content: string) => {
      const oldContent = file.data?.content;
      const undo = () => {
        setTurtleToRestore(oldContent);
      };
      file
        .save(content)
        .then(() => {
          toast(
            <ClientLocalized
              id="turtle-update-toast-success"
              elems={{
                "undo-button": (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      undo();
                    }}
                    className="underline hover:no-underline focus:no-underline"
                  />
                ),
              }}
            >
              <span>Saved.</span>
            </ClientLocalized>,
            { type: "info" },
          );
        })
        .catch(() => {
          toast(
            <ClientLocalized id="turtle-update-toast-error">
              <span>There was an error saving your Turtle.</span>
            </ClientLocalized>,
            { type: "error" },
          );
        });
    },
    [file],
  );

  const requestSave = useCallback(
    (content: string) => {
      const parse = (source: string) =>
        new Parser({
          format: "text/turtle",
          baseIRI: props.url,
        }).parse(source);
      let error: string | undefined;
      let updatedTriples: Quad[] = [];
      try {
        updatedTriples = parse(content);
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
      }

      let issuerChanged = false;
      try {
        issuerChanged = removesOidcIssuer(
          parse(file.data?.content ?? ""),
          updatedTriples,
          { matchBlankNodesByStructure: true },
        );
      } catch {
        // An invalid original document cannot establish the issuer constraint.
      }
      if (error || issuerChanged) {
        setPendingUpdate({ content, error, issuerChanged });
        return;
      }
      saveContent(content);
    },
    [file.data?.content, props.url, saveContent],
  );

  const saveChanges: FormEventHandler = (event) => {
    event.preventDefault();
    requestSave(formContent ?? file.data?.content ?? "");
  };

  useEffect(() => {
    if (turtleToRestore === undefined) {
      return;
    }
    setTurtleToRestore(undefined);
    requestSave(turtleToRestore);
  }, [turtleToRestore, requestSave]);

  const confirmationHeading = pendingUpdate?.error
    ? "turtle-invalid-heading"
    : "oidc-issuer-change-heading";

  if (!file.data) {
    return <Spinner />;
  }

  return (
    <>
      <Modal
        isOpen={pendingUpdate !== undefined}
        onRequestClose={() => setPendingUpdate(undefined)}
        contentLabel={l10n.getString(confirmationHeading)}
        size="sm"
      >
        <div className="space-y-5">
          <h2 className="text-2xl font-bold">
            {l10n.getString(confirmationHeading)}
          </h2>
          {pendingUpdate?.error && (
            <>
              <p>{l10n.getString("turtle-invalid-description")}</p>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-3">
                {pendingUpdate.error}
              </pre>
            </>
          )}
          {pendingUpdate?.issuerChanged && (
            <p>{l10n.getString("oidc-issuer-change-description")}</p>
          )}
          <div className="flex space-x-5">
            <Button
              value={l10n.getString("turtle-invalid-cancel-button")}
              className="flex-grow p-2"
              autoFocus
              onClick={() => setPendingUpdate(undefined)}
            />
            <Button
              value={l10n.getString("turtle-invalid-proceed-button")}
              className="flex-grow p-2"
              onClick={() => {
                if (pendingUpdate) {
                  const { content } = pendingUpdate;
                  setPendingUpdate(undefined);
                  saveContent(content);
                }
              }}
            />
          </div>
        </div>
      </Modal>
      <div className="">
        <ClientLocalized id="turtle-heading">
          <SectionHeading>Raw Turtle</SectionHeading>
        </ClientLocalized>
        <div className="space-y-5 pb-10">
          <HasAccess access={["write"]} resource={file.data}>
            <div className="rounded border-2 border-yellow-600 bg-yellow-100 p-5">
              <p>{l10n.getString("turtle-danger-warning")}</p>
              <p>
                <button
                  onClick={() => props.onClose()}
                  className="font-bold hover:underline"
                >
                  {l10n.getString("turtle-dataset-viewer-link")}
                </button>
              </p>
            </div>
          </HasAccess>
          <form onSubmit={saveChanges} className="space-y-5">
            {/* Why 60 characters: https://baymard.com/blog/line-length-readability */}
            <textarea
              cols={60}
              rows={20}
              className="h-96 w-full overflow-scroll rounded border-4 border-gray-700 p-2 font-mono"
              onChange={(e) => {
                e.preventDefault();
                setFormContent(e.target.value);
              }}
              defaultValue={file.data.content}
            />
            <HasAccess access={["write"]} resource={file.data}>
              <div className="grid gap-5 pb-5 sm:grid-cols-2">
                <button
                  type="submit"
                  className="flex items-center space-x-2 rounded border-4 border-gray-700 p-5 text-lg text-gray-700 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 focus:ring-offset-2"
                >
                  <MdCheck aria-hidden="true" />
                  <span>{l10n.getString("turtle-save-button")}</span>
                </button>
              </div>
            </HasAccess>
          </form>
        </div>
      </div>
    </>
  );
};
