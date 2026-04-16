const SkillExchange = require("../models/SkillExchange");

const createSkillExchange = async (req, res) => {
  try {
    const {
      offerSkill,
      wantSkill,
      offerDescription,
      wantDescription,
      offerLevel,
      wantedLevel,
      mode,
      availability,
    } = req.body;

    if (!offerSkill || !wantSkill) {
      return res.status(400).json({
        message: "offerSkill and wantSkill are required",
      });
    }

    const exchange = await SkillExchange.create({
      owner: req.user._id,
      offerSkill: offerSkill.trim(),
      wantSkill: wantSkill.trim(),
      offerDescription: offerDescription?.trim() || "",
      wantDescription: wantDescription?.trim() || "",
      offerLevel: offerLevel || "beginner",
      wantedLevel: wantedLevel || "any",
      mode: mode || "online",
      availability: Array.isArray(availability) ? availability : [],
    });

    const populatedExchange = await SkillExchange.findById(exchange._id).populate(
      "owner",
      "name email publicId badge ratingAvg ratingCount department semester"
    );

    res.status(201).json({
      message: "Skill exchange post created successfully",
      exchange: populatedExchange,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllSkillExchanges = async (req, res) => {
  try {
    const exchanges = await SkillExchange.find({ status: { $ne: "closed" } })
      .populate(
        "owner",
        "name email publicId badge ratingAvg ratingCount department semester"
      )
      .sort({ createdAt: -1 });

    res.json(exchanges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMySkillExchanges = async (req, res) => {
  try {
    const exchanges = await SkillExchange.find({ owner: req.user._id })
      .populate(
        "owner",
        "name email publicId badge ratingAvg ratingCount department semester"
      )
      .sort({ createdAt: -1 });

    res.json(exchanges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSkillExchangeStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["open", "matched", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const exchange = await SkillExchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({ message: "Skill exchange not found" });
    }

    if (String(exchange.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    exchange.status = status;
    await exchange.save();

    res.json({
      message: "Skill exchange status updated successfully",
      exchange,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSkillExchange = async (req, res) => {
  try {
    const exchange = await SkillExchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({ message: "Skill exchange not found" });
    }

    if (String(exchange.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await exchange.deleteOne();

    res.json({ message: "Skill exchange deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSkillExchange,
  getAllSkillExchanges,
  getMySkillExchanges,
  updateSkillExchangeStatus,
  deleteSkillExchange,
};