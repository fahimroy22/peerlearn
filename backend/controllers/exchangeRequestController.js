const ExchangeRequest = require("../models/ExchangeRequest");
const SkillExchange = require("../models/SkillExchange");
const ExchangeConversation = require("../models/ExchangeConversation");
const { createAndEmitNotification } = require("./notificationController");

const createExchangeRequest = async (req, res) => {
  try {
    const { exchangeId, message } = req.body;

    if (!exchangeId) {
      return res.status(400).json({ message: "exchangeId is required" });
    }

    const exchange = await SkillExchange.findById(exchangeId);

    if (!exchange) {
      return res.status(404).json({ message: "Skill exchange post not found" });
    }

    if (String(exchange.owner) === String(req.user._id)) {
      return res.status(400).json({
        message: "You cannot send a request to your own exchange post",
      });
    }

    if (exchange.status !== "open") {
      return res.status(400).json({
        message: "This exchange post is not open for requests",
      });
    }

    const existingRequest = await ExchangeRequest.findOne({
      exchange: exchangeId,
      sender: req.user._id,
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Exchange request already sent" });
    }

    const exchangeRequest = await ExchangeRequest.create({
      exchange: exchangeId,
      sender: req.user._id,
      receiver: exchange.owner,
      message: message?.trim() || "I would like to exchange skills with you.",
    });

    const populatedRequest = await ExchangeRequest.findById(exchangeRequest._id)
      .populate("sender", "name email publicId")
      .populate("receiver", "name email publicId")
      .populate({
        path: "exchange",
        populate: {
          path: "owner",
          select: "name email publicId",
        },
      });

    const io = req.app.get("io");
    await createAndEmitNotification({
      io,
      recipient: exchange.owner.toString(),
      actor: req.user._id,
      type: "exchange_request",
      title: "New exchange request",
      message: `${req.user.name} wants to exchange skills with you.`,
      link: "/skill-exchange",
      meta: { exchangeRequestId: exchangeRequest._id, exchangeId },
    });

    res.status(201).json({
      message: "Exchange request sent successfully",
      request: populatedRequest,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Exchange request already sent" });
    }

    res.status(500).json({ message: error.message });
  }
};

const getMyReceivedExchangeRequests = async (req, res) => {
  try {
    const requests = await ExchangeRequest.find({ receiver: req.user._id })
      .populate("sender", "name email publicId")
      .populate("receiver", "name email publicId")
      .populate({
        path: "exchange",
        populate: {
          path: "owner",
          select: "name email publicId",
        },
      })
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMySentExchangeRequests = async (req, res) => {
  try {
    const requests = await ExchangeRequest.find({ sender: req.user._id })
      .populate("sender", "name email publicId")
      .populate("receiver", "name email publicId")
      .populate({
        path: "exchange",
        populate: {
          path: "owner",
          select: "name email publicId",
        },
      })
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptExchangeRequest = async (req, res) => {
  try {
    const request = await ExchangeRequest.findById(req.params.id)
      .populate("exchange")
      .populate("sender", "name email publicId")
      .populate("receiver", "name email publicId");

    if (!request) {
      return res.status(404).json({ message: "Exchange request not found" });
    }

    if (String(request.receiver._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "accepted";
    await request.save();

    if (request.exchange) {
      request.exchange.status = "matched";
      await request.exchange.save();
    }

    await ExchangeConversation.findOneAndUpdate(
      {
        exchange: request.exchange._id,
        request: request._id,
      },
      {
        exchange: request.exchange._id,
        request: request._id,
        userOne: request.sender._id,
        userTwo: request.receiver._id,
        status: "active",
      },
      { new: true, upsert: true }
    );

    const io = req.app.get("io");
    await createAndEmitNotification({
      io,
      recipient: request.sender._id.toString(),
      actor: req.user._id,
      type: "exchange_request_accepted",
      title: "Exchange request accepted",
      message: `${req.user.name} accepted your exchange request.`,
      link: "/skill-exchange",
      meta: { exchangeRequestId: request._id, exchangeId: request.exchange._id },
    });

    res.json({
      message: "Exchange request accepted successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectExchangeRequest = async (req, res) => {
  try {
    const request = await ExchangeRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Exchange request not found" });
    }

    if (String(request.receiver) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "rejected";
    await request.save();

    res.json({
      message: "Exchange request rejected successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createExchangeRequest,
  getMyReceivedExchangeRequests,
  getMySentExchangeRequests,
  acceptExchangeRequest,
  rejectExchangeRequest,
};