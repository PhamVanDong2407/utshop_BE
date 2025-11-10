const db = require("../../../utils/database");
const offsetUtils = require("../../../utils/offset");

async function getAllAddresses({ userId, page = 1, limit = 10 }) {
  try {
    const offset = offsetUtils.getOffset(page, limit);
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset) || 0;

    const dataQuery = `
      SELECT
        uuid, recipient_name, phone, province, district, address, is_default
      FROM
        user_addresses
      WHERE
        user_uuid = '${userId}'
      ORDER BY
        is_default DESC, created_at DESC
      LIMIT ${safeOffset}, ${safeLimit}
    `;

    const countQuery = `
      SELECT count(*) AS total FROM user_addresses WHERE user_uuid = '${userId}'
    `;

    const result = await db.queryMultiple([dataQuery, countQuery]);

    const data = result[0] == null ? [] : result[0];
    const totalCount = result[1][0].total;

    return {
      code: 200,
      message: "Lấy danh sách địa chỉ thành công.",
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

async function createAddress({ userId, addressData }) {
  const {
    recipient_name,
    phone,
    province,
    district,
    address,
    is_default = 0,
  } = addressData;

  if (!recipient_name || !phone || !province || !district || !address) {
    return {
      code: 400,
      message: "Vui lòng điền đầy đủ thông tin bắt buộc.",
    };
  }

  try {
    const uuidResult = await db.queryMultiple([
      "SELECT REPLACE(UUID(), '-', '') AS newUuid",
    ]);
    const newAddressUuid = uuidResult[0][0].newUuid;

    if (Number(is_default) === 1) {
      const updateOldSql =
        "UPDATE user_addresses SET is_default = 0 WHERE user_uuid = ?";
      await db.execute(updateOldSql, [userId]);
    }

    const insertSql = `
      INSERT INTO user_addresses
        (uuid, user_uuid, recipient_name, phone, province, district, address, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.execute(insertSql, [
      newAddressUuid,
      userId,
      recipient_name,
      phone,
      province,
      district,
      address,
      Number(is_default),
    ]);

    return {
      code: 201,
      message: "Thêm địa chỉ mới thành công.",
      data: { uuid: newAddressUuid, ...addressData },
    };
  } catch (error) {
    throw error;
  }
}

async function updateAddress({ userId, addressUuid, addressData }) {
  const { recipient_name, phone, province, district, address, is_default } =
    addressData;

  if (
    !recipient_name ||
    !phone ||
    !province ||
    !district ||
    !address ||
    is_default === undefined
  ) {
    return {
      code: 400,
      message: "Vui lòng điền đầy đủ thông tin.",
    };
  }

  try {
    if (Number(is_default) === 1) {
      const updateOldSql =
        "UPDATE user_addresses SET is_default = 0 WHERE user_uuid = ? AND uuid != ?";
      await db.execute(updateOldSql, [userId, addressUuid]);
    }

    const updateSql = `
      UPDATE user_addresses
      SET
        recipient_name = ?, phone = ?, province = ?,
        district = ?, address = ?, is_default = ?
      WHERE uuid = ? AND user_uuid = ?
    `;

    const result = await db.execute(updateSql, [
      recipient_name,
      phone,
      province,
      district,
      address,
      Number(is_default),
      addressUuid,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return {
        code: 404,
        message: "Không tìm thấy địa chỉ hoặc bạn không có quyền cập nhật.",
      };
    }

    return {
      code: 200,
      message: "Cập nhật địa chỉ thành công.",
    };
  } catch (error) {
    throw error;
  }
}

async function removeAddress({ userId, addressUuid }) {
  try {
    const sql = "DELETE FROM user_addresses WHERE user_uuid = ? AND uuid = ?";

    const result = await db.execute(sql, [userId, addressUuid]);

    if (result.affectedRows > 0) {
      return {
        code: 200,
        message: "Đã xóa địa chỉ thành công!",
      };
    } else {
      return {
        code: 404,
        message: "Không tìm thấy địa chỉ để xóa.",
      };
    }
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getAllAddresses,
  createAddress,
  updateAddress,
  removeAddress,
};
