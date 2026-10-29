import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n, { initI18n } from '../../i18n';

// Mounts `ui` with react-native-web into jsdom, lets async data settle, and
// writes the full HTML (including react-native-web's generated CSS) to
// verify-evidence/theme/html/<name>.html for the screenshot script.
export async function shoot(name: string, ui: React.ReactElement, interact?: (host: HTMLElement) => Promise<void> | void) {
  if (!i18n.isInitialized) await initI18n();
  const host = document.createElement('div');
  host.style.cssText = 'width:390px;height:844px;display:flex;flex-direction:column;position:relative;';
  document.body.appendChild(host);
  const root = createRoot(host);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => { root.render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 28, left: 0, right: 0, bottom: 16 } }}>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  ); });
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 20)); });
  if (interact) {
    await act(async () => { await interact(host); });
    for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 20)); });
  }
  // react-native-web inserts its rules through the CSSOM, so read them back from document.styleSheets.
  const css = Array.from(document.styleSheets).map(sheet => Array.from(sheet.cssRules).map(r => r.cssText).join('\n')).join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}body{display:flex}</style><style>${css}</style></head><body>${host.outerHTML}</body></html>`;
  const dir = path.resolve(__dirname, '../../../verify-evidence/theme/html');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.html`), html);
  act(() => root.unmount());
}

// Clicks the element whose text is exactly `text` (react-native-web maps taps to click).
export function clickText(host: HTMLElement, text: string) {
  const el = Array.from(host.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent === text) as HTMLElement | undefined;
  if (!el) throw new Error(`no element with text "${text}"`);
  el.click();
}
