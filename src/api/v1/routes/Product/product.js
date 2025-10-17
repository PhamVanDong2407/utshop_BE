const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../../controller/Product/product_controller");
const { checkLogin } = require("../../../middleware/check_login");
// const { checkPermission } = require("../../../middleware/check_permission");

// API lấy danh sách sản phẩm
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
        state : req.query.state,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// chi tiet san pham
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

// them san pham
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

// sua san pham
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

// xoa san pham
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
