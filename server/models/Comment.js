import mongoose from 'mongoose'

const CommentSchema = new mongoose.Schema({
    content: {
        type: String
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    subTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubTask'
    }
}, { timestamps: true })

const Comment = mongoose.model("Comment", CommentSchema)

export default Comment