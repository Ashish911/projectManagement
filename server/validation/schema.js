import { z } from "zod";

// ─── User ─────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  number: z.string().min(1, "Number is required"),
  dob: z.string().min(1, "Date of birth is required"),
  role: z.enum(["SUPER_ADMIN", "CLIENT_ADMIN", "USER"]).default("USER"),
  gender: z.enum(["MALE", "FEMALE", "OTHERS"]).default("MALE"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// ─── Client ───────────────────────────────────────────────────────
export const addClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(1, "Phone is required"),
  user: z.string().min(1, "User is required"),
});

export const updateClientSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  user: z.string().optional(),
});

// ─── Project ──────────────────────────────────────────────────────
export const addProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  clientId: z.string().min(1, "Client ID is required"),
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"])
    .default("NOT_STARTED"),
});

export const updateProjectSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
});

// ─── Task ─────────────────────────────────────────────────────────
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  projectId: z.string().min(1, "Project ID is required"),
  assignedTo: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).default("NORMAL"),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().max(200).optional(),
  assignedTo: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).optional(),
});

export const updateTaskStatusSchema = z.object({
  id: z.string().min(1, "ID is required"),
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"]),
});

// ─── SubTask ──────────────────────────────────────────────────────
export const createSubTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  taskId: z.string().min(1, "Task ID is required"),
  assignedTo: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).default("NORMAL"),
});

export const updateSubTaskSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().max(200).optional(),
  assignedTo: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "BACKLOG"]).optional(),
});
