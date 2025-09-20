import React, { useReducer } from 'react';
import axios from 'axios';
import ProjectContext from './ProjectContext';
import projectReducer from './projectReducer';
import {
    GET_PROJECTS,
    ADD_PROJECT,
    PROJECT_ERROR,
    // DELETE_PROJECT,
    // SET_CURRENT_PROJECT,
    // CLEAR_CURRENT_PROJECT,
    // UPDATE_PROJECT,
    CLEAR_PROJECTS
} from './projectReducer';

const ProjectState = props => {
    const initialState = {
        projects: null,
        selectedProject: null,
        current: null, // To store the project being edited
        error: null,
        loading: true
    };

    const [state, dispatch] = useReducer(projectReducer, initialState);

    // Get Single Project
    const getProject = async id => {
        try {
            const res = await axios.get(`/api/projects/${id}`);
            dispatch({
                type: 'GET_SINGLE_PROJECT',
                payload: res.data
            });
        } catch (err) {
            dispatch({
                type: PROJECT_ERROR,
                payload: err.response.msg
            });
        }
    };

    // Get Projects
    const getProjects = async () => {
        try {
            const res = await axios.get('/api/projects');
            dispatch({
                type: GET_PROJECTS,
                payload: res.data
            });
        } catch (err) {
            dispatch({
                type: PROJECT_ERROR,
                payload: err.response.msg
            });
        }
    };

    // Add Project
    const addProject = async project => {
        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        try {
            const res = await axios.post('/api/projects', project, config);
            dispatch({
                type: ADD_PROJECT,
                payload: res.data
            });
        } catch (err) {
            dispatch({
                type: PROJECT_ERROR,
                payload: err.response.data.msg
            });
        }
    };

    // Delete Project
    const deleteProject = async id => {
        try {
            await axios.delete(`/api/projects/${id}`);
            dispatch({
                type: 'DELETE_PROJECT', // Using string to avoid import issues for one-off
                payload: id
            });
        } catch (err) {
            dispatch({
                type: PROJECT_ERROR,
                payload: err.response.data.msg
            });
        }
    };

    // Update Project
    const updateProject = async project => {
        const config = { headers: { 'Content-Type': 'application/json' } };
        try {
            const res = await axios.put(`/api/projects/${project._id}`, project, config);
            dispatch({ type: 'UPDATE_PROJECT', payload: res.data });
        } catch (err) {
            dispatch({ type: PROJECT_ERROR, payload: err.response.data.msg });
        }
    };

    // Set Current Project
    const setCurrentProject = project => {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
    };

    // Clear Current Project
    const clearCurrentProject = () => {
        dispatch({ type: 'CLEAR_CURRENT_PROJECT' });
    };

    // Clear Projects (on logout)
    const clearProjects = () => {
        dispatch({ type: CLEAR_PROJECTS });
    }

    return (
        <ProjectContext.Provider
            value={{
                projects: state.projects,
                selectedProject: state.selectedProject,
                current: state.current,
                error: state.error,
                loading: state.loading,
                getProject,
                getProjects,
                addProject,
                deleteProject,
                updateProject,
                setCurrentProject,
                clearCurrentProject,
                clearProjects
            }}
        >
            {props.children}
        </ProjectContext.Provider>
    );
};

export default ProjectState;
