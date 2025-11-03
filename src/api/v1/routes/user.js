const express = require("express");
const router = express.Router();
const controller = require("../controller/user_controller");
const { checkLogin } = require("../../middleware/check_login");
const { checkPermission } = require("../../middleware/check_permission");

// API lấy thống tin chi tiết của người dùng đang đăng nhập
router.get("/me", checkLogin, async (req, res, next) => {
  try {
    res.json(await controller.getDetailInfo(req.payload.id));
  } catch (error) {
    next(error);
  }
});

// API cập nhật thông tin chi tiết của người dùng đang đăng nhập
router.put("/me", checkLogin, async (req, res, next) => {
  try {
    res.json(await controller.updateInfo(req.payload.id, req.body));
  } catch (error) {
    next(error);
  }
});

// API Quản lý người dùng - Admin

// API Lấy danh sách người dùng - Admin
router.get(
  "/",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.list({
        page: req.query.page,
        limit: req.query.limit,
        keyword: req.query.keyword,
        state: req.query.state,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// API Xóa người dùng - Admin
router.delete(
  "/:id",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.remove(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// API Đổi vai trò người dùng - Admin
router.put(
  "/:id/permission",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.changePermission(
        req.params.id,
        req.body.permission_id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// API Vô hiệu hóa người dùng - Admin
router.put(
  "/:id/status",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.changeStatus(
        req.params.id,
        req.body.status
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// API Kích hoạt người dùng - Admin
router.put(
  "/:id/active",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.active(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
