import { UrlString } from "@inrupt/solid-client";
import React, { FC, FormEventHandler, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MdCheck } from "react-icons/md";
import { Parser } from "n3";
import { SectionHeading } from "../ui/headings";
import { ClientLocalized } from "../ClientLocalized";
import { HasAccess } from "../HasAccess";
import { useTurtle } from "../../hooks/turtle";
import { useL10n } from "../../hooks/l10n";
import { Spinner } from "../ui/Spinner";
import { Modal } from "../ui/modal";
import { Button } from "../ui/forms";

interface Props {
  url: UrlString;
  onClose: () => void;
}

export const TurtleViewer: FC<Props> = (props) => {
  const file = useTurtle(props.url);

  const [turtleToRestore, setTurtleToRestore] = useState<string>();
  const [formContent, setFormContent] = useState(file.data?.content ?? "");
  const [invalidTurtle, setInvalidTurtle] = useState<{
    content: string;
    error: string;
  }>();
  const l10n = useL10n();

  useEffect(() => {
    if (!turtleToRestore) {
      return;
    }

    setTurtleToRestore(undefined);
    file.save(turtleToRestore);
  }, [turtleToRestore, file]);

  const saveContent = (content: string) => {
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
  };

  const saveChanges: FormEventHandler = (event) => {
    event.preventDefault();
    try {
      new Parser({ format: "text/turtle", baseIRI: props.url }).parse(
        formContent,
      );
    } catch (error) {
      setInvalidTurtle({
        content: formContent,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    saveContent(formContent);
  };

  if (!file.data) {
    return <Spinner />;
  }

  return (
    <>
      <Modal
        isOpen={invalidTurtle !== undefined}
        onRequestClose={() => setInvalidTurtle(undefined)}
        contentLabel={l10n.getString("turtle-invalid-heading")}
        size="sm"
      >
        <div className="space-y-5">
          <h2 className="text-2xl font-bold">
            {l10n.getString("turtle-invalid-heading")}
          </h2>
          <p>{l10n.getString("turtle-invalid-description")}</p>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-3">
            {invalidTurtle?.error}
          </pre>
          <div className="flex space-x-5">
            <Button
              value={l10n.getString("turtle-invalid-cancel-button")}
              className="flex-grow p-2"
              autoFocus
              onClick={() => setInvalidTurtle(undefined)}
            />
            <Button
              value={l10n.getString("turtle-invalid-proceed-button")}
              className="flex-grow p-2"
              onClick={() => {
                if (invalidTurtle) {
                  const { content } = invalidTurtle;
                  setInvalidTurtle(undefined);
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
