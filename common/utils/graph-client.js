require("isomorphic-fetch");
const { Client } = require("@microsoft/microsoft-graph-client");
const { ClientSecretCredential } = require("@azure/identity");
const { getAccessToken } = require("./access-token");

async function getGraphClient() {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );

  const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");

  console.log(tokenResponse)
  const token = await getAccessToken();

  const client = Client.init({
    authProvider: (done) => {
      done(null, token.access_token);
    },
  });
  return client;
}

module.exports = { getGraphClient };
