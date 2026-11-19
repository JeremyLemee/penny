# Penny 

View and manipulate the data in a Solid Pod.

This project is a fork of [`Penny`](https://gitlab.com/vincenttunru/penny). You can try out yourself the original version at https://Penny.VincentTunru.com. 

## AI Use

Codex with GPT-6.1 Sol was used to develop the extension.

## Extensions

The new features include:

1. **Turtle Syntax Validation**: Before saving a Turtle document, the user is notified if the syntax is invalid. The user can cancel or explicitly proceed with saving.

2. **Solid-OIDC Issuer Protection**: If a document contains a *solid:oidcIssuer* RDF statement and this triple will be removed or changed by an update, the user is warned. The user can cancel or explicitly proceed with saving.

## Using as a Solid server UI

It is also possible to use Penny as the UI for a Solid server.
When running as a server UI, Penny will attempt to render the data available
at the URL it is running on. Thus, the server will need to be configured to
serve up Penny when a web browser is accessing the data, and raw data when that
is requested explicitly.

The server UI is available in the npm package
[`penny-pod-inspector`](https://www.npmjs.com/package/penny-pod-inspector),
in a folder called `server-ui/`.

For an example of how to set this up for the [Solid Community
Server](https://github.com/solid/community-server/), see [this
recipe](https://github.com/solid/community-server-recipes/tree/main/penny).

Note that server UI use is currently experimental.

## Deploying elsewhere

Although the app is deployed at https://Penny.VincentTunru.com, you can also
deploy it elsewhere if you wish.

To do so, you can serve up the contents of the `standalone/` folder in the npm
package
[`penny-pod-inspector`](https://www.npmjs.com/package/penny-pod-inspector).

## Development

To run Penny locally, you'll need [Node.js](https://nodejs.org). After
installing the required dependencies using `npm install` in the folder that
contains the Penny source code, you can start it by running:

    npm run dev

This will start a local server at `http://localhost:3000`, running your local
copy of the code.

