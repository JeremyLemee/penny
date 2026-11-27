import {
  EVENTS,
  getDefaultSession,
  handleIncomingRedirect,
} from "@inrupt/solid-client-authn-browser";
import { AppProps } from "next/app";
import { useRouter } from "next/router";
import React, { FC, useEffect, useState } from "react";
import Modal from "react-modal";
import { ToastContainer, cssTransition, Slide } from "react-toastify";
import { MdClose } from "react-icons/md";

import { SessionContext, SessionInfo } from "../contexts/session";
import "../../styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import * as storage from "../functions/localStorage";
import { LocalizationProvider } from "@fluent/react";
import { getL10n } from "../functions/getL10n";

if (typeof document === "object") {
  const appElement = document.querySelector(
    "#appWrapper > *:first-child",
  ) as HTMLElement;
  Modal.setAppElement(appElement);
}

const ToastCloseButton = <MdClose className="flex-shrink" aria-label="Close" />;
const motionMediaQueryList = process.browser
  ? window.matchMedia("(prefers-reduced-motion)")
  : undefined;
const Transition = motionMediaQueryList?.matches
  ? cssTransition({
      enter: "none",
      exit: "none",
    })
  : Slide;

export const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  const [sessionInfo, setSessionInfo] = useState<
    SessionInfo | null | undefined
  >(null);
  const router = useRouter();

  useEffect(() => {
    setSessionInfo(undefined);
    handleIncomingRedirect({
      restorePreviousSession: storage.getItem("autoconnect") === "true",
    }).then((info) => {
      if (info && info.isLoggedIn) {
        const lastAttemptedIdp = storage.getItem("last-attempted-idp");
        if (typeof lastAttemptedIdp === "string") {
          storage.setItem("last-successful-idp", lastAttemptedIdp);
        }
        setSessionInfo(info as SessionInfo);
        const redirectUrl = storage.getItem("redirect-url");
        if (typeof redirectUrl === "string") {
          storage.removeItem("redirect-url");
          router.replace(redirectUrl);
        }
      } else {
        setSessionInfo(null);
      }
    });
    const { events } = getDefaultSession();
    const logoutListener = () => setSessionInfo(null);
    const sessionRestoreListener = (currentUrl: string) => {
      router.replace(currentUrl);
    };
    events.on(EVENTS.LOGOUT, logoutListener);
    events.on(EVENTS.SESSION_RESTORED, sessionRestoreListener);

    return () => {
      events.removeListener(EVENTS.LOGOUT, logoutListener);
      events.removeListener(EVENTS.SESSION_RESTORED, sessionRestoreListener);
    };
  }, [router]);

  return (
    <SessionContext.Provider value={sessionInfo}>
      <LocalizationProvider l10n={getL10n()}>
        <>
          <Component {...pageProps} />
          <ToastContainer
            bodyClassName={() => "font-white block p-3 flex-grow leading-5"}
            position="bottom-left"
            closeButton={false}
            autoClose={5000}
            transition={Transition}
            icon={false}
            theme="dark"
          />
        </>
      </LocalizationProvider>
    </SessionContext.Provider>
  );
};

export default MyApp;
