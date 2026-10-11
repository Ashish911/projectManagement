import { z } from "zod";

// ─── Reusable validators ──────────────────────────────────────────
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");
const nullableObjectId = objectId.optional().nullable();
const email = z.string().email("Invalid email format");
const password = z.string().min(8, "Password must be at least 8 characters");
const name = z.string().min(1).max(100);
// Optional free-text contact fields: an empty string means "not provided"
const optionalEmail = z.union([email, z.literal("")]).optional().nullable();
const optionalPhone = z.union([z.string().regex(/^\+?[\d\s()-]{7,}$/, "Use digits, spaces or +"), z.literal("")]).optional().nullable();
const role = z.enum(["SUPER_ADMIN", "CLIENT_ADMIN", "USER"]);
const gender = z.enum(["MALE", "FEMALE", "OTHERS"]);

// ─── Reusable Id Validator ────────────────────────────────────────
export const idSchema = z.object({
  id: objectId,
});

// ─── User ─────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: name,
  email: email,
  password: password,
  number: z.string().min(1, "Number is required"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHERS"]).default("MALE"),
});

export const loginSchema = z.object({
  email: email,
  password: password,
});

// ─── Client ───────────────────────────────────────────────────────
export const addClientSchema = z.object({
  name: name,
  email: optionalEmail,
  phone: optionalPhone,
  assignedAdmin: nullableObjectId,
  deleteRequest: z.boolean().default(false),
});

export const assignAdminSchema = z.object({
  id: objectId,
  assignedAdmin: objectId,
});

export const updateClientSchema = z.object({
  id: objectId,
  name: name,
  email: optionalEmail,
  phone: optionalPhone,
  assignedAdmin: nullableObjectId,
  deleteRequest: z.boolean().optional(),
});

// ─── Project ──────────────────────────────────────────────────────
export const addProjectSchema = z.object({
  name: name,
  description: z.string().max(500).optional(),
  clientId: objectId,
  dueDate: z.string().optional().nullable(),
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"])
    .default("NOT_STARTED"),
});

export const updateProjectSchema = z.object({
  id: objectId,
  name: name,
  description: z.string().max(500).optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
});

export const deleteProjectSchema = z.object({
  id: objectId,
});

export const projectUserSchema = z.object({
  id: objectId,
  users: z.array(objectId).min(1, "At least one user is required"),
});

// ─── Task ─────────────────────────────────────────────────────────
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  projectId: objectId,
  assignedTo: nullableObjectId,
  deadline: z.string().optional().nullable(), // null clears the deadline
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).default("NORMAL"),
  // New tasks may start as NEW or IN_PROGRESS; other states come from status changes
  currentStatus: z.enum(["NEW", "IN_PROGRESS"]).optional(),
});

export const updateTaskSchema = z.object({
  id: objectId,
  title: z.string().max(200).optional(),
  assignedTo: nullableObjectId,
  deadline: z.string().optional().nullable(), // null clears the deadline
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).optional(),
});

export const updateTaskStatusSchema = z.object({
  id: objectId,
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"]),
});

export const deleteTaskSchema = z.object({
  id: objectId,
});

// ─── SubTask ──────────────────────────────────────────────────────
export const createSubTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  taskId: objectId,
  assignedTo: nullableObjectId,
  deadline: z.string().optional().nullable(), // null clears the deadline
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).default("NORMAL"),
});

export const updateSubTaskSchema = z.object({
  id: objectId,
  title: z.string().max(200).optional(),
  assignedTo: nullableObjectId,
  deadline: z.string().optional().nullable(), // null clears the deadline
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).optional(),
});

export const updateSubTaskStatusSchema = z.object({
  id: objectId,
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"]),
});

export const deleteSubTaskSchema = z.object({
  id: objectId,
});

// ─── Comment ──────────────────────────────────────────────────────
const commentContent = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(2000, "Comment must be at most 2000 characters");

export const addTaskCommentSchema = z.object({
  taskId: objectId,
  content: commentContent,
});

export const addSubTaskCommentSchema = z.object({
  subTaskId: objectId,
  content: commentContent,
});

export const updateCommentSchema = z.object({
  id: objectId,
  content: commentContent,
});

// ─── Forgot / Reset Password ─────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: password,
});

// ─── User Profile Update ──────────────────────────────────────────
export const updateProfileSchema = z.object({
  name: name.optional(),
  number: z.string().min(1).optional(),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHERS"]).optional(),
});

// ─── User administration (SUPER_ADMIN) ────────────────────────────
export const idsSchema = z.object({
  ids: z.array(objectId).min(1, "Select at least one user"),
});

export const notificationIdsSchema = z.object({
  ids: z.array(objectId).min(1, "Select at least one notification").max(500),
});

export const createUserSchema = z
  .object({
    name: name,
    email: email,
    number: z.string().regex(/^\+?[\d\s()-]{7,}$/, "Use digits, spaces or +"),
    gender: gender,
    dob: z.string().optional().nullable(),
    role: role.default("USER"),
    clientId: nullableObjectId,
    mode: z.enum(["INVITE", "PASSWORD"]).default("INVITE"),
    password: z.string().optional().nullable(),
  })
  .refine((d) => d.role !== "CLIENT_ADMIN" || !!d.clientId, {
    message: "Pick the client they'll manage",
    path: ["clientId"],
  })
  .refine((d) => d.mode !== "PASSWORD" || (d.password?.length ?? 0) >= 8, {
    message: "Password must be at least 8 characters",
    path: ["password"],
  });

export const updateUserSchema = z.object({
  id: objectId,
  name: name.optional(),
  email: email.optional(),
  number: z.string().regex(/^\+?[\d\s()-]{7,}$/, "Use digits, spaces or +").optional(),
  gender: gender.optional(),
  dob: z.string().optional().nullable(),
});

export const changeUserRolesSchema = z
  .object({
    ids: z.array(objectId).min(1, "Select at least one user"),
    role: role,
    clientId: nullableObjectId,
  })
  .refine((d) => d.role !== "CLIENT_ADMIN" || (!!d.clientId && d.ids.length === 1), {
    message: "A client admin needs exactly one person and a client",
    path: ["clientId"],
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: password,
});

// ─── Client deletion decision ─────────────────────────────────────
export const declineClientDeletionSchema = z.object({
  id: objectId,
  message: z.string().max(500).optional().nullable(),
});

// ─── Preference ───────────────────────────────────────────────────
export const updatePreferenceSchema = z.object({
  theme: z.enum(["LIGHT", "DARK"]).optional(),
  language: z.enum(["ENGLISH", "JAPANESE", "KOREAN"]).optional(),
});
