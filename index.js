const env = require("./config/env");
env.validateEnv();
const connectDB = require("./config/db");
const app = require("./app");
(async () => {
  await connectDB();
  app.listen(env.port(), () => console.log(`Excel Analytics API listening on :${env.port()}`));
})();
