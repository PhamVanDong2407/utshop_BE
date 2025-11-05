const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const controller = require("../../controller/Banner/banner_controller");
const { checkLogin } = require("../../../middleware/check_login");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "src/resources");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Chỉ cho phép file ảnh (jpeg, jpg, png, gif, webp)!"));
  },
});

// API: Lấy danh sách banner
router.get("/", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.list();
    res.status(result.code || 200).json(result);
  } catch (error) {
    next(error);
  }
});

// API: Thêm banner mới
router.post("/", checkLogin, upload.single("image"), async (req, res, next) => {
  try {
    const result = await controller.create(req);
    res.status(result.code || 200).json(result);
  } catch (error) {
    next(error);
  }
});

// API: Xóa banner
router.delete("/:id", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.remove(req.params.id);
    res.status(result.code || 200).json(result);
  } catch (error) {
    next(error);
  }
});

// API: Cập nhật trạng thái banner (ẩn/hiện)
router.put("/status", checkLogin, async (req, res, next) => {
  try {
    const { uuid, is_active } = req.body;

    if (!uuid || ![0, 1].includes(is_active)) {
      return res.status(400).json({
        code: 400,
        message: "Thiếu uuid hoặc is_active không hợp lệ (0/1)",
      });
    }

    const result = await controller.updateStatus(uuid, is_active);
    res.status(result.code).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;