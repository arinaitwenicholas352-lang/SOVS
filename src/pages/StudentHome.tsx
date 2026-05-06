import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Vote, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  GraduationCap, 
  ArrowRight,
  Info,
  History as HistoryIcon,
  Users,
  Trophy,
  HelpCircle,
  BarChart3,
  Search,
  BookOpen,
  MessageCircle,
  ShieldCheck,
  LayoutDashboard,
  Megaphone,
  Plus,
  Menu,
  X,
  LogOut,
  Quote,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Election {
  election_id: number;
  title: string;
  description: string;
  status: string;
  start_time: string;
  end_time: string;
  is_results_approved: boolean;
}

interface VotingHistory {
  timestamp: string;
  title: string;
  election_id: number;
}

interface Candidate {
  candidate_id: number;
  name: string;
  position_title: string;
  designation?: string;
  manifesto?: string;
  photo_url?: string;
  political_affiliation?: string;
}

interface Announcement {
  id: number;
  announcement_id: number;
  title: string;
  message: string;
  image_path?: string | null;
  image_url?: string | null;
  image_paths?: string[];
  created_at: string;
  is_read?: number | boolean;
}

const CountdownTimer = ({ endTime, label }: { endTime: string, label: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(endTime) - +new Date();
      if (difference <= 0) return 'Passed';
      
      const hours = Math.floor((difference / (1000 * 60 * 60)));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      return `${hours}h ${minutes}m ${seconds}s`;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    setTimeLeft(calculateTime());
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
      <Clock className="w-3.5 h-3.5" />
      <span>{label}: {timeLeft}</span>
    </div>
  );
};

export default function StudentHome() {
  const { user, logout, unreadCount, notificationsOpen, setNotificationsOpen, sidebarOpen, setSidebarOpen } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [history, setHistory] = useState<VotingHistory[]>([]);
  const [eligibleCandidates, setEligibleCandidates] = useState<Candidate[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewingManifesto, setViewingManifesto] = useState<Candidate | null>(null);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!feedbackTitle.trim() || !feedbackContent.trim()) {
      toast.error("Please fill in both title and description");
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const res = await fetch('/api/student/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feedbackTitle,
          content: feedbackContent,
          category: 'complaint'
        })
      });

      if (res.ok) {
        toast.success("Support ticket submitted successfully!");
        setFeedbackTitle('');
        setFeedbackContent('');
      } else {
        toast.error("Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const tabOptions = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'vote', label: 'Vote Now', icon: Vote },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'elections', label: 'Elections', icon: Calendar },
    { id: 'history', label: 'Voting Status', icon: HistoryIcon },
    { id: 'results', label: 'Results', icon: Trophy },
    { id: 'help', label: 'Help and FAQ', icon: HelpCircle }
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && tabOptions.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, []);

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('sovs_token') ||
      '';

    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchStudentDashboardData = async () => {
    setLoading(true);

    try {
      const authHeaders = getAuthHeaders();

      const [openPollsRes, electionsRes, historyRes, candidatesRes, announcementsRes] = await Promise.all([
        fetch('/api/student/open-polls', { headers: authHeaders }),
        fetch('/api/elections', { headers: authHeaders }),
        fetch('/api/student/voting-history', { headers: authHeaders }),
        fetch('/api/student/eligible-candidates', { headers: authHeaders }),
        fetch('/api/student/announcements', { headers: authHeaders }),
      ]);

      const openPollsData = openPollsRes.ok ? await openPollsRes.json() : [];
      const electionsData = electionsRes.ok ? await electionsRes.json() : [];
      const historyData = historyRes.ok ? await historyRes.json() : [];
      const candidatesData = candidatesRes.ok ? await candidatesRes.json() : [];
      const announcementsData = announcementsRes.ok ? await announcementsRes.json() : [];

      const normalizeList = (payload: any) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.elections)) return payload.elections;
        if (Array.isArray(payload?.openPolls)) return payload.openPolls;
        if (Array.isArray(payload?.history)) return payload.history;
        if (Array.isArray(payload?.candidates)) return payload.candidates;
        if (Array.isArray(payload?.announcements)) return payload.announcements;
        return [];
      };

      const safeOpenPolls = normalizeList(openPollsData);
      const safeElections = normalizeList(electionsData);

      const mergedElections = [
        ...safeOpenPolls,
        ...safeElections.filter(
          (election) =>
            !safeOpenPolls.some(
              (openPoll) => openPoll.election_id === election.election_id
            )
        ),
      ];

      setElections(mergedElections);
      setHistory(normalizeList(historyData));
      setEligibleCandidates(normalizeList(candidatesData));
      setAnnouncements(normalizeList(announcementsData));
    } catch (error) {
      console.error('Failed to load student dashboard data:', error);
      toast.error('Failed to load student dashboard data');
      setElections([]);
      setHistory([]);
      setEligibleCandidates([]);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentDashboardData();

    const interval = setInterval(fetchStudentDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getAnnouncementImages = (announcement: Announcement) => {
    if (announcement.image_paths && announcement.image_paths.length > 0) return announcement.image_paths;
    if (announcement.image_url) return [announcement.image_url];
    if (announcement.image_path) return [announcement.image_path];
    return [];
  };

  const handleViewAnnouncement = async (announcement: Announcement) => {
    setViewingAnnouncement(announcement);

    if (!announcement.is_read) {
      try {
        await fetch(`/api/student/announcements/${announcement.announcement_id || announcement.id}/read`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });

        setAnnouncements((current) =>
          current.map((item) =>
            (item.announcement_id || item.id) === (announcement.announcement_id || announcement.id)
              ? { ...item, is_read: 1 }
              : item
          )
        );
      } catch (error) {
        console.error('Failed to mark announcement as read:', error);
      }
    }
  };

  const unreadAnnouncementsCount = announcements.filter((announcement) => !announcement.is_read).length;

  const isElectionActiveByStatus = (election: Election) => {
    const status = String(election.status || '').toLowerCase().trim();
    return ['active', 'ongoing', 'on_going', 'computed_active', 'live'].includes(status);
  };

  const isElectionActiveBySchedule = (election: Election) => {
    const now = new Date();
    const start = new Date(election.start_time);
    const end = new Date(election.end_time);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }

    return now >= start && now <= end;
  };

  const activeElections = elections.filter(
    (e) => isElectionActiveByStatus(e) || isElectionActiveBySchedule(e)
  );

  const upcomingElections = elections.filter(e => {
    const now = new Date();
    const start = new Date(e.start_time);
    const status = String(e.status || '').toLowerCase().trim();
    return !Number.isNaN(start.getTime()) && start > now && status !== 'closed';
  });
  const resultsAvailable = elections.filter(e => String(e.status || '').toLowerCase().trim() === 'closed' && e.is_results_approved);
  
  const myVotedIds = history.map(h => h.election_id);
  const pendingVotesCount = activeElections.filter(e => !myVotedIds.includes(e.election_id)).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="text-primary"
      >
        <Vote className="w-12 h-12" />
      </motion.div>
      <p className="text-neutral-500 font-medium animate-pulse">Initializing Quick Actions...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 w-full mx-auto">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm lg:hidden" 
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[70] shadow-2xl p-6 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-2 font-black text-primary">
                    <Vote className="w-6 h-6" />
                    <span>SOVS</span>
                 </div>
                 <Button variant="outline" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-full h-8 w-8">
                    <X className="w-4 h-4" />
                 </Button>
              </div>
              
              <nav className="space-y-1.5 flex-grow overflow-y-auto no-scrollbar">
                 {tabOptions.map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => {
                       setActiveTab(tab.id);
                       setSidebarOpen(false);
                     }}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border-l-4 ${
                       activeTab === tab.id 
                        ? 'bg-primary/5 text-primary border-primary shadow-sm' 
                        : 'text-neutral-500 hover:bg-neutral-50 border-transparent'
                     }`}
                   >
                     <tab.icon className="w-5 h-5" />
                     {tab.label}
                   </button>
                 ))}
              </nav>
              
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="hidden md:block bg-white border-b border-neutral-200 -mx-4 px-4 sticky top-16 z-40 md:static transition-colors">
          <div className="flex items-center justify-between">
            {/* Desktop Navigation */}
            <TabsList className="hidden md:flex bg-transparent h-12 w-full justify-start gap-4 lg:gap-6 bg-white border-none rounded-none p-0 overflow-x-auto no-scrollbar">
              {tabOptions.map((tab) => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id} 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12 px-1 lg:px-2 gap-1.5 lg:gap-2 text-xs lg:text-sm font-bold text-neutral-500 data-[state=active]:text-primary transition-all whitespace-nowrap"
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="hidden md:flex items-center">
            </div>
          </div>
        </div>

        <section className="min-h-[400px] px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div id="overview-section" className={activeTab === 'overview' ? 'active' : 'hidden'}>
                {activeTab === 'overview' && (
                  <div className="space-y-10">
                  {/* Grid of Stats Cards */}
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-blue-600 text-white border-none shadow-lg overflow-hidden relative group">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-4xl font-black">{elections.length}</CardTitle>
                        <CardDescription className="text-blue-100 font-bold uppercase text-[10px] tracking-widest mt-1">Total Elections</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Calendar className="absolute right-4 top-4 w-16 h-16 opacity-10 group-hover:scale-110 transition-transform" />
                      </CardContent>
                    </Card>

                    <Card className="bg-indigo-600 text-white border-none shadow-lg overflow-hidden relative group">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-4xl font-black">{activeElections.length}</CardTitle>
                        <CardDescription className="text-indigo-100 font-bold uppercase text-[10px] tracking-widest mt-1">Active Elections</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Megaphone className="absolute right-4 top-4 w-16 h-16 opacity-10 group-hover:scale-110 transition-transform" />
                      </CardContent>
                    </Card>

                    <Card className="bg-amber-500 text-white border-none shadow-lg overflow-hidden relative group">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-4xl font-black">{history.length}</CardTitle>
                        <CardDescription className="text-amber-100 font-bold uppercase text-[10px] tracking-widest mt-1">Submitted Votes</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CheckCircle2 className="absolute right-4 top-4 w-16 h-16 opacity-10 group-hover:scale-110 transition-transform" />
                      </CardContent>
                    </Card>

                    <Card className="bg-sky-600 text-white border-none shadow-lg overflow-hidden relative group cursor-pointer" onClick={() => setActiveTab('announcements')}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-4xl font-black">{announcements.length}</CardTitle>
                        <CardDescription className="text-sky-100 font-bold uppercase text-[10px] tracking-widest mt-1">Announcements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Bell className="absolute right-4 top-4 w-16 h-16 opacity-10 group-hover:scale-110 transition-transform" />
                        {unreadAnnouncementsCount > 0 && (
                          <Badge className="absolute left-4 bottom-4 bg-white text-sky-700 border-none font-black">
                            {unreadAnnouncementsCount} unread
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
                )}
              </div>

              <div id="announcements-section" className={activeTab === 'announcements' ? 'active' : 'hidden'}>
                {activeTab === 'announcements' && (
                  <div className="space-y-8">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-2xl font-black text-neutral-800 tracking-tight">Official Announcements</h2>
                      <p className="text-neutral-500 text-sm">Read updates published by the Public Relations Officer.</p>
                    </div>

                    {announcements.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {announcements.map((announcement) => {
                          const images = getAnnouncementImages(announcement);
                          const coverImage = images[0];

                          return (
                            <Card
                              key={announcement.announcement_id || announcement.id}
                              className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden bg-white cursor-pointer group"
                              onClick={() => handleViewAnnouncement(announcement)}
                            >
                              <div className="h-48 bg-neutral-50 border-b flex items-center justify-center overflow-hidden">
                                {coverImage ? (
                                  <img
                                    src={coverImage}
                                    alt={announcement.title}
                                    className="w-full h-full object-contain object-top bg-white group-hover:scale-[1.02] transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Megaphone className="w-8 h-8 text-primary" />
                                  </div>
                                )}
                              </div>
                              <CardHeader className="p-6 pb-3">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none text-[9px] font-black uppercase tracking-widest">
                                    Official
                                  </Badge>
                                  {!announcement.is_read && (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none text-[9px] font-black uppercase tracking-widest">
                                      New
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="text-lg font-black text-neutral-900 line-clamp-2">
                                  {announcement.title}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                  {new Date(announcement.created_at).toLocaleString()}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="px-6 pb-6">
                                <p className="text-sm text-neutral-600 line-clamp-3 leading-relaxed">
                                  {announcement.message || 'Open this announcement to view details.'}
                                </p>
                                <Button variant="ghost" size="sm" className="mt-4 px-0 text-primary font-black text-xs uppercase tracking-widest hover:bg-transparent">
                                  Read announcement <ArrowRight className="w-3.5 h-3.5 ml-2" />
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <Card className="border-dashed border-2 p-20 text-center bg-white">
                        <Megaphone className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-neutral-700">No announcements yet</h3>
                        <p className="text-sm text-neutral-400 mt-2">Official announcements will appear here once published.</p>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              <div id="candidates-section" className={activeTab === 'candidates' ? 'active' : 'hidden'}>
               {activeTab === 'candidates' && (
                <div className="space-y-12">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-black text-neutral-800 tracking-tight">Candidate Directory</h2>
                    <p className="text-neutral-500 text-sm">Navigate through the profiles of candidates eligible for your vote.</p>
                  </div>

                  {/* Candidate Groups */}
                  {['Guild President', 'GRC'].map((groupName) => {
                    const groupCandidates = eligibleCandidates.filter(c => {
                      const title = (c.position_title || '').toLowerCase();
                      if (groupName === 'Guild President') return title.includes('guild president');
                      if (groupName === 'GRC') return title.includes('grc');
                      return false;
                    });

                    return (
                      <div key={groupName} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-1 rounded-full ${
                            groupName === 'Guild President' ? 'bg-primary' : 
                            groupName === 'GRC' ? 'bg-indigo-500' : 'bg-slate-400'
                          }`} />
                          <h3 className="text-xl font-black text-neutral-800 uppercase tracking-tight">{groupName}</h3>
                        </div>

                        {groupCandidates.length > 0 ? (
                          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {groupCandidates.map(candidate => (
                              <Card key={candidate.candidate_id} className="border-none shadow-lg overflow-hidden group hover:scale-[1.02] transition-all bg-white">
                                <div className="relative h-64 w-full overflow-hidden bg-neutral-100">
                                  {candidate.photo_url ? (
                                    <img 
                                      src={candidate.photo_url} 
                                      alt={candidate.name}
                                      className="h-full w-full object-contain object-top bg-white"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        e.currentTarget.src = 'https://picsum.photos/seed/user/400/500';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                      <User className="w-16 h-16" />
                                    </div>
                                  )}
                                  {groupName === 'Guild President' && candidate.political_affiliation && (
                                    <div className="absolute top-4 left-4">
                                      <Badge className="bg-white/90 backdrop-blur-sm text-primary hover:bg-white text-[10px] font-black uppercase border-none shadow-sm">
                                        {candidate.political_affiliation}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                                <CardHeader className="pb-3 text-center">
                                  <CardTitle className="text-lg font-black">{candidate.name}</CardTitle>
                                  <CardDescription className="text-primary font-bold text-xs uppercase tracking-wider">
                                    {candidate.position_title}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-6 text-center space-y-4">
                                  {candidate.designation && (
                                    <Badge variant="secondary" className="text-[10px] font-bold py-0.5 px-3 rounded-full text-neutral-500">
                                      {candidate.designation}
                                    </Badge>
                                  )}
                                  <p className="text-xs text-neutral-500 line-clamp-2 italic px-2">
                                    "{candidate.manifesto || "Ready to serve the student body."}"
                                  </p>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full mt-2 text-[10px] font-bold uppercase tracking-widest h-8"
                                    onClick={() => setViewingManifesto(candidate)}
                                  >
                                    View Full Manifesto
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 border-2 border-dashed rounded-3xl text-center bg-white">
                            <Users className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                            <p className="text-sm text-neutral-400 font-medium">No candidates available for this position</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              <div id="vote-section" className={activeTab === 'vote' ? 'active' : 'hidden'}>
               {activeTab === 'vote' && (
                <div className="space-y-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-black text-neutral-800 tracking-tight">Vote Now</h2>
                    <p className="text-neutral-500 text-sm">Only active or ongoing elections are shown here.</p>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeElections.length > 0 ? (
                      activeElections.map((election) => {
                        const hasVoted = myVotedIds.includes(election.election_id);
                        return (
                          <Card key={election.election_id} className={`flex flex-col border shadow-sm transition-all hover:shadow-md ${hasVoted ? 'bg-emerald-50/20 opacity-80' : 'bg-white'}`}>
                            <CardHeader className="pb-4">
                              <div className="flex justify-between items-start mb-4">
                                {hasVoted ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none text-[10px] font-black uppercase">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500 hover:bg-emerald-500 shadow-sm text-[10px] font-black uppercase px-3">Live</Badge>
                                )}
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">#{election.election_id}</p>
                              </div>
                              <CardTitle className="text-xl leading-snug">{election.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow pb-8">
                              <p className="text-sm text-neutral-500 line-clamp-3 mb-6">{election.description}</p>
                              <CountdownTimer endTime={election.end_time} label="Ends in" />
                            </CardContent>
                            <CardFooter className="pt-0 border-t bg-neutral-50/50 p-4">
                              {hasVoted ? (
                                <Button className="w-full font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none pointer-events-none" disabled>
                                  Vote Already Recorded
                                </Button>
                              ) : (
                                <Link to={`/election/${election.election_id}`} className="w-full">
                                  <Button className="w-full font-bold shadow-sm group">
                                    Cast Ballot 
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                  </Button>
                                </Link>
                              )}
                            </CardFooter>
                          </Card>
                        );
                      })
                    ) : (
                      <Card className="md:col-span-2 lg:col-span-3 border-dashed border-2 py-20 text-center bg-white">
                        <AlertCircle className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-neutral-800">No active elections</h3>
                        <p className="text-neutral-400 text-sm max-w-sm mx-auto mt-2">There are currently no ongoing elections available for voting. Check the Elections tab for upcoming polls.</p>
                      </Card>
                    )}
                  </div>
                </div>
                )}
              </div>

              {/* Elections Section */}
              <div id="elections-section" className={activeTab === 'elections' ? 'active' : 'hidden'}>
                {activeTab === 'elections' && (
                <div className="space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 bg-emerald-500 rounded-full" />
                      <h3 className="text-xl font-black text-neutral-800 uppercase tracking-tight">Ongoing Elections</h3>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {activeElections.map(election => (
                        <Card key={election.election_id} className="border shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="bg-neutral-50/50 p-5 border-b">
                            <CardTitle className="text-base font-bold">{election.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Start</div>
                                <p className="text-xs font-bold text-neutral-700">{new Date(election.start_time).toLocaleDateString()}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">End</div>
                                <p className="text-xs font-bold text-neutral-700">{new Date(election.end_time).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <Link to={`/election/${election.election_id}`} className="block">
                              <Button variant="outline" size="sm" className="w-full font-bold text-[10px] uppercase tracking-widest h-8">
                                {myVotedIds.includes(election.election_id) ? 'Review Ballot' : 'Go to Poll'}
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 bg-blue-500 rounded-full" />
                      <h3 className="text-xl font-black text-neutral-800 uppercase tracking-tight">Upcoming Polls</h3>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {upcomingElections.length > 0 ? (
                        upcomingElections.map(election => (
                          <Card key={election.election_id} className="border shadow-sm">
                            <CardHeader className="p-5 border-b bg-neutral-50/50">
                              <CardTitle className="text-base font-bold">{election.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                              <CountdownTimer endTime={election.start_time} label="Countdown to Start" />
                              <div className="mt-4 flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                                <Calendar className="w-3.5 h-3.5" /> Scheduled for {new Date(election.start_time).toLocaleDateString()}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="md:col-span-2 lg:col-span-3 p-12 text-center rounded-3xl bg-neutral-50/50 border-2 border-dashed">
                          <Calendar className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
                          <p className="text-neutral-500 font-medium text-sm">No upcoming elections scheduled yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>

              <div id="status-section" className={activeTab === 'history' ? 'active' : 'hidden'}>
                {activeTab === 'history' && (
                <div className="space-y-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-black text-neutral-800 tracking-tight">Voting Status & History</h2>
                    <p className="text-neutral-500 text-sm">Review your participation in previous SOVS elections.</p>
                  </div>
                  
                  <div className="bg-white rounded-2xl overflow-hidden border shadow-xl">
                    <div className="grid grid-cols-4 bg-neutral-900 px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                      <span className="col-span-2">Election Event</span>
                      <span>Participation Date</span>
                      <span className="text-right">Official Status</span>
                    </div>
                    {history.length > 0 ? (
                      history.map((h, i) => (
                        <div key={i} className="grid grid-cols-4 px-6 py-5 border-b last:border-0 hover:bg-neutral-50 transition-colors items-center">
                          <span className="col-span-2 text-sm font-black text-neutral-800">{h.title}</span>
                          <span className="text-xs text-neutral-500 font-bold">{new Date(h.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <div className="text-right">
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none font-black text-[9px] px-3 tracking-widest">VERIFIED</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-20 text-center text-neutral-300">
                        <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-bold">No History Found</p>
                      </div>
                    )}
                  </div>

                  <Card className="border-none shadow-md bg-amber-50">
                    <CardContent className="p-6 flex gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-black text-amber-900 tracking-tight">Privacy of Your Vote</p>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                          The SOVS platform implements end-to-end secret balloting.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                )}
              </div>

              <div id="results-section" className={activeTab === 'results' ? 'active' : 'hidden'}>
                {activeTab === 'results' && (
                <div className="space-y-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-black text-neutral-800 tracking-tight">Results Gallery</h2>
                    <p className="text-neutral-500 text-sm">Explore the totalled,verified tallies and winners of concluded elections.</p>
                  </div>

                  <div className="grid gap-8 lg:grid-cols-2">
                    {resultsAvailable.length > 0 ? (
                      resultsAvailable.map(election => (
                        <Card key={election.election_id} className="border shadow-xl hover:shadow-2xl transition-all overflow-hidden bg-white">
                          <CardHeader className="bg-neutral-50 border-b p-6">
                            <div className="flex justify-between items-center mb-2">
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black text-[9px] px-3">OFFICIAL</Badge>
                              <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-amber-600 tracking-widest">Results</span>
                              </div>
                            </div>
                            <CardTitle className="text-2xl font-black">{election.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-10 flex flex-col items-center justify-center bg-white">
                            <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-neutral-200">
                              <BarChart3 className="w-10 h-10 text-neutral-300" />
                            </div>
                            <h4 className="font-bold text-neutral-800 text-center">Interactive Visualization Ready</h4>
                            <p className="text-xs text-neutral-400 text-center mt-2 mb-8 max-w-xs">Detailed vote distribution, candidate standings, and verified winners available in the results portal.</p>
                            <Link to={`/election/${election.election_id}/results`} className="w-full">
                              <Button className="w-full font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                                Open Results Dashboard
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card className="lg:col-span-2 border-dashed border-2 p-24 text-center bg-white shadow-sm">
                        <Trophy className="w-16 h-16 text-neutral-200 mx-auto mb-6 opacity-50" />
                        {activeElections.length > 0 ? (
                          <>
                            <h3 className="text-2xl font-black text-neutral-800">Results will be displayed soon</h3>
                            <p className="text-neutral-500 text-sm max-w-lg mx-auto mt-4 px-10">
                              The Official tallies will be released and announced within the next hour, as soon as the polls close. Stay tuned for the final verification.
                            </p>
                          </>
                        ) : (
                          <>
                            <h3 className="text-2xl font-black text-neutral-800">No ongoing elections</h3>
                            <p className="text-neutral-500 text-sm max-w-lg mx-auto mt-4 px-10">
                              There are currently no elections in progress. Check the elections tab for upcoming events.
                            </p>
                          </>
                        )}
                      </Card>
                    )}
                  </div>
                </div>
                )}
              </div>

              {/* Profile Section */}
              <div id="profile-section" className={activeTab === 'profile' ? 'active' : 'hidden'}>
                {activeTab === 'profile' && (
                  <div className="space-y-8">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-2xl font-black text-neutral-800 tracking-tight">Voter Profile</h2>
                      <p className="text-neutral-500 text-sm">Review your identification and eligibility details.</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <div className="h-32 bg-primary relative">
                          <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-3xl bg-white shadow-lg flex items-center justify-center p-1">
                             <div className="w-full h-full rounded-2xl bg-neutral-100 flex items-center justify-center">
                                <User className="w-10 h-10 text-primary" />
                             </div>
                          </div>
                        </div>
                        <CardHeader className="pt-16 pb-8 px-8">
                          <CardTitle className="text-3xl font-black">{user?.full_name}</CardTitle>
                          <CardDescription className="text-primary font-bold uppercase tracking-widest text-[10px]">Registry ID: #{user?.id}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-8 pb-10 space-y-6">
                           <div className="grid grid-cols-2 gap-8">
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Student Number</p>
                                 <p className="text-sm font-bold text-neutral-800">{user?.student_number}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Email Address</p>
                                 <p className="text-sm font-bold text-neutral-800">{user?.email}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Program / Course</p>
                                 <p className="text-sm font-bold text-neutral-800">{user?.program || 'Not Specified'}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Residence</p>
                                 <p className="text-sm font-bold text-neutral-800">{user?.residence || 'Not Specified'}</p>
                              </div>
                           </div>
                           <div className="pt-6 border-t">
                              <div className="flex items-center gap-3">
                                 <Badge className={user?.is_eligible ? "bg-emerald-500 hover:bg-emerald-500" : "bg-red-500 hover:bg-red-500"}>
                                    {user?.is_eligible ? "ELIGIBLE TO VOTE" : "INELIGIBLE"}
                                 </Badge>
                                 <p className="text-[10px] font-medium text-neutral-400">Verified by Electoral Committee on {new Date().toLocaleDateString()}</p>
                              </div>
                           </div>
                        </CardContent>
                      </Card>

                      <div className="space-y-6">
                        <Card className="border-none shadow-md bg-indigo-50">
                           <CardContent className="p-6 space-y-4">
                              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                 <ShieldCheck className="w-5 h-5 text-indigo-600" />
                              </div>
                              <h4 className="font-black text-indigo-900">Security Credentials</h4>
                              <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                                Your account is secured with end-to-end encryption. To reset your voting biometric or password, please contact the IT Administrator desk at the Library block.
                              </p>
                           </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-neutral-900 text-white">
                           <CardContent className="p-6 space-y-4">
                              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                 <HistoryIcon className="w-5 h-5 text-primary" />
                              </div>
                              <h4 className="font-black">Activity Summary</h4>
                              <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-neutral-400 font-medium tracking-tight">Last Vote Cast</span>
                                  <span className="font-bold">{history.length > 0 ? new Date(history[0].timestamp).toLocaleDateString() : 'Never'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-neutral-400 font-medium tracking-tight">Notifications Saved</span>
                                  <span className="font-bold">{history.length}</span>
                                </div>
                              </div>
                           </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div id="help-section" className={activeTab === 'help' ? 'active' : 'hidden'}>
                {activeTab === 'help' && (
                <div className="space-y-12">
                  <div className="flex flex-col gap-2 items-center text-center max-w-2xl mx-auto pt-10">
                    <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Support & Guidance</h2>
                  </div>

                  <div className="grid gap-8 lg:grid-cols-12 max-w-6xl mx-auto">
                    <div className="lg:col-span-8 space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400 mb-6">Frequently Requested</h3>
                      {[
                        { 
                          q: "Casting Your First Vote", 
                          a: "Under the 'Vote' tab, find your election. Click 'Cast Ballot'. Select one candidate for each position. Review carefully—votes cannot be undone." 
                        },
                        { 
                          q: "Vote confidentiality", 
                          a: "The SOVS platform implements end-to-end secret balloting. No one can know the candidate you voted for" 
                        }
                      ].map((faq, i) => (
                        <Card key={i} className="border shadow-md hover:border-primary/50 transition-all group cursor-default">
                           <CardHeader className="p-8">
                             <CardTitle className="text-xl font-bold flex items-center justify-between">
                               {faq.q}
                               <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                 <Plus className="w-4 h-4" />
                               </div>
                             </CardTitle>
                             <CardDescription className="text-neutral-600 mt-4 leading-relaxed text-base italic">
                               "{faq.a}"
                             </CardDescription>
                           </CardHeader>
                        </Card>
                      ))}
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                       <Card className="border shadow-xl bg-white overflow-hidden">
                         <CardHeader className="p-8 border-b">
                           <CardTitle className="text-xl font-black">Contact Support</CardTitle>
                         </CardHeader>
                         <CardContent className="p-8 space-y-4">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Title / Subject</label>
                             <input 
                               type="text" 
                               className="w-full flex h-10 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950" 
                               placeholder="Brief title of your issue" 
                               value={feedbackTitle}
                               onChange={(e) => setFeedbackTitle(e.target.value)}
                             />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Issue Description</label>
                             <textarea 
                               className="w-full flex min-h-[100px] rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950" 
                               placeholder="Describe your issue in detail..." 
                               value={feedbackContent}
                               onChange={(e) => setFeedbackContent(e.target.value)}
                             />
                           </div>
                           <Button 
                             className="w-full font-black text-xs uppercase tracking-widest py-6" 
                             onClick={handleFeedbackSubmit}
                             disabled={isSubmittingFeedback}
                           >
                             {isSubmittingFeedback ? "Submitting..." : "Submit Ticket"}
                           </Button>
                         </CardContent>
                       </Card>


                    </div>
                  </div>
                </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </Tabs>

      <Dialog open={!!viewingAnnouncement} onOpenChange={(open) => !open && setViewingAnnouncement(null)}>
        <DialogContent className="max-w-3xl sm:rounded-3xl border-none shadow-2xl overflow-hidden p-0">
          <div className="max-h-[85vh] overflow-y-auto">
            {viewingAnnouncement && getAnnouncementImages(viewingAnnouncement).length > 0 && (
              <div className="bg-neutral-50 border-b p-6">
                <div className="flex gap-4 overflow-x-auto snap-x">
                  {getAnnouncementImages(viewingAnnouncement).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${viewingAnnouncement.title} image ${index + 1}`}
                      className="h-[320px] max-w-full object-contain object-top bg-white rounded-2xl border shadow-sm flex-shrink-0 snap-center"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="p-8 space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none text-[9px] font-black uppercase tracking-widest">
                    Official Announcement
                  </Badge>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {viewingAnnouncement ? new Date(viewingAnnouncement.created_at).toLocaleString() : ''}
                  </span>
                </div>
                <DialogTitle className="text-3xl font-black text-neutral-900 leading-tight">
                  {viewingAnnouncement?.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-neutral-500">
                  Published by the Election Public Relations Office.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-neutral-50 rounded-2xl p-6 border">
                <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {viewingAnnouncement?.message || 'No detailed message was provided.'}
                </p>
              </div>

              <DialogFooter>
                <Button className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-[0.2em]" onClick={() => setViewingAnnouncement(null)}>
                  Close Announcement
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingManifesto} onOpenChange={(open) => !open && setViewingManifesto(null)}>
        <DialogContent className="max-w-2xl sm:rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Candidate Manifesto</DialogTitle>
            <DialogDescription className="font-bold text-primary uppercase tracking-widest text-[10px]">
              {viewingManifesto?.position_title}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="flex gap-6 mb-8 items-center bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                <img 
                  src={viewingManifesto?.photo_url || 'https://picsum.photos/seed/user/100/100'} 
                  alt={viewingManifesto?.name} 
                  className="w-full h-full object-contain object-top bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-neutral-800">{viewingManifesto?.name}</h4>
                {viewingManifesto?.political_affiliation && (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none font-black text-[9px] px-3 tracking-widest">
                    {viewingManifesto.political_affiliation}
                  </Badge>
                )}
                <p className="text-xs text-neutral-500 font-medium">{viewingManifesto?.designation}</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl border shadow-inner max-h-[40vh] overflow-y-auto relative">
              <Quote className="w-12 h-12 text-primary/5 absolute top-4 right-4" />
              <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap italic text-lg pr-4">
                {viewingManifesto?.manifesto || "The candidate has not provided a written manifesto yet. Their platform is built on student representation and integrity."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-[0.2em]" onClick={() => setViewingManifesto(null)}>
              Close Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
