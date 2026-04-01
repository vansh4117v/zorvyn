const { Router } = require("express");
const categoriesController = require("./categories.controller");
const { authenticate, authorize } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const {
  createCategorySchema,
  updateCategorySchema,
} = require("./categories.validation");

const router = Router();

router.use(authenticate);

router.get("/", categoriesController.listCategories);
router.get("/:id", categoriesController.getCategoryById);
router.post(
  "/",
  authorize("ANALYST", "ADMIN"),
  validate(createCategorySchema),
  categoriesController.createCategory
);
router.patch(
  "/:id",
  authorize("ANALYST", "ADMIN"),
  validate(updateCategorySchema),
  categoriesController.updateCategory
);
router.delete(
  "/:id",
  authorize("ADMIN"),
  categoriesController.deleteCategory
);

module.exports = router;
