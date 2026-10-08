'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
    Camera, Play, Square, Video, Upload, Copy, Download, 
    Trash2, Edit3, Plus, Sparkles, AlertCircle, CheckCircle, 
    ExternalLink, RefreshCw, FileSpreadsheet, MessageSquare, 
    Layers, Zap, Search, Settings, ChevronDown, ChevronUp, X, Check, Eye,
    ChevronLeft, Home, Shield
} from 'lucide-react';
import { downloadExcelFile } from '@/lib/excelHelper';

export default function RankingScanner({ isAppletMode = false, locale = 'en' }) {
    const t = useTranslations('RankingScanner');

    // Ingestion state
    const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'paste' | 'upload'
    const [isStreaming, setIsStreaming] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [toast, setToast] = useState(null); // { message, type }

    // Scanned data state
    const [eventName, setEventName] = useState('Event Rankings');
    const [metricLabel, setMetricLabel] = useState('Score');
    const [primaryMetricMode, setPrimaryMetricMode] = useState('auto'); // 'auto' | 'troops' | 'credits' | 'time'
    const [selfBanner, setSelfBanner] = useState(null);
    const [structureCapacity, setStructureCapacity] = useState(null); // { current, max, progress, timeLeft }
    const [frames, setFrames] = useState([]); // { id, number, thumbnail, timestamp, rowCount }
    const [rankings, setRankings] = useState([]); // { id, rank, governorName, allianceTag, commander, time, credits, troops, infantry, cavalry, archer, siege, status, score, rawScore, frameNumber, verified }
    
    // Column depiction state (toggle which columns are displayed and exported)
    const [depictedColumns, setDepictedColumns] = useState({
        rank: true,
        governorName: true,
        allianceTag: true,
        commander: false,
        time: false,
        credits: false,
        troops: false,
        infantry: false,
        cavalry: false,
        archer: false,
        siege: false,
        t1: false,
        t2: false,
        t3: false,
        t4: false,
        t5: false,
        status: false
    });

    // Toggle individual column visibility
    const toggleColumn = (colKey) => {
        setDepictedColumns(prev => ({
            ...prev,
            [colKey]: !prev[colKey]
        }));
    };

    // Preset configurations for column views
    const applyPreset = (presetName) => {
        if (presetName === 'compact') {
            setDepictedColumns({
                rank: true,
                governorName: true,
                allianceTag: true,
                commander: false,
                time: false,
                credits: true,
                troops: true,
                infantry: false,
                cavalry: false,
                archer: false,
                siege: false,
                t1: false,
                t2: false,
                t3: false,
                t4: false,
                t5: false,
                status: false
            });
            showToast('Applied Compact view preset ⚡', 'info');
        } else if (presetName === 'tiers') {
            setDepictedColumns({
                rank: true,
                governorName: true,
                allianceTag: true,
                commander: false,
                time: false,
                credits: false,
                troops: true,
                infantry: false,
                cavalry: false,
                archer: false,
                siege: false,
                t1: true,
                t2: true,
                t3: true,
                t4: true,
                t5: true,
                status: false
            });
            showToast('Applied Unit Tiers (T1–T5) preset 👑', 'info');
        } else if (presetName === 'classes') {
            setDepictedColumns({
                rank: true,
                governorName: true,
                allianceTag: true,
                commander: false,
                time: false,
                credits: false,
                troops: true,
                infantry: true,
                cavalry: true,
                archer: true,
                siege: true,
                t1: false,
                t2: false,
                t3: false,
                t4: false,
                t5: false,
                status: false
            });
            showToast('Applied Troop Classes preset ⚔️', 'info');
        } else if (presetName === 'structure') {
            setDepictedColumns({
                rank: true,
                governorName: true,
                allianceTag: true,
                commander: true,
                time: true,
                credits: true,
                troops: true,
                infantry: false,
                cavalry: false,
                archer: false,
                siege: false,
                t1: false,
                t2: false,
                t3: false,
                t4: false,
                t5: false,
                status: true
            });
            showToast('Applied Structure & March preset 🏛️', 'info');
        } else if (presetName === 'all') {
            setDepictedColumns({
                rank: true,
                governorName: true,
                allianceTag: true,
                commander: true,
                time: true,
                credits: true,
                troops: true,
                infantry: true,
                cavalry: true,
                archer: true,
                siege: true,
                t1: true,
                t2: true,
                t3: true,
                t4: true,
                t5: true,
                status: true
            });
            showToast('Showing all columns 🌐', 'info');
        }
    };

    // Switch primary metric mode (Troops vs Credits vs Time vs Auto)
    const handlePrimaryMetricChange = (mode) => {
        setPrimaryMetricMode(mode);
        if (mode === 'troops') {
            setMetricLabel('Troops');
            setDepictedColumns(prev => ({ ...prev, troops: true }));
            setRankings(prev => prev.map(r => {
                const troopVal = (r.troops !== null && r.troops !== undefined) ? Number(r.troops) : r.score;
                return {
                    ...r,
                    score: troopVal,
                    rawScore: String(troopVal)
                };
            }));
            showToast('Primary metric switched to Troops ⚔️', 'info');
        } else if (mode === 'credits') {
            setMetricLabel('Building Credits');
            setDepictedColumns(prev => ({ ...prev, credits: true }));
            setRankings(prev => prev.map(r => {
                const credVal = (r.credits !== null && r.credits !== undefined) ? Number(r.credits) : r.score;
                return {
                    ...r,
                    score: credVal,
                    rawScore: Number(credVal).toLocaleString()
                };
            }));
            showToast('Primary metric switched to Credits 🪙', 'info');
        } else if (mode === 'time') {
            setMetricLabel('Building Time');
            setDepictedColumns(prev => ({ ...prev, time: true }));
            showToast('Primary metric switched to Time ⏱️', 'info');
        } else {
            setMetricLabel('Score');
            showToast('Primary metric switched to Auto Score', 'info');
        }
    };

    // Search and filter
    const [searchQuery, setSearchQuery] = useState('');
    const [editingRowId, setEditingRowId] = useState(null);
    const [editForm, setEditForm] = useState({ 
        rank: '', 
        governorName: '', 
        allianceTag: '', 
        commander: '', 
        time: '', 
        credits: '', 
        troops: '', 
        infantry: '',
        cavalry: '',
        archer: '',
        siege: '',
        t1: '',
        t2: '',
        t3: '',
        t4: '',
        t5: '',
        status: '', 
        score: '' 
    });

    // Personal API Settings modal / toggle
    const [showSettings, setShowSettings] = useState(false);
    const [geminiKey, setGeminiKey] = useState('');
    const [geminiModel, setGeminiModel] = useState('gemini-3.1-flash-lite');
    const [selectedFramePreview, setSelectedFramePreview] = useState(null);

    // Refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const frameCounterRef = useRef(1);

    // Load saved preferences
    useEffect(() => {
        try {
            const p = JSON.parse(localStorage.getItem('unty_prefs') || '{}');
            if (p.geminiKey) setGeminiKey(p.geminiKey);
            if (p.geminiModel) setGeminiModel(p.geminiModel);
        } catch (e) {}
    }, []);

    // Save preferences
    const saveSettings = () => {
        try {
            const p = JSON.parse(localStorage.getItem('unty_prefs') || '{}');
            p.geminiKey = geminiKey.trim();
            p.geminiModel = geminiModel;
            localStorage.setItem('unty_prefs', JSON.stringify(p));
            showToast(t('settings_saved'), 'success');
            setShowSettings(false);
        } catch (e) {
            showToast('Failed to save settings', 'error');
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Play subtle audio confirmation on frame snap
    const playSnapChime = () => {
        try {
            if (typeof window === 'undefined') return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08); // A6
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {}
    };

    // Smart De-Duplication & Accumulator Engine (Auto-adds rows across scroll frames)
    const mergeExtractedData = useCallback((newData, frameId, frameNum) => {
        if (!newData) return;

        if (newData.eventName && (eventName === 'Event Rankings' || !eventName)) {
            setEventName(newData.eventName);
        }
        if (newData.metricLabel && (metricLabel === 'Building Time (Seconds)' || !metricLabel || metricLabel === 'Score')) {
            if (primaryMetricMode === 'auto') {
                setMetricLabel(newData.metricLabel);
            }
        }
        if (newData.selfRankBanner) {
            setSelfBanner(newData.selfRankBanner);
        }
        if (newData.structureCapacity) {
            setStructureCapacity(newData.structureCapacity);
        }

        const incomingRows = Array.isArray(newData.rankings) ? newData.rankings : [];
        if (incomingRows.length === 0) {
            showToast(t('alert_no_rows_found'), 'warning');
            return;
        }

        // Auto-detect and depict columns present in this screen
        const detectedCols = {};
        incomingRows.forEach(r => {
            if (r.allianceTag) detectedCols.allianceTag = true;
            if (r.commander) detectedCols.commander = true;
            if (r.time) detectedCols.time = true;
            if (r.credits !== null && r.credits !== undefined) detectedCols.credits = true;
            if (r.troops !== null && r.troops !== undefined) detectedCols.troops = true;
            if (r.infantry > 0) detectedCols.infantry = true;
            if (r.cavalry > 0) detectedCols.cavalry = true;
            if (r.archer > 0) detectedCols.archer = true;
            if (r.siege > 0) detectedCols.siege = true;
            if (r.t1 > 0) detectedCols.t1 = true;
            if (r.t2 > 0) detectedCols.t2 = true;
            if (r.t3 > 0) detectedCols.t3 = true;
            if (r.t4 > 0) detectedCols.t4 = true;
            if (r.t5 > 0) detectedCols.t5 = true;
            if (r.status) detectedCols.status = true;
        });
        if (Array.isArray(newData.detectedColumns)) {
            newData.detectedColumns.forEach(c => {
                if (c && ['allianceTag', 'commander', 'time', 'credits', 'troops', 'infantry', 'cavalry', 'archer', 'siege', 't1', 't2', 't3', 't4', 't5', 'status'].includes(c)) {
                    detectedCols[c] = true;
                }
            });
        }
        if (Object.keys(detectedCols).length > 0) {
            setDepictedColumns(prev => ({ ...prev, ...detectedCols }));
        }

        const isExplicit = Boolean(newData.hasExplicitRanks);

        setRankings(prev => {
            const updated = [...prev];

            incomingRows.forEach(newRow => {
                if (!newRow.governorName && !newRow.rank) return;

                const cleanName = (newRow.governorName || '').trim().toLowerCase();
                const cleanRank = Number(newRow.rank);

                // Deduplication strategy:
                // 1. Normalized governor name matching (vital across scroll snapshots)
                let matchIdx = -1;
                if (cleanName && cleanName !== 'unknown') {
                    matchIdx = updated.findIndex(r => (r.governorName || '').trim().toLowerCase() === cleanName);
                }

                // 2. Only match by rank if explicit rank leaderboard numbers (#1, #2) are present on-screen
                if (matchIdx === -1 && isExplicit && cleanRank > 0) {
                    matchIdx = updated.findIndex(r => Number(r.rank) === cleanRank);
                }

                // Target score mapping
                let rowScore = Number(newRow.score) || 0;
                let rowRawScore = newRow.rawScore || String(newRow.score || '0');
                if (primaryMetricMode === 'troops' && newRow.troops !== null && newRow.troops !== undefined) {
                    rowScore = Number(newRow.troops);
                    rowRawScore = String(newRow.troops);
                } else if (primaryMetricMode === 'credits' && newRow.credits !== null && newRow.credits !== undefined) {
                    rowScore = Number(newRow.credits);
                    rowRawScore = Number(newRow.credits).toLocaleString();
                }

                const lowTierCount = (newRow.t1 || 0) + (newRow.t2 || 0) + (newRow.t3 || 0);
                const hasLowTierWarning = lowTierCount > 0;

                if (matchIdx !== -1) {
                    // Update existing row
                    const current = updated[matchIdx];
                    updated[matchIdx] = {
                        ...current,
                        governorName: newRow.governorName || current.governorName,
                        allianceTag: newRow.allianceTag || current.allianceTag,
                        commander: newRow.commander || current.commander,
                        time: newRow.time || current.time,
                        credits: (newRow.credits !== null && newRow.credits !== undefined) ? newRow.credits : current.credits,
                        troops: (newRow.troops !== null && newRow.troops !== undefined) ? newRow.troops : current.troops,
                        infantry: (newRow.infantry !== null && newRow.infantry !== undefined) ? newRow.infantry : current.infantry,
                        cavalry: (newRow.cavalry !== null && newRow.cavalry !== undefined) ? newRow.cavalry : current.cavalry,
                        archer: (newRow.archer !== null && newRow.archer !== undefined) ? newRow.archer : current.archer,
                        siege: (newRow.siege !== null && newRow.siege !== undefined) ? newRow.siege : current.siege,
                        t1: (newRow.t1 !== null && newRow.t1 !== undefined) ? newRow.t1 : current.t1,
                        t2: (newRow.t2 !== null && newRow.t2 !== undefined) ? newRow.t2 : current.t2,
                        t3: (newRow.t3 !== null && newRow.t3 !== undefined) ? newRow.t3 : current.t3,
                        t4: (newRow.t4 !== null && newRow.t4 !== undefined) ? newRow.t4 : current.t4,
                        t5: (newRow.t5 !== null && newRow.t5 !== undefined) ? newRow.t5 : current.t5,
                        hasLowTierWarning: hasLowTierWarning || current.hasLowTierWarning,
                        lowTierCount: Math.max(lowTierCount, current.lowTierCount || 0),
                        status: newRow.status || current.status,
                        score: rowScore !== undefined ? rowScore : current.score,
                        rawScore: rowRawScore || current.rawScore,
                        verified: true
                    };
                } else {
                    // Auto-Add: append new row from this scroll frame
                    const assignedRank = (isExplicit && cleanRank > 0) 
                        ? cleanRank 
                        : (updated.length + 1);

                    updated.push({
                        id: `gov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        rank: assignedRank,
                        governorName: newRow.governorName || 'Unknown',
                        allianceTag: newRow.allianceTag || '',
                        commander: newRow.commander || null,
                        time: newRow.time || null,
                        credits: (newRow.credits !== null && newRow.credits !== undefined) ? newRow.credits : null,
                        troops: (newRow.troops !== null && newRow.troops !== undefined) ? newRow.troops : null,
                        infantry: (newRow.infantry !== null && newRow.infantry !== undefined) ? newRow.infantry : null,
                        cavalry: (newRow.cavalry !== null && newRow.cavalry !== undefined) ? newRow.cavalry : null,
                        archer: (newRow.archer !== null && newRow.archer !== undefined) ? newRow.archer : null,
                        siege: (newRow.siege !== null && newRow.siege !== undefined) ? newRow.siege : null,
                        t1: (newRow.t1 !== null && newRow.t1 !== undefined) ? newRow.t1 : null,
                        t2: (newRow.t2 !== null && newRow.t2 !== undefined) ? newRow.t2 : null,
                        t3: (newRow.t3 !== null && newRow.t3 !== undefined) ? newRow.t3 : null,
                        t4: (newRow.t4 !== null && newRow.t4 !== undefined) ? newRow.t4 : null,
                        t5: (newRow.t5 !== null && newRow.t5 !== undefined) ? newRow.t5 : null,
                        hasLowTierWarning,
                        lowTierCount,
                        status: newRow.status || null,
                        score: rowScore,
                        rawScore: rowRawScore,
                        frameId,
                        frameNumber: frameNum,
                        verified: false
                    });
                }
            });

            if (isExplicit) {
                updated.sort((a, b) => (Number(a.rank) || 999999) - (Number(b.rank) || 999999));
            }
            return updated;
        });

        showToast(`${t('toast_extracted_prefix')} ${incomingRows.length} ${t('toast_extracted_suffix')} #${frameNum}`, 'success');
    }, [eventName, metricLabel, primaryMetricMode, t]);

    // Send encoded image to backend AI Vision route
    const transmitToAi = useCallback(async (base64, mimeType, frameThumbnail) => {
        setIsProcessing(true);
        setStatusMessage(t('status_processing_gemini'));

        const currentFrameNum = frameCounterRef.current++;
        const frameId = `frame-${Date.now()}-${currentFrameNum}`;

        // Create optimistic frame entry in reel
        const newFrame = {
            id: frameId,
            number: currentFrameNum,
            thumbnail: frameThumbnail,
            timestamp: new Date().toLocaleTimeString(),
            rowCount: 0,
            status: 'processing'
        };

        setFrames(prev => [newFrame, ...prev]);

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (geminiKey) headers['x-gemini-key'] = geminiKey;
            if (geminiModel) headers['x-gemini-model'] = geminiModel;

            const effectiveTargetMetric = primaryMetricMode === 'troops' 
                ? 'Troops' 
                : primaryMetricMode === 'credits' 
                ? 'Building Credits' 
                : primaryMetricMode === 'time'
                ? 'Building Time'
                : metricLabel;

            const res = await fetch('/api/tools/screen-grabber', {
                method: 'POST',
                headers,
                body: JSON.stringify({ 
                    base64, 
                    mimeType,
                    targetMetric: effectiveTargetMetric,
                    eventName
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                const err = data.error || 'Failed to analyze screenshot.';
                showToast(err, 'error');
                setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error', errorMsg: err } : f));
                setIsProcessing(false);
                setStatusMessage('');
                return;
            }

            const rowCount = Array.isArray(data.rankings) ? data.rankings.length : 0;
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'scanned', rowCount } : f));

            mergeExtractedData(data, frameId, currentFrameNum);
        } catch (err) {
            console.error('OCR transmission error:', err);
            showToast(t('error_network'), 'error');
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error', errorMsg: err.message } : f));
        } finally {
            setIsProcessing(false);
            setStatusMessage('');
        }
    }, [geminiKey, geminiModel, metricLabel, primaryMetricMode, eventName, mergeExtractedData, t]);

    // Process and scale image via canvas before sending to AI
    const processImagePayload = useCallback((imageSource) => {
        playSnapChime();
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = imageSource.videoWidth || imageSource.naturalWidth || imageSource.width;
        let height = imageSource.videoHeight || imageSource.naturalHeight || imageSource.height;

        if (!width || !height) return;

        // Scale to maximum 1920px width while preserving aspect ratio
        const MAX_WIDTH = 1920;
        if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(imageSource, 0, 0, width, height);

        // High-efficiency WebP compression
        const webpDataUrl = canvas.toDataURL('image/webp', 0.85);
        const base64 = webpDataUrl.split(',')[1];

        // Create smaller thumbnail for filmstrip
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 160;
        thumbCanvas.height = Math.round((height * 160) / width);
        thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

        transmitToAi(base64, 'image/webp', thumbnail);
    }, [transmitToAi]);

    // Capture single frame from live video stream
    const captureStreamFrame = useCallback(() => {
        if (!videoRef.current || isProcessing) return;
        const video = videoRef.current;
        if (video.readyState < 2) {
            showToast(t('alert_video_not_ready'), 'warning');
            return;
        }
        processImagePayload(video);
    }, [isProcessing, processImagePayload, t]);

    // Start Screen / Window Stream
    const startStreaming = async () => {
        try {
            setStatusMessage(t('status_connecting_window'));
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: 15, max: 30 } },
                audio: false
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            stream.getVideoTracks()[0].addEventListener('ended', stopStreaming);
            setIsStreaming(true);
            setStatusMessage('');
            showToast(t('toast_stream_connected'), 'success');
        } catch (err) {
            console.error('Failed to capture stream:', err);
            setIsStreaming(false);
            setStatusMessage('');
            if (err.name !== 'NotAllowedError') {
                showToast(t('error_stream_permission'), 'error');
            }
        }
    };

    // Stop Stream
    const stopStreaming = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
        setStatusMessage('');
    }, []);

    // Clean up stream on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Global Hotkey Listener: Space or Enter to snap when streaming
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is currently typing in an input or textarea
            const tag = e.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            if (isStreaming && (e.code === 'Space' || e.key === 'Enter')) {
                e.preventDefault();
                captureStreamFrame();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isStreaming, captureStreamFrame]);

    // Global Paste Listener (Ctrl+V)
    useEffect(() => {
        const handlePaste = (e) => {
            const tag = e.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            if (!e.clipboardData?.items || isProcessing) return;

            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    if (!blob) continue;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => processImagePayload(img);
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(blob);
                    showToast(t('toast_clipboard_pasted'), 'info');
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isProcessing, processImagePayload, t]);

    // File Upload Handler (supports multi-file batch)
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Process sequentially
        let index = 0;
        const processNext = () => {
            if (index >= files.length) {
                e.target.value = null;
                return;
            }

            const file = files[index++];
            if (file.type.indexOf('image') === -1) {
                processNext();
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    processImagePayload(img);
                    setTimeout(processNext, 1200); // slight stagger to respect rate limits
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };

        processNext();
    };

    // Remove Frame from Reel
    const removeFrame = (frameId) => {
        setFrames(prev => prev.filter(f => f.id !== frameId));
        showToast(t('toast_frame_removed'), 'info');
    };

    // Inline edit cell handlers
    const startEditing = (row) => {
        setEditingRowId(row.id);
        setEditForm({
            rank: row.rank,
            governorName: row.governorName,
            allianceTag: row.allianceTag || '',
            commander: row.commander || '',
            time: row.time || '',
            credits: row.credits !== null && row.credits !== undefined ? row.credits : '',
            troops: row.troops !== null && row.troops !== undefined ? row.troops : '',
            infantry: row.infantry !== null && row.infantry !== undefined ? row.infantry : '',
            cavalry: row.cavalry !== null && row.cavalry !== undefined ? row.cavalry : '',
            archer: row.archer !== null && row.archer !== undefined ? row.archer : '',
            siege: row.siege !== null && row.siege !== undefined ? row.siege : '',
            t1: row.t1 !== null && row.t1 !== undefined ? row.t1 : '',
            t2: row.t2 !== null && row.t2 !== undefined ? row.t2 : '',
            t3: row.t3 !== null && row.t3 !== undefined ? row.t3 : '',
            t4: row.t4 !== null && row.t4 !== undefined ? row.t4 : '',
            t5: row.t5 !== null && row.t5 !== undefined ? row.t5 : '',
            status: row.status || '',
            score: row.score
        });
    };

    const saveEditing = (rowId) => {
        setRankings(prev => {
            const updated = prev.map(r => {
                if (r.id === rowId) {
                    const cleanScore = Number(editForm.score) || 0;
                    const cleanT1 = editForm.t1 !== '' ? Number(editForm.t1) : null;
                    const cleanT2 = editForm.t2 !== '' ? Number(editForm.t2) : null;
                    const cleanT3 = editForm.t3 !== '' ? Number(editForm.t3) : null;
                    const cleanT4 = editForm.t4 !== '' ? Number(editForm.t4) : null;
                    const cleanT5 = editForm.t5 !== '' ? Number(editForm.t5) : null;
                    const lowTierCount = (cleanT1 || 0) + (cleanT2 || 0) + (cleanT3 || 0);

                    return {
                        ...r,
                        rank: Number(editForm.rank) || r.rank,
                        governorName: editForm.governorName.trim() || r.governorName,
                        allianceTag: editForm.allianceTag.trim(),
                        commander: editForm.commander.trim() || null,
                        time: editForm.time.trim() || null,
                        credits: editForm.credits !== '' ? Number(editForm.credits) : null,
                        troops: editForm.troops !== '' ? Number(editForm.troops) : null,
                        infantry: editForm.infantry !== '' ? Number(editForm.infantry) : null,
                        cavalry: editForm.cavalry !== '' ? Number(editForm.cavalry) : null,
                        archer: editForm.archer !== '' ? Number(editForm.archer) : null,
                        siege: editForm.siege !== '' ? Number(editForm.siege) : null,
                        t1: cleanT1,
                        t2: cleanT2,
                        t3: cleanT3,
                        t4: cleanT4,
                        t5: cleanT5,
                        hasLowTierWarning: lowTierCount > 0,
                        lowTierCount,
                        status: editForm.status.trim() || null,
                        score: cleanScore,
                        rawScore: cleanScore.toLocaleString()
                    };
                }
                return r;
            });
            return updated;
        });
        setEditingRowId(null);
    };

    const deleteRow = (rowId) => {
        setRankings(prev => prev.filter(r => r.id !== rowId));
    };

    const addManualRow = () => {
        const nextRank = rankings.length > 0 ? Math.max(...rankings.map(r => Number(r.rank) || 0)) + 1 : 1;
        const newRow = {
            id: `gov-manual-${Date.now()}`,
            rank: nextRank,
            governorName: 'New Governor',
            allianceTag: '',
            commander: '',
            time: '',
            credits: null,
            troops: null,
            infantry: null,
            cavalry: null,
            archer: null,
            siege: null,
            t1: null,
            t2: null,
            t3: null,
            t4: null,
            t5: null,
            hasLowTierWarning: false,
            lowTierCount: 0,
            status: '',
            score: 0,
            rawScore: '0',
            frameNumber: 0,
            verified: true
        };
        setRankings(prev => [...prev, newRow]);
        startEditing(newRow);
    };

    const clearAll = () => {
        if (confirm(t('confirm_clear_all'))) {
            setRankings([]);
            setFrames([]);
            setSelfBanner(null);
            setStructureCapacity(null);
            frameCounterRef.current = 1;
            showToast(t('toast_cleared'), 'info');
        }
    };

    // Continuity and gap detection
    const getMissingRanks = () => {
        if (rankings.length < 2) return [];
        const rankNums = rankings.map(r => Number(r.rank)).filter(n => !isNaN(n) && n > 0);
        if (rankNums.length < 2) return [];
        const min = Math.min(...rankNums);
        const max = Math.max(...rankNums);
        const present = new Set(rankNums);
        const missing = [];
        for (let i = min; i <= max; i++) {
            if (!present.has(i)) missing.push(i);
        }
        return missing;
    };

    const missingRanks = getMissingRanks();

    // Summary calculations
    const totalGovernors = rankings.length;
    const totalScore = rankings.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
    const avgScore = totalGovernors > 0 ? Math.round(totalScore / totalGovernors) : 0;
    const topLeader = rankings.length > 0 ? rankings[0] : null;

    // Check if displaying the generic Score column is redundant with an active depicted column
    const isDuplicateScoreColumn = Boolean(
        (depictedColumns.troops && (primaryMetricMode === 'troops' || (metricLabel || '').trim().toLowerCase() === 'troops')) ||
        (depictedColumns.credits && (primaryMetricMode === 'credits' || (metricLabel || '').trim().toLowerCase().includes('credit'))) ||
        (depictedColumns.time && (primaryMetricMode === 'time' || (metricLabel || '').trim().toLowerCase().includes('time')))
    );

    // Export Handlers (incorporating all depicted columns)
    const exportExcel = () => {
        if (rankings.length === 0) {
            showToast(t('alert_no_data_to_export'), 'warning');
            return;
        }

        const exportData = rankings.map(r => {
            const rowObj = {};
            if (depictedColumns.rank) rowObj['Rank'] = r.rank;
            rowObj['Governor Name'] = r.governorName;
            if (depictedColumns.allianceTag) rowObj['Alliance'] = r.allianceTag || '';
            if (depictedColumns.commander) rowObj['Commander'] = r.commander || '';
            if (depictedColumns.time) rowObj['Building Time'] = r.time || '';
            if (depictedColumns.credits) rowObj['Building Credits'] = (r.credits !== null && r.credits !== undefined) ? r.credits : '';
            if (depictedColumns.troops) rowObj['Troops'] = (r.troops !== null && r.troops !== undefined) ? r.troops : '';
            if (depictedColumns.infantry) rowObj['Infantry'] = (r.infantry !== null && r.infantry !== undefined) ? r.infantry : '';
            if (depictedColumns.cavalry) rowObj['Cavalry'] = (r.cavalry !== null && r.cavalry !== undefined) ? r.cavalry : '';
            if (depictedColumns.archer) rowObj['Archer'] = (r.archer !== null && r.archer !== undefined) ? r.archer : '';
            if (depictedColumns.siege) rowObj['Siege'] = (r.siege !== null && r.siege !== undefined) ? r.siege : '';
            if (depictedColumns.t1) rowObj['T1 Troops'] = (r.t1 !== null && r.t1 !== undefined) ? r.t1 : '';
            if (depictedColumns.t2) rowObj['T2 Troops'] = (r.t2 !== null && r.t2 !== undefined) ? r.t2 : '';
            if (depictedColumns.t3) rowObj['T3 Troops'] = (r.t3 !== null && r.t3 !== undefined) ? r.t3 : '';
            if (depictedColumns.t4) rowObj['T4 Troops'] = (r.t4 !== null && r.t4 !== undefined) ? r.t4 : '';
            if (depictedColumns.t5) rowObj['T5 Troops'] = (r.t5 !== null && r.t5 !== undefined) ? r.t5 : '';
            if (depictedColumns.status) rowObj['Status'] = r.status || '';
            if (!isDuplicateScoreColumn) {
                rowObj[metricLabel || 'Score'] = r.score;
            }
            rowObj['Frame Source'] = r.frameNumber ? `Frame #${r.frameNumber}` : 'Manual';
            return rowObj;
        });

        const cleanEventName = (eventName || 'Event_Rankings').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${cleanEventName}_${new Date().toISOString().split('T')[0]}.xlsx`;

        downloadExcelFile(exportData, filename, cleanEventName.substring(0, 31));
        showToast(t('toast_exported_excel'), 'success');
    };

    const exportCsv = () => {
        if (rankings.length === 0) return;
        const cols = [];
        if (depictedColumns.rank) cols.push({ header: 'Rank', get: r => r.rank });
        cols.push({ header: 'Governor Name', get: r => `"${(r.governorName || '').replace(/"/g, '""')}"` });
        if (depictedColumns.allianceTag) cols.push({ header: 'Alliance', get: r => `"${(r.allianceTag || '').replace(/"/g, '""')}"` });
        if (depictedColumns.commander) cols.push({ header: 'Commander', get: r => `"${(r.commander || '').replace(/"/g, '""')}"` });
        if (depictedColumns.time) cols.push({ header: 'Time', get: r => `"${(r.time || '').replace(/"/g, '""')}"` });
        if (depictedColumns.credits) cols.push({ header: 'Credits', get: r => (r.credits !== null && r.credits !== undefined) ? r.credits : '' });
        if (depictedColumns.troops) cols.push({ header: 'Troops', get: r => (r.troops !== null && r.troops !== undefined) ? r.troops : '' });
        if (depictedColumns.infantry) cols.push({ header: 'Infantry', get: r => (r.infantry !== null && r.infantry !== undefined) ? r.infantry : '' });
        if (depictedColumns.cavalry) cols.push({ header: 'Cavalry', get: r => (r.cavalry !== null && r.cavalry !== undefined) ? r.cavalry : '' });
        if (depictedColumns.archer) cols.push({ header: 'Archer', get: r => (r.archer !== null && r.archer !== undefined) ? r.archer : '' });
        if (depictedColumns.siege) cols.push({ header: 'Siege', get: r => (r.siege !== null && r.siege !== undefined) ? r.siege : '' });
        if (depictedColumns.t1) cols.push({ header: 'T1', get: r => (r.t1 !== null && r.t1 !== undefined) ? r.t1 : '' });
        if (depictedColumns.t2) cols.push({ header: 'T2', get: r => (r.t2 !== null && r.t2 !== undefined) ? r.t2 : '' });
        if (depictedColumns.t3) cols.push({ header: 'T3', get: r => (r.t3 !== null && r.t3 !== undefined) ? r.t3 : '' });
        if (depictedColumns.t4) cols.push({ header: 'T4', get: r => (r.t4 !== null && r.t4 !== undefined) ? r.t4 : '' });
        if (depictedColumns.t5) cols.push({ header: 'T5', get: r => (r.t5 !== null && r.t5 !== undefined) ? r.t5 : '' });
        if (depictedColumns.status) cols.push({ header: 'Status', get: r => `"${(r.status || '').replace(/"/g, '""')}"` });
        if (!isDuplicateScoreColumn) {
            cols.push({ header: metricLabel || 'Score', get: r => r.score });
        }
        cols.push({ header: 'Frame', get: r => r.frameNumber || 1 });

        const headers = cols.map(c => c.header).join(',');
        const rows = rankings.map(r => cols.map(c => c.get(r)).join(','));
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${(eventName || 'Rankings').replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(t('toast_exported_csv'), 'success');
    };

    const copyTsv = () => {
        if (rankings.length === 0) return;
        const cols = [];
        if (depictedColumns.rank) cols.push({ header: 'Rank', get: r => r.rank });
        cols.push({ header: 'Governor Name', get: r => r.governorName });
        if (depictedColumns.allianceTag) cols.push({ header: 'Alliance', get: r => r.allianceTag || '' });
        if (depictedColumns.commander) cols.push({ header: 'Commander', get: r => r.commander || '' });
        if (depictedColumns.time) cols.push({ header: 'Time', get: r => r.time || '' });
        if (depictedColumns.credits) cols.push({ header: 'Credits', get: r => (r.credits !== null && r.credits !== undefined) ? r.credits : '' });
        if (depictedColumns.troops) cols.push({ header: 'Troops', get: r => (r.troops !== null && r.troops !== undefined) ? r.troops : '' });
        if (depictedColumns.infantry) cols.push({ header: 'Infantry', get: r => (r.infantry !== null && r.infantry !== undefined) ? r.infantry : '' });
        if (depictedColumns.cavalry) cols.push({ header: 'Cavalry', get: r => (r.cavalry !== null && r.cavalry !== undefined) ? r.cavalry : '' });
        if (depictedColumns.archer) cols.push({ header: 'Archer', get: r => (r.archer !== null && r.archer !== undefined) ? r.archer : '' });
        if (depictedColumns.siege) cols.push({ header: 'Siege', get: r => (r.siege !== null && r.siege !== undefined) ? r.siege : '' });
        if (depictedColumns.t1) cols.push({ header: 'T1', get: r => (r.t1 !== null && r.t1 !== undefined) ? r.t1 : '' });
        if (depictedColumns.t2) cols.push({ header: 'T2', get: r => (r.t2 !== null && r.t2 !== undefined) ? r.t2 : '' });
        if (depictedColumns.t3) cols.push({ header: 'T3', get: r => (r.t3 !== null && r.t3 !== undefined) ? r.t3 : '' });
        if (depictedColumns.t4) cols.push({ header: 'T4', get: r => (r.t4 !== null && r.t4 !== undefined) ? r.t4 : '' });
        if (depictedColumns.t5) cols.push({ header: 'T5', get: r => (r.t5 !== null && r.t5 !== undefined) ? r.t5 : '' });
        if (depictedColumns.status) cols.push({ header: 'Status', get: r => r.status || '' });
        if (!isDuplicateScoreColumn) {
            cols.push({ header: metricLabel || 'Score', get: r => r.score });
        }

        const headers = cols.map(c => c.header).join('\t');
        const rows = rankings.map(r => cols.map(c => c.get(r)).join('\t'));
        const tsv = [headers, ...rows].join('\n');
        navigator.clipboard.writeText(tsv);
        showToast(t('toast_copied_tsv'), 'success');
    };

    const copyDiscordAnnouncement = () => {
        if (rankings.length === 0) return;
        const medalEmojis = { 1: '🥇', 2: '🥈', 3: '🥉' };
        
        let msg = `🏆 **${(eventName || 'ALLIANCE EVENT RANKINGS').toUpperCase()}**\n`;
        if (structureCapacity) {
            msg += `🏰 **Structure Capacity**: ${structureCapacity.current ? structureCapacity.current.toLocaleString() : '—'} / ${structureCapacity.max ? structureCapacity.max.toLocaleString() : '—'}`;
            if (structureCapacity.progress) msg += ` (${structureCapacity.progress})`;
            if (structureCapacity.timeLeft) msg += ` • ⏱️ ${structureCapacity.timeLeft}`;
            msg += `\n`;
        }
        msg += `📊 *Metric: ${metricLabel}* • Total Participants: **${rankings.length}**\n\n`;

        rankings.forEach(r => {
            const medal = medalEmojis[r.rank] || `**#${r.rank}**`;
            const tag = r.allianceTag ? `[${r.allianceTag}] ` : '';
            let extra = [];
            if (r.commander) extra.push(`*${r.commander}*`);
            if (r.troops !== null && r.troops !== undefined) extra.push(`⚔️ **${r.troops.toLocaleString()}**`);

            const troopBreakdown = [];
            if (r.infantry) troopBreakdown.push(`🛡️${r.infantry.toLocaleString()}`);
            if (r.cavalry) troopBreakdown.push(`🐎${r.cavalry.toLocaleString()}`);
            if (r.archer) troopBreakdown.push(`🏹${r.archer.toLocaleString()}`);
            if (r.siege) troopBreakdown.push(`🚜${r.siege.toLocaleString()}`);
            if (troopBreakdown.length > 0) extra.push(troopBreakdown.join(' '));

            const tierBreakdown = [];
            if (r.t5) tierBreakdown.push(`👑${r.t5.toLocaleString()} T5`);
            if (r.t4) tierBreakdown.push(`⚔️${r.t4.toLocaleString()} T4`);
            if (r.t3) tierBreakdown.push(`${r.t3.toLocaleString()} T3`);
            if (r.t2) tierBreakdown.push(`${r.t2.toLocaleString()} T2`);
            if (r.t1) tierBreakdown.push(`⚠️${r.t1.toLocaleString()} T1`);
            if (tierBreakdown.length > 0) extra.push(tierBreakdown.join(' '));

            if (r.credits !== null && r.credits !== undefined) extra.push(`🪙 **${r.credits.toLocaleString()}**`);
            if (r.time) extra.push(`⏱️ ${r.time}`);

            const detailsStr = extra.length > 0 ? ` (${extra.join(' • ')})` : '';
            const scoreDisplay = isDuplicateScoreColumn ? '' : ` — \`${(r.score || 0).toLocaleString()}\``;
            msg += `${medal} ${tag}**${r.governorName}**${scoreDisplay}${detailsStr}\n`;
        });

        msg += `\n*Recorded with Unity AI Ranking Scanner*`;
        navigator.clipboard.writeText(msg);
        showToast(t('toast_copied_discord'), 'success');
    };

    // Pop out Standalone Applet HUD
    const launchAppletWindow = () => {
        const url = `/${locale}/tools/ranking-scanner?applet=true`;
        window.open(url, 'Unity Ranking Applet', 'width=600,height=900,toolbar=0,menubar=0,location=0,resizable=1');
    };

    // Filtered rankings
    const filteredRankings = rankings.filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            String(r.rank).includes(q) ||
            (r.governorName || '').toLowerCase().includes(q) ||
            (r.allianceTag || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className={`flex flex-col w-full bg-[#0a0c0f] text-slate-200 font-sans ${isAppletMode ? 'p-3 min-h-screen' : 'p-4 md:p-6 space-y-6 max-w-7xl mx-auto'}`}>
            
            {/* Hidden canvas for image scaling */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Notification Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-2xl border text-sm font-medium animate-fade-in ${
                    toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' :
                    toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-300' :
                    toast.type === 'warning' ? 'bg-amber-950/90 border-amber-500/50 text-amber-300' :
                    'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'
                }`}>
                    {toast.type === 'success' && <CheckCircle size={16} />}
                    {toast.type === 'error' && <AlertCircle size={16} />}
                    {toast.type === 'warning' && <AlertCircle size={16} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Top Tactical Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-fuchsia-500/20 gap-3">
                <div className="flex items-center gap-3">
                    {/* Back to Unity Main Hub Link */}
                    <Link
                        href={`/${locale}`}
                        className="px-3 py-2 rounded-xl border border-slate-800 bg-[#0d1017] hover:bg-slate-800 hover:border-fuchsia-500/50 text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm group shrink-0"
                        title="Return to Unity Main Dashboard"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform text-fuchsia-400" />
                        <span>{t('btn_back_to_unity')}</span>
                    </Link>

                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.15)]">
                            <Camera size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                                    {t('title')}
                                </h1>
                                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300">
                                    AI Vision
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {t('subtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Unity Hub Shortcut */}
                    <Link
                        href={`/${locale}`}
                        title="Unity Home Dashboard"
                        className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
                    >
                        <Home size={14} className="text-cyan-400" />
                        <span className="hidden sm:inline">Unity Hub</span>
                    </Link>

                    {/* Settings Button */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        title="AI Vision Settings"
                        className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
                    >
                        <Settings size={14} />
                        <span className="hidden sm:inline">Settings</span>
                    </button>

                    {/* Applet Popout Button */}
                    {!isAppletMode && (
                        <button
                            onClick={launchAppletWindow}
                            title="Launch floating compact window to place next to game"
                            className="px-3 py-1.5 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(217,70,239,0.15)]"
                        >
                            <ExternalLink size={14} />
                            <span>{t('btn_popout_applet')}</span>
                        </button>
                    )}

                    {/* Reset Button */}
                    {rankings.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-1.5 transition-all"
                        >
                            <RefreshCw size={13} />
                            <span>{t('btn_reset')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* AI Preferences Drawer */}
            {showSettings && (
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1017] flex flex-col md:flex-row gap-4 items-start md:items-end animate-fade-in text-xs">
                    <div className="flex-1 w-full space-y-1">
                        <label className="text-slate-400 font-mono font-bold uppercase tracking-wider">
                            Personal Gemini API Key (Optional)
                        </label>
                        <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIzaSy... (leave blank to use server key)"
                            className="w-full bg-[#13161f] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-fuchsia-500 font-mono"
                        />
                        <span className="text-[10px] text-slate-500">
                            Saved locally in your browser. Bypasses shared server quotas.
                        </span>
                    </div>

                    <div className="w-full md:w-56 space-y-1">
                        <label className="text-slate-400 font-mono font-bold uppercase tracking-wider">
                            Gemini Model
                        </label>
                        <select
                            value={geminiModel}
                            onChange={(e) => setGeminiModel(e.target.value)}
                            className="w-full bg-[#13161f] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-fuchsia-500 font-mono"
                        >
                            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast & High Quota)</option>
                            <option value="gemini-3.5-flash">gemini-3.5-flash (High Resolution OCR)</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning)</option>
                        </select>
                    </div>

                    <button
                        onClick={saveSettings}
                        className="w-full md:w-auto px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold transition-all shadow-md"
                    >
                        Save Preferences
                    </button>
                </div>
            )}

            {/* Ingestion Mode Selector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left Column: Capture HUD & Stream */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                    
                    {/* Mode Navigation Tabs */}
                    <div className="flex border border-slate-800 bg-[#0d1017] p-1 rounded-xl gap-1">
                        <button
                            onClick={() => setActiveTab('stream')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'stream' 
                                    ? 'bg-fuchsia-600/30 border border-fuchsia-500/50 text-fuchsia-300 shadow-sm' 
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Video size={14} />
                            <span>{t('tab_live_window')}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('paste')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'paste' 
                                    ? 'bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 shadow-sm' 
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Copy size={14} />
                            <span>{t('tab_clipboard_paste')}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'upload' 
                                    ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300 shadow-sm' 
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Upload size={14} />
                            <span>{t('tab_upload_files')}</span>
                        </button>
                    </div>

                    {/* Mode 1: Live Game Stream */}
                    {activeTab === 'stream' && (
                        <div className="flex flex-col rounded-2xl border border-fuchsia-500/20 bg-[#0d1017] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Zap size={14} />
                                    {t('live_viewfinder_title')}
                                </span>
                                {isStreaming && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        {t('badge_live_stream')}
                                    </span>
                                )}
                            </div>

                            {/* Viewfinder Monitor */}
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/80 border border-slate-800 flex items-center justify-center shadow-inner group">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className={`w-full h-full object-contain ${!isStreaming ? 'hidden' : 'block'}`}
                                />
                                {!isStreaming && (
                                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                                            <Video size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase tracking-wider">
                                                {t('stream_empty_title')}
                                            </p>
                                            <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                                                {t('stream_empty_desc')}
                                            </p>
                                        </div>
                                        <button
                                            onClick={startStreaming}
                                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-fuchsia-600/30 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
                                        >
                                            <Play size={14} className="fill-white" />
                                            <span>{t('btn_connect_stream')}</span>
                                        </button>
                                    </div>
                                )}

                                {isStreaming && (
                                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 border border-white/10">
                                        {t('hotkey_hint')}
                                    </div>
                                )}
                            </div>

                            {/* Action Control Strip */}
                            {isStreaming && (
                                <div className="space-y-2 pt-1">
                                    <button
                                        onClick={captureStreamFrame}
                                        disabled={isProcessing}
                                        className={`w-full py-3.5 px-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
                                            isProcessing 
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                                                : 'bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white shadow-fuchsia-500/30 transform hover:scale-[1.01] active:scale-[0.99]'
                                        }`}
                                    >
                                        <Camera size={18} className={isProcessing ? 'animate-spin' : ''} />
                                        <span>{isProcessing ? t('btn_scanning') : t('btn_snap_frame')}</span>
                                    </button>

                                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                                        <span className="flex items-center gap-1 text-slate-400">
                                            <span>💡 {t('stream_step_instruction')}</span>
                                        </span>
                                        <button 
                                            onClick={stopStreaming}
                                            className="text-rose-400 hover:text-rose-300 underline font-mono text-[10px]"
                                        >
                                            {t('btn_disconnect')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mode 2: Global Clipboard Paste (Ctrl+V) */}
                    {activeTab === 'paste' && (
                        <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed border-cyan-500/30 bg-[#0d1017] space-y-4 min-h-[260px]">
                            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                                <Copy size={28} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                    {t('paste_title')}
                                </h3>
                                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                                    {t('paste_instruction')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-mono text-xs font-bold shadow-sm">
                                    Ctrl
                                </kbd>
                                <span className="text-slate-500">+</span>
                                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-mono text-xs font-bold shadow-sm">
                                    V
                                </kbd>
                            </div>
                        </div>
                    )}

                    {/* Mode 3: Upload or Drag & Drop Multiple Files */}
                    {activeTab === 'upload' && (
                        <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed border-amber-500/30 bg-[#0d1017] space-y-4 min-h-[260px] relative">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] pointer-events-none">
                                <Upload size={28} />
                            </div>
                            <div className="pointer-events-none">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                    {t('upload_title')}
                                </h3>
                                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                                    {t('upload_instruction')}
                                </p>
                            </div>
                            <button className="pointer-events-none px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider">
                                {t('btn_browse_files')}
                            </button>
                        </div>
                    )}

                    {/* Filmstrip Reel of Captured Frames */}
                    {frames.length > 0 && (
                        <div className="rounded-2xl border border-slate-800 bg-[#0d1017] p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                    <Layers size={14} className="text-fuchsia-400" />
                                    <span>{t('captured_frames_title')} ({frames.length})</span>
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    {t('filmstrip_subtitle')}
                                </span>
                            </div>

                            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-700">
                                {frames.map((frame) => (
                                    <div 
                                        key={frame.id}
                                        className="relative group shrink-0 w-28 aspect-[3/4] rounded-lg overflow-hidden border border-slate-800 bg-black/40 flex flex-col justify-between p-1.5 shadow-md"
                                    >
                                        <img 
                                            src={frame.thumbnail} 
                                            alt={`Frame ${frame.number}`}
                                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            onClick={() => setSelectedFramePreview(frame.thumbnail)}
                                        />
                                        <div className="relative z-10 flex items-center justify-between">
                                            <span className="px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] font-bold text-fuchsia-300 border border-fuchsia-500/30">
                                                #{frame.number}
                                            </span>
                                            <button
                                                onClick={() => removeFrame(frame.id)}
                                                className="p-1 rounded bg-black/80 text-slate-400 hover:text-rose-400 transition-colors"
                                                title="Delete this snapshot"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>

                                        <div className="relative z-10 flex items-center justify-between bg-black/80 rounded px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                                            {frame.status === 'processing' ? (
                                                <span className="text-amber-400 animate-pulse">{t('frame_scanning')}</span>
                                            ) : frame.status === 'error' ? (
                                                <span className="text-rose-400">{t('frame_error')}</span>
                                            ) : (
                                                <span className="text-emerald-400">+{frame.rowCount} {t('frame_rows')}</span>
                                            )}
                                            <span className="text-slate-500">{frame.timestamp.split(' ')[0]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Column: Accumulated Leaderboard & Export */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                    
                    {/* Event & Metric Header Config */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl border border-slate-800 bg-[#0d1017]">
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                                {t('label_event_title')}
                            </label>
                            <input
                                type="text"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                className="w-full bg-[#13161f] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold tracking-wide focus:outline-none focus:border-fuchsia-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                                {t('label_metric_name')}
                            </label>
                            <input
                                type="text"
                                value={metricLabel}
                                onChange={(e) => setMetricLabel(e.target.value)}
                                className="w-full bg-[#13161f] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-fuchsia-500"
                            />
                        </div>
                    </div>

                    {/* KPI Quick Analytics Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl border border-slate-800 bg-[#0d1017]">
                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                {t('kpi_governors')}
                            </div>
                            <div className="text-lg font-black text-white mt-0.5">
                                {totalGovernors}
                            </div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-[#0d1017]">
                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                {t('kpi_top_leader')}
                            </div>
                            <div className="text-sm font-bold text-fuchsia-400 mt-0.5 truncate" title={topLeader?.governorName}>
                                {topLeader ? topLeader.governorName : '—'}
                            </div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-[#0d1017]">
                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                {t('kpi_total_score')}
                            </div>
                            <div className="text-lg font-black text-emerald-400 mt-0.5 font-mono">
                                {totalScore.toLocaleString()}
                            </div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-[#0d1017]">
                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                {t('kpi_average_score')}
                            </div>
                            <div className="text-lg font-black text-cyan-400 mt-0.5 font-mono">
                                {avgScore.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Structure Reinforcement Capacity Banner (if detected on Alliance structure/stone pit/flag) */}
                    {structureCapacity && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 backdrop-blur-md shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                                        {t('label_structure_capacity')}
                                    </div>
                                    <div className="text-sm font-black font-mono text-white flex items-center gap-1.5 mt-0.5">
                                        <span className="text-cyan-300">{(structureCapacity.current || 0).toLocaleString()}</span>
                                        <span className="text-slate-500">/</span>
                                        <span className="text-slate-300">{(structureCapacity.max || 0).toLocaleString()}</span>
                                        {structureCapacity.max > 0 && (
                                            <span className="text-xs text-cyan-400/90 font-semibold ml-1">
                                                ({Math.round(((structureCapacity.current || 0) / structureCapacity.max) * 100)}%)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono">
                                {structureCapacity.progress && (
                                    <div className="flex items-center gap-1.5 bg-[#0d1017] px-2.5 py-1 rounded-lg border border-slate-800">
                                        <span className="text-slate-500 uppercase text-[10px]">Progress:</span>
                                        <span className="font-bold text-amber-300">{structureCapacity.progress}</span>
                                    </div>
                                )}
                                {structureCapacity.timeLeft && (
                                    <div className="flex items-center gap-1.5 bg-[#0d1017] px-2.5 py-1 rounded-lg border border-slate-800">
                                        <span className="text-slate-500 uppercase text-[10px]">Time Left:</span>
                                        <span className="font-bold text-emerald-300">{structureCapacity.timeLeft}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sequence Continuity Warning if Gaps Exist */}
                    {missingRanks.length > 0 && (
                        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-start gap-2.5 text-xs animate-pulse">
                            <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                            <div>
                                <span className="font-bold">{t('continuity_warning_title')}: </span>
                                <span>{t('continuity_warning_desc')} </span>
                                <span className="font-mono font-bold text-amber-200">
                                    #{missingRanks.join(', #')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Table Controls & Export Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        {/* Search Filter */}
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('placeholder_search')}
                                className="w-full bg-[#0d1017] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
                            />
                        </div>

                        {/* Export & Actions Strip */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={addManualRow}
                                className="px-2.5 py-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1 transition-all"
                                title="Add an entry manually"
                            >
                                <Plus size={13} />
                                <span>{t('btn_add_row')}</span>
                            </button>
                            <button
                                onClick={copyDiscordAnnouncement}
                                disabled={rankings.length === 0}
                                className="px-2.5 py-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                                title="Copy Discord-formatted leaderboard"
                            >
                                <MessageSquare size={13} />
                                <span className="hidden sm:inline">Discord</span>
                            </button>
                            <button
                                onClick={copyTsv}
                                disabled={rankings.length === 0}
                                className="px-2.5 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                                title="Copy Tab-Separated Values for Google Sheets"
                            >
                                <Copy size={13} />
                                <span>Sheets</span>
                            </button>
                            <button
                                onClick={exportExcel}
                                disabled={rankings.length === 0}
                                className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                            >
                                <FileSpreadsheet size={14} />
                                <span>Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* Interactive Column Depiction & Primary Metric Bar */}
                    <div className="flex flex-col gap-3 p-3 rounded-2xl border border-slate-800 bg-[#0d1017]">
                        {/* Quick View Presets */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mr-1">
                                    Presets:
                                </span>
                                <button
                                    onClick={() => applyPreset('compact')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <span>⚡ {t('preset_compact')}</span>
                                </button>
                                <button
                                    onClick={() => applyPreset('tiers')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-600/50 transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <span>👑 {t('preset_tiers')}</span>
                                </button>
                                <button
                                    onClick={() => applyPreset('classes')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border border-blue-600/50 transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <span>⚔️ {t('preset_classes')}</span>
                                </button>
                                <button
                                    onClick={() => applyPreset('structure')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-600/50 transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <span>🏛️ {t('preset_structure')}</span>
                                </button>
                                <button
                                    onClick={() => applyPreset('all')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-600/50 transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <span>🌐 {t('preset_all')}</span>
                                </button>
                            </div>

                            {/* Primary Metric Selector */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                                    {t('label_primary_metric')}:
                                </span>
                                <div className="flex bg-[#13161f] border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                                    <button
                                        onClick={() => handlePrimaryMetricChange('auto')}
                                        className={`px-2 py-1 rounded-md transition-all ${
                                            primaryMetricMode === 'auto' ? 'bg-fuchsia-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {t('metric_option_auto')}
                                    </button>
                                    <button
                                        onClick={() => handlePrimaryMetricChange('troops')}
                                        className={`px-2 py-1 rounded-md transition-all ${
                                            primaryMetricMode === 'troops' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {t('metric_option_troops')}
                                    </button>
                                    <button
                                        onClick={() => handlePrimaryMetricChange('credits')}
                                        className={`px-2 py-1 rounded-md transition-all ${
                                            primaryMetricMode === 'credits' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {t('metric_option_credits')}
                                    </button>
                                    <button
                                        onClick={() => handlePrimaryMetricChange('time')}
                                        className={`px-2 py-1 rounded-md transition-all ${
                                            primaryMetricMode === 'time' ? 'bg-amber-500/40 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {t('metric_option_time')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Individual Column Toggles */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mr-1">
                                {t('label_depicted_columns')}:
                            </span>
                            <button
                                onClick={() => toggleColumn('rank')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.rank ? 'bg-fuchsia-600/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.rank && <Check size={12} />}
                                <span>{t('th_rank')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('allianceTag')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.allianceTag ? 'bg-fuchsia-600/30 border border-fuchsia-500/50 text-fuchsia-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.allianceTag && <Check size={12} />}
                                <span>{t('th_alliance')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('commander')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.commander ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.commander && <Check size={12} />}
                                <span>{t('th_commander')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('time')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.time ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.time && <Check size={12} />}
                                <span>{t('th_time')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('credits')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.credits ? 'bg-yellow-600/30 border border-yellow-500/50 text-yellow-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.credits && <Check size={12} />}
                                <span>🪙 {t('th_credits')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('troops')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.troops ? 'bg-rose-600/30 border border-rose-500/50 text-rose-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.troops && <Check size={12} />}
                                <span>⚔️ {t('th_troops')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('infantry')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.infantry ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.infantry && <Check size={12} />}
                                <span>🛡️ {t('th_infantry')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('cavalry')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.cavalry ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.cavalry && <Check size={12} />}
                                <span>🐎 {t('th_cavalry')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('archer')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.archer ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.archer && <Check size={12} />}
                                <span>🏹 {t('th_archer')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('siege')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.siege ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.siege && <Check size={12} />}
                                <span>🚜 {t('th_siege')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('t1')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.t1 ? 'bg-slate-700/60 border border-slate-500/80 text-slate-200' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.t1 && <Check size={12} />}
                                <span>🔘 {t('th_t1')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('t2')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.t2 ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.t2 && <Check size={12} />}
                                <span>🟢 {t('th_t2')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('t3')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.t3 ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.t3 && <Check size={12} />}
                                <span>🔵 {t('th_t3')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('t4')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.t4 ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.t4 && <Check size={12} />}
                                <span>🟣 {t('th_t4')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('t5')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.t5 ? 'bg-amber-500/30 border border-amber-400/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.t5 && <Check size={12} />}
                                <span>👑 {t('th_t5')}</span>
                            </button>
                            <button
                                onClick={() => toggleColumn('status')}
                                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                    depictedColumns.status ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {depictedColumns.status && <Check size={12} />}
                                <span>{t('th_status')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Master Leaderboard Table */}
                    <div className="rounded-2xl border border-slate-800 bg-[#0d1017] overflow-hidden shadow-xl">
                        {/* Horizontal Scroll Hint Banner */}
                        <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <span>↔️</span>
                                <span>{t('table_scroll_hint')}</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                                {filteredRankings.length} {t('kpi_governors')}
                            </span>
                        </div>

                        <div className="overflow-x-auto max-h-[520px] scrollbar-thin scrollbar-thumb-slate-700">
                            <table className="w-full text-left border-collapse text-xs font-sans min-w-max">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900 sticky top-0 z-30 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                                        {depictedColumns.rank && (
                                            <th className="py-2.5 px-3 w-16 text-center sticky left-0 bg-slate-900 z-40 border-r border-slate-800">
                                                {t('th_rank')}
                                            </th>
                                        )}
                                        <th className={`py-2.5 px-3 sticky ${depictedColumns.rank ? 'left-16' : 'left-0'} bg-slate-900 z-40 border-r border-slate-800 shadow-[4px_0_10px_rgba(0,0,0,0.5)]`}>
                                            {t('th_governor')}
                                        </th>
                                        {depictedColumns.allianceTag && <th className="py-2.5 px-3 w-20 text-center">{t('th_alliance')}</th>}
                                        {depictedColumns.commander && <th className="py-2.5 px-3 max-w-[180px]">{t('th_commander')}</th>}
                                        {depictedColumns.time && <th className="py-2.5 px-3 text-center">{t('th_time')}</th>}
                                        {depictedColumns.credits && <th className="py-2.5 px-3 text-right">🪙 {t('th_credits')}</th>}
                                        {depictedColumns.troops && <th className="py-2.5 px-3 text-right">⚔️ {t('th_troops')}</th>}
                                        {depictedColumns.infantry && <th className="py-2.5 px-3 text-right">🛡️ {t('th_infantry')}</th>}
                                        {depictedColumns.cavalry && <th className="py-2.5 px-3 text-right">🐎 {t('th_cavalry')}</th>}
                                        {depictedColumns.archer && <th className="py-2.5 px-3 text-right">🏹 {t('th_archer')}</th>}
                                        {depictedColumns.siege && <th className="py-2.5 px-3 text-right">🚜 {t('th_siege')}</th>}
                                        {depictedColumns.t1 && <th className="py-2.5 px-3 text-right">🔘 {t('th_t1')}</th>}
                                        {depictedColumns.t2 && <th className="py-2.5 px-3 text-right">🟢 {t('th_t2')}</th>}
                                        {depictedColumns.t3 && <th className="py-2.5 px-3 text-right">🔵 {t('th_t3')}</th>}
                                        {depictedColumns.t4 && <th className="py-2.5 px-3 text-right">🟣 {t('th_t4')}</th>}
                                        {depictedColumns.t5 && <th className="py-2.5 px-3 text-right">👑 {t('th_t5')}</th>}
                                        {depictedColumns.status && <th className="py-2.5 px-3 text-center">{t('th_status')}</th>}
                                        {!isDuplicateScoreColumn && (
                                            <th className="py-2.5 px-3 text-right">{metricLabel || t('th_score')}</th>
                                        )}
                                        <th className="py-2.5 px-3 w-20 text-center">{t('th_source')}</th>
                                        <th className="py-2.5 px-3 w-20 text-center">{t('th_actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-sans">
                                    {filteredRankings.length === 0 ? (
                                        <tr>
                                            <td colSpan={16} className="py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center space-y-2">
                                                    <Camera size={28} className="opacity-30" />
                                                    <p className="text-xs uppercase tracking-wider font-mono">
                                                        {t('table_empty_state')}
                                                    </p>
                                                    <p className="text-[11px] text-slate-600 max-w-sm">
                                                        {t('table_empty_hint')}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRankings.map((row) => {
                                            const isEditing = editingRowId === row.id;
                                            const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null;

                                            return (
                                                <tr 
                                                    key={row.id} 
                                                    className="hover:bg-slate-800/40 transition-colors group"
                                                >
                                                    {/* Rank Cell */}
                                                    {depictedColumns.rank && (
                                                        <td className="py-2.5 px-3 text-center font-mono font-bold sticky left-0 bg-[#0d1017] group-hover:bg-[#161a23] z-20 border-r border-slate-800/60">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.rank}
                                                                    onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                                                                    className="w-12 bg-black border border-slate-700 rounded px-1 py-0.5 text-center text-xs"
                                                                />
                                                            ) : (
                                                                <span className="flex items-center justify-center gap-1">
                                                                    {medal && <span>{medal}</span>}
                                                                    <span className={row.rank <= 3 ? 'text-amber-300 font-black' : 'text-slate-300'}>
                                                                        #{row.rank}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Governor Name Cell */}
                                                    <td className={`py-2.5 px-3 font-medium text-white sticky ${depictedColumns.rank ? 'left-16' : 'left-0'} bg-[#0d1017] group-hover:bg-[#161a23] z-20 border-r border-slate-800/60 shadow-[4px_0_10px_rgba(0,0,0,0.5)]`}>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editForm.governorName}
                                                                onChange={(e) => setEditForm({ ...editForm, governorName: e.target.value })}
                                                                className="w-full bg-black border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                                                                <span className="font-semibold">{row.governorName}</span>
                                                                {(row.hasLowTierWarning || (row.t1 > 0 || row.t2 > 0 || row.t3 > 0)) && (
                                                                    <span 
                                                                        className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-mono font-bold flex items-center gap-0.5 whitespace-nowrap" 
                                                                        title={`Sent ${((row.t1 || 0) + (row.t2 || 0) + (row.t3 || 0)).toLocaleString()} low-tier T1-T3 troops`}
                                                                    >
                                                                        ⚠️ {t('badge_low_tier_warning')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Alliance Tag Cell */}
                                                    {depictedColumns.allianceTag && (
                                                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editForm.allianceTag}
                                                                    onChange={(e) => setEditForm({ ...editForm, allianceTag: e.target.value })}
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-center text-xs"
                                                                />
                                                            ) : (
                                                                row.allianceTag ? (
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                                                                        [{row.allianceTag}]
                                                                    </span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Commander Cell */}
                                                    {depictedColumns.commander && (
                                                        <td className="py-2.5 px-3 font-medium max-w-[180px]">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editForm.commander}
                                                                    onChange={(e) => setEditForm({ ...editForm, commander: e.target.value })}
                                                                    placeholder="e.g. Lvl 1 Baibars"
                                                                    className="w-full bg-black border border-slate-700 rounded px-1.5 py-0.5 text-xs text-indigo-300 font-mono"
                                                                />
                                                            ) : (
                                                                row.commander ? (
                                                                    <span 
                                                                        className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] block truncate"
                                                                        title={row.commander}
                                                                    >
                                                                        {row.commander}
                                                                    </span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Building Time Cell */}
                                                    {depictedColumns.time && (
                                                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editForm.time}
                                                                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                                                                    placeholder="03:15:38"
                                                                    className="w-20 bg-black border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-amber-300 font-mono"
                                                                />
                                                            ) : (
                                                                row.time ? (
                                                                    <span className="text-amber-300/90">{row.time}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Building Credits Cell */}
                                                    {depictedColumns.credits && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-yellow-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.credits}
                                                                    onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
                                                                    placeholder="11738"
                                                                    className="w-20 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-yellow-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.credits !== null && row.credits !== undefined) ? (
                                                                    <span>🪙 {Number(row.credits).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Troops Cell */}
                                                    {depictedColumns.troops && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.troops}
                                                                    onChange={(e) => setEditForm({ ...editForm, troops: e.target.value })}
                                                                    placeholder="1"
                                                                    className="w-20 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-rose-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.troops !== null && row.troops !== undefined) ? (
                                                                    <span>⚔️ {Number(row.troops).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Infantry Cell */}
                                                    {depictedColumns.infantry && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.infantry}
                                                                    onChange={(e) => setEditForm({ ...editForm, infantry: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-blue-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.infantry !== null && row.infantry !== undefined) ? (
                                                                    <span>🛡️ {Number(row.infantry).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Cavalry Cell */}
                                                    {depictedColumns.cavalry && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.cavalry}
                                                                    onChange={(e) => setEditForm({ ...editForm, cavalry: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-amber-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.cavalry !== null && row.cavalry !== undefined) ? (
                                                                    <span>🐎 {Number(row.cavalry).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Archer Cell */}
                                                    {depictedColumns.archer && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.archer}
                                                                    onChange={(e) => setEditForm({ ...editForm, archer: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-emerald-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.archer !== null && row.archer !== undefined) ? (
                                                                    <span>🏹 {Number(row.archer).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Siege Cell */}
                                                    {depictedColumns.siege && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.siege}
                                                                    onChange={(e) => setEditForm({ ...editForm, siege: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-purple-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.siege !== null && row.siege !== undefined) ? (
                                                                    <span>🚜 {Number(row.siege).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* T1 Cell */}
                                                    {depictedColumns.t1 && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.t1}
                                                                    onChange={(e) => setEditForm({ ...editForm, t1: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-slate-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.t1 !== null && row.t1 !== undefined) ? (
                                                                    <span className={row.t1 > 0 ? 'text-rose-400' : 'text-slate-400'}>
                                                                        🔘 {Number(row.t1).toLocaleString()}
                                                                    </span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* T2 Cell */}
                                                    {depictedColumns.t2 && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.t2}
                                                                    onChange={(e) => setEditForm({ ...editForm, t2: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-emerald-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.t2 !== null && row.t2 !== undefined) ? (
                                                                    <span>🟢 {Number(row.t2).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* T3 Cell */}
                                                    {depictedColumns.t3 && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.t3}
                                                                    onChange={(e) => setEditForm({ ...editForm, t3: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-blue-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.t3 !== null && row.t3 !== undefined) ? (
                                                                    <span>🔵 {Number(row.t3).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* T4 Cell */}
                                                    {depictedColumns.t4 && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.t4}
                                                                    onChange={(e) => setEditForm({ ...editForm, t4: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-purple-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.t4 !== null && row.t4 !== undefined) ? (
                                                                    <span>🟣 {Number(row.t4).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* T5 Cell */}
                                                    {depictedColumns.t5 && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.t5}
                                                                    onChange={(e) => setEditForm({ ...editForm, t5: e.target.value })}
                                                                    placeholder="0"
                                                                    className="w-16 bg-black border border-slate-700 rounded px-1 py-0.5 text-right text-xs text-amber-300 font-mono"
                                                                />
                                                            ) : (
                                                                (row.t5 !== null && row.t5 !== undefined) ? (
                                                                    <span className="font-black text-amber-300">👑 {Number(row.t5).toLocaleString()}</span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Status Cell */}
                                                    {depictedColumns.status && (
                                                        <td className="py-2.5 px-3 text-center">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editForm.status}
                                                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                                                    placeholder="Arrived"
                                                                    className="w-18 bg-black border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white"
                                                                />
                                                            ) : (
                                                                row.status ? (
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold ${
                                                                        row.status.toLowerCase().includes('arrived') 
                                                                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
                                                                            : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                                                                    }`}>
                                                                        {row.status}
                                                                    </span>
                                                                ) : '—'
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Score Cell (omitted if duplicate) */}
                                                    {!isDuplicateScoreColumn && (
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.score}
                                                                    onChange={(e) => setEditForm({ ...editForm, score: e.target.value })}
                                                                    className="w-24 bg-black border border-slate-700 rounded px-2 py-0.5 text-right text-xs text-emerald-400"
                                                                />
                                                            ) : (
                                                                <span>{(Number(row.score) || 0).toLocaleString()}</span>
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* Source Frame Cell */}
                                                    <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-500">
                                                        {row.frameNumber ? (
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-400">
                                                                #{row.frameNumber}
                                                            </span>
                                                        ) : 'Manual'}
                                                    </td>

                                                    {/* Actions Cell */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        {isEditing ? (
                                                            <button
                                                                onClick={() => saveEditing(row.id)}
                                                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                                                title="Save changes"
                                                            >
                                                                <Check size={13} />
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => startEditing(row)}
                                                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                                                    title="Edit row"
                                                                >
                                                                    <Edit3 size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteRow(row.id)}
                                                                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                                                    title="Delete row"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>

            {/* Modal for Frame Fullscreen Preview */}
            {selectedFramePreview && (
                <div 
                    onClick={() => setSelectedFramePreview(null)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
                >
                    <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-slate-700 bg-black">
                        <img 
                            src={selectedFramePreview} 
                            alt="Screenshot Frame Preview" 
                            className="w-full h-full object-contain"
                        />
                        <button 
                            onClick={() => setSelectedFramePreview(null)}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
