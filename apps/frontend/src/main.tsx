import { render } from 'solid-js/web';
import App from './App';
import './styles/tailwind.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Failed to find app root element');
}

render(() => <App />, root);
