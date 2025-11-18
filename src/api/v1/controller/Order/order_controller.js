const db = require("../../../utils/database");
const { nanoid } = require("nanoid");

async function createOrder(user, payload) {
  let connection;
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }
    const user_uuid = user.uuid;

    const {
      address_uuid, items, voucher_uuid,
      subtotal, shipping_fee, discount, total_amount, payment_method,
    } = payload;

    if (!address_uuid || !items || items.length === 0 || !payment_method) {
      return {
        code: 400,
        message: "Thiếu thông tin địa chỉ, sản phẩm, hoặc PTTT.",
      };
    }

    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    const order_code = `UT-${nanoid(8).toUpperCase()}`;
    const order_status =
      payment_method === "cod" ? "pending" : "awaiting_payment";

    // [SQL 1] Insert vào `orders`
    const orderSql = "INSERT INTO orders (uuid, user_uuid, address_uuid, order_code, subtotal, shipping_fee, discount, total_amount, voucher_uuid, payment_method, status, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
    
    await connection.execute(orderSql, [
      user_uuid, address_uuid, order_code, subtotal, shipping_fee,
      discount, total_amount, voucher_uuid || null, payment_method, order_status,
    ]);

    const [orderRows] = await connection.execute(
      "SELECT uuid FROM orders WHERE order_code = ?", [order_code]
    );
    if (orderRows.length === 0) {
      throw new Error("Không thể lấy UUID đơn hàng vừa tạo");
    }
    const newOrderUuid = orderRows[0].uuid;

    // [SQL 2] Insert vào `order_items`
    const itemsSql = "INSERT INTO order_items (order_uuid, variant_uuid, quantity, price) VALUES ?";
    const orderItemsData = items.map((item) => [
      newOrderUuid, item.variant_uuid, item.quantity, item.price,
    ]);
    await connection.query(itemsSql, [orderItemsData]);

    // [LOGIC 1] TRỪ TỒN KHO SẢN PHẨM
    for (const item of items) {
      const sqlUpdateStock = "UPDATE product_variants SET stock = stock - ? WHERE uuid = ? AND stock >= ?";
      const [result] = await connection.execute(sqlUpdateStock, [
        item.quantity, 
        item.variant_uuid, 
        item.quantity
      ]);
      if (result.affectedRows === 0) {
        await connection.rollback(); 
        return { code: 400, message: `Sản phẩm trong giỏ hàng đã hết hàng.` };
      }
    }

    // [LOGIC 2] CẬP NHẬT SỐ LƯỢNG VOUCHER
    if (voucher_uuid) {
      const sqlUpdateVoucher = "UPDATE vouchers SET current_usage_count = current_usage_count + 1 WHERE uuid = ? AND current_usage_count < usage_limit_per_voucher";
      const [result] = await connection.execute(sqlUpdateVoucher, [voucher_uuid]);
      if (result.affectedRows === 0) {
        await connection.rollback(); 
        return { code: 400, message: "Mã giảm giá đã hết lượt sử dụng." };
      }
    }

    // [SQL 3] Insert vào `payments` nếu là VietQR
    if (payment_method === "vietqr") {
      const paymentSql = "INSERT INTO payments (uuid, order_id, method, amount, status) VALUES (UUID(), ?, ?, ?, 'pending')";
      await connection.execute(paymentSql, [
        newOrderUuid, "vietqr", total_amount,
      ]);
    }

    // [SQL 4] Xóa sản phẩm khỏi giỏ hàng
    const variantUuidsToDelete = items.map((item) => item.variant_uuid);
    if (variantUuidsToDelete.length > 0) {
        const placeholders = variantUuidsToDelete.map(() => "?").join(",");
        const deleteCartSql = `DELETE FROM user_cart WHERE user_uuid = ? AND variant_uuid IN (${placeholders})`;
        await connection.execute(deleteCartSql, [user_uuid, ...variantUuidsToDelete]);
    }

    await connection.commit();

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
    if (connection) await connection.rollback();
    console.error("Lỗi khi tạo đơn hàng:", error);
    return { code: 500, message: "Lỗi server!", error: error.message };
  } finally {
    if (connection) connection.release();
  }
}

async function getOrderHistory(user) {
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }
    const user_uuid = user.uuid;

    const sql = `
      SELECT
          o.uuid,
          o.order_code,
          o.total_amount,
          o.status,
          o.created_at,
          p.name AS product_name, 
          pi.url AS main_image_url, 
          oi.quantity, 
          pv.size,
          pv.color,
          (SELECT SUM(quantity) FROM order_items WHERE order_uuid = o.uuid) AS total_items_count
      FROM orders o
      JOIN order_items oi ON o.uuid = oi.order_uuid
      JOIN product_variants pv ON oi.variant_uuid = pv.uuid
      JOIN products p ON pv.product_uuid = p.uuid
      LEFT JOIN product_images pi ON p.uuid = pi.product_uuid AND pi.is_main = 1
      WHERE o.user_uuid = ?
      GROUP BY o.uuid 
      ORDER BY o.created_at DESC
    `;

    const orders = await db.execute(sql, [user_uuid]);

    return {
      code: 200,
      data: orders,
    };
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử đơn hàng:", error);
    return {
      code: 500,
      message: "Lỗi server khi lấy lịch sử đơn hàng!",
      error: error.message,
    };
  }
}

async function getOrderDetail(user, order_uuid) {
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }
    const user_uuid = user.uuid;

    // --- CHẠY 2 CÂU LỆNH SQL CÙNG LÚC ---

    // Câu 1: Lấy thông tin chung của đơn hàng VÀ thông tin địa chỉ
    const sqlOrderInfo = `
      SELECT
          o.order_code,
          o.total_amount,
          o.subtotal,
          o.shipping_fee,
          o.discount,
          o.status,
          o.payment_method,
          o.created_at,
          v.code AS voucher_code,
          ua.recipient_name,
          ua.phone,
          ua.province,
          ua.district,
          ua.address
      FROM orders o
      LEFT JOIN user_addresses ua ON o.address_uuid = ua.uuid
      LEFT JOIN vouchers v ON o.voucher_uuid = v.uuid
      WHERE o.uuid = ? AND o.user_uuid = ?
    `;

    // Câu 2: Lấy danh sách TẤT CẢ sản phẩm trong đơn hàng
    const sqlOrderItems = `
      SELECT 
          oi.quantity, 
          oi.price, 
          p.name AS product_name, 
          pi.url AS main_image_url, 
          pv.size,
          pv.color
      FROM order_items oi
      JOIN product_variants pv ON oi.variant_uuid = pv.uuid
      JOIN products p ON pv.product_uuid = p.uuid
      LEFT JOIN product_images pi ON p.uuid = pi.product_uuid AND pi.is_main = 1
      WHERE oi.order_uuid = ?
    `;

    // Chạy song song 2 câu lệnh
    const [orderInfoResult, itemsResult] = await Promise.all([
      db.execute(sqlOrderInfo, [order_uuid, user_uuid]),
      db.execute(sqlOrderItems, [order_uuid]),
    ]);

    if (orderInfoResult.length === 0) {
      return { code: 404, message: "Không tìm thấy đơn hàng." };
    }

    const orderInfo = orderInfoResult[0];
    const items = itemsResult;

    // Gộp 2 kết quả lại
    const fullDetail = {
      ...orderInfo, // Lấy tất cả thông tin đơn hàng
      items: items, // Thêm danh sách sản phẩm vào
    };

    return {
      code: 200,
      data: fullDetail,
    };
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
    return {
      code: 500,
      message: "Lỗi server khi lấy chi tiết đơn hàng!",
      error: error.message,
    };
  }
}

async function cancelOrder(user, order_uuid) {
  let connection;
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }
    const user_uuid = user.uuid;

    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    // 1. Lấy trạng thái hiện tại của đơn hàng
    const [orderRows] = await connection.execute(
      "SELECT status FROM orders WHERE uuid = ? AND user_uuid = ?",
      [order_uuid, user_uuid]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return { code: 404, message: "Không tìm thấy đơn hàng." };
    }

    const currentStatus = orderRows[0].status;

    // 2. Kiểm tra điều kiện hủy
    if (currentStatus === "shipping" || currentStatus === "delivered") {
      await connection.rollback();
      return {
        code: 400,
        message: "Đơn hàng đang giao hoặc đã giao, không thể hủy.",
      };
    }
    if (currentStatus === "cancelled") {
      await connection.rollback();
      return { code: 400, message: "Đơn hàng này đã được hủy trước đó." };
    }

    // 3. Cập nhật trạng thái
    const updateSql = "UPDATE orders SET status = 'cancelled' WHERE uuid = ?";
    await connection.execute(updateSql, [order_uuid]);

    await connection.commit();

    return {
      code: 200,
      message: "Hủy đơn hàng thành công.",
      data: {
        new_status: "cancelled",
      },
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi khi hủy đơn hàng:", error);
    return {
      code: 500,
      message: "Lỗi server khi hủy đơn hàng!",
      error: error.message,
    };
  } finally {
    if (connection) connection.release();
  }
}

async function reOrder(user, order_uuid) {
  let connection;
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }
    const user_uuid = user.uuid;

    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    // 1. Lấy tất cả sản phẩm từ đơn hàng cũ (phải đảm bảo user sở hữu đơn này)
    const sqlGetItems = `
      SELECT oi.variant_uuid, oi.quantity 
      FROM order_items oi
      JOIN orders o ON oi.order_uuid = o.uuid
      WHERE oi.order_uuid = ? AND o.user_uuid = ?
    `;
    const [itemsToReorder] = await connection.execute(sqlGetItems, [
      order_uuid,
      user_uuid,
    ]);

    if (itemsToReorder.length === 0) {
      await connection.rollback();
      return { code: 404, message: "Không tìm thấy sản phẩm trong đơn hàng." };
    }

    // 2. Thêm lại vào giỏ hàng
    // Dùng INSERT ... ON DUPLICATE KEY UPDATE để cộng dồn số lượng
    const sqlInsertCart = `
      INSERT INTO user_cart (user_uuid, variant_uuid, quantity) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `;

    const cartData = itemsToReorder.map((item) => [
      user_uuid,
      item.variant_uuid,
      item.quantity,
    ]);

    await connection.query(sqlInsertCart, [cartData]);

    await connection.commit();

    return {
      code: 200,
      message: `Đã thêm ${itemsToReorder.length} sản phẩm vào giỏ hàng.`,
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi khi mua lại đơn hàng:", error);
    return {
      code: 500,
      message: "Lỗi server khi mua lại đơn hàng!",
      error: error.message,
    };
  } finally {
    if (connection) connection.release();
  }
}

// ADMIN

// LẤY DANH SÁCH TẤT CẢ ĐƠN HÀNG
async function getAllOrders(user) {
  try {
    const sql = `
      SELECT
          o.uuid, o.order_code, o.total_amount, o.status, o.created_at,
          u.name AS customer_name,
          p.name AS product_name, 
          pi.url AS main_image_url
      FROM orders o
      JOIN user u ON o.user_uuid = u.uuid
      LEFT JOIN order_items oi ON o.uuid = oi.order_uuid
      LEFT JOIN product_variants pv ON oi.variant_uuid = pv.uuid
      LEFT JOIN products p ON pv.product_uuid = p.uuid
      LEFT JOIN product_images pi ON p.uuid = pi.product_uuid AND pi.is_main = 1
      GROUP BY o.uuid 
      ORDER BY o.created_at DESC
    `;

    const orders = await db.execute(sql, []);

    return {
      code: 200,
      data: orders,
    };
  } catch (error) {
    return {
      code: 500,
      message: "Lỗi server!",
      error: error.message,
    };
  }
}

async function getOrderDetaiAdmin(user, order_uuid) {
  try {
    // Câu 1: Lấy thông tin chung
    const sqlOrderInfo = `
      SELECT
          o.order_code, o.total_amount, o.subtotal, o.shipping_fee, o.discount,
          o.status, o.payment_method, o.created_at, v.code AS voucher_code,
          ua.recipient_name, ua.phone, ua.province, ua.district, ua.address
      FROM orders o
      LEFT JOIN user_addresses ua ON o.address_uuid = ua.uuid
      LEFT JOIN vouchers v ON o.voucher_uuid = v.uuid
      WHERE o.uuid = ? 
    `;

    // Câu 2: Lấy danh sách sản phẩm
    const sqlOrderItems = `
      SELECT 
          oi.quantity, oi.price, p.name AS product_name, 
          pi.url AS main_image_url, pv.size, pv.color
      FROM order_items oi
      JOIN product_variants pv ON oi.variant_uuid = pv.uuid
      JOIN products p ON pv.product_uuid = p.uuid
      LEFT JOIN product_images pi ON p.uuid = pi.product_uuid AND pi.is_main = 1
      WHERE oi.order_uuid = ?
    `;

    const [orderInfoResult, itemsResult] = await Promise.all([
      db.execute(sqlOrderInfo, [order_uuid]),
      db.execute(sqlOrderItems, [order_uuid]),
    ]);

    if (orderInfoResult.length === 0) {
      return { code: 404, message: "Không tìm thấy đơn hàng." };
    }

    const fullDetail = { ...orderInfoResult[0], items: itemsResult };
    return { code: 200, data: fullDetail };
  } catch (error) {
    return { code: 500, message: "Lỗi server!", error: error.message };
  }
}

// ADMIN CẬP NHẬT TRẠNG THÁI
async function updateOrderStatus(user, order_uuid, new_status) {
  let connection;
  try {
  
    const validStatuses = [
      "pending",
      "awaiting_payment",
      "paid",
      "shipping",
      "delivered",
      "cancelled",
      "refunded",
    ];
    if (!new_status || !validStatuses.includes(new_status)) {
      return { code: 400, message: "Trạng thái mới không hợp lệ." };
    }

    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    // 1. Lấy trạng thái hiện tại VÀ voucher_uuid
    const [orderRows] = await connection.execute(
      "SELECT uuid, voucher_uuid, status FROM orders WHERE uuid = ?",
      [order_uuid]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return { code: 404, message: "Không tìm thấy đơn hàng." };
    }

    const order = orderRows[0];
    const currentStatus = order.status;

    // 2. KIỂM TRA NẾU LÀ HÀNH ĐỘNG HỦY (CANCELLED)
    if (new_status === "cancelled") {
      // Các trạng thái có thể hủy
      const refundableStatuses = ["pending", "awaiting_payment", "paid"];

      if (refundableStatuses.includes(currentStatus)) {
        // 2a. Lấy danh sách sản phẩm
        const [itemsToRefund] = await connection.execute(
          "SELECT variant_uuid, quantity FROM order_items WHERE order_uuid = ?",
          [order_uuid]
        );

        // 2b. Hoàn kho
        for (const item of itemsToRefund) {
          const sqlRefundStock =
            "UPDATE product_variants SET stock = stock + ? WHERE uuid = ?";
          await connection.execute(sqlRefundStock, [
            item.quantity,
            item.variant_uuid,
          ]);
        }

        // 2c. Hoàn voucher (nếu có)
        if (order.voucher_uuid) {
          const sqlRefundVoucher =
            "UPDATE vouchers SET current_usage_count = current_usage_count - 1 WHERE uuid = ? AND current_usage_count > 0";
          await connection.execute(sqlRefundVoucher, [order.voucher_uuid]);
        }
      } else {
        // Nếu đang giao (shipping) hoặc đã giao (delivered), không cho hủy
        await connection.rollback();
        return {
          code: 400,
          message: `Không thể hủy đơn hàng đang ở trạng thái "${currentStatus}".`,
        };
      }
    }

    // 3. Cập nhật trạng thái đơn hàng (cho mọi trường hợp: 'paid', 'shipping', 'cancelled'...)
    const sqlUpdateOrder = "UPDATE orders SET status = ? WHERE uuid = ?";
    const [result] = await connection.execute(sqlUpdateOrder, [
      new_status,
      order_uuid,
    ]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return { code: 404, message: "Không tìm thấy đơn hàng để cập nhật." };
    }

    await connection.commit();

    return {
      code: 200,
      message: `Cập nhật trạng thái thành công: ${new_status}`,
      data: { new_status: new_status },
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi khi cập nhật trạng thái đơn hàng (Admin):", error);
    return { code: 500, message: "Lỗi server!", error: error.message };
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  createOrder,
  getOrderHistory,
  getOrderDetail,
  cancelOrder,
  reOrder,
  getAllOrders,
  getOrderDetaiAdmin,
  updateOrderStatus,
};
