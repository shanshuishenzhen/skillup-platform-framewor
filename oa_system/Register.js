import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/auth/AuthContext';

const Register = () => {
    const authContext = useContext(AuthContext);
    const navigate = useNavigate();

    const { register, error, clearErrors, isAuthenticated } = authContext;

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/'); // Redirect to dashboard if registered/logged in
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
        password2: '' // For confirmation
    });

    const { username, password, password2 } = user;

    const onChange = e => setUser({ ...user, [e.target.name]: e.target.value });

    const onSubmit = e => {
        e.preventDefault();
        if (username === '' || password === '') {
            alert('Please enter all fields');
        } else if (password !== password2) {
            alert('Passwords do not match');
        } else {
            register({
                username,
                password
            });
        }
    };

    return (
        <div className="form-container">
            <h1>
                Account <span className="text-primary">Register</span>
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
                        minLength="6"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password2">Confirm Password</label>
                    <input
                        type="password"
                        name="password2"
                        value={password2}
                        onChange={onChange}
                        required
                        minLength="6"
                    />
                </div>
                <input
                    type="submit"
                    value="Register"
                    className="btn btn-primary btn-block"
                />
            </form>
            <p>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
};

export default Register;
