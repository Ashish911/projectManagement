import graphql from 'graphql'
import express from 'express'
import cors from 'cors'
import colors from 'colors'
import { graphqlHTTP } from 'express-graphql'
import connectDB from './config/db.js'

const app = express()
const port = process.env.PORT || 4040

connectDB()

app.use(cors())

app.listen(port, console.log(`Server is running on port ${port}`))