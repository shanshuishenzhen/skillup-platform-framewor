import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import ProjectDetail from './components/projects/ProjectDetail';
import Chat from './components/chat/Chat';
import AuthState from './context/auth/AuthState';
import AuthContext from './context/auth/AuthContext';
import ProjectState from './context/project/ProjectState';
import setAuthToken from './utils/setAuthToken';
import './App.css'; // I'll create a basic css file

// Set token on initial load
if (localStorage.token) {
    setAuthToken(localStorage.token);
}

// A simple component to protect routes
const PrivateRoute = ({ children }) => {
    const authContext = React.useContext(AuthContext);
    const { isAuthenticated, loading } = authContext;

    // Don't render until loading is false
    if (loading) {
        return <div>Loading...</div>;
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
};


const AppContent = () => {
    const authContext = React.useContext(AuthContext);
    React.useEffect(() => {
        // This call will get the user data if a token exists
        authContext.loadUser();
        // eslint-disable-next-line
    }, []);

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Dashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/project/:id"
                        element={
                            <PrivateRoute>
                                <ProjectDetail />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/chat"
                        element={
                            <PrivateRoute>
                                <Chat />
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
};

const App = () => {
    return (
        <AuthState>
            <ProjectState>
                <AppContent />
            </ProjectState>
        </AuthState>
    );
}

export default App;
