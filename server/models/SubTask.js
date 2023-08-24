import mongoose from 'mongoose'

const SubTaskSchema = new mongoose.Schema({
    priority: {
        type: String,
        enum: ['Urgent', 'High', 'Normal', 'Backlog']
    },
    deadline: {
        type: String
    },
    currentStatus: {
        type: String,
        enum: ['New', 'InProgress', 'Resolved', 'ReOpened']
    },
    assignedTo: {
        type: String
    },
    createdBy: {
        type: String
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }
}, { timestamps: true })

const SubTask = mongoose.model("SubTask", SubTaskSchema)

export default SubTask