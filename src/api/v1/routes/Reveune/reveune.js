// TẠO FILE MỚI NÀY: routes/Revenue/revenue.js

const express = require("express");
const router = express.Router();
const controller = require("../../../v1/controller/Reveune/reveune_controller");
const { checkLogin } = require("../../..//middleware/check_login");

router.get("/", checkLogin, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query; // Mặc định là 'month'
    const result = await controller.getRevenueStats(req.user, period);
    res.status(result.code || 500).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;