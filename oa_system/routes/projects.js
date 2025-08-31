const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');

// @route   POST api/projects
// @desc    Create a new project
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, description } = req.body;
    try {
        const newProject = new Project({
            name,
            description,
            owner: req.user.id
        });
        const project = await newProject.save();
        res.json(project);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/projects
// @desc    Get all projects for a user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Find projects where the owner is the logged-in user
        const projects = await Project.find({ owner: req.user.id }).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/projects/:id
// @desc    Get a single project by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }
        // Ensure user owns the project
        if (project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        res.json(project);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/projects/:id
// @desc    Update a project
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { name, description } = req.body;
    const projectFields = {};
    if (name) projectFields.name = name;
    if (description) projectFields.description = description;

    try {
        let project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ msg: 'Project not found' });

        // Ensure user owns the project
        if (project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        project = await Project.findByIdAndUpdate(
            req.params.id,
            { $set: projectFields },
            { new: true }
        );
        res.json(project);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ msg: 'Project not found' });

        // Ensure user owns the project
        if (project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Also delete tasks associated with the project
        await Task.deleteMany({ project: req.params.id });

        await Project.findByIdAndRemove(req.params.id);

        res.json({ msg: 'Project removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- Task-related routes for a specific project ---

// @route   POST api/projects/:id/tasks
// @desc    Create a task for a project
// @access  Private
router.post('/:id/tasks', auth, async (req, res) => {
    const { title, assignedTo } = req.body;
    try {
        // First, check if the project exists and the user has access
        const project = await Project.findById(req.params.id);
        if (!project || project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const newTask = new Task({
            title,
            project: req.params.id,
            assignedTo // This can be null
        });

        const task = await newTask.save();
        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/projects/:id/tasks
// @desc    Get all tasks for a project
// @access  Private
router.get('/:id/tasks', auth, async (req, res) => {
    try {
        // Check if the project exists and the user has access
        const project = await Project.findById(req.params.id);
        if (!project || project.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const tasks = await Task.find({ project: req.params.id }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
