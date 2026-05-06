import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentHome from './pages/StudentHome';
import PRODashboard from './pages/PRODashboard';
import SecretaryDashboard from './pages/SecretaryDashboard';
import ElectionDetail from './pages/ElectionDetail';
import Candidates from './pages/Candidates';
import Results from './pages/Results';
import VotingList from './pages/VotingList';
import AdminElections from './pages/AdminElections';
import AdminCandidates from './pages/AdminCandidates';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminFeedback from './pages/AdminFeedback';
import AdminCommunications from './pages/AdminCommunications';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import AnnouncementStories from './components/AnnouncementStories';
import { Button } from '@/components/ui/button';
import { LogOut, Vote, User, ChevronDown, Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface User {
  id: number;
  name: string;
  role: string;
  type: 'student' | 'ec' | 'it';
  full_name?: string;
  student_number?: string;
  faculty?: string;
  program?: string;
  residence?: string;
  is_eligible?: boolean;
}

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  is_read: boolean;
  timestamp: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  loading: boolean;
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => void;
  markNotificationAsRead: (id: number) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => useContext(AuthContext)!;

const normalizeRole = (role?: string | null) => {
  return (role || '')
    .toLowerCase()
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
};

const isPublicRelationsOfficer = (user: User | null) => {
  const role = normalizeRole(user?.role);

  return (
    role === 'pro' ||
    role === 'public relations officer' ||
    role === 'ec public relations officer' ||
    role.includes('public relations')
  );
};

const isGeneralSecretary = (user: User | null) => {
  return normalizeRole(user?.role) === 'general secretary';
};

const canViewAuditLogs = (user: User | null) => {
  const role = normalizeRole(user?.role);

  return (
    user?.type === 'it' ||
    (user?.type === 'ec' && (role === 'chairperson' || role === 'vice chairperson'))
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data);
        setLoading(false);
        if (data && data.type === 'student') {
          fetchNotifications();
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchNotifications = () => {
    fetch('/api/student/notifications')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch(() => {});
  };

  const markNotificationAsRead = (id: number) => {
    fetch(`/api/student/notifications/${id}/read`, { method: 'POST' }).then(() =>
      fetchNotifications()
    );
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const login = (u: User) => setUser(u);

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => setUser(null));
  };

  const renderHomeDashboard = () => {
    if (!user) return <Navigate to="/login" />;

    if (user.type === 'student') return <StudentHome />;

    if (isPublicRelationsOfficer(user)) return <PRODashboard />;

    if (isGeneralSecretary(user)) return <SecretaryDashboard />;

    return <Dashboard />;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        notifications,
        unreadCount,
        fetchNotifications,
        markNotificationAsRead,
        notificationsOpen,
        setNotificationsOpen,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      <Router>
        <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
          {user && (
            <nav className="border-b border-neutral-700 bg-[#343A40] text-white sticky top-0 z-50">
              <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <div className="flex items-center gap-4 sm:gap-8">
                    <Link
                      to="/"
                      className="flex items-center gap-2 font-bold text-xl text-white hover:text-blue-400 transition-colors"
                    >
                      <Vote className="w-6 h-6 text-white" />
                      <span>SOVS</span>
                    </Link>
                    <div className="flex items-center gap-4" />
                  </div>

                  <div className="flex items-center gap-2 relative">
                    {user.type === 'student' && (
                      <div className="relative hidden md:block">
                        <AnimatePresence>
                          {notificationsOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
                                onClick={() => setNotificationsOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="fixed inset-0 m-auto z-[60] w-[calc(100vw-2rem)] max-w-sm h-fit max-h-[80vh] md:absolute md:inset-auto md:right-0 md:top-[120%] md:w-80 md:z-50 bg-white rounded-3xl md:rounded-xl shadow-2xl border p-2 overflow-hidden"
                              >
                                <div className="px-4 py-3 border-b mb-1 flex items-center justify-between">
                                  <div className="flex flex-col gap-0.5">
                                    <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                                      Notifications
                                    </p>
                                    {unreadCount > 0 && (
                                      <span className="text-[10px] text-primary font-bold">
                                        {unreadCount} New items
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full md:hidden"
                                    onClick={() => setNotificationsOpen(false)}
                                  >
                                    <X className="w-4 h-4 text-neutral-400" />
                                  </Button>
                                </div>

                                <div className="max-h-[60vh] md:max-h-[350px] overflow-y-auto no-scrollbar px-1">
                                  {notifications.length > 0 ? (
                                    notifications.map((notification) => (
                                      <div
                                        key={notification.notification_id}
                                        className={`p-3 rounded-lg border-b last:border-0 cursor-pointer transition-colors ${
                                          notification.is_read
                                            ? 'opacity-60 bg-white'
                                            : 'bg-blue-50/30'
                                        }`}
                                        onClick={() => {
                                          if (!notification.is_read) {
                                            markNotificationAsRead(notification.notification_id);
                                          }
                                        }}
                                      >
                                        <p className="text-sm font-bold text-neutral-800">
                                          {notification.title}
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                          {notification.message}
                                        </p>
                                        <p className="text-[10px] text-neutral-400 mt-2">
                                          {new Date(notification.timestamp).toLocaleString()}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-8 text-center">
                                      <Bell className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                                      <p className="text-xs text-neutral-400 italic">
                                        No notifications yet.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div
                      className="flex items-center gap-3 cursor-pointer hover:bg-neutral-700 p-1.5 rounded-lg transition-colors border border-transparent hover:border-neutral-600"
                      onClick={() => setProfileOpen(!profileOpen)}
                    >
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold leading-tight text-white">
                          {user.full_name || user.name}
                        </p>
                        <p className="text-[10px] text-neutral-300 uppercase tracking-wider font-bold">
                          {normalizeRole(user.role) || user.type}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-300 transition-transform ${
                          profileOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      onClick={logout}
                      className="font-black text-[10px] sm:text-[11px] uppercase tracking-widest gap-1 sm:gap-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-2 sm:px-4 h-9 sm:h-10 rounded-lg flex items-center"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>

                    <AnimatePresence>
                      {profileOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
                            onClick={() => setProfileOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 m-auto z-[60] w-[calc(100vw-2rem)] max-w-sm h-fit md:absolute md:inset-auto md:right-0 md:top-[120%] md:w-56 md:z-50 bg-white rounded-3xl md:rounded-xl shadow-2xl border p-2 overflow-hidden"
                          >
                            <div className="px-3 py-2 border-b mb-1 flex items-center justify-between">
                              <div className="flex flex-col">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                                  Signed in as
                                </p>
                                <p className="text-sm font-black truncate leading-tight text-neutral-900">
                                  {user.full_name || user.name}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full md:hidden"
                                onClick={() => setProfileOpen(false)}
                              >
                                <X className="w-4 h-4 text-neutral-400" />
                              </Button>
                            </div>

                            <Link
                              to="/profile"
                              className="flex items-center gap-2 px-3 py-3 md:py-2 text-sm text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors"
                              onClick={() => setProfileOpen(false)}
                            >
                              <User className="w-4 h-4" />
                              View Profile
                            </Link>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </nav>
          )}

          {user?.type === 'student' && <AnnouncementStories />}

          {user?.type === 'student' && (
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-16 z-40">
              <Button
                variant="ghost"
                className="font-black text-xs uppercase tracking-[0.2em] gap-2.5 px-0 hover:bg-transparent text-neutral-800"
                onClick={() => setSidebarOpen(true)}
              >
                <div className="flex flex-col gap-1">
                  <div className="h-0.5 w-5 bg-neutral-800 rounded-full" />
                  <div className="h-0.5 w-3 bg-blue-500 rounded-full" />
                  <div className="h-0.5 w-5 bg-neutral-800 rounded-full" />
                </div>
                Menu
              </Button>

              <div className="flex items-center gap-2" />
            </div>
          )}

          <main className="w-full mx-auto px-4 sm:px-4 lg:px-8 py-8 md:px-8 lg:py-10">
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/" element={renderHomeDashboard()} />
              <Route path="/election/:id" element={user ? <ElectionDetail /> : <Navigate to="/login" />} />
              <Route
                path="/voting"
                element={user && user.type === 'student' ? <VotingList /> : <Navigate to="/login" />}
              />
              <Route
                path="/election/:id/candidates"
                element={user ? <Candidates /> : <Navigate to="/login" />}
              />
              <Route
                path="/election/:id/results"
                element={user ? <Results /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin/elections"
                element={user && (user.type === 'ec' || user.type === 'it') ? <AdminElections /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/candidates"
                element={user && (user.type === 'ec' || user.type === 'it') ? <AdminCandidates /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/announcements"
                element={user && (user.type === 'ec' || user.type === 'it') ? <AdminAnnouncements /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/feedback"
                element={user && (user.type === 'ec' || user.type === 'it') ? <AdminFeedback /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/communications"
                element={user && (user.type === 'ec' || user.type === 'it') ? <AdminCommunications /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/logs"
                element={user && canViewAuditLogs(user) ? <AuditLogs /> : <Navigate to="/" />}
              />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </Router>
    </AuthContext.Provider>
  );
}
