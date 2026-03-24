import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { conversationAPI, messageAPI } from "../services/api";
import { useAppLayout } from "../components/AppLayout";
import DocumentUpload from "../components/DocumentUpload";
import { transliterate } from "../utils/nepaliRomanized";

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // Shared layout state from AppLayout
  const {
    conversations,
    setConversations,
    activeConversation,
    setActiveConversation,
    setSidebarOpen,
    user,
    setUser,
    isDark,
    setIsDark,
    loadConversations,
    handleLogout,
  } = useAppLayout();

  const [messages, setMessages] = useState([]);
  const [inputRaw, setInputRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editRawContent, setEditRawContent] = useState("");
  const [lastSources, setLastSources] = useState(null);
  const [romanizedTypingEnabled, setRomanizedTypingEnabled] = useState(true);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [processingConversationId, setProcessingConversationId] =
    useState(null);

  const formatChatTimestamp = (isoString) => {
    if (!isoString) return "";
    const ts = new Date(isoString);
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const timePart = ts.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (ts >= startOfToday) {
      return timePart;
    }

    if (ts >= startOfYesterday) {
      return `Yesterday, ${timePart}`;
    }

    const datePart = ts.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${datePart} • ${timePart}`;
  };

  useEffect(() => {
    const savedRomanizedTyping = localStorage.getItem(
      "romanized-typing-enabled",
    );
    if (savedRomanizedTyping === "false") {
      setRomanizedTypingEnabled(false);
    }
  }, []);

  // Load conversation from sidebar navigation (location state)
  useEffect(() => {
    if (location.state?.conversationId) {
      if (location.state.fresh) {
        setMessages([]);
        setLastSources(null);
        setSelectedCitation(null);
      } else {
        loadConversation(location.state.conversationId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem(
      "romanized-typing-enabled",
      romanizedTypingEnabled ? "true" : "false",
    );
  }, [romanizedTypingEnabled]);

  useEffect(() => {
    if (!autoScrollEnabled) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, autoScrollEnabled]);

  const loadConversation = async (id) => {
    try {
      const response = await conversationAPI.get(id);
      setActiveConversation(response.data);
      const msgs = response.data.messages || [];
      setMessages(msgs);
      const lastAssistantWithSources = [...msgs]
        .reverse()
        .find((m) => m.role === "assistant" && m.sources);
      setLastSources(lastAssistantWithSources?.sources || null);
      setSelectedCitation(null);
      setRegeneratingMessageId(null);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const getLatestUserMessageId = (sourceMessages = messages) => {
    const latestUser = [...sourceMessages]
      .reverse()
      .find((message) => message.role === "user");
    return latestUser?.id ?? null;
  };

  const startNewChat = async () => {
    try {
      const response = await conversationAPI.create({ title: "नयाँ कुराकानी" });
      setConversations((prev) => [response.data, ...prev]);
      setActiveConversation(response.data);
      setMessages([]);
      setSidebarOpen(false);
      setLastSources(null);
      setSelectedCitation(null);
      return response.data;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  };

  const sendMessageToConversation = async (conversationId, content) => {
    setAutoScrollEnabled(true);
    setProcessingConversationId(conversationId);
    setLoading(true);
    const tempUserMessage = {
      id: Date.now(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInputRaw("");

    try {
      const response = await conversationAPI.addMessage(
        conversationId,
        content,
      );
      if (response.data.sources) {
        setLastSources(response.data.sources);
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter(
          (message) => message.id !== tempUserMessage.id,
        );
        return [
          ...withoutTemp,
          response.data.user_message,
          response.data.assistant_message,
        ];
      });

      loadConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) =>
        prev.filter((message) => message.id !== tempUserMessage.id),
      );
      alert("प्रश्न पठाउन असफल भयो। पुन: प्रयास गर्नुहोस्।");
    } finally {
      setLoading(false);
      setProcessingConversationId(null);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const toSend = romanizedTypingEnabled
      ? transliterate(inputRaw).trim()
      : inputRaw.trim();
    if (!toSend || loading) return;

    let targetConversation = activeConversation;
    if (!targetConversation) {
      targetConversation = await startNewChat();
      if (!targetConversation) return;
    }

    await sendMessageToConversation(targetConversation.id, toSend);
  };

  const handleDocumentUploadComplete = () => {
    loadConversations();
  };

  const handleStartEdit = (message) => {
    if (message.id !== getLatestUserMessageId()) return;
    setEditingMessageId(message.id);
    setEditRawContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditRawContent("");
  };

  const handleSaveEdit = async (messageId) => {
    if (messageId !== getLatestUserMessageId()) {
      return;
    }

    const toSend = romanizedTypingEnabled
      ? transliterate(editRawContent).trim()
      : editRawContent.trim();
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
        if (idx + 1 < updated.length && updated[idx + 1].role === "assistant") {
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
        const originalIndex = updated.findIndex(
          (message) => message.id === messageId,
        );
        if (originalIndex === -1) {
          return prev;
        }

        // Remove edited user + its immediate assistant pair from old timeline position.
        updated.splice(originalIndex, 1);
        if (
          originalIndex < updated.length &&
          updated[originalIndex].role === "assistant"
        ) {
          updated.splice(originalIndex, 1);
        }

        // Remove any duplicates from API payload, then reinsert exactly at original position.
        const deduped = updated.filter(
          (message) =>
            message.id !== response.data.user_message.id &&
            message.id !== response.data.assistant_message.id,
        );

        deduped.splice(
          originalIndex,
          0,
          response.data.user_message,
          response.data.assistant_message,
        );
        return deduped;
      });

      if (response.data.sources) {
        setLastSources(response.data.sources);
      }

      setEditingMessageId(null);
      setEditRawContent("");
    } catch (error) {
      console.error("Failed to edit message:", error);
      setMessages(previousMessages);
      alert("सन्देश सम्पादन असफल भयो।");
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
      console.error("Failed to copy:", error);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await conversationAPI.delete(conversationId);
      setConversations((prev) =>
        prev.filter((conversation) => conversation.id !== conversationId),
      );
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
        setLastSources(null);
        setSelectedCitation(null);
        setProcessingConversationId(null);
        setRegeneratingMessageId(null);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      alert("कुराकानी मेटाउन असफल भयो।");
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
      if (inputType?.startsWith("delete")) {
        return prev.slice(0, -1);
      }

      if (inputType === "insertFromPaste") {
        const pasted =
          clipboardData?.getData("text") ??
          incoming.clipboardData?.getData("text") ??
          targetValue;
        return pasted;
      }

      if (typeof data === "string") {
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
          const isUser = fileItem.source === "user_document";
          return (
            <span
              key={`${fileItem.source}-${fileItem.file}-${idx}`}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                isUser
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-primary-300 bg-primary-100 text-primary-800"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4l2 4 4 .5-3 3 .8 4L12 13l-3.8 2.5.8-4-3-3 4-.5z"
                />
              </svg>
              <span
                className="truncate max-w-[140px]"
                title={`${fileItem.file} (${isUser ? "User" : "Permanent"})`}
              >
                {fileItem.file}
              </span>
              <span className="uppercase text-[9px] tracking-wide">
                {isUser ? "USER" : "PERM"}
              </span>
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
          const isUser = cite.source === "user_document";
          const articleLabel = [cite.article, cite.clause]
            .filter(Boolean)
            .join(" ");
          const chipTitle = [
            cite.file,
            cite.chapter,
            articleLabel || null,
            cite.page ? `p.${cite.page}` : null,
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <button
              type="button"
              key={`${cite.id || cite.file}-${cite.chapter || ""}-${cite.article || ""}`}
              onClick={() => setSelectedCitation(cite)}
              className={`group inline-flex min-w-[180px] max-w-full items-start gap-1.5 rounded-xl border px-3 py-2 text-left transition hover:shadow ${
                isUser
                  ? "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300"
                  : "border-primary-200 bg-primary-50 text-primary-900 hover:border-primary-300"
              }`}
              title={chipTitle}
            >
              <div
                className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-semibold ${isUser ? "bg-blue-100 text-blue-700" : "bg-primary-100 text-primary-800"}`}
              >
                {isUser ? "USER" : "PERM"}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="flex items-center gap-1 text-[11px] font-semibold truncate"
                  title={cite.file}
                >
                  {cite.file}
                </div>
                <div
                  className="text-[11px] text-slate-600 truncate"
                  title={cite.chapter || "Chapter/Section"}
                >
                  {cite.chapter || "Chapter not captured"}
                </div>
                {articleLabel && (
                  <div
                    className="text-[11px] font-medium text-slate-700 truncate"
                    title={articleLabel}
                  >
                    {articleLabel}
                  </div>
                )}
              </div>
              {cite.page && (
                <span className="text-[10px] font-semibold text-slate-500">
                  p.{cite.page}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col flex-1 overflow-hidden ${isDark ? "bg-[radial-gradient(circle_at_top,_#1e293b,_#0f172a_45%,_#020617)]" : "bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_35%,_#e2e8f0)]"}`}
    >
      <div
        className={`border-b backdrop-blur px-4 py-3 md:px-6 flex items-center gap-3 ${isDark ? "border-primary-800 bg-primary-950/90" : "border-primary-600 bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_35%,_#e2e8f0)] text-primary-500"}`}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className={`md:hidden p-1.5 rounded-lg transition ${isDark ? "hover:bg-primary-900 text-primary-400" : "hover:bg-primary-600 text-primary-500"}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="SevaBot"
            className="w-8 h-8 object-contain"
          />
          <div className="hidden sm:block">
            <h1
              className={`text-base md:text-lg font-bold tracking-tight truncate ${isDark ? "text-primary-100" : "text-primary-500"}`}
            >
              SevaBot
            </h1>
            <p
              className={`text-xs tracking-tight truncate ${isDark ? "text-primary-300" : "text-primary-400"}`}
            >
              डिजिटल नागरिक बडापत्र
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDark((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${isDark ? "border-primary-800 bg-primary-900 text-slate-100 hover:bg-primary-800" : "border-primary-100 bg-primary-100 text-primary-500 hover:bg-primary-500 hover:text-primary-100"}`}
          title="Toggle theme"
        >
          <span>{isDark ? "☀️" : "🌙"}</span>
          <span>{isDark ? "Light" : "Dark"}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-3xl px-4 text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl overflow-hidden p-2">
                <img
                  src="/logo.png"
                  alt="SevaBot"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="np-heading text-2xl mb-2 text-primary-900">
                नमस्कार! म SevaBot हुँ
              </h2>
              <p className="text-primary-600 text-sm mb-8">
                नेपाली कानुनी सहायक — डिजिटल नागरिक बडापत्र
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="rounded-2xl border border-primary-200 bg-white/90 p-5 shadow-sm">
                  <h3 className="font-semibold text-sm text-primary-900 mb-3">
                    कसरी प्रयोग गर्ने
                  </h3>
                  <div className="space-y-3 text-sm">
                    <p>
                      <span className="font-semibold text-primary-800">1.</span>{" "}
                      PDF दस्तावेज अपलोड गर्नुहोस्
                    </p>
                    <p>
                      <span className="font-semibold text-primary-800">2.</span>{" "}
                      SBERT embedding र indexing पर्खनुहोस्
                    </p>
                    <p>
                      <span className="font-semibold text-primary-800">3.</span>{" "}
                      नेपालीमा प्रश्न सोध्नुहोस्
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-900 to-primary-800 p-5 shadow-sm text-primary-100">
                  <h3 className="font-semibold text-sm mb-3">Pipeline</h3>
                  <div className="text-xs space-y-2 text-primary-200">
                    <p>• Query Encoding with `multilingual-e5-large`</p>
                    <p>• Dense Retrieval from ChromaDB</p>
                    <p>• Cross-Encoder SBERT Reranking</p>
                    <p>• Grounded Nepali Response Generation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-5">
            {messages.map((message, index) => (
              <div key={message.id}>
                <div
                  className={`flex message-enter ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] md:max-w-[78%] rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-sm ${message.role === "user" ? "bg-primary-900 text-white shadow-primary-900/20" : isDark ? "bg-slate-900/90 border border-slate-700 text-slate-100" : "bg-white/95 border border-primary-200 text-primary-800"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-primary-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-primary-100 shadow-sm">
                            <img
                              src="/logo.png"
                              alt="Bot"
                              className="w-full h-full object-contain p-0.5"
                            />
                          </div>
                          <span className="font-semibold text-xs text-primary-700">
                            SevaBot
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyMessage(message.content)}
                          className="p-1.5 hover:bg-primary-100 rounded-lg transition"
                          title="प्रतिलिपि गर्नुहोस्"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-primary-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    )}

                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={
                            romanizedTypingEnabled
                              ? transliterate(editRawContent)
                              : editRawContent
                          }
                          onChange={(e) =>
                            handleRawChange(e, setEditRawContent)
                          }
                          className={`w-full px-1 py-1 rounded-lg text-sm transition border-0 outline-none focus:outline-none focus:ring-0 bg-transparent ${message.role === "user" ? "text-white placeholder:text-primary-300" : isDark ? "text-slate-100 placeholder:text-slate-400" : "text-primary-800 placeholder:text-primary-400"}`}
                          rows="3"
                          autoFocus
                          placeholder=""
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={handleCancelEdit}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${message.role === "user" ? "bg-white/10 text-white hover:bg-white/20" : isDark ? "bg-slate-700 text-slate-100 hover:bg-slate-600" : "bg-primary-100 text-primary-700 hover:bg-primary-200"}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(message.id)}
                            disabled={loading}
                            className="px-3 py-1.5 text-xs font-medium bg-white text-primary-900 hover:bg-primary-100 rounded-lg transition disabled:opacity-50"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap leading-relaxed text-sm np-text">
                          {message.content}
                        </div>
                        {message.role === "assistant" && (
                          <>
                            {renderCitationChips(
                              message.sources ||
                                (index === messages.length - 1
                                  ? lastSources
                                  : null),
                            )}
                            {/* {renderSourceBadges(message.sources || (index === messages.length - 1 ? lastSources : null))} */}
                          </>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div
                            className={`text-[10px] ${message.role === "user" ? "text-primary-300" : "text-primary-500"}`}
                          >
                            {formatChatTimestamp(message.created_at)}
                          </div>
                          {message.role === "user" &&
                            message.id === getLatestUserMessageId() && (
                              <button
                                onClick={() => handleStartEdit(message)}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                                title="सम्पादन गर्नुहोस्"
                              >
                                <svg
                                  className="w-3.5 h-3.5 text-primary-300"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                            )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {regeneratingMessageId === message.id &&
                  message.role === "user" &&
                  processingConversationId === activeConversation?.id && (
                    <div className="flex justify-start message-enter mt-2">
                      <div
                        className={`rounded-2xl border px-4 py-3 shadow-sm ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-primary-200 bg-white text-primary-800"}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-primary-100">
                            <img
                              src="/logo.png"
                              alt="Bot"
                              className="w-full h-full object-contain p-0.5"
                            />
                          </div>
                          <span
                            className={`text-xs ${isDark ? "text-slate-300" : "text-primary-600"}`}
                          >
                            SevaBot सोच्दैछ...
                          </span>
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
            ))}

            {loading &&
              !regeneratingMessageId &&
              processingConversationId === activeConversation?.id && (
                <div className="flex justify-start message-enter">
                  <div
                    className={`rounded-2xl border px-4 py-3 shadow-sm ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-primary-200 bg-white text-primary-800"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-primary-100">
                        <img
                          src="/logo.png"
                          alt="Bot"
                          className="w-full h-full object-contain p-0.5"
                        />
                      </div>
                      <span
                        className={`text-xs ${isDark ? "text-slate-300" : "text-primary-600"}`}
                      >
                        SevaBot सोच्दैछ...
                      </span>
                      <div className="flex gap-1 ml-1">
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div>
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div>
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full typing-dot"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div
        className={`border-t backdrop-blur px-4 py-3 md:px-6 ${isDark ? "border-slate-700/60 bg-slate-900/70" : "border-white/70 bg-white/80"}`}
      >
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div
            className={`relative rounded-2xl border shadow-sm ${isDark ? "border-slate-600 bg-slate-900" : "border-primary-300 bg-white"}`}
          >
            <textarea
              value={
                romanizedTypingEnabled ? transliterate(inputRaw) : inputRaw
              }
              onChange={(e) => handleRawChange(e, setInputRaw)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="आफ्नो प्रश्न नेपालीमा सोध्नुहोस्..."
              className={`w-full pl-12 pr-14 py-3 rounded-2xl resize-none transition text-sm np-text border-0 outline-none focus:outline-none focus:ring-0 ${isDark ? "bg-transparent text-slate-100 placeholder:text-slate-400" : "bg-transparent text-primary-900 placeholder:text-primary-500"}`}
              rows="1"
              disabled={loading}
              style={{ minHeight: "52px", maxHeight: "120px" }}
            />

            <div className="absolute top-1/2 -translate-y-1/2 left-3 z-10">
              <DocumentUpload
                conversationId={activeConversation?.id}
                onUploadComplete={handleDocumentUploadComplete}
              />
            </div>
            {!(romanizedTypingEnabled
              ? transliterate(inputRaw).trim()
              : inputRaw.trim()) && (
              <div className="mb-3 flex justify-end absolute top-1/2 -translate-y-1/2 right-20 z-10">
                <button
                  type="button"
                  onClick={() => setRomanizedTypingEnabled((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    romanizedTypingEnabled
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : isDark
                        ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  title="Romanized Nepali typing: type 'namaste' → नमस्ते"
                >
                  <span>{romanizedTypingEnabled ? "✓" : "○"}</span>
                  <span>Romanized नेपाली typing</span>
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                !(romanizedTypingEnabled
                  ? transliterate(inputRaw).trim()
                  : inputRaw.trim())
              }
              className="absolute top-1/2 -translate-y-1/2 right-3 bg-primary-900 hover:bg-primary-800 text-white p-2 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed z-10"
              title="पठाउनुहोस्"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {selectedCitation && (
        <div className="fixed bottom-2 right-6 z-50 max-w-md w-[360px] overflow-y-auto max-h-[calc(100vh-1rem)] no-scrollbar">
          <div
            className={`rounded-2xl border shadow-xl ${isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-primary-200 text-primary-900"}`}
          >
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3 text-sm font-semibold">
              <div className="truncate" title={selectedCitation.file}>
                {selectedCitation.file}
              </div>
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
                <span
                  className={`px-2 py-0.5 rounded-full ${selectedCitation.source === "user_document" ? "bg-blue-100 text-blue-800" : "bg-primary-100 text-primary-800"}`}
                >
                  {selectedCitation.source === "user_document"
                    ? "User document"
                    : "Permanent KB"}
                </span>
                {selectedCitation.page && (
                  <span className="text-slate-500">
                    p.{selectedCitation.page}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-[12px] text-slate-600">Chapter</div>
                <div className="text-sm font-semibold">
                  {selectedCitation.chapter || "Not captured"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[12px] text-slate-600">Article / दफा</div>
                <div className="text-sm font-semibold">
                  {[selectedCitation.article, selectedCitation.clause]
                    .filter(Boolean)
                    .join(" ") || "Not captured"}
                </div>
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
                  <div
                    className={`rounded-xl border px-3 py-2 text-[12px] leading-relaxed ${isDark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-primary-100 bg-primary-50 text-primary-900"}`}
                  >
                    {selectedCitation.preview}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-xs">
              <div className="text-slate-500 truncate">
                {selectedCitation.relevance_score
                  ? `Relevance: ${(selectedCitation.relevance_score * 100).toFixed(1)}%`
                  : ""}
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
