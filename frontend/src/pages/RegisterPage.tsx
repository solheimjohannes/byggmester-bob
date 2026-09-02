import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';
import { useAuth } from '../context/useAuth';
import './AuthPage.css';

function getErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data: { code?: string; error?: string } }).data;
    if (data.code === 'EMAIL_TAKEN') return 'An account with that email already exists.';
    if (data.code === 'INVALID_INPUT') return 'Please check your details and try again.';
    if (data.error) return data.error;
  }
  return 'Something went wrong — please try again.';
}

export default function RegisterPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || !confirm) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await register({ name: name.trim() || undefined, email: email.trim(), password });
      setUser(user);
      navigate('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Create account</h1>

        {error && (
          <p className="auth-card__error" role="alert">{error}</p>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-form__label" htmlFor="name">
            Name <span className="auth-form__optional">(optional)</span>
          </label>
          <input
            id="name"
            className="auth-form__input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />

          <label className="auth-form__label" htmlFor="email">Email</label>
          <input
            id="email"
            className="auth-form__input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <label className="auth-form__label" htmlFor="password">Password</label>
          <input
            id="password"
            className="auth-form__input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <label className="auth-form__label" htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            className="auth-form__input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            required
          />

          <button
            type="submit"
            className="btn btn--primary auth-form__submit"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
