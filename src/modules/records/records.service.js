const prisma = require("../../config/db");
const AppError = require("../../utils/AppError");

const RECORD_INCLUDE = {
  category: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
};

async function listRecords({ page, limit = 10, cursor, type, categoryId, startDate, endDate }) {
  const where = { isDeleted: false };

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (cursor) {
    const findArgs = {
      where,
      include: RECORD_INCLUDE,
      take: limit + 1,
      cursor: { id: cursor },
      skip: 1,
      orderBy: { date: "desc" },
    };

    const records = await prisma.financialRecord.findMany(findArgs);
    const hasNext = records.length > limit;
    if (hasNext) records.pop();

    return {
      records,
      pagination: {
        limit,
        nextCursor: hasNext ? records[records.length - 1].id : null,
        hasNext,
      },
    };
  }

  const pageNum = page || 1;
  const skip = (pageNum - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      include: RECORD_INCLUDE,
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return {
    records,
    pagination: {
      page: pageNum,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      nextCursor: records.length ? records[records.length - 1].id : null,
    },
  };
}

async function getRecordById(id) {
  const record = await prisma.financialRecord.findFirst({
    where: { id, isDeleted: false },
    include: RECORD_INCLUDE,
  });

  if (!record) {
    throw new AppError(404, "Record not found");
  }

  return record;
}

async function createRecord(data, userId) {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) {
    throw new AppError(404, "Category not found");
  }

  const record = await prisma.financialRecord.create({
    data: {
      amount: data.amount,
      type: data.type,
      categoryId: data.categoryId,
      date: new Date(data.date),
      notes: data.notes || null,
      createdById: userId,
    },
    include: RECORD_INCLUDE,
  });

  return record;
}

async function updateRecord(id, data) {
  const record = await prisma.financialRecord.findFirst({
    where: { id, isDeleted: false },
  });

  if (!record) {
    throw new AppError(404, "Record not found");
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new AppError(404, "Category not found");
    }
  }

  const updateData = { ...data };
  if (updateData.date) updateData.date = new Date(updateData.date);

  const updated = await prisma.financialRecord.update({
    where: { id },
    data: updateData,
    include: RECORD_INCLUDE,
  });

  return updated;
}

async function deleteRecord(id) {
  const record = await prisma.financialRecord.findFirst({
    where: { id, isDeleted: false },
  });

  if (!record) {
    throw new AppError(404, "Record not found");
  }

  await prisma.financialRecord.update({
    where: { id },
    data: { isDeleted: true },
  });

  return true;
}

module.exports = { listRecords, getRecordById, createRecord, updateRecord, deleteRecord };
