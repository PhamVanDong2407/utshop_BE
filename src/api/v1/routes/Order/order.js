const express = require("express");
const router = express.Router();
const controller = require("../../controller/Order/order_controller");
const { checkLogin } = require("../../../middleware/check_login");

// TẠO ĐƠN HÀNG MỚI
router.post("/create", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.createOrder(req.user, req.body);
    res.status(result.code || 500).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
