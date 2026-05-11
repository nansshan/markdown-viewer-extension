/**
 * BrowserRuntimeTransport
 *
 * Raw transport for browser extension runtime messaging.
 * Supports both Chrome (chrome.*) and Firefox (browser.*) APIs.
 */

import type { MessageTransport, TransportMeta, Unsubscribe } from '../../../src/messaging/transports/transport';
import { getWebExtensionApi } from '../../../src/utils/platform-info';

const runtimeApi = getWebExtensionApi();

export interface BrowserRuntimeTransportOptions {
  /**
   * If true, the onMessage listener will return true to indicate it will
   * send an async response via sendResponse(). Required for background scripts
   * that need to respond to requests.
   * 
   * If false (default), the listener returns false, meaning it only receives
   * messages and won't send responses. This prevents Firefox's
   * "Promised response went out of scope" errors in popup/content scripts.
   */
  willRespond?: boolean;
}

export class ChromeRuntimeTransport implements MessageTransport {
  private listener?: (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => void | boolean | Promise<unknown>;
  
  private willRespond: boolean;

  constructor(options: BrowserRuntimeTransportOptions = {}) {
    this.willRespond = options.willRespond ?? false;
  }

  async send(message: unknown): Promise<unknown> {
    if (!chrome.runtime?.id) return undefined;

    // Firefox browser.runtime.sendMessage returns a Promise
    // Chrome also supports Promise in modern versions
    try {
      return await runtimeApi.runtime.sendMessage(message);
    } catch (error) {
      if (!chrome.runtime?.id) return undefined;
      // Fallback for older Chrome callback style
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });
    }
  }

  onMessage(handler: (message: unknown, meta?: TransportMeta) => void): Unsubscribe {
    this.listener = (message, sender, sendResponse) => {
      if (!chrome.runtime?.id) return false;
      const meta: TransportMeta = {
        raw: sender,
        respond: sendResponse,
      };
      handler(message, meta);
      return this.willRespond;
    };

    try {
      runtimeApi.runtime.onMessage.addListener(this.listener);
    } catch {
      // Context invalidated after extension reload
    }

    return () => {
      if (this.listener) {
        try {
          runtimeApi.runtime.onMessage.removeListener(this.listener);
        } catch {
          // Extension context may be invalidated
        }
        this.listener = undefined;
      }
    };
  }
}

// Export alias for Firefox compatibility
export { ChromeRuntimeTransport as BrowserRuntimeTransport };
