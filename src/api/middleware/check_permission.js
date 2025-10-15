// middleware/check_permission.js
const db = require("../utils/database");

// Middleware này không cần tham số nữa, nó chỉ làm một việc là kiểm tra admin
const checkPermission = async (req, res, next) => {
  try {
    const userId = req.payload.id;

    const [rows] = await db.execute(
      "SELECT permission_id FROM user WHERE uuid = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "Không tìm thấy thông tin người dùng.",
      });
    }

    const userPermissionId = rows[0].permission_id;

    // SỬA LOGIC KIỂM TRA TẠI ĐÂY
    // Nếu permission_id không phải là 2, từ chối truy cập
    if (userPermissionId !== 2) {
      return res.status(403).json({
        code: 403,
        message: "Bạn không có quyền truy cập vào tài nguyên này!",
      });
    }

    // Nếu là admin (permission_id = 2), cho phép đi tiếp
    next();
  } catch (error) {
    console.error("checkAdminPermission error:", error);
    next(error);
  }
};

module.exports = {
  checkPermission, // Xuất ra với tên mới
};