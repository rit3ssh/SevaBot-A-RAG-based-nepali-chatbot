import { useState, useRef } from 'react';
import { documentAPI } from '../services/api';

export default function DocumentUpload({ conversationId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.pdf')) {
      setError('PDF मात्र');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('10MB max');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setError('');
    setUploading(true);
    
    try {
      const response = await documentAPI.upload(file, conversationId || null);
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
      setUploading(false);
      setProcessing(true);
      
      pollDocumentStatus(response.data.id);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError('असफल');
      setUploading(false);
      setTimeout(() => setError(''), 3000);
    }

    e.target.value = '';
  };
  
  const pollDocumentStatus = async (docId) => {
    const maxAttempts = 60;
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await documentAPI.get(docId);
        const status = response.data.status;
        
        if (status === 'completed') {
          setProcessing(false);
          if (onUploadComplete) {
            onUploadComplete(response.data);
          }
          return;
        }
        
        if (status === 'failed') {
          setProcessing(false);
          if (onUploadComplete) {
            onUploadComplete(response.data);
          }
          setError('प्रक्रिया असफल');
          setTimeout(() => setError(''), 3000);
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setProcessing(false);
          setError('समय समाप्त');
          setTimeout(() => setError(''), 3000);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setProcessing(false);
      }
    };
    
    poll();
  };
  
  return (
    <div className="relative group">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || processing}
        type="button"
        className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        title="PDF अपलोड गर्नुहोस्"
      >
        {uploading || processing ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )}
      </button>
      
      {/* Status tooltip */}
      {(uploading || processing) && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-primary-900 text-white text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg border border-primary-700">
          {uploading ? 'अपलोड हुँदैछ...' : 'SBERT embedding...'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-900" />
        </div>
      )}
      
      {error && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg border border-primary-800">
          {error}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black" />
        </div>
      )}
    </div>
  );
}