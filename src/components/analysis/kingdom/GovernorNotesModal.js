"use client";

import { useState, useEffect } from "react";
import { X, ShieldAlert, Plus, MessageSquare, Tag, Trash2, Clock } from "lucide-react";
import { useSession } from "next-auth/react";

export default function GovernorNotesModal({ isOpen, onClose, govId, govName }) {
    const { data: session } = useSession();
    const [notesData, setNotesData] = useState({ tags: [], notes: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [newTag, setNewTag] = useState("");
    const [newNote, setNewNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isR4 = session?.user?.isLeader || session?.user?.isSuperAdmin;

    useEffect(() => {
        if (!isOpen || !govId || !isR4) return;
        
        const fetchNotes = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/aws/notes?govId=${govId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setNotesData(data.data);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch notes:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotes();
    }, [isOpen, govId, isR4]);

    if (!isOpen || !isR4) return null;

    const handleAddNote = async (e) => {
        e.preventDefault();
        if ((!newTag.trim() && !newNote.trim()) || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/aws/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    govId,
                    tag: newTag.trim() || undefined,
                    noteText: newNote.trim() || undefined
                })
            });

            if (res.ok) {
                // Refresh
                const fetchRes = await fetch(`/api/aws/notes?govId=${govId}`);
                const data = await fetchRes.json();
                if (data.success) setNotesData(data.data);
                
                setNewTag("");
                setNewNote("");
            }
        } catch (e) {
            console.error("Failed to append note:", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-[#13161c] border-b border-[#1e222b] p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                            <ShieldAlert className="text-rose-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-widest">{govName || 'Governor'}</h2>
                            <p className="text-gray-500 text-xs font-mono">ID: {govId} • R4 Intelligence</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {isLoading ? (
                        <div className="py-12 flex justify-center text-rose-500/50">
                            <div className="animate-pulse flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                                <ShieldAlert size={16} /> Decrypting Dossier...
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Tags Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Tag size={14} /> Threat / Value Tags
                                </h3>
                                {notesData.tags.length === 0 ? (
                                    <p className="text-sm text-gray-600 italic">No tags assigned.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {notesData.tags.map((tag, idx) => (
                                            <span key={idx} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded text-xs font-bold uppercase tracking-widest">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Notes Log */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare size={14} /> Intelligence Log
                                </h3>
                                {notesData.notes.length === 0 ? (
                                    <div className="border border-dashed border-[#1e222b] rounded-xl p-6 text-center">
                                        <p className="text-sm text-gray-600">No intelligence reports filed yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {notesData.notes.sort((a, b) => b.timestamp - a.timestamp).map((note) => (
                                            <div key={note.id} className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4">
                                                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{note.text}</p>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e222b] text-[10px] text-gray-600 font-mono">
                                                    <span className="flex items-center gap-1.5"><ShieldAlert size={12}/> {note.authorName}</span>
                                                    <span className="flex items-center gap-1.5"><Clock size={12}/> {new Date(note.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Form */}
                <div className="bg-[#13161c] border-t border-[#1e222b] p-5">
                    <form onSubmit={handleAddNote} className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-3">
                                <input
                                    type="text"
                                    placeholder="Add new tag (e.g. Farm Killer)"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-rose-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                                />
                                <textarea
                                    placeholder="Type intelligence report..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    rows={2}
                                    className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-rose-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || (!newTag.trim() && !newNote.trim())}
                                className="bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-4 font-bold tracking-widest text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)] disabled:shadow-none flex flex-col items-center justify-center gap-1"
                            >
                                <Plus size={18} />
                                Add
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}
