const db = require("../../utils/database");
const { signAccessToken, verifyRefreshToken } = require("../../utils/token");

async function register(body) {
  const { password, email, phone, name, gender, birth_day } = body;

  if (!password || !email || !phone || !name) {
    const error = new Error("Thiếu thông tin bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  const [exist] = await db.execute("SELECT uuid FROM user WHERE email = ?", [
    email,
  ]);
  if (exist) {
    const error = new Error("Email đã được sử dụng!");
    error.statusCode = 400;
    throw error;
  }

  await db.execute(
    `INSERT INTO user (uuid, username, password, email, phone, name, gender, birth_day, otp, status) 
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, '123456', 0)`,
    [
      email, // username = email
      password,
      email,
      phone,
      name,
      gender || null,
      birth_day || null,
    ]
  );

  return {
    code: 200,
    message: "Đăng ký thành công, vui lòng nhập OTP để kích hoạt.",
  };
}

async function verifyOtp(body) {
  const { email, otp } = body;

  const [user] = await db.execute(
    `SELECT * FROM user WHERE email = ? AND otp = ?`,
    [email, otp]
  );

  if (!user) {
    const error = new Error("OTP không chính xác!");
    error.statusCode = 400;
    throw error;
  }

  await db.execute(`UPDATE user SET status = 1, otp = NULL WHERE email = ?`, [
    email,
  ]);

  return {
    code: 200,
    message: "Xác minh OTP thành công, tài khoản đã được kích hoạt.",
  };
}

async function login(body) {
  const { email, password } = body;

  const [user] = await db.execute(`SELECT * FROM user WHERE email = ?`, [
    email,
  ]);
  if (!user) {
    const error = new Error("Tài khoản không tồn tại!");
    error.statusCode = 400;
    throw error;
  }

  if (user.password !== password) {
    const error = new Error("Sai mật khẩu!");
    error.statusCode = 401;
    throw error;
  }

  if (user.status === 0) {
    const error = new Error("Tài khoản chưa được kích hoạt!");
    error.statusCode = 403;
    throw error;
  }

  const tokens = await signAccessToken(user.uuid);

  await db.queryMultiple([
    `DELETE FROM token WHERE user_id = '${user.uuid}'`,
    `INSERT INTO token (uuid, user_id, access_token, refresh_token) 
     VALUES (UUID(), '${user.uuid}', '${tokens.access_token}', '${tokens.refresh_token}')`,
  ]);

  return {
    code: 200,
    message: "Đăng nhập thành công!",
    tokens,
  };
}

async function refreshToken(body) {
  try {
    if (!body.token) {
      const error = new Error("Thiếu thông tin bắt buộc!");
      error.statusCode = 400;
      throw error;
    }

    const payload = await verifyRefreshToken(body.token);
    const token = await signAccessToken(payload.id);

    await db.queryMultiple([
      `DELETE FROM \`token\` WHERE \`user_id\` = '${payload.id}'`,
      `
        INSERT INTO \`token\`(
          \`uuid\`,
          \`user_id\`,
          \`access_token\`,
          \`refresh_token\`
        )
        VALUES(
          uuid(),
          '${payload.id}',
          '${token.access_token}',
          '${token.refresh_token}'
        )
      `,
    ]);

    return {
      code: 200,
      data: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
      },
    };
  } catch (error) {
    throw error;
  }
}

async function changePassword(uuid, body) {
  try {
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      const error = new Error("Thiếu thông tin bắt buộc!");
      error.statusCode = 400;
      throw error;
    }

    const [user] = await db.execute(
      `SELECT uuid FROM user WHERE uuid = ? AND password = ?`,
      [uuid, oldPassword]
    );

    if (!user) {
      const error = new Error("Mật khẩu cũ không chính xác!");
      error.statusCode = 401;
      throw error;
    }

    await db.execute(`UPDATE user SET password = ? WHERE uuid = ?`, [
      newPassword,
      uuid,
    ]);

    return {
      code: 200,
      message: "Đổi mật khẩu thành công!",
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  register,
  verifyOtp,
  login,
  refreshToken,
  changePassword,
};
