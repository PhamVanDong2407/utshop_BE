const express = require("express");
const router = express.Router();
const controller = require("../../controller/DeliveryAddress/delivery_address_controller");
const { checkLogin } = require("../../../middleware/check_login");

router.get("/", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.getAllAddresses({
      userId: req.user.uuid,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/", checkLogin, async (req, res, next) => {
  try {
    const result = await controller.createAddress({
      userId: req.user.uuid,
      addressData: req.body,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put("/:uuid", checkLogin, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const result = await controller.updateAddress({
      userId: req.user.uuid,
      addressUuid: uuid,
      addressData: req.body,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:uuid", checkLogin, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const result = await controller.removeAddress({
      userId: req.user.uuid,
      addressUuid: uuid,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
