import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Info, ArrowLeft, Loader2, Quote } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Candidate {
  candidate_id: number;
  name: string;
  photo_url: string;
  designation?: string;
  political_affiliation?: string;
  manifesto?: string;
}

interface Position {
  position_id: number;
  title: string;
  description: string;
  max_selections: number;
  candidates: Candidate[];
}

interface Election {
  election_id: number;
  title: string;
  description: string;
  status: string;
  positions: Position[];
}

export default function ElectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [viewingManifesto, setViewingManifesto] = useState<Candidate | null>(null);

  useEffect(() => {
    fetch(`/api/elections/${id}`)
      .then(res => res.json())
      .then(data => {
        setElection(data);
        setLoading(false);
      });
  }, [id]);

  const validateSelections = () => {
    const filledPositions = Object.values(selections).filter(arr => Array.isArray(arr) && arr.length > 0).length;
    if (filledPositions === 0) {
      toast.error('Please select at least one candidate before submitting');
      return false;
    }
    return true;
  };

  const handleSubmitClick = () => {
    if (validateSelections()) {
      setShowConfirmModal(true);
    }
  };

  const handleVote = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ election_id: id, selections }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Your vote has been cast successfully!');
        setShowConfirmModal(false);
        navigate('/');
      } else {
        toast.error(data.error || 'Failed to cast vote');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedCandidates = (positionId: number) => {
    const candidateIds = (selections[positionId] as any) || [];
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) return [];
    return election?.positions.find(p => p.position_id === positionId)?.candidates.filter(c => candidateIds.includes(c.candidate_id)) || [];
  };

  const toggleSelection = (positionId: number, candidateId: number) => {
    const position = election?.positions.find(p => p.position_id === positionId);
    if (!position) return;
    
    const max = position.max_selections || 1;

    setSelections(prev => {
      const current = (prev[positionId] as any) || [];
      const currentArray = Array.isArray(current) ? current : [current];
      const isAlreadySelected = currentArray.includes(candidateId);

      if (isAlreadySelected) {
        // Remove selection
        const next = currentArray.filter((id: number) => id !== candidateId);
        return { ...prev, [positionId]: next };
      } else {
        // Add selection (if not exceeding max)
        if (currentArray.length >= max) {
          if (max === 1) {
            // Replace for single select
            return { ...prev, [positionId]: [candidateId] };
          }
          toast.error(`You can only select up to ${max} candidates for this position`);
          return prev;
        }
        return { ...prev, [positionId]: [...currentArray, candidateId] };
      }
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-neutral-500 font-medium">Loading secure election details...</p>
    </div>
  );
  
  if (!election) return <div className="flex items-center justify-center min-h-[50vh]">Election not found</div>;

  return (
    <div className="w-full mx-auto space-y-8 pb-32">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 group">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
      </Button>

      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{election.title}</h1>
            <p className="text-lg text-neutral-500 max-w-2xl">{election.description}</p>
          </div>
          <Badge className="bg-emerald-500 px-4 py-1.5 text-sm w-fit">Active Election</Badge>
        </div>
      </header>

      <div className="space-y-16">
        {election.positions.map((position) => (
          <section key={position.position_id} className="space-y-8">
            <div className="border-b border-neutral-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-slate-900">{position.title}</h2>
                <p className="text-neutral-500">{position.description}</p>
              </div>
              {selections[position.position_id]?.length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 h-fit">
                  {selections[position.position_id].length} / {position.max_selections} Selected
                </Badge>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {position.candidates.map((candidate) => {
                const isSelected = (selections[position.position_id] || []).includes(candidate.candidate_id);
                return (
                  <div key={candidate.candidate_id} className="relative h-full">
                    <Card 
                      className={`h-full overflow-hidden transition-all duration-300 border-2 cursor-pointer group ${
                        isSelected 
                        ? 'border-primary ring-2 ring-primary/10 shadow-lg' 
                        : 'border-neutral-100 hover:border-neutral-300 shadow-sm'
                      }`}
                      onClick={() => toggleSelection(position.position_id, candidate.candidate_id)}
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-neutral-100 relative">
                        <img 
                          src={candidate.photo_url || 'https://picsum.photos/seed/user/400/500'} 
                          alt={candidate.name} 
                          className={`w-full h-full object-contain object-top bg-white transition-transform duration-500 ${isSelected ? 'scale-[1.02]' : 'group-hover:scale-[1.02]'}`}
                          referrerPolicy="no-referrer"
                        />
                        <div className={`absolute top-3 right-3 transition-all duration-300 ${isSelected ? 'scale-110' : 'scale-100'}`}>
                          <Checkbox 
                            checked={isSelected} 
                            className="h-6 w-6 rounded-full border-white/50 bg-white/20 backdrop-blur-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </div>
                        {isSelected && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/80 to-transparent p-4">
                            <Badge className="bg-white text-primary border-none">Selected</Badge>
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-5 space-y-4">
                        <div>
                          <h3 className={`text-lg font-bold transition-colors ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                            {candidate.name}
                          </h3>
                          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{position.title}</p>
                        </div>
                        
                        {candidate.designation && (
                          <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100">
                             <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              {candidate.designation}
                            </p>
                          </div>
                        )}

                        {candidate.political_affiliation && (position.title || '').trim().toLowerCase() === 'guild president' && (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none text-[10px] font-bold uppercase tracking-widest mt-2">
                            {candidate.political_affiliation}
                          </Badge>
                        )}

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-4 text-[10px] font-bold uppercase tracking-widest h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingManifesto(candidate);
                          }}
                        >
                          View Manifesto
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-neutral-200 z-50">
        <div className="w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {(() => {
              const selectedPositionsCount = Object.values(selections).filter(arr => Array.isArray(arr) && arr.length > 0).length;
              const isFullySelected = selectedPositionsCount === election.positions.length;
              return (
                <>
                  <div className={`p-2 rounded-full ${isFullySelected ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-400'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600">
                    {selectedPositionsCount} of {election.positions.length} positions selected
                  </p>
                </>
              );
            })()}
          </div>
          <Button 
            className="w-full sm:w-64 h-12 text-lg font-bold shadow-xl shadow-primary/20" 
            onClick={handleSubmitClick}
            disabled={user?.type !== 'student'}
          >
            Submit Vote
          </Button>
        </div>
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-xl sm:rounded-2xl border-none shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <DialogTitle className="text-3xl font-extrabold tracking-tight">Review Your Submission</DialogTitle>
              <DialogDescription className="text-base">
                Please carefully verify your choices before final submission.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-4 max-h-[50vh] overflow-y-auto px-1">
            {election.positions
              .filter(p => selections[p.position_id]?.length > 0)
              .map((position) => {
                const selectedCandidates = getSelectedCandidates(position.position_id);
                return (
                  <div key={position.position_id} className="space-y-2 p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{position.title}</p>
                    <div className="space-y-3">
                      {selectedCandidates.map(candidate => (
                        <div key={candidate.candidate_id} className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0">
                            <img 
                              src={candidate?.photo_url || 'https://picsum.photos/seed/user/100/100'} 
                              alt={candidate?.name} 
                              className="w-full h-full object-contain object-top bg-white"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-grow">
                            <h4 className="font-bold text-slate-900 text-sm">{candidate?.name}</h4>
                            {candidate?.political_affiliation && (position.title || '').trim().toLowerCase() === 'guild president' && (
                              <p className="text-[10px] text-blue-600 font-bold">{candidate.political_affiliation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
             <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
             <p className="text-xs text-yellow-800 leading-relaxed font-medium">
               <strong>Important:</strong> You have selected the candidates listed above. Do you want to confirm your vote? 
               This action is irreversible and you cannot vote again in this election.
             </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl font-bold border-neutral-200 hover:bg-neutral-50" 
              onClick={() => setShowConfirmModal(false)}
              disabled={submitting}
            >
              Review Again
            </Button>
            <Button 
              className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20" 
              onClick={handleVote}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Transmitting...
                </>
              ) : 'Confirm Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingManifesto} onOpenChange={(open) => !open && setViewingManifesto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Candidate Manifesto: {viewingManifesto?.name}</DialogTitle>
            <DialogDescription>{viewingManifesto?.designation || 'Verified Candidate'}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex gap-6 mb-6">
              <div className="w-24 h-24 rounded-xl overflow-hidden border flex-shrink-0">
                <img 
                  src={viewingManifesto?.photo_url || 'https://picsum.photos/seed/user/100/100'} 
                  alt={viewingManifesto?.name} 
                  className="w-full h-full object-contain object-top bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold">{viewingManifesto?.name}</h4>
                {viewingManifesto?.political_affiliation && (
                  <Badge variant="secondary">{viewingManifesto.political_affiliation}</Badge>
                )}
              </div>
            </div>
            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-100 max-h-[40vh] overflow-y-auto">
              <Quote className="w-8 h-8 text-primary/20 mb-2" />
              <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap italic">
                {viewingManifesto?.manifesto || "The candidate has not provided a written manifesto yet. Their platform is built on student representation and integrity."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setViewingManifesto(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
