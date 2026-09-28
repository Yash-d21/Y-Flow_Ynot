"use client";

import dynamic from "next/dynamic";

const ChatBubble = dynamic(
  () => import("@/components/chat/chat-bubble").then((m) => m.ChatBubble),
  { ssr: false, loading: () => null }
);

export function LazyChatBubble(props: {
  userName: string;
  userEmail: string;
  companyName: string;
  mode?: "portal" | "login";
}) {
  return <ChatBubble {...props} />;
}
