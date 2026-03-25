import { useState, useEffect } from 'react';
import { documentAPI } from '../services/api';

export default function DocumentsPanel() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDocuments();
    const intervalId = setInterval(() => {
      loadDocuments(false);
    }, 4000);

    return () => clearInterval(intervalId);
  }, []);
  
  const loadDocuments = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await documentAPI.list();
      const docs = response.data || [];
      docs.sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('यो दस्तावेज मेटाउन चाहनुहुन्छ?')) {
      return;
    }
    
    try {
      await documentAPI.delete(id);
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'प्रतीक्षारत', class: 'bg-black/20 text-primary-200 border-primary-700/40' },
      processing: { text: 'Embedding...', class: 'bg-primary-900/30 text-primary-200 border-primary-700/40' },
      completed: { text: 'सफल', class: 'bg-primary-800/40 text-white border-primary-600/50' },
      failed: { text: 'असफल', class: 'bg-black/30 text-primary-200 border-primary-700/40' },
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.class}`}>
        {badge.text}
      </span>
    );
  };
  
  if (loading) {
    return (
      <div className="p-6 text-center text-primary-300 text-xs">
        <div className="pulse-subtle">लोड गर्दै...</div>
      </div>
    );
  }
  
  if (documents.length === 0) {
    return (
      <div className="p-6 text-center text-primary-400">
        <div className="w-10 h-10 bg-primary-800 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span className="text-lg">📄</span>
        </div>
        <p className="text-xs np-text">कुनै दस्तावेज अपलोड गरिएको छैन</p>
        <p className="text-[10px] text-primary-500 mt-1">Upload PDFs using the 📎 button in chat</p>
      </div>
    );
  }
  
  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-end px-1">
        <button
          type="button"
          onClick={() => loadDocuments(true)}
          className="text-[10px] text-primary-300 hover:text-white transition"
        >
          Refresh
        </button>
      </div>
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="p-3.5 rounded-xl bg-primary-800/50 hover:bg-primary-800 transition group border border-primary-700/60"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">📄</span>
                <h3 className="font-medium text-primary-100 truncate text-xs">
                  {doc.filename}
                </h3>
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap">
                {getStatusBadge(doc.status)}
                {doc.num_chunks && (
                  <span className="text-[10px] text-primary-400">
                    {doc.num_chunks} chunks
                  </span>
                )}
              </div>
              
              {doc.error_message && (
                <p className="text-[10px] text-primary-300 mt-1.5 truncate">{doc.error_message}</p>
              )}
            </div>
            
            <button
              onClick={() => handleDelete(doc.id)}
              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-primary-700/40 rounded-lg transition flex-shrink-0"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5 text-primary-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}