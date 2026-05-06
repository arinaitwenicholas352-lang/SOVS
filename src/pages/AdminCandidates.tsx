import { useState, useEffect, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  UserCheck,
  Quote, 
  Image as ImageIcon,
  ArrowLeft,
  Filter,
  Megaphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Candidate {
  candidate_id: number;
  student_id: number;
  position_id: number;
  name: string;
  position_title: string;
  photo_url: string;
  designation?: string;
  political_affiliation?: string;
  manifesto?: string;
}

interface Student {
  student_id: number;
  full_name: string;
  student_number: string;
  email: string;
}

interface Position {
  position_id: number;
  title: string;
}

interface Election {
  election_id: number;
  title: string;
}

export default function AdminCandidates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [pendingCandidates, setPendingCandidates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candidateForm, setCandidateForm] = useState({ 
    student_id: '', 
    position_id: '', 
    photo_url: '',
    designation: '',
    political_affiliation: ''
  });

  const [deletingCandidateId, setDeletingCandidateId] = useState<number | null>(null);
  const [deletingManifestoId, setDeletingManifestoId] = useState<number | null>(null);

  const [isManagingManifesto, setIsManagingManifesto] = useState(false);
  const [manifestoCandidate, setManifestoCandidate] = useState<Candidate | null>(null);
  const [manifestoText, setManifestoText] = useState('');
  const [isPreviewingManifesto, setIsPreviewingManifesto] = useState(false);

  const fetchData = async () => {
    try {
      const [electionsRes, studentsRes] = await Promise.all([
        fetch('/api/elections'),
        fetch('/api/admin/students')
      ]);

      const electionsData = electionsRes.ok ? await electionsRes.json() : [];
      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      
      setElections(electionsData);
      setStudents(studentsData);

      // Fetch candidates and positions from all elections
      const allCandidates: Candidate[] = [];
      const allPositions: Position[] = [];
      
      for (const election of electionsData) {
        const res = await fetch(`/api/elections/${election.election_id}`);
        if (res.ok) {
          const data = await res.json();
          data.positions.forEach((pos: any) => {
            allPositions.push({ position_id: pos.position_id, title: pos.title });
            pos.candidates.forEach((cand: any) => {
              allCandidates.push({
                ...cand,
                position_id: pos.position_id,
                position_title: pos.title
              });
            });
          });
        }
      }
      
      setCandidates(allCandidates);
      // Unique positions
      const uniquePositions = Array.from(new Map(allPositions.map(p => [p.position_id, p])).values());
      setPositions(uniquePositions);
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch candidates data", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCandidate = () => {
    if (!candidateForm.student_id || !candidateForm.position_id) {
      toast.error("Please select both a student and a position");
      return;
    }

    const selectedPos = positions.find(p => p.position_id.toString() === candidateForm.position_id);
    const title = (selectedPos?.title || '').trim().toLowerCase();
    
    if (title.includes('grc') && !candidateForm.designation) {
      toast.error("Designation is required for GRC positions");
      return;
    }

    if (title === 'guild president' && !candidateForm.political_affiliation) {
      toast.error("Political affiliation is required for Guild President");
      return;
    }

    // Check if already in pending
    if (pendingCandidates.some(c => c.student_id === candidateForm.student_id && c.position_id === candidateForm.position_id)) {
      toast.error("This student is already in your pending list for this position");
      return;
    }

    const student = students.find(s => s.student_id.toString() === candidateForm.student_id);
    const position = positions.find(p => p.position_id.toString() === candidateForm.position_id);

    const newPending = {
      ...candidateForm,
      student_name: student?.full_name,
      student_number: student?.student_number,
      position_title: position?.title
    };

    setPendingCandidates([...pendingCandidates, newPending]);
    
    // Clear form
    setCandidateForm({ student_id: '', position_id: '', photo_url: '', designation: '', political_affiliation: '' });
    setStudentSearch('');
    setSelectedStudent(null);
    toast.success("Candidate added to pending list");
  };

  const handleBulkSubmit = async () => {
    if (pendingCandidates.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingCandidates)
      });
      
      if (res.ok) {
        toast.success(`Successfully saved ${pendingCandidates.length} candidates`);
        setPendingCandidates([]);
        setIsAdding(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save candidates");
      }
    } catch (error) {
      toast.error("An error occurred during submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCandidate = async () => {
    if (!editingCandidate) return;
    const res = await fetch(`/api/admin/candidates/${editingCandidate.candidate_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        photo_url: editingCandidate.photo_url,
        designation: editingCandidate.designation,
        political_affiliation: editingCandidate.political_affiliation
      })
    });
    if (res.ok) {
      toast.success("Candidate updated successfully");
      setEditingCandidate(null);
      fetchData();
    } else {
      toast.error("Failed to update candidate");
    }
  };

  const handleDeleteCandidate = async (id: number) => {
    setDeletingCandidateId(null);
    const res = await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success("Candidate deleted");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete candidate");
    }
  };

  const handleSaveManifesto = async () => {
    if (!manifestoCandidate) return;
    if (!manifestoText.trim()) {
      toast.error("Manifesto content cannot be empty");
      return;
    }

    try {
      const res = await fetch(`/api/admin/candidates/${manifestoCandidate.candidate_id}/manifesto`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifesto: manifestoText })
      });
      
      if (res.ok) {
        toast.success("Manifesto updated successfully");
        setIsManagingManifesto(false);
        setManifestoCandidate(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save manifesto");
      }
    } catch (error) {
      toast.error("Network error saving manifesto");
    }
  };

  const handleDeleteManifesto = async (candidateId: number) => {
    setDeletingManifestoId(null);

    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}/manifesto`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        toast.success("Manifesto deleted successfully");
        fetchData();
      } else {
        toast.error("Failed to delete manifesto");
      }
    } catch (error) {
      toast.error("Network error deleting manifesto");
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.position_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (c.designation && c.designation.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPosition = filterPosition === 'all' || c.position_title === filterPosition;
    return matchesSearch && matchesPosition;
  });

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.student_number.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 10); // Limit results for better performance

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a valid image (JPG, PNG)");
        return;
      }

      // Check file size (optional but good UX - e.g., 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isEdit && editingCandidate) {
          setEditingCandidate({ ...editingCandidate, photo_url: base64String });
        } else {
          setCandidateForm({ ...candidateForm, photo_url: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const normalizedRole = (user?.role || '').toString().trim().toLowerCase().replace(/\s+/g, '_');
  const normalizedType = (user?.type || '').toString().trim().toLowerCase().replace(/\s+/g, '_');

  const isIT = normalizedRole === 'it_admin' || normalizedType === 'it_admin' || normalizedType === 'it';
  const isPRO =
    normalizedRole === 'pro' ||
    normalizedRole === 'public_relations_officer' ||
    normalizedRole === 'ec_public_relations_officer' ||
    normalizedRole.includes('public_relations');
  const isSecretary = normalizedRole === 'general_secretary';
  const isChairperson = normalizedRole === 'chairperson' || normalizedRole === 'vice_chairperson';

  const canManageCandidateProfile = isSecretary || isIT;
  const canAdd = canManageCandidateProfile;
  const canDelete = canManageCandidateProfile;
  const canEdit = canManageCandidateProfile;
  const canManageManifesto = isPRO;

  if (loading) return <div className="flex items-center justify-center h-[60vh]">Loading candidate management...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Candidate Management</h1>
            <p className="text-neutral-500">
              {isPRO ? 'Upload and maintain manifestos for existing candidates.' : 
               isChairperson ? 'View registered candidates and their documentation.' :
               'Manage election candidates and their profiles.'}
            </p>
          </div>
        </div>
        {canAdd && !isAdding && (
          <Button 
            onClick={() => setIsAdding(true)} 
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-black h-12 px-6 rounded-xl shadow-lg shadow-teal-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            <Plus className="w-5 h-5" /> Add New Candidate
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input 
            placeholder="Search candidates by name or position..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterPosition} onValueChange={setFilterPosition}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map(p => (
              <SelectItem key={p.position_id} value={p.title}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isAdding && (
        <Card className="border-primary/20 shadow-lg bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="border-b bg-white/50">
            <CardTitle className="text-2xl">Register New Candidate</CardTitle>
            <CardDescription>Search the student database to nominate a candidate for a position.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 p-8 md:grid-cols-2">
            {/* Student Search Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-bold">1. Find Student</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input 
                    placeholder="Search by Name, Reg No, or Email..." 
                    className="pl-10 h-12 text-base shadow-sm"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      if (selectedStudent) setSelectedStudent(null);
                    }}
                  />
                </div>
                
                {studentSearch && !selectedStudent && (
                  <div className="mt-2 max-h-[250px] overflow-y-auto border rounded-xl bg-white shadow-xl z-10 relative">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(s => (
                        <div 
                          key={s.student_id} 
                          className="p-4 hover:bg-primary/5 cursor-pointer border-b last:border-0 transition-colors"
                          onClick={() => {
                            setCandidateForm({...candidateForm, student_id: s.student_id.toString()});
                            setSelectedStudent(s);
                            setStudentSearch(s.full_name);
                          }}
                        >
                          <div className="font-bold text-slate-800">{s.full_name}</div>
                          <div className="text-sm text-neutral-500 flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] h-4">{s.student_number}</Badge>
                            <span>{s.email}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-sm text-neutral-500 text-center italic">
                        No students found matching your search.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Selected Nominee</p>
                    <p className="font-bold text-slate-800">{selectedStudent.full_name}</p>
                    <p className="text-xs text-slate-500">{selectedStudent.student_number}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearch('');
                    setCandidateForm({...candidateForm, student_id: ''});
                  }}>Change</Button>
                </motion.div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-bold">2. Assign Position</Label>
                {positions.length > 0 ? (
                  <Select 
                    value={candidateForm.position_id} 
                    onValueChange={(v) => {
                      const selected = positions.find(p => p.position_id.toString() === v);
                      const title = (selected?.title || '').trim().toLowerCase();
                      
                      console.log("Selected Position ID:", v);
                      console.log("Selected Position Title:", selected?.title);
                      console.log("Is Guild President?", title === 'guild president');

                      setCandidateForm(prev => ({
                        ...prev, 
                        position_id: v,
                        // Clear political affiliation if not guild president
                        political_affiliation: title === 'guild president' ? prev.political_affiliation : ''
                      }));
                    }}
                  >
                    <SelectTrigger className="h-12 text-base shadow-sm w-full" id="position-dropdown">
                      <SelectValue placeholder="Select Election Position" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {positions.map(p => (
                        <SelectItem key={p.position_id} value={p.position_id.toString()}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 border border-dashed rounded-lg bg-neutral-50 text-neutral-500 text-sm italic">
                    No positions found. Please ensure an election is created first.
                  </div>
                )}
              </div>

              {(() => {
                const selectedPos = positions.find(p => p.position_id.toString() === candidateForm.position_id);
                const title = (selectedPos?.title || '').trim().toLowerCase();
                const isGRC = title.includes('grc');
                
                return isGRC ? (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-medium">Designation / Program</Label>
                    <Select 
                      value={candidateForm.designation} 
                      onValueChange={(v) => setCandidateForm({...candidateForm, designation: v})}
                    >
                      <SelectTrigger className="h-11 w-full bg-white">
                        <SelectValue placeholder="Select GRC Designation" />
                      </SelectTrigger>
                      <SelectContent className="z-[110]">
                        {["Mile 3", "Mile 4", "Kiyanja", "BCS", "BSE", "MIE", "EEE", "BBA"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                ) : null;
              })()}

              {(() => {
                const selectedPos = positions.find(p => p.position_id.toString() === candidateForm.position_id);
                const title = (selectedPos?.title || '').trim().toLowerCase();
                const isGP = title === 'guild president';
                
                console.log("Rendering Political Affiliation Field? ", isGP);

                return isGP ? (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                    id="political-affiliation-container"
                  >
                    <Label className="text-sm font-medium">Political Affiliation</Label>
                    <Input 
                      placeholder="e.g. NUP, NRM, Independent..." 
                      className="h-11 bg-white"
                      value={candidateForm.political_affiliation}
                      onChange={(e) => setCandidateForm({...candidateForm, political_affiliation: e.target.value})}
                    />
                  </motion.div>
                ) : null;
              })()}

              <div className="space-y-4">
                <Label className="text-sm font-medium">Candidate Photo (Optional)</Label>
                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-neutral-200 rounded-2xl bg-white shadow-inner">
                  <div className="w-[180px] h-[180px] rounded-xl bg-neutral-50 border flex items-center justify-center overflow-hidden group relative">
                    {candidateForm.photo_url ? (
                      <>
                        <img 
                          src={candidateForm.photo_url} 
                          alt="Preview" 
                          className="w-full h-full object-contain object-top bg-white" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="text-xs h-8"
                            onClick={() => setCandidateForm({ ...candidateForm, photo_url: '' })}
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-neutral-300">
                        <ImageIcon className="w-10 h-10" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">No Image selected</span>
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <Input 
                      type="file" 
                      id="photo-upload"
                      accept="image/*" 
                      onChange={(e) => handlePhotoUpload(e)}
                      className="hidden"
                    />
                    <Label 
                      htmlFor="photo-upload"
                      className="flex flex-col items-center justify-center w-full h-12 border-2 border-primary/20 hover:border-primary hover:bg-primary/5 rounded-xl cursor-pointer transition-all gap-2"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-primary">{candidateForm.photo_url ? 'Change Photo' : 'Select Photo'}</span>
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          
          {pendingCandidates.length > 0 && (
            <div className="px-8 pb-8">
              <div className="border rounded-xl overflow-hidden bg-white">
                <div className="bg-neutral-50 px-4 py-2 border-b flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pending Submission ({pendingCandidates.length})</span>
                </div>
                <div className="divide-y max-h-[300px] overflow-y-auto">
                  {pendingCandidates.map((c, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {c.student_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{c.student_name}</p>
                          <p className="text-[10px] text-neutral-500 font-mono">{c.position_title} {c.designation ? `• ${c.designation}` : ''}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-neutral-400 hover:text-red-500"
                        onClick={() => setPendingCandidates(pendingCandidates.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <CardFooter className="flex justify-between gap-3 p-6 bg-white/50 border-t">
            <Button variant="ghost" onClick={() => {
              setIsAdding(false);
              setPendingCandidates([]);
            }}>Cancel</Button>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={handleAddCandidate} 
                className="px-6 font-bold"
              >
                Add Another
              </Button>
              <Button 
                onClick={pendingCandidates.length > 0 ? handleBulkSubmit : handleAddCandidate} 
                disabled={isSubmitting || (!candidateForm.student_id && pendingCandidates.length === 0)}
                className="px-8 font-bold shadow-lg shadow-primary/20"
              >
                {isSubmitting ? "Saving..." : pendingCandidates.length > 0 ? "Submit All Candidates" : "Save Candidate"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {editingCandidate && (
        <Card className="border-blue-200 shadow-lg bg-blue-50/30">
          <CardHeader>
            <CardTitle>Edit Candidate: {editingCandidate.name}</CardTitle>
            <CardDescription>Update profile photo and designation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(() => {
              const title = (editingCandidate.position_title || '').trim().toLowerCase();
              if (title.includes('grc')) {
                return (
                  <div className="space-y-2">
                    <Label>Designation (e.g. GRC for BCS, GRC Kakoba)</Label>
                    <Select 
                      value={editingCandidate.designation || ''} 
                      onValueChange={(v) => setEditingCandidate({...editingCandidate, designation: v})}
                    >
                      <SelectTrigger className="h-11 w-full bg-white">
                        <SelectValue placeholder="Select GRC Designation" />
                      </SelectTrigger>
                      <SelectContent className="z-[110]">
                        {["Mile 3", "Mile 4", "Kiyanja", "BCS", "BSE", "MIE", "EEE", "BBA"].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              return null;
            })()}

            {(() => {
              const title = (editingCandidate.position_title || '').trim().toLowerCase();
              if (title === 'guild president') {
                return (
                  <div className="space-y-2">
                    <Label>Political Affiliation</Label>
                    <Input 
                      placeholder="e.g. NUP, NRM, Independent..." 
                      value={editingCandidate.political_affiliation || ''}
                      onChange={(e) => setEditingCandidate({...editingCandidate, political_affiliation: e.target.value})}
                    />
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-4">
              <Label className="font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Candidate Profile Photo
              </Label>
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white border-2 border-dashed border-blue-200 rounded-2xl">
                <div className="w-[150px] h-[150px] rounded-xl bg-neutral-100 border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                  {editingCandidate.photo_url ? (
                    <img src={editingCandidate.photo_url} alt="Preview" className="w-full h-full object-contain object-top bg-white" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-neutral-300" />
                  )}
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Upload Local File</Label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handlePhotoUpload(e, true)}
                      className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Or Provide CDN URL</Label>
                    <Input 
                      placeholder="https://..." 
                      value={editingCandidate.photo_url}
                      onChange={(e) => setEditingCandidate({...editingCandidate, photo_url: e.target.value})}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingCandidate(null)}>Cancel</Button>
            <Button onClick={handleUpdateCandidate}>Update Profile</Button>
          </CardFooter>
        </Card>
      )}

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-neutral-200">
          <div className="bg-neutral-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl font-bold text-neutral-800">No candidates available yet</h3>
          <p className="text-neutral-500 mt-2">
            {searchQuery || filterPosition !== 'all' 
              ? 'Try adjusting your search or filters.' 
              : 'Candidates will appear here once they are registered by the General Secretary.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCandidates.map(cand => (
            <Card key={cand.candidate_id} className="overflow-hidden border border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group bg-white rounded-xl">
              <div className="relative h-[360px] w-full overflow-hidden bg-white">
                <img 
                  src={cand.photo_url || 'https://picsum.photos/seed/user/400/500'} 
                  alt={cand.name} 
                  className="h-full w-full object-contain object-top bg-white transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = 'https://picsum.photos/seed/user/400/500';
                  }}
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest bg-white/90 text-primary border-primary/20 backdrop-blur-sm">
                    {cand.position_title}
                  </Badge>
                  {cand.designation && (
                    <Badge className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/90 hover:bg-emerald-600 border-none backdrop-blur-sm">
                      {cand.designation}
                    </Badge>
                  )}
                  {cand.political_affiliation && (cand.position_title || '').trim().toLowerCase() === 'guild president' && (
                    <Badge className="text-[10px] uppercase font-black tracking-widest bg-blue-600/90 hover:bg-blue-700 border-none backdrop-blur-sm">
                      {cand.political_affiliation}
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">{cand.name}</h3>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Verified Nominee</span>
                  </div>
                </div>

                {(canManageCandidateProfile || canManageManifesto) && (
                  <div className="pt-3 border-t border-neutral-50 space-y-2">
                    {canManageCandidateProfile && (
                      <>
                        <Button 
                          variant="outline" 
                          className="w-full gap-2 text-xs font-bold h-9 bg-neutral-50 hover:bg-neutral-100 border-neutral-200"
                          onClick={() => setEditingCandidate(cand)}
                        >
                          <Edit className="w-3 h-3" /> Edit Profile
                        </Button>

                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-full gap-2 text-[10px] font-bold h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeletingCandidateId(cand.candidate_id)}
                          >
                            <Trash2 className="w-3 h-3" /> Delete Candidate
                          </Button>
                        )}
                      </>
                    )}
                    
                    {canManageManifesto && (
                      <div className="flex gap-2">
                        <Button 
                          variant="secondary" 
                          className="flex-1 gap-2 text-[10px] font-bold h-8"
                          onClick={() => {
                            setManifestoCandidate(cand);
                            setManifestoText(cand.manifesto || '');
                            setIsManagingManifesto(true);
                            setIsPreviewingManifesto(false);
                          }}
                        >
                          <Quote className="w-3 h-3" /> {cand.manifesto ? 'Edit Manifesto' : 'Add Manifesto'}
                        </Button>
                        {cand.manifesto && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-neutral-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => setDeletingManifestoId(cand.candidate_id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Manifesto Management Modal */}
      {isManagingManifesto && manifestoCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b bg-neutral-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Candidate Manifesto</h3>
                <p className="text-sm text-neutral-500">Managing manifesto for <span className="font-bold text-primary">{manifestoCandidate.name}</span></p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsManagingManifesto(false)}>
                <Plus className="w-5 h-5 rotate-45" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <img 
                  src={manifestoCandidate.photo_url} 
                  alt={manifestoCandidate.name} 
                  className="w-12 h-12 rounded-full object-cover object-top border-2 border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-bold text-slate-800">{manifestoCandidate.name}</p>
                  <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">{manifestoCandidate.position_title}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-bold text-slate-700">Manifesto Content</Label>
                  <span className={`text-[10px] font-bold ${manifestoText.length > 1800 ? 'text-red-500' : 'text-neutral-400'}`}>
                    {manifestoText.length} / 2000 Characters
                  </span>
                </div>
                
                {isPreviewingManifesto ? (
                  <div className="min-h-[200px] p-4 rounded-xl border bg-neutral-50 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap italic">
                    {manifestoText || "No content to preview..."}
                  </div>
                ) : (
                  <textarea 
                    className="w-full min-h-[200px] p-4 rounded-xl border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm leading-relaxed resize-none"
                    placeholder="Write the candidate's campaign manifesto here..."
                    value={manifestoText}
                    onChange={(e) => setManifestoText(e.target.value)}
                    maxLength={2000}
                  />
                )}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setIsPreviewingManifesto(!isPreviewingManifesto)}
                  >
                    <Search className="w-3.5 h-3.5" />
                    {isPreviewingManifesto ? 'Back to Edit' : 'Preview Mode'}
                  </Button>
                </div>
              </div>
            </div>

            <CardFooter className="p-6 bg-neutral-50 border-t flex justify-between gap-3">
              <div className="text-[10px] text-neutral-400 font-medium italic max-w-[200px]">
                Note: Manifesto will be visible to all students during the voting process.
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setIsManagingManifesto(false)}>Cancel</Button>
                <Button onClick={handleSaveManifesto} className="px-8 font-bold shadow-lg shadow-primary/20">
                  <Megaphone className="w-4 h-4 mr-2" /> Save & Publish
                </Button>
              </div>
            </CardFooter>
          </motion.div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <AlertDialog open={deletingCandidateId !== null} onOpenChange={(open) => !open && setDeletingCandidateId(null)}>
        <AlertDialogContent className="rounded-3xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900">Delete Candidate?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              This will permanently remove this candidate from the election. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel variant="outline" size="default" className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              variant="default"
              size="default"
              onClick={() => deletingCandidateId && handleDeleteCandidate(deletingCandidateId)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete Candidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletingManifestoId !== null} onOpenChange={(open) => !open && setDeletingManifestoId(null)}>
        <AlertDialogContent className="rounded-3xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900">Delete Manifesto?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              This will permanently remove the candidate's personal statement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel variant="outline" size="default" className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              variant="default"
              size="default"
              onClick={() => deletingManifestoId && handleDeleteManifesto(deletingManifestoId)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete Manifesto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
