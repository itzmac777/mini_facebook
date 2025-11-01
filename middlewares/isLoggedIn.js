const jwt = require("jsonwebtoken")
const SECRET_KEY = "project_mini_facebook"
const User = require("../models/userModel")

module.exports = async (req, res, next) => {
  const token = req?.cookies?.token
  if (!token) {
    //No token
    return res.redirect("/auth")
  }
  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) return res.send("Some error occured")
    const userData = await User.findById(decoded._id)
    if (!userData) {
      res.clearCookie("token")
      return res.redirect("/auth")
    }
    req.user = await decoded
    await next()
  })
}
