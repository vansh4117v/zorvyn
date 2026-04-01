const { z } = require("zod");

const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

module.exports = { createCategorySchema, updateCategorySchema };
