import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Pencil,
  Eye,
  Plus,
  X as CloseIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';

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

interface Announcement {
  id: number;
  announcement_id: number;
  title: string;
  message: string;
  image_path: string | null;
  image_paths?: string[]; // New field for multiple images
  created_at: string;
}

interface AuthUser {
  id: number;
  name: string;
  role: string;
  type: 'student' | 'ec' | 'it';
}

export default function AdminAnnouncements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    images: [] as File[] // Changed from single image
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]); // Changed to array
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); // Changed to array

  const { user } = useAuth() as { user: AuthUser | null };
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const normalizedRole = user?.role?.toLowerCase().trim() || '';
  const isPRO =
    normalizedRole === 'pro' ||
    normalizedRole === 'public relations officer' ||
    normalizedRole === 'ec public relations officer' ||
    normalizedRole.includes('public relations');

  const canManageAnnouncements = isPRO;

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
        
        // Handle edit from query param
        const editId = searchParams.get('edit');
        if (editId) {
          const ann = data.find((a: Announcement) => a.id.toString() === editId);
          if (ann) handleEdit(ann);
          // Clear param
          setSearchParams({});
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch announcements", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (!canManageAnnouncements) {
      toast.error('Only the Public Relations Officer can manage announcements');
      navigate('/dashboard');
      return;
    }

    fetchAnnouncements();
  }, [user, canManageAnnouncements, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const validFiles = files.filter(file => {
        if (!file.type.match('image.*')) {
          toast.error(`${file.name} is not an image file`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setForm(prev => ({ ...prev, images: [...prev.images, ...validFiles] }));
        
        const newPreviews = (validFiles as File[]).map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviews]);
      }
    }
  };

  const handleRemoveImage = (idx: number) => {
    const urlToRemove = previewUrls[idx];
    
    // Check if it's an existing URL from the server
    const existingIdx = existingImageUrls.indexOf(urlToRemove);
    if (existingIdx !== -1) {
      const newExisting = [...existingImageUrls];
      newExisting.splice(existingIdx, 1);
      setExistingImageUrls(newExisting);
    } else {
      // It's a new file. We need to find its index in the form.images array.
      // Since previewUrls are built as [existingImageUrls, ...newFilePreviews], 
      // the index in form.images is idx - existingImageUrls.length
      const fileIdx = idx - existingImageUrls.length;
      if (fileIdx >= 0) {
        const newImages = [...form.images];
        // Revoke the object URL to prevent memory leaks
        URL.revokeObjectURL(urlToRemove);
        newImages.splice(fileIdx, 1);
        setForm(prev => ({ ...prev, images: newImages }));
      }
    }

    const newPreviews = [...previewUrls];
    newPreviews.splice(idx, 1);
    setPreviewUrls(newPreviews);
  };

  const handleEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      message: ann.message,
      images: []
    });
    const paths = ann.image_paths || (ann.image_path ? [ann.image_path] : []);
    setExistingImageUrls(paths);
    setPreviewUrls(paths);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: '', message: '', images: [] });
    setPreviewUrls([]);
    setExistingImageUrls([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error("Title is required");
      return;
    }
    if (!form.message && form.images.length === 0 && existingImageUrls.length === 0) {
      toast.error("Please provide either a message or at least one image");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('message', form.message);
    
    form.images.forEach(file => {
      formData.append('images', file);
    });

    existingImageUrls.forEach(url => {
      formData.append('existing_image_urls', url);
    });

    const savePromise = async () => {
      const url = editingId 
        ? `/api/admin/announcements/${editingId}` 
        : '/api/admin/announcements';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save announcement");
      }

      return res.json();
    };

    toast.promise(savePromise(), {
      loading: editingId ? 'Updating announcement...' : 'Publishing announcement...',
      success: (data) => {
        setForm({ title: '', message: '', images: [] });
        setPreviewUrls([]);
        setEditingId(null);
        setExistingImageUrls([]);
        fetchAnnouncements();
        return editingId ? "Announcement updated successfully" : "Announcement published successfully";
      },
      error: (err) => {
        setSubmitting(false);
        return err.message || "Failed to save announcement";
      },
      finally: () => {
        setSubmitting(false);
      }
    });
  };

  const handleDelete = async (id: number) => {
    setDeletingId(null); // Clear state after starting
    
    const deletePromise = async () => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error("Failed to delete announcement");
      }
      return res.json();
    };

    toast.promise(deletePromise(), {
      loading: 'Deleting announcement...',
      success: () => {
        fetchAnnouncements();
        if (editingId === id) cancelEdit();
        return "Announcement deleted successfully";
      },
      error: (err) => err.message || "Failed to delete announcement"
    });
  };

  return (
    <div className="space-y-8 pb-20 w-full mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="text-slate-500 hover:text-slate-900 font-bold transition-all hover:-translate-x-1 group gap-2"
          >
            <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" /> Back to Quick Actions
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manage Student Announcements</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Create, edit, and delete announcements that appear on the student dashboard.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Creation/Editing Form */}
        <Card className="lg:col-span-full border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className={`${editingId ? 'bg-amber-50' : 'bg-slate-50'} border-b p-8 transition-colors`}>
            <CardTitle className="flex items-center gap-3 text-slate-800">
              {editingId ? <Pencil className="w-6 h-6 text-amber-600" /> : <Megaphone className="w-6 h-6 text-primary" />}
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium mt-2">
              {editingId ? 'Update the announcement shown on the student dashboard.' : 'Publish official announcements to the student dashboard.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-bold text-slate-700">Announcement Title</Label>
                <Input 
                  id="title"
                  placeholder="e.g., Guild President Debate Tonight!"
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="py-6 border-slate-200 focus:ring-primary h-12 text-lg font-medium"
                  required
                />

              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-bold text-slate-700">Detailed Message (Optional)</Label>
                <textarea 
                  id="message"
                  className="w-full min-h-[160px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium"
                  placeholder="Provide the full details of the announcement..."
                  value={form.message}
                  onChange={(e) => setForm({...form, message: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-bold text-slate-700">Announcement Images (Optional)</Label>
                
                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className={`relative rounded-2xl overflow-hidden border-2 aspect-video group ${editingId ? 'border-amber-200' : 'border-primary/20'}`}>
                        <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain object-top bg-white" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="rounded-full h-8 w-8"
                            onClick={() => handleRemoveImage(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-primary transition-all">
                      <Plus className="w-6 h-6 text-slate-400" />
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                    </label>
                  </div>
                )}
                
                {previewUrls.length === 0 && (
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-primary transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 text-slate-400 mb-4" />
                        <p className="mb-2 text-sm font-bold text-slate-700">Click to upload image</p>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">JPG, JPEG or PNG (Max 10 images)</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-4">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className={`flex-grow py-7 rounded-xl text-lg font-black uppercase tracking-widest shadow-xl ${editingId ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'shadow-primary/20'}`}
                >
                  {submitting ? 'Saving...' : (
                    <>
                      {editingId ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                      {editingId ? 'Save Changes' : 'Publish Announcement'}
                    </>
                  )}
                </Button>
                {editingId ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="py-7 rounded-xl px-10 border-slate-200"
                    onClick={cancelEdit}
                  >
                    Cancel Edit
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="py-7 rounded-xl px-10 border-slate-200"
                    onClick={() => {
                      setForm({ title: '', message: '', images: [] });
                      setPreviewUrls([]);
                    }}
                  >
                    Clear Form
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Recently Published
        </h3>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.length === 0 ? (
            <div className="p-10 border-2 border-dashed rounded-2xl text-center col-span-full">
              <p className="text-neutral-400 text-sm italic">No recent history</p>
            </div>
          ) : (
            announcements.map((ann) => (
            <Card key={ann.id} className="border-none shadow-sm group hover:shadow-md transition-all cursor-default overflow-hidden">
              <CardContent className="p-4 flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border p-1 border-slate-200">
                  {ann.image_path ? (
                    <img src={ann.image_path} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{ann.title}</p>
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5"
                        onClick={() => handleEdit(ann)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(ann.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{ann.message || 'No description provided'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-2 tracking-widest text-neutral-400 border-neutral-200">
                       {new Date(ann.created_at).toLocaleDateString()}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold gap-1 text-primary hover:bg-primary/5 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingAnnouncement(ann);
                      }}
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div></div>

      {/* Modal for Preview */}
      <AnimatePresence>
        {viewingAnnouncement && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingAnnouncement(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ring-1 ring-black/5"
            >
              {/* Close Button Top Right */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 z-10 rounded-full h-10 w-10 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200"
                onClick={() => setViewingAnnouncement(null)}
              >
                <CloseIcon className="w-5 h-5" />
              </Button>

              <div className="flex-grow overflow-y-auto no-scrollbar scroll-smooth">
                {(viewingAnnouncement.image_paths?.length || 0) > 0 && (
                  <div className="w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                    <div className="w-full flex gap-4 overflow-x-auto p-6 snap-x hide-scrollbar">
                      {viewingAnnouncement.image_paths?.map((img, i) => (
                         <div key={i} className="flex-shrink-0 snap-center first:pl-2 last:pr-2">
                            <img 
                              src={img} 
                              alt="" 
                              className="h-[45vh] max-w-[80vw] object-contain rounded-2xl shadow-xl border-4 border-white bg-white"
                              referrerPolicy="no-referrer"
                            />
                         </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-8 md:p-12 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                        Official Story
                      </Badge>
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(viewingAnnouncement.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <h2 className="text-4xl font-black text-neutral-900 leading-tight tracking-tight">
                      {viewingAnnouncement.title}
                    </h2>
                  </div>

                  <div className="bg-neutral-50 rounded-2xl p-6 md:p-8 border border-neutral-100">
                    <p className="text-neutral-700 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                      {viewingAnnouncement.message || "No detailed description provided."}
                    </p>
                  </div>

                  <Button 
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 font-black text-sm uppercase tracking-[0.2em] py-8 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
                    onClick={() => setViewingAnnouncement(null)}
                  >
                    Dismiss Preview
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="rounded-3xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              This will permanently delete the announcement. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel variant="outline" size="default" className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              variant="default"
              size="default"
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete Announcement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
