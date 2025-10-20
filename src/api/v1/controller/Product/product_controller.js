const db = require("../../../utils/database");
const offsetUtils = require("../../../utils/offset");
const { uploadMultipleFile } = require("../file_controller");
const { v4: uuidv4 } = require("uuid");

// ==================== LẤY DANH SÁCH SẢN PHẨM ====================
async function list({ page = 1, limit = 10, keyword = "" }) {
  try {
    const offset = offsetUtils.getOffset(page, limit);

    const [products] = await db.execute(
      `
      SELECT 
        p.uuid,
        p.name,
        p.price,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_uuid = p.uuid AND pi.is_main = 1
          LIMIT 1
        ) AS main_image
      FROM products p
      WHERE p.name LIKE ? OR p.description LIKE ?
      ORDER BY p.created_at DESC
      LIMIT ?, ?
    `,
      [`%${keyword}%`, `%${keyword}%`, offset, limit]
    );

    const [countRows] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM products
      WHERE name LIKE ? OR description LIKE ?
    `,
      [`%${keyword}%`, `%${keyword}%`]
    );

    const totalCount = countRows[0]?.total || 0;

    return {
      code: 200,
      data: products,
      pagination: {
        totalPage: Math.ceil(totalCount / limit),
        totalCount,
      },
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// ==================== CHI TIẾT SẢN PHẨM ====================
async function detail(id) {
  try {
    let productRowsRaw = await db.execute(
      `SELECT uuid, category_uuid, name, description, price, is_popular
       FROM products
       WHERE uuid = ? LIMIT 1`,
      [id]
    );
    let productRows =
      Array.isArray(productRowsRaw) && Array.isArray(productRowsRaw[0])
        ? productRowsRaw[0]
        : Array.isArray(productRowsRaw)
        ? productRowsRaw
        : [productRowsRaw];

    if (!productRows || productRows.length === 0 || !productRows[0]) {
      return { code: 404, message: "Không tìm thấy sản phẩm" };
    }

    const product = productRows[0];

    let imageRowsRaw = await db.execute(
      `SELECT uuid, product_uuid, url, is_main
       FROM product_images
       WHERE product_uuid = ?`,
      [id]
    );
    let imageRows =
      Array.isArray(imageRowsRaw) && Array.isArray(imageRowsRaw[0])
        ? imageRowsRaw[0]
        : Array.isArray(imageRowsRaw)
        ? imageRowsRaw
        : imageRowsRaw
        ? [imageRowsRaw]
        : [];

    let variantRowsRaw = await db.execute(
      `SELECT uuid, product_uuid, size, gender, color, type, stock, price
       FROM product_variants
       WHERE product_uuid = ?`,
      [id]
    );
    let variantRows =
      Array.isArray(variantRowsRaw) && Array.isArray(variantRowsRaw[0])
        ? variantRowsRaw[0]
        : Array.isArray(variantRowsRaw)
        ? variantRowsRaw
        : variantRowsRaw
        ? [variantRowsRaw]
        : [];

    if (!Array.isArray(imageRows)) imageRows = imageRows ? [imageRows] : [];
    if (!Array.isArray(variantRows))
      variantRows = variantRows ? [variantRows] : [];

    const productData = {
      uuid: product.uuid,
      category_uuid: product.category_uuid,
      name: product.name,
      description: product.description,
      price: product.price,
      is_popular: product.is_popular,

      images: imageRows,
      variants: variantRows,
    };

    return {
      code: 200,
      data: { product: productData },
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// ==================== THÊM SẢN PHẨM ====================
async function create(body, files) {
  try {
    const category_uuid = (body.category_uuid || "").trim();
    const name = (body.name || "").trim();
    const price = parseFloat(body.price);
    const description = body.description || "";
    const is_popular = parseInt(body.is_popular || 0);
    const variants = JSON.parse(body.variants || "[]");

    const uploadResult = await uploadMultipleFile(files);
    const uploadedImages = uploadResult.files || [];

    const product_uuid = uuidv4();

    await db.execute(
      `
      INSERT INTO products (uuid, category_uuid, name, description, price, is_popular)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [product_uuid, category_uuid, name, description, price, is_popular]
    );

    for (const url of uploadedImages) {
      await db.execute(
        `
        INSERT INTO product_images (uuid, product_uuid, url, is_main)
        VALUES (?, ?, ?, ?)
        `,
        [uuidv4(), product_uuid, url, 0]
      );
    }

    for (const v of variants) {
      await db.execute(
        `
        INSERT INTO product_variants (uuid, product_uuid, size, gender, color, type, stock, price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          uuidv4(),
          product_uuid,
          v.size,
          v.gender,
          v.color,
          v.type,
          v.stock,
          v.price,
        ]
      );
    }

    return {
      code: 201,
      message: "Tạo sản phẩm thành công!",
    };
  } catch (error) {
    console.error("❌ Error in create product:", error);
    throw error;
  }
}

// ==================== CẬP NHẬT SẢN PHẨM ====================
async function update(id, body, files = []) {
  try {
    const category_uuid = (body.category_uuid || "").trim();
    const name = (body.name || "").trim();
    const price = parseFloat(body.price);
    const description = body.description || "";
    const is_popular = parseInt(body.is_popular || 0);
    const variants = JSON.parse(body.variants || "[]");

    // Cập nhật thông tin sản phẩm
    await db.execute(
      `
      UPDATE products
      SET category_uuid = ?, name = ?, description = ?, price = ?, is_popular = ?
      WHERE uuid = ?
      `,
      [category_uuid, name, description, price, is_popular, id]
    );

    // Nếu có file upload mới thì xử lý lại ảnh
    if (files && files.length > 0) {
      const uploadResult = await uploadMultipleFile(files);
      const uploadedImages = uploadResult.files || [];

      // Xóa ảnh cũ
      await db.execute(`DELETE FROM product_images WHERE product_uuid = ?`, [
        id,
      ]);

      // Thêm ảnh mới
      for (const url of uploadedImages) {
        await db.execute(
          `
          INSERT INTO product_images (uuid, product_uuid, url, is_main)
          VALUES (?, ?, ?, ?)
          `,
          [uuidv4(), id, url, 0]
        );
      }
    }

    // Xóa và thêm lại variants
    await db.execute(`DELETE FROM product_variants WHERE product_uuid = ?`, [
      id,
    ]);

    for (const v of variants) {
      await db.execute(
        `
        INSERT INTO product_variants (uuid, product_uuid, size, gender, color, type, stock, price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [uuidv4(), id, v.size, v.gender, v.color, v.type, v.stock, v.price]
      );
    }

    return {
      code: 200,
      message: "Cập nhật sản phẩm thành công!",
    };
  } catch (error) {
    console.error("❌ Error in update product:", error);
    throw error;
  }
}

// ==================== XÓA SẢN PHẨM ====================
async function remove(id) {
  try {
    await db.execute(`DELETE FROM products WHERE uuid = ?`, [id]);
    await db.execute(`DELETE FROM product_images WHERE product_uuid = ?`, [id]);
    await db.execute(`DELETE FROM product_variants WHERE product_uuid = ?`, [
      id,
    ]);

    return {
      code: 200,
      message: "Đã xóa sản phẩm thành công!",
    };
  } catch (error) {
    console.error("❌ Error in remove product:", error);
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
