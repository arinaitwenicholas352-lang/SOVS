import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Announcement {
  id: number;
  announcement_id: number;
  title: string;
  message: string;
  image_path: string | null;
  image_paths?: string[];
  created_at: string;
  is_read: number;
}

export default function AnnouncementStories() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/student/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/student/announcements/${id}/read`, { method: 'POST' });
      setAnnouncements((prev) =>
        prev.map((announcement) =>
          announcement.announcement_id === id || announcement.id === id
            ? { ...announcement, is_read: 1 }
            : announcement
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleOpen = (idx: number) => {
    setSelectedIdx(idx);
    const announcement = announcements[idx];
    if (announcement && !announcement.is_read) {
      markAsRead(announcement.announcement_id || announcement.id);
    }
  };

  const handleNext = () => {
    if (selectedIdx !== null && selectedIdx < announcements.length - 1) {
      handleOpen(selectedIdx + 1);
    }
  };

  const handlePrev = () => {
    if (selectedIdx !== null && selectedIdx > 0) {
      handleOpen(selectedIdx - 1);
    }
  };

  if (loading) return null;
  if (announcements.length === 0) return null;

  const selectedAnnouncement = selectedIdx !== null ? announcements[selectedIdx] : null;
  const selectedImages = selectedAnnouncement
    ? selectedAnnouncement.image_paths?.length
      ? selectedAnnouncement.image_paths
      : selectedAnnouncement.image_path
        ? [selectedAnnouncement.image_path]
        : []
    : [];

  return (
    <div className="w-full bg-white border-b py-6 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Megaphone className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
            Announcements and Updates
          </h2>
        </div>

        <div
          ref={scrollRef}
          className="flex items-stretch gap-5 overflow-x-auto no-scrollbar pb-4 mask-linear-right"
        >
          {announcements.map((ann, idx) => {
            const previewImage = ann.image_paths?.[0] || ann.image_path;

            return (
              <motion.button
                key={ann.announcement_id || ann.id}
                whileHover={{ y: -6, boxShadow: '0 12px 30px -10px rgba(0,0,0,0.15)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleOpen(idx)}
                className="relative flex min-w-[280px] w-[280px] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white text-left shadow-sm transition-all group"
              >
                <div className="h-56 w-full border-b border-neutral-100 bg-white p-2 flex items-center justify-center transition-colors group-hover:bg-neutral-50">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={ann.title}
                      className="h-full w-full object-contain object-top rounded-2xl bg-white select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary/5 to-slate-200/20 flex items-center justify-center">
                      <Megaphone className="w-10 h-10 text-primary/20" />
                    </div>
                  )}
                </div>

                {!ann.is_read && (
                  <span className="absolute top-3 right-3 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </span>
                )}

                <div className="p-4 space-y-3 flex flex-col flex-grow">
                  <div className="space-y-1 flex-grow">
                    <h3
                      className={`text-sm font-bold line-clamp-2 leading-tight transition-colors ${
                        ann.is_read ? 'text-neutral-500 font-semibold' : 'text-slate-900'
                      }`}
                    >
                      {ann.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      {new Date(ann.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {!ann.is_read ? (
                      <Badge className="bg-primary hover:bg-primary text-[8px] font-black uppercase py-0 px-2 tracking-widest h-5">
                        Unread
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1 text-[8px] font-black uppercase text-neutral-300 tracking-widest h-5">
                        <Eye className="w-3 h-3" /> Seen
                      </div>
                    )}
                    <ChevronRight className="w-3 h-3 text-neutral-300 group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedAnnouncement && selectedIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIdx(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="relative w-full max-w-6xl bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[94vh] ring-1 ring-black/5"
            >
              <button
                onClick={() => setSelectedIdx(null)}
                className="absolute top-4 right-4 z-50 p-2.5 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-all text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200 hover:scale-110 active:scale-95"
              >
                <X className="w-5 h-5 focus:outline-none" />
              </button>

              <div className="flex-grow overflow-y-auto no-scrollbar scroll-smooth">
                {selectedImages.length > 0 && (
                  <div className="w-full bg-slate-100 border-b border-slate-200">
                    <div className="w-full flex gap-6 overflow-x-auto p-4 sm:p-6 snap-x snap-mandatory hide-scrollbar">
                      {selectedImages.map((img, i) => (
                        <div
                          key={`${img}-${i}`}
                          className="min-w-full snap-center flex items-center justify-center bg-white rounded-3xl border shadow-sm p-3"
                        >
                          <img
                            src={img}
                            alt={`${selectedAnnouncement.title} image ${i + 1}`}
                            className="max-h-[70vh] w-full object-contain object-top rounded-2xl bg-white"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-6 md:p-10 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString([], {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-neutral-900 leading-tight tracking-tight">
                      {selectedAnnouncement.title}
                    </h2>
                  </div>

                  <div className="bg-neutral-50 rounded-2xl p-5 md:p-8 border border-neutral-100">
                    <p className="text-neutral-700 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedAnnouncement.message || 'No detailed description provided.'}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-4">
                    <Button
                      className="flex-grow bg-slate-900 text-white hover:bg-slate-800 font-black text-sm uppercase tracking-[0.2em] py-8 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
                      onClick={() => setSelectedIdx(null)}
                    >
                      Close Announcement
                    </Button>

                    {announcements.length > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={selectedIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrev();
                          }}
                          className="h-16 w-16 rounded-2xl border-neutral-100 text-neutral-400 hover:text-primary hover:bg-primary/5 disabled:opacity-30 shadow-sm"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={selectedIdx === announcements.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                          }}
                          className="h-16 w-16 rounded-2xl border-neutral-100 text-neutral-400 hover:text-primary hover:bg-primary/5 disabled:opacity-30 shadow-sm"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
