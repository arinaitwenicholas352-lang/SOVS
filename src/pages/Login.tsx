import { useState, FormEvent } from 'react';
import { useAuth } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const BallotBox = ({ className }: { className?: string }) => (
  <div className={className}>
    <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Box */}
      <path d="M40 80 L100 60 L160 80 L100 100 Z" fill="#cbd5e1" />
      <path d="M40 80 L40 140 L100 160 L100 100 Z" fill="#94a3b8" />
      <path d="M160 80 L160 140 L100 160 L100 100 Z" fill="#64748b" />
      
      {/* Slit */}
      <rect x="85" y="75" width="30" height="4" rx="1" fill="#1e293b" transform="rotate(-18 85 75)" />
      
      {/* Ballot */}
      <motion.g
        initial={{ y: 5 }}
        animate={{ y: 0 }}
        transition={{ repeat: Infinity, duration: 2, repeatType: "reverse", ease: "easeInOut" }}
      >
        <path d="M90 65 L120 45 L105 25 L75 45 Z" fill="#facc15" />
        <path d="M90 40 L95 45 L105 35" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
      
      {/* Shadow */}
      <ellipse cx="100" cy="170" rx="60" ry="10" fill="black" fillOpacity="0.05" />
    </svg>
  </div>
);

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), // Unified login
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        toast.success('Logged in successfully');
      } else {
        setError(data.error || 'Invalid email or password');
        toast.error(data.error || 'Login failed');
      }
    } catch (err) {
      setError('A connection error occurred');
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-[#f8fafc] lg:bg-[#0a2e6b] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-24">
        
        {/* Left Side (Desktop Only) */}
        <div className="hidden lg:flex flex-col items-start text-white space-y-4 max-w-md">
          <h1 className="text-8xl font-black tracking-tighter text-[#60a5fa]">SOVS</h1>
          <p className="text-3xl font-medium text-slate-200">Secure Online Voting System</p>
          <BallotBox className="scale-[2.5] mt-32 transform origin-left" />
        </div>

        {/* Login Form Card */}
        <Card className="w-full max-w-[480px] border-none shadow-2xl rounded-[32px] overflow-hidden bg-white">
          <CardContent className="p-8 lg:p-12 space-y-8">
            
            {/* Mobile Header */}
            <div className="flex flex-col items-center text-center space-y-2 lg:hidden">
              <BallotBox className="mb-4" />
              <h2 className="text-4xl font-bold text-[#1e3a8a] tracking-tight">SOVS</h2>
              <p className="text-slate-500 font-medium tracking-wide">Secure Online Voting System</p>
            </div>

            <div className="hidden lg:block">
              <h2 className="text-4xl font-bold text-[#1e3a8a] text-center mb-12">Login</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-full text-center text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[#1e3a8a] font-bold text-lg hidden lg:block">Email or Student Number</p>
                  <Input 
                    type="text" 
                    placeholder="Email or Student Number" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 px-6 font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1e3a8a]/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[#1e3a8a] font-bold text-lg hidden lg:block">Password</p>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 px-6 font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1e3a8a]/20 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e40af] text-xl font-bold shadow-lg shadow-blue-900/10"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            {/* Remove helper sentences as requested */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
