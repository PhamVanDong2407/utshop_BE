// TẠO FILE MỚI: controller/Admin/dashboard.controller.js

const db = require("../../../utils/database");

async function getDashboardStats(user) {
  try {
    // 1. Tổng doanh thu (chỉ tính đơn đã giao)
    const sqlRevenue = db.execute(
      "SELECT SUM(total_amount) as totalRevenue FROM orders WHERE status = 'delivered'"
    );

    // 2. Tổng đơn hàng (tất cả đơn hàng)
    const sqlTotalOrders = db.execute(
      "SELECT COUNT(uuid) as totalOrders FROM orders"
    );

    // 3. Đang chuẩn bị (Chờ xử lý + Chờ thanh toán)
    const sqlPreparing = db.execute(
      "SELECT COUNT(uuid) as preparingOrders FROM orders WHERE status = 'pending' OR status = 'awaiting_payment'"
    );

    // 4. Tổng sản phẩm (đang bán)
    const sqlProducts = db.execute(
      "SELECT COUNT(uuid) as totalProducts FROM products"
    );

    // 5. Đơn đã bán (đã giao)
    const sqlSold = db.execute(
      "SELECT COUNT(uuid) as soldOrders FROM orders WHERE status = 'delivered'"
    );

    // 6. Đang giao
    const sqlShipping = db.execute(
      "SELECT COUNT(uuid) as shippingOrders FROM orders WHERE status = 'shipping'"
    );

    // 7. Đơn hủy
    const sqlCancelled = db.execute(
      "SELECT COUNT(uuid) as cancelledOrders FROM orders WHERE status = 'cancelled'"
    );

    // Chạy tất cả cùng lúc
    const [
      [revenueResult],
      [totalOrdersResult],
      [preparingResult],
      [productsResult],
      [soldResult],
      [shippingResult],
      [cancelledResult],
    ] = await Promise.all([
      sqlRevenue,
      sqlTotalOrders,
      sqlPreparing,
      sqlProducts,
      sqlSold,
      sqlShipping,
      sqlCancelled,
    ]);

    // Gộp kết quả
    const stats = {
      totalRevenue: revenueResult.totalRevenue || 0,
      totalOrders: totalOrdersResult.totalOrders || 0,
      preparingOrders: preparingResult.preparingOrders || 0,
      totalProducts: productsResult.totalProducts || 0,
      soldOrders: soldResult.soldOrders || 0,
      shippingOrders: shippingResult.shippingOrders || 0,
      cancelledOrders: cancelledResult.cancelledOrders || 0,
    };

    return {
      code: 200,
      data: stats,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thống kê Dashboard (Admin):", error);
    return {
      code: 500,
      message: "Lỗi server!",
      error: error.message,
    };
  }
}

module.exports = {
  getDashboardStats,
};
