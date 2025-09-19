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
        user.username,
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
      username: user.username ?? null,
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
module.exports = { getDetailInfo };
