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

// LẤY LỊCH SỬ ĐƠN HÀNG
router.get("/", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.getOrderHistory(req.user);
    res.status(result.code || 500).json(result);
  } catch (error) {
    next(error);
  }
});

// LẤY CHI TIẾT ĐƠN HÀNG
router.get("/:uuid", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.getOrderDetail(req.user, req.params.uuid);
    res.status(result.code || 500).json(result);
  } catch (error) {
    next(error);
  }
});

// HỦY ĐƠN HÀNG
router.post("/cancel/:uuid", checkLogin, async (req, res, next) => {
    try {
      // Dùng req.params.uuid để lấy uuid từ /:uuid
      const result = await controller.cancelOrder(req.user, req.params.uuid);
      res.status(result.code || 500).json(result);
    } catch (error) {
      next(error);
    }
  });

module.exports = router;
