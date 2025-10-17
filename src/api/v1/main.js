const express = require("express");
const router = express.Router();

router.use("/auth", require("./routes/auth"));
router.use("/forgot_password", require("./routes/forgot_password"));
router.use("/user", require("./routes/user"));
router.use("/file", require("./routes/file"));
router.use("/category", require("./routes/Category/category"));


module.exports = router;
