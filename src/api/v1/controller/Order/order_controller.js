const db = require("../../../utils/database");
const { nanoid } = require("nanoid");

async function createOrder(user, payload) {
  let connection;
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }
    const user_uuid = user.uuid;

    // Lấy dữ liệu từ payload
    const {
      address_uuid,
      items,
      voucher_uuid,
      subtotal,
      shipping_fee,
      discount,
      total_amount,
      payment_method,
    } = payload;

    // Kiểm tra dữ liệu đầu vào
    if (!address_uuid || !items || items.length === 0 || !payment_method) {
      return {
        code: 400,
        message:
          "Thiếu thông tin địa chỉ, sản phẩm, hoặc phương thức thanh toán.",
      };
    }

    // --- BẮT ĐẦU TRANSACTION ---
    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    // Tạo mã đơn hàng
    const order_code = `UT-${nanoid(8).toUpperCase()}`;
    const order_status =
      payment_method === "cod" ? "pending" : "awaiting_payment";

    // [SQL 1] Insert vào bảng orders
    const orderSql =
      "INSERT INTO orders (uuid, user_uuid, address_uuid, order_code, subtotal, shipping_fee, discount, total_amount, voucher_uuid, payment_method, status, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

    await connection.execute(orderSql, [
      user_uuid,
      address_uuid,
      order_code,
      subtotal,
      shipping_fee,
      discount,
      total_amount,
      voucher_uuid || null,
      payment_method,
      order_status,
    ]);

    // Lấy UUID của đơn hàng vừa tạo
    const [orderRows] = await connection.execute(
      "SELECT uuid FROM orders WHERE order_code = ?",
      [order_code]
    );

    if (orderRows.length === 0) {
      throw new Error("Không thể lấy UUID đơn hàng vừa tạo");
    }
    const newOrderUuid = orderRows[0].uuid;

    // [SQL 2] Insert vào bảng order_items
    const itemsSql =
      "INSERT INTO order_items (order_uuid, variant_uuid, quantity, price) VALUES ?";
    const orderItemsData = items.map((item) => [
      newOrderUuid,
      item.variant_uuid,
      item.quantity,
      item.price,
    ]);
    await connection.query(itemsSql, [orderItemsData]);

    // [SQL 3] Insert vào payments nếu là VietQR
    if (payment_method === "vietqr") {
      const paymentSql =
        "INSERT INTO payments (uuid, order_id, method, amount, status, created_at) VALUES (UUID(), ?, ?, ?, 'pending', NOW())";
      await connection.execute(paymentSql, [
        newOrderUuid,
        "vietqr",
        total_amount,
      ]);
    }

    // [SQL 4] Xóa sản phẩm khỏi giỏ hàng
    const variantUuidsToDelete = items.map((item) => item.variant_uuid);
    if (variantUuidsToDelete.length > 0) {
      // Tạo chuỗi dấu hỏi chấm (?, ?, ?) tương ứng số lượng item
      const placeholders = variantUuidsToDelete.map(() => "?").join(",");
      const deleteCartSql = `DELETE FROM user_cart WHERE user_uuid = ? AND variant_uuid IN (${placeholders})`;

      // Gộp user_uuid và mảng variant uuid lại thành 1 mảng tham số
      await connection.execute(deleteCartSql, [
        user_uuid,
        ...variantUuidsToDelete,
      ]);
    }

    // --- COMMIT TRANSACTION ---
    await connection.commit();

    // Trả về kết quả
    return {
      code: 201,
      message: "Đặt hàng thành công!",
      data: {
        payment_method: payment_method,
        order_uuid: newOrderUuid,
        order_code: order_code,
        total_amount: total_amount,
        status: order_status,
      },
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi tạo đơn hàng:", error);
    return {
      code: 500,
      message: "Lỗi server khi tạo đơn hàng!",
      error: error.message,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  createOrder,
};
