const db = require("../../utils/database");

async function getDetailInfo(id) {
  try {
    if (!id || typeof id !== "string") {
      const error = new Error("ID người dùng không hợp lệ!");
      error.statusCode = 400;
      throw error;
    }

    const [rows] = await db.execute(
      `
      SELECT
        user.uuid,
        user.name,
        user.avatar,
        user.gender,
        user.birth_day,
        user.phone,
        user.email,
        user.province,
        user.district,
        user.address,
        user.created_at,
        user.updated_at,
        user.status,
        permission.uuid AS p_uuid,
        permission.name AS p_name
      FROM
        user
      LEFT JOIN permission ON permission.uuid = user.permission_id
      WHERE
        user.uuid = ?
      `,
      [id]
    );

    if (!rows || (Array.isArray(rows) && rows.length === 0)) {
      const error = new Error("Không tìm thấy người dùng!");
      error.statusCode = 404;
      throw error;
    }

    const user = Array.isArray(rows) ? rows[0] : rows;

    const data = {
      uuid: user.uuid ?? null,
      name: user.name ?? null,
      avatar: user.avatar ?? null,
      gender: user.gender ?? null,
      birth_day: user.birth_day ?? null,
      phone: user.phone ?? null,
      email: user.email ?? null,
      province: user.province ?? null,
      district: user.district ?? null,
      address: user.address ?? null,
      created_at: user.created_at ?? null,
      updated_at: user.updated_at ?? null,
      status: user.status ?? null,
      permission: {
        uuid: user.p_uuid ?? null,
        name: user.p_name ?? null,
      },
    };

    return {
      code: 200,
      message: "Lấy thông tin người dùng thành công!",
      data: data,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error);
    const err = new Error(
      error.message || "Lỗi máy chủ, vui lòng thử lại sau!"
    );
    err.statusCode = error.statusCode || 500;
    throw err;
  }
}

async function updateInfo(uuid, body) {
  try {
    if (!uuid || typeof uuid !== "string") {
      const error = new Error("ID người dùng không hợp lệ!");
      error.statusCode = 400;
      throw error;
    }

    if (
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim() === ""
    ) {
      const error = new Error("Vui lòng nhập tên người dùng!");
      error.statusCode = 400;
      throw error;
    }

    if (
      !body.phone ||
      typeof body.phone !== "string" ||
      body.phone.trim() === ""
    ) {
      const error = new Error("Vui lòng nhập số điện thoại!");
      error.statusCode = 400;
      throw error;
    }

    if (
      !body.email ||
      typeof body.email !== "string" ||
      body.email.trim() === ""
    ) {
      const error = new Error("Vui lòng nhập email!");
      error.statusCode = 400;
      throw error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      const error = new Error("Email không hợp lệ!");
      error.statusCode = 400;
      throw error;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(body.phone)) {
      const error = new Error("Số điện thoại không hợp lệ!");
      error.statusCode = 400;
      throw error;
    }

    const updateFields = {
      avatar: body.avatar || null,
      name: body.name,
      gender: body.gender || null,
      birth_day: body.birth_day || null,
      phone: body.phone,
      email: body.email,
      province: body.province || null,
      district: body.district || null,
      address: body.address || null,
    };

    const [result] = await db.execute(
      `
      UPDATE user
      SET
        avatar = ?,
        name = ?,
        gender = ?,
        birth_day = ?,
        phone = ?,
        email = ?,
        province = ?,
        district = ?,
        address = ?
      WHERE uuid = ?
      `,
      [
        updateFields.avatar,
        updateFields.name,
        updateFields.gender,
        updateFields.birth_day,
        updateFields.phone,
        updateFields.email,
        updateFields.province,
        updateFields.district,
        updateFields.address,
        uuid,
      ]
    );

    if (result.affectedRows === 0) {
      const error = new Error("Không tìm thấy người dùng để cập nhật!");
      error.statusCode = 404;
      throw error;
    }

    return {
      code: 200,
      message: "Cập nhật thông tin người dùng thành công!",
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật thông tin người dùng:", error);
    const err = new Error(
      error.message || "Lỗi máy chủ, vui lòng thử lại sau!"
    );
    err.statusCode = error.statusCode || 500;
    throw err;
  }
}
module.exports = { getDetailInfo, updateInfo };
