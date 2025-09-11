const express = require("express");
const router = express.Router();
const controller = require("../controller/forgot_password_controller");

// API yêu cầu gửi OTP qua email
router.post("/forgot-password", async (req, res, next) => {
  try {
    res.json(await controller.forgotPassword(req.body));
  } catch (error) {
    next(error);
  }
});

// API xác minh OTP cho việc quên mật khẩu
router.post("/verify-forgot-password-otp", async (req, res, next) => {
  try {
    res.json(await controller.verifyForgotPasswordOtp(req.body));
  } catch (error) {
    next(error);
  }
});

// API đặt lại mật khẩu
router.post("/reset-password", async (req, res, next) => {
  try {
    res.json(await controller.resetPassword(req.body));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
