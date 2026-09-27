const express = require("express");
const accountController = require("../controllers/accountController");

const router = express.Router();

router.get("/", accountController.findAll);

router.get("/:maTaiKhoan", accountController.findOne);

router.post("/", accountController.create);

router.put("/:maTaiKhoan", accountController.update);

router.delete("/:maTaiKhoan", accountController.remove);

module.exports = router;