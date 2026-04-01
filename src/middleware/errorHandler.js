const { Prisma } = require("@prisma/client");
const AppError = require("../utils/AppError");
const logger = require("../config/logger");

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const payload = { success: false, message: err.message };
    if (err.errors) payload.errors = err.errors;
    return res.status(err.statusCode).json(payload);
  }

  if (err.name === "ZodError") {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.join(", ") || "field";
      return res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists`,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  logger.error("Unhandled error: %s", err.message, { stack: err.stack });
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}

module.exports = errorHandler;
