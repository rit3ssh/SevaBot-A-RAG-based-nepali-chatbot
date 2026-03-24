import { useState } from 'react';
import DocumentsPanel from './DocumentsPanel';
import { Link } from 'react-router-dom';

export default function Sidebar({
  conversations,
  activeConversation,
  user,
  sidebarOpen,
  setSidebarOpen,
  onSelectConversation,
  onNewChat,
  onLogout,
  onDeleteConversation,
  isDark = false,
}) {
  const [showDocuments, setShowDocuments] = useState(false);

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className={`fixed inset-0 z-40 md:hidden backdrop-blur-[1px] ${isDark ? "bg-slate-950/60" : "bg-slate-950/45"}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-80 md:w-80 
          transform transition-transform duration-200 ease-out
          md:transform-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          flex flex-col border-r shadow-2xl
          ${
            isDark
              ? "bg-slate-900 border-slate-800 shadow-black/50"
              : "bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_35%,_#e2e8f0)] border-primary-800/80 shadow-primary-950/30"
          }
        `}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex-shrink-0 ${isDark ? "border-slate-800" : "border-primary-800/80"}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 ring-1 ring-primary-800/80 rounded-xl flex items-center justify-center shadow-lg shadow-black/30 overflow-hidden p-1">
                <img
                  src="/logo.png"
                  alt="SevaBot"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2
                  className={`text-base font-bold tracking-tight ${isDark ? "text-slate-100" : "text-gray-600"}`}
                >
                  Workspace
                </h2>
                <p
                  className={`text-[10px] leading-tight ${isDark ? "text-slate-400" : "text-gray-600"}`}
                >
                  Chat + Documents
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className={`md:hidden transition p-1 ${isDark ? "text-slate-400 hover:text-white" : "text-gray-100 hover:text-white"}`}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Tab Switcher */}
          <div
            className={`flex gap-1 p-1 rounded-xl mb-3 ${isDark ? "bg-slate-800/50" : "bg-primary-800/80"}`}
          >
            <button
              onClick={() => setShowDocuments(false)}
              className={`flex-1 py-1.5 px-2 rounded-md transition text-xs font-medium ${
                !showDocuments
                  ? isDark
                    ? "bg-slate-700 text-white shadow-sm"
                    : "bg-primary-700 text-gray-100 shadow-sm"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-primary-100 hover:text-primary-200"
              }`}
            >
              कुराकानी
            </button>
            <button
              onClick={() => setShowDocuments(true)}
              className={`flex-1 py-1.5 px-2 rounded-md transition text-xs font-medium ${
                showDocuments
                  ? isDark
                    ? "bg-slate-700 text-white shadow-sm"
                    : "bg-primary-700 text-gray-100 shadow-sm"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-primary-100 hover:text-primary-200"
              }`}
            >
              दस्तावेज
            </button>
          </div>

          {/* New Chat Button */}
          {!showDocuments && (
            <button
              onClick={onNewChat}
              className={`w-full py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 text-sm font-medium border ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
                  : "bg-primary-800 hover:bg-primary-700 text-primary-100 border-primary-700"
              }`}
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              नयाँ कुराकानी
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {showDocuments ? (
            <DocumentsPanel conversationId={activeConversation?.id} />
          ) : (
            <div className="p-2.5">
              {conversations.length === 0 ? (
                <div
                  className={`text-center py-10 px-4 text-xs ${isDark ? "text-slate-500" : "text-primary-400"}`}
                >
                  <p className="np-text">कुनै कुराकानी छैन।</p>
                  <p className="mt-1">नयाँ सुरु गर्नुहोस्!</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group relative rounded-xl mb-1.5 transition ${
                      activeConversation?.id === conv.id
                        ? isDark
                          ? "bg-slate-800 ring-1 text-slate-100 ring-slate-700"
                          : "bg-primary-800 ring-1 text-primary-100 ring-primary-800/80"
                        : isDark
                          ? "hover:bg-slate-800/60 hover:text-slate-100 text-slate-400"
                          : "hover:bg-primary-800/60 hover:text-primary-100 text-primary-600"
                    }`}
                  >
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className="w-full text-left p-3.5"
                    >
                      <div className="font-medium truncate text-sm  pr-6">
                        {conv.recent_exchange?.query || conv.title}
                      </div>
                      <div
                        className={`text-xs truncate mt-0.5 ${isDark ? "text-slate-500" : "text-primary-300"}`}
                      >
                        {conv.last_message?.content || "कुनै सन्देश छैन"}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className={`absolute top-2.5 right-2.5 p-1 opacity-0 group-hover:opacity-100 rounded-lg transition ${isDark ? "hover:bg-slate-700/40" : "hover:bg-primary-700/40"}`}
                      title="मेटाउनुहोस्"
                    >
                      <svg
                        className={`w-3.5 h-3.5 ${isDark ? "text-slate-500 hover:text-white" : "text-primary-300 hover:text-white"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User Section */}
        <div
          className={`p-3 border-t flex-shrink-0 ${isDark ? "bg-slate-900 border-slate-800" : "bg-primary-950/20 border-primary-800/80"}`}
        >
          <Link to="/profile" className="flex items-center gap-2.5 mb-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDark ? "bg-slate-700 text-slate-100" : "bg-primary-700 text-primary-100"}`}
            >
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`font-medium truncate text-sm ${isDark ? "text-slate-300" : "text-primary-500"}`}
              >
                {user?.username || "User"}
              </div>
              <div
                className={`text-[10px] truncate ${isDark ? "text-slate-500" : "text-primary-500"}`}
              >
                {user?.email || ""}
              </div>
            </div>
          </Link>

          <button
            onClick={onLogout}
            className={`w-full py-2.5 px-3 rounded-xl border font-semibold transition text-xs flex items-center justify-center gap-2 ${
              isDark
                ? "border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-600"
                : "border-primary-700 text-gray-600 hover:text-white hover:bg-primary-800 hover:border-primary-500"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            बाहिर निस्कनुहोस्
          </button>
        </div>
      </div>
    </>
  );
}