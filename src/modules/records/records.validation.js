const { z } = require("zod");

const createRecordSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be a positive number")
    .or(z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) throw new Error("Amount must be a positive number");
      return num;
    })),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().uuid("Invalid category ID"),
  date: z.string().datetime({ offset: true }).or(z.string().datetime()),
  notes: z.string().max(1000).optional().nullable(),
});

const updateRecordSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be a positive number")
    .or(z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) throw new Error("Amount must be a positive number");
      return num;
    }))
    .optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().uuid("Invalid category ID").optional(),
  date: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

module.exports = { createRecordSchema, updateRecordSchema };
