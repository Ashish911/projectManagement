import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  role: {
    type: String,
    enum: ["Super Admin", "Client Admin", "User"],
  },
  email: {
    type: String,
    unique: true,
    index: true,
  },
  number: {
    type: String,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Others"],
  },
  dob: {
    type: String,
  },
  password: {
    type: String,
  },
  loginAttempts: {
    type: Number,
  },
  lastFailedLogin: {
    type: String,
  },
});

const User = mongoose.model("User", UserSchema);

export default User;
