const express = require("express");
const router = express.Router();

router.use("/auth", require("./routes/auth"));
router.use("/forgot_password", require("./routes/forgot_password"));
router.use("/user", require("./routes/user"));
router.use("/file", require("./routes/file"));
router.use("/category", require("./routes/Category/category"));
router.use("/product", require("./routes/Product/product"));
router.use("/voucher", require("./routes/Voucher/voucher"));
router.use("/banner", require("./routes/Banner/banner"));
router.use("/wishlist", require("./routes/Wishlist/wishlist"));
router.use("/delivery_address", require("./routes/DeliveryAddress/delivery_address"));
router.use("/cart", require("./routes/Cart/cart"));
router.use("/order", require("./routes/Order/order"));
router.use("/reveune", require("./routes/Reveune/reveune"));

module.exports = router;
