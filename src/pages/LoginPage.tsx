import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { errorMessage } from '../api';
import Button from '../components/Button';
import { TextField } from '../components/Field';
import { environmentInfo } from '../env';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const env = environmentInfo();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(errorMessage(err, 'Connexion impossible. Vérifiez vos identifiants.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit} aria-labelledby="login-title" noValidate>
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <div>
            <div id="login-title" className="login-title">
              AlKÉ Finance
            </div>
            <div className="login-sub">Back-office opérations, conformité et support</div>
          </div>
        </div>

        <TextField
          id="login-identifier"
          label="E-mail ou téléphone"
          type="text"
          autoComplete="username"
          autoFocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          error={error && !identifier.trim() ? 'Indiquez votre identifiant.' : undefined}
        />
        <TextField
          id="login-password"
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="notice notice-danger login-error" role="alert">
            {error}
          </div>
        )}

        <Button variant="primary" type="submit" busy={submitting} className="btn-block">
          Se connecter
        </Button>

        <p className="login-footer">
          Accès réservé au personnel autorisé — toute action est journalisée.
          <span className="login-env">
            <span className={`env-pill env-${env.tone}`}>
              {env.name} · {env.host}
            </span>
          </span>
        </p>
      </form>
    </div>
  );
}
