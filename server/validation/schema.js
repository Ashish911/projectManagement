import { z } from "zod";

// ─── Reusable validators ──────────────────────────────────────────
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");
const nullableObjectId = objectId.optional().nullable();
const email = z.string().email("Invalid email format");
const password = z.string().min(8, "Password must be at least 8 characters");
const name = z.string().min(1).max(100);

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
  role: z.enum(["SUPER_ADMIN", "CLIENT_ADMIN", "USER"]).default("USER"),
  gender: z.enum(["MALE", "FEMALE", "OTHERS"]).default("MALE"),
});

export const loginSchema = z.object({
  email: email,
  password: password,
});

// ─── Client ───────────────────────────────────────────────────────
export const addClientSchema = z.object({
  name: name,
  email: email,
  phone: z.string().min(1, "Phone is required"),
  assignedAdmin: nullableObjectId,
  deleteRequest: z.boolean().default(false),
});

export const assignAdminSchema = z.object({
  clientId: objectId,
  adminId: objectId,
});

export const updateClientSchema = z.object({
  id: objectId,
  name: name,
  email: email,
  phone: z.string().optional(),
  assignedAdmin: nullableObjectId,
  deleteRequest: z.boolean().optional(),
});

// ─── Project ──────────────────────────────────────────────────────
export const addProjectSchema = z.object({
  name: name,
  description: z.string().max(500).optional(),
  clientId: objectId,
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"])
    .default("NOT_STARTED"),
});

export const updateProjectSchema = z.object({
  id: objectId,
  name: name,
  description: z.string().max(500).optional(),
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
  deadline: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).default("NORMAL"),
});

export const updateTaskSchema = z.object({
  id: objectId,
  title: z.string().max(200).optional(),
  assignedTo: nullableObjectId,
  deadline: z.string().optional(),
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
  deadline: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).default("NORMAL"),
});

export const updateSubTaskSchema = z.object({
  id: objectId,
  title: z.string().max(200).optional(),
  assignedTo: nullableObjectId,
  deadline: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).optional(),
});

export const updateSubTaskStatusSchema = z.object({
  id: objectId,
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"]),
});

export const deleteSubTaskSchema = z.object({
  id: objectId,
});

// ─── Preference ───────────────────────────────────────────────────
export const updatePreferenceSchema = z.object({
  theme: z.enum(["LIGHT", "DARK"]).optional(),
  language: z.enum(["ENGLISH", "JAPANESE", "KOREAN"]).optional(),
});
