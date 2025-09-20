import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/auth/AuthContext';

const Login = () => {
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();

    const { login, error, clearErrors, isAuthenticated } = authContext;

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/'); // Redirect to dashboard if logged in
        }

        if (error) {
            alert(error); // Simple error display
            clearErrors();
        }
        // eslint-disable-next-line
    }, [error, isAuthenticated, navigate]);

    const [user, setUser] = useState({
        username: '',
        password: '',
    });

    const { username, password } = user;

    const onChange = e => setUser({ ...user, [e.target.name]: e.target.value });

    const onSubmit = e => {
        e.preventDefault();
        if (username === '' || password === '') {
            alert('Please fill in all fields');
        } else {
            login({
                username,
                password,
            });
        }
    };

    return (
        <div className="form-container">
            <h1>
                Account <span className="text-primary">Login</span>
            </h1>
            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        name="username"
                        value={username}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        name="password"
                        value={password}
                        onChange={onChange}
                        required
                    />
                </div>
                <input type="submit" value="Login" className="btn btn-primary btn-block" />
            </form>
            <p>
                Don't have an account? <Link to="/register">Register</Link>
            </p>
        </div>
    );
};

export default Login;
