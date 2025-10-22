const db = require("../../utils/database");
const offsetUtils = require("../../utils/offset");

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
    if (!body.name || body.name.trim() === "") {
      const error = new Error("Vui lòng nhập tên!");
      error.statusCode = 400;
      throw error;
    }

    if (!body.phone || body.phone.trim() === "") {
      const error = new Error("Vui lòng nhập số điện thoại!");
      error.statusCode = 400;
      throw error;
    }

    let avatar = null;
    const [rows] = await db.execute(
      `SELECT \`avatar\` FROM \`user\` WHERE \`uuid\` = '${uuid}'`
    );

    if (rows && rows.length > 0) {
      avatar = rows[0].avatar;
    }

    await db.execute(`
      UPDATE 
        \`user\`
      SET
        \`avatar\` = ${body.avatar == null ? null : `'${body.avatar}'`},
        \`name\` = '${body.name}',
        \`gender\` = ${body.gender == null ? null : `'${body.gender}'`},
        \`birth_day\` = ${
          body.birth_day == null ? null : `'${body.birth_day}'`
        },
        \`phone\` = '${body.phone}',
        \`email\` = ${body.email == null ? null : `'${body.email}'`},
        \`province\` = ${body.province == null ? null : `'${body.province}'`},
        \`district\` = ${body.district == null ? null : `'${body.district}'`},
        \`address\` = ${body.address == null ? null : `'${body.address}'`}
      WHERE 
        \`uuid\` = '${uuid}'
    `);

    if (avatar != null && avatar !== body.avatar) {
      deleteFile(avatar);
    }

    return {
      code: 200,
      message: "Cập nhật thông tin thành công!",
    };
  } catch (error) {
    console.error("Lỗi updateProfile:", error);
    throw error;
  }
}

// API Quản lý người dùng - Admin

// API Lấy danh sách người dùng - Admin
async function list({ page = 1, limit = 10, keyword = "" }) {
  try {
    const offset = offsetUtils.getOffset(page, limit);

    const result = await db.queryMultiple([
      `
      SELECT
        u.uuid,
        u.permission_id,
        u.name,
        u.email,
        u.phone,
        u.status,
        p.name AS permission_name
      FROM user u
      LEFT JOIN permission p ON p.uuid = u.permission_id
      WHERE
        u.name LIKE '%${keyword}%'
        OR u.email LIKE '%${keyword}%'
        OR u.phone LIKE '%${keyword}%'
      ORDER BY u.created_at DESC
      LIMIT ${offset}, ${limit}
      `,
      `
      SELECT COUNT(*) AS total 
      FROM user 
      WHERE name LIKE '%${keyword}%' 
      OR email LIKE '%${keyword}%' 
      OR phone LIKE '%${keyword}%'
      `,
    ]);

    if (!result || !result[0] || !result[1]) {
      throw new Error("Empty query result from database");
    }

    const totalCount = result[1][0].total || 0;

    const data = result[0].map((item) => ({
      uuid: item.uuid,
      name: item.name,
      email: item.email,
      phone: item.phone,
      status: item.status,
      permission_id: item.permission_id,
      permission_name: item.permission_name,
    }));

    return {
      code: 200,
      data,
      pagination: {
        totalPage: Math.ceil(totalCount / limit),
        totalCount,
      },
    };
  } catch (error) {
    console.error("❌ Error in user list:", error);
    throw error;
  }
}

// API Xóa người dùng - Admin
async function remove(id) {
  try {
    db.execute(
      `DELETE FROM
            \`user\`
        WHERE
            \`uuid\` = ?`,
      [id]
    );

    return {
      code: 200,
      message: "Đã xóa người dùng thành công!",
    };
  } catch (error) {
    throw error;
  }
}

// API Đổi vai trò người dùng - Admin
async function changePermission(id, permissionId) {
  try {
    db.execute(
      `UPDATE
            \`user\`
        SET
            \`permission_id\` = ?
        WHERE
            \`uuid\` = ?`,
      [permissionId, id]
    );

    return {
      code: 200,
      message: "Đã đổi vai trò người dùng!",
    };
  } catch (error) {
    throw error;
  }
}

// API Vô hiệu hóa người dùng - Admin
async function changeStatus(id, status) {
  try {
    db.execute(
      `UPDATE
            \`user\`
        SET
            \`status\` = ?
        WHERE
            \`uuid\` = ?`,
      [status, id]
    );

    return {
      code: 200,
      message: "Đã vô hiệu hóa người dùng!",
    };
  } catch (error) {
    throw error;
  }
}

// API Kích hoạt người dùng - Admin
async function active(id) {
  try {
    db.execute(
      `UPDATE
            \`user\`
        SET
            \`status\` = 1
        WHERE
            \`uuid\` = ?`,
      [id]
    );

    return {
      code: 200,
      message: "Đã kích hoạt người dùng!",
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getDetailInfo,
  updateInfo,
  list,
  remove,
  changePermission,
  changeStatus,
  active,
};
