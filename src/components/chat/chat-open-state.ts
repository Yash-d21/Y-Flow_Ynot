"use client";

/**
 * Survives soft client navigations (layout remounts) but resets on full page refresh.
 * So chat opens on first portal load / refresh, then remembers minimize until refresh.
 */
let chatOpenForThisDocument: boolean | null = null;

export function getInitialChatOpen(): boolean {
  if (chatOpenForThisDocument === null) {
    chatOpenForThisDocument = true;
  }
  return chatOpenForThisDocument;
}

export function setChatOpenPreference(open: boolean) {
  chatOpenForThisDocument = open;
}
