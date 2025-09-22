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

module.exports = { getDetailInfo, updateInfo };
