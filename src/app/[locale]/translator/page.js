'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const TARGET_LANGUAGES = [
  'English', 'Russian', 'Arabic', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Turkish', 'German', 'French', 'Spanish', 'Portuguese', 'Korean', 'Japanese',
  'Italian', 'Dutch', 'Polish', 'Thai', 'Vietnamese', 'Indonesian', 'Hindi', 'Greek',
];

const LANG_FLAGS = {
  arabic: '🇸🇦', russian: '🇷🇺', chinese: '🇨🇳', 'chinese simplified': '🇨🇳',
  'chinese traditional': '🇹🇼', turkish: '🇹🇷', german: '🇩🇪', french: '🇫🇷',
  spanish: '🇪🇸', portuguese: '🇧🇷', korean: '🇰🇷', japanese: '🇯🇵',
  english: '🇬🇧', italian: '🇮🇹', dutch: '🇳🇱', polish: '🇵🇱',
  thai: '🇹🇭', vietnamese: '🇻🇳', indonesian: '🇮🇩', malay: '🇲🇾',
  persian: '🇮🇷', farsi: '🇮🇷', hindi: '🇮🇳', greek: '🇬🇷',
};

function getFlag(lang) {
  const k = (lang || '').toLowerCase();
  for (const [l, f] of Object.entries(LANG_FLAGS)) { if (k.includes(l)) return f; }
  return '🌐';
}

function MessageCard({ msg, targetLanguage }) {
  const [expanded, setExpanded] = useState(false);
  const isTarget = msg.language?.toLowerCase().includes(targetLanguage.toLowerCase().split(' ')[0]);
  return (
    <div
      onClick={() => !isTarget && setExpanded(x => !x)}
      style={{
        background: '#0f1115', borderRadius: '8px', padding: '10px 12px',
        border: `1px solid ${isTarget ? '#1e222b' : '#1a3329'}`,
        borderLeft: `3px solid ${isTarget ? '#374151' : '#10b981'}`,
        cursor: isTarget ? 'default' : 'pointer', marginBottom: '8px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{getFlag(msg.language)}</span>
          {msg.player && <span style={{ fontSize: '10px', fontWeight: 900, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{msg.player}</span>}
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: isTarget ? '#1e222b' : '#0596691a', color: isTarget ? '#4b5563' : '#10b981', border: `1px solid ${isTarget ? '#1e222b' : '#10b98133'}` }}>{msg.language || '?'}</span>
          <span style={{ fontSize: '9px', color: '#374151', fontWeight: 700 }}>{msg.ts}</span>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: isTarget ? '#9ca3af' : '#e5e7eb', margin: 0, lineHeight: 1.5, fontWeight: isTarget ? 400 : 600 }}>{msg.translation}</p>
      {!isTarget && expanded && <p style={{ fontSize: '11px', color: '#4b5563', margin: '6px 0 0', fontStyle: 'italic', borderTop: '1px solid #1e222b', paddingTop: '6px' }}>Original: {msg.original}</p>}
      {!isTarget && !expanded && <p style={{ fontSize: '9px', color: '#374151', margin: '4px 0 0', fontWeight: 700 }}>tap to see original</p>}
    </div>
  );
}

export default function TranslatorPage() {
  const [isWatching, setIsWatching] = useState(false);
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [captureInterval, setCaptureInterval] = useState(3);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [lastCapture, setLastCapture] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [supported, setSupported] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const seenRef = useRef(new Set());
  const geminiKeyRef = useRef('');
  const intervalRef = useRef(captureInterval);
  const targetLangRef = useRef(targetLanguage);

  useEffect(() => { intervalRef.current = captureInterval; }, [captureInterval]);
  useEffect(() => { targetLangRef.current = targetLanguage; }, [targetLanguage]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) setSupported(false);
    try { const p = JSON.parse(localStorage.getItem('unty_prefs') || '{}'); geminiKeyRef.current = p.geminiKey || ''; } catch (e) {}
    document.title = '🌐 Unity Translator';
  }, []);

  const captureAndTranslate = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];

    try {
      const res = await fetch('/api/tools/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(geminiKeyRef.current ? { 'x-gemini-key': geminiKeyRef.current } : {}) },
        body: JSON.stringify({ base64, mimeType: 'image/jpeg', targetLanguage: targetLangRef.current })
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Translation error'); return; }
      setErrorMsg('');
      setLastCapture(new Date().toLocaleTimeString());

      const toAdd = [];
      for (const msg of (data.messages || [])) {
        const key = `${msg.player}::${msg.original}`;
        if (!seenRef.current.has(key)) {
          seenRef.current.add(key);
          toAdd.push({ ...msg, id: `${Date.now()}-${Math.random()}`, ts: new Date().toLocaleTimeString() });
        }
      }
      if (toAdd.length > 0) setMessages(prev => [...toAdd.reverse(), ...prev].slice(0, 150));
      if (seenRef.current.size > 500) seenRef.current.clear();
    } catch (e) { setErrorMsg('Network error during capture'); }
  }, []);

  const startTimer = useCallback((intervalSec) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(captureAndTranslate, intervalSec * 1000);
  }, [captureAndTranslate]);

  const stopWatching = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsWatching(false);
    setStatus('idle');
  }, []);

  const startWatching = async () => {
    try {
      setStatus('requesting');
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      stream.getVideoTracks()[0].addEventListener('ended', stopWatching);
      setIsWatching(true);
      setStatus('watching');
      startTimer(captureInterval);
      setTimeout(captureAndTranslate, 800);
    } catch (e) {
      setStatus('idle');
      if (e.name !== 'NotAllowedError') setErrorMsg(e.message);
    }
  };

  useEffect(() => {
    if (isWatching) startTimer(captureInterval);
  }, [captureInterval, isWatching, startTimer]);

  useEffect(() => () => stopWatching(), [stopWatching]);

  const S = {
    root: { fontFamily: "'Inter', system-ui, sans-serif", background: '#0a0c0f', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { background: '#0f1115', borderBottom: '1px solid #1e222b', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
    controls: { background: '#0f1115', borderBottom: '1px solid #1e222b', padding: '8px 14px', display: 'flex', gap: '8px', flexShrink: 0 },
    statusBar: { padding: '5px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
    feed: { flex: 1, overflowY: 'auto', padding: '12px 14px' },
  };

  return (
    <div style={S.root}>
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🌐</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>UNITY TRANSLATOR</div>
            <div style={{ fontSize: '9px', color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Real-Time RoK Chat Translation</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#13161c', border: `1px solid ${status === 'watching' ? '#10b981' : '#1e222b'}`, borderRadius: '20px', padding: '4px 10px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'watching' ? '#10b981' : status === 'requesting' ? '#f59e0b' : '#374151' }} />
          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: status === 'watching' ? '#10b981' : status === 'requesting' ? '#f59e0b' : '#6b7280' }}>
            {status === 'watching' ? 'LIVE' : status === 'requesting' ? 'Connecting...' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={S.controls}>
        {!supported ? (
          <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>⚠ Screen capture not supported in this browser. Use Chrome or Edge on PC.</div>
        ) : !isWatching ? (
          <button onClick={startWatching} style={{ flex: 1, background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 900, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            📡 Start Watching RoK
          </button>
        ) : (
          <button onClick={stopWatching} style={{ flex: 1, background: '#1f0a0a', border: '1px solid #7f1d1d', color: '#f87171', borderRadius: '8px', padding: '10px', fontWeight: 900, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            ⏹ Stop
          </button>
        )}
        <select value={captureInterval} onChange={e => setCaptureInterval(Number(e.target.value))} style={{ background: '#13161c', border: '1px solid #1e222b', color: 'white', borderRadius: '8px', padding: '10px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
          <option value={2}>2s</option>
          <option value={3}>3s</option>
          <option value={5}>5s</option>
          <option value={10}>10s</option>
        </select>
        <button onClick={() => { setMessages([]); seenRef.current.clear(); }} style={{ background: '#13161c', border: '1px solid #1e222b', color: '#6b7280', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', fontSize: '14px' }} title="Clear">🗑</button>
      </div>

      {/* Target language selector */}
      <div style={{ background: '#0a0c0f', borderBottom: '1px solid #1e222b', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Translate to →</span>
        <select
          value={targetLanguage}
          onChange={e => { setTargetLanguage(e.target.value); setMessages([]); seenRef.current.clear(); }}
          style={{ flex: 1, background: '#13161c', border: '1px solid #1e222b', color: 'white', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
        >
          {TARGET_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
        </select>
      </div>

      {/* Status bar */}
      {(lastCapture || errorMsg) && (
        <div style={{ ...S.statusBar, background: errorMsg ? '#7f1d1d15' : '#05966915', borderBottom: `1px solid ${errorMsg ? '#ef444422' : '#10b98122'}` }}>
          {errorMsg
            ? <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 700 }}>⚠ {errorMsg}</span>
            : <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>✓ Last scan: {lastCapture}</span>}
          <span style={{ fontSize: '10px', color: '#374151', fontWeight: 700 }}>{messages.length} msgs</span>
        </div>
      )}

      {/* Instruction banner */}
      {!isWatching && !lastCapture && supported && (
        <div style={{ background: '#0f1115', borderBottom: '1px solid #1e222b', padding: '10px 14px', fontSize: '10px', color: '#4b5563', fontWeight: 700, lineHeight: 1.6 }}>
          1. Click <span style={{ color: '#10b981' }}>Start Watching RoK</span><br />
          2. When prompted, <span style={{ color: 'white' }}>select your RoK game window</span><br />
          3. Chat messages auto-translate every {captureInterval}s
        </div>
      )}

      {/* Message feed */}
      <div style={S.feed}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', opacity: 0.4 }}>
            <span style={{ fontSize: '32px', marginBottom: '10px' }}>🌐</span>
            <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4b5563', textAlign: 'center' }}>
              {isWatching ? 'Scanning for chat messages...' : 'Translation feed empty'}
            </div>
          </div>
        ) : (
          messages.map(msg => <MessageCard key={msg.id} msg={msg} targetLanguage={targetLanguage} />)
        )}
      </div>
    </div>
  );
}
