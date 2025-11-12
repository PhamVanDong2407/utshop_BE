const express = require("express");
const router = express.Router();
const controller = require("../../controller/Cart/cart_controller");
const { checkLogin } = require("../../../middleware/check_login");


// LẤY DANH SÁCH GIỎ HÀNG
router.get("/", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.getCart(req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// THÊM VÀO GIỎ HÀNG (HOẶC CỘNG DỒN NẾU ĐÃ CÓ)
router.post("/", checkLogin, async (req, res, next) => {
  try {
    const { variant_uuid, quantity = 1 } = req.body;
    if (!variant_uuid) {
      return res
        .status(400)
        .json({ code: 400, message: "Thiếu variant_uuid!" });
    }
    const result = await controller.addToCart(
      req.user,
      variant_uuid,
      parseInt(quantity)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// XÓA SẢN PHẨM KHỎI GIỎ
router.delete("/:variant_uuid", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.removeFromCart(
      req.user,
      req.params.variant_uuid
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
