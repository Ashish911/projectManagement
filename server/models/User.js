import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String
    },
    role: {
        type: String,
        enum: ['User', 'Admin', 'Client Admin']
    },
    email: {
        type: String
    },
    number: {
        type: String
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Others']
    },
    dob: {
        type: String
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    }
})

const User = mongoose.model('User', UserSchema)

export default User