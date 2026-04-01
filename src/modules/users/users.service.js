const prisma = require("../../config/db");
const AppError = require("../../utils/AppError");

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

async function listUsers({ page = 1, limit = 10 }) {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: USER_SELECT,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
}

async function updateUser(id, data) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: USER_SELECT,
  });

  return updated;
}

async function deleteUser(id, requestingUserId) {
  if (id === requestingUserId) {
    throw new AppError(403, "An admin cannot delete their own account");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  await prisma.user.delete({ where: { id } });
  return true;
}

module.exports = { listUsers, getUserById, updateUser, deleteUser };
