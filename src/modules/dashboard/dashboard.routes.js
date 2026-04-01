const { Router } = require("express");
const dashboardController = require("./dashboard.controller");
const { authenticate } = require("../../middleware/auth");

const router = Router();

router.use(authenticate);

router.get("/summary", dashboardController.getSummary);
router.get("/category-breakdown", dashboardController.getCategoryBreakdown);
router.get("/monthly-trends", dashboardController.getMonthlyTrends);
router.get("/recent-activity", dashboardController.getRecentActivity);
router.get("/income-vs-expense", dashboardController.getIncomeVsExpenseTrend);
router.get("/top-categories", dashboardController.getTopCategories);
router.get("/category-trends", dashboardController.getCategoryTrends);
router.get("/daily-cashflow", dashboardController.getDailyCashflow);
router.get("/year-comparison", dashboardController.getYearComparison);

module.exports = router;
