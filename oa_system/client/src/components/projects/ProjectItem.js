import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ProjectContext from '../../context/project/ProjectContext';

const ProjectItem = ({ project }) => {
    const projectContext = useContext(ProjectContext);
    const { deleteProject, setCurrentProject } = projectContext;
    const { _id, name, description } = project;

    const onDelete = () => {
        deleteProject(_id);
    };

    const onEdit = () => {
        setCurrentProject(project);
    };

    return (
        <div className='card bg-light'>
            <h3 className="text-primary text-left">
                <Link to={`/project/${_id}`}>{name}</Link>
            </h3>
            <p>{description}</p>
            <p>
                <button className="btn btn-dark btn-sm" onClick={onEdit}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
            </p>
        </div>
    );
};

ProjectItem.propTypes = {
    project: PropTypes.object.isRequired
};

export default ProjectItem;
