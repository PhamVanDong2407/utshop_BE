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

// ADMIN LẤY DANH SÁCH TẤT CẢ ĐƠN HÀNG
router.get("/admin-list", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.getAllOrders(req.user);
    res.status(result.code || 500).json(result);
  } catch (error) {
    next(error);
  }
});

// ADMIN LẤY CHI TIẾT ĐƠN HÀNG
router.get("/admin/:uuid", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.getOrderDetaiAdmin(
      req.user,
      req.params.uuid
    );
    res.status(result.code || 500).json(result);
  } catch (error) {
    next(error);
  }
});

// ADMIN CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
router.post("/admin/status/:uuid", checkLogin, async (req, res, next) => {
  try {
    const { new_status } = req.body;
    if (!new_status) {
      return res.status(400).json({ code: 400, message: "Thiếu new_status" });
    }
    const result = await controller.updateOrderStatus(
      req.user,
      req.params.uuid,
      new_status
    );
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

// Mua lại đơn hàng
router.post("/re-order", checkLogin, async (req, res, next) => {
  try {
    const { order_uuid } = req.body; // App sẽ gửi order_uuid trong body
    if (!order_uuid) {
      return res.status(400).json({ code: 400, message: "Thiếu order_uuid" });
    }
    const result = await controller.reOrder(req.user, order_uuid);
    res.status(result.code || 500).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
