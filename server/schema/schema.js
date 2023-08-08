import Client from "../models/Client.js";
import Project from "../models/Project.js";

import {
    GraphQLString,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull,
    GraphQLEnumType
} from 'graphql'

// Client
const ClientType = new GraphQLObjectType({
    name: "Client",
    fields: {
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        email: { type: GraphQLString },
        phone: { type: GraphQLString },
    }
})

// Project
const ProjectType = new GraphQLObjectType({
    name: "Project",
    fields: {
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        description: { type: GraphQLString },
        status: { type: GraphQLString },
        client: {
            type: ClientType,
            resolve: (parent, args) => {
                return Client.findById(parent.clientId)
            }
        }
    }
})

const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        projects: {
            type: new GraphQLList(ProjectType),
            resolve: (parent, args) => {
                return Project.find();
            }
        },
        project: {
            type: ProjectType,
            args:{ id :{type:new GraphQLNonNull(GraphQLID)}},
            resolve: (parent, args) => {
                return Project.findById(args.id)
            }
        },
        clients: {
            type: new GraphQLList(ClientType),
            resolve: (parent, args) => {
                return Client.find();
            }
        },
        client: {
            type: ClientType,
            args:{ id :{type:new GraphQLNonNull(GraphQLID)}},
            resolve: (parent, args) => {
                return Client.findById(args.id)
            }
        }
    }
})

// Mutations
const Mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: {
        addClient: {
            type: ClientType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                email: { type: new GraphQLNonNull(GraphQLString) },
                phone: { type: new GraphQLNonNull(GraphQLString) }
            },
            resolve: (parent, args) => {
                const client = new Client ({
                    name: args.name,
                    email: args.email,
                    phone: args.phone
                });

                return client.save()
            }
        },
        // deleteClient: {
        //     type: ClientType,
        //     args:{ id :{type:new GraphQLNonNull(GraphQLID)}},
        //     resolve: (parent, args) => {
        //         // Client.deleteOne({ _id: args.id}, (err, result) => {
        //         //     if (err) {
        //         //         return "Error deleting client" + err
        //         //     } else {
        //         //         return "Client has been deleted successfully " + result
        //         //     }
        //         // })
        //     }
        // },
        // updateClient: {

        // },
        addProject: {
            type: ProjectType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                description: { type: new GraphQLNonNull(GraphQLString) },
                status: { 
                    type: new GraphQLEnumType({
                        name: 'ProjectStatus',
                        values: {
                            new: { value: 'Not Started' },
                            progress: { value: 'In Progress' },
                            completed: { value: 'Completed' }
                        },
                    }),
                    defaultValue:'Not Started',
                },
                clientId: { type: new GraphQLNonNull(GraphQLID)}
            },
            resolve: (parent, args) => {
                const project = new Project({
                    name: args.name,
                    description: args.description,
                    status :args.status,
                    clientId: args.clientId,
                })

                return project.save()
            }
        },
        // deleteProject: {

        // },
        // updateProject:{

        // }
    }
})

const schema = new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation
})

export default schema