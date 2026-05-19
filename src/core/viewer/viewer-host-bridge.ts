import type { ViewerEffect, ViewerHostBridge, ViewerPersistedState } from './viewer-session-contract';

export interface PersistedStateHostBridgeOptions {
  readPersistedState(documentKey: string): Promise<ViewerPersistedState>;
  writePersistedState(documentKey: string, patch: Partial<ViewerPersistedState>): Promise<void>;
  emit?: (event: Extract<ViewerEffect, { type: 'emit-host-event' }>['event'], payload?: unknown) => void;
  resolveRelativeFile?: (path: string, binary?: boolean) => Promise<string>;
}

export function createPersistedStateHostBridge(options: PersistedStateHostBridgeOptions): ViewerHostBridge {
  const {
    readPersistedState,
    writePersistedState,
    emit,
    resolveRelativeFile,
  } = options;

  return {
    readPersistedState,
    writePersistedState,
    emit(event, payload) {
      emit?.(event, payload);
    },
    resolveRelativeFile,
  };
}