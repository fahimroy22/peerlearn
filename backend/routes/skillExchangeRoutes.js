const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createSkillExchange,
  getAllSkillExchanges,
  getMySkillExchanges,
  updateSkillExchangeStatus,
  deleteSkillExchange,
} = require("../controllers/skillExchangeController");

router.get("/", getAllSkillExchanges);
router.get("/my-posts", authMiddleware, getMySkillExchanges);
router.post("/", authMiddleware, createSkillExchange);
router.patch("/:id/status", authMiddleware, updateSkillExchangeStatus);
router.delete("/:id", authMiddleware, deleteSkillExchange);

module.exports = router;