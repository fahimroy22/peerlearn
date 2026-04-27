const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  checkEmail,
  registerUser,
  loginUser,
  logoutUser,
} = require("../controllers/authController");

router.post("/check-email", checkEmail);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authMiddleware, logoutUser);

module.exports = router;