const prisma = require("../../config/db");

function buildDateFilter(startDate, endDate) {
  const filter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    if (endDate.length === 10) end.setUTCHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return Object.keys(filter).length ? filter : undefined;
}

function buildBaseWhere({ startDate, endDate, type, categoryId } = {}) {
  const where = { isDeleted: false };
  const dateFilter = buildDateFilter(startDate, endDate);
  if (dateFilter) where.date = dateFilter;
  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  return where;
}

async function getCategoryMap() {
  const categories = await prisma.category.findMany();
  const map = {};
  categories.forEach((c) => {
    map[c.id] = c.name;
  });
  return map;
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

async function getSummary({ startDate, endDate } = {}) {
  const baseWhere = buildBaseWhere({ startDate, endDate });

  const [incomeResult, expenseResult, totalRecords] = await Promise.all([
    prisma.financialRecord.aggregate({
      where: { ...baseWhere, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.financialRecord.aggregate({
      where: { ...baseWhere, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.financialRecord.count({ where: baseWhere }),
  ]);

  const totalIncome = Number(incomeResult._sum.amount || 0);
  const totalExpenses = Number(expenseResult._sum.amount || 0);

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    totalRecords,
  };
}

async function getCategoryBreakdown({ startDate, endDate, type } = {}) {
  const where = buildBaseWhere({ startDate, endDate, type });

  const results = await prisma.financialRecord.groupBy({
    by: ["categoryId", "type"],
    where,
    _sum: { amount: true },
  });

  const categoryMap = await getCategoryMap();

  return results.map((r) => ({
    categoryId: r.categoryId,
    categoryName: categoryMap[r.categoryId] || "Unknown",
    type: r.type,
    total: Number(r._sum.amount || 0),
  }));
}

async function getMonthlyTrends(year) {
  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

  const records = await prisma.financialRecord.findMany({
    where: { isDeleted: false, date: { gte: startDate, lte: endDate } },
    select: { amount: true, type: true, date: true },
  });

  const months = [];
  for (let i = 1; i <= 12; i++) {
    months.push({ month: i, income: 0, expense: 0, net: 0 });
  }

  records.forEach((record) => {
    const month = record.date.getUTCMonth();
    const amount = Number(record.amount);
    if (record.type === "INCOME") {
      months[month].income += amount;
    } else {
      months[month].expense += amount;
    }
    months[month].net = months[month].income - months[month].expense;
  });

  return months;
}

async function getRecentActivity(limit = 10) {
  return prisma.financialRecord.findMany({
    where: { isDeleted: false },
    include: {
      category: true,
      createdBy: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getIncomeVsExpenseTrend({ startDate, endDate, granularity = "monthly" } = {}) {
  const where = buildBaseWhere({ startDate, endDate });

  const records = await prisma.financialRecord.findMany({
    where,
    select: { amount: true, type: true, date: true },
    orderBy: { date: "asc" },
  });

  const buckets = {};

  records.forEach((r) => {
    let key;
    const d = r.date;
    if (granularity === "daily") {
      key = toISODate(d);
    } else if (granularity === "weekly") {
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      key = toISODate(monday);
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!buckets[key]) buckets[key] = { period: key, income: 0, expense: 0, net: 0 };
    const amt = Number(r.amount);
    if (r.type === "INCOME") {
      buckets[key].income += amt;
    } else {
      buckets[key].expense += amt;
    }
    buckets[key].net = buckets[key].income - buckets[key].expense;
  });

  return Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
}

async function getTopCategories({ limit = 5, type, startDate, endDate } = {}) {
  const where = buildBaseWhere({ startDate, endDate, type });

  const results = await prisma.financialRecord.groupBy({
    by: ["categoryId"],
    where,
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });

  const categoryMap = await getCategoryMap();

  return results.map((r, i) => ({
    rank: i + 1,
    categoryId: r.categoryId,
    categoryName: categoryMap[r.categoryId] || "Unknown",
    total: Number(r._sum.amount || 0),
    count: r._count.id,
  }));
}

async function getCategoryTrends({ year, type } = {}) {
  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

  const where = buildBaseWhere({ startDate, endDate, type });

  const records = await prisma.financialRecord.findMany({
    where,
    select: { amount: true, type: true, date: true, categoryId: true },
  });

  const categoryMap = await getCategoryMap();

  const catData = {};

  records.forEach((r) => {
    const cid = r.categoryId;
    if (!catData[cid]) {
      catData[cid] = {
        categoryId: cid,
        categoryName: categoryMap[cid] || "Unknown",
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          total: 0,
        })),
      };
    }
    const month = r.date.getUTCMonth();
    catData[cid].months[month].total += Number(r.amount);
  });

  return Object.values(catData);
}

async function getDailyCashflow({ startDate, endDate } = {}) {
  const where = buildBaseWhere({ startDate, endDate });

  const records = await prisma.financialRecord.findMany({
    where,
    select: { amount: true, type: true, date: true },
    orderBy: { date: "asc" },
  });

  const dailyMap = {};

  records.forEach((r) => {
    const key = toISODate(r.date);
    if (!dailyMap[key]) dailyMap[key] = { date: key, income: 0, expense: 0 };
    const amt = Number(r.amount);
    if (r.type === "INCOME") {
      dailyMap[key].income += amt;
    } else {
      dailyMap[key].expense += amt;
    }
  });

  const days = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  let runningBalance = 0;
  return days.map((d) => {
    const net = d.income - d.expense;
    runningBalance += net;
    return {
      date: d.date,
      income: d.income,
      expense: d.expense,
      net,
      cumulativeBalance: runningBalance,
    };
  });
}

async function getYearComparison(year1, year2) {
  const [data1, data2] = await Promise.all([
    getMonthlyTrends(year1),
    getMonthlyTrends(year2),
  ]);

  return data1.map((m, i) => ({
    month: m.month,
    [year1]: { income: m.income, expense: m.expense, net: m.net },
    [year2]: { income: data2[i].income, expense: data2[i].expense, net: data2[i].net },
  }));
}

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getRecentActivity,
  getIncomeVsExpenseTrend,
  getTopCategories,
  getCategoryTrends,
  getDailyCashflow,
  getYearComparison,
};
