const clearedListeners = new Set<() => void>();

export function notifyAccountDataCleared(): void {
  for (const listener of clearedListeners) listener();
}

export function subscribeToAccountDataCleared(listener: () => void): () => void {
  clearedListeners.add(listener);
  return () => clearedListeners.delete(listener);
}
