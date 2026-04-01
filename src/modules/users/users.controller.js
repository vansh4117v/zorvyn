const usersService = require("./users.service");
const { success } = require("../../utils/response");

async function listUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = await usersService.listUsers({ page, limit });
    return success(res, 200, "Users retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    return success(res, 200, "User retrieved", user);
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    return success(res, 200, "User updated", user);
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await usersService.deleteUser(req.params.id, req.user.id);
    return success(res, 200, "User deleted");
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUserById, updateUser, deleteUser };
