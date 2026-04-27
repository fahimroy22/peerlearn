const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const { getAllChats } = require("../controllers/chatController");

router.get("/", authMiddleware, getAllChats);

module.exports = router;