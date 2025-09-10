const express = require("express");
const router = express.Router();
const controller = require("../controller/user_controller");
const { checkLogin } = require("../../middleware/check_login");

// API lấy thống tin người dùng
router.get("/me", checkLogin, async (req, res, next) => {
  try {
    res.json(await controller.getDetailInfo(req.payload.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
