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
    const MINUTE = 60;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
  
    const days = Math.floor(seconds / DAY);
    seconds %= DAY;
  
    const hours = Math.floor(seconds / HOUR);
    seconds %= HOUR;
  
    const minutes = Math.floor(seconds / MINUTE);
    seconds %= MINUTE;
  
    let result = '';
    if (days > 0) {
      result += `${days} 天 `;
    }
    if (hours > 0) {
      result += `${hours} 小时 `;
    }
    if (minutes > 0) {
      result += `${minutes} 分钟 `;
    }
    if (seconds >= 0) {
      result += `${seconds.toFixed(2)} 秒`;
    }
  
    return result.trim();
  }

export const formatFileSize = (size: number): string => {
    const GB = 1024 * 1024 * 1024;
    const MB = 1024 * 1024;
    const KB = 1024;
  
    if (size >= GB) {
      return `${(size / GB).toFixed(1)} GB`;
    }
    if (size >= MB) {
      return `${(size / MB).toFixed(1)} MB`;
    }
    if (size >= KB) {
      return `${(size / KB).toFixed(1)} KB`;
    }
    return `${size}B`;
  }
