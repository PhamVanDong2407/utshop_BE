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
        \`code\`,
        \`description\`,
        \`discount_type\`,
        \`discount_value\`,
        \`min_order_value\`,
        \`max_discount_amount\`,
        \`start_date\`, 
        \`end_date\`,
        \`usage_limit_per_voucher\`,
        \`current_usage_count\`,
        \`is_active\`

      FROM
        \`vouchers\`
      WHERE
         \`description\` LIKE '%${keyword}%' OR \`code\` LIKE '%${keyword}%'
      ORDER BY
        \`created_at\` DESC
      LIMIT ${offset}, ${limit}
      `,
      `
      SELECT count(*) AS total FROM \`vouchers\`
      WHERE  \`description\` LIKE '%${keyword}%' OR \`code\` LIKE '%${keyword}%'
      `,
    ]);

    const totalCount = result[1][0].total;
    const data =
      result[0] == null
        ? []
        : result[0].map((item) => {
            return {
              uuid: item.uuid,
              code: item.code,
              description: item.description,
              discount_type: item.discount_type,
              discount_value: item.discount_value,
              min_order_value: item.min_order_value,
              max_discount_amount: item.max_discount_amount,
              start_date: item.start_date,
              end_date: item.end_date,
              usage_limit_per_voucher: item.usage_limit_per_voucher,
              current_usage_count: item.current_usage_count,
              is_active: item.is_active,
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
            \`vouchers\`
            WHERE is_active = 1
            `
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
            \`vouchers\`
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
    if (
      body.code == null ||
      body.discount_type == null ||
      body.discount_value == null
    ) {
      return {
        code: 400,
        message: "Thiếu thông tin bắt buộc!",
      };
    }

    await db.execute(
      `INSERT INTO vouchers(
          uuid,
          code,
          description,
          discount_type,
          discount_value,
          min_order_value,
          max_discount_amount,
          start_date,
          end_date,
          usage_limit_per_voucher,
          current_usage_count,
          is_active
      ) VALUES (
          UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1
      )`,
      [
        body.code?.trim(),
        body.description?.trim() || null,
        body.discount_type,
        body.discount_value,
        body.min_order_value || 0,
        body.max_discount_amount || null,
        body.start_date || null,
        body.end_date || null,
        body.usage_limit_per_voucher || 0,
      ]
    );

    const [vouchers] = await db.execute(`
      SELECT uuid, code, description, discount_type, discount_value, is_active
      FROM vouchers ORDER BY created_at DESC
    `);

    return {
      code: 200,
      message: "Thêm mã giảm giá thành công!",
      data: vouchers,
    };
  } catch (error) {
    console.error("❌ Lỗi khi thêm voucher:", error);
    return {
      code: 500,
      message: "Lỗi server khi thêm voucher!",
      error: error.message,
    };
  }
}

async function update(id, body) {
  try {
    if (
      body.code == null ||
      body.discount_type == null ||
      body.discount_value == null
    ) {
      return {
        code: 400,
        message: "Thiếu thông tin bắt buộc!",
      };
    }

    await db.execute(
      `UPDATE vouchers
        SET
          code = ?,
          description = ?,
          discount_type = ?,
          discount_value = ?,
          min_order_value = ?,
          max_discount_amount = ?,
          start_date = ?,
          end_date = ?,
          usage_limit_per_voucher = ?,
          usage_limit_per_user = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE uuid = ?`,
      [
        body.code?.trim(),
        body.description?.trim() || null,
        body.discount_type,
        body.discount_value,
        body.min_order_value || 0,
        body.max_discount_amount || null,
        body.start_date || null,
        body.end_date || null,
        body.usage_limit_per_voucher || 0,
        body.usage_limit_per_user || 1,
        body.is_active ?? 1,
        id,
      ]
    );

    const [updatedVoucher] = await db.execute(
      `SELECT
          uuid,
          code,
          description,
          discount_type,
          discount_value,
          min_order_value,
          max_discount_amount,
          start_date,
          end_date,
          usage_limit_per_voucher,
          usage_limit_per_user,
          current_usage_count,
          is_active,
          updated_at
        FROM vouchers
        WHERE uuid = ?`,
      [id]
    );

    return {
      code: 200,
      message: "Đã cập nhật voucher thành công!",
      data: updatedVoucher[0],
    };
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật voucher:", error);
    return {
      code: 500,
      message: "Lỗi server khi cập nhật voucher!",
      error: error.message,
    };
  }
}

async function remove(id) {
  try {
    db.execute(
      `DELETE FROM
            \`vouchers\`
        WHERE
            \`uuid\` = ?`,
      [id]
    );

    return {
      code: 200,
      message: "Đã xóa vouchers thành công!",
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
