const { writeFileSync } = require("fs"); // Ghi lỗi vào file log.txt
const express = require("express");
const cors = require("cors"); // Thêm middleware CORS để cho phép truy cập từ các nguồn khác nhau (trong trường hợp frontend và backend không cùng nguồn)
require("dotenv").config(); // Load biến môi trường từ file .env

// Setup server
const app = express();
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());

// Test server
app.get("/", (req, res, next) => {
  res.json({ code: 200, message: "ok" });
});

// Router version
app.use("/resources", express.static(__dirname + "/resources"));
app.use("/v1", require("./api/v1/main"));

// Not found
app.use("*", (req, res, next) => {
  res.status(404).json({ code: 404, message: "Not found" });
});

// Error response
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  writeFileSync(
    "./src/api/log/log.txt",
    `============================================================================
        ${Date()}
        message: ${err.message}
        stack: ${err.stack}\n`,
    { flag: "a" }
  );
  res.status(statusCode).json({
    code: statusCode,
    message: err.message,
  });
});

// Server on
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}/`);
});
