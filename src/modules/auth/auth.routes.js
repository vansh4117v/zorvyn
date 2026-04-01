const { Router } = require("express");
const authController = require("./auth.controller");
const { authenticate } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { registerSchema, loginSchema, refreshSchema } = require("./auth.validation");

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", validate(refreshSchema), authController.logout);
router.get("/me", authenticate, authController.me);

module.exports = router;
