const cron = require("node-cron");
const { listFilesFromTodayFolder } = require('../../src/services/converter.service');

cron.schedule("0 22 * * *", async () => {
  console.log("init 10 pm");

  try {
    await listFilesFromTodayFolder();
    console.log("cron job completed");
  } catch (error) {
    console.error(error.message);
  }
}, {
  timezone: "America/Bogota",
});

console.log("Cron job active. Waiting until 10 pm");
