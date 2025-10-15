const express = require("express");
const router = express.Router();
const controller = require("../controller/auth_controller");
const { checkLogin } = require("../../middleware/check_login");
const { checkPermission } = require("../../middleware/check_permission");

// API tạo tài khoản
router.post("/register", async (req, res, next) => {
  try {
    res.json(await controller.register(req.body));
  } catch (error) {
    next(error);
  }
});

// API xác minh OTP cho việc tạo tài khoản
router.post("/verify-otp", async (req, res, next) => {
  try {
    res.json(await controller.verifyOtp(req.body));
  } catch (error) {
    next(error);
  }
});

// API đăng nhập
router.post("/login", async (req, res, next) => {
  try {
    res.json(await controller.login(req.body));
  } catch (error) {
    next(error);
  }
});

// API làm mới token
router.post("/refresh-token", async (req, res, next) => {
  try {
    res.json(await controller.refreshToken(req.body));
  } catch (error) {
    next(error);
  }
});

// API đổi mật khẩu
router.put("/change-password", checkLogin, checkPermission, async (req, res, next) => {
  try {
    res.json(await controller.changePassword(req.payload.id, req.body));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
