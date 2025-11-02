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
const Request = require("./models/requestModel")

//===============MIDDLEWARES===============//
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "/public")))
dotenv.config()

//===============DB & SERVER CONNECTION===============//
main().catch((err) => console.log(err))
app.listen(PORT, () => console.log("server is listening to port:", PORT))

//===============ROUTES===============//
//FEED & PROFILE ROUTE
app.get("/", isLoggedIn, async (req, res) => {
  wrapTC(req, res, handleFeedPage)
})
app.get("/profile", isLoggedIn, (req, res) => {
  wrapTC(req, res, handleProfilePage)
})

app.get("/user/:id", isLoggedIn, (req, res) => {
  wrapTC(req, res, handleProfileVisit)
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

//Friends Route
app.get("/people", isLoggedIn, async (req, res) => {
  wrapTC(req, res, handleFindPeopleDisplay)
})
app.get("/friend", isLoggedIn, async (req, res) => {
  wrapTC(req, res, handleFriendDisplay)
})
app.get("/friend/add/:id", isLoggedIn, async (req, res) => {
  wrapTC(req, res, handleSendFriendRequest)
})
app.get("/friend/request", isLoggedIn, async (req, res) => {
  wrapTC(req, res, handleDisplayFriendRequest)
})
app.delete("/friend/request", isLoggedIn, async (req, res) => {
  wrapTC(req, res, handleFriendRequestCancellation)
})
app.patch("/friend/request", isLoggedIn, async (req, res) => {
  wrapTC(req, res, handleFriendRequestConfirmation)
})

//Preferences Route
app.patch("/user/preference", isLoggedIn, async (req, res) => {
  wrapTC(req, res, handleUserPreference)
})

//===============HANDLER FUNCTIONS===============//
async function main() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log("connected to DB!")
}

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
  if (!newPostData.content.trim()) {
    return res.json({ success: false, msg: "Posts content cannot be empty" })
  }
  const postData = await Post.findById(postId)
  if (postData.author.toString() != req.user._id) {
    return res.json({ success: false, msg: "Not authorized" })
  }
  postData.content = newPostData.content
  await postData.save()
  return res.json({ success: true, msg: "Edited successfully" })
}

async function handleFeedPage(req, res) {
  const currentUser = await User.findById(req.user._id).select("-hash")
  const publicPost = currentUser?.preference?.publicPost
  if (publicPost) {
    const posts = await Post.find().populate("author", "-hash")
    return res.render("boilerplate.ejs", {
      page: "feed",
      user: currentUser,
      posts,
      publicPost,
    })
  }
  const posts = await Post.find({
    author: {
      $in: [...currentUser.friends, currentUser._id],
    },
  }).populate("author", "-hash")
  return res.render("boilerplate.ejs", {
    page: "feed",
    user: currentUser,
    posts,
    publicPost,
  })
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
  if (!postData?.content.trim())
    return res.json({ success: false, msg: "Posts cannot be empty" })
  const newPostData = await Post.insertMany([
    {
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

async function handleDisplayFriendRequest(req, res) {
  const requestSentData = Array.from(
    Object.values(
      await Request.find({
        from: req.user._id,
        status: "pending",
      })
        .select("to")
        .populate("to")
    ),
    (obj) => {
      return {
        _id: obj["to"]._id,
        name: obj["to"].name,
        email: obj["to"].email,
        friends: obj["to"].friends,
      }
    }
  )
  const requestReceivedData = Array.from(
    Object.values(
      await Request.find({
        to: req.user._id,
        status: "pending",
      })
        .select("from")
        .populate("from")
    ),
    (obj) => {
      return {
        _id: obj["from"]._id,
        name: obj["from"].name,
        email: obj["from"].email,
        friends: obj["from"].friends,
      }
    }
  )

  return res.render("boilerplate.ejs", {
    page: "request",
    requestSentData,
    requestReceivedData,
  })
}

async function handleFriendRequestCancellation(req, res) {
  const userId = req?.body?.userId
  if (!userId) return res.json({ success: false, msg: "User doesn't exists" })

  const result = await Request.findOneAndDelete({
    $or: [{ from: req.user._id }, { to: req.user._id }],
    $or: [{ from: userId }, { to: userId }],
    status: "pending",
  })
  if (!result)
    return res.json({
      success: false,
      msg: "Request already cancelled or accepted",
    })
  return res.json({ success: true })
}

async function handleFriendRequestConfirmation(req, res) {
  const userId = req?.body?.userId
  if (!userId) return res.json({ success: false, msg: "User doesn't exists" })
  const isRequested = await Request.findOne({
    to: req.user._id,
    from: userId,
    status: "pending",
  })

  if (!isRequested) {
    return res.json({ success: false, msg: "Request doesn't exists" })
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: {
      friends: userId,
    },
  })
  await User.findByIdAndUpdate(userId, {
    $addToSet: {
      friends: req.user._id,
    },
  })

  await Request.findOneAndUpdate(
    {
      to: req.user._id,
      from: userId,
      status: "pending",
    },
    { status: "accepeted" }
  )
  return res.json({ success: true })
}

async function handleSendFriendRequest(req, res) {
  const toId = req?.params?.id
  if (!toId) return res.json({ success: false, msg: "Request not sent!" })
  const fromUser = await User.findById(req.user._id)
  const toUser = await User.findById(toId)
  const alreadyFriends = fromUser.friends.includes(toUser._id)
  if (alreadyFriends)
    return res.json({ success: false, msg: "Already friends" })
  const alreadyRequested = await Request.find({ from: req.user._id, to: toId })
  const requestReceived = await Request.find({ from: toId, to: req.user._id })
  if (alreadyRequested.length > 0)
    return res.json({
      success: false,
      msg: "Request already sent, please wait with patience",
    })
  if (requestReceived.length > 0)
    return res.json({
      success: false,
      msg: "Received a request from this user already, accept it!",
    })
  await Request.insertMany([{ from: fromUser, to: toUser }])
  return res.json({ success: true })
}

async function handleFindPeopleDisplay(req, res) {
  const currentUserData = await User.findById(req.user._id)
  const requestSent = Array.from(
    Object.values(
      await Request.find({
        from: currentUserData._id,
        status: "pending",
      }).select("to")
    ),
    (id) => id.to
  )
  const requestRecieved = Array.from(
    Object.values(
      await Request.find({
        to: currentUserData._id,
        status: "pending",
      }).select("from")
    ),
    (id) => id.from
  )

  let usersData = await User.find({
    _id: {
      $nin: [
        currentUserData._id,
        ...currentUserData.friends,
        ...requestSent,
        ...requestRecieved,
      ],
    },
  }).select("-hash")

  return res.render("boilerplate.ejs", { page: "people", usersData })
}

async function handleFriendDisplay(req, res) {
  // console.log(
  //   Array.from(Object.values()))
  // )

  const friendsData = await User.findOne({ _id: req.user._id })
    .select("friends -_id")
    .populate({ path: "friends", select: "-hash -friends" })
  return res.render("boilerplate.ejs", {
    page: "friend",
    friendsData: friendsData.friends,
  })
}

async function handleUserPreference(req, res) {
  const userPref = req?.body
  const updateFields = {}

  for (let key in userPref) {
    updateFields[`preference.${key}`] = userPref[key] == "true" ? true : false
  }

  await User.findByIdAndUpdate(req.user._id, updateFields)
  return res.json({ success: true })
}

async function handleProfileVisit(req, res) {
  const searchData = await User.findById(req?.params?.id).select("-hash")
  if (!searchData) {
    return res.send("Profile Not found")
  }
  return res.render("boilerplate.ejs", {
    page: "visitProfile",
    profileData: searchData,
  })
}
