const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project'); // Needed for authorization check

// @route   PUT api/tasks/:id
// @desc    Update a task (e.g., status, assignment)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { title, status, assignedTo } = req.body;

    const taskFields = {};
    if (title) taskFields.title = title;
    if (status) taskFields.status = status;
    if (assignedTo) taskFields.assignedTo = assignedTo;

    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ msg: 'Task not found' });

        // Authorization Check: Ensure the user owns the project this task belongs to
        const project = await Project.findById(task.project);
        if (!project || project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        task = await Task.findByIdAndUpdate(
            req.params.id,
            { $set: taskFields },
            { new: true }
        );
        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ msg: 'Task not found' });

        // Authorization Check: Ensure the user owns the project this task belongs to
        const project = await Project.findById(task.project);
        if (!project || project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Task.findByIdAndRemove(req.params.id);

        res.json({ msg: 'Task removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
