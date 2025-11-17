const db = require("../../../utils/database");

async function getRevenueStats(user, period) {
  try {
    let startDate, endDate, groupByFormat, chartLabelFormat;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    const day = now.getDate(); // 1-31
    const dayOfWeek = now.getDay(); // 0=CN, 1=T2, ... 6=T7

    // --- 1. Xác định khoảng thời gian ---
    switch (period) {
      case "week":
        // Lấy từ Thứ 2 (dayOfWeek=1) đến Chủ Nhật (dayOfWeek=0)
        const startOfWeek = new Date(now);
        // Nếu hôm nay là CN (0), lùi 6 ngày. Nếu T2 (1), lùi 0. Nếu T3 (2), lùi 1.
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(day - daysToSubtract);
        startOfWeek.setHours(0, 0, 0, 0); // 00:00:00

        startDate = startOfWeek;
        endDate = new Date(startOfWeek);
        endDate.setDate(startOfWeek.getDate() + 6); // Cộng 6 ngày
        endDate.setHours(23, 59, 59, 999); // 23:59:59

        groupByFormat = "%w"; // %w = Day of week (0=Sunday, 1=Monday, ...)
        chartLabelFormat = "week";
        break;

      case "year":
        startDate = new Date(year, 0, 1, 0, 0, 0); // 1/1/YYYY 00:00:00
        endDate = new Date(year, 11, 31, 23, 59, 59); // 31/12/YYYY 23:59:59
        groupByFormat = "%m"; // %m = Month (01, 02... 12)
        chartLabelFormat = "year";
        break;

      case "month":
      default:
        startDate = new Date(year, month, 1, 0, 0, 0); // Ngày đầu tháng
        endDate = new Date(year, month + 1, 0, 23, 59, 59); // Ngày cuối tháng
        groupByFormat = "%d"; // %d = Day of month (01, 02... 31)
        chartLabelFormat = "month";
        break;
    }

    // --- 2. Chạy 2 câu SQL (KPIs và Biểu đồ) ---

    // Chỉ tính doanh thu từ các đơn đã giao
    const baseCondition = `status = 'delivered' AND created_at BETWEEN ? AND ?`;

    // SQL 1: Lấy 2 thẻ KPI
    const sqlKpi = `
      SELECT
        SUM(total_amount) AS totalRevenue,
        COUNT(uuid) AS totalOrders
      FROM orders
      WHERE ${baseCondition}
    `;

    // SQL 2: Lấy dữ liệu biểu đồ
    const sqlChart = `
      SELECT
        DATE_FORMAT(created_at, '${groupByFormat}') as label,
        SUM(total_amount) as value
      FROM orders
      WHERE ${baseCondition}
      GROUP BY label
      ORDER BY label ASC
    `;

    const [kpiResult, chartResult] = await Promise.all([
      db.execute(sqlKpi, [startDate, endDate]),
      db.execute(sqlChart, [startDate, endDate]),
    ]);

    // --- 3. Xử lý kết quả ---

    // Xử lý KPI
    const kpi = {
      totalRevenue: kpiResult[0].totalRevenue || 0,
      totalOrders: kpiResult[0].totalOrders || 0,
    };

    // Xử lý Chart
    const chartData = processChartData(chartResult, chartLabelFormat);

    return {
      code: 200,
      data: {
        kpi: kpi,
        chartData: chartData,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy thống kê doanh thu:", error);
    return { code: 500, message: "Lỗi server!", error: error.message };
  }
}

function processChartData(sqlData, format) {
  let template = [];

  if (format === "year") {
    // 12 tháng: '01' đến '12'
    template = Array.from({ length: 12 }, (_, i) => ({
      label: (i + 1).toString().padStart(2, "0"), // '01', '02'
      value: 0,
    }));
  } else if (format === "month") {
    // 31 ngày: '01' đến '31' (Giả sử 1 tháng max 31 ngày)
    template = Array.from({ length: 31 }, (_, i) => ({
      label: (i + 1).toString().padStart(2, "0"), // '01', '02'
      value: 0,
    }));
  } else {
    // week
    // 7 ngày: '0' (CN) đến '6' (T7)
    template = Array.from({ length: 7 }, (_, i) => ({
      label: i.toString(), // '0', '1'
      value: 0,
    }));
  }

  // Lấp đầy data từ SQL vào mảng template
  for (const row of sqlData) {
    const index = template.findIndex((item) => item.label === row.label);
    if (index !== -1) {
      // Chia cho 1 triệu (vì UI của bạn ghi "Triệu đồng")
      template[index].value = (parseFloat(row.value) || 0) / 1000000;
    }
  }

  // Nếu là tuần, sắp xếp lại (T2-CN)
  if (format === "week") {
    const sunday = template.find((d) => d.label === "0");
    const week = template.filter((d) => d.label !== "0"); // Lấy T2-T7
    if (sunday) week.push(sunday); // Đẩy CN xuống cuối
    return week;
  }

  return template;
}

module.exports = {
  getRevenueStats,
};
