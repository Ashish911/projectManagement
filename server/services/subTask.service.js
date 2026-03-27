import { NotFoundError } from "../errors/errors.js";
import { SubTaskRepo, TaskRepo } from "../repositories/import.repo.js";
import { NotificationService } from "./import.service.js";

export const SubTaskService = {
  async getSubTasks(taskId, context) {
    const { user } = context;

    const task = await TaskRepo.findById(taskId);
    if (!task) throw new NotFoundError("Task not found");

    if (user.role === "USER") {
      const isAssigned =
        task.assignedTo?.toString() === user.id ||
        task.createdBy?.toString() === user.id;

      if (!isAssigned)
        throw new ForbiddenError("You do not have access to this task");
    }

    return await SubTaskRepo.findByTask(taskId);
  },

  async getSubTask(id, context) {
    const { user } = context;

    const subTask = await SubTaskRepo.findById(id);

    if (!subTask) throw new NotFoundError("SubTask not found");

    if (user.role === "USER") {
      const isAssigned =
        subTask.assignedTo?.toString() === user.id ||
        subTask.createdBy?.toString() === user.id;

      if (!isAssigned)
        throw new ForbiddenError("You do not have access to this subtask");
    }

    return subTask;
  },

  async createSubTask(data, context) {
    const { user } = context;

    const task = await TaskRepo.findById(data.taskId);
    if (!task) throw new NotFoundError("Task not found");

    // Only assigned user or admin can create subtasks
    if (user.role === "USER" && task.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to create subtasks for this task",
      );
    }

    const subTask = await SubTaskRepo.create({
      title: data.title,
      priority: data.priority || "NORMAL",
      deadline: data.deadline,
      currentStatus: "NEW",
      assignedTo: data.assignedTo,
      createdBy: user.id,
      task: data.taskId,
    });

    // Notify assigned user
    if (data.assignedTo) {
      await NotificationService.notify(
        data.assignedTo,
        `You have been assigned a new subtask: ${data.title}`,
      );
    }

    return subTask;
  },

  async updateSubTask(data, context) {
    const { user } = context;

    const subTask = await SubTaskRepo.findById(data.id);
    if (!subTask) throw new NotFoundError("SubTask not found");

    if (user.role === "USER" && subTask.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this subtask",
      );
    }

    // Notify new assignee if reassigned
    if (data.assignedTo && data.assignedTo !== subTask.assignedTo?.toString()) {
      await NotificationService.notify(
        data.assignedTo,
        `Subtask "${subTask.title}" has been assigned to you`,
      );
    }

    return await SubTaskRepo.update(data.id, {
      ...(data.title && { title: data.title }),
      ...(data.priority && { priority: data.priority }),
      ...(data.deadline && { deadline: data.deadline }),
      ...(data.assignedTo && { assignedTo: data.assignedTo }),
      ...(data.currentStatus && { currentStatus: data.currentStatus }),
    });
  },

  async updateSubTaskStatus(id, status, context) {
    const { user } = context;

    const subTask = await SubTaskRepo.findById(id);
    if (!subTask) throw new NotFoundError("SubTask not found");

    if (user.role === "USER" && subTask.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this subtask status",
      );
    }

    const updatedSubTask = await SubTaskRepo.update(id, {
      currentStatus: status,
    });

    // Notify creator when resolved
    if (status === "RESOLVED") {
      await NotificationService.notify(
        subTask.createdBy,
        `Subtask "${subTask.title}" has been marked as resolved`,
      );

      if (subTask.assignedTo?.toString() !== subTask.createdBy?.toString()) {
        await NotificationService.notify(
          subTask.assignedTo,
          `Subtask "${subTask.title}" has been marked as resolved`,
        );
      }
    }

    // Notify creator when reopened
    if (status === "REOPENED") {
      await NotificationService.notify(
        subTask.createdBy,
        `Subtask "${subTask.title}" has been reopened`,
      );
    }

    return updatedSubTask;
  },

  async deleteSubTask(id, context) {
    const { user } = context;

    const subTask = await SubTaskRepo.findById(id);
    if (!subTask) throw new NotFoundError("SubTask not found");

    if (user.role === "USER" && subTask.createdBy?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to delete this subtask",
      );
    }

    if (subTask.assignedTo) {
      await NotificationService.notify(
        subTask.assignedTo,
        `Subtask "${subTask.title}" has been deleted`,
      );
    }

    return await SubTaskRepo.delete(id);
  },
};
