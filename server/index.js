import graphql from 'graphql'
import express from 'express'
import cors from 'cors'
import colors from 'colors'
import { graphqlHTTP } from 'express-graphql'
import connectDB from './config/db.js'
import schema from './schema/schema.js'

const app = express()
const port = process.env.PORT || 4040

connectDB()

app.use(cors())

app.use(
    "/graphql",
    graphqlHTTP({
        schema,
        graphiql: process.env.NODE_ENV == "development",
    })
)

app.listen(port, console.log(`Server is running on port ${port}`))