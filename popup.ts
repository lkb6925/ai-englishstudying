import type { ModifierMode, RuntimeConfigPayload } from './messages';
import { getWordbookUrl, resolveApiBaseUrl, resolveAppOrigin } from './app-config';

const fallbackAppUrl = resolveAppOrigin(
  import.meta.env.VITE_APP_URL,
  import.meta.env.VITE_CODESPACE_NAME,
  import.meta.env.VITE_CODESPACES_PORT_FORWARDING_DOMAIN,
);
const fallbackApiBaseUrl = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_APP_URL,
  import.meta.env.VITE_CODESPACE_NAME,
  import.meta.env.VITE_CODESPACES_PORT_FORWARDING_DOMAIN,
);
const fallbackWordbookUrl = getWordbookUrl(
  import.meta.env.VITE_APP_URL,
  import.meta.env.VITE_CODESPACE_NAME,
  import.meta.env.VITE_CODESPACES_PORT_FORWARDING_DOMAIN,
);

function setModifierUI(modifier: ModifierMode) {
  const modifierText = document.getElementById('modifier-text');
  const keyIcon = document.querySelector('.key-icon');
  if (!modifierText || !keyIcon) {
    return;
  }

  modifierText.textContent =
    modifier === 'cmd_ctrl'
      ? 'Cmd / Ctrl + 마우스 올리기'
      : 'Alt / Option + 마우스 올리기';
  keyIcon.textContent = modifier === 'cmd_ctrl' ? '⌘' : '⌥';
}

function setApiBaseUrlText(apiBaseUrl: string) {
  const apiBaseUrlLabel = document.getElementById('api-base-url');
  if (!apiBaseUrlLabel) {
    return;
  }

  apiBaseUrlLabel.textContent = `API: ${apiBaseUrl}`;
}

function bindWordbookButton(appUrl: string) {
  const wordbookButton = document.getElementById('wordbook-btn');
  if (!wordbookButton) {
    return;
  }

  wordbookButton.addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl.replace(/\/$/, '') + '/wordbook' });
  });
}

async function loadRuntimeConfig(): Promise<RuntimeConfigPayload> {
  const response = await chrome.runtime.sendMessage({
    type: 'FLOW_GET_RUNTIME_CONFIG',
  });

  if (!response?.ok || !response.data || !('modifier' in response.data)) {
    throw new Error('Runtime config was unavailable.');
  }

  return response.data as RuntimeConfigPayload;
}

async function main() {
  try {
    const runtimeConfig = await loadRuntimeConfig();
    setModifierUI(runtimeConfig.modifier);
    setApiBaseUrlText(runtimeConfig.apiBaseUrl || fallbackApiBaseUrl);
    bindWordbookButton(runtimeConfig.appUrl || fallbackAppUrl);
  } catch (error) {
    console.warn('Flow Reader popup failed to load runtime config.', error);
    setModifierUI('alt_option');
    setApiBaseUrlText(fallbackApiBaseUrl);
    bindWordbookButton(fallbackWordbookUrl.replace(/\/wordbook$/, ''));
  }

  const optionsButton = document.getElementById('options-btn');
  optionsButton?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

void main();
