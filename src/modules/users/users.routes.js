const { Router } = require("express");
const usersController = require("./users.controller");
const { authenticate, authorize } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { updateUserSchema } = require("./users.validation");

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", usersController.listUsers);
router.get("/:id", usersController.getUserById);
router.patch("/:id", validate(updateUserSchema), usersController.updateUser);
router.delete("/:id", usersController.deleteUser);

module.exports = router;
