// Action Types
export const GET_PROJECTS = 'GET_PROJECTS';
export const ADD_PROJECT = 'ADD_PROJECT';
export const DELETE_PROJECT = 'DELETE_PROJECT';
export const SET_CURRENT_PROJECT = 'SET_CURRENT_PROJECT';
export const CLEAR_CURRENT_PROJECT = 'CLEAR_CURRENT_PROJECT';
export const UPDATE_PROJECT = 'UPDATE_PROJECT';
export const PROJECT_ERROR = 'PROJECT_ERROR';
export const CLEAR_PROJECTS = 'CLEAR_PROJECTS'; // e.g. on logout
export const GET_SINGLE_PROJECT = 'GET_SINGLE_PROJECT';

const projectReducer = (state, action) => {
    switch (action.type) {
        case GET_SINGLE_PROJECT:
            return {
                ...state,
                selectedProject: action.payload,
                loading: false
            };
        case GET_PROJECTS:
            return {
                ...state,
                projects: action.payload,
                loading: false
            };
        case ADD_PROJECT:
            return {
                ...state,
                projects: [action.payload, ...state.projects],
                loading: false
            };
        case UPDATE_PROJECT:
            return {
                ...state,
                projects: state.projects.map(project =>
                    project._id === action.payload._id ? action.payload : project
                ),
                loading: false
            };
        case DELETE_PROJECT:
            return {
                ...state,
                projects: state.projects.filter(
                    project => project._id !== action.payload
                ),
                loading: false
            };
        case CLEAR_PROJECTS:
            return {
                ...state,
                projects: null,
                current: null,
                error: null,
            }
        case SET_CURRENT_PROJECT:
            return {
                ...state,
                current: action.payload
            };
        case CLEAR_CURRENT_PROJECT:
            return {
                ...state,
                current: null
            };
        case PROJECT_ERROR:
            return {
                ...state,
                error: action.payload
            };
        default:
            return state;
    }
};

export default projectReducer;
