import './ui/tokens.css';
import { ThreePilot } from './three/ThreePilot.js';

const root = document.getElementById('editor-root');
if (!root) throw new Error('#editor-root missing');

const pilot = new ThreePilot();
root.appendChild(pilot.element);
pilot.show();
