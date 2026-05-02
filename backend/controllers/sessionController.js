const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Session = require("../models/Session");
const LearnRequest = require("../models/LearnRequest");
const ExchangeRequest = require("../models/ExchangeRequest");
const User = require("../models/User");
const { createAndEmitNotification } = require("./notificationController");

const DAY_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseTimeToMinutes = (time) => {
  if (!time || !time.includes(":")) return null;

  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
};

const parseLocalDateTime = (value) => {
  if (!value) return null;

  const normalized = String(value).trim();

  // Handles datetime-local format: 2026-05-11T14:00
  if (normalized.includes("T")) {
    const [datePart, timePart] = normalized.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.slice(0, 5).split(":").map(Number);

    if (
      [year, month, day, hour, minute].some(Number.isNaN) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    const date = new Date(year, month - 1, day, hour, minute);

    return {
      date,
      dayName: DAY_MAP[date.getDay()],
      minutes: hour * 60 + minute,
    };
  }

  // Fallback for ISO/date strings
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  return {
    date,
    dayName: DAY_MAP[date.getDay()],
    minutes: date.getHours() * 60 + date.getMinutes(),
  };
};

const isWithinTutorAvailability = (availability = [], startTime, endTime) => {
  const start = parseLocalDateTime(startTime);
  const end = parseLocalDateTime(endTime);

  if (!start || !end) return false;
  if (end.date <= start.date) return false;
  if (start.dayName !== end.dayName) return false;

  const matchingDay = availability.find((item) => item.day === start.dayName);

  if (
    !matchingDay ||
    !Array.isArray(matchingDay.slots) ||
    matchingDay.slots.length === 0
  ) {
    return false;
  }

  return matchingDay.slots.some((slot) => {
    const slotStart = parseTimeToMinutes(slot.start);
    const slotEnd = parseTimeToMinutes(slot.end);

    if (slotStart === null || slotEnd === null) return false;

    return start.minutes >= slotStart && end.minutes <= slotEnd;
  });
};

const validateSessionModeFields = ({ deliveryMode, roomUrl, location }) => {
  const normalizedDeliveryMode = deliveryMode === "offline" ? "offline" : "online";
  const normalizedRoomUrl = String(roomUrl || "").trim();
  const normalizedLocation = String(location || "").trim();

  if (normalizedDeliveryMode === "online") {
    if (!normalizedRoomUrl) {
      return {
        isValid: false,
        message: "Google Meet link is required for online sessions",
      };
    }

    if (!normalizedRoomUrl.includes("meet.google.com")) {
      return {
        isValid: false,
        message: "Only Google Meet links are allowed for online sessions",
      };
    }
  }

  if (normalizedDeliveryMode === "offline") {
    if (!normalizedLocation) {
      return {
        isValid: false,
        message: "Location is required for offline sessions",
      };
    }
  }

  return {
    isValid: true,
    deliveryMode: normalizedDeliveryMode,
    roomUrl: normalizedDeliveryMode === "online" ? normalizedRoomUrl : "",
    location: normalizedDeliveryMode === "offline" ? normalizedLocation : "",
  };
};

const getObjectIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
};

const getParticipantRole = (session, userId) => {
  const tutorId = getObjectIdString(session.tutor);
  const learnerId = getObjectIdString(session.learner);
  const currentUserId = String(userId);

  if (tutorId === currentUserId) return "tutor";
  if (learnerId === currentUserId) return "learner";
  return null;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
};

const getSessionSkillLabel = (session) => {
  if (session.sessionType === "exchange") {
    const offerSkill = session.exchangeRequest?.exchange?.offerSkill || "Exchange";
    const wantSkill = session.exchangeRequest?.exchange?.wantSkill || "Skill";
    return `${offerSkill} ↔ ${wantSkill}`;
  }

  return session.request?.listing?.skillName || "Session";
};

const buildVerificationUrl = (sessionId) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl}/session-verification/${sessionId}`;
};

const createSession = async (req, res) => {
  try {
    const {
      requestId,
      startTime,
      endTime,
      roomUrl,
      deliveryMode = "online",
      location = "",
    } = req.body;

    if (!requestId || !startTime || !endTime) {
      return res.status(400).json({
        message: "requestId, startTime and endTime are required",
      });
    }

    const modeValidation = validateSessionModeFields({
      deliveryMode,
      roomUrl,
      location,
    });

    if (!modeValidation.isValid) {
      return res.status(400).json({ message: modeValidation.message });
    }

    const request = await LearnRequest.findById(requestId).populate(
      "learner",
      "name email publicId"
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.tutor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the tutor can create a session" });
    }

    if (request.status !== "accepted") {
      return res.status(400).json({ message: "Request must be accepted first" });
    }

    const existingSession = await Session.findOne({ request: request._id });

    if (existingSession) {
      return res.status(400).json({ message: "Session already exists for this request" });
    }

    const tutor = await User.findById(request.tutor).select("availability");
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    if (!isWithinTutorAvailability(tutor.availability || [], startTime, endTime)) {
      return res.status(400).json({
        message: "Selected session time must fit within tutor availability",
      });
    }

    const session = await Session.create({
      sessionType: "regular",
      request: request._id,
      tutor: request.tutor,
      learner: request.learner,
      startTime,
      endTime,
      deliveryMode: modeValidation.deliveryMode,
      roomUrl: modeValidation.roomUrl,
      location: modeValidation.location,
      status: "scheduled",
    });

    const io = req.app.get("io");
    await createAndEmitNotification({
      io,
      recipient: request.learner._id.toString(),
      actor: req.user._id,
      type: "session_created",
      title: "Session created",
      message:
        modeValidation.deliveryMode === "offline"
          ? `${req.user.name} scheduled your offline session.`
          : `${req.user.name} scheduled your online session.`,
      link: `/chat/${session._id}`,
      meta: { sessionId: session._id, requestId: request._id },
    });

    res.status(201).json({
      message: "Session created successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createExchangeSession = async (req, res) => {
  try {
    const {
      exchangeRequestId,
      startTime,
      endTime,
      roomUrl,
      deliveryMode = "online",
      location = "",
    } = req.body;

    if (!exchangeRequestId || !startTime || !endTime) {
      return res.status(400).json({
        message: "exchangeRequestId, startTime and endTime are required",
      });
    }

    const modeValidation = validateSessionModeFields({
      deliveryMode,
      roomUrl,
      location,
    });

    if (!modeValidation.isValid) {
      return res.status(400).json({ message: modeValidation.message });
    }

    const exchangeRequest = await ExchangeRequest.findById(exchangeRequestId)
      .populate("exchange")
      .populate("sender")
      .populate("receiver");

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
        message: "Exchange request must be accepted first",
      });
    }

    const existingSession = await Session.findOne({
      exchangeRequest: exchangeRequest._id,
    });

    if (existingSession) {
      return res.status(400).json({
        message: "Exchange session already exists for this request",
      });
    }

    const ownerId = exchangeRequest.exchange?.owner?.toString();
    const otherUserId =
      String(exchangeRequest.sender?._id) === ownerId
        ? exchangeRequest.receiver?._id
        : exchangeRequest.sender?._id;

    const tutorId = exchangeRequest.exchange?.owner?._id || exchangeRequest.receiver?._id;
    const learnerId = otherUserId;

    const tutor = await User.findById(tutorId).select("availability");
    if (!tutor) {
      return res.status(404).json({ message: "Exchange owner not found" });
    }

    if (!isWithinTutorAvailability(tutor.availability || [], startTime, endTime)) {
      return res.status(400).json({
        message: "Selected session time must fit within owner availability",
      });
    }

    const session = await Session.create({
      sessionType: "exchange",
      exchangeRequest: exchangeRequest._id,
      tutor: tutorId,
      learner: learnerId,
      startTime,
      endTime,
      deliveryMode: modeValidation.deliveryMode,
      roomUrl: modeValidation.roomUrl,
      location: modeValidation.location,
      status: "scheduled",
    });

    const recipientId =
      String(tutorId) === String(req.user._id) ? learnerId : tutorId;

    const io = req.app.get("io");
    await createAndEmitNotification({
      io,
      recipient: recipientId.toString(),
      actor: req.user._id,
      type: "session_created",
      title: "Exchange session created",
      message:
        modeValidation.deliveryMode === "offline"
          ? `${req.user.name} scheduled your offline exchange session.`
          : `${req.user.name} scheduled your online exchange session.`,
      link: `/sessions`,
      meta: { sessionId: session._id, exchangeRequestId: exchangeRequest._id },
    });

    res.status(201).json({
      message: "Exchange session created successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      $or: [{ tutor: req.user._id }, { learner: req.user._id }],
    })
      .populate("tutor", "name email publicId badge ratingAvg ratingCount availability")
      .populate("learner", "name email publicId")
      .populate({
        path: "request",
        populate: {
          path: "listing",
          select: "skillName",
        },
      })
      .populate({
        path: "exchangeRequest",
        populate: [
          {
            path: "exchange",
            populate: {
              path: "owner",
              select: "name email publicId",
            },
          },
          { path: "sender", select: "name email publicId" },
          { path: "receiver", select: "name email publicId" },
        ],
      })
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const completeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.tutor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the tutor can mark this session as completed",
      });
    }

    if (session.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled sessions cannot be completed" });
    }

    session.status = "completed";
    await session.save();

    res.json({
      message: "Session marked as completed",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rescheduleSession = async (req, res) => {
  try {
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "startTime and endTime are required",
      });
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const isTutor = session.tutor.toString() === req.user._id.toString();
    const isLearner = session.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (session.status === "completed") {
      return res.status(400).json({ message: "Completed sessions cannot be rescheduled" });
    }

    if (session.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled sessions cannot be rescheduled" });
    }

    const tutor = await User.findById(session.tutor).select("availability");
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    if (!isWithinTutorAvailability(tutor.availability || [], startTime, endTime)) {
      return res.status(400).json({
        message: "Selected session time must fit within tutor availability",
      });
    }

    session.startTime = startTime;
    session.endTime = endTime;
    session.status = "scheduled";
    await session.save();

    res.json({
      message: "Session rescheduled successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const cancelSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const isTutor = session.tutor.toString() === req.user._id.toString();
    const isLearner = session.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (session.status === "completed") {
      return res.status(400).json({ message: "Completed sessions cannot be cancelled" });
    }

    session.status = "cancelled";
    await session.save();

    res.json({
      message: "Session cancelled successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const isTutor = session.tutor.toString() === req.user._id.toString();
    const isLearner = session.learner.toString() === req.user._id.toString();

    if (!isTutor && !isLearner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!["completed", "cancelled"].includes(session.status)) {
      return res.status(400).json({
        message: "Only completed or cancelled sessions can be deleted",
      });
    }

    await session.deleteOne();

    res.json({
      message: "Session deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSessionVerification = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate("tutor", "name email publicId")
      .populate("learner", "name email publicId")
      .populate({
        path: "request",
        populate: {
          path: "listing",
          select: "skillName",
        },
      })
      .populate({
        path: "exchangeRequest",
        populate: [
          {
            path: "exchange",
            populate: {
              path: "owner",
              select: "name email publicId",
            },
          },
          { path: "sender", select: "name email publicId" },
          { path: "receiver", select: "name email publicId" },
        ],
      });

    if (!session) {
      return res.status(404).json({
        valid: false,
        message: "Session not found",
      });
    }

    res.json({
      valid: true,
      session: {
        _id: session._id,
        sessionType: session.sessionType,
        skill: getSessionSkillLabel(session),
        status: session.status,
        deliveryMode: session.deliveryMode || "online",
        roomUrl: session.deliveryMode === "online" ? session.roomUrl || "" : "",
        location: session.deliveryMode === "offline" ? session.location || "" : "",
        startTime: session.startTime,
        endTime: session.endTime,
        createdAt: session.createdAt,
        tutor: {
          name: session.tutor?.name || "N/A",
          email: session.tutor?.email || "N/A",
          publicId: session.tutor?.publicId || "N/A",
        },
        learner: {
          name: session.learner?.name || "N/A",
          email: session.learner?.email || "N/A",
          publicId: session.learner?.publicId || "N/A",
        },
        exchange:
          session.sessionType === "exchange"
            ? {
                offerSkill: session.exchangeRequest?.exchange?.offerSkill || "",
                wantSkill: session.exchangeRequest?.exchange?.wantSkill || "",
                owner: session.exchangeRequest?.exchange?.owner?.name || "",
              }
            : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      valid: false,
      message: error.message,
    });
  }
};

const downloadSessionToken = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate("tutor", "name email publicId")
      .populate("learner", "name email publicId")
      .populate({
        path: "request",
        populate: {
          path: "listing",
          select: "skillName",
        },
      })
      .populate({
        path: "exchangeRequest",
        populate: [
          {
            path: "exchange",
            populate: {
              path: "owner",
              select: "name email publicId",
            },
          },
          { path: "sender", select: "name email publicId" },
          { path: "receiver", select: "name email publicId" },
        ],
      });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const participantRole = getParticipantRole(session, req.user._id);
    if (!participantRole) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const verificationUrl = buildVerificationUrl(session._id);
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    });

    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(qrBase64, "base64");

    const skillLabel = getSessionSkillLabel(session);
    const fileName = `peerlearn-session-token-${session._id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    doc.pipe(res);

    doc.fontSize(22).text("PeerLearn Session Confirmation Token", {
      align: "center",
    });

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .text("This document serves as proof of confirmed session scheduling.", {
        align: "center",
      });

    doc.moveDown(1.2);

    doc.fontSize(16).text("Session Summary", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Session ID: ${session._id}`);
    doc.text(`Session Category: ${session.sessionType === "exchange" ? "Exchange" : "Regular"}`);
    doc.text(`Skill: ${skillLabel}`);
    doc.text(`Status: ${session.status}`);
    doc.text(`Delivery Mode: ${session.deliveryMode}`);
    doc.text(`Start Time: ${formatDateTime(session.startTime)}`);
    doc.text(`End Time: ${formatDateTime(session.endTime)}`);
    doc.text(`Created At: ${formatDateTime(session.createdAt)}`);

    if (session.deliveryMode === "online") {
      doc.text(`Meeting Link: ${session.roomUrl || "N/A"}`);
    } else {
      doc.text(`Location: ${session.location || "N/A"}`);
    }

    doc.moveDown(1);

    doc.fontSize(16).text("Tutor Information", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Name: ${session.tutor?.name || "N/A"}`);
    doc.text(`Email: ${session.tutor?.email || "N/A"}`);
    doc.text(`User ID: ${session.tutor?.publicId || "N/A"}`);

    doc.moveDown(1);

    doc.fontSize(16).text("Learner Information", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Name: ${session.learner?.name || "N/A"}`);
    doc.text(`Email: ${session.learner?.email || "N/A"}`);
    doc.text(`User ID: ${session.learner?.publicId || "N/A"}`);

    if (session.sessionType === "exchange") {
      doc.moveDown(1);
      doc.fontSize(16).text("Exchange Details", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(
        `Offer Skill: ${session.exchangeRequest?.exchange?.offerSkill || "N/A"}`
      );
      doc.text(
        `Wanted Skill: ${session.exchangeRequest?.exchange?.wantSkill || "N/A"}`
      );
      doc.text(
        `Exchange Owner: ${session.exchangeRequest?.exchange?.owner?.name || "N/A"}`
      );
    }

    doc.moveDown(1.2);
    doc.fontSize(16).text("QR Verification", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text("Scan this QR code to verify the session.");
    doc.moveDown(0.4);

    const qrX = doc.page.width - 180;
    const qrY = doc.y;
    doc.image(qrBuffer, qrX, qrY, { width: 110 });

    doc.text(`Verification URL: ${verificationUrl}`, 50, qrY + 120, {
      width: 480,
    });

    doc.moveDown(8);

    doc
      .fontSize(10)
      .text(`Downloaded by: ${req.user?.name || "User"} (${participantRole})`, {
        align: "left",
      });

    doc.end();
  } catch (error) {
    console.error("downloadSessionToken error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = {
  createSession,
  createExchangeSession,
  getMySessions,
  completeSession,
  rescheduleSession,
  cancelSession,
  deleteSession,
  getSessionVerification,
  downloadSessionToken,
};