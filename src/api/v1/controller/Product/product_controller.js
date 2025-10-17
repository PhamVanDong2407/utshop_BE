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
        \`category_id\`,
        \`name\`,
        \`description\`,
        \`price\`,
        \`stock\`,
        \`is_favourite\`,
        \`is_popular\`
      FROM
        \`products\`
      WHERE 
        \`name\` LIKE '%${keyword}%' OR \`description\` LIKE '%${keyword}%'
      ORDER BY
        \`created_at\` DESC
      LIMIT ${offset}, ${limit}
      `,
      ` 
      SELECT count(*) AS total FROM \`products\`
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
              category_id: item.category_id,
              name: item.name,
              description: item.description,
              price: item.price,
              stock: item.stock,
              is_favourite: item.is_favourite,
              is_popular: item.is_popular,
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

async function detail(id) {
  try {
    const [result] = await db.execute(
      `SELECT * FROM
        \`products\`
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
      `INSERT INTO \`products\`(
        \`uuid\`,
        \`category_id\`,
        \`name\`,
        \`description\`,
        \`price\`,
        \`stock\`,
        \`is_favourite\`,
        \`is_popular\`
      )
      VALUES(
        uuid(),
        ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        body.category_id,
        body.name,
        body.description,
        body.price,
        body.stock,
        body.is_favourite,
        body.is_popular,
      ]
    );

    return {
      code: 200,
      message: "Đã thêm sản phẩm thành công!",
    };
  } catch (error) {
    throw error;
  }
}

async function update(id, body) {
  try {
    db.execute(
      `UPDATE \`products\`
      SET
        \`category_id\` = ?,
        \`name\` = ?,
        \`description\` = ?,
        \`price\` = ?,
        \`stock\` = ?,
        \`is_favourite\` = ?,
        \`is_popular\` = ?
      WHERE
        \`uuid\` = ?`,
      [
        body.category_id,
        body.name,
        body.description,
        body.price,
        body.stock,
        body.is_favourite,
        body.is_popular,
        id,
      ]
    );

    return {
      code: 200,
      message: "Đã cập nhật sản phẩm thành công!",
    };
  } catch (error) {
    throw error;
  }
}

async function remove(id) {
  try {
    db.execute(
      `DELETE FROM \`products\`
      WHERE \`uuid\` = ?`,
      [id]
    );

    return {
      code: 200,
      message: "Đã xóa sản phẩm thành công!",
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
};
