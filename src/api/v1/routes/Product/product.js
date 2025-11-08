const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../../controller/Product/product_controller");
const { checkLogin } = require("../../../middleware/check_login");
// const { checkPermission } = require("../../../middleware/check_permission");

const upload = multer({ dest: "src/resources" });

// ADMIN

// API lấy danh sách sản phẩm
router.get("/", checkLogin, async (req, res, next) => {
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
});

// API lấy chi tiết sản phẩm
router.get("/:id", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.detail(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// API tạo sản phẩm
router.post("/", checkLogin, async (req, res) => {
  try {
    const result = await controller.create(req.body);
    res.status(result.code || 200).json(result);
  } catch (error) {
    next(error);
  }
});

// API cập nhật sản phẩm
router.put(
  "/:id",
  checkLogin,
  upload.array("images", 10),
  async (req, res, next) => {
    try {
      const result = await controller.update(
        req.params.id,
        req.body,
        req.files
      );
      res.json(result);
    } catch (error) {
      console.error("Error in PUT /product/:id:", error);
      next(error);
    }
  }
);

// API xóa sản phẩm
router.delete("/:id", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.remove(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// USER

// ==================== LẤY DANH SÁCH SẢN PHẨM PHỔ BIẾN (USER) ====================
router.get("/user/popular", checkLogin, async (req, res, next) => {
  try {
    const user_uuid = req.user.uuid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await controller.listForUser({
      user_uuid,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error("❌ Error in /user/list:", error);
    next(error);
  }
});

// ==================== LẤY DANH SÁCH TẤT CẢ SẢN PHẨM (USER) ====================
router.get("/user/list", checkLogin, async (req, res, next) => {
  try {
    const user_uuid = req.user.uuid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await controller.listAllForUser({
      user_uuid,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==================== LẤY CHI TIẾT SẢN PHẨM (USER) ====================
router.get("/user/detail/:id", checkLogin, async (req, res, next) => {
  try {
    const user_uuid = req.user.uuid;
    const product_uuid = req.params.id;

    if (!product_uuid) {
      return res.json({ code: 400, message: "Thiếu ID sản phẩm." });
    }

    const result = await controller.detailProductUser({
      product_uuid,
      user_uuid,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
