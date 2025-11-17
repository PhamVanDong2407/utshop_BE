
const express = require("express");
const router = express.Router();
const controller = require("../../controller/Dashboard/dashboard_controller");
const { checkLogin } = require("../../../middleware/check_login");

router.get("/stats", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.getDashboardStats(req.user);
    res.status(result.code || 500).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;