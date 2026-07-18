import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './AuthModal.css';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

/** Returns true if the string looks like an email address */
function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const navigate = useNavigate();

  // Sign-up fields
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');

  // Shared fields
  const [identifier, setIdentifier] = useState(''); // login: restaurant name OR email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      const trimmedName = restaurantName.trim();
      const trimmedEmail = email.trim();

      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { restaurant_name: trimmedName } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Store restaurant name + email in profiles table for name-based login
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          restaurant_name: trimmedName,
          email: trimmedEmail,
        });
      }

      onClose();
      navigate('/dashboard');

    } else {
      // Login: resolve identifier to email
      let loginEmail = identifier.trim();

      if (!isEmail(loginEmail)) {
        // Look up by restaurant name
        const { data, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('restaurant_name', loginEmail)
          .single();

        if (lookupError || !data?.email) {
          setError('No account found with that restaurant name.');
          setLoading(false);
          return;
        }
        loginEmail = data.email;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      onClose();
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <h2 className="modal-title">{mode === 'login' ? 'LOGIN' : 'SIGN UP'}</h2>

        <form className="modal-form" onSubmit={handleSubmit}>

          {mode === 'signup' ? (
            <>
              <div className="form-group">
                <label className="form-label">RESTAURANT NAME</label>
                <input
                  className="form-input"
                  type="text"
                  autoComplete="organization"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">EMAIL</label>
                <input
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">RESTAURANT NAME OR EMAIL</label>
              <input
                className="form-input"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">PASSWORD</label>
            <input
              className="form-input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === 'login' && (
              <span className="forgot-password">FORGOT PASSWORD?</span>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="modal-submit" type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="modal-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="modal-switch-btn"
            onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}
