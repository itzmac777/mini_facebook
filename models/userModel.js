const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, require: true, unique: true },
  hash: { type: String, require: true },
  friends: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  preference: {
    publicPost: {
      type: Boolean,
      default: true,
    },
  },
})

module.exports = mongoose.model("User", userSchema)
