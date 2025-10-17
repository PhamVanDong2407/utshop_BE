const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controller/file_controller");
const { checkLogin } = require("../../middleware/check_login");
const { checkPermission } = require("../../middleware/check_permission");

const upload = multer({ dest: "src/resources" });

// API tạo file
router.post(
  "/single-upload",
  checkLogin,
  checkPermission,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ code: 400, message: "No file uploaded" });
      }
      const result = await controller.uploadFile(req.file);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// API tạo nhiều file
router.post(
  "/multiple-upload",
  checkLogin,
  upload.array("files", 10),
  async (req, res, next) => {
    try {
      res.json(await controller.uploadMultipleFile(req.files));
    } catch (error) {
      next(error);
    }
  }
);

// API xóa file
router.delete("/:id", checkLogin, checkPermission, async (req, res, next) => {
  try {
    res.json(await controller.deleteFile(req.params.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
