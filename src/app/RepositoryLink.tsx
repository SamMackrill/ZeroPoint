import { Github } from 'lucide-react';
import './repository-link.css';

/** Render a consistently styled link to the ZeroPoint repository. */
export function RepositoryLink() {
  return <a className="repository-link" href="https://github.com/SamMackrill/ZeroPoint" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository (opens in a new tab)" title="View ZeroPoint on GitHub"><Github size={18} aria-hidden="true"/><span className="repository-label">GitHub repo</span></a>;
}
