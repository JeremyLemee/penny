#!/usr/bin/env zx
import "zx/globals";

const unneededPages = ["src/pages/server_ui.tsx"];
await Promise.all(
  unneededPages.map(async (page) => {
    await fs.move(page, `scripts/.cache/${page}`, { overwrite: true });
  })
);

let restoreStarted = false;
async function restore() {
  if (restoreStarted) {
    return;
  }
  restoreStarted = true;

  await Promise.all(
    unneededPages.map((page) =>
      fs.move(`scripts/.cache/${page}`, page, { overwrite: true })
    )
  );
}

process.on("SIGINT", async () => {
  await restore();
});

let exitCode = 0;
let error = "";

// Create a client ID
if (process.env.NEXT_PUBLIC_APP_URL) {
  const clientIdUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
  clientIdUrl.pathname = "/clientid.json";
  const clientId = {
    "@context": "https://www.w3.org/ns/solid/oidc-context.jsonld",
    client_id: clientIdUrl.href,
    redirect_uris: [clientIdUrl.origin, clientIdUrl.origin + "/"],
    client_name: "Penny",
    token_endpoint_auth_method: "none",
    grant_types: ["refresh_token", "authorization_code"],
    response_types: ["code"],
    scope: "openid webid offline_access",
  };
  await fs.writeJSON("public/clientid.json", clientId, { spaces: 2 });
}

try {
  await $`npm run build`;
} catch (processOutput) {
  /** @type {ProcessOutput} */
  const output = processOutput;
  exitCode = output.exitCode;
  error = output.error;
}

await restore();

if (exitCode !== 0) {
  console.error(error);
  process.exit(exitCode);
}
