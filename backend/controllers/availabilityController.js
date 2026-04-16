const User = require("../models/User");

const allowedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const normalizeAvailability = (availability = []) => {
  if (!Array.isArray(availability)) return [];

  return availability
    .filter((item) => item && allowedDays.includes(item.day))
    .map((item) => ({
      day: item.day,
      slots: Array.isArray(item.slots)
        ? item.slots
            .filter((slot) => slot?.start && slot?.end)
            .map((slot) => ({
              start: String(slot.start).trim(),
              end: String(slot.end).trim(),
            }))
        : [],
    }));
};

const getAvailability = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("availability");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.availability || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.availability = normalizeAvailability(availability);
    await user.save();

    res.json({
      message: "Availability updated successfully",
      availability: user.availability,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAvailability,
  updateAvailability,
};