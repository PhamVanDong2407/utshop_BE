// api/v1/controller/Admin/product_admin_controller.js
const db = require("../../../utils/database");

async function list({ page = 1, limit = 10, keyword = "", state = 1 }) {
  try {
    const query = `
      SELECT
        p.uuid,
        p.name,
        p.description,
        p.price AS default_price,
        p.is_popular,
        p.stock AS total_stock,
        p.created_at,
        pi.url AS main_image_url,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'variant_uuid', pv.uuid,
              'size', CASE pv.size WHEN 0 THEN 'M' WHEN 1 THEN 'L' WHEN 2 THEN 'XL' ELSE NULL END,
              'gender', CASE pv.gender WHEN 0 THEN 'Nam' WHEN 1 THEN 'Nữ' ELSE NULL END,
              'color', CASE pv.color WHEN 0 THEN 'Trắng' WHEN 1 THEN 'Đỏ' WHEN 2 THEN 'Đen' ELSE NULL END,
              'stock', pv.stock,
              'price', pv.price
            )
          )
          FROM product_variants pv
          WHERE pv.product_uuid = p.uuid
        ) AS variants
      FROM
        products p
      LEFT JOIN 
        product_images pi ON p.uuid = pi.product_uuid AND pi.is_main = 1
      GROUP BY
        p.uuid
      ORDER BY
        p.created_at DESC;
    `;

    const products = await db.execute(query);

    products.forEach((product) => {
      if (product.variants) {
        product.variants = JSON.parse(product.variants);
      } else {
        product.variants = [];
      }
    });

    return {
      code: 200,
      message: "Lấy danh sách sản phẩm thành công!",
      data: products,
    };
  } catch (error) {
    console.error("Error in getAllProductsAdmin:", error);
    throw error;
  }
}

async function detail(id) {}

async function create(body) {}

async function update(id, body) {}

async function remove(id) {}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
};
