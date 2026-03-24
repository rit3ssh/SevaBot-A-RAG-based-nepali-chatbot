import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-primary-50 flex">
      {/* Left Panel - Project Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 text-white flex-col justify-center px-16">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-white overflow-hidden rounded-xl flex items-center justify-center shadow-lg">
              <img src="/logo.png" alt="SevaBot" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SevaBot</h1>
              <p className="text-primary-300 text-sm">RAG-Based Nepali Legal Assistant</p>
            </div>
          </div>

          <h2 className="np-heading text-3xl mb-4 text-primary-100 leading-tight">
            नेपाली कानुनी दस्तावेज खोज प्रणाली
          </h2>
          <p className="text-primary-300 leading-relaxed mb-8">
            A Retrieval-Augmented Generation system for Nepali legal document analysis with SBERT-based semantic search and reranking.
          </p>

          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-800 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent-400 text-xs font-bold">01</span>
              </div>
              <div>
                <p className="font-medium text-primary-100">Semantic Retrieval</p>
                <p className="text-primary-400">SBERT multilingual-e5-large embeddings for Nepali text</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-800 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent-400 text-xs font-bold">02</span>
              </div>
              <div>
                <p className="font-medium text-primary-100">SBERT Reranking</p>
                <p className="text-primary-400">Bi-encoder reranking for improved retrieval precision</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-800 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent-400 text-xs font-bold">03</span>
              </div>
              <div>
                <p className="font-medium text-primary-100">LLM Generation</p>
                <p className="text-primary-400">Contextual Nepali answer generation with source attribution</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-primary-800">
            <p className="text-primary-500 text-xs">
              Bachelor's Project • Computer Engineering
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-12 h-12 bg-primary-700 overflow-hidden rounded-xl flex items-center justify-center shadow-md">
                <img src="/logo.png" alt="SevaBot" className="w-full h-full object-contain p-1" />
              </div>
              <span className="text-xl font-bold text-primary-900">SevaBot</span>
            </div>
            <p className="text-primary-500 text-sm">RAG-Based Nepali Legal Assistant</p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-primary-900 mb-1">Welcome Back</h2>
            <p className="text-primary-500 text-sm">Sign in to continue your research</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-primary-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-900 text-white py-2.5 rounded-lg font-medium hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-primary-500 mt-6 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-900 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}