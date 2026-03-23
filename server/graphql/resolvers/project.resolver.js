import { ProjectService } from "../../services/project.service.js";

export const projectResolvers = {
  Query: {
    projects: async (_, args, context) =>
      await ProjectService.getProjects(context),
    project: async (_, { id }, context) =>
      await ProjectService.getProject(id, context),
  },
  Mutation: {
    addProject: async (_, args, context) =>
      await ProjectService.addProject(args, context),
    updateProject: async (_, args, context) =>
      await ProjectService.updateProject(args, context),
    deleteProject: async (_, { id }, context) =>
      await ProjectService.deleteProject(id, context),
    addUserToProject: async (_, args, context) =>
      await ProjectService.addUserToProject(args, context),
    removeUserFromProject: async (_, args, context) =>
      await ProjectService.removeUserFromProject(args, context),
  },
};
