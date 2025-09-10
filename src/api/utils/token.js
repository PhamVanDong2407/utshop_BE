const jwt = require("jsonwebtoken");
require("dotenv").config();

function signAccessToken(accountId) {
  return new Promise((resolve, reject) => {
    const payload = {
      id: accountId,
    };
    const secret = process.env.SECRET_KEY_AT;
    const options = {
      expiresIn: "30m",
    };
    jwt.sign(payload, secret, options, async (err, token) => {
      if (err) {
        reject(err);
      }
      rt = await signRefreshToken(accountId);
      resolve({
        access_token: token,
        refresh_token: rt,
      });
    });
  });
}

function verifyAccessToken(token) {
  return new Promise((resolve, reject) => {
    const secret = process.env.SECRET_KEY_AT;
    jwt.verify(token, secret, (err, payload) => {
      if (err) {
        err.statusCode = 401;
        reject(err);
      }
      resolve(payload);
    });
  });
}

function signRefreshToken(accountId) {
  return new Promise((resolve, reject) => {
    const payload = {
      id: accountId,
    };
    const secret = process.env.SECRET_KEY_RT;
    const options = {
      expiresIn: "30d",
    };
    jwt.sign(payload, secret, options, (err, token) => {
      if (err) {
        reject(err);
      }
      resolve(token);
    });
  });
}

function verifyRefreshToken(token) {
  return new Promise((resolve, reject) => {
    const secret = process.env.SECRET_KEY_RT;
    jwt.verify(token, secret, (err, payload) => {
      if (err) {
        err.statusCode = 401;
        reject(err);
      }
      resolve(payload);
    });
  });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
};
