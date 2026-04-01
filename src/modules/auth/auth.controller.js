const authService = require("./auth.service");
const { success } = require("../../utils/response");

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    return success(res, 201, "User registered successfully", user);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body);
    return success(res, 200, "Login successful", data);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const data = await authService.refreshAccessToken(req.body.refreshToken);
    return success(res, 200, "Token refreshed", data);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.body.refreshToken);
    return success(res, 200, "Logged out successfully");
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const profile = authService.getProfile(req.user);
    return success(res, 200, "Profile retrieved", profile);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me };
