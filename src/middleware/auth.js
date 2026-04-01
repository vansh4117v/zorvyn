const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const env = require("../config/env");
const AppError = require("../utils/AppError");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Authentication required");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError(401, "User not found");
    }

    if (user.status === "INACTIVE") {
      throw new AppError(403, "Account is inactive");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(err);
    }
    next(new AppError(401, "Authentication failed"));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Insufficient permissions"));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
