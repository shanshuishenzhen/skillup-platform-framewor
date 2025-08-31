import React, { useContext, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProjectContext from '../../context/project/ProjectContext';

const ProjectDetail = () => {
    const { id } = useParams();
    const projectContext = useContext(ProjectContext);
    const { getProject, selectedProject, loading } = projectContext;

    useEffect(() => {
        getProject(id);
        // eslint-disable-next-line
    }, [id]);

    if (loading || selectedProject === null) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container">
            <Link to="/" className="btn btn-dark">Back to Dashboard</Link>
            <h1>{selectedProject.name}</h1>
            <p>{selectedProject.description}</p>
            <hr />
            {/* Task and File management components will go here */}
            <h3>Tasks</h3>
            <p>Task management UI will be here.</p>
            <h3>Files</h3>
            <p>File management UI will be here.</p>
        </div>
    );
};

export default ProjectDetail;
