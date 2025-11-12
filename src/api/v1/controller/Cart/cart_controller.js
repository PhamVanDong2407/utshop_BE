const db = require("../../../utils/database");

async function getCart(user) {
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }
    const user_uuid = user.uuid;

    const result = await db.queryMultiple(
      [
        `
        SELECT 
          uc.variant_uuid, uc.quantity,
          p.uuid AS product_uuid, p.name AS product_name, p.price AS product_price,
          pi.url AS main_image_url,
          pv.size, pv.color, pv.gender, pv.type, pv.stock
        FROM user_cart uc
        JOIN product_variants pv ON uc.variant_uuid = pv.uuid
        JOIN products p ON pv.product_uuid = p.uuid
        LEFT JOIN product_images pi ON p.uuid = pi.product_uuid AND pi.is_main = 1
        WHERE uc.user_uuid = ?
        ORDER BY uc.created_at DESC
        `,
        `
        SELECT COUNT(*) AS total_items 
        FROM user_cart 
        WHERE user_uuid = ?
        `,
      ],
      [user_uuid, user_uuid]
    );

    const items = result[0] || [];
    // Truy cập mảng results thứ 2, object đầu tiên, thuộc tính total_items
    const totalItems = result[1][0].total_items;

    let totalAmount = 0;
    const cartItems = items.map((item) => {
      const price = parseFloat(item.product_price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      const subtotal = price * quantity;
      totalAmount += subtotal;

      return {
        variant_uuid: item.variant_uuid,
        product_uuid: item.product_uuid,
        product_name: item.product_name,
        main_image_url: item.main_image_url || null,
        price: price,
        quantity: quantity,
        subtotal: subtotal,
        size: item.size,
        color: item.color,
        gender: item.gender,
        type: item.type,
        stock: item.stock,
      };
    });

    return {
      code: 200,
      data: {
        items: cartItems,
        total_items: totalItems,
        total_amount: totalAmount,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy giỏ hàng:", error);
    return {
      code: 500,
      message: "Lỗi server khi lấy giỏ hàng!",
      error: error.message,
    };
  }
}

async function removeFromCart(user, variant_uuid) {
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }

    const result = await db.execute(
      `DELETE FROM user_cart WHERE user_uuid = ? AND variant_uuid = ?`,
      [user.uuid, variant_uuid]
    );

    if (result.affectedRows === 0) {
      return { code: 404, message: "Không tìm thấy sản phẩm trong giỏ hàng!" };
    }

    return {
      code: 200,
      message: "Đã xóa sản phẩm khỏi giỏ hàng!",
    };
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm khỏi giỏ:", error);
    return {
      code: 500,
      message: "Lỗi server khi xóa sản phẩm!",
      error: error.message,
    };
  }
}

async function addToCart(user, variant_uuid, quantity = 1) {
  try {
    if (!user || !user.uuid) {
      return { code: 401, message: "Không tìm thấy thông tin người dùng." };
    }

    // 1. Kiểm tra variant tồn tại + stock
    // [variant] sẽ lấy object ĐẦU TIÊN (ví dụ: {stock: 20})
    const [variant] = await db.execute(
      `SELECT stock FROM product_variants WHERE uuid = ?`,
      [variant_uuid]
    );

    if (!variant) {
      return { code: 404, message: "Biến thể sản phẩm không tồn tại!" };
    }

    const currentStock = variant.stock;

    // 2. Kiểm tra đã có trong giỏ chưa
    const [existing] = await db.execute(
      `SELECT quantity FROM user_cart WHERE user_uuid = ? AND variant_uuid = ?`,
      [user.uuid, variant_uuid]
    );

    let newQty = quantity;
    let message = "Thêm vào giỏ hàng thành công!";

    if (existing) {
      // Đã có -> Cộng dồn
      newQty = existing.quantity + quantity;
      message = "Cập nhật giỏ hàng thành công!";
    }

    // 3. Kiểm tra tổng số lượng mới có vượt stock không
    if (newQty > currentStock) {
      return {
        code: 400,
        message: `Số lượng trong giỏ vượt quá tồn kho! (Tồn kho: ${currentStock})`,
        data: { available_stock: currentStock },
      };
    }

    await db.execute(
      `
      INSERT INTO user_cart (user_uuid, variant_uuid, quantity) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = ?
    `,
      [user.uuid, variant_uuid, newQty, newQty]
    );

    return {
      code: 200,
      message: message,
      data: {
        variant_uuid,
        quantity: newQty,
      },
    };
  } catch (error) {
    console.error("Lỗi khi thêm vào giỏ hàng:", error);
    return {
      code: 500,
      message: "Lỗi server khi thêm vào giỏ hàng!",
      error: error.message,
    };
  }
}

module.exports = {
  getCart,
  removeFromCart,
  addToCart,
};
