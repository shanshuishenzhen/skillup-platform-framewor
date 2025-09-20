import React, { useState, useContext, useEffect } from 'react';
import ProjectContext from '../../context/project/ProjectContext';

const ProjectForm = () => {
    const projectContext = useContext(ProjectContext);
    const { addProject, updateProject, clearCurrentProject, current } = projectContext;

    useEffect(() => {
        if (current !== null) {
            setProject(current);
        } else {
            setProject({
                name: '',
                description: ''
            });
        }
    }, [projectContext, current]);

    const [project, setProject] = useState({
        name: '',
        description: ''
    });

    const { name, description } = project;

    const onChange = e => setProject({ ...project, [e.target.name]: e.target.value });

    const onSubmit = e => {
        e.preventDefault();
        if (current === null) {
            addProject(project);
        } else {
            updateProject(project);
        }
        clearAll();
    };

    const clearAll = () => {
        clearCurrentProject();
    };

    return (
        <form onSubmit={onSubmit}>
            <h2 className="text-primary">{current ? 'Edit Project' : 'Create Project'}</h2>
            <input
                type="text"
                placeholder="Project Name"
                name="name"
                value={name}
                onChange={onChange}
                required
            />
            <textarea
                placeholder="Project Description"
                name="description"
                value={description}
                onChange={onChange}
            ></textarea>
            <div>
                <input
                    type="submit"
                    value={current ? 'Update Project' : 'Add Project'}
                    className="btn btn-primary"
                />
            </div>
            {current && (
                <div>
                    <button className="btn btn-light btn-block" onClick={clearAll}>
                        Clear
                    </button>
                </div>
            )}
        </form>
    );
};

export default ProjectForm;
