import { UserService } from "../../services/user.service.js";

export const userResolvers = {
    Query: {
        profile: (_, { id }) => UserService.getProfile(id),
    },
    Mutation: {
        login: (_, { email, password }) => UserService.login(email, password),
        register: (_, args) => UserService.register(args),
    },
};