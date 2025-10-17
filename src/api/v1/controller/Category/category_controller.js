// api/v1/controller/Admin/product_admin_controller.js
const db = require("../../../utils/database");
const offsetUtils = require("../../../utils/offset");

async function list({ page = 1, limit = 10, keyword = "", state = 1 }) {
  try {
    const offset = offsetUtils.getOffset(page, limit);

    const result = await db.queryMultiple([
      `
      SELECT
        \`uuid\`,
        \`name\`,
        \`description\`
      FROM
        \`categories\`
      WHERE
        \`name\` LIKE '%${keyword}%'
      ORDER BY
        \`created_at\` DESC
      LIMIT ${offset}, ${limit}
      `,
      `
      SELECT count(*) AS total FROM \`categories\`
      WHERE \`name\` LIKE '%${keyword}%'
      `,
    ]);

    const totalCount = result[1][0].total;
    const data =
      result[0] == null
        ? []
        : result[0].map((item) => {
            return {
              uuid: item.uuid,
              name: item.name,
              description: item.description,
            };
          });

    return {
      code: 200,
      data: data,
      pagination: {
        totalPage: Math.ceil(totalCount / limit),
        totalCount,
      },
    };
  } catch (error) {
    throw error;
  }
}

async function dropdown() {
  try {
    const result = await db.execute(
      `SELECT * FROM
            \`categories\``
    );

    return {
      code: 200,
      data: result,
    };
  } catch (error) {
    throw error;
  }
}

async function detail(id) {
  try {
    const [result] = await db.execute(
      `SELECT * FROM
            \`categories\`
        WHERE
            \`uuid\` = ?`,
      [id]
    );

    return {
      code: 200,
      data: result,
    };
  } catch (error) {
    throw error;
  }
}

async function create(body) {
  try {
    db.execute(
      `INSERT INTO \`categories\`(
        \`uuid\`,
        \`name\`,
        \`description\`
    )
    VALUES(
        uuid(),
        ?,
        ?
    )`,
      [body.name, body.description]
    );

    return {
      code: 200,
      message: "Đã thêm danh mục thành công!",
    };
  } catch (error) {
    throw error;
  }
}

async function update(id, body) {
  try {
    db.execute(
      `UPDATE
            \`categories\`
        SET
            \`name\` = ?,
            \`description\` = ?
        WHERE
            \`uuid\` = ?`,
      [body.name, body.description, id]
    );

    return {
      code: 200,
      message: "Đã cập nhật danh mục thành công!",
    };
  } catch (error) {
    throw error;
  }
}

async function remove(id) {
  try {
    db.execute(
      `DELETE FROM
            \`categories\`
        WHERE
            \`uuid\` = ?`,
      [id]
    );

    return {
      code: 200,
      message: "Đã xóa danh mục thành công!",
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  list,
  dropdown,
  detail,
  create,
  update,
  remove,
};
