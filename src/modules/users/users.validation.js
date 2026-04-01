const { z } = require("zod");

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  role: z.enum(["VIEWER", "ANALYST", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

module.exports = { updateUserSchema };
