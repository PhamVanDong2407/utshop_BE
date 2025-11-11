const express = require("express");
const router = express.Router();
const controller = require("../../controller/Voucher/voucher_controller");
const { checkLogin } = require("../../../middleware/check_login");
// const { checkPermission } = require("../../../middleware/check_permission");

// ADMIN

//  lấy danh sách
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

// danh sach dropdown
router.get(
  "/dropdown",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.dropdown();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// USER - Lấy danh sách voucher dành cho user
router.get("/user-list", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.getListForUser(req.user, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// chi tiet
router.get(
  "/:id",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.detail(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// them
router.post(
  "/",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.create(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// sua
router.put(
  "/:id",
  checkLogin,
  //   checkPermission,
  async (req, res, next) => {
    try {
      const result = await controller.update(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// xoa
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

module.exports = router;
