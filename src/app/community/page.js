"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Users, Send, Crown, Sword, Shield, Globe2, MessageSquare, RefreshCw, Megaphone } from "lucide-react";

const POST_TYPES = [
  { id: "Recruitment", label: "Recruiting", icon: <Megaphone size={12} /> },
  { id: "Alliance", label: "Alliance", icon: <Shield size={12} /> },
  { id: "KvK", label: "KvK Intel", icon: <Sword size={12} /> },
  { id: "Message", label: "General", icon: <MessageSquare size={12} /> },
];

const TYPE_COLORS = {
  Recruitment: { border: "border-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  Alliance: { border: "border-blue-500/30", text: "text-blue-400", bg: "bg-blue-500/10" },
  KvK: { border: "border-red-500/30", text: "text-red-400", bg: "bg-red-500/10" },
  Message: { border: "border-gray-500/30", text: "text-gray-400", bg: "bg-gray-500/10" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CommunityHub() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedType, setSelectedType] = useState("Message");
  const bottomRef = useRef(null);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/community/posts");
      const data = await res.json();
      if (res.ok && data.posts) {
        setPosts(data.posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePost = async () => {
    if (!message.trim() || !session) return;
    setIsPosting(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          name: session.user?.name || "Anonymous",
          message: message.trim(),
        }),
      });
      if (res.ok) {
        setMessage("");
        await fetchPosts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPosting(false);
    }
  };

  const colors = TYPE_COLORS[selectedType] || TYPE_COLORS.Message;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">

      {/* Header */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
              <Users className="text-sky-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-widest uppercase">Community Hub</h1>
              <p className="text-sky-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Kingdom-Wide Bulletin Board</p>
            </div>
          </div>
          <button
            onClick={fetchPosts}
            disabled={isLoading}
            className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-white border border-[#1e222b] rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin text-sky-400" : ""} />
          </button>
        </div>
      </div>

      {/* Compose Panel — only visible when logged in */}
      {session ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
          <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center gap-2">
            <MessageSquare size={15} className="text-sky-400" />
            <h2 className="text-white font-bold uppercase tracking-widest text-sm">Post a Message</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Type Selector */}
            <div className="flex gap-2 flex-wrap">
              {POST_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors
                    ${selectedType === t.id
                      ? `${TYPE_COLORS[t.id].bg} ${TYPE_COLORS[t.id].text} ${TYPE_COLORS[t.id].border}`
                      : "bg-[#13161c] border-[#1e222b] text-gray-500 hover:text-gray-300"}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); }}}
              placeholder={`Post a ${selectedType} message to the kingdom...`}
              rows={3}
              maxLength={500}
              className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white placeholder:text-gray-600 p-3 rounded-lg outline-none focus:border-sky-500/50 transition-colors text-sm resize-none font-mono"
            />

            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-xs font-mono">{message.length}/500</span>
              <button
                onClick={handlePost}
                disabled={isPosting || !message.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-[#1e222b] disabled:text-gray-600 text-white font-bold uppercase tracking-widest text-xs rounded-lg transition-colors shadow-lg"
              >
                {isPosting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                {isPosting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 flex items-center gap-4">
          <Globe2 size={24} className="text-sky-400 shrink-0" />
          <p className="text-gray-400 text-sm">
            <span className="text-white font-bold">Sign in with Discord</span> to post messages and interact with the kingdom community.
          </p>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-sky-400 w-8 h-8" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-600">
            <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-bold uppercase tracking-widest">No Posts Yet</p>
            <p className="text-xs mt-1">Be the first to post in the Community Hub.</p>
          </div>
        ) : (
          posts.map((post, idx) => {
            const c = TYPE_COLORS[post.type] || TYPE_COLORS.Message;
            return (
              <div key={idx} className={`bg-[#0f1115] border ${c.border} rounded-xl p-5 shadow-lg hover:bg-[#0d1018] transition-colors`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`${c.bg} ${c.text} ${c.border} border text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1`}>
                      {post.type}
                    </span>
                    <span className="text-white font-bold text-sm">{post.name}</span>
                  </div>
                  <span className="text-gray-600 text-[10px] font-mono shrink-0">{timeAgo(post.timestamp)}</span>
                </div>
                <p className="text-gray-300 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{post.message}</p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
