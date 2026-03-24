import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (formData.password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/chat');
    } catch (err) {
      setErrors(err.response?.data || { general: 'Signup failed. Please try again.' });
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
            Upload Nepali legal documents and ask questions in natural language.
            Our system uses semantic search with SBERT reranking to find the most relevant
            legal provisions and generate accurate answers.
          </p>

          <div className="bg-primary-800/50 rounded-lg p-5 border border-primary-700">
            <h3 className="text-sm font-semibold text-primary-200 mb-3">System Architecture</h3>
            <div className="space-y-2 text-xs text-primary-400">
              <p>• <span className="text-primary-200">Embedding:</span> multilingual-e5-large (SBERT)</p>
              <p>• <span className="text-primary-200">Vector Store:</span> ChromaDB</p>
              <p>• <span className="text-primary-200">Reranking:</span> Bi-encoder SBERT reranking</p>
              <p>• <span className="text-primary-200">Generation:</span> LLaMA 3.3 70B via Groq</p>
              <p>• <span className="text-primary-200">Backend:</span> Django REST Framework</p>
              <p>• <span className="text-primary-200">Frontend:</span> React + Vite</p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-primary-800">
            <p className="text-primary-500 text-xs">
              Bachelor's Project • Computer Engineering
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
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
            <h2 className="text-2xl font-semibold text-primary-900 mb-1">Create Account</h2>
            <p className="text-primary-500 text-sm">Join to start using the legal assistant</p>
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {errors.general}
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
                placeholder="Choose a username"
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm"
                placeholder="your@email.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
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
                placeholder="Minimum 8 characters"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary-700 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm"
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-900 text-white py-2.5 rounded-lg font-medium hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-primary-500 mt-6 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-900 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}