const express = require("express")
const app = express()
const PORT = 3000
const SECRET_KEY = "project_mini_facebook"
const SALT_ROUNDS = 10
const ejs = require("ejs")
const path = require("path")
const jwt = require("jsonwebtoken")
const emailValidator = require("email-validator")
const bcrypt = require("bcrypt")
const cookieParser = require("cookie-parser")
const isLoggedIn = require("./middlewares/isLoggedIn")

app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

const accounts = {}
let posts = [
  {
    id: 1,
    title: "Hello",
    content: "This is a test msg",
    postedBy: "macgyver@gmail.com",
  },
]

app.get("/", isLoggedIn, (req, res) => {
  res.render("boilerplate.ejs", { page: "feed", user: req.user, posts })
})

app.get("/profile", isLoggedIn, async (req, res) => {
  res.render("boilerplate.ejs", { page: "profile", user: req.user })
})

app.get("/login", (req, res) => {
  return res.render("boilerplate.ejs", { page: "login" })
})

app.get("/user/logout", async (req, res) => {
  res.clearCookie("token")
  res.redirect("/profile")
})

app.post("/post/create", isLoggedIn, async (req, res) => {
  const postData = req?.body
  if (postData == null)
    return res.json({ success: false, msg: "Posts cannot be empty" })
  if (!postData?.title.trim() || !postData?.content.trim())
    return res.json({ success: false, msg: "Posts cannot be empty" })
  posts.push({
    id: Math.random(),
    title: postData.title,
    content: postData.content,
    postedBy: req.user,
  })
  res.json({ success: true, postData })
})

app.delete("/post/delete/:postId", isLoggedIn, (req, res) => {
  const postId = req?.params?.postId
  if (!postId) {
    return res.json({ success: false, msg: "Unsuccessful deletion" })
  }
  const postData = posts.find((post) => post.id == postId)
  if (postData.postedBy != req.user) {
    return res.json({ success: false, msg: "Not authorized" })
  }
  posts = posts.filter((post) => {
    return post.id != postId
  })
  return res.json({ success: true, msg: "Deletion Successful" })
})

app.get("/post/edit/:postId", isLoggedIn, (req, res) => {
  const postId = req?.params?.postId
  if (!postId) {
    return res.json({ success: false, msg: "Unsuccessful edit" })
  }
  const postData = posts.find((post) => post.id == postId)
  if (postData?.postedBy != req.user) {
    return res.json({ success: false, msg: "Not authorized" })
  }
  res.render("boilerplate.ejs", {
    page: "editPost",
    post: postData,
    user: req.user,
  })
})

app.patch("/post/edit/:postId", isLoggedIn, (req, res) => {
  const postId = req?.params?.postId
  const newPostData = req.body
  if (!postId) {
    return res.json({ success: false, msg: "Unsuccessful edit" })
  }
  if (!newPostData.title.trim() || !newPostData.content.trim()) {
    return res.json({ success: false, msg: "Posts content cannot be empty" })
  }
  const postData = posts.find((post) => post.id == postId)
  if (postData?.postedBy != req.user) {
    return res.json({ success: false, msg: "Not authorized" })
  }
  postData.title = newPostData.title
  postData.content = newPostData.content
  return res.json({ success: true, msg: "Edited successfully" })
})

app.post("/user/signup", async (req, res) => {
  const credentials = req.body
  if (credentials == null)
    return res.json({ success: false, msg: "Credentials cannot be empty" })
  if (
    !credentials?.name.trim() ||
    !credentials?.email.trim() ||
    !credentials?.password.trim()
  )
    return res.json({ success: false, msg: "Credentials cannot be empty" })
  if (accounts[credentials.email]) {
    return res.json({
      success: false,
      msg: "Account already exists. Please login",
    })
  }

  if (!emailValidator.validate(credentials.email)) {
    return res.json({
      success: false,
      msg: "Please enter a valid email",
    })
  }

  bcrypt.hash(credentials.password, SALT_ROUNDS, (err, hash) => {
    if (err) {
      return res.json({
        success: false,
        msg: "Some error occured",
      })
    }
    accounts[credentials.email] = {
      name: credentials.name,
      email: credentials.email,
      hash,
    }
  })

  const token = jwt.sign(credentials.email, SECRET_KEY)
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAgeL: 15 * 60 * 1000,
  })
  res.json({ success: true, msg: token })
})

app.post("/user/signin", (req, res) => {
  const credentials = req.body
  if (credentials == null)
    return res.json({ success: false, msg: "Credentials cannot be empty" })
  if (!credentials?.email?.trim() || !credentials?.password?.trim())
    return res.json({ success: false, msg: "Credentials cannot be empty" })
  if (!accounts[credentials.email]) {
    return res.json({
      success: false,
      msg: "Account doesnt exists. Please signup",
    })
  }
  bcrypt.compare(
    credentials.password,
    accounts[credentials.email].hash,
    (err, result) => {
      if (err) {
        return res.json({
          success: false,
          msg: "Some error occured",
        })
      }
      if (!result) {
        return res.json({
          success: false,
          msg: "Invalid credentials",
        })
      }
      const token = jwt.sign(credentials.email, SECRET_KEY)
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAgeL: 15 * 60 * 1000,
      })
      return res.json({ success: true, msg: token })
    }
  )
})

app.listen(PORT, () => {
  console.log("server is listening to port:", PORT)
})
