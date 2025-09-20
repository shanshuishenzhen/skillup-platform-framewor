import React, { useContext } from 'react';
import Projects from '../projects/Projects';
import ProjectForm from '../projects/ProjectForm';
import AuthContext from '../../context/auth/AuthContext';
import ProjectContext from '../../context/project/ProjectContext';

const Dashboard = () => {
    const authContext = useContext(AuthContext);
    const projectContext = useContext(ProjectContext);

    const onLogout = () => {
        authContext.logout();
        projectContext.clearProjects();
    };

    return (
        <div className="grid-2">
            <div>
                <ProjectForm />
            </div>
            <div>
                <h1>My Projects</h1>
                <button onClick={onLogout} className="btn btn-danger">Logout</button>
                <Projects />
            </div>
        </div>
    );
};

export default Dashboard;
