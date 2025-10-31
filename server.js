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
const dotenv = require("dotenv")
const mongoose = require("mongoose")
const User = require("./models/userModel")
const Post = require("./models/postModel")

app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
dotenv.config()

main().catch((err) => console.log(err))

app.get("/", isLoggedIn, async (req, res) => {
  try {
    const posts = await Post.find().populate("author")
    posts.forEach((post) => (post.author.hash = null))
    res.render("boilerplate.ejs", { page: "feed", user: req.user, posts })
  } catch (err) {
    console.log(err)
  }
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
  const author = await User.findById(req.user._id)
  if (postData == null)
    return res.json({ success: false, msg: "Posts cannot be empty" })
  if (!postData?.title.trim() || !postData?.content.trim())
    return res.json({ success: false, msg: "Posts cannot be empty" })
  try {
    const newPostData = await Post.insertMany([
      {
        title: postData.title,
        content: postData.content,
        author: author._id,
      },
    ])
    res.json({ success: true, postData: newPostData })
  } catch (err) {
    console.log(err)
  }
})

app.delete("/post/delete/:postId", isLoggedIn, async (req, res) => {
  try {
    const postId = req?.params?.postId
    if (!postId) {
      return res.json({ success: false, msg: "Unsuccessful deletion" })
    }
    const postData = await Post.findById(postId)
    if (postData.author.toString() != req.user._id) {
      return res.json({ success: false, msg: "Not authorized" })
    }
    await Post.findByIdAndDelete(postId)
    return res.json({ success: true, msg: "Deletion Successful" })
  } catch (err) {
    console.log(err)
  }
})

app.get("/post/edit/:postId", isLoggedIn, async (req, res) => {
  const postId = req?.params?.postId
  if (!postId) {
    return res.json({ success: false, msg: "Unsuccessful edit" })
  }
  const postData = await Post.findById(postId)
  if (postData.author.toString() != req.user._id) {
    return res.json({ success: false, msg: "Not authorized" })
  }
  res.render("boilerplate.ejs", {
    page: "editPost",
    post: postData,
    user: req.user,
  })
})

app.patch("/post/edit/:postId", isLoggedIn, async (req, res) => {
  try {
    const postId = req?.params?.postId
    const newPostData = req.body
    if (!postId) {
      return res.json({ success: false, msg: "Unsuccessful edit" })
    }
    if (!newPostData.title.trim() || !newPostData.content.trim()) {
      return res.json({ success: false, msg: "Posts content cannot be empty" })
    }
    const postData = await Post.findById(postId)
    if (postData.author.toString() != req.user._id) {
      return res.json({ success: false, msg: "Not authorized" })
    }
    postData.title = newPostData.title
    postData.content = newPostData.content
    await postData.save()
    return res.json({ success: true, msg: "Edited successfully" })
  } catch (err) {
    console.log(err)
  }
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
  const originalCredentials = await User.findOne({ email: credentials?.email })
  if (originalCredentials) {
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

  bcrypt.hash(credentials.password, SALT_ROUNDS, async (err, hash) => {
    if (err) {
      return res.json({
        success: false,
        msg: "Some error occured",
      })
    }
    try {
      const newUserData = await User.insertMany([
        { name: credentials.name, email: credentials.email, hash },
      ])
      const token = jwt.sign({ ...newUserData[0] }, SECRET_KEY)
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAgeL: 15 * 60 * 1000,
      })
      res.json({ success: true, msg: token })
    } catch (err) {
      console.log(err)
    }
  })
})

app.post("/user/signin", async (req, res) => {
  const credentials = req.body
  if (credentials == null)
    return res.json({ success: false, msg: "Credentials cannot be empty" })
  if (!credentials?.email?.trim() || !credentials?.password?.trim())
    return res.json({ success: false, msg: "Credentials cannot be empty" })
  const originalCredentials = await User.findOne({ email: credentials?.email })
  if (!originalCredentials) {
    return res.json({
      success: false,
      msg: "Account doesnt exists. Please signup",
    })
  }
  bcrypt.compare(
    credentials?.password,
    originalCredentials?.hash,
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
      const token = jwt.sign({ ...originalCredentials }, SECRET_KEY)
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

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log("connected to DB!")
}

app.listen(PORT, () => {
  console.log("server is listening to port:", PORT)
})
