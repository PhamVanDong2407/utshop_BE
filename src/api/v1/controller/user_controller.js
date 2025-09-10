const db = require("../../utils/database");

async function getDetailInfo(id) {
  try {
    const [result] = await db.execute(
      `
      SELECT
        \`user\`.\`uuid\`,
        \`user\`.\`name\`,
        \`user\`.\`avatar\`,
        \`user\`.\`gender\`,
        \`user\`.\`birth_day\`,
        \`user\`.\`phone\`,
        \`user\`.\`email\`,
        \`user\`.\`created_at\`,
        \`user\`.\`updated_at\`,
        \`user\`.\`status\`,
        \`permission\`.\`uuid\` AS \`p_uuid\`,
        \`permission\`.\`name\` AS \`p_name\`
      FROM
        \`user\`
      LEFT JOIN \`permission\` ON \`permission\`.\`uuid\` = \`user\`.\`permission_id\`
      WHERE
        \`user\`.\`uuid\` = ?
    `,
      [id]
    );

    const data =
      result == null
        ? null
        : {
            uuid: result.uuid,
            name: result.name,
            avatar: result.avatar,
            gender: result.gender,
            birth_day: result.birth_day,
            phone: result.phone,
            email: result.email,
            created_at: result.created_at,
            updated_at: result.updated_at,
            status: result.status,
            permission: {
              uuid: result.p_uuid,
              name: result.p_name,
            },
          };

    return {
      code: 200,
      data: data,
    };
  } catch (error) {
    throw error;
  }
}

module.exports = { getDetailInfo };
