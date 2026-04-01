const dashboardService = require("./dashboard.service");
const { success } = require("../../utils/response");

async function getSummary(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await dashboardService.getSummary({ startDate, endDate });
    return success(res, 200, "Dashboard summary retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getCategoryBreakdown(req, res, next) {
  try {
    const { startDate, endDate, type } = req.query;
    const data = await dashboardService.getCategoryBreakdown({ startDate, endDate, type });
    return success(res, 200, "Category breakdown retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getMonthlyTrends(req, res, next) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await dashboardService.getMonthlyTrends(year);
    return success(res, 200, "Monthly trends retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getRecentActivity(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await dashboardService.getRecentActivity(limit);
    return success(res, 200, "Recent activity retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getIncomeVsExpenseTrend(req, res, next) {
  try {
    const { startDate, endDate, granularity } = req.query;
    const data = await dashboardService.getIncomeVsExpenseTrend({ startDate, endDate, granularity });
    return success(res, 200, "Income vs expense trend retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getTopCategories(req, res, next) {
  try {
    const { type, startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit) || 5;
    const data = await dashboardService.getTopCategories({ limit, type, startDate, endDate });
    return success(res, 200, "Top categories retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getCategoryTrends(req, res, next) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const { type } = req.query;
    const data = await dashboardService.getCategoryTrends({ year, type });
    return success(res, 200, "Category trends retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getDailyCashflow(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await dashboardService.getDailyCashflow({ startDate, endDate });
    return success(res, 200, "Daily cashflow retrieved", data);
  } catch (err) {
    next(err);
  }
}

async function getYearComparison(req, res, next) {
  try {
    const year1 = parseInt(req.query.year1) || new Date().getFullYear() - 1;
    const year2 = parseInt(req.query.year2) || new Date().getFullYear();
    const data = await dashboardService.getYearComparison(year1, year2);
    return success(res, 200, "Year comparison retrieved", data);
  } catch (err) {
    next(err);
  }
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
