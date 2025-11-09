// api/v1/routes/Wishlist/wishlist_router.js
const express = require("express");
const router = express.Router();
const controller = require("../../controller/Wishlist/wishlist_controller");
const { checkLogin } = require("../../../middleware/check_login");

router.get(
  "/",
  checkLogin,
  async (req, res, next) => {
    try {
      const result = await controller.list({
        userId: req.user.uuid, 
        page: req.query.page,
        limit: req.query.limit,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/", checkLogin, async (req, res, next) => {
  try {
    const userId = req.user.uuid;
    const { product_uuid } = req.body;

    if (!product_uuid) {
      return res.status(400).json({ code: 400, message: "Thiếu product_uuid" });
    }

    const result = await controller.add(userId, product_uuid);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:product_uuid", checkLogin, async (req, res, next) => {
  try {
    const userId = req.user.uuid;
    const { product_uuid } = req.params;

    const result = await controller.remove(userId, product_uuid);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
