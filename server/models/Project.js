import mongoose from "mongoose";


/**
 * The Project model.
 *
 * This model represents a project. Each project has a name, a description,
 * a status, and a client that it belongs to. It also has an array of assigned
 * users.
 *
 * @typedef {import('mongoose').Document & {
 *   name: string,
 *   description: string,
 *   status: string,
 *   clientId: import('mongoose').Types.ObjectId,
 *   assignedUser: Array<import('mongoose').Types.ObjectId>
 * }} ProjectDocument
 */
const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
    default: "NOT_STARTED",
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  assignedUser: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
}, { timestamps: true, versionKey: false });

const Project = mongoose.model("Project", ProjectSchema);

export default Project;
