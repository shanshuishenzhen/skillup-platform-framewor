import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/auth/AuthContext';
import './Navigation.css';

const Navigation = () => {
    const { user, logout } = useContext(AuthContext);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // 获取未读消息数量
        fetchUnreadCount();
        
        // 每30秒更新一次未读数量
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const response = await axios.get('/api/messages/unread-count');
            if (response.data.success) {
                setUnreadCount(response.data.count);
            }
        } catch (error) {
            console.error('获取未读消息数量失败:', error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav className="navigation">
            <div className="nav-container">
                {/* Logo */}
                <div className="nav-logo">
                    <Link to="/" className="logo-link">
                        <span className="logo-icon">🏢</span>
                        <span className="logo-text">OA系统</span>
                    </Link>
                </div>

                {/* 主导航菜单 */}
                <div className="nav-menu">
                    <Link 
                        to="/" 
                        className={`nav-item ${isActive('/') ? 'active' : ''}`}
                        title="仪表板"
                    >
                        <span className="nav-icon">📊</span>
                        <span className="nav-text">仪表板</span>
                    </Link>

                    <Link 
                        to="/projects" 
                        className={`nav-item ${location.pathname.startsWith('/project') ? 'active' : ''}`}
                        title="项目管理"
                    >
                        <span className="nav-icon">📋</span>
                        <span className="nav-text">项目</span>
                    </Link>

                    <Link 
                        to="/chat" 
                        className={`nav-item ${isActive('/chat') ? 'active' : ''}`}
                        title="聊天"
                    >
                        <span className="nav-icon">💬</span>
                        <span className="nav-text">聊天</span>
                        {unreadCount > 0 && (
                            <span className="unread-badge">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Link>

                    <Link 
                        to="/files" 
                        className={`nav-item ${isActive('/files') ? 'active' : ''}`}
                        title="文件管理"
                    >
                        <span className="nav-icon">📁</span>
                        <span className="nav-text">文件</span>
                    </Link>
                </div>

                {/* 用户菜单 */}
                <div className="nav-user">
                    <div 
                        className="user-profile"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <img 
                            src={user?.avatar || '/default-avatar.png'} 
                            alt={user?.name}
                            className="user-avatar"
                        />
                        <span className="user-name">{user?.name}</span>
                        <span className="dropdown-arrow">▼</span>
                    </div>

                    {showUserMenu && (
                        <div className="user-menu">
                            <div className="user-info">
                                <div className="user-name-full">{user?.name}</div>
                                <div className="user-email">{user?.email}</div>
                            </div>
                            
                            <div className="menu-divider"></div>
                            
                            <Link 
                                to="/profile" 
                                className="menu-item"
                                onClick={() => setShowUserMenu(false)}
                            >
                                <span className="menu-icon">👤</span>
                                个人资料
                            </Link>
                            
                            <Link 
                                to="/settings" 
                                className="menu-item"
                                onClick={() => setShowUserMenu(false)}
                            >
                                <span className="menu-icon">⚙️</span>
                                设置
                            </Link>
                            
                            <div className="menu-divider"></div>
                            
                            <button 
                                className="menu-item logout-btn"
                                onClick={handleLogout}
                            >
                                <span className="menu-icon">🚪</span>
                                退出登录
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 移动端菜单按钮 */}
            <div className="mobile-menu-toggle">
                <button className="menu-toggle-btn">
                    ☰
                </button>
            </div>
        </nav>
    );
};

export default Navigation;
