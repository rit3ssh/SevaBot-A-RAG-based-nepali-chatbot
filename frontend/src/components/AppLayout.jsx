import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { conversationAPI, authAPI } from '../services/api';
import Sidebar from './Sidebar';

// Context so child pages (Chat, Profile) can interact with the layout
export const AppLayoutContext = createContext(null);

export function useAppLayout() {
  return useContext(AppLayoutContext);
}

export default function AppLayout() {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isDark, setIsDark] = useState(false);

  // Load user and theme from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    const savedTheme = localStorage.getItem('chat-theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chat-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await conversationAPI.list();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSelectConversation = useCallback((id) => {
    // Navigate to chat and let Chat page load the conversation
    navigate('/chat', { state: { conversationId: id } });
    setSidebarOpen(false);
  }, [navigate]);

  const handleNewChat = useCallback(async () => {
    try {
      const response = await conversationAPI.create({ title: 'नयाँ कुराकानी' });
      setConversations((prev) => [response.data, ...prev]);
      setActiveConversation(response.data);
      setSidebarOpen(false);
      navigate('/chat', { state: { conversationId: response.data.id, fresh: true } });
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  }, [navigate]);

  const handleDeleteConversation = useCallback(async (conversationId) => {
    try {
      await conversationAPI.delete(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('कुराकानी मेटाउन असफल भयो।');
    }
  }, [activeConversation]);

  const contextValue = {
    conversations,
    setConversations,
    activeConversation,
    setActiveConversation,
    sidebarOpen,
    setSidebarOpen,
    user,
    setUser,
    isDark,
    setIsDark,
    loadConversations,
    handleLogout,
  };

  return (
    <AppLayoutContext.Provider value={contextValue}>
      <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <Sidebar
          conversations={conversations}
          activeConversation={activeConversation}
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onLogout={handleLogout}
          onDeleteConversation={handleDeleteConversation}
          isDark={isDark}
        />

        {/* Main content area — each page fills this */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
    </AppLayoutContext.Provider>
  );
}
