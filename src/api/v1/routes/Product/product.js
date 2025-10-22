const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../../controller/Product/product_controller");
const { checkLogin } = require("../../../middleware/check_login");
// const { checkPermission } = require("../../../middleware/check_permission");

const upload = multer({ dest: "src/resources" });

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

module.exports = router;
