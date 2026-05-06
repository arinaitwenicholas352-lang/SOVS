import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, GraduationCap, Building2, MapPin, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-neutral-900">Your Profile</h1>
            <p className="text-neutral-500 font-medium">Manage your personal information and voting eligibility</p>
          </div>
        </div>
        <Badge variant={user.is_eligible !== false ? "success" : "destructive"} className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
          {user.is_eligible !== false ? "Eligible Voter" : "Not Eligible"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-neutral-200 p-6 text-center space-y-4 shadow-sm"
          >
            <div className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center mx-auto border-4 border-white shadow-inner">
              <User className="w-10 h-10 text-neutral-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{user.full_name || user.name}</h2>
            </div>
            <div className="pt-4 border-t border-neutral-100 flex flex-col gap-2">
               <div className="flex items-center gap-3 text-neutral-600">
                 <Mail className="w-4 h-4 opacity-50" />
                 <span className="text-sm truncate">{(user as any).email || 'No email provided'}</span>
               </div>
               {user.type === 'student' && (
                 <>
                   <div className="flex items-center gap-3 text-neutral-600">
                     <GraduationCap className="w-4 h-4 opacity-50" />
                     <span className="text-sm">{user.student_number}</span>
                   </div>
                   <div className="flex items-center gap-3 text-neutral-600">
                     <Building2 className="w-4 h-4 opacity-50" />
                     <span className="text-sm">{user.faculty}</span>
                   </div>
                 </>
               )}
            </div>
          </motion.div>
        </div>

        {/* Detailed Info */}
        <div className="md:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm"
          >
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                My info
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Full Legal Name</p>
                <p className="text-sm font-semibold text-neutral-900">{user.full_name || 'N/A'}</p>
              </div>
              {user.type === 'student' && (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Academic Program</p>
                    <p className="text-sm font-semibold text-neutral-900">{user.program || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Campus Residence</p>
                    <p className="text-sm font-semibold text-neutral-900 flex items-center gap-1">
                      <MapPin className="w-3 h-3 opacity-50" />
                      {user.residence || 'Off-campus'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
