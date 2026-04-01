const categoriesService = require("./categories.service");
const { success } = require("../../utils/response");

async function listCategories(req, res, next) {
  try {
    const categories = await categoriesService.listCategories();
    return success(res, 200, "Categories retrieved", categories);
  } catch (err) {
    next(err);
  }
}

async function getCategoryById(req, res, next) {
  try {
    const category = await categoriesService.getCategoryById(req.params.id);
    return success(res, 200, "Category retrieved", category);
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await categoriesService.createCategory(req.body);
    return success(res, 201, "Category created", category);
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await categoriesService.updateCategory(
      req.params.id,
      req.body
    );
    return success(res, 200, "Category updated", category);
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await categoriesService.deleteCategory(req.params.id);
    return success(res, 200, "Category deleted");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
