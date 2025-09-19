const express = require("express");
const router = express.Router();
const controller = require("../controller/user_controller");
const { checkLogin } = require("../../middleware/check_login");

// API lấy thống tin chi tiết của người dùng đang đăng nhập 
router.get("/me", checkLogin, async (req, res, next) => {
  try {
    res.json(await controller.getDetailInfo(req.payload.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
