import mongoose from "mongoose";


/**
 * The User model.
 *
 * This model represents a user in the system. Each user has a name, email,
 * password, and role. The role is an enum that can be either "SUPER_ADMIN",
 * "CLIENT_ADMIN", or "USER". The password is hashed before it is stored in
 * the database.
 *
 * @typedef {import('mongoose').Document & {
 *   name: string,
 *   email: string,
 *   password: string,
 *   role: string,
 * }} UserDocument
 */
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ["SUPER_ADMIN", "CLIENT_ADMIN", "USER"],
    default: "USER",
  },
  email: {
    type: String,
    unique: true,
    index: true,
    lowercase: true,
    required: true,
  },
  number: {
    type: String,
  },
  gender: {
    type: String,
    enum: ["MALE", "FEMALE", "OTHERS"],
  },
  dob: {
    type: Date,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lastFailedLogin: {
    type: Date,
    default: null,
  },
}, { timestamps: true, versionKey: false });

const User = mongoose.model("User", UserSchema);

export default User;
