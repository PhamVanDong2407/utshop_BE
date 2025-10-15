const express = require("express");
const router = express.Router();
const controller = require("../controller/user_controller");
const { checkLogin } = require("../../middleware/check_login");
const { checkPermission } = require("../../middleware/check_permission");

// API lấy thống tin chi tiết của người dùng đang đăng nhập
router.get("/me", checkLogin, checkPermission, async (req, res, next) => {
  try {
    res.json(await controller.getDetailInfo(req.payload.id));
  } catch (error) {
    next(error);
  }
});

// API cập nhật thông tin chi tiết của người dùng đang đăng nhập
router.put("/me", checkLogin, checkPermission, async (req, res, next) => {
  try {
    res.json(await controller.updateInfo(req.payload.id, req.body));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
