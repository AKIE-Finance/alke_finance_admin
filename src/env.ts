import { BASE_URL } from './api';

/** Environnement courant : mode Vite + hôte de l'API, pour distinguer recette et production d'un coup d'œil. */
export function environmentInfo(): { name: string; host: string; tone: 'dev' | 'staging' | 'prod' } {
  let host = BASE_URL;
  try {
    host = new URL(BASE_URL).host;
  } catch {
    // URL relative : on garde la chaîne telle quelle
  }
  const mode = import.meta.env.MODE;
  const lower = `${mode} ${host}`.toLowerCase();
  if (mode === 'development' || /localhost|127\.0\.0\.1/.test(host)) return { name: 'Développement', host, tone: 'dev' };
  if (/staging|preprod|recette|test|uat/.test(lower)) return { name: 'Recette', host, tone: 'staging' };
  return { name: 'Production', host, tone: 'prod' };
}
