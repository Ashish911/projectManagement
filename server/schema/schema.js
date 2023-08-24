import Client from "../models/Client.js";
import Project from "../models/Project.js";

import {
    GraphQLString,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLID,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLEnumType
} from 'graphql'

const UserType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        phone: { type: new GraphQLNonNull(GraphQLString) },
        role: { type: new GraphQLNonNull(GraphQLString) },
        dob: { type: new GraphQLNonNull(GraphQLString) },
        gender: { type: new GraphQLNonNull(GraphQLString) }
    }
})

const AuthType = new GraphQLObjectType({
    name: "Auth",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        token: { type: new GraphQLNonNull(GraphQLString) },
        tokenExpiration: { type: new GraphQLNonNull(GraphQLInt) },
    }
})

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
        login: {
            type: AuthType,
            args: {
                email: { type: new GraphQLNonNull(GraphQLString) },
                password: { type: new GraphQLNonNull(GraphQLString) }
            },
            resolve: async (parent, args) => {
                const user =  await User.find({ email: args.email})

                console.log(User.findById(user[0].id))

                if (!user[0]?.email) {
                    throw new Error('User not found')
                }
    
                if (user[0]?.loginAttempts >= 5 && user[0]?.lastFailedLogin) {
                    const lastFailedLoginTime = new Date(user[0]?.lastFailedLogin).getTime()
                    const currentTime = new Date().getTime();
                    const timeSinceLastFailedLogin = currentTime - lastFailedLoginTime
    
                    if (timeSinceLastFailedLogin < 3600000) {
                        throw new Error('Too many failed login attempts. Please try again after 1 hr.')
                    }
                }
    
                const validPassword = await bcrypt.compare(args.password, user[0]?.password)
                if (!validPassword) {
                    user.loginAttempts += 1
                    user.lastFailedLogin = new Date().toISOString()

                    await User.save(user)
                    throw new Error('Invalid password')
                }
    
                user.loginAttempts = 0
                user.lastFailedLogin = null
                await User.updateOne({ email: user[0]?.email }, { loginAttempts: attempts, lastFailedLogin: lastFailedLogin })

                const token = jwt.sign({ id: user[0]?.id, email: user[0]?.email }, process.env.SECRET_KEY, { expiresIn: '1h' })

                return { id: user[0]?.id, email: user[0]?.email, token, tokenExpiration: 1 }
            }
        },
        register: {
            type: UserType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                email: { type: new GraphQLNonNull(GraphQLString) },
                phone: { type: new GraphQLNonNull(GraphQLString) },
                dob: { type: new GraphQLNonNull(GraphQLString) },
                password: { type: new GraphQLNonNull(GraphQLString) },
                role: { 
                    type: new GraphQLEnumType({
                        name: 'UserRole',
                        values: {
                            su: { value: 'Super Admin' },
                            ca: { value: 'Client Admin' },
                            u: { value: 'User' }
                        },
                    }),
                    defaultValue:'User',
                },
                gender: { 
                    type: new GraphQLEnumType({
                        name: 'Gender',
                        values: {
                            M: { value: 'Male' },
                            F: { value: 'Female' },
                            O: { value: 'Others' }
                        },
                    }),
                    defaultValue:'Male',
                }
            },
            resolve: async (parent, args) => {
                const email = await User.findOne({ email: args.email })
                
                console.log(email)

                if (email != null) {
                    if (!email[0]?.email) {
                        throw new Error('Email already exists please use a different email')
                    }
                }

                const hashedPassword = await bcrypt.hash(args.password, 10);
                const user = new User({
                    name: args.name,
                    email: args.email,
                    phone: args.phone,
                    role: args.role,
                    dob: args.dob,
                    gender: args.gender,
                    password: hashedPassword,
                    loginAttempts: 0,
                    lastFailedLogin: null
                })

                return await user.save()
            }
        },
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
        deleteClient: {
            type: ClientType,
            args:{ id :{type:new GraphQLNonNull(GraphQLID)}},
            resolve: (parent, args) => {
                Project.find({ clientId: args.id }).then((projects) => {
                    projects.forEach ((project)=>{
                        project.deleteOne()
                    })
                })
                
                return Client.findByIdAndRemove(args.id)
            }
        },
        updateClient: {
            type: ClientType,
            args: { 
                id : {type:new GraphQLNonNull(GraphQLID)},
                name: { type: new GraphQLNonNull(GraphQLString) },
                email: { type: new GraphQLNonNull(GraphQLString) },
                phone: { type: new GraphQLNonNull(GraphQLString) }
            },
            resolve: (parent, args) => {
                return Client.findByIdAndUpdate(
                    args.id,
                    {
                        $set: {
                            name: args.name,
                            email: args.email,
                            phone: args.phone
                        }
                    },
                    { new: true }
                )
            }
        },
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
        deleteProject: {
            type: ProjectType,
            args:{ id :{type:new GraphQLNonNull(GraphQLID)}},
            resolve: (parent, args) => {
                return Project.findByIdAndRemove(args.id)
            }
        },
        updateProject:{
            type: ProjectType,
            args: {
                id : {type:new GraphQLNonNull(GraphQLID)},
                name: { type: new GraphQLNonNull(GraphQLString) },
                description: { type: new GraphQLNonNull(GraphQLString) },
                status: { 
                    type: new GraphQLEnumType({
                        name: 'UpdateProjectStatus',
                        values: {
                            new: { value: 'Not Started' },
                            progress: { value: 'In Progress' },
                            completed: { value: 'Completed' }
                        },
                    }),
                    defaultValue:'Not Started',
                }
            },
            resolve: (parent, args) => {
                return Project.findByIdAndUpdate(
                    args.id,
                    {
                        $set: {
                            name: args.name,
                            description: args.description,
                            status: args.status
                        }
                    },
                    { new: true }
                )
            }
        }
    }
})

const schema = new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation
})

export default schema