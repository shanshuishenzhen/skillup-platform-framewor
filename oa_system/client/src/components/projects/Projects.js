import React, { useContext, useEffect } from 'react';
import ProjectContext from '../../context/project/ProjectContext';
import ProjectItem from './ProjectItem'; // This component doesn't exist yet

const Projects = () => {
    const projectContext = useContext(ProjectContext);
    const { projects, getProjects, loading } = projectContext;

    useEffect(() => {
        getProjects();
        // eslint-disable-next-line
    }, []);

    if (projects !== null && projects.length === 0 && !loading) {
        return <h4>Please add a project</h4>;
    }

    return (
        <div>
            {projects !== null && !loading ? (
                projects.map(project => (
                    // The key should be on the outermost element in the map
                    <ProjectItem key={project._id} project={project} />
                ))
            ) : (
                <div>Loading...</div> // Or a spinner component
            )}
        </div>
    );
};

export default Projects;
