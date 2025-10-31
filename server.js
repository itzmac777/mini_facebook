const express = require("express")
const app = express()
const PORT = 3000
const SECRET_KEY = process.env.SECRET_KEY
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
const { wrapTC, isParamsEmpty } = require("./utils/helper")

//===============MIDDLEWARES===============//
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
dotenv.config()

//===============DB & SERVER CONNECTION===============//
main().catch((err) => console.log(err))
app.listen(PORT, () => console.log("server is listening to port:", PORT))

//===============ROUTES===============//
//FEED & PROFILE ROUTE
app.get("/", isLoggedIn, (req, res) => {
  wrapTC(req, res, handleFeedPage)
})
app.get("/profile", isLoggedIn, (req, res) => {
  wrapTC(req, res, handleProfilePage)
})

//AUTH ROUTES
app.get("/auth", (req, res) => {
  if (req?.cookies?.token) return res.redirect("/auth/logout")
  return res.render("boilerplate.ejs", { page: "auth" })
})
app.get("/auth/logout", async (req, res) => {
  res.clearCookie("token")
  res.redirect("/auth")
})
app.post("/auth/signup", async (req, res) => wrapTC(req, res, handleSignup))
app.post("/auth/signin", async (req, res) => wrapTC(req, res, handleSignin))

//POST ROUTES
app.post("/post/create", isLoggedIn, async (req, res) =>
  wrapTC(req, res, handlePostCreate)
)
app.delete("/post/delete/:postId", isLoggedIn, async (req, res) =>
  wrapTC(req, res, handlePostDelete)
)
app.get("/post/edit/:postId", isLoggedIn, async (req, res) =>
  wrapTC(req, res, handlePostEditRedirect)
)
app.patch("/post/edit/:postId", isLoggedIn, async (req, res) =>
  wrapTC(req, res, handlePostEdit)
)

async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log("connected to DB!")
}

//===============HANDLER FUNCTIONS===============//
async function handlePostEditRedirect(req, res) {
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
}

async function handlePostEdit(req, res) {
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
}

async function handleFeedPage(req, res) {
  const posts = await Post.find().populate("author", "-hash")
  res.render("boilerplate.ejs", { page: "feed", user: req.user, posts })
}

async function handleProfilePage(req, res) {
  const userData = await User.findById(req.user._id).select("-hash")
  res.render("boilerplate.ejs", { page: "profile", user: userData })
}

async function handlePostCreate(req, res) {
  const postData = req?.body
  const author = await User.findById(req.user._id)
  if (postData == null)
    return res.json({ success: false, msg: "Posts cannot be empty" })
  if (!postData?.title.trim() || !postData?.content.trim())
    return res.json({ success: false, msg: "Posts cannot be empty" })
  const newPostData = await Post.insertMany([
    {
      title: postData.title,
      content: postData.content,
      author: author._id,
    },
  ])
  res.json({ success: true, postData: newPostData })
}

async function handlePostDelete(req, res) {
  const postId = req?.params?.postId
  if (!postId) {
    return res.json({ success: false, msg: "Post not found" })
  }
  const postData = await Post.findById(postId)
  if (postData.author.toString() != req.user._id) {
    return res.json({ success: false, msg: "Not authorized" })
  }
  await Post.findByIdAndDelete(postId)
  return res.json({ success: true, msg: "Deletion Successful" })
}

async function handleSignin(req, res) {
  const credentials = req?.body
  const isEmpty = isParamsEmpty(credentials)
  if (isEmpty)
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
      const token = jwt.sign(
        { _id: originalCredentials._id, email: originalCredentials.email },
        process.env.SECRET_KEY
      )
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAgeL: 15 * 60 * 1000,
      })
      return res.json({ success: true, msg: token })
    }
  )
}

async function handleSignup(req, res) {
  const credentials = req?.body
  const isEmpty = isParamsEmpty(credentials)
  if (isEmpty)
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
    const newUserData = await User.insertMany([
      { name: credentials.name, email: credentials.email, hash },
    ])
    const token = jwt.sign(
      { _id: newUserData[0]._id, email: newUserData[0].email },
      process.env.SECRET_KEY
    )
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAgeL: 15 * 60 * 1000,
    })
    res.json({ success: true, msg: token })
  })
}
