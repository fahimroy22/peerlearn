const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const allowedDepartments = [
  "CSE",
  "Civil",
  "EEE",
  "Mechanical",
  "BBA",
  "English",
  "MBA",
  "Diploma in Cyber Security",
  "Islamic Studies",
  "MA in English",
  "Public Health",
];

const allowedSemesters = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
];

const allowedEmailDomains = [
  "gmail.com",
  "icloud.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "edu",
  "ac.bd",
];

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const isValidEmailDomain = (email) => {
  const normalized = email.trim().toLowerCase();
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!basicEmailRegex.test(normalized)) return false;

  const domain = normalized.split("@")[1];

  return allowedEmailDomains.some(
    (allowedDomain) =>
      domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
  );
};

const isValidStudentId = (studentId) => /^\d{8}$/.test(studentId);

const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    res.json({
      exists: Boolean(user),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, studentId, email, password, department, semester, role } = req.body;

    if (!name || !studentId || !email || !password) {
      return res.status(400).json({
        message: "Name, student ID, email and password are required",
      });
    }

    const normalizedName = name.trim();
    const normalizedStudentId = String(studentId).trim();
    const normalizedEmail = email.trim().toLowerCase();

    const nameParts = normalizedName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      return res.status(400).json({
        message: "Please provide both first name and last name",
      });
    }

    if (!isValidStudentId(normalizedStudentId)) {
      return res.status(400).json({
        message: "Student ID must be exactly 8 digits",
      });
    }

    if (!isValidEmailDomain(normalizedEmail)) {
      return res.status(400).json({
        message:
          "Please use a valid email address like @gmail.com, @icloud.com, @yahoo.com or similar",
      });
    }

    if (!allowedDepartments.includes(department)) {
      return res.status(400).json({
        message: "Please select a valid department",
      });
    }

    if (!allowedSemesters.includes(semester)) {
      return res.status(400).json({
        message: "Please select a valid semester from 1st to 8th",
      });
    }

    const userExistsByEmail = await User.findOne({ email: normalizedEmail });

    if (userExistsByEmail) {
      return res.status(400).json({
        message: "Account already exists with this email. Please login instead.",
      });
    }

    const userExistsByStudentId = await User.findOne({ publicId: normalizedStudentId });

    if (userExistsByStudentId) {
      return res.status(400).json({
        message: "This student ID is already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: normalizedName,
      publicId: normalizedStudentId,
      email: normalizedEmail,
      password: hashedPassword,
      department,
      semester,
      role: role || "learner",
      activeSessionToken: null,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      publicId: user.publicId,
      name: user.name,
      email: user.email,
      department: user.department,
      semester: user.semester,
      role: user.role,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
      badge: user.badge,
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.activeSessionToken) {
      return res.status(409).json({
        message: "This account is already logged in on another device",
      });
    }

    const token = generateToken(user._id);
    user.activeSessionToken = token;
    await user.save();

    res.json({
      _id: user._id,
      publicId: user.publicId,
      name: user.name,
      email: user.email,
      department: user.department,
      semester: user.semester,
      role: user.role,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
      badge: user.badge,
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.activeSessionToken = null;
      await user.save();
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  checkEmail,
  registerUser,
  loginUser,
  logoutUser,
};