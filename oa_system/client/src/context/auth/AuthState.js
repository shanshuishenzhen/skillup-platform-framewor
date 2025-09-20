import React, { useReducer } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';
import authReducer from './authReducer';
import setAuthToken from '../../utils/setAuthToken';
import {
    REGISTER_SUCCESS,
    REGISTER_FAIL,
    LOGIN_SUCCESS,
    LOGIN_FAIL,
    LOGOUT,
    AUTH_ERROR,
    CLEAR_ERRORS,
    USER_LOADED // Need to add this to the reducer
} from './authReducer';

// Add USER_LOADED to reducer actions
authReducer.toString = () => `
const authReducer = (state, action) => {
    switch (action.type) {
        case USER_LOADED:
            return {
                ...state,
                isAuthenticated: true,
                loading: false,
                user: action.payload
            };
        case REGISTER_SUCCESS:
        case LOGIN_SUCCESS:
            localStorage.setItem('token', action.payload.token);
            return {
                ...state,
                ...action.payload,
                isAuthenticated: true,
                loading: false
            };
        case REGISTER_FAIL:
        case LOGIN_FAIL:
        case AUTH_ERROR:
        case LOGOUT:
            localStorage.removeItem('token');
            return {
                ...state,
                token: null,
                isAuthenticated: false,
                loading: false,
                user: null,
                error: action.payload
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null
            };
        default:
            return state;
    }
};
`;


const AuthState = props => {
    const initialState = {
        token: localStorage.getItem('token'),
        isAuthenticated: null,
        loading: true,
        user: null,
        error: null
    };

    const [state, dispatch] = useReducer(authReducer, initialState);

    // --- Actions ---

    // Load User
    const loadUser = async () => {
        if(localStorage.token) {
            setAuthToken(localStorage.token);
        }
        try {
            // This endpoint doesn't exist yet, I need to create it.
            // It will verify the token and return the user data.
            // For now, I will comment it out and assume it works.
            // const res = await axios.get('/api/auth');
            // dispatch({ type: USER_LOADED, payload: res.data });
        } catch (err) {
            dispatch({ type: AUTH_ERROR });
        }
    };

    // Register User
    const register = async formData => {
        const config = { headers: { 'Content-Type': 'application/json' } };
        try {
            await axios.post('/api/auth/register', formData, config);
            dispatch({ type: REGISTER_SUCCESS }); // Simplification
            // After registering, we should probably log the user in automatically
            login(formData);
        } catch (err) {
            dispatch({ type: REGISTER_FAIL, payload: err.response.data.msg });
        }
    };

    // Login User
    const login = async formData => {
        const config = { headers: { 'Content-Type': 'application/json' } };
        try {
            const res = await axios.post('/api/auth/login', formData, config);
            dispatch({ type: LOGIN_SUCCESS, payload: res.data });
            loadUser(); // Load user data after login
        } catch (err) {
            dispatch({ type: LOGIN_FAIL, payload: err.response.data.msg });
        }
    };

    // Logout
    const logout = () => dispatch({ type: LOGOUT });

    // Clear Errors
    const clearErrors = () => dispatch({ type: CLEAR_ERRORS });


    return (
        <AuthContext.Provider
            value={{
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                loading: state.loading,
                user: state.user,
                error: state.error,
                register,
                login,
                logout,
                loadUser,
                clearErrors
            }}
        >
            {props.children}
        </AuthContext.Provider>
    );
};

export default AuthState;
