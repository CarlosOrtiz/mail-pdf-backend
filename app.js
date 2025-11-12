const express = require("express")
const driveRoutes = require("./src/controllers/convert.controller");

const app = express();
app.use(express.json());

app.use("/api", driveRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Mail PDF Backend running" });
});

module.exports = app;
