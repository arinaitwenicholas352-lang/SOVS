import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Send, 
  Mail, 
  PieChart, 
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCommunications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      toast.error("Please provide both a subject and a message body.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/admin/send-blast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: emailBody })
      });

      if (res.ok) {
        toast.success("Email blast initiated successfully.");
        setEmailSubject('');
        setEmailBody('');
      } else {
        toast.error("Failed to send email blast.");
      }
    } catch (error) {
      toast.error("A network error occurred.");
    } finally {
      setIsSending(false);
    }
  };

  const handleShareResults = async () => {
    toast.message("Confirm Result Distribution", {
      description: "This will send the latest election results to all students. Proceed?",
      action: {
        label: "Send Results",
        onClick: async () => {
          const loadingToast = toast.loading("Distributing results...");
          try {
            const res = await fetch('/api/admin/share-results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
              toast.success("Results shared via email successfully", { id: loadingToast });
            } else {
              toast.error("Failed to distribute results", { id: loadingToast });
            }
          } catch (error) {
            toast.error("Communication error", { id: loadingToast });
          }
        }
      }
    });
  };

  const handleShareAnnouncements = async () => {
    toast.message("Confirm Announcement Share", {
      description: "Send a digest of recent announcements to all students?",
      action: {
        label: "Share Now",
        onClick: async () => {
          const loadingToast = toast.loading("Sending announcements...");
          try {
            const res = await fetch('/api/admin/share-announcements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
              toast.success("Announcements distributed via email", { id: loadingToast });
            } else {
              toast.error("Failed to distribute announcements", { id: loadingToast });
            }
          } catch (error) {
            toast.error("An error occurred", { id: loadingToast });
          }
        }
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-2 -ml-2 text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Quick Actions
          </Button>
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-3">
            <Send className="w-10 h-10 text-primary" />
            Communication Management
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" /> Standard Updates
              </CardTitle>
              <CardDescription>Automated distribution tools for official news.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14 border-primary/20 hover:bg-primary/10 transition-colors"
                onClick={handleShareResults}
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <PieChart className="w-4 h-4 text-primary" />
                </div>
                Share Election Results
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14 border-primary/20 hover:bg-primary/10 transition-colors"
                onClick={handleShareAnnouncements}
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                Share Announcements
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Compose Email */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm overflow-hidden h-full">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="font-bold">Compose Blast Email</span>
              </div>
              <Badge variant="outline" className="text-blue-400 border-blue-400">STUDENT_OUTBOUND</Badge>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Email Subject</label>
                <Input 
                  placeholder="e.g. EC Update: Official Election Results Released" 
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="h-12 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Message Body</label>
                <Textarea 
                  placeholder="Type your official message here..." 
                  className="min-h-[300px] resize-none focus-visible:ring-primary"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>
              <div className="pt-4 border-t flex items-center justify-between">
                <p className="text-xs text-neutral-400 italic">Formatting is applied automatically based on EC templates.</p>
                <Button 
                  size="lg" 
                  className="gap-2 px-10 h-14 font-black rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
                  onClick={handleSendEmail}
                  disabled={isSending}
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isSending ? "Initiating Blast..." : "Send Email Blast"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
