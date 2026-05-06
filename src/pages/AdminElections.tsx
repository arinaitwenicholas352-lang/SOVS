import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Play, Pause, Square, BarChart3, Settings, Users, UserCheck, ClipboardList, TrendingUp, FileText, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Election {
  election_id: number;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  is_results_approved: number;
}

interface Turnout {
  total: number;
  voted: number;
  byFaculty: { faculty: string; count: number }[];
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
}

export default function AdminElections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [turnout, setTurnout] = useState<Record<number, Turnout>>({});
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const [newElection, setNewElection] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: ''
  });

  const isPro = user?.role === 'pro' || user?.role === 'EC Public Relations Officer';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchPromises = [fetch('/api/elections')];
      if (isPro) {
        fetchPromises.push(fetch('/api/admin/summary'));
      }
      
      const responses = await Promise.all(fetchPromises);
      const electionsData = await responses[0].json();
      setElections(electionsData);
      
      if (isPro && responses[1]) {
        const summaryData = await responses[1].json();
        setSummary(summaryData);
      }
    } catch (err) {
      console.error("Failed to load admin elections data", err);
    } finally {
      setLoading(false);
    }
  };

  const loadElections = async () => {
    const res = await fetch('/api/elections');
    const data = await res.json();
    setElections(data);
  };

  const handleCreate = async () => {
    if (!newElection.title || !newElection.description || !newElection.start_time || !newElection.end_time) {
      toast.error('All fields are required (Title, Description, Start & End Time)');
      return;
    }
    
    if (new Date(newElection.end_time) <= new Date(newElection.start_time)) {
      toast.error('End date must be after start date');
      return;
    }

    const res = await fetch('/api/elections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newElection),
    });
    if (res.ok) {
      toast.success('Election created successfully');
      setNewElection({ title: '', description: '', start_time: '', end_time: '' });
      loadElections();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to create election');
    }
  };

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/elections/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Election status updated to ${status}`);
      loadElections();
    } else {
      toast.error('Failed to update status');
    }
  };

  const approveResults = async (id: number) => {
    const res = await fetch(`/api/elections/${id}/approve-results`, {
      method: 'POST',
    });
    if (res.ok) {
      toast.success('Results approved for public publication');
      loadElections();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to approve results');
    }
  };

  const viewTurnout = async (id: number) => {
    const res = await fetch(`/api/elections/${id}/turnout`);
    const data = await res.json();
    setTurnout({ ...turnout, [id]: data });
  };

  const handleDownloadReport = () => {
    if (!summary) {
      toast.error("No summary data available to generate report");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("SOVS - PR Report", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("Election Overview", 14, 45);
    
    const overviewData = [
      ["Total Positions", summary.counts.positions.toString()],
      ["Total Candidates", summary.counts.candidates.toString()],
      ["Total Eligible Voters", summary.counts.voters.toString()],
      ["Total Ballots Cast", summary.counts.voted.toString()],
      ["Overall Turnout Rate", `${summary.counts.voters ? Math.round((summary.counts.voted / summary.counts.voters) * 100) : 0}%`]
    ];

    autoTable(doc, {
      startY: 50,
      head: [["Metric", "Value"]],
      body: overviewData,
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] },
      styles: { fontSize: 10 }
    });

    summary.tally.forEach((item) => {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`Position: ${item.position} Results`, 14, 20);

      const candidateData = item.candidates
        .sort((a, b) => b.votes - a.votes)
        .map(c => [c.name, c.votes.toString()]);

      autoTable(doc, {
        startY: 30,
        head: [["Candidate Name", "Votes Count"]],
        body: candidateData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 }
      });
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `SOVS PR Report - Page ${i} of ${pageCount}`, 
            105, 
            doc.internal.pageSize.height - 10, 
            { align: 'center' }
        );
    }

    doc.save(`pr-election-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF report generated successfully");
  };

  if (loading) return <div>Loading elections overview...</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {isPro && (
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full h-10 w-10 border-neutral-200"
              onClick={() => navigate('/')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isPro ? 'Elections Overview' : 'Election Management'}
            </h1>
            <p className="text-neutral-500 font-medium">
              {!isPro && 'Create, monitor, and control university elections.'}
            </p>
          </div>
        </div>
        {(user?.type === 'it' || user?.role === 'general_secretary') && (
          <Dialog>
            <DialogTrigger render={
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95">
                <Plus className="w-5 h-5" /> Create New Election
              </Button>
            }>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Election</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input 
                    value={newElection.title} 
                    onChange={e => setNewElection({...newElection, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={newElection.description} 
                    onChange={e => setNewElection({...newElection, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input 
                      type="datetime-local" 
                      value={newElection.start_time} 
                      onChange={e => setNewElection({...newElection, start_time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input 
                      type="datetime-local" 
                      value={newElection.end_time} 
                      onChange={e => setNewElection({...newElection, end_time: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate}>Create Draft</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {isPro && (
        <div className="space-y-10">
          {/* Metrics */}
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
                <CardTitle className="text-4xl font-bold">{summary?.counts.voters ? Math.round((summary.counts.voted / summary.counts.voters) * 100) : 0}%</CardTitle>
                <CardDescription className="text-slate-300 font-medium">Turnout Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendingUp className="absolute right-4 top-4 w-16 h-16 opacity-20 group-hover:scale-110 transition-transform" />
              </CardContent>
            </Card>
          </div>

          {/* Download Report Section */}
          <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-bold flex items-center gap-2 justify-center md:justify-start">
                <FileText className="w-6 h-6 text-primary" /> PR Release Report
              </h3>
            </div>
            <Button size="lg" className="gap-2 h-14 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all" onClick={handleDownloadReport}>
              <BarChart3 className="w-5 h-5" /> Download Report
            </Button>
          </div>

          {/* Turnout Table for PRO */}
          <Card className="border-none shadow-md overflow-hidden rounded-3xl">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Election Title</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Schedule</TableHead>
                  <TableHead className="text-right font-bold">Quick Tally</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elections.map((election) => (
                  <TableRow key={election.election_id}>
                    <TableCell className="font-bold text-slate-800">{election.title}</TableCell>
                    <TableCell>
                      <Badge variant={election.status === 'active' ? 'default' : 'secondary'} className="rounded-full px-3">
                        {election.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500 font-medium">
                      {new Date(election.start_time).toLocaleString()} - {new Date(election.end_time).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-primary font-bold hover:bg-primary/5"
                         onClick={() => viewTurnout(election.election_id)}
                       >
                         <BarChart3 className="w-4 h-4 mr-2" /> Details
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {!isPro && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Election Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elections.map((election) => (
                <TableRow key={election.election_id}>
                  <TableCell className="font-medium">{election.title}</TableCell>
                  <TableCell>
                    <Badge variant={election.status === 'active' ? 'default' : 'secondary'}>
                      {election.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-neutral-500">
                    {new Date(election.start_time).toLocaleString()} - {new Date(election.end_time).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Dialog>
                      <DialogTrigger 
                        render={
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => viewTurnout(election.election_id)} 
                          />
                        }
                      >
                        <BarChart3 className="w-4 h-4" />
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Turnout Monitor: {election.title}</DialogTitle>
                        </DialogHeader>
                        {turnout[election.election_id] && (
                          <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium">Total Turnout</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold">
                                    {((turnout[election.election_id].voted / turnout[election.election_id].total) * 100).toFixed(1)}%
                                  </div>
                                  <p className="text-xs text-neutral-500">
                                    {turnout[election.election_id].voted} of {turnout[election.election_id].total} eligible students
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Faculty</TableHead>
                                  <TableHead className="text-right">Voted</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {turnout[election.election_id].byFaculty.map(f => (
                                  <TableRow key={f.faculty}>
                                    <TableCell>{f.faculty}</TableCell>
                                    <TableCell className="text-right">{f.count}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {/* Strict Action Enforcement UI */}
                    {(user?.type === 'it' || user?.role === 'chairperson' || user?.role === 'vice_chairperson') && (
                      <>
                        {/* ONLY Chairperson can START/ACTIVATE an election */}
                        {election.status !== 'active' && (election.status === 'draft' || election.status === 'pending' || election.status === 'paused') ? (
                          (user?.role === 'chairperson' || user?.type === 'it') ? (
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2"
                              onClick={() => updateStatus(election.election_id, 'active')}
                            >
                              <Play className="w-4 h-4" /> Start Election
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-neutral-400">Awaiting Chairperson</Badge>
                          )
                        ) : election.status === 'active' ? (
                          <Button variant="outline" size="sm" onClick={() => updateStatus(election.election_id, 'paused')} title="Pause Voting">
                            <Pause className="w-4 h-4" />
                          </Button>
                        ) : null}
                        
                        {/* Chairperson and Vice Chairperson can close/archive */}
                        {election.status !== 'closed' && election.status !== 'archived' && (
                          <Button variant="destructive" size="sm" onClick={() => updateStatus(election.election_id, 'closed')} title="Stop & Close Election">
                            <Square className="w-4 h-4" />
                          </Button>
                        )}

                        {/* ONLY Chairperson can APPROVE results */}
                        {(election.status === 'closed' || election.status === 'archived') && election.is_results_approved === 0 && (user?.role === 'chairperson' || user?.type === 'it') && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => approveResults(election.election_id)}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold"
                          >
                            Approve Results
                          </Button>
                        )}
                        
                        {election.is_results_approved === 1 && (
                          <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100">Results Published</Badge>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
