const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../../config/db");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");

const SALT_ROUNDS = 10;

function generateAccessToken(userId) {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

function getRefreshExpiry() {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const val = parseInt(match[1]);
  const unit = match[2];
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return new Date(Date.now() + val * ms);
}

async function register({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role || "VIEWER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  if (user.status === "INACTIVE") {
    throw new AppError(403, "Account is inactive");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const accessToken = generateAccessToken(user.id);

  const refreshTokenValue = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: getRefreshExpiry(),
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
}

async function refreshAccessToken(token) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored) {
    throw new AppError(401, "Invalid refresh token");
  }

  if (stored.revokedAt) {
    throw new AppError(401, "Refresh token has been revoked");
  }

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, "Refresh token expired");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.status === "INACTIVE") {
    throw new AppError(401, "User not found or inactive");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const newAccessToken = generateAccessToken(user.id);
  const newRefreshValue = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      token: newRefreshValue,
      userId: user.id,
      expiresAt: getRefreshExpiry(),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshValue,
  };
}

async function logout(token) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (stored && !stored.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
  }
  return true;
}

function getProfile(user) {
  const { passwordHash, ...profile } = user;
  return profile;
}

module.exports = { register, login, refreshAccessToken, logout, getProfile };
