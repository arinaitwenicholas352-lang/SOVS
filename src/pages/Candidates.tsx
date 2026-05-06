import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface Candidate {
  candidate_id: number;
  name: string;
  photo_url: string;
  designation?: string;
  political_affiliation?: string;
}

interface Position {
  position_id: number;
  title: string;
  description: string;
  candidates: Candidate[];
}

interface Election {
  election_id: number;
  title: string;
  description: string;
  status: string;
  positions: Position[];
}

export default function Candidates() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/elections/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) setElection(data);
        else setElection(null);
        setLoading(false);
      })
      .catch(() => {
        setElection(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]">Loading candidates...</div>;
  if (!election) return <div className="text-center py-12">Election not found</div>;

  return (
    <div className="w-full mx-auto space-y-8 pb-20">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <header className="space-y-2">
        <Badge variant="outline" className="mb-2">Candidate Profiles</Badge>
        <h1 className="text-4xl font-bold tracking-tight">{election.title}</h1>
        <p className="text-neutral-500">{election.description}</p>
      </header>

      <div className="space-y-16">
        {election.positions.map((position) => (
          <section key={position.position_id} className="space-y-8">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="h-10 w-1 bg-primary rounded-full" />
              <div>
                <h2 className="text-2xl font-bold">{position.title}</h2>
                <p className="text-sm text-neutral-500">{position.description}</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {position.candidates.map((candidate, idx) => (
                <motion.div
                  key={candidate.candidate_id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="group"
                >
                  <Card className="h-full overflow-hidden border border-neutral-200 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 rounded-xl">
                    <div className="relative h-80 w-full overflow-hidden bg-white border-b flex items-center justify-center">
                      <img
                        src={candidate.photo_url || 'https://picsum.photos/seed/user/400/500'}
                        alt={candidate.name}
                        className="h-full w-full object-contain object-top bg-white p-2 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://picsum.photos/seed/user/400/500';
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-white/90 text-primary border-none text-[10px] font-bold backdrop-blur-sm">
                          Candidate
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5 space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors">
                          {candidate.name}
                        </h3>
                        <p className="text-sm font-medium text-neutral-500 mt-0.5">{position.title}</p>
                      </div>

                      {candidate.designation && (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                          {candidate.designation}
                        </p>
                      )}

                      {candidate.political_affiliation && (position.title || '').trim().toLowerCase() === 'guild president' && (
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none text-[10px] font-bold uppercase tracking-widest">
                          {candidate.political_affiliation}
                        </Badge>
                      )}

                      <div className="pt-2 border-t border-neutral-50">
                        <Button className="w-full bg-slate-900 hover:bg-primary transition-colors text-white font-bold h-9 text-xs">
                          View Manifesto
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
