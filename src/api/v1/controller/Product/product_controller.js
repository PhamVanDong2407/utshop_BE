const db = require("../../../utils/database");
const offsetUtils = require("../../../utils/offset");
const { uploadMultipleFile } = require("../file_controller");
const { v4: uuidv4 } = require("uuid");

// ==================== LẤY DANH SÁCH SẢN PHẨM Admin =======================
async function list({ page = 1, limit = 10, keyword = "" }) {
  try {
    const offset = offsetUtils.getOffset(page, limit);

    const result = await db.queryMultiple([
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
      WHERE p.name LIKE '%${keyword}%' OR p.description LIKE '%${keyword}%'
      ORDER BY p.created_at DESC
      LIMIT ${offset}, ${limit}
      `,
      `
      SELECT COUNT(*) AS total 
      FROM products 
      WHERE name LIKE '%${keyword}%' OR description LIKE '%${keyword}%'
      `,
    ]);

    const products = Array.isArray(result[0]) ? result[0] : [];
    const totalCount = result[1]?.[0]?.total || 0;

    const data = products.map((item) => ({
      uuid: item.uuid,
      name: item.name,
      price: item.price,
      main_image: item.main_image || null,
    }));

    return {
      code: 200,
      data,
      pagination: {
        totalPage: Math.ceil(totalCount / limit),
        totalCount,
      },
    };
  } catch (error) {
    console.error("❌ Error in product list:", error);
    throw error;
  }
}

// ==================== CHI TIẾT SẢN PHẨM Admin ====================
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

// ==================== TẠO SẢN PHẨM Admin ====================
async function create(body) {
  try {
    const category_uuid = (body.category_uuid || "").trim();
    const name = (body.name || "").trim();
    const price = parseFloat(body.price) || 0;
    const description = body.description || "";
    const is_popular = parseInt(body.is_popular || 0);

    let images = [];
    let variants = [];

    if (typeof body.images === "string") {
      try {
        images = JSON.parse(body.images);
      } catch {
        images = [];
      }
    } else if (Array.isArray(body.images)) {
      images = body.images;
    }

    if (typeof body.variants === "string") {
      try {
        variants = JSON.parse(body.variants);
      } catch {
        variants = [];
      }
    } else if (Array.isArray(body.variants)) {
      variants = body.variants;
    }

    const [catCheck] = await db.execute(
      `SELECT 1 FROM categories WHERE uuid = ? LIMIT 1`,
      [category_uuid]
    );
    if (!catCheck || catCheck.length === 0) {
      return { code: 400, message: "Danh mục không tồn tại!" };
    }

    await db.execute(
      `INSERT INTO products (category_uuid, name, description, price, is_popular)
       VALUES (?, ?, ?, ?, ?)`,
      [category_uuid, name, description, price, is_popular]
    );

    const result = await db.execute(
      `SELECT uuid FROM products ORDER BY created_at DESC LIMIT 1`
    );

    if (!result || result.length === 0) {
      throw new Error(
        "Không thể lấy UUID sản phẩm vừa tạo! Kết quả query rỗng."
      );
    }

    const product_uuid = result[0].uuid;

    for (const [i, img] of images.entries()) {
      const url = img.url || "";
      if (!url) continue;
      await db.execute(
        `INSERT INTO product_images (product_uuid, url, is_main) VALUES (?, ?, ?)`,
        [product_uuid, url, i === 0 ? 1 : 0]
      );
    }

    for (const v of variants) {
      await db.execute(
        `INSERT INTO product_variants (product_uuid, size, gender, color, type, stock, price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          product_uuid,
          v.size || 0,
          v.gender || 0,
          v.color || 0,
          v.type || 0,
          v.stock || 0,
          parseFloat(v.price || 0),
        ]
      );
    }

    return {
      code: 201,
      message: "Tạo sản phẩm thành công!",
      data: { product_uuid },
    };
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return { code: 400, message: "Danh mục không tồn tại!" };
    }
    return { code: 500, message: `Lỗi: ${error.message}` };
  }
}

// ==================== CẬP NHẬT SẢN PHẨM Admin ====================
async function update(id, body, files = []) {
  try {
    const category_uuid = (body.category_uuid || "").trim();
    const name = (body.name || "").trim();
    const price = parseFloat(body.price) || 0;
    const description = body.description || "";
    const is_popular = parseInt(body.is_popular || 0);

    let images = [];
    let variants = [];

    // ✅ Parse images (từ JSON hoặc mảng)
    if (typeof body.images === "string") {
      try {
        images = JSON.parse(body.images);
      } catch {
        images = [];
      }
    } else if (Array.isArray(body.images)) {
      images = body.images;
    }

    // ✅ Parse variants (từ JSON hoặc mảng)
    if (typeof body.variants === "string") {
      try {
        variants = JSON.parse(body.variants);
      } catch {
        variants = [];
      }
    } else if (Array.isArray(body.variants)) {
      variants = body.variants;
    }

    // ✅ Cập nhật sản phẩm chính
    await db.execute(
      `UPDATE products
       SET category_uuid = ?, name = ?, description = ?, price = ?, is_popular = ?
       WHERE uuid = ?`,
      [category_uuid, name, description, price, is_popular, id]
    );

    // ===================== ẢNH =====================
    let uploadedImages = [];

    // Nếu có upload file mới thì upload và thay thế ảnh cũ
    if (files && files.length > 0) {
      const uploadResult = await uploadMultipleFile(files);
      uploadedImages = uploadResult.files || [];
    } else {
      // Nếu không upload file mới thì giữ nguyên ảnh từ body
      uploadedImages = images.map((img) => img.url).filter(Boolean);
    }

    // Xóa toàn bộ ảnh cũ
    await db.execute(`DELETE FROM product_images WHERE product_uuid = ?`, [id]);

    // Thêm lại ảnh mới
    for (const [i, url] of uploadedImages.entries()) {
      await db.execute(
        `INSERT INTO product_images (uuid, product_uuid, url, is_main)
         VALUES (?, ?, ?, ?)`,
        [uuidv4(), id, url, i === 0 ? 1 : 0]
      );
    }

    // ===================== VARIANTS =====================
    // Xóa toàn bộ variants cũ
    await db.execute(`DELETE FROM product_variants WHERE product_uuid = ?`, [
      id,
    ]);

    // Thêm lại variants mới
    for (const v of variants) {
      await db.execute(
        `INSERT INTO product_variants (uuid, product_uuid, size, gender, color, type, stock, price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          id,
          v.size || 0,
          v.gender || 0,
          v.color || 0,
          v.type || 0,
          v.stock || 0,
          parseFloat(v.price || 0),
        ]
      );
    }

    return {
      code: 200,
      message: "Cập nhật sản phẩm thành công!",
      data: { product_uuid: id },
    };
  } catch (error) {
    console.error("❌ Error in update product:", error);
    return {
      code: 500,
      message: `Lỗi khi cập nhật sản phẩm: ${error.message}`,
    };
  }
}

// ==================== XÓA SẢN PHẨM Admin ====================
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

// ==================== USER ====================

// ==================== LẤY DANH SÁCH SẢN PHẨM PHỔ BIẾN USER ====================
async function listForUser({ user_uuid, page = 1, limit = 10 }) {
  try {
    const offset = offsetUtils.getOffset(page, limit);

    const sqlList = `
      SELECT
        p.uuid,
        p.name,
        p.price,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_uuid = p.uuid AND pi.is_main = 1
          LIMIT 1
        ) AS main_image,
        CASE
          WHEN uf.user_uuid IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS is_favorite
      FROM products p
      LEFT JOIN user_favorites uf
        ON uf.product_uuid = p.uuid AND uf.user_uuid = ?
      WHERE p.is_popular = 1
      ORDER BY p.created_at DESC
      LIMIT ?, ?
    `;

    const sqlCount = `
      SELECT COUNT(*) AS total
      FROM products p
      WHERE p.is_popular = 1
    `;

    const rows = await db.execute(sqlList, [user_uuid, offset, limit]);
    const countResult = await db.execute(sqlCount);

    if (!rows || rows.length === 0) {
      return {
        code: 404,
        message: "Không tìm thấy sản phẩm phổ biến!",
        data: [],
        pagination: {
          totalPage: 0,
          totalCount: 0,
          currentPage: page,
        },
      };
    }

    const data = rows.map((p) => ({
      uuid: p.uuid,
      name: p.name,
      price: parseFloat(p.price),
      image: p.main_image || null,
      is_favorite: Boolean(p.is_favorite),
    }));

    const total = countResult[0]?.total || 0;

    return {
      code: 200,
      message: "Lấy danh sách sản phẩm phổ biến thành công!",
      data,
      pagination: {
        totalPage: Math.ceil(total / limit),
        totalCount: total,
        currentPage: page,
        limit,
      },
    };
  } catch (error) {
    return { code: 500, message: error.message || "Lỗi máy chủ!" };
  }
}

// ==================== LẤY TẤT CẢ SẢN PHẨM USER ====================
async function listAllForUser({
  user_uuid,
  page = 1,
  limit = 10,
  keyword = "",
  category = "",
}) {
  try {
    const offset = offsetUtils.getOffset(page, limit);

    const paramsList = [user_uuid];
    const paramsCount = [];

    // Xây dựng mệnh đề WHERE động
    let whereClause = " WHERE 1=1 ";
    if (keyword) {
      whereClause += " AND (p.name LIKE ? OR p.description LIKE ?) ";
      const keywordLike = `%${keyword}%`;
      paramsList.push(keywordLike, keywordLike);
      paramsCount.push(keywordLike, keywordLike);
    }
    if (category && category !== "Tất cả") {
      // Sẽ lọc các danh mục có chứa chữ "Nam", "Nữ", "Quần", "Áo"
      whereClause += " AND c.name LIKE ? ";
      const categoryLike = `%${category}%`;
      paramsList.push(categoryLike);
      paramsCount.push(categoryLike);
    }

    paramsList.push(offset, limit);

    const sqlList = `
      SELECT
        p.uuid,
        p.name,
        p.price,
        c.name AS categoryName, -- Thêm để Flutter lọc
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_uuid = p.uuid AND pi.is_main = 1
          LIMIT 1
        ) AS main_image,
        CASE
          WHEN uf.user_uuid IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS is_favorite
      FROM products p
      LEFT JOIN user_favorites uf
        ON uf.product_uuid = p.uuid AND uf.user_uuid = ?
      JOIN categories c ON p.category_uuid = c.uuid -- Thêm JOIN categories
      ${whereClause} -- Thêm WHERE động
      ORDER BY p.created_at DESC
      LIMIT ?, ?
    `;

    const sqlCount = `
      SELECT COUNT(*) AS total
      FROM products p
      JOIN categories c ON p.category_uuid = c.uuid -- Thêm JOIN categories
      ${whereClause} -- Thêm WHERE động
    `;

    // Thực thi 2 câu lệnh song song
    const [rows, countResult] = await Promise.all([
      db.execute(sqlList, paramsList),
      db.execute(sqlCount, paramsCount),
    ]);

    if (!rows || rows.length === 0) {
      return {
        code: 200,
        message: "Không tìm thấy sản phẩm!",
        data: [],
        pagination: { totalPage: 0, totalCount: 0, currentPage: page },
      };
    }

    const data = rows.map((p) => ({
      uuid: p.uuid,
      name: p.name,
      price: parseFloat(p.price),
      image: p.main_image || null,
      is_favorite: Boolean(p.is_favorite),
      categoryName: p.categoryName,
    }));

    const total = countResult[0]?.total || 0;

    return {
      code: 200,
      message: "Lấy danh sách tất cả sản phẩm thành công!",
      data,
      pagination: {
        totalPage: Math.ceil(total / limit),
        totalCount: total,
        currentPage: page,
        limit,
      },
    };
  } catch (error) {
    console.error("❌ Error in listAllForUser:", error);
    return { code: 500, message: error.message || "Lỗi máy chủ!" };
  }
}

// ==================== CHI TIẾT SẢN PHẨM USER ====================
async function detailProductUser({ product_uuid, user_uuid }) {
  try {
    const productSql = `
      SELECT
        p.uuid,
        p.name,
        p.description,
        p.price,
        CASE
          WHEN uf.user_uuid IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS is_favorite
      FROM products p
      LEFT JOIN user_favorites uf
        ON uf.product_uuid = p.uuid AND uf.user_uuid = ?
      WHERE p.uuid = ?
    `;

    const imagesSql = `
      SELECT
        pi.uuid,
        pi.url,
        pi.is_main
      FROM product_images pi
      WHERE pi.product_uuid = ?
      ORDER BY pi.is_main DESC, pi.created_at ASC
    `;

    const variantsSql = `
      SELECT
        pv.uuid AS variant_uuid,
        pv.size,
        pv.color,
        pv.stock
      FROM product_variants pv
      WHERE pv.product_uuid = ?
    `;

    const [productResult, imagesResult, variantsResult] = await Promise.all([
      db.execute(productSql, [user_uuid, product_uuid]),
      db.execute(imagesSql, [product_uuid]),
      db.execute(variantsSql, [product_uuid]),
    ]);

    if (!productResult || productResult.length === 0) {
      return { code: 404, message: "Không tìm thấy sản phẩm!" };
    }

    const product = productResult[0];

    const total_stock = variantsResult.reduce((total, v) => total + v.stock, 0);

    const data = {
      uuid: product.uuid,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      is_favorite: Boolean(product.is_favorite),
      total_stock: total_stock,
      images: imagesResult.map((img) => ({
        uuid: img.uuid,
        url: img.url,
        is_main: Boolean(img.is_main),
      })),
      variants: variantsResult.map((v) => ({
        variant_uuid: v.variant_uuid,
        size: v.size,
        color: v.color,
        stock: v.stock,
      })),
    };

    return {
      code: 200,
      message: "Lấy chi tiết sản phẩm thành công!",
      data: data,
    };
  } catch (error) {
    console.error("❌ Error in detailProductUser:", error);
    return { code: 500, message: error.message || "Lỗi máy chủ!" };
  }
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  listForUser,
  listAllForUser,
  detailProductUser,
};
