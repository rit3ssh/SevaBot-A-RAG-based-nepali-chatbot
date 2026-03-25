import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { conversationAPI, authAPI, messageAPI, documentAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import DocumentUpload from '../components/DocumentUpload';
import { transliterate } from '../utils/nepaliRomanized';

export default function Chat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputRaw, setInputRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editRawContent, setEditRawContent] = useState('');
  const [lastSources, setLastSources] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [romanizedTypingEnabled, setRomanizedTypingEnabled] = useState(true);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [processingConversationId, setProcessingConversationId] = useState(null);
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [allUploadedDocuments, setAllUploadedDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [hasAnyUploadedDocuments, setHasAnyUploadedDocuments] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const formatChatTimestamp = (isoString) => {
    if (!isoString) return '';
    const ts = new Date(isoString);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const timePart = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (ts >= startOfToday) {
      return timePart;
    }

    if (ts >= startOfYesterday) {
      return `Yesterday, ${timePart}`;
    }

    const datePart = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${datePart} • ${timePart}`;
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const savedTheme = localStorage.getItem('chat-theme');
    const savedRomanizedTyping = localStorage.getItem('romanized-typing-enabled');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    if (savedTheme === 'dark') {
      setIsDark(true);
    }
    if (savedRomanizedTyping === 'false') {
      setRomanizedTypingEnabled(false);
    }

    const bootstrap = async () => {
      try {
        const conversationsData = await loadConversations();
        await loadAvailableDocuments();

        const savedConversationIdRaw = localStorage.getItem('activeConversationId');
        const savedConversationId = savedConversationIdRaw ? Number(savedConversationIdRaw) : null;

        if (savedConversationId && conversationsData.some((conversation) => conversation.id === savedConversationId)) {
          await loadConversation(savedConversationId);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    localStorage.setItem('chat-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('romanized-typing-enabled', romanizedTypingEnabled ? 'true' : 'false');
  }, [romanizedTypingEnabled]);

  useEffect(() => {
    if (!autoScrollEnabled) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, autoScrollEnabled]);

  const loadConversations = async () => {
    try {
      const response = await conversationAPI.list();
      setConversations(response.data);
      return response.data || [];
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  };

  const loadConversation = async (id) => {
    try {
      const response = await conversationAPI.get(id);
      setActiveConversation(response.data);
      localStorage.setItem('activeConversationId', String(response.data.id));
      const msgs = response.data.messages || [];
      setMessages(msgs);
      // Pick latest assistant message with sources to display chips after reload
      const lastAssistantWithSources = [...msgs].reverse().find((m) => m.role === 'assistant' && m.sources);
      setLastSources(lastAssistantWithSources?.sources || null);
      setSelectedDocumentIds([]);
      setSelectedCitation(null);
      setRegeneratingMessageId(null);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const getLatestUserMessageId = (sourceMessages = messages) => {
    const latestUser = [...sourceMessages].reverse().find((message) => message.role === 'user');
    return latestUser?.id ?? null;
  };

  const startNewChat = async (options = {}) => {
    const scope = options.retrievalScope || 'conversation';
    const selectedIds = (options.selectedDocumentIds || []).map((value) => Number(value)).filter(Boolean);

    try {
      const payload = {
        title: 'नयाँ कुराकानी',
        retrieval_scope: scope,
        selected_document_ids: scope === 'selected' ? selectedIds : [],
      };

      const response = await conversationAPI.create(payload);
      setConversations((prev) => [response.data, ...prev]);
      setActiveConversation(response.data);
      localStorage.setItem('activeConversationId', String(response.data.id));
      setMessages([]);
      setSidebarOpen(false);
      setLastSources(null);
      setSelectedCitation(null);
      setRegeneratingMessageId(null);
      setProcessingConversationId(null);
      setSelectedDocumentIds([]);
      return response.data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const loadAvailableDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const response = await documentAPI.list();
      const allDocs = response.data || [];
      setHasAnyUploadedDocuments(allDocs.length > 0);
      setAllUploadedDocuments(allDocs);
      const completedDocs = allDocs.filter((doc) => doc.status === 'completed');
      setAvailableDocuments(completedDocs);
    } catch (error) {
      console.error('Failed to load available documents:', error);
      setHasAnyUploadedDocuments(false);
      setAllUploadedDocuments([]);
      setAvailableDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const openNewChatScopeModal = async () => {
    localStorage.removeItem('activeConversationId');
    setActiveConversation(null);
    setMessages([]);
    setLastSources(null);
    setSelectedCitation(null);
    setRegeneratingMessageId(null);
    setProcessingConversationId(null);
    setSelectedDocumentIds([]);
    setSidebarOpen(false);
    await loadAvailableDocuments();
  };

  const toggleSelectedDocument = (docId) => {
    const targetDoc = allUploadedDocuments.find((doc) => Number(doc.id) === Number(docId));
    if (targetDoc && targetDoc.status !== 'completed') {
      return;
    }

    setSelectedDocumentIds((prev) => (
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    ));
  };

  const getDocumentStatusMeta = (statusValue) => {
    const normalized = (statusValue || '').toLowerCase();
    if (normalized === 'completed') {
      return {
        label: 'completed',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    }
    if (normalized === 'processing') {
      return {
        label: 'processing',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    }
    if (normalized === 'pending') {
      return {
        label: 'pending',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    }
    if (normalized === 'failed') {
      return {
        label: 'failed',
        className: 'bg-rose-100 text-rose-700 border-rose-200',
      };
    }
    return {
      label: normalized || 'unknown',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  };

  const getSelectedConversationFileNames = (conversation) => {
    if (!conversation || conversation.retrieval_scope !== 'selected') return [];

    const selectedIds = Array.isArray(conversation.selected_document_ids)
      ? conversation.selected_document_ids
      : [];

    if (!selectedIds.length) return [];

    const names = selectedIds
      .map((selectedId) => (
        availableDocuments.find((doc) => Number(doc.id) === Number(selectedId))?.filename
      ))
      .filter(Boolean);

    if (names.length) {
      return names;
    }

    return selectedIds.map((selectedId) => `Document ${selectedId}`);
  };

  const sendMessageToConversation = async (conversationId, content) => {
    setAutoScrollEnabled(true);
    setProcessingConversationId(conversationId);
    setLoading(true);
    const tempUserMessage = {
      id: Date.now(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInputRaw('');

    try {
      const response = await conversationAPI.addMessage(conversationId, content);
      if (response.data.sources) {
        setLastSources(response.data.sources);
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter((message) => message.id !== tempUserMessage.id);
        return [...withoutTemp, response.data.user_message, response.data.assistant_message];
      });

      loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((message) => message.id !== tempUserMessage.id));
      alert('प्रश्न पठाउन असफल भयो। पुन: प्रयास गर्नुहोस्।');
    } finally {
      setLoading(false);
      setProcessingConversationId(null);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const toSend = romanizedTypingEnabled ? transliterate(inputRaw).trim() : inputRaw.trim();
    if (!toSend || loading) return;

    let targetConversation = activeConversation;
    if (!targetConversation) {
      const retrievalScope = selectedDocumentIds.length > 0 ? 'selected' : 'conversation';
      targetConversation = await startNewChat({
        retrievalScope,
        selectedDocumentIds,
      });
      if (!targetConversation) return;
    }

    await sendMessageToConversation(targetConversation.id, toSend);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const handleDocumentUploadComplete = () => {
    loadConversations();
    loadAvailableDocuments();
  };

  const handleStartEdit = (message) => {
    if (message.id !== getLatestUserMessageId()) return;
    setEditingMessageId(message.id);
    setEditRawContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditRawContent('');
  };

  const handleSaveEdit = async (messageId) => {
    if (messageId !== getLatestUserMessageId()) {
      return;
    }

    const toSend = romanizedTypingEnabled ? transliterate(editRawContent).trim() : editRawContent.trim();
    if (!toSend) return;
    const previousMessages = [...messages];

    // Keep viewport anchored around edited message while regenerating.
    setAutoScrollEnabled(false);

    // Optimistically update user message text and remove following assistant reply while loading
    setMessages((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], content: toSend };
        if (idx + 1 < updated.length && updated[idx + 1].role === 'assistant') {
          updated.splice(idx + 1, 1);
        }
      }
      return updated;
    });
    setLastSources(null);
    setProcessingConversationId(activeConversation?.id ?? null);
    setRegeneratingMessageId(messageId);
    setLoading(true);
    try {
      const response = await messageAPI.update(messageId, toSend);
      setMessages((prev) => {
        const updated = [...prev];
        const originalIndex = updated.findIndex((message) => message.id === messageId);
        if (originalIndex === -1) {
          return prev;
        }

        // Remove edited user + its immediate assistant pair from old timeline position.
        updated.splice(originalIndex, 1);
        if (originalIndex < updated.length && updated[originalIndex].role === 'assistant') {
          updated.splice(originalIndex, 1);
        }

        // Remove any duplicates from API payload, then reinsert exactly at original position.
        const deduped = updated.filter(
          (message) =>
            message.id !== response.data.user_message.id &&
            message.id !== response.data.assistant_message.id
        );

        deduped.splice(originalIndex, 0, response.data.user_message, response.data.assistant_message);
        return deduped;
      });

      if (response.data.sources) {
        setLastSources(response.data.sources);
      }

      setEditingMessageId(null);
      setEditRawContent('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      setMessages(previousMessages);
      alert('सन्देश सम्पादन असफल भयो।');
    } finally {
      setLoading(false);
      setRegeneratingMessageId(null);
      setProcessingConversationId(null);
      // Re-enable for future normal sends (no immediate jump because effect triggers on message changes).
      setAutoScrollEnabled(true);
    }
  };

  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await conversationAPI.delete(conversationId);
      setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
      if (activeConversation?.id === conversationId) {
        localStorage.removeItem('activeConversationId');
        setActiveConversation(null);
        setMessages([]);
        setLastSources(null);
        setSelectedCitation(null);
        setProcessingConversationId(null);
        setRegeneratingMessageId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('कुराकानी मेटाउन असफल भयो।');
    }
  };

  const handleRawChange = (incoming, setRaw) => {
    if (!romanizedTypingEnabled) {
      setRaw(incoming.target.value);
      return;
    }

    const { inputType, data, clipboardData } = incoming.nativeEvent || {};
    const targetValue = incoming.target.value;

    setRaw((prev) => {
      // Basic append / delete-at-end handling keeps roman context.
      if (inputType?.startsWith('delete')) {
        return prev.slice(0, -1);
      }

      if (inputType === 'insertFromPaste') {
        const pasted = clipboardData?.getData('text') ?? incoming.clipboardData?.getData('text') ?? targetValue;
        return pasted;
      }

      if (typeof data === 'string') {
        return prev + data;
      }

      // Fallback: keep previous to avoid corrupting roman buffer when cursor edits occur.
      return prev;
    });
  };

  const renderSourceBadges = (sources) => {
    if (!sources?.files || !sources.files.length) return null;

    return (
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {sources.files.map((fileItem, idx) => {
          const isUser = fileItem.source === 'user_document';
          return (
            <span
              key={`${fileItem.source}-${fileItem.file}-${idx}`}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${isUser
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-primary-300 bg-primary-100 text-primary-800'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4l2 4 4 .5-3 3 .8 4L12 13l-3.8 2.5.8-4-3-3 4-.5z" />
              </svg>
              <span className="truncate max-w-[140px]" title={`${fileItem.file} (${isUser ? 'User' : 'Permanent'})`}>
                {fileItem.file}
              </span>
              <span className="uppercase text-[9px] tracking-wide">{isUser ? 'USER' : 'PERM'}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const renderCitationChips = (sources) => {
    const citations = sources?.citations;
    if (!citations || !citations.length) return null;

    return (
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {citations.map((cite) => {
          const isUser = cite.source === 'user_document';
          const articleLabel = [cite.article, cite.clause].filter(Boolean).join(' ');
          const chipTitle = [cite.file, cite.chapter, articleLabel || null, cite.page ? `p.${cite.page}` : null]
            .filter(Boolean)
            .join(' • ');

          return (
            <button
              type="button"
              key={`${cite.id || cite.file}-${cite.chapter || ''}-${cite.article || ''}`}
              onClick={() => setSelectedCitation(cite)}
              className={`group inline-flex min-w-[180px] max-w-full items-start gap-1.5 rounded-xl border px-3 py-2 text-left transition hover:shadow ${isUser
                ? 'border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300'
                : 'border-primary-200 bg-primary-50 text-primary-900 hover:border-primary-300'}`}
              title={chipTitle}
            >
              <div className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-semibold ${isUser ? 'bg-blue-100 text-blue-700' : 'bg-primary-100 text-primary-800'}`}>
                {isUser ? 'USER' : 'PERM'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-semibold truncate" title={cite.file}>{cite.file}</div>
                <div className="text-[11px] text-slate-600 truncate" title={cite.chapter || 'Chapter/Section'}>{cite.chapter || 'Chapter not captured'}</div>
                {articleLabel && (
                  <div className="text-[11px] font-medium text-slate-700 truncate" title={articleLabel}>{articleLabel}</div>
                )}
              </div>
              {cite.page && <span className="text-[10px] font-semibold text-slate-500">p.{cite.page}</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onSelectConversation={loadConversation}
        onNewChat={openNewChatScopeModal}
        onLogout={handleLogout}
        onDeleteConversation={handleDeleteConversation}
      />

      <div className={`flex-1 min-w-0 flex flex-col ${isDark ? 'bg-[radial-gradient(circle_at_top,_#1e293b,_#0f172a_45%,_#020617)]' : 'bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_35%,_#e2e8f0)]'}`}>
        <div className={`border-b backdrop-blur px-4 py-3 md:px-6 flex items-center gap-3 ${isDark ? 'border-slate-700/60 bg-slate-900/70' : 'border-white/70 bg-white/80'}`}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-primary-100 rounded-lg transition text-primary-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <h1 className={`text-base md:text-lg font-bold tracking-tight truncate ${isDark ? 'text-slate-100' : 'text-primary-900'}`}>SevaBot</h1>
            <p className={`text-base md:text-sm  tracking-tight truncate ${isDark ? 'text-slate-100' : 'text-primary-900'}`}>RAG-Based Nepali Legal Assistant</p>
          </div>
          <button
            onClick={() => setIsDark((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${isDark ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-primary-200 bg-white text-primary-700 hover:bg-primary-50'}`}
            title="Toggle theme"
          >
            <span>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {isInitializing ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-300 border-t-primary-700" />
                <p className="text-sm text-slate-500">Loading conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-full max-w-3xl px-4 text-center">
                {!activeConversation ? (
                  <>
                    {!hasAnyUploadedDocuments ? (
                      <>
                        <div className="w-16 h-16 bg-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-900/20"><span className="text-3xl">&#x1F64F;</span></div>
                        <h2 className="np-heading text-2xl mb-2 text-primary-900">नमस्कार!</h2>
                        <p className="text-primary-600 text-sm mb-8">तपाईंको नेपाली कानुनी सहायक — Retrieval-Augmented Generation with SBERT Reranking</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 bg-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary-900/20"><span className="text-2xl">💬</span></div>
                        <h2 className="np-heading text-xl mb-2 text-primary-900">Select documents to start</h2>
                        <p className="text-primary-600 text-sm mb-6">नयाँ च्याट सुरु गर्नु अघि पुराना दस्तावेज छान्न सक्नुहुन्छ।</p>

                        <div className="grid md:grid-cols-2 gap-4 text-left mb-6">
                          <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/90 border-primary-200'} md:col-span-2`}>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-primary-900'}`}>Your uploaded documents</h3>
                              <button
                                type="button"
                                onClick={loadAvailableDocuments}
                                className={`text-xs font-medium ${isDark ? 'text-slate-300 hover:text-white' : 'text-primary-700 hover:text-primary-900'}`}
                              >
                                Refresh
                              </button>
                            </div>

                            {loadingDocuments ? (
                              <div className="text-xs text-slate-500 py-4 text-center">दस्तावेज लोड हुँदैछ...</div>
                            ) : allUploadedDocuments.length === 0 ? (
                              <div className="text-xs text-slate-500 py-4 text-center">दस्तावेज भेटिएन।</div>
                            ) : (
                              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                {allUploadedDocuments.map((doc) => {
                                  const isCompleted = doc.status === 'completed';
                                  const statusMeta = getDocumentStatusMeta(doc.status);
                                  return (
                                    <button
                                      type="button"
                                      key={doc.id}
                                      onClick={() => toggleSelectedDocument(doc.id)}
                                      disabled={!isCompleted}
                                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${selectedDocumentIds.includes(doc.id)
                                        ? 'border-primary-500 bg-primary-50'
                                        : isDark ? 'border-slate-700 hover:border-slate-500' : 'border-primary-100 hover:border-primary-300'} ${!isCompleted ? 'cursor-not-allowed opacity-80' : ''}`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-primary-900'}`}>{doc.filename}</div>
                                          <div className="text-[11px] text-slate-500">
                                            {doc.num_pages != null && Number(doc.num_pages) > 0
                                              ? `${doc.num_pages} pages`
                                              : doc.status === 'completed'
                                                ? 'Processed document'
                                                : 'Pages not ready'}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusMeta.className}`}>
                                            {statusMeta.label}
                                          </span>
                                          <input
                                            type="checkbox"
                                            checked={selectedDocumentIds.includes(doc.id)}
                                            disabled={!isCompleted}
                                            onChange={() => toggleSelectedDocument(doc.id)}
                                            onClick={(event) => event.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className={`rounded-2xl border border-dashed p-4 flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-primary-300 bg-white/90'}`}>
                            <div>
                              <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-primary-900'}`}>Upload more documents</h4>
                              <p className="text-xs text-slate-500">नयाँ PDF अपलोड गरेर तुरुन्त प्रयोग गर्न सक्नुहुन्छ।</p>
                            </div>
                            <DocumentUpload conversationId={null} onUploadComplete={handleDocumentUploadComplete} />
                          </div>

                          <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white/90 border-primary-200'}`}>
                            <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-primary-900'}`}>Current selection</h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {selectedDocumentIds.length > 0
                                ? `${selectedDocumentIds.length} document selected — first message पछि selected-scope chat सुरु हुन्छ।`
                                : 'No document selected — पहिलो प्रश्नपछि permanent knowledge base प्रयोग हुनेछ।'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary-900/20"><span className="text-2xl">💬</span></div>
                    <h2 className="np-heading text-xl mb-2 text-primary-900">Start this conversation</h2>
                    <p className="text-primary-600 text-sm mb-8">तल प्रश्न टाइप गरेर सोही scope अनुसार उत्तर पाउनुहोस्।</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-5">
              {messages.map((message, index) => {
                const selectedFileNames = getSelectedConversationFileNames(activeConversation);
                return (
                <div key={message.id}>
                  {message.role === 'user' &&
                    index === messages.findIndex((item) => item.role === 'user') &&
                    selectedFileNames.length > 0 && (
                    <div className="mb-2 flex justify-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${isDark ? 'bg-slate-900 text-slate-300 border border-slate-700' : 'bg-white text-primary-700 border border-primary-200'}`}>
                        {selectedFileNames.join(', ')}
                      </span>
                    </div>
                  )}
                  <div className={`flex message-enter ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] md:max-w-[78%] rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-sm ${message.role === 'user' ? 'bg-primary-900 text-white shadow-primary-900/20' : isDark ? 'bg-slate-900/90 border border-slate-700 text-slate-100' : 'bg-white/95 border border-primary-200 text-primary-800'}`}>
                    {message.role === 'assistant' && (
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-primary-100">
                        <div className="flex items-center gap-2"><div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center"><span className="text-xs">⚖️</span></div><span className="font-semibold text-xs text-primary-700">SevaBot</span></div>
                        <button onClick={() => handleCopyMessage(message.content)} className="p-1.5 hover:bg-primary-100 rounded-lg transition" title="प्रतिलिपि गर्नुहोस्"><svg className="w-3.5 h-3.5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                      </div>
                    )}

                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={romanizedTypingEnabled ? transliterate(editRawContent) : editRawContent}
                          onChange={(e) => handleRawChange(e, setEditRawContent)}
                          className={`w-full px-1 py-1 rounded-lg text-sm transition border-0 outline-none focus:outline-none focus:ring-0 bg-transparent ${message.role === 'user' ? 'text-white placeholder:text-primary-300' : isDark ? 'text-slate-100 placeholder:text-slate-400' : 'text-primary-800 placeholder:text-primary-400'}`}
                          rows="3"
                          autoFocus
                          placeholder=""
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={handleCancelEdit} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${message.role === 'user' ? 'bg-white/10 text-white hover:bg-white/20' : isDark ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>Cancel</button>
                          <button onClick={() => handleSaveEdit(message.id)} disabled={loading} className="px-3 py-1.5 text-xs font-medium bg-white text-primary-900 hover:bg-primary-100 rounded-lg transition disabled:opacity-50">OK</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap leading-relaxed text-sm np-text">{message.content}</div>
                        {message.role === 'assistant' && (
                          <>
                            {renderCitationChips(message.sources || (index === messages.length - 1 ? lastSources : null))}
                            {/* {renderSourceBadges(message.sources || (index === messages.length - 1 ? lastSources : null))} */}
                          </>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div className={`text-[10px] ${message.role === 'user' ? 'text-primary-300' : 'text-primary-500'}`}>{formatChatTimestamp(message.created_at)}</div>
                          {message.role === 'user' && message.id === getLatestUserMessageId() && (
                            <button onClick={() => handleStartEdit(message)} className="p-1.5 hover:bg-white/10 rounded-lg transition" title="सम्पादन गर्नुहोस्"><svg className="w-3.5 h-3.5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                  {regeneratingMessageId === message.id && message.role === 'user' && processingConversationId === activeConversation?.id && (
                    <div className="flex justify-start message-enter mt-2">
                      <div className={`rounded-2xl border px-4 py-3 shadow-sm ${isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-primary-200 bg-white text-primary-800'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center"><span className="text-xs">⚖️</span></div>
                          <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-primary-600'}`}>Retrieving & reranking...</span>
                          <div className="flex gap-1 ml-1">
                            <div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div>
                            <div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div>
                            <div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );})}

              {loading && !regeneratingMessageId && processingConversationId === activeConversation?.id && (
                <div className="flex justify-start message-enter">
                  <div className="rounded-2xl border border-primary-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center"><span className="text-xs">⚖️</span></div><span className="text-xs text-primary-600">Retrieving & reranking...</span><div className="flex gap-1 ml-1"><div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div><div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div><div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div></div></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

          <div className={`border-t backdrop-blur px-4 py-3 md:px-6 ${isDark ? 'border-slate-700/60 bg-slate-900/70' : 'border-white/70 bg-white/80'}`}>
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setRomanizedTypingEnabled((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  romanizedTypingEnabled
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : isDark
                    ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="Romanized Nepali typing: type 'namaste' → नमस्ते"
              >
                <span>{romanizedTypingEnabled ? '✓' : '○'}</span>
                <span>Romanized नेपाली typing</span>
              </button>
            </div>
            <div className={`relative rounded-2xl border shadow-sm ${isDark ? 'border-slate-600 bg-slate-900' : 'border-primary-300 bg-white'}`}>
              <textarea
                value={romanizedTypingEnabled ? transliterate(inputRaw) : inputRaw}
                onChange={(e) => handleRawChange(e, setInputRaw)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="आफ्नो प्रश्न नेपालीमा सोध्नुहोस्..."
                className={`w-full pl-12 pr-12 py-3 rounded-2xl resize-none transition text-sm np-text border-0 outline-none focus:outline-none focus:ring-0 ${isDark ? 'bg-transparent text-slate-100 placeholder:text-slate-400' : 'bg-transparent text-primary-900 placeholder:text-primary-500'}`}
                rows="1"
                disabled={loading}
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />

              <div className="absolute top-1/2 -translate-y-1/2 left-3">
                <DocumentUpload conversationId={activeConversation?.id} onUploadComplete={handleDocumentUploadComplete} />
              </div>

              <button type="submit" disabled={loading || !(romanizedTypingEnabled ? transliterate(inputRaw).trim() : inputRaw.trim())} className="absolute top-1/2 -translate-y-1/2 right-3 bg-primary-900 hover:bg-primary-800 text-white p-2 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed" title="पठाउनुहोस्">
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {selectedCitation && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-[360px]">
          <div className={`rounded-2xl border shadow-xl ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-primary-200 text-primary-900'}`}>
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3 text-sm font-semibold">
              <div className="truncate" title={selectedCitation.file}>{selectedCitation.file}</div>
              <button
                type="button"
                onClick={() => setSelectedCitation(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-xs"
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold">
                <span className={`px-2 py-0.5 rounded-full ${selectedCitation.source === 'user_document' ? 'bg-blue-100 text-blue-800' : 'bg-primary-100 text-primary-800'}`}>
                  {selectedCitation.source === 'user_document' ? 'User document' : 'Permanent KB'}
                </span>
                {selectedCitation.page && <span className="text-slate-500">p.{selectedCitation.page}</span>}
              </div>
              <div className="space-y-1">
                <div className="text-[12px] text-slate-600">Chapter</div>
                <div className="text-sm font-semibold">{selectedCitation.chapter || 'Not captured'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[12px] text-slate-600">Article / दफा</div>
                <div className="text-sm font-semibold">{[selectedCitation.article, selectedCitation.clause].filter(Boolean).join(' ') || 'Not captured'}</div>
              </div>
              {selectedCitation.title && (
                <div className="space-y-1">
                  <div className="text-[12px] text-slate-600">Section</div>
                  <div className="text-sm">{selectedCitation.title}</div>
                </div>
              )}
              {selectedCitation.preview && (
                <div className="space-y-1">
                  <div className="text-[12px] text-slate-600">Snippet</div>
                  <div className={`max-h-72 overflow-y-auto rounded-xl border px-3 py-2 text-[12px] leading-relaxed ${isDark ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-primary-100 bg-primary-50 text-primary-900'}`}>
                    {selectedCitation.preview}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-xs">
              <div className="text-slate-500 truncate">
                {selectedCitation.relevance_score ? `Relevance: ${(selectedCitation.relevance_score * 100).toFixed(1)}%` : ''}
              </div>
              {selectedCitation.preview && (
                <button
                  type="button"
                  onClick={() => handleCopyMessage(selectedCitation.preview)}
                  className="px-3 py-1.5 rounded-lg bg-primary-900 text-white hover:bg-primary-800 transition"
                >
                  Copy snippet
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}