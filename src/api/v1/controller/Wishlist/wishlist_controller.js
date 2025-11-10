const db = require("../../../utils/database");
const offsetUtils = require("../../../utils/offset");

async function list({ userId, page = 1, limit = 10 }) {
  try {
    const offset = offsetUtils.getOffset(page, limit);
    const safeOffset = parseInt(offset) || 0;
    const safeLimit = parseInt(limit) || 10;

    const result = await db.queryMultiple([
      `
      SELECT
        p.uuid,
        p.name,
        p.price,
        pi.url AS image_url
      FROM
        user_favorites AS uf
      JOIN
        products AS p ON uf.product_uuid = p.uuid
      LEFT JOIN
        product_images AS pi ON p.uuid = pi.product_uuid AND pi.is_main = 1
      WHERE
        uf.user_uuid = '${userId}'  
      ORDER BY
        uf.created_at DESC
      LIMIT ${safeOffset}, ${safeLimit}
      `,

      `
      SELECT
        count(*) AS total
      FROM
        user_favorites
      WHERE
        user_uuid = '${userId}'
      `,
    ]);

    const totalCount = result[1][0].total;
    const data = result[0] == null ? [] : result[0];

    return {
      code: 200,
      data: data,
      pagination: {
        totalPage: Math.ceil(totalCount / safeLimit),
        totalCount,
      },
    };
  } catch (error) {
    throw error;
  }
}
async function add(userId, productId) {
  try {
    await db.execute(
      `
      INSERT INTO user_favorites (user_uuid, product_uuid)
      VALUES (?, ?)
    `,
      [userId, productId]
    );

    return {
      code: 200,
      message: "Đã thêm vào danh sách yêu thích!",
    };
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return {
        code: 409,
        message: "Sản phẩm đã có trong danh sách yêu thích.",
      };
    }
    throw error;
  }
}

async function remove(userId, productId) {
  try {
    const result = await db.execute(
      `
      DELETE FROM user_favorites
      WHERE user_uuid = ? AND product_uuid = ?
    `,
      [userId, productId]
    );

    let affectedRows = 0;
    if (Array.isArray(result) && result.length > 0) {
      affectedRows = result[0].affectedRows;
    } else if (result && result.affectedRows) {
      affectedRows = result.affectedRows;
    }

    if (affectedRows > 0) {
      return {
        code: 200,
        message: "Đã xóa khỏi danh sách yêu thích!",
      };
    } else {
      return {
        code: 404,
        message: "Không tìm thấy sản phẩm yêu thích để xóa.",
      };
    }
  } catch (error) {
    throw error;
  }
}
module.exports = {
  list,
  add,
  remove,
};
