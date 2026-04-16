const ExchangeConversation = require("../models/ExchangeConversation");
const ExchangeRequest = require("../models/ExchangeRequest");

const getMyExchangeConversations = async (req, res) => {
  try {
    const conversations = await ExchangeConversation.find({
      $or: [{ userOne: req.user._id }, { userTwo: req.user._id }],
    })
      .populate("userOne", "name email publicId")
      .populate("userTwo", "name email publicId")
      .populate("request")
      .populate("exchange")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrCreateConversationForRequest = async (req, res) => {
  try {
    const exchangeRequest = await ExchangeRequest.findById(req.params.requestId)
      .populate("exchange")
      .populate("sender", "name email publicId")
      .populate("receiver", "name email publicId");

    if (!exchangeRequest) {
      return res.status(404).json({ message: "Exchange request not found" });
    }

    const isAllowed =
      String(exchangeRequest.sender?._id) === String(req.user._id) ||
      String(exchangeRequest.receiver?._id) === String(req.user._id);

    if (!isAllowed) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (exchangeRequest.status !== "accepted") {
      return res.status(400).json({
        message: "Conversation can only be opened after request is accepted",
      });
    }

    let conversation = await ExchangeConversation.findOne({
      request: exchangeRequest._id,
    })
      .populate("userOne", "name email publicId")
      .populate("userTwo", "name email publicId")
      .populate("request")
      .populate("exchange");

    if (!conversation) {
      conversation = await ExchangeConversation.create({
        exchange: exchangeRequest.exchange?._id,
        request: exchangeRequest._id,
        userOne: exchangeRequest.sender?._id,
        userTwo: exchangeRequest.receiver?._id,
      });

      conversation = await ExchangeConversation.findById(conversation._id)
        .populate("userOne", "name email publicId")
        .populate("userTwo", "name email publicId")
        .populate("request")
        .populate("exchange");
    }

    res.json(conversation);
  } catch (error) {
    if (error.code === 11000) {
      const existingConversation = await ExchangeConversation.findOne({
        request: req.params.requestId,
      })
        .populate("userOne", "name email publicId")
        .populate("userTwo", "name email publicId")
        .populate("request")
        .populate("exchange");

      return res.json(existingConversation);
    }

    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyExchangeConversations,
  getOrCreateConversationForRequest,
};