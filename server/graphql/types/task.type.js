import { User, Project } from "../../models/import.js";
import { GraphQLString, GraphQLObjectType, GraphQLID, GraphQLNonNull } from "graphql";
import { UserType, ProjectType } from "./import.type.js";

export const TaskType = new GraphQLObjectType({
    name: "Task",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        priority: { type: new GraphQLNonNull(GraphQLString) },
        deadline: { type: new GraphQLNonNull(GraphQLString) },
        currentStatus: { type: new GraphQLNonNull(GraphQLString) },
        assignedTo: {
            type: UserType,
            resolve: (parent, args) => {
                return User.findById(parent.id);
            },
        },
        createdBy: {
            type: UserType,
            resolve: (parent, args) => {
                return User.findById(parent.id);
            },
        },
        project: {
            type: ProjectType,
            resolve: (parent, args) => {
                return Project.findById(parent);
            },
        },
    },
});