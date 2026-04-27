const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Review = require("../models/Review");

const buildProfilePayload = (updatedUser) => ({
  _id: updatedUser._id,
  publicId: updatedUser.publicId,
  name: updatedUser.name,
  email: updatedUser.email,
  department: updatedUser.department,
  semester: updatedUser.semester,
  role: updatedUser.role,
  isAdmin: updatedUser.isAdmin,
  accountStatus: updatedUser.accountStatus,
  activeSessionToken: updatedUser.activeSessionToken,
  ratingAvg: updatedUser.ratingAvg,
  ratingCount: updatedUser.ratingCount,
  badge: updatedUser.badge,
  availability: updatedUser.availability || [],
  avatar: updatedUser.avatar,
  bio: updatedUser.bio,
  teachingStyle: updatedUser.teachingStyle,
  createdAt: updatedUser.createdAt,
  updatedAt: updatedUser.updatedAt,
});

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const reviews = await Review.find({ reviewee: user._id })
      .populate("reviewer", "name email publicId")
      .sort({ createdAt: -1 });

    res.json({
      user: {
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
        availability: user.availability || [],
        avatar: user.avatar,
        bio: user.bio,
        teachingStyle: user.teachingStyle,
      },
      reviews,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.publicId !== undefined) {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Only admin can update admin ID" });
      }

      const normalizedPublicId = String(req.body.publicId).trim();

      if (!/^\d{8}$/.test(normalizedPublicId)) {
        return res.status(400).json({
          message: "Admin ID must be exactly 8 digits",
        });
      }

      const existingUser = await User.findOne({
        publicId: normalizedPublicId,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "This ID is already in use",
        });
      }

      user.publicId = normalizedPublicId;
    }

    user.name = req.body.name ?? user.name;
    user.department = req.body.department ?? user.department;
    user.semester = req.body.semester ?? user.semester;
    user.avatar = req.body.avatar ?? user.avatar;
    user.bio = req.body.bio ?? user.bio;
    user.teachingStyle = req.body.teachingStyle ?? user.teachingStyle;

    const updatedUser = await user.save();

    res.json({
      message: "Profile updated successfully",
      user: buildProfilePayload(updatedUser),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadProfileAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Avatar image is required" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.avatar = `/uploads/${req.file.filename}`;
    const updatedUser = await user.save();

    res.json({
      message: "Avatar uploaded successfully",
      avatar: updatedUser.avatar,
      user: buildProfilePayload(updatedUser),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchUserByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!/^\d{8}$/.test(studentId)) {
      return res.status(400).json({
        message: "Student ID must be exactly 8 digits",
      });
    }

    const user = await User.findOne({ publicId: studentId }).select(
      "_id publicId name email department semester role badge avatar"
    );

    if (!user) {
      return res.status(404).json({ message: "No user found with this Student ID" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  getPublicUserProfile,
  updateUserProfile,
  updateUserPassword,
  uploadProfileAvatar,
  searchUserByStudentId,
};