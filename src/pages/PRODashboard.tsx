import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Send, 
  Inbox, 
  MessageSquare, 
  Megaphone, 
  Vote, 
  Users, 
  BarChart, 
  MessageCircle, 
  Newspaper
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';

interface Announcement {
  id: number;
  announcement_id: number;
  title: string;
  message: string;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
}

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

export default function PRODashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

      if (ecRes.ok) {
        const contentType = ecRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          setEcMembers(await ecRes.json());
        } else {
          const text = await ecRes.text();
          console.error("EC Members API returned non-JSON response:", text.substring(0, 100));
          throw new Error("EC Members API returned invalid content type: " + contentType);
        }
      } else {
        console.error("EC Members API failed with status:", ecRes.status);
      }

      if (messagesRes.ok) {
        const contentType = messagesRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          setMessages(await messagesRes.json());
        } else {
          const text = await messagesRes.text();
          console.error("Messages API returned non-JSON response:", text.substring(0, 100));
          throw new Error("Messages API returned invalid content type: " + contentType);
        }
      } else {
        console.error("Messages API failed with status:", messagesRes.status);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch PRO data", error);
      toast.error("Failed to load dashboard data. Please try refreshing.");
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

  const dashboardItems = [
    {
      title: "Manage Announcements",
      icon: <Megaphone className="w-8 h-8" />,
      color: "bg-blue-600 hover:bg-blue-700",
      link: "/admin/announcements"
    },
    {
      title: "View Elections",
      icon: <Vote className="w-8 h-8" />,
      color: "bg-green-600 hover:bg-green-700",
      link: "/admin/elections"
    },
    {
      title: "View Candidates",
      icon: <Users className="w-8 h-8" />,
      color: "bg-teal-600 hover:bg-teal-700",
      link: "/admin/candidates"
    },
    {
      title: "View Results",
      icon: <BarChart className="w-8 h-8" />,
      color: "bg-yellow-500 hover:bg-yellow-600",
      link: "/election/1/results"
    },
    {
      title: "Manage Feedback",
      icon: <MessageCircle className="w-8 h-8" />,
      color: "bg-red-600 hover:bg-red-700",
      link: "/admin/feedback"
    },
    {
      title: "News & Updates",
      icon: <Newspaper className="w-8 h-8" />,
      color: "bg-slate-600 hover:bg-slate-700",
      link: "/admin/news"
    }
  ];

  if (loading) return <div className="flex items-center justify-center h-[60vh]">Loading dashboard...</div>;

  return (
    <div className="space-y-10 pb-20">
      <Tabs defaultValue="actions" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dashboardItems.map((item: any, idx) => (
              <Card key={idx} className="border-none shadow-md hover:shadow-lg transition-all duration-300 bg-white rounded-2xl group overflow-hidden">
                <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
                  <div className={`p-4 rounded-2xl ${item.color.split(' ')[0]} text-white group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-800">{item.title}</h2>
                  <Link to={item.link} className="w-full">
                    <Button className={`w-full py-6 text-lg font-medium rounded-xl ${item.color} text-white transition-all shadow-none`}>
                      Manage
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Compose Message */}
            <Card className="lg:col-span-1 border-none shadow-md h-fit sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Send Message
                </CardTitle>
                <CardDescription>Communicate with other EC members.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipient</Label>
                  <Select onValueChange={(v) => setMessageForm({...messageForm, receiver_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select EC Member" />
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
                  <Label>Message</Label>
                  <textarea 
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Type your message here..."
                    value={messageForm.content}
                    onChange={(e) => setMessageForm({...messageForm, content: e.target.value})}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSendMessage} className="w-full gap-2">
                  <Send className="w-4 h-4" /> Send Message
                </Button>
              </CardFooter>
            </Card>

            {/* Inbox/Outbox */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-primary" /> Inbox
                </h3>
              </div>
              <div className="space-y-4">
                {messages.inbox.length === 0 ? (
                  <p className="text-neutral-500 italic text-center py-8">No messages in your inbox.</p>
                ) : (
                  messages.inbox.map(msg => (
                    <Card key={msg.message_id} className="border-none shadow-sm bg-white">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {msg.sender_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{msg.sender_name}</p>
                              <p className="text-[10px] text-neutral-400">{new Date(msg.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">Received</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-neutral-700 leading-relaxed">{msg.content}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="flex items-center gap-4 border-b pb-2 mt-10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" /> Outbox
                </h3>
              </div>
              <div className="space-y-4">
                {messages.outbox.length === 0 ? (
                  <p className="text-neutral-500 italic text-center py-8">No sent messages.</p>
                ) : (
                  messages.outbox.map(msg => (
                    <Card key={msg.message_id} className="border-none shadow-sm bg-neutral-50/50">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold text-xs">
                              To
                            </div>
                            <div>
                              <p className="text-sm font-bold">{msg.receiver_name}</p>
                              <p className="text-[10px] text-neutral-400">{new Date(msg.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">Sent</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-neutral-600 leading-relaxed">{msg.content}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
