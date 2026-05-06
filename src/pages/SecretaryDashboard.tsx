import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  UserCheck,
  FileText,
  Settings,
  Calendar,
  Clock,
  ChevronRight,
  ClipboardList,
  Plus,
  UserPlus,
  Edit,
  Trash2,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Loader2,
  CalendarOff,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
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
  Legend,
} from 'recharts';

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
}

interface Candidate {
  candidate_id: number;
  student_id: number;
  position_id: number;
  name: string;
  position_title: string;
  photo_url: string;
  designation?: string;
  political_affiliation?: string;
}

interface Election {
  election_id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface Student {
  student_id: number;
  full_name: string;
  student_number: string;
}

interface Position {
  position_id?: number;
  election_id?: number;
  title: string;
  description?: string;
  candidates?: Candidate[];
}

type DisplayStatus = 'Draft' | 'Active' | 'Concluded';

const defaultNewPosition = (index = 0): Position => ({
  title: index === 0 ? 'Guild President' : '',
  description: index === 0 ? 'Main guild presidential position' : '',
});

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [electionDetails, setElectionDetails] = useState<Record<number, { positions: Position[] }>>({});

  const [candidateForm, setCandidateForm] = useState({
    student_id: '',
    position_id: '',
    designation: '',
    political_affiliation: '',
  });
  const [candidatePhotoFile, setCandidatePhotoFile] = useState<File | null>(null);

  const [electionForm, setElectionForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
  });

  const [positionForm, setPositionForm] = useState({
    election_id: '',
    title: '',
    description: '',
  });

  const [newElectionPositions, setNewElectionPositions] = useState<Position[]>([
    defaultNewPosition(0),
  ]);

  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [managingPositionsElectionId, setManagingPositionsElectionId] = useState<number | null>(null);
  const [managingCandidatesPositionId, setManagingCandidatesPositionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getDisplayStatus = (election: Election): DisplayStatus => {
    const now = new Date();
    const start = new Date(election.start_time);
    const end = new Date(election.end_time);

    if (now > end || election.status === 'closed' || election.status === 'archived') return 'Concluded';
    if (now >= start && now <= end) return 'Active';
    return 'Draft';
  };

  const statusBadgeVariant = (status: DisplayStatus) => {
    if (status === 'Active') return 'default';
    if (status === 'Concluded') return 'outline';
    return 'secondary';
  };

  const statusBarClass = (status: DisplayStatus) => {
    if (status === 'Active') return 'bg-emerald-500';
    if (status === 'Concluded') return 'bg-slate-400';
    return 'bg-blue-500';
  };

  const formatDateTimeLocal = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const setElectionSchedule = (type: 'today' | 'tomorrow' | 'oneHour' | 'fullDay') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'today') {
      start = new Date(now);
      start.setMinutes(start.getMinutes() + 10);
      end = new Date(start);
      end.setHours(end.getHours() + 2);
    }

    if (type === 'tomorrow') {
      start = new Date(now);
      start.setDate(start.getDate() + 1);
      start.setHours(8, 0, 0, 0);
      end = new Date(start);
      end.setHours(17, 0, 0, 0);
    }

    if (type === 'oneHour') {
      start = new Date(now);
      start.setMinutes(start.getMinutes() + 5);
      end = new Date(start);
      end.setHours(end.getHours() + 1);
    }

    if (type === 'fullDay') {
      start = new Date(now);
      start.setDate(start.getDate() + 1);
      start.setHours(8, 0, 0, 0);
      end = new Date(start);
      end.setHours(18, 0, 0, 0);
    }

    if (editingElection) {
      setEditingElection({
        ...editingElection,
        start_time: formatDateTimeLocal(start),
        end_time: formatDateTimeLocal(end),
      });
    } else {
      setElectionForm({
        ...electionForm,
        start_time: formatDateTimeLocal(start),
        end_time: formatDateTimeLocal(end),
      });
    }

    toast.success('Election schedule set');
  };

  const updateNewElectionPosition = (index: number, changes: Partial<Position>) => {
    setNewElectionPositions((current) =>
      current.map((position, positionIndex) =>
        positionIndex === index ? { ...position, ...changes } : position
      )
    );
  };

  const fetchData = async () => {
    try {
      const [summaryRes, electionsRes, studentsRes] = await Promise.all([
        fetch('/api/admin/summary'),
        fetch('/api/elections'),
        fetch('/api/admin/students'),
      ]);

      const summaryData = summaryRes.ok ? await summaryRes.json() : null;
      const electionsData: Election[] = electionsRes.ok ? await electionsRes.json() : [];
      const studentsData: Student[] = studentsRes.ok ? await studentsRes.json() : [];

      if (summaryData) setSummary(summaryData);
      setElections(electionsData);
      setStudents(studentsData);

      const allCandidates: Candidate[] = [];
      const allPositions: Position[] = [];
      const details: Record<number, { positions: Position[] }> = {};

      for (const election of electionsData) {
        const res = await fetch(`/api/elections/${election.election_id}`);
        if (!res.ok) continue;

        const data = await res.json();
        const electionPositions = Array.isArray(data.positions) ? data.positions : [];

        details[election.election_id] = { positions: electionPositions };

        electionPositions.forEach((pos: any) => {
          allPositions.push({
            position_id: pos.position_id,
            election_id: election.election_id,
            title: pos.title,
            description: pos.description,
          });

          const positionCandidates = Array.isArray(pos.candidates) ? pos.candidates : [];
          positionCandidates.forEach((cand: any) => {
            allCandidates.push({
              ...cand,
              position_id: pos.position_id,
              position_title: pos.title,
            });
          });
        });
      }

      setElectionDetails(details);
      setPositions(allPositions);
      setCandidates(allCandidates);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddCandidate = async () => {
    if (!candidateForm.student_id) {
      toast.error('Please select a student');
      return;
    }

    if (!candidateForm.position_id) {
      toast.error('Please open/select a position first. Candidates must be attached to a position.');
      return;
    }

    if (!candidatePhotoFile) {
      toast.error('Please upload candidate photo');
      return;
    }

    const selectedPositionExists = positions.some(
      (position) => position.position_id?.toString() === candidateForm.position_id
    );

    if (!selectedPositionExists) {
      toast.error('Selected position was not found. Refresh the page or add a position first.');
      return;
    }

    const formData = new FormData();
    formData.append('student_id', candidateForm.student_id);
    formData.append('position_id', candidateForm.position_id);
    formData.append('designation', candidateForm.designation);
    formData.append('political_affiliation', candidateForm.political_affiliation);
    formData.append('photo', candidatePhotoFile);

    const res = await fetch('/api/admin/candidates', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      toast.success('Candidate added successfully');
      setCandidateForm({
        student_id: '',
        position_id: candidateForm.position_id,
        designation: '',
        political_affiliation: '',
      });
      setCandidatePhotoFile(null);
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || 'Failed to add candidate');
    }
  };

  const handleUpdateCandidate = async () => {
    if (!editingCandidate) return;

    const formData = new FormData();
    formData.append('designation', editingCandidate.designation || '');
    formData.append('political_affiliation', editingCandidate.political_affiliation || '');
    if (candidatePhotoFile) {
      formData.append('photo', candidatePhotoFile);
    }

    const res = await fetch(`/api/admin/candidates/${editingCandidate.candidate_id}`, {
      method: 'PATCH',
      body: formData,
    });

    if (res.ok) {
      toast.success('Candidate updated successfully');
      setEditingCandidate(null);
      setCandidatePhotoFile(null);
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || 'Failed to update candidate');
    }
  };

  const handleDeleteCandidate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Candidate deleted successfully');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete candidate');
      }
    } catch (error) {
      toast.error('Network error deleting candidate');
    }
  };

  const handleCreateElection = async () => {
    if (!electionForm.title || !electionForm.description || !electionForm.start_time || !electionForm.end_time) {
      toast.error('Please fill in all fields: title, description, start time and end time');
      return;
    }

    if (new Date(electionForm.end_time) <= new Date(electionForm.start_time)) {
      toast.error('End date must be after start date');
      return;
    }

    const validPositions = newElectionPositions.filter((position) => position.title.trim() !== '');

    if (validPositions.length === 0) {
      toast.error('Please add at least one position before creating the election');
      return;
    }

    setIsCreating(true);

    try {
      const electionRes = await fetch('/api/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(electionForm),
      });

      const electionData = await electionRes.json();

      if (!electionRes.ok) {
        toast.error(electionData.error || 'Failed to create election');
        return;
      }

      const newElectionId =
        electionData.election_id ||
        electionData.id ||
        electionData.insertId ||
        electionData.election?.election_id;

      if (!newElectionId) {
        toast.error('Election created, but the server did not return the new election ID.');
        await fetchData();
        return;
      }

      for (const position of validPositions) {
        const positionRes = await fetch('/api/admin/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            election_id: String(newElectionId),
            title: position.title.trim(),
            description: position.description || '',
          }),
        });

        if (!positionRes.ok) {
          const data = await positionRes.json();
          toast.error(data.error || `Election created, but failed to add position: ${position.title}`);
          return;
        }
      }

      toast.success('Election and positions created successfully');

      setElectionForm({ title: '', description: '', start_time: '', end_time: '' });
      setNewElectionPositions([defaultNewPosition(0)]);
      setManagingPositionsElectionId(Number(newElectionId));
      setPositionForm({
        election_id: String(newElectionId),
        title: '',
        description: '',
      });

      await fetchData();

      setTimeout(() => {
        document.getElementById('elections-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (error) {
      console.error(error);
      toast.error('Network error creating election');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateElection = async () => {
    if (!editingElection) return;

    if (new Date(editingElection.end_time) <= new Date(editingElection.start_time)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch(`/api/admin/elections/${editingElection.election_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingElection),
      });

      if (res.ok) {
        toast.success('Election updated successfully');
        setEditingElection(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update election');
      }
    } catch (error) {
      toast.error('Network error updating election');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteElection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this election and all its data?')) return;

    const res = await fetch(`/api/admin/elections/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Election deleted');
      fetchData();
    } else {
      toast.error('Failed to delete election');
    }
  };

  const handleAddPosition = async () => {
    if (!positionForm.title || !positionForm.election_id) {
      toast.error('Title and Election are required');
      return;
    }

    const res = await fetch('/api/admin/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(positionForm),
    });

    if (res.ok) {
      toast.success('Position added successfully');
      setPositionForm({ ...positionForm, title: '', description: '' });
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || 'Failed to add position');
    }
  };

  const handleDeletePosition = async (id: number) => {
    if (!confirm('Delete this position and its candidates?')) return;

    const res = await fetch(`/api/admin/positions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Position deleted');
      fetchData();
    } else {
      toast.error('Failed to delete position');
    }
  };

  const handleDownloadPDF = () => {
    if (!summary) {
      toast.error('No summary data available to generate report');
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('SOVS - Election Report', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Election Overview', 14, 45);

    const overviewData = [
      ['Total Positions', summary.counts.positions.toString()],
      ['Total Candidates', summary.counts.candidates.toString()],
      ['Total Eligible Voters', summary.counts.voters.toString()],
      ['Total Ballots Cast', summary.counts.voted.toString()],
      ['Overall Turnout Rate', `${summary.counts.voters ? Math.round((summary.counts.voted / summary.counts.voters) * 100) : 0}%`],
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: overviewData,
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] },
      styles: { fontSize: 10 },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 20;
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(16);
    doc.text('Detailed Election Tally', 14, currentY);
    currentY += 10;

    summary.tally.forEach((item) => {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Position: ${item.position}`, 14, currentY);
      doc.setFont('helvetica', 'normal');

      const candidateData = item.candidates
        .sort((a, b) => b.votes - a.votes)
        .map((c) => [c.name, c.votes.toString()]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Candidate Name', 'Votes Count']],
        body: candidateData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 14 },
        styles: { fontSize: 9 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `SOVS Election Management System - Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`election-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report generated successfully');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]">Loading dashboard...</div>;
  }

  const turnoutData = [
    { name: 'Voted', value: summary?.counts.voted || 0 },
    { name: 'Not Voted', value: (summary?.counts.voters || 0) - (summary?.counts.voted || 0) },
  ];

  const COLORS = ['#10b981', '#e5e7eb'];

  const secretaryActions = [
    {
      title: 'Candidate Hub',
      description: 'Validate and oversee student candidate profiles.',
      icon: <Users className="w-8 h-8" />,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      link: 'candidates',
      action: 'Manage',
    },
  ];

  const activeAndDraftElections = elections.filter(
    (election) => getDisplayStatus(election) !== 'Concluded'
  );

  return (
    <div className="space-y-6 pb-20 relative">
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-[60] md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-64 bg-white z-[70] shadow-2xl p-6 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                  <Calendar className="w-6 h-6" />
                  <span>SOVS</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-2 flex-grow">
                {[
                  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { id: 'elections', label: 'Elections', icon: Calendar },
                  { id: 'candidates', label: 'Candidates', icon: Users, isExternal: true },
                  { id: 'reports', label: 'Reports', icon: FileText },
                  { id: 'messages', label: 'Messages', icon: MessageSquare },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.isExternal) navigate('/admin/candidates');
                      else setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === item.id ? 'bg-primary text-white shadow-md' : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t text-[10px] text-neutral-400 uppercase tracking-widest text-center">
                Management System v1.0
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="hidden md:block" />
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="sm:hidden">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
        <TabsList className="hidden md:grid w-full grid-cols-5 lg:w-[850px] h-12 bg-neutral-100 rounded-xl p-1">
          <TabsTrigger value="overview" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            <LayoutDashboard className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="quick-actions" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            <Users className="w-4 h-4" /> Candidate
          </TabsTrigger>
          <TabsTrigger value="elections" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            <Calendar className="w-4 h-4" /> Elections
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            <FileText className="w-4 h-4" /> Reports
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            <MessageSquare className="w-4 h-4" /> Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-actions" className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            {secretaryActions.map((item, idx) => (
              <Card key={idx} className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white rounded-3xl group overflow-hidden">
                <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
                  <div className={`p-5 rounded-3xl ${item.color} text-white group-hover:rotate-6 transition-transform shadow-lg shadow-current/20`}>
                    {item.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">{item.title}</h2>
                    <p className="text-sm text-neutral-500 mt-2 font-medium">{item.description}</p>
                  </div>
                  <Button
                    className={`w-full py-7 text-lg font-black rounded-2xl ${item.color} text-white transition-all shadow-none uppercase tracking-widest`}
                    onClick={() => navigate('/admin/candidates')}
                  >
                    {item.action} <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="overview" id="overview-section" className="space-y-8 animate-in fade-in duration-500">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-blue-600 text-white border-none shadow-lg overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-4xl font-bold">{summary?.counts.voters || 0}</CardTitle>
                <CardDescription className="text-blue-100 font-medium">Eligible Voters</CardDescription>
              </CardHeader>
              <CardContent>
                <Users className="absolute right-4 top-4 w-16 h-16 opacity-20 group-hover:scale-110 transition-transform" />
              </CardContent>
            </Card>

            <Card className="bg-indigo-600 text-white border-none shadow-lg overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-4xl font-bold">{summary?.counts.candidates || 0}</CardTitle>
                <CardDescription className="text-indigo-100 font-medium">Verified Candidates</CardDescription>
              </CardHeader>
              <CardContent>
                <UserCheck className="absolute right-4 top-4 w-16 h-16 opacity-20 group-hover:scale-110 transition-transform" />
              </CardContent>
            </Card>

            <Card className="bg-emerald-600 text-white border-none shadow-lg overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-4xl font-bold">{summary?.counts.voted || 0}</CardTitle>
                <CardDescription className="text-emerald-100 font-medium">Ballots Cast</CardDescription>
              </CardHeader>
              <CardContent>
                <ClipboardList className="absolute right-4 top-4 w-16 h-16 opacity-20 group-hover:scale-110 transition-transform" />
              </CardContent>
            </Card>

            <Card className="bg-slate-700 text-white border-none shadow-lg overflow-hidden relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-4xl font-bold">{(summary?.counts.voters || 0) - (summary?.counts.voted || 0)}</CardTitle>
                <CardDescription className="text-slate-300 font-medium">Remaining Voters</CardDescription>
              </CardHeader>
              <CardContent>
                <Users className="absolute right-4 top-4 w-16 h-16 opacity-20 group-hover:scale-110 transition-transform" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" /> Draft & Active Elections
            </h3>

            {activeAndDraftElections.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeAndDraftElections.map((election) => {
                  const displayStatus = getDisplayStatus(election);
                  return (
                    <Card key={election.election_id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-3">
                          <CardTitle className="text-lg font-bold">{election.title}</CardTitle>
                          <Badge variant={statusBadgeVariant(displayStatus)}>{displayStatus}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-neutral-500 mb-4 line-clamp-2">{election.description}</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            <Clock className="w-3 h-3" /> Start: {new Date(election.start_time).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            <Clock className="w-3 h-3" /> End: {new Date(election.end_time).toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed border-2 bg-neutral-50">
                <CardContent className="flex flex-col items-center justify-center py-10 transition-colors">
                  <CalendarOff className="w-10 h-10 text-neutral-300 mb-2" />
                  <p className="text-neutral-500 font-medium">No draft or active elections yet</p>
                  <Button variant="link" className="mt-2 text-primary" onClick={() => setActiveTab('elections')}>
                    Schedule your first election
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Current Information</CardTitle>
                <CardDescription>Current state of the election system.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm font-medium">Voter Turnout</span>
                    <Badge variant="outline">{summary?.counts.voters ? Math.round((summary.counts.voted / summary.counts.voters) * 100) : 0}%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm font-medium">Verified Candidates</span>
                    <Badge variant="outline">{summary?.counts.candidates || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm font-medium">Positions Configured</span>
                    <Badge variant="outline">{summary?.counts.positions || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </TabsContent>

        <TabsContent value="reports" id="reports-section" className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" /> Generate Election Reports
            </h3>
            <Button className="gap-2" onClick={handleDownloadPDF}>
              <BarChart3 className="w-4 h-4" /> Download Report
            </Button>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
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
                      <Pie data={turnoutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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
                    <BarChart
                      data={summary?.tally.map((t) => ({
                        name: t.position,
                        votes: t.candidates.reduce((sum, c) => sum + c.votes, 0),
                      }))}
                    >
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
        </TabsContent>

        <TabsContent value="candidates" id="candidates-section">
          <Card className="border-none shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
              <Users className="w-12 h-12 text-neutral-300" />
              <div className="text-center">
                <h3 className="text-xl font-bold">Candidate Management</h3>
                <p className="text-neutral-500">Manage all candidates in the dedicated management portal.</p>
              </div>
              <Button onClick={() => navigate('/admin/candidates')}>Open Management Portal</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elections" id="elections-section" className="space-y-12 animate-in fade-in duration-500">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6 text-primary" /> Setup & Configuration
              </h3>
              <Badge variant="outline" className="font-mono">{elections.length} Records</Badge>
            </div>

            {elections.length === 0 ? (
              <Card className="border-dashed border-2 bg-neutral-50/50">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <CalendarOff className="w-12 h-12 text-neutral-300 mb-4" />
                  <p className="text-xl font-medium text-neutral-500">No elections yet</p>
                  <p className="text-sm text-neutral-400 mt-2">Create an election and its positions below.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {elections.map((election) => {
                  const displayStatus = getDisplayStatus(election);
                  return (
                    <Card key={election.election_id} className="border-none shadow-md hover:shadow-lg transition-all overflow-hidden">
                      <div className={`h-1.5 w-full ${statusBarClass(displayStatus)}`} />
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-lg line-clamp-1" title={election.title}>{election.title}</h4>
                          <Badge variant={statusBadgeVariant(displayStatus)} className="flex-shrink-0">{displayStatus}</Badge>
                        </div>
                        <p className="text-sm text-neutral-500 line-clamp-2 h-10">{election.description}</p>

                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-medium">Starts:</span> {new Date(election.start_time).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-medium">Ends:</span> {new Date(election.end_time).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <Settings className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium">Positions:</span> {electionDetails[election.election_id]?.positions?.length || 0}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => {
                              setEditingElection(election);
                              setTimeout(() => {
                                document.getElementById('election-form-section')?.scrollIntoView({ behavior: 'smooth' });
                              }, 100);
                            }}
                            disabled={displayStatus !== 'Draft' && user?.role === 'general_secretary'}
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => {
                              setManagingPositionsElectionId(managingPositionsElectionId === election.election_id ? null : election.election_id);
                              setPositionForm({ ...positionForm, election_id: election.election_id.toString() });
                            }}
                          >
                            <Settings className="w-3.5 h-3.5" /> Positions
                          </Button>
                          {displayStatus === 'Draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleDeleteElection(election.election_id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>

                      {managingPositionsElectionId === election.election_id && (
                        <CardFooter className="flex flex-col border-t bg-neutral-50/80 p-6 space-y-6">
                          <div className="w-full space-y-4">
                            <h5 className="font-bold text-sm flex items-center gap-2">
                              <Plus className="w-4 h-4 text-primary" /> Manage Positions
                            </h5>
                            <div className="space-y-3">
                              <Input
                                placeholder="Position Title (e.g. Guild President)"
                                value={positionForm.title}
                                className="bg-white"
                                onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                              />
                              <Input
                                placeholder="Position Description"
                                value={positionForm.description}
                                className="bg-white"
                                onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                              />
                              <Button size="sm" onClick={handleAddPosition}>Add Position</Button>
                            </div>
                          </div>

                          <div className="w-full space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Current Positions & Candidates</p>
                            {(electionDetails[election.election_id]?.positions || []).map((pos) => {
                              if (!pos.position_id) return null;
                              const posCandidates = candidates.filter((c) => c.position_id === pos.position_id);
                              const isGuildPresident = pos.title.toLowerCase() === 'guild president';
                              const isGRC = pos.title.toLowerCase().includes('grc');

                              return (
                                <div key={pos.position_id} className="space-y-2">
                                  <div className="flex items-center justify-between p-3 bg-white border rounded-lg text-sm shadow-sm group hover:border-primary/50 transition-colors">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-neutral-800">{pos.title}</span>
                                      <span className="text-[10px] text-neutral-500 uppercase">{posCandidates.length} Candidates</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant={managingCandidatesPositionId === pos.position_id ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 gap-2 text-xs"
                                        onClick={() => {
                                          if (managingCandidatesPositionId === pos.position_id) {
                                            setManagingCandidatesPositionId(null);
                                          } else {
                                            setManagingCandidatesPositionId(pos.position_id!);
                                            setCandidateForm({ ...candidateForm, position_id: pos.position_id!.toString() });
                                          }
                                        }}
                                      >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        {managingCandidatesPositionId === pos.position_id ? 'Close' : 'Manage Candidates'}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeletePosition(pos.position_id!)}
                                        className="h-8 w-8 text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <AnimatePresence>
                                    {managingCandidatesPositionId === pos.position_id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="ml-4 p-4 border-l-2 border-primary/30 bg-neutral-100/50 rounded-r-lg space-y-6">
                                          <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                                            <h6 className="text-[10px] font-bold uppercase text-primary tracking-widest">
                                              {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
                                            </h6>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                              <div className="space-y-2">
                                                <Label className="text-xs">Select Student</Label>
                                                <Select
                                                  value={editingCandidate ? editingCandidate.student_id.toString() : candidateForm.student_id}
                                                  onValueChange={(val) =>
                                                    editingCandidate
                                                      ? setEditingCandidate({ ...editingCandidate, student_id: parseInt(val) })
                                                      : setCandidateForm({ ...candidateForm, student_id: val })
                                                  }
                                                  disabled={!!editingCandidate}
                                                >
                                                  <SelectTrigger className="bg-neutral-50 h-9 text-xs">
                                                    <SelectValue placeholder="Choose student..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {students.map((s) => (
                                                      <SelectItem key={s.student_id} value={s.student_id.toString()}>
                                                        {s.full_name} ({s.student_number})
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="space-y-2">
                                                <Label className="text-xs">Upload Candidate Photo</Label>
                                                <Input
                                                  type="file"
                                                  accept="image/*"
                                                  className="h-9 text-xs bg-white"
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    setCandidatePhotoFile(file);
                                                  }}
                                                />
                                                {editingCandidate && (
                                                  <p className="text-[10px] text-neutral-500">
                                                    Leave empty to keep the existing candidate photo.
                                                  </p>
                                                )}
                                              </div>
                                              {(isGRC || isGuildPresident) && (
                                                <div className="space-y-2">
                                                  <Label className="text-xs">Designation / Representing</Label>
                                                  <Input
                                                    placeholder={isGRC ? 'e.g. BSc Computer Science' : 'Candidate Title'}
                                                    value={editingCandidate ? editingCandidate.designation || '' : candidateForm.designation}
                                                    className="h-9 text-xs"
                                                    onChange={(e) =>
                                                      editingCandidate
                                                        ? setEditingCandidate({ ...editingCandidate, designation: e.target.value })
                                                        : setCandidateForm({ ...candidateForm, designation: e.target.value })
                                                    }
                                                  />
                                                </div>
                                              )}
                                              {isGuildPresident && (
                                                <div className="space-y-2">
                                                  <Label className="text-xs">Political Affiliation</Label>
                                                  <Input
                                                    placeholder="e.g. Independent, Reform Party"
                                                    value={editingCandidate ? editingCandidate.political_affiliation || '' : candidateForm.political_affiliation}
                                                    className="h-9 text-xs"
                                                    onChange={(e) =>
                                                      editingCandidate
                                                        ? setEditingCandidate({ ...editingCandidate, political_affiliation: e.target.value })
                                                        : setCandidateForm({ ...candidateForm, political_affiliation: e.target.value })
                                                    }
                                                  />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex gap-2 justify-end pt-2">
                                              {editingCandidate && (
                                                <Button variant="ghost" size="sm" onClick={() => { setEditingCandidate(null); setCandidatePhotoFile(null); }}>Cancel</Button>
                                              )}
                                              <Button size="sm" className="h-8 gap-2" onClick={editingCandidate ? handleUpdateCandidate : handleAddCandidate}>
                                                {editingCandidate ? <Edit className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                                {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
                                              </Button>
                                            </div>
                                          </div>

                                          <div className="space-y-3">
                                            <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Candidate list</p>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                              {posCandidates.map((cand) => (
                                                <div key={cand.candidate_id} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm group">
                                                  <img src={cand.photo_url} alt={cand.name} className="w-10 h-10 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{cand.name}</p>
                                                    {cand.political_affiliation && <p className="text-[10px] text-primary font-medium">{cand.political_affiliation}</p>}
                                                    {cand.designation && <p className="text-[10px] text-neutral-500 italic truncate">{cand.designation}</p>}
                                                  </div>
                                                  <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                                      setEditingCandidate(cand);
                                                      setCandidatePhotoFile(null);
                                                    }}>
                                                      <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                      onClick={() => handleDeleteCandidate(cand.candidate_id)}
                                                      title="Delete Candidate"
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                              {posCandidates.length === 0 && (
                                                <p className="col-span-full text-xs text-neutral-400 italic text-center py-4 bg-white/50 border border-dashed rounded-lg">
                                                  No candidates verified for this position yet.
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </CardFooter>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section id="election-form-section" className="space-y-6 border-t pt-12">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Plus className="w-6 h-6 text-primary" /> {editingElection ? 'Modify Election' : 'Create New Election'}
              </h3>
              <p className="text-sm text-neutral-500">
                Configure the election schedule and add positions before candidates are registered.
              </p>
            </div>

            <Card className="border-none shadow-md overflow-hidden max-w-5xl">
              <CardContent className="p-8 grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Election Title</Label>
                    <Input
                      placeholder="e.g. Guild Presidential Election 2026"
                      value={editingElection ? editingElection.title : electionForm.title}
                      className="h-11"
                      onChange={(e) =>
                        editingElection
                          ? setEditingElection({ ...editingElection, title: e.target.value })
                          : setElectionForm({ ...electionForm, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Description</Label>
                    <textarea
                      placeholder="Briefly describe the purpose of this election..."
                      value={editingElection ? editingElection.description : electionForm.description}
                      className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onChange={(e) =>
                        editingElection
                          ? setEditingElection({ ...editingElection, description: e.target.value })
                          : setElectionForm({ ...electionForm, description: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-6 bg-neutral-50 p-6 rounded-xl border border-neutral-100">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-bold uppercase text-neutral-400 tracking-wider">Timing & Schedule</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setElectionSchedule('today')}>
                        Set Today
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setElectionSchedule('tomorrow')}>
                        Set Tomorrow
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setElectionSchedule('oneHour')}>
                        Set 1 Hour
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setElectionSchedule('fullDay')}>
                        Set Full Day
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Start Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={editingElection ? (editingElection.start_time ? editingElection.start_time.slice(0, 16) : '') : electionForm.start_time}
                          className="h-11 bg-white"
                          onChange={(e) =>
                            editingElection
                              ? setEditingElection({ ...editingElection, start_time: e.target.value })
                              : setElectionForm({ ...electionForm, start_time: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">End Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={editingElection ? (editingElection.end_time ? editingElection.end_time.slice(0, 16) : '') : electionForm.end_time}
                          className="h-11 bg-white"
                          onChange={(e) =>
                            editingElection
                              ? setEditingElection({ ...editingElection, end_time: e.target.value })
                              : setElectionForm({ ...electionForm, end_time: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {!editingElection && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase text-neutral-400 tracking-wider">Election Positions</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => setNewElectionPositions([...newElectionPositions, defaultNewPosition(newElectionPositions.length)])}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Position
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {newElectionPositions.map((position, index) => (
                          <div key={index} className="bg-white border rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-neutral-500">Position {index + 1}</p>
                              {newElectionPositions.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:bg-red-50"
                                  onClick={() => setNewElectionPositions(newElectionPositions.filter((_, itemIndex) => itemIndex !== index))}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>

                            <Input
                              placeholder="Position title e.g. Guild President"
                              value={position.title}
                              className="h-10"
                              onChange={(e) => updateNewElectionPosition(index, { title: e.target.value })}
                            />

                            <Input
                              placeholder="Position description"
                              value={position.description || ''}
                              className="h-10"
                              onChange={(e) => updateNewElectionPosition(index, { description: e.target.value })}
                            />


                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Create the election schedule and add its positions before saving.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-white/50 border-t p-6 flex items-center justify-between">
                <div className="text-sm text-neutral-500 italic">
                  {editingElection ? 'Editing an existing record' : 'At least one position is required before candidates can be added'}
                </div>
                <div className="flex gap-3">
                  {editingElection ? (
                    <>
                      <Button variant="ghost" onClick={() => setEditingElection(null)} disabled={isUpdating}>Cancel</Button>
                      <Button onClick={handleUpdateElection} disabled={isUpdating} className="px-8 font-bold">
                        {isUpdating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Apply Changes
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleCreateElection} className="px-8 font-bold shadow-lg shadow-primary/20" disabled={isCreating}>
                      {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      {isCreating ? 'Finalizing...' : 'Create Election With Positions'}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="messages" id="messages-section" className="animate-in fade-in duration-500">
          <ECMessages />
        </TabsContent>
      </Tabs>
    </div>
  );
}
