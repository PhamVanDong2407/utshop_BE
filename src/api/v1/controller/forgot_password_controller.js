const db = require("../../utils/database");

async function forgotPassword(body) {
  try {
    const { email } = body;

    if (!email) {
      const error = new Error("Thiếu thông tin bắt buộc!");
      error.statusCode = 400;
      throw error;
    }

    const [user] = await db.execute("SELECT * FROM user WHERE email = ?", [
      email,
    ]);
    if (!user) {
      const error = new Error("Email không tồn tại!");
      error.statusCode = 404;
      throw error;
    }

    // Cập nhật OTP mặc định
    await db.execute("UPDATE user SET otp = ? WHERE email = ?", [
      "123456",
      email,
    ]);

    return {
      code: 200,
      message: "OTP đã được gửi qua email!",
    };
  } catch (error) {
    throw error;
  }
}

async function verifyForgotPasswordOtp(body) {
  try {
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

    await db.execute(`UPDATE user SET otp = NULL WHERE email = ?`, [email]);

    return {
      code: 200,
      message: "Xác minh OTP thành công, bạn có thể đặt lại mật khẩu.",
    };
  } catch (error) {
    throw error;
  }
}

async function resetPassword(body) {
  try {
    const { email, password, confirmPassword } = body;

    if (!email || !password || !confirmPassword) {
      const error = new Error("Thiếu thông tin bắt buộc!");
      error.statusCode = 400;
      throw error;
    }

    if (password !== confirmPassword) {
      const error = new Error("Mật khẩu xác nhận không khớp!");
      error.statusCode = 400;
      throw error;
    }

    const [user] = await db.execute("SELECT * FROM user WHERE email = ?", [
      email,
    ]);
    if (!user) {
      const error = new Error("Email không tồn tại!");
      error.statusCode = 404;
      throw error;
    }

    await db.execute(
      "UPDATE user SET password = ?, otp = NULL WHERE email = ?",
      [password, email]
    );

    return {
      code: 200,
      message: "Đặt lại mật khẩu thành công!",
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
};
