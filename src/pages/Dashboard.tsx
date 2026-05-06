import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  PlayCircle,
  PauseCircle,
  Vote, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ListChecks, 
  UserRound, 
  Users, 
  CheckSquare,
  ChevronRight,
  Shield,
  ArrowUp,
  ArrowDown,
  Layout,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  History as HistoryIcon,
  MessageSquare as MessageIcon,
  Download,
  XCircle,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ECMessages from '../components/ECMessages';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { toast } from 'sonner';

// Professional print styling
const printStyles = `
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { background: white !important; font-size: 11pt; color: #000; }
  .card-shadow { box-shadow: none !important; border: 1px solid #e1e4e8 !important; border-radius: 12px; }
  nav, footer, aside, button, .tabs-list, header { display: none !important; }
  main { margin: 0 !important; padding: 0 !important; width: 100% !important; overflow: visible !important; }
  .grid { display: block !important; }
  .card { break-inside: avoid !important; margin-bottom: 2rem !important; page-break-inside: avoid; }
  .registry-header { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 2rem !important; }
  .tabs-content { position: static !important; }
}
`;

interface Election {
  election_id: number;
  title: string;
  description: string;
  status: string;
  start_time: string;
  end_time: string;
}

interface SummaryData {
  counts: {
    positions: number;
    candidates: number;
    voters: number;
    voted: number;
  };
  tally: {
    id: number;
    position: string;
    candidates: { name: string; votes: number }[];
  }[];
  facultyStats?: { faculty: string; total: number; voted: number }[];
  hourlyStats?: { hour: string; count: number }[];
  eligibilityStats?: { status: string; count: number }[];
  programStats?: { program: string; count: number }[];
  residenceStats?: { residence: string; count: number }[];
}

interface AuditLog {
  log_id: number;
  timestamp: string;
  actor_type: string;
  actor_id: number;
  action: string;
  details: string;
  ip_address: string;
  actor_name?: string;
  ec_role?: string;
}

interface Voter {
  student_id: number;
  full_name: string;
  student_number: string;
  email: string;
  is_eligible: number;
  faculty: string;
  voted_count: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [voterSearch, setVoterSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTallyOpen, setIsTallyOpen] = useState(false);

  // IT Admin is not an EC member, so EC-only messaging must be hidden.
  // Keep this broad because different parts of the app may store IT Admin as type="it",
  // type="it_admin", role="it_admin", or role="admin" with an admin_id.
  const isITAdmin =
    user?.type === 'it' ||
    user?.type === 'it_admin' ||
    user?.role === 'it_admin' ||
    Boolean(user?.admin_id);

  const canAccessECMessages = !isITAdmin;

  useEffect(() => {
    if (!canAccessECMessages && activeTab === 'messages') {
      setActiveTab('overview');
    }
  }, [activeTab, canAccessECMessages]);

  const fetchSummary = () => {
    fetch('/api/admin/summary')
      .then(res => res.ok ? res.json() : null)
      .then(data => setSummary(data));
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/elections').then(res => res.ok ? res.json() : []),
      fetch('/api/admin/summary').then(res => res.ok ? res.json() : null),
      fetch('/api/audit-logs').then(res => res.ok ? res.json() : []),
      fetch('/api/admin/voters-list').then(res => res.ok ? res.json() : [])
    ]).then(([electionsData, summaryData, logsData, votersData]) => {
      setElections(Array.isArray(electionsData) ? electionsData : []);
      setSummary(summaryData);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setVoters(Array.isArray(votersData) ? votersData : []);
      setLoading(false);
    }).catch(() => {
      setElections([]);
      setLoading(false);
    });
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Live</Badge>;
      case 'closed': return <Badge variant="secondary">Closed</Badge>;
      case 'paused': return <Badge variant="destructive">Paused</Badge>;
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownloadReport = () => {
    if (!summary) return;
    let csv = 'Metric,Value\n';
    csv += `Positions,${summary.counts.positions}\n`;
    csv += `Candidates,${summary.counts.candidates}\n`;
    csv += `Eligible Voters,${summary.counts.voters}\n`;
    csv += `Ballots Cast,${summary.counts.voted}\n\n`;
    csv += 'Position,Candidate,Votes\n';
    summary.tally.forEach(pos => {
      pos.candidates.forEach(cand => {
        csv += `"${pos.position}","${cand.name}",${cand.votes}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'election_summary_report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  const movePosition = async (id: number, direction: 'up' | 'down') => {
    try {
      const res = await fetch(`/api/admin/positions/${id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
      });
      if (res.ok) {
        fetchSummary();
        toast.success(`Position moved ${direction}`);
      }
    } catch (error) {
      toast.error('Failed to move position');
    }
  };

  const updateElectionStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/elections/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        setElections(prev => prev.map(e => e.election_id === id ? { ...e, status } : e));
        toast.success(`Election status updated to ${status}`);
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]">Loading dashboard...</div>;

  const turnoutData = [
    { name: 'Voted', value: summary?.counts.voted || 0 },
    { name: 'Not Voted', value: (summary?.counts.voters || 0) - (summary?.counts.voted || 0) }
  ];

  const COLORS = ['#10b981', '#e5e7eb'];

  return (
    <div className="space-y-10 pb-20">
      <style>{printStyles}</style>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-50 bg-white md:hidden"
          >
            <div className="p-6 space-y-8">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { value: 'elections', label: 'Elections', icon: Vote },
                  { value: 'voters', label: 'Registry', icon: Users },
                  ...(canAccessECMessages ? [{ value: 'messages', label: 'Messages', icon: MessageIcon }] : []),
                  { value: 'kpis', label: 'Statistics', icon: BarChart3 },
                  ...(user?.role !== 'vice_chairperson' ? [{ value: 'activity', label: 'Audit', icon: HistoryIcon }] : [])
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setActiveTab(item.value);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all ${
                      activeTab === item.value 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </Button>
          <div className="hidden md:block space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-none hidden sm:flex no-print">
            <Download className="w-4 h-4" /> Print Report
          </Button>
          <div className="flex items-center gap-2 text-sm text-neutral-500 bg-white px-4 py-2 rounded-full border shadow-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          {user?.type === 'it' && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 py-1.5 px-3 flex gap-1.5 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              System Operational
            </Badge>
          )}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="hidden md:flex flex-wrap w-full lg:w-fit h-auto min-h-12 p-1 bg-neutral-100 rounded-xl no-print gap-1">
          <TabsTrigger value="overview" className="flex-1 lg:flex-none rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">Overview</TabsTrigger>
          <TabsTrigger value="elections" className="flex-1 lg:flex-none rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">Election Management</TabsTrigger>
          <TabsTrigger value="voters" className="flex-1 lg:flex-none rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">Voter Registry</TabsTrigger>
          {canAccessECMessages && (
            <TabsTrigger value="messages" className="flex-1 lg:flex-none rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">Messages</TabsTrigger>
          )}
          <TabsTrigger value="kpis" className="flex-1 lg:flex-none rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">KPI Statistics</TabsTrigger>
          {user?.role !== 'vice_chairperson' && (
            <TabsTrigger value="activity" className="flex-1 lg:flex-none rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">Audit Trails</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-10 focus-visible:outline-none">

          {user?.type === 'it' && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Shield className="w-48 h-48 rotate-12" />
              </div>
              <div className="relative z-10 grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Global Turnout Integrity</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-4xl font-black italic">
                        {summary?.counts.voters ? Math.round((summary.counts.voted / summary.counts.voters) * 100) : 0}%
                      </span>
                      <span className="text-slate-500 text-xs">{summary?.counts.voted} / {summary?.counts.voters} Ballots</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${summary?.counts.voters ? (summary.counts.voted / summary.counts.voters) * 100 : 0}%` }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4 border-l border-slate-800 pl-8">
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Active Infrastructure</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold">{summary?.counts.positions}</p>
                      <p className="text-[10px] text-slate-500">Live Positions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary?.counts.candidates}</p>
                      <p className="text-[10px] text-slate-500">Validated Candidates</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 border-l border-slate-800 pl-8 flex flex-col justify-center">
                   <Button onClick={handleDownloadReport} variant="outline" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl gap-2 h-12">
                     <Download className="w-4 h-4" /> Download Report
                   </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats Grid */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {user?.role !== 'vice_chairperson' && (
              <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all rounded-3xl overflow-hidden group border-b-4 border-blue-600">
                <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-4xl font-black text-slate-900">{summary?.counts.positions || 0}</CardTitle>
                    <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Positions</CardDescription>
                  </div>
                  <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                     <ListChecks className="w-8 h-8" />
                  </div>
                </CardHeader>
                <CardFooter className="py-4 bg-slate-50">
                  <Link to="/admin/elections" className="text-[10px] font-black text-blue-600 flex items-center gap-2 uppercase tracking-widest hover:pl-2 transition-all">
                    Configure Ballot <ChevronRight className="w-3 h-3" />
                  </Link>
                </CardFooter>
              </Card>
            )}

            {user?.role !== 'vice_chairperson' && (
              <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all rounded-3xl overflow-hidden group border-b-4 border-emerald-600">
                <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-4xl font-black text-slate-900">{summary?.counts.candidates || 0}</CardTitle>
                    <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Candidates</CardDescription>
                  </div>
                  <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                     <UserRound className="w-8 h-8" />
                  </div>
                </CardHeader>
                <CardFooter className="py-4 bg-slate-50">
                  <Link to="/admin/candidates" className="text-[10px] font-black text-emerald-600 flex items-center gap-2 uppercase tracking-widest hover:pl-2 transition-all">
                    Candidate Hub <ChevronRight className="w-3 h-3" />
                  </Link>
                </CardFooter>
              </Card>
            )}

            {user?.role !== 'vice_chairperson' && (
              <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all rounded-3xl overflow-hidden group border-b-4 border-amber-500">
                <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-4xl font-black text-slate-900">{summary?.counts.voters || 0}</CardTitle>
                    <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Eligible Voters</CardDescription>
                  </div>
                  <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                     <Users className="w-8 h-8" />
                  </div>
                </CardHeader>
                <CardFooter className="py-4 bg-slate-50">
                  <Link to="/admin/elections" className="text-[10px] font-black text-amber-600 flex items-center gap-2 uppercase tracking-widest hover:pl-2 transition-all">
                    Voter Registry <ChevronRight className="w-3 h-3" />
                  </Link>
                </CardFooter>
              </Card>
            )}

            <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all rounded-3xl overflow-hidden group border-b-4 border-rose-600">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-4xl font-black text-slate-900">{summary?.counts.voted || 0}</CardTitle>
                  <CardDescription className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1">Ballots Cast</CardDescription>
                </div>
                <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
                   <CheckSquare className="w-8 h-8" />
                </div>
              </CardHeader>
              <CardFooter className="py-4 bg-slate-50">
                {user?.role === 'vice_chairperson' ? null : (
                  <button 
                    onClick={() => setIsTallyOpen(true)}
                    className="text-[10px] font-black text-rose-600 flex items-center gap-2 uppercase tracking-widest hover:pl-2 transition-all cursor-pointer"
                  >
                    Cast Ballots <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="elections" className="space-y-10 focus-visible:outline-none">
          {/* Ballot Preview Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Layout className="w-6 h-6 text-primary" /> Ballot Position Preview
              </h2>
              <Badge variant="outline" className="font-mono">Priority Based Ordering</Badge>
            </div>
            
            <div className="grid gap-4">
              {summary?.tally.map((item, idx) => (
                <Card key={item.id} className="border-2 border-neutral-100 hover:border-primary/20 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-neutral-100 w-8 h-8 rounded-full flex items-center justify-center font-bold text-neutral-500">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{item.position}</h3>
                        <p className="text-xs text-neutral-500">{item.candidates.length} Candidates</p>
                      </div>
                    </div>
                    {user?.role !== 'vice_chairperson' && (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          disabled={idx === 0}
                          onClick={() => movePosition(item.id, 'up')}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          disabled={idx === (summary?.tally.length || 0) - 1}
                          onClick={() => movePosition(item.id, 'down')}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Elections List */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">All Elections</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {elections.map((election, index) => (
                <motion.div
                  key={election.election_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full flex flex-col hover:shadow-md transition-shadow border-2 border-neutral-100">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        {getStatusBadge(election.status)}
                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                          <Clock className="w-3 h-3" />
                          {new Date(election.end_time).toLocaleDateString()}
                        </div>
                      </div>
                      <CardTitle className="text-xl">{election.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{election.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-4 border-t space-y-3">
                      <div className="flex gap-2">
                        <Link to={`/election/${election.election_id}${election.status === 'closed' ? '/results' : ''}`} className="flex-1">
                          <Button variant="outline" className="w-full gap-2 text-xs h-9">
                            {election.status === 'closed' ? <CheckCircle2 className="w-4 h-4" /> : <Vote className="w-4 h-4" />}
                            {election.status === 'closed' ? 'View Results' : 'View Details'}
                          </Button>
                        </Link>
                        
                        {user?.role === 'chairperson' && election.status !== 'closed' && (
                          <div className="flex gap-2 shrink-0">
                            {election.status === 'active' ? (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 border-amber-200 text-amber-600 hover:bg-amber-50" 
                                onClick={() => updateElectionStatus(election.election_id, 'paused')}
                                title="Pause Voting"
                              >
                                <PauseCircle className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 border-emerald-200 text-emerald-600 hover:bg-emerald-50" 
                                onClick={() => updateElectionStatus(election.election_id, 'active')}
                                title="Resume Voting"
                              >
                                <PlayCircle className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="h-9 w-9" 
                              onClick={() => {
                                if (confirm('Are you sure you want to STOP and CLOSE this election? This will end the voting process permanently.')) {
                                  updateElectionStatus(election.election_id, 'closed');
                                }
                              }}
                              title="Stop & Close Election"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="voters" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" /> Student Voter Registry
              </h2>
            </div>
            <div className="relative w-full md:w-80">
              <input 
                type="text" 
                placeholder="Search by name or student ID..." 
                className="w-full bg-slate-100 border-none rounded-2xl px-12 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                value={voterSearch}
                onChange={(e) => setVoterSearch(e.target.value)}
              />
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Student Details</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Faculty</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Eligibility</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Voting Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {voters
                    .filter(v => 
                      v.full_name.toLowerCase().includes(voterSearch.toLowerCase()) || 
                      v.student_number.toLowerCase().includes(voterSearch.toLowerCase())
                    )
                    .map((voter) => (
                      <tr key={voter.student_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {voter.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{voter.full_name}</p>
                              <p className="text-xs text-slate-500">{voter.student_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-600">{voter.faculty}</span>
                        </td>
                        <td className="px-6 py-4">
                          {voter.is_eligible ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-200">Active</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 border-none hover:bg-slate-200">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {voter.voted_count > 0 ? (
                            <Badge className="bg-blue-100 text-blue-700 border-none hover:bg-blue-200 flex w-fit gap-1.5 items-center">
                              <CheckCircle2 className="w-3 h-3" /> Voted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200">Not Voted</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  {voters.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium tracking-tight">No students found in the database.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {canAccessECMessages && (
          <TabsContent value="messages" className="focus-visible:outline-none">
            <ECMessages />
          </TabsContent>
        )}

        <TabsContent value="kpis" className="space-y-10">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Voter Turnout Chart */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Voter Turnout
                </CardTitle>
                <CardDescription>Real-time participation rate vs total eligible voters.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={turnoutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {turnoutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold">
                      {summary?.counts.voters ? Math.round((summary.counts.voted / summary.counts.voters) * 100) : 0}%
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Turnout</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Votes Cast Summary */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Votes Cast Summary
                </CardTitle>
                <CardDescription>Total ballots processed across all positions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary?.tally.map(t => ({
                      name: t.position,
                      votes: t.candidates.reduce((sum, c) => sum + c.votes, 0)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="votes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Votes Tally Section */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Faculty Turnout
                </CardTitle>
                <CardDescription>Participation percentage by faculty.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(summary?.facultyStats || []).map(f => ({
                      name: f.faculty,
                      rate: f.total > 0 ? Math.round((f.voted / f.total) * 100) : 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(value) => [`${value}%`, 'Turnout Rate']} />
                      <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Hourly Voting
                </CardTitle>
                <CardDescription>Ballots cast throughout the day.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(summary?.hourlyStats || []).map(h => ({
                      time: `${h.hour}:00`,
                      count: h.count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" /> Eligibility Split
                </CardTitle>
                <CardDescription>Eligible vs Ineligible students.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary?.eligibilityStats || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status"
                        label
                      >
                        {(summary?.eligibilityStats || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="w-5 h-5 text-primary" /> Faculty Population
                </CardTitle>
                <CardDescription>Total eligible students per faculty.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={summary?.facultyStats || []} margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="faculty" type="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="total" name="Students" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Residence Population
                </CardTitle>
                <CardDescription>Number of students per residence area.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary?.residenceStats || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="residence"
                        labelLine={false}
                        label={({ name, value }) => `${value}`}
                      >
                        {(summary?.residenceStats || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, `${name} Students`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <PieChartIcon className="w-6 h-6 text-primary" /> Detailed Candidate Statistics
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {summary?.tally.map((item, idx) => (
                <Card key={idx} className="border-none shadow-md overflow-hidden">
                  <CardHeader className="bg-neutral-50 border-b">
                    <CardTitle className="text-lg font-bold">{item.position}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={item.candidates}
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{ fontSize: 12, fontWeight: 600 }}
                          />
                          <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={20}>
                            {item.candidates.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#10b981'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6 focus-visible:outline-none">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-primary" /> EC Operational Oversight
            </h2>
            <Badge variant="outline" className="font-mono">Activity Log (Excl. Logins)</Badge>
          </div>

          <div className="grid gap-4">
            {logs
              .filter(log => log.actor_type === 'ec')
              .map((log) => (
                    <Card key={log.log_id} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="flex items-stretch">
                        <div className={`w-1.5 ${
                          log.action.includes('delete') ? 'bg-red-500' : 
                          log.action.includes('add') || log.action.includes('create') ? 'bg-green-500' : 
                          'bg-blue-500'
                        }`} />
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900">{log.actor_name || `ID: ${log.actor_id}`}</span>
                              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider h-5">
                                {log.ec_role?.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-primary">{log.action.split('_').join(' ').toUpperCase()}</p>
                            <p className="text-sm text-neutral-600">{log.details}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(log.timestamp).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <span className="text-[10px] text-neutral-300 font-mono">IP: {log.ip_address}</span>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}

                {logs.filter(log => log.actor_type === 'ec').length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                    <HistoryIcon className="w-12 h-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500 font-medium tracking-tight">No EC member activity recorded yet.</p>
                  </div>
                )}
              </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isTallyOpen} onOpenChange={setIsTallyOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto sm:rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-rose-600" /> Cast Ballots Tally
            </DialogTitle>
            <DialogDescription className="text-neutral-500 font-medium">
              Live, verified ballot statistics per candidate across all active positions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-8">
            {(!summary?.tally || summary.tally.length === 0 || summary.counts.voted === 0) ? (
              <div className="text-center py-20 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
                <div className="p-4 bg-white rounded-2xl shadow-sm w-fit mx-auto mb-4">
                  <AlertCircle className="w-10 h-10 text-rose-300" />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">No ballots cast yet</h3>
                <p className="text-sm text-neutral-500 font-medium max-w-xs mx-auto mt-2">
                  The verified tally is currently empty. Results will update automatically as soon as the first secret ballot is submitted.
                </p>
              </div>
            ) : (
              summary.tally.map((pos) => (
                <div key={pos.id} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-rose-600 rounded-full" /> {pos.position}
                    </h3>
                    <Badge variant="outline" className="bg-slate-50 font-mono text-[10px] text-slate-500 border-none px-3 py-1">
                      {pos.candidates.reduce((sum, c) => sum + c.votes, 0)} TOTAL BALLOTS
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pos.candidates.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 bg-neutral-50/50 border border-neutral-100 rounded-2xl hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-neutral-100 flex items-center justify-center font-black text-rose-600 text-sm">
                             {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 block">{c.name}</span>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Candidate</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-rose-600 leading-none block">{c.votes}</span>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter">Verified Ballots</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 mt-6 rounded-b-3xl">
            <Button onClick={() => setIsTallyOpen(false)} variant="outline" className="rounded-xl w-full border-neutral-200 text-slate-700 font-bold">
              Dismiss Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
