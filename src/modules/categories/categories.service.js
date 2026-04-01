const prisma = require("../../config/db");
const AppError = require("../../utils/AppError");

async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

async function getCategoryById(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError(404, "Category not found");
  }
  return category;
}

async function createCategory(data) {
  return prisma.category.create({ data });
}

async function updateCategory(id, data) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError(404, "Category not found");
  }

  return prisma.category.update({ where: { id }, data });
}

async function deleteCategory(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError(404, "Category not found");
  }

  const recordCount = await prisma.financialRecord.count({
    where: { categoryId: id },
  });

  if (recordCount > 0) {
    throw new AppError(
      409,
      "Cannot delete category with associated financial records"
    );
  }

  await prisma.category.delete({ where: { id } });
  return true;
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
