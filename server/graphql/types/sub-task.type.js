import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { User } from "../../models/import.js";
import { UserType } from "./import.type.js";

export const SubTaskType = new GraphQLObjectType({
  name: "SubTask",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    priority: { type: new GraphQLNonNull(GraphQLString) },
    deadline: { type: new GraphQLNonNull(GraphQLString) },
    currentStatus: { type: new GraphQLNonNull(GraphQLString) },
    assignedTo: {
      type: UserType,
      resolve: (parent) => {
        return User.findById(parent.assignedTo);
      },
    },
    createdBy: {
      type: UserType,
      resolve: (parent) => {
        return User.findById(parent.createdBy);
      },
    },
  },
});
