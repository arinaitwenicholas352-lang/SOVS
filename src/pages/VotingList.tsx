import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Vote, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  ArrowRight,
  AlertCircle,
  Users,
  Shield,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';

interface Election {
  election_id: number;
  title: string;
  description: string;
  status: string;
  start_time: string;
  end_time: string;
}

export default function VotingList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [myVotes, setMyVotes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.type !== 'student') {
      navigate('/');
      return;
    }

    Promise.all([
      fetch('/api/elections/active-ready').then(res => res.ok ? res.json() : []),
      fetch('/api/student/my-votes').then(res => res.ok ? res.json() : [])
    ]).then(([electionsData, votesData]) => {
      setElections(Array.isArray(electionsData) ? electionsData : []);
      setMyVotes(Array.isArray(votesData) ? votesData : []);
      setLoading(false);
    }).catch(() => {
      setElections([]);
      setMyVotes([]);
      setLoading(false);
    });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-neutral-500 font-medium">Checking available elections...</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
        </Button>
      </div>

      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <Vote className="w-10 h-10 text-primary" />
              Active Elections
            </h1>
            <p className="text-lg text-neutral-500 max-w-2xl">
              Select an election below to participate. Your vote is secure, confidential, and encrypted.
            </p>
          </div>
          <Badge className="bg-emerald-500 px-4 py-2 text-sm w-fit font-bold shadow-lg shadow-emerald-500/20">
            Polls Open Now
          </Badge>
        </div>
      </header>

      {elections.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-neutral-200 text-center px-4"
        >
          <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="h-10 w-10 text-neutral-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No active elections available</h2>
          <p className="text-neutral-500 max-w-md">
            There are currently no active elections ready for voting. Please check back later or contact the Electoral Commission.
          </p>
          <Button onClick={() => navigate('/')} className="mt-8">Return to Dashboard</Button>
        </motion.div>
      ) : (
        <div className="grid gap-6">
          {elections.map((election, idx) => {
            const hasVoted = myVotes.includes(election.election_id);
            return (
              <motion.div
                key={election.election_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`overflow-hidden border-2 transition-all ${hasVoted ? 'border-green-100 bg-green-50/10' : 'border-neutral-100 hover:border-primary/30 hover:shadow-xl shadow-sm'}`}>
                  <CardHeader className="flex flex-row items-center justify-between p-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-2xl font-bold text-slate-900">{election.title}</CardTitle>
                        {hasVoted && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none font-bold">
                            VOTED
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-neutral-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          Starts: {new Date(election.start_time).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          Ends: {new Date(election.end_time).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <p className="text-neutral-600 leading-relaxed max-w-3xl">
                      {election.description}
                    </p>
                  </CardContent>
                  <CardFooter className="bg-neutral-50/50 border-t p-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                      <Users className="w-4 h-4" />
                      Candidate profiles available for review
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Link to={`/election/${election.election_id}/candidates`} className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full sm:w-auto font-bold border-neutral-200">
                          View Candidates
                        </Button>
                      </Link>
                      {hasVoted ? (
                        <Button className="w-full sm:w-auto bg-neutral-200 text-neutral-500 font-bold border-none" disabled>
                          Already Voted
                        </Button>
                      ) : (
                        <Link to={`/election/${election.election_id}`} className="w-full sm:w-auto">
                          <Button className="w-full sm:w-auto font-black shadow-lg shadow-primary/25 bg-blue-600 hover:bg-blue-700">
                            Vote Now
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Security Disclaimer */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
        <div className="p-4 bg-white/10 rounded-2xl">
          <Shield className="w-10 h-10 text-blue-400" />
        </div>
        <div className="space-y-2 flex-grow">
          <h3 className="text-xl font-bold">Secure Election Environment</h3>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl uppercase tracking-widest font-black opacity-80 decoration-blue-500/30 underline decoration-2 underline-offset-4">
            EVERY BALLOT IS ENCRYPTED USING AES-256 AND CRYPTOGRAPHICALLY LINKED TO YOUR VERIFIED STUDENT IDENTITY TO PREVENT MALICIOUS TAMPERING.
          </p>
        </div>
      </div>
    </div>
  );
}
