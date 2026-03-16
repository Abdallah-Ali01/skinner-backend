module.exports = (req, res, next) => {
  if (req.user.role !== "admin" || req.user.admin_role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Only super admin can perform this action"
    });
  }

  next();
};