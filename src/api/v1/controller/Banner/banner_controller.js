const db = require("../../../utils/database");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs").promises;

// ==================== LẤY DANH SÁCH BANNER =======================
async function list() {
  try {
    const rows = await db.execute(`
      SELECT uuid, image_url, is_active
      FROM banners
      ORDER BY created_at DESC
    `);

    const safeRows = Array.isArray(rows) ? rows : rows ? [rows] : [];

    const data = safeRows.map((item) => ({
      uuid: item.uuid,
      imageUrl: item.image_url,
      isActive: item.is_active === 1,
    }));

    return { code: 200, data };
  } catch (error) {
    console.error("Lỗi lấy danh sách banner:", error);
    return {
      code: 500,
      message: "Lỗi server khi lấy danh sách banner",
    };
  }
}

// ==================== TẠO BANNER MỚI ====================
async function create(req) {
  try {
    let image_url = "";

    if (req.file) {
      image_url = `resources/${req.file.filename}`;
    } else if (req.body.image_url && req.body.image_url.trim()) {
      image_url = req.body.image_url.trim();
    } else {
      return {
        code: 400,
        message: "Vui lòng upload ảnh hoặc nhập đường dẫn ảnh hợp lệ.",
      };
    }

    const uuid = uuidv4();

    await db.execute(
      `INSERT INTO banners (uuid, image_url, is_active) VALUES (?, ?, 1)`,
      [uuid, image_url]
    );

    return {
      code: 201,
      message: "Thêm banner thành công!",
      data: { uuid, image_url, isActive: true },
    };
  } catch (error) {
    console.error("Lỗi tạo banner:", error);
    return {
      code: 500,
      message: `Lỗi server: ${error.message}`,
    };
  }
}

// ==================== XÓA BANNER (XÓA ẢNH LUÔN) ====================
async function remove(uuid) {
  try {
    const result = await db.execute(`DELETE FROM banners WHERE uuid = ?`, [
      uuid,
    ]);

    if (result.affectedRows === 0) {
      return { code: 404, message: "Không tìm thấy banner để xóa." };
    }

    return { code: 200, message: "Xóa banner thành công!" };
  } catch (error) {
    console.error("Lỗi xóa banner:", error);
    return { code: 500, message: "Lỗi server" };
  }
}

// ==================== CẬP NHẬT TRẠNG THÁI BANNER ====================
async function updateStatus(uuid, is_active) {
  try {
    const result = await db.execute(
      `UPDATE banners SET is_active = ? WHERE uuid = ?`,
      [is_active, uuid]
    );

    if (result.affectedRows === 0) {
      return { code: 404, message: "Không tìm thấy banner để cập nhật." };
    }

    return {
      code: 200,
      message: is_active === 1 ? "Đã hiển thị banner!" : "Đã ẩn banner!",
    };
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái banner:", error);
    return { code: 500, message: "Lỗi server" };
  }
}

module.exports = {
  list,
  create,
  remove,
  updateStatus,
};
