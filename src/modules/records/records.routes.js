const { Router } = require("express");
const recordsController = require("./records.controller");
const { authenticate, authorize } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const {
  createRecordSchema,
  updateRecordSchema,
} = require("./records.validation");

const router = Router();

router.use(authenticate);

router.get("/", recordsController.listRecords);
router.get("/:id", recordsController.getRecordById);
router.post(
  "/",
  authorize("ADMIN"),
  validate(createRecordSchema),
  recordsController.createRecord
);
router.patch(
  "/:id",
  authorize("ADMIN"),
  validate(updateRecordSchema),
  recordsController.updateRecord
);
router.delete("/:id", authorize("ADMIN"), recordsController.deleteRecord);

module.exports = router;
