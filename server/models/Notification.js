import mongoose from 'mongoose'

const PreferenceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    content: {
        type: String
    },
    status: {
        type: String,
        enum: ['Read', 'Unread']
    }
})

const Preference = mongoose.model("Preference", PreferenceSchema)

export default Preference