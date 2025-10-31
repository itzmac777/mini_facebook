const jwt = require("jsonwebtoken")
const SECRET_KEY = "project_mini_facebook"

module.exports = (req, res, next) => {
  const token = req?.cookies?.token
  if (!token) {
    //No token
    return res.redirect("/login")
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.send("Some error occured")
    req.user = decoded._doc
  })
  next()
}
