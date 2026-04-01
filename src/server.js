require("dotenv").config();
const env = require("./config/env");
const app = require("./app");
const logger = require("./config/logger");
const prisma = require("./config/db");

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

function gracefulShutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await prisma.$disconnect();
      logger.info("Database connection closed");
    } catch (err) {
      logger.error("Error disconnecting database: %s", err.message);
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forceful shutdown — could not close connections in time");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection: %s", reason instanceof Error ? reason.message : reason, {
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception: %s", err.message, { stack: err.stack });
  gracefulShutdown("uncaughtException");
});
