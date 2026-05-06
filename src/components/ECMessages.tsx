import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Send, Inbox, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  message_id: number;
  sender_id: number;
  receiver_id: number;
  sender_name?: string;
  receiver_name?: string;
  content: string;
  timestamp: string;
}

interface ECMember {
  ec_id: number;
  full_name: string;
  role: string;
}

export default function ECMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{ inbox: Message[], outbox: Message[] }>({ inbox: [], outbox: [] });
  const [ecMembers, setEcMembers] = useState<ECMember[]>([]);
  const [messageForm, setMessageForm] = useState({ receiver_id: '', content: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [ecRes, messagesRes] = await Promise.all([
        fetch('/api/admin/ec-members'),
        fetch('/api/admin/messages')
      ]);

      if (ecRes.ok) setEcMembers(await ecRes.json());
      if (messagesRes.ok) setMessages(await messagesRes.json());
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch EC messages", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendMessage = async () => {
    if (!messageForm.receiver_id || !messageForm.content) {
      toast.error("Please select a recipient and enter a message");
      return;
    }

    const res = await fetch('/api/admin/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageForm)
    });

    if (res.ok) {
      toast.success("Message sent successfully");
      setMessageForm({ receiver_id: '', content: '' });
      fetchData();
    } else {
      toast.error("Failed to send message");
    }
  };

  if (loading) return <div className="text-center py-10 text-neutral-500">Loading communications...</div>;

  return (
    <div className="grid gap-8 lg:grid-cols-3 animate-in fade-in duration-500">
      {/* Compose Message */}
      <Card className="lg:col-span-1 border-none shadow-md h-fit sticky top-24 rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Send className="w-5 h-5 text-indigo-600" /> New Message
          </CardTitle>
          <CardDescription>Direct line to your EC board colleagues.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Recipient</Label>
            <Select onValueChange={(v) => setMessageForm({...messageForm, receiver_id: v})} value={messageForm.receiver_id}>
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder="Identify Colleague" />
              </SelectTrigger>
              <SelectContent>
                {ecMembers.filter(m => m.ec_id !== user?.id).map(m => (
                  <SelectItem key={m.ec_id} value={m.ec_id.toString()}>
                    {m.full_name} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Message Content</Label>
            <textarea 
              className="w-full min-h-[150px] rounded-2xl border border-input bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all border-slate-200"
              placeholder="Secure internal communication..."
              value={messageForm.content}
              onChange={(e) => setMessageForm({...messageForm, content: e.target.value})}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-4">
          <Button onClick={handleSendMessage} className="w-full h-12 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all">
            <Send className="w-4 h-4" /> Dispatch
          </Button>
        </CardFooter>
      </Card>

      {/* Inbox/Outbox */}
      <div className="lg:col-span-2 space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-3">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Inbox className="w-6 h-6 text-indigo-600" /> Inbox
            </h3>
            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-3 py-1 rounded-full font-bold">
              {messages.inbox.length}
            </Badge>
          </div>
          <div className="space-y-4">
            {messages.inbox.length === 0 ? (
              <div className="bg-slate-50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">Your internal inbox is currently empty.</p>
              </div>
            ) : (
              messages.inbox.map(msg => (
                <Card key={msg.message_id} className="border-none shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden group">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-100">
                          {msg.sender_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-800">{msg.sender_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{new Date(msg.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-500 rounded-full font-bold">SECURE CHANNEL</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{msg.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-3">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-slate-400" /> Outbox
            </h3>
          </div>
          <div className="space-y-4">
            {messages.outbox.length === 0 ? (
              <div className="bg-slate-50 rounded-3xl p-10 text-center border border-slate-200 opacity-60">
                <p className="text-slate-400 text-sm">No dispatched communications recorded.</p>
              </div>
            ) : (
              messages.outbox.map(msg => (
                <Card key={msg.message_id} className="border-none shadow-sm bg-slate-50/50 rounded-2xl group">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center font-black text-sm">
                          To
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-700">{msg.receiver_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{new Date(msg.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-white border-slate-200 text-slate-500 rounded-full font-bold">SENT</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <p className="text-sm text-slate-500 leading-relaxed italic">{msg.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
