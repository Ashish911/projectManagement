import {GraphQLID, GraphQLList, GraphQLNonNull} from "graphql";
import Project from "../../models/Project.js";
import {ProjectType} from "../types/project.type.js";
import {ProjectService} from "../../services/project.service.js";


export const projectResolvers = {
    Query: {
        getProjects: async () => await ProjectService.getProjects(),
        project: async (_, { id }) => await ProjectService.getProject(id)
    },
    Mutation: {
        createProject: async (_, args, context) => await ProjectService.createProject(args),
        updateProject: async (_, args, context) => await ProjectService.updateProject(args),
        deleteProject: async (_, args, context) => await ProjectService.deleteProject(args)
    },
};