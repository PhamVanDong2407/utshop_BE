const db = require("../utils/database");
const { verifyAccessToken } = require("../utils/token");

const checkLogin = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({
      code: 401,
      message: "Bạn chưa đăng nhập!",
    });
  }

  try {
    // Lấy token từ header
    const token = req.headers.authorization.split(" ")[1];

    // Verify token => lấy payload
    const payload = await verifyAccessToken(token);
    req.payload = payload;

    // Query DB: lấy token lưu & trạng thái user
    const [token_res] = await db.execute(
      "SELECT access_token FROM token WHERE user_id = ? LIMIT 1",
      [payload.id]
    );

    const [user_res] = await db.execute(
      "SELECT status FROM user WHERE uuid = ? LIMIT 1",
      [payload.id]
    );

    // Check user tồn tại
    if (!user_res) {
      return res
        .status(404)
        .json({ code: 404, message: "Không tìm thấy user!" });
    }

    // Check user bị khóa
    if (user_res.status === 0) {
      return res
        .status(406)
        .json({ code: 406, message: "Tài khoản đã bị khóa!" });
    }

    // Check token trùng với DB (chống login nơi khác)
    if (!token_res || token_res.access_token !== token) {
      return res.status(406).json({
        code: 406,
        message: "Tài khoản này hiện đang được đăng nhập ở nơi khác!",
      });
    }

    next();
  } catch (error) {
    console.error("checkLogin error:", error);
    return res.status(403).json({
      code: 403,
      message: "Token không hợp lệ hoặc đã hết hạn!",
    });
  }
};

module.exports = {
  checkLogin,
};
