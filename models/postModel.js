const mongoose = require("mongoose")
const User = require("./userModel")

const postSchema = new mongoose.Schema({
  content: { type: String, require: true },
  author: { type: mongoose.Schema.Types.ObjectId, require: true, ref: "User" },
  createdAt: { type: Number, default: Date.now },
})

module.exports = mongoose.model("Post", postSchema)
