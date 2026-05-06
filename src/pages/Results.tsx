import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  BarChart3, 
  PieChart as PieChartIcon,
  Download,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
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

interface CandidateResult {
  candidate_id: number;
  name: string;
  votes: number;
  photo_url: string;
  designation?: string;
}

interface PositionResult {
  position_id: number;
  title: string;
  candidates: CandidateResult[];
}

interface ElectionResults {
  election: {
    title: string;
    status: string;
  };
  results: PositionResult[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<Record<number, 'bar' | 'pie'>>({});

  useEffect(() => {
    fetch(`/api/elections/${id}/results`)
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error || 'Failed to load results'); });
        }
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadReport = () => {
    if (!data) return;
    
    let csv = 'Position,Candidate,Votes\n';
    data.results.forEach(pos => {
      pos.candidates.forEach(cand => {
        csv += `"${pos.title}","${cand.name}",${cand.votes}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `election_results_${id}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-neutral-500 font-medium">Tallying Official Results...</p>
    </div>
  );

  if (error) return (
    <div className="max-w-md mx-auto mt-20 text-center animate-in fade-in slide-in-from-bottom-4">
      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-bold text-neutral-800 mb-2">Access Restricted</h2>
      <p className="text-neutral-500 mb-8">{error}</p>
      <Button onClick={() => navigate(-1)} className="w-full">Go Back</Button>
    </div>
  );

  if (!data) return <div>No data found</div>;

  return (
    <div className="w-full mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 w-fit -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadReport}>
            <Download className="w-4 h-4" /> Download Report
          </Button>
        </div>
      </div>

      <header className="text-center space-y-4">
        <h1 className="text-5xl font-black tracking-tight text-neutral-900">{data.election.title}</h1>
      </header>

      <div className="grid gap-12">
        {data.results.map((position) => {
          const totalVotes = position.candidates.reduce((sum, c) => sum + c.votes, 0);
          const winner = [...position.candidates].sort((a, b) => b.votes - a.votes)[0];
          const chartData = position.candidates.map(c => ({
            name: c.name,
            votes: c.votes
          })).sort((a, b) => b.votes - a.votes);
          
          const currentView = viewType[position.position_id] || 'bar';

          return (
            <div key={position.position_id} className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-neutral-800">{position.title}</h2>
                  <p className="text-xs text-neutral-400 font-bold flex items-center gap-2 uppercase tracking-widest">
                    <Users className="w-3.5 h-3.5" /> {totalVotes} Total Ballots Cast
                  </p>
                </div>
                <div className="flex bg-neutral-100 p-1 rounded-lg">
                  <Button 
                    variant={currentView === 'bar' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => setViewType({ ...viewType, [position.position_id]: 'bar' })}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={currentView === 'pie' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => setViewType({ ...viewType, [position.position_id]: 'pie' })}
                  >
                    <PieChartIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <Card className="border-none shadow-xl bg-white overflow-hidden flex flex-col">
                  <CardHeader className="p-6 pb-0">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-400">Vote Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-grow min-h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                      {currentView === 'bar' ? (
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            fontSize={10} 
                            fontWeight="bold"
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                            {chartData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="votes"
                          >
                            {chartData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">Candidate Standings</h3>
                  {position.candidates.sort((a, b) => b.votes - a.votes).map((candidate, idx) => {
                    const percentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
                    const isWinner = candidate.candidate_id === winner.candidate_id && totalVotes > 0;

                    return (
                      <Card key={candidate.candidate_id} className={`border-none shadow-sm transition-all ${isWinner ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-white'}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                              <div className="text-xs font-black text-neutral-300 w-4 font-mono">#{idx + 1}</div>
                              <div className="w-10 h-10 rounded-full overflow-hidden border bg-neutral-100 flex-shrink-0">
                                <img 
                                  src={candidate.photo_url || 'https://picsum.photos/seed/user/100/100'} 
                                  alt={candidate.name} 
                                  className="w-full h-full object-contain object-top bg-white"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div>
                                <span className="font-bold flex items-center gap-2 text-neutral-800 text-sm">
                                  {candidate.name}
                                  {isWinner && <Badge className="bg-emerald-500 text-[8px] h-4">WINNER</Badge>}
                                </span>
                                {candidate.designation && (
                                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{candidate.designation}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-neutral-800">{candidate.votes}</span>
                              <p className="text-[10px] text-neutral-400 font-bold">{percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                          <Progress value={percentage} className={`h-1.5 ${isWinner ? 'bg-emerald-100' : 'bg-neutral-100'}`} />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
