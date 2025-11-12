const express = require("express");
const { getGraphClient } = require("../../common/utils/graph-client");
const { getAccessToken } = require('../../common/utils/access-token');

const router = express.Router();

router.get("/onedrive/files", async (req, res) => {
  try {
    const client = await getGraphClient();

    const users = await client.api("/users").get();
    res.json(users);
  } catch (error) {
    console.log("Error fetching OneDrive files:", error.body);
    res.status(500).json({ error: "Failed to fetch OneDrive files" });
  }
});

router.get("/auth", async (req, res) => {
  try {
    const getToken = await getAccessToken();

    res.json(getToken);
  } catch (error) {
    res.status(500).json({ error: "Token" });
  }
});

module.exports = router;
