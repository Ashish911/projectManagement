import mongoose from "mongoose";

/**
 * Mongoose schema for an activity / audit entry: who did what, to whom or to which
 * task, and why. Written by ActivityService.record() and shown in Activity feeds.
 */
const ActivitySchema = new mongoose.Schema(
  {
    // Who did it
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // What happened, e.g. ROLE_CHANGED, TASK_REOPENED, CLIENT_ADMIN_REPLACED
    action: { type: String, required: true },
    // Human-readable line shown in the feed
    summary: { type: String, required: true },
    // Why, when the action asks for one (role changes, reopens)
    reason: { type: String, default: null },
    // What it happened to; any of these may be empty
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    // Before/after values, e.g. { oldRole, newRole }
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    toObject: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
    timestamps: { createdAt: true, updatedAt: false }, // Entries are never edited
    versionKey: false,
  },
);

// Newest entries across everything (findRecent, super admin feed)
ActivitySchema.index({ createdAt: -1 });
// Newest entries for a set of projects (findByProjects, client admin and user feeds)
ActivitySchema.index({ project: 1, createdAt: -1 });

/** Mongoose model for the `activities` collection. */
const Activity = mongoose.model("Activity", ActivitySchema);

export default Activity;
