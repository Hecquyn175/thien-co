import { APP_NAME } from './constants';

const root = document.getElementById('app');
if (root) {
  root.textContent = APP_NAME;
}
