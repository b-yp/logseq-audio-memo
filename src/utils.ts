import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

let _visible = logseq.isMainUIVisible;

function subscribeLogseqEvent<T extends LSPluginUserEvents>(
  eventName: T,
  handler: (...args: any) => void
) {
  logseq.on(eventName, handler);
  return () => {
    logseq.off(eventName, handler);
  };
}

const subscribeToUIVisible = (onChange: () => void) =>
  subscribeLogseqEvent("ui:visible:changed", ({ visible }) => {
    _visible = visible;
    onChange();
  });

export const useAppVisible = () => {
  return React.useSyncExternalStore(subscribeToUIVisible, () => _visible);
};

export const genRandomStr = () => Math.random().
  toString(36).
  replace(/[^a-z]+/g, '').
  substring(0, 5)

export const formatTime = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
};

export const formatFileSize = (size: number): string => {
  if (!size || size <= 0) return "0 KB";
  const KB = 1024;
  const MB = 1024 * 1024;
  const GB = 1024 * 1024 * 1024;

  if (size >= GB) {
    return `${(size / GB).toFixed(1)} GB`;
  }
  if (size >= MB) {
    return `${(size / MB).toFixed(1)} MB`;
  }
  return `${(size / KB).toFixed(0)} KB`;
};
