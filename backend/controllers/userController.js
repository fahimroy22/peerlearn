const User = require("../models/User");
const Review = require("../models/Review");

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

    user.name = req.body.name ?? user.name;
    user.department = req.body.department ?? user.department;
    user.semester = req.body.semester ?? user.semester;
    user.avatar = req.body.avatar ?? user.avatar;
    user.bio = req.body.bio ?? user.bio;
    user.teachingStyle = req.body.teachingStyle ?? user.teachingStyle;

    const updatedUser = await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        publicId: updatedUser.publicId,
        name: updatedUser.name,
        email: updatedUser.email,
        department: updatedUser.department,
        semester: updatedUser.semester,
        role: updatedUser.role,
        ratingAvg: updatedUser.ratingAvg,
        ratingCount: updatedUser.ratingCount,
        badge: updatedUser.badge,
        availability: updatedUser.availability || [],
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        teachingStyle: updatedUser.teachingStyle,
      },
    });
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
  searchUserByStudentId,
};