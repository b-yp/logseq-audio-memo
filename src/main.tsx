import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

import Recorder from "js-audio-recorder";

import { ICON, getRecorderStatus, RecorderStatusEnum } from "./constants";
import { logseq as PL } from "../package.json";
import { formatFileSize, formatTime } from "./utils";

import "./index.css";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

async function main() {
  console.info(`#${pluginId}: MAIN`);

  let recorder: Recorder | null = null;
  let recorderStatus = RecorderStatusEnum.Readied;
  let dataOption: { duration?: number; fileSize?: number; vol?: number } = {};
  let isCapsuleOpen = false;
  let preferredTargetUuid: string | null = null;
  let lastDurationSecond = -1;

  const UI_KEY = "audio-memo-floating-capsule";

  const SVGS = {
    recordDot: `<svg width="8" height="8" viewBox="0 0 24 24" fill="#ff453a"><circle cx="12" cy="12" r="10"/></svg>`,
    mic: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
    pause: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
    play: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>`,
    stop: `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`,
    insert: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><polyline points="7 11 12 16 17 11"/><path d="M20 21H4"/></svg>`,
    download: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    headphones: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  };

  function renderFloatingCapsule() {
    if (!isCapsuleOpen) {
      logseq.provideUI({
        key: UI_KEY,
        path: "body",
        reset: true,
        template: "",
      });
      return;
    }

    const duration = dataOption?.duration || 0;
    const fileSize = dataOption?.fileSize || 0;

    let contentHtml = "";

    if (recorderStatus === RecorderStatusEnum.Running) {
      // 录音进行中
      contentHtml = `
        <div class="audio-memo-capsule-badge">
          <span class="audio-memo-pulse-dot"></span>
          <span class="audio-memo-time">${formatTime(duration)}</span>
        </div>
        <button class="audio-memo-capsule-btn" data-on-click="handlePause" title="Pause recording">
          ${SVGS.pause}
          <span>Pause</span>
        </button>
        <button class="audio-memo-capsule-btn btn-danger" data-on-click="handleStop" title="Finish recording">
          ${SVGS.stop}
          <span>Done</span>
        </button>
        <button class="audio-memo-capsule-btn btn-icon btn-ghost" data-on-click="handleCancel" title="Cancel recording">
          ${SVGS.close}
        </button>
      `;
    } else if (recorderStatus === RecorderStatusEnum.Paused) {
      // 暂停状态
      contentHtml = `
        <div class="audio-memo-capsule-badge">
          <span class="audio-memo-static-dot dot-warning"></span>
          <span class="audio-memo-time">${formatTime(duration)}</span>
          <span class="audio-memo-status-tag">Paused</span>
        </div>
        <button class="audio-memo-capsule-btn" data-on-click="handleResume" title="Resume recording">
          ${SVGS.play}
          <span>Resume</span>
        </button>
        <button class="audio-memo-capsule-btn btn-danger" data-on-click="handleStop" title="Finish recording">
          ${SVGS.stop}
          <span>Done</span>
        </button>
        <button class="audio-memo-capsule-btn btn-icon btn-ghost" data-on-click="handleCancel" title="Cancel recording">
          ${SVGS.close}
        </button>
      `;
    } else if (duration > 0) {
      // 录制结束，展示试听、插入与下载操作
      const isPlaying = recorderStatus === RecorderStatusEnum.Playing;
      contentHtml = `
        <div class="audio-memo-capsule-badge">
          <span class="audio-memo-badge-icon">${SVGS.headphones}</span>
          <span class="audio-memo-time">${formatTime(duration)}</span>
          <span class="audio-memo-file-size">${formatFileSize(fileSize)}</span>
        </div>
        ${
          isPlaying
            ? `<button class="audio-memo-capsule-btn btn-warning" data-on-click="handleStopPlay" title="Stop playback">
                ${SVGS.stop}
                <span>Stop</span>
              </button>`
            : `<button class="audio-memo-capsule-btn" data-on-click="handlePlay" title="Play audio">
                ${SVGS.play}
                <span>Play</span>
              </button>`
        }
        <button class="audio-memo-capsule-btn btn-success" data-on-click="handleInsert" title="Insert into note">
          ${SVGS.insert}
          <span>Insert</span>
        </button>
        <button class="audio-memo-capsule-btn" data-on-click="handleDownload" title="Download audio file">
          ${SVGS.download}
          <span>Download</span>
        </button>
        <button class="audio-memo-capsule-btn btn-icon btn-ghost" data-on-click="handleCancel" title="Discard">
          ${SVGS.close}
        </button>
      `;
    } else {
      // 待录制状态
      contentHtml = `
        <div class="audio-memo-capsule-badge">
          <span class="audio-memo-badge-icon">${SVGS.mic}</span>
          <span class="audio-memo-status-tag">Ready</span>
        </div>
        <button class="audio-memo-capsule-btn btn-record" data-on-click="handleStart">
          ${SVGS.recordDot}
          <span>Record</span>
        </button>
        <button class="audio-memo-capsule-btn btn-icon btn-ghost" data-on-click="handleCancel" title="Close">
          ${SVGS.close}
        </button>
      `;
    }

    logseq.provideUI({
      key: UI_KEY,
      path: "body",
      reset: true,
      template: `
        <div class="audio-memo-floating-capsule">
          ${contentHtml}
        </div>
      `,
    });
  }

  function setupRecorderEvents(rec: Recorder) {
    rec.onprogress = (params) => {
      if (!isCapsuleOpen || recorderStatus !== RecorderStatusEnum.Running) return;
      dataOption = params;
      const curSec = Math.floor(params.duration || 0);
      if (curSec !== lastDurationSecond) {
        lastDurationSecond = curSec;
        renderFloatingCapsule();
      }
    };

    rec.onplay = () => {
      recorderStatus = RecorderStatusEnum.Playing;
      renderFloatingCapsule();
    };

    rec.onpauseplay = () => {
      recorderStatus = RecorderStatusEnum.PausedPlay;
      renderFloatingCapsule();
    };

    rec.onresumeplay = () => {
      recorderStatus = RecorderStatusEnum.Playing;
      renderFloatingCapsule();
    };

    rec.onstopplay = () => {
      recorderStatus = RecorderStatusEnum.StoppedPlay;
      renderFloatingCapsule();
    };

    rec.onplayend = () => {
      recorderStatus = RecorderStatusEnum.CompletedPlay;
      renderFloatingCapsule();
    };
  }

  async function destroyRecorderInstance() {
    if (recorder) {
      try {
        recorder.onprogress = () => {};
        await recorder.destroy();
      } catch (err) {
        console.error("Destroy recorder error:", err);
      }
      recorder = null;
    }
    recorderStatus = RecorderStatusEnum.Readied;
    dataOption = {};
    preferredTargetUuid = null;
    lastDurationSecond = -1;
  }

  async function closeCapsule() {
    await destroyRecorderInstance();
    isCapsuleOpen = false;
    renderFloatingCapsule();
  }

  // 统一解析插入目标：当前光标块、当前页面或今天日志页面
  async function resolveInsertTarget(): Promise<{
    block?: BlockEntity;
    pageId?: string;
  }> {
    // 1. 如果此前通过斜杠命令或快捷键指定了块
    if (preferredTargetUuid) {
      try {
        const block = await logseq.Editor.getBlock(preferredTargetUuid);
        if (block?.uuid) return { block };
      } catch (e) {}
    }

    // 2. 当前正在编辑的块
    try {
      const editingBlockId = await logseq.Editor.checkEditing();
      if (typeof editingBlockId === "string" && editingBlockId) {
        const block = await logseq.Editor.getBlock(editingBlockId);
        if (block?.uuid) return { block };
      }
    } catch (e) {}

    // 3. 当前聚焦或选中的块
    try {
      const cur = await logseq.Editor.getCurrentBlock();
      if (cur?.uuid) return { block: cur };
    } catch (e) {}

    try {
      const selected = await logseq.Editor.getSelectedBlocks();
      if (selected && selected.length > 0 && selected[0]?.uuid) {
        return { block: selected[0] };
      }
    } catch (e) {}

    // 4. 当前页面 (适配 Logseq DB 多种属性: uuid / name / originalName / title / id)
    try {
      const currentPage: any = await logseq.Editor.getCurrentPage();
      if (currentPage) {
        const pageId =
          currentPage.uuid ||
          currentPage.name ||
          currentPage.originalName ||
          currentPage["original-name"] ||
          currentPage.title ||
          currentPage.id;
        if (pageId) return { pageId };
      }
    } catch (e) {}

    // 5. 日志视图 fallback：如果在首页或 Journals 流视图，尝试获取/创建今天的 Journal 页面
    try {
      const todayPage: any = await logseq.Editor.createJournalPage(new Date());
      if (todayPage) {
        const pageId =
          todayPage.uuid ||
          todayPage.name ||
          todayPage.originalName ||
          todayPage["original-name"] ||
          todayPage.title ||
          todayPage.id;
        if (pageId) return { pageId };
      }
    } catch (e) {}

    return {};
  }

  async function startRecordingAction() {
    // Request recording permission
    let audioPermission: MediaStream | null = null;
    try {
      audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      console.error("getUserMedia error:", err);
    }

    if (!audioPermission) {
      logseq.UI.showMsg("Microphone access denied. Please allow microphone permission in settings.", "error");
      return;
    }

    if (!recorder) {
      recorder = new Recorder();
      setupRecorderEvents(recorder);
    }

    recorderStatus = RecorderStatusEnum.Readied;
    dataOption = { duration: 0, fileSize: 0, vol: 0 };

    recorder.start().then(
      () => {
        recorderStatus = RecorderStatusEnum.Running;
        renderFloatingCapsule();
        logseq.UI.showMsg("Recording started", "success");
      },
      (error) => {
        console.error(`${error.name} : ${error.message}`);
        logseq.UI.showMsg(`Failed to start recording: ${error.message}`, "error");
      }
    );
  }

  function createModel() {
    return {
      // Toolbar icon clicked: open capsule and start recording
      async handleRecord() {
        try {
          const cur = await logseq.Editor.getCurrentBlock();
          if (cur?.uuid) {
            preferredTargetUuid = cur.uuid;
          }
        } catch (e) {}

        if (isCapsuleOpen) {
          if (recorderStatus === RecorderStatusEnum.Running) {
            logseq.UI.showMsg("Recording in progress. Check bottom capsule.", "info");
            return;
          }
        }
        isCapsuleOpen = true;
        renderFloatingCapsule();
        await startRecordingAction();
      },

      async handleStart() {
        await startRecordingAction();
      },

      handlePause() {
        if (!recorder) return;
        recorder.pause();
        recorderStatus = RecorderStatusEnum.Paused;
        renderFloatingCapsule();
        logseq.UI.showMsg("Recording paused", "success");
      },

      handleResume() {
        if (!recorder) return;
        recorder.resume();
        recorderStatus = RecorderStatusEnum.Running;
        renderFloatingCapsule();
        logseq.UI.showMsg("Recording resumed", "success");
      },

      async handleStop() {
        if (!recorder) return;
        recorder.stop();
        recorderStatus = RecorderStatusEnum.Stopped;
        renderFloatingCapsule();
        logseq.UI.showMsg("Recording finished. You can play back or insert into note.", "success");
      },

      handlePlay() {
        if (!recorder) return;
        recorder.play();
        recorderStatus = RecorderStatusEnum.Playing;
        renderFloatingCapsule();
      },

      handleStopPlay() {
        if (!recorder) return;
        recorder.stopPlay();
        recorderStatus = RecorderStatusEnum.StoppedPlay;
        renderFloatingCapsule();
      },

      async handleCancel() {
        await closeCapsule();
        logseq.UI.showMsg("Recording discarded", "info");
      },

      // Save recorded audio and insert into note
      async handleInsert() {
        if (!recorder) return;

        try {
          const blob = recorder.getWAVBlob() as Blob;
          const buffer = await blob.arrayBuffer();
          const storage = logseq.Assets.makeSandboxStorage();
          const fileName = `audio_memo_${Date.now()}.wav`;

          const one: any = await storage.setItem(fileName, buffer as any);

          // Handle Windows paths
          let relativePath = `../assets/${fileName}`;
          if (typeof one === "string" && one) {
            const normalized = one.replace(/\\/g, "/");
            const match = normalized.match(/\/assets\/(.*)/i);
            if (match) {
              relativePath = `../assets/${match[1]}`;
            }
          }

          const audioMarkdown = `![${fileName}](${relativePath})`;

          // Resolve best target position
          const { block: targetBlock, pageId } = await resolveInsertTarget();
          let inserted = false;

          if (targetBlock?.uuid) {
            if (!targetBlock.content || targetBlock.content.trim() === "") {
              await logseq.Editor.updateBlock(targetBlock.uuid, audioMarkdown);
              inserted = true;
            } else {
              try {
                await logseq.Editor.insertBlock(targetBlock.uuid, audioMarkdown, {
                  sibling: true,
                });
                inserted = true;
              } catch (e) {
                await logseq.Editor.insertBlock(targetBlock.uuid, audioMarkdown);
                inserted = true;
              }
            }
          } else if (pageId) {
            try {
              await logseq.Editor.appendBlockInPage(pageId, audioMarkdown);
              inserted = true;
            } catch (e) {
              console.error("appendBlockInPage failed:", e);
            }
          }

          if (inserted) {
            logseq.UI.showMsg("Audio memo inserted into note", "success");
          } else {
            // Fallback: Copy markdown link to clipboard
            try {
              await parent.navigator.clipboard.writeText(audioMarkdown);
            } catch (err) {
              try {
                await navigator.clipboard.writeText(audioMarkdown);
              } catch (e) {}
            }
            logseq.UI.showMsg(
              "Audio saved to assets & copied to clipboard! Paste (Ctrl+V) into note.",
              "warning"
            );
          }

          // Close capsule and cleanup
          await closeCapsule();
        } catch (error: any) {
          console.error("Insert audio error:", error);
          logseq.UI.showMsg(
            error?.message ? `Failed to insert: ${error.message}` : "Failed to insert",
            "error"
          );
        }
      },

      handleDownload() {
        if (!recorder) return;
        recorder.downloadWAV(`audio_memo_${Date.now()}`);
      },
    };
  }

  logseq.provideModel(createModel());

  // 1. Slash command
  logseq.Editor.registerSlashCommand("Audio Memo: Record", async (b) => {
    preferredTargetUuid = b.uuid;
    isCapsuleOpen = true;
    renderFloatingCapsule();
    await startRecordingAction();
  });

  // 2. Block context menu
  logseq.Editor.registerBlockContextMenuItem("Audio Memo: Record here", async (b) => {
    preferredTargetUuid = b.uuid;
    isCapsuleOpen = true;
    renderFloatingCapsule();
    await startRecordingAction();
  });

  // 3. Command Palette: Audio Memo: Record Audio
  logseq.App.registerCommandPalette(
    {
      key: "audio-memo-floating-toggle",
      label: "Audio Memo: Record Audio",
    },
    async () => {
      const cur = await logseq.Editor.getCurrentBlock();
      if (cur?.uuid) {
        preferredTargetUuid = cur.uuid;
      }
      isCapsuleOpen = true;
      renderFloatingCapsule();
      await startRecordingAction();
    }
  );

  const iconName = "byp-logseq-audio-memo-icon";

  // 专属样式：精致毛玻璃灵动岛胶囊，严防全局 CSS 污染
  logseq.provideStyle(css`
  .${iconName} {
    display: flex;
    align-items: center;
    position: relative;
    top: 0px;
    opacity: 0.85;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }
  .${iconName}:hover {
    opacity: 1;
  }

  .audio-memo-floating-capsule {
    box-sizing: border-box;
    position: fixed;
    bottom: 36px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 999999;
    height: 42px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px 0 14px;
    border-radius: 9999px;
    background-color: rgba(22, 24, 29, 0.68);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.38), 0 2px 8px rgba(0, 0, 0, 0.15), inset 0 0.5px 0.5px rgba(255, 255, 255, 0.25);
    color: #f5f5f7;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    user-select: none;
  }

  .audio-memo-capsule-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 10px;
    margin-right: 2px;
    border-right: 1px solid rgba(255, 255, 255, 0.16);
    flex-shrink: 0;
  }

  .audio-memo-badge-icon {
    display: flex;
    align-items: center;
    opacity: 0.85;
    flex-shrink: 0;
  }

  .audio-memo-pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ff453a;
    box-shadow: 0 0 6px rgba(255, 69, 58, 0.8);
    animation: audioMemoPulse 1.4s infinite ease-in-out;
    flex-shrink: 0;
  }

  .audio-memo-static-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .audio-memo-static-dot.dot-warning {
    background-color: #f5a623;
    box-shadow: 0 0 5px rgba(245, 166, 35, 0.6);
  }

  @keyframes audioMemoPulse {
    0% { transform: scale(0.85); opacity: 0.6; }
    50% { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(0.85); opacity: 0.6; }
  }

  .audio-memo-time {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-variant-numeric: tabular-nums;
    display: inline-block;
    min-width: 46px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .audio-memo-status-tag {
    font-size: 12px;
    opacity: 0.85;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .audio-memo-file-size {
    font-size: 11px;
    opacity: 0.7;
    font-family: ui-monospace, monospace;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .audio-memo-capsule-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 28px;
    padding: 0 11px;
    border-radius: 9999px;
    background-color: rgba(255, 255, 255, 0.12);
    color: #f5f5f7;
    border: 1px solid rgba(255, 255, 255, 0.08);
    outline: none;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .audio-memo-capsule-btn svg {
    flex-shrink: 0;
  }

  .audio-memo-capsule-btn:hover {
    background-color: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .audio-memo-capsule-btn.btn-icon {
    padding: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
  }

  .audio-memo-capsule-btn.btn-record {
    background-color: #d93829;
    color: #fff;
    border-color: transparent;
  }
  .audio-memo-capsule-btn.btn-record:hover {
    background-color: #c02d1f;
  }

  .audio-memo-capsule-btn.btn-danger {
    background-color: rgba(255, 69, 58, 0.2);
    color: #ff453a;
    border-color: rgba(255, 69, 58, 0.35);
  }
  .audio-memo-capsule-btn.btn-danger:hover {
    background-color: rgba(255, 69, 58, 0.32);
  }

  .audio-memo-capsule-btn.btn-warning {
    background-color: rgba(255, 159, 10, 0.22);
    color: #ff9f0a;
    border-color: rgba(255, 159, 10, 0.35);
  }
  .audio-memo-capsule-btn.btn-warning:hover {
    background-color: rgba(255, 159, 10, 0.32);
  }

  .audio-memo-capsule-btn.btn-success {
    background-color: #30b053;
    color: #fff;
    font-weight: 600;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba(48, 176, 83, 0.3);
  }
  .audio-memo-capsule-btn.btn-success:hover {
    background-color: #279644;
  }

  .audio-memo-capsule-btn.btn-ghost {
    background: transparent;
    border-color: transparent;
    opacity: 0.7;
  }
  .audio-memo-capsule-btn.btn-ghost:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.14);
  }
`);

  logseq.App.registerUIItem("toolbar", {
    key: iconName,
    template: `
      <div title="Record Audio" data-on-click="handleRecord" onmousedown="event.preventDefault()" class="button ${iconName}">
        <i>${ICON}</i>
      </div>
    `,
  });
}

logseq.ready(main).catch(console.error);
