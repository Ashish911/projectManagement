import { createLogger } from "../config/logger.js";
import { ForbiddenError, NotFoundError } from "../errors/errors.js";
import {
  TaskRepo,
  ProjectRepo,
  SubTaskRepo,
} from "../repositories/import.repo.js";
import {
  createTaskSchema,
  idSchema,
  updateSubTaskStatusSchema,
  updateTaskSchema,
} from "../validation/schema.js";
import { validate } from "../validation/validate.js";
import { NotificationService } from "./import.service.js";

export const TaskService = {
  async getTasks(projectId, context) {
    validate(idSchema, { id: projectId });

    const { user } = context;

    const project = await ProjectRepo.findById(projectId);

    if (!project) throw new NotFoundError("Project not found.");

    // Check user has access to this project
    if (user.role === "USER") {
      const isAssigned = project.assignedUser
        .map((id) => id.toString())
        .includes(user.id);
      if (!isAssigned)
        throw new ForbiddenError("You are not assigned to this project");
    }

    return await TaskRepo.findByProject(projectId);
  },

  async getTask(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const task = await TaskRepo.findById(id);
    if (!task) throw new NotFoundError("Task not found");

    if (user.role === "USER") {
      const isAssigned =
        task.assignedTo?.toString() === user.id ||
        task.createdBy?.toString() === user.id;

      if (!isAssigned)
        throw new ForbiddenError("You do not have access to this task");
    }

    return task;
  },

  async createTask(data, context) {
    validate(createTaskSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have permission to create tasks",
      );
    }

    const project = await ProjectRepo.findById(data.projectId);
    if (!project) throw new NotFoundError("Project not found");

    const task = await TaskRepo.create({
      title: data.title,
      priority: data.priority || "NORMAL",
      deadline: data.deadline,
      currentStatus: "NEW",
      assignedTo: data.assignedTo,
      createdBy: user.id,
      project: data.projectId,
    });

    // Notify assigned user
    if (data.assignedTo) {
      await NotificationService.notify(
        data.assignedTo,
        `You have been assigned a new task: ${data.title}`,
      );
    }

    logger.info(
      {
        audit: true,
        userId: user.id,
        action: "CREATE_TASK",
      },
      "AUDIT",
    );

    return task;
  },

  async updateTask(data, context) {
    validate(updateTaskSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const task = await TaskRepo.findById(data.id);

    if (!task) throw new NotFoundError("Task not found");

    // USER can only update tasks assigned to them
    if (user.role === "USER" && task.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this task",
      );
    }

    // If reassigning to someone new notify them
    if (data.assignedTo && data.assignedTo !== task.assignedTo?.toString()) {
      await NotificationService.notify(
        data.assignedTo,
        `Task "${task.title}" has been assigned to you`,
      );
    }

    const updated = await TaskRepo.update(data.id, {
      ...(data.title && { title: data.title }),
      ...(data.priority && { priority: data.priority }),
      ...(data.deadline && { deadline: data.deadline }),
      ...(data.assignedTo && { assignedTo: data.assignedTo }),
      ...(data.currentStatus && { currentStatus: data.currentStatus }),
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetTaskId: data.id,
        action: "UPDATE_TASK",
      },
      "AUDIT",
    );

    return updated;
  },

  async updateTaskStatus(id, status, context) {
    validate(updateSubTaskStatusSchema, { id, status });

    const { user } = context;
    const logger = createLogger(context);

    const task = await TaskRepo.findById(id);

    if (!task) throw new NotFoundError("Task not found");

    // Only assigned user or admin can update status
    if (user.role === "USER" && task.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this task status",
      );
    }

    const updatedTask = await TaskRepo.update(id, { currentStatus: status });

    // Notify creator when task is resolved
    if (status === "RESOLVED") {
      await NotificationService.notify(
        task.createdBy,
        `Task "${task.title}" has been marked as resolved`,
      );

      // Also notify assigned user if different from creator
      if (task.assignedTo?.toString() !== task.createdBy?.toString()) {
        await NotificationService.notify(
          task.assignedTo,
          `Task "${task.title}" has been marked as resolved`,
        );
      }
    }

    // Notify creator when task is reopened
    if (status === "REOPENED") {
      await NotificationService.notify(
        task.createdBy,
        `Task "${task.title}" has been reopened`,
      );
    }

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetTaskId: id,
        action: "UPDATE_TASK_STATUS",
      },
      "AUDIT",
    );

    return updatedTask;
  },

  async deleteTask(id, context) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have permission to delete tasks",
      );
    }

    const task = await TaskRepo.findById(id);
    if (!task) throw new NotFoundError("Task not found");

    // Delete all subtasks associated with this task
    const subTasks = await SubTaskRepo.findByTask(id);
    if (subTasks.length) {
      await Promise.all(subTasks.map((st) => SubTaskRepo.delete(st._id)));
    }

    // Notify assigned user that task was deleted
    if (task.assignedTo) {
      await NotificationService.notify(
        task.assignedTo,
        `Task "${task.title}" has been deleted`,
      );
    }

    const deleted = await TaskRepo.delete(id);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetTaskId: id,
        action: "DELETE_TASK",
      },
      "AUDIT",
    );

    return deleted;
  },
};
