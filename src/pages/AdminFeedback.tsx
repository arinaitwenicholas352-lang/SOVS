import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Filter,
  CheckCircle,
  User,
  Calendar,
  Search,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Feedback {
  feedback_id: number;
  student_id: number;
  student_name: string;
  student_number: string;
  title: string;
  content: string;
  category: string;
  status: string;
  timestamp: string;
}

export default function AdminFeedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchFeedback = async () => {
    try {
      const res = await fetch('/api/admin/feedback');
      if (res.ok) {
        setFeedbacks(await res.json());
      } else {
        toast.error("Failed to load feedback");
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch feedback", error);
      toast.error("An error occurred while fetching feedback");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/feedback/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast.success(`Feedback marked as ${status}`);
        fetchFeedback();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred while updating status");
    }
  };

  const deleteFeedback = async (id: number) => {
    toast.message("Confirm Deletion", {
      description: "Permanently remove this feedback entry?",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const res = await fetch(`/api/admin/feedback/${id}`, {
              method: 'DELETE'
            });

            if (res.ok) {
              toast.success("Feedback deleted successfully");
              fetchFeedback();
            } else {
              toast.error("Failed to delete feedback");
            }
          } catch (error) {
            toast.error("An error occurred while deleting feedback");
          }
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Reviewed</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'complaint':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'suggestion':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-neutral-500" />;
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesFilter = filter === 'all' || f.status === filter || f.category === filter;
    const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase()) || 
                         f.student_name.toLowerCase().includes(search.toLowerCase()) ||
                         f.student_number.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) return <div className="flex items-center justify-center h-[60vh]">Loading feedback...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 -ml-2 text-slate-500 hover:text-slate-900 font-bold transition-all hover:-translate-x-1 group gap-2"
          >
            <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform" /> Back to Quick Actions
          </Button>
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-3">
            <MessageCircle className="w-10 h-10 text-red-600" />
            Public Feedback & Complaints
          </h1>
          <p className="text-neutral-500 mt-2">Monitor and address student concerns and feedback.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Stats */}
        <Card className="md:col-span-1 border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{feedbacks.length}</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-1 border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{feedbacks.filter(f => f.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-1 border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{feedbacks.filter(f => f.status === 'resolved').length}</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-1 border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{feedbacks.filter(f => f.category === 'suggestion').length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input 
            placeholder="Search feedback titles, student names or numbers..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-neutral-400" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Feedback</SelectItem>
              <SelectItem value="pending">Pending Only</SelectItem>
              <SelectItem value="reviewed">Reviewed Only</SelectItem>
              <SelectItem value="resolved">Resolved Only</SelectItem>
              <SelectItem value="complaint">Complaints Only</SelectItem>
              <SelectItem value="suggestion">Suggestions Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <Card className="border-dashed border-2 py-12">
            <CardContent className="flex flex-col items-center justify-center text-neutral-500">
              <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
              <p>No feedback matching your criteria was found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredFeedbacks.map(f => (
            <Card key={f.feedback_id} className="border-none shadow-sm hover:shadow-md transition-shadow group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(f.category)}
                      <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">{f.category}</span>
                    </div>
                    <CardTitle className="text-xl font-bold group-hover:text-red-600 transition-colors">{f.title}</CardTitle>
                  </div>
                  {getStatusBadge(f.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-neutral-600 leading-relaxed">{f.content}</p>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 border-t text-xs text-neutral-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {f.student_name} ({f.student_number})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(f.timestamp).toLocaleString()}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-neutral-50/50 p-4 border-t flex justify-end gap-2">
                {f.status === 'pending' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-xs font-bold uppercase tracking-wider"
                    onClick={() => updateStatus(f.feedback_id, 'reviewed')}
                  >
                    Mark as Reviewed
                  </Button>
                )}
                {f.status !== 'resolved' && (
                  <Button 
                    variant="default" 
                    size="sm"
                    className="h-8 text-xs font-bold uppercase tracking-wider bg-green-600 hover:bg-green-700"
                    onClick={() => updateStatus(f.feedback_id, 'resolved')}
                  >
                    Mark as Resolved
                  </Button>
                )}
                {f.status === 'resolved' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-xs font-bold uppercase tracking-wider"
                    onClick={() => updateStatus(f.feedback_id, 'pending')}
                  >
                    Reopen
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteFeedback(f.feedback_id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
