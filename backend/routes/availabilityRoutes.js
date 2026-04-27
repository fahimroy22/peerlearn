const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getAvailability,
  updateAvailability,
} = require("../controllers/availabilityController");

router.get("/:id", getAvailability);
router.patch("/", authMiddleware, updateAvailability);

module.exports = router;