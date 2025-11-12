const axios = require('axios');
const qs = require("qs");

async function getAccessToken() {
  try {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`

    const data = qs.stringify({
      client_id: process.env.AZURE_CLIENT_ID,
      scope: 'https://graph.microsoft.com/.default',
      client_secret: process.env.AZURE_CLIENT_SECRET,
      grant_type: 'client_credentials'
    });

    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      maxBodyLength: Infinity
    })

    return response.data
  } catch (error) {
    if (error.response) {
      console.log(error.response.status, error.response.data);
    } else {
      console.log(error);
    }
  }

}

module.exports = { getAccessToken };