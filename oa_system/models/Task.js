const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['To Do', 'In Progress', 'Done'],
        default: 'To Do'
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        // A task might not be assigned initially
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Task', TaskSchema);
