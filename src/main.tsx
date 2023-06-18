import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";
import Recorder from "js-audio-recorder"

import App from "./App";
import { ICON } from "./constants";
import { genRandomStr } from "./utils";
import { logseq as PL } from "../package.json";

import "./index.css";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

function main() {
  console.info(`#${pluginId}: MAIN`);

  const root = ReactDOM.createRoot(document.getElementById("app")!);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // const recorder = new Recorder()
  // recorder.start().then(() => {
  //   // 开始录音
  //   setTimeout(() => {
  //     recorder.stop()

  //     recorder.play()
  //     console.log('播放▶️')
  //   }, 10000);
  // }, (error) => {
  //   // 出错了
  //   console.log(`${error.name} : ${error.message}`);
  // });

  function createModel() {
    return {
      async handleRecord() {
        const block = await logseq.Editor.getCurrentBlock()

        if (!block?.uuid) return
        await logseq.Editor.insertBlock(block?.uuid, `{{renderer :audio_memo_${genRandomStr()}}}`)

        logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
          const [type] = payload.arguments
          if (!type?.startsWith(':audio_memo')) {
            return
          }

          const id = `audio_memo_${payload.uuid}`

          logseq.provideUI({
            key: id,
            slot,
            template: `
              <div class="audio-memo">
                <div class="container">
                  录音可视化
                </div>
                <div class="controls">
                  <button class="btn" data-on-click="handleStart">录音</button>
                  <button class="btn" data-on-click="handlePause">暂停</button>
                  <button class="btn" data-on-click="handleResume">继续</button>
                  <button class="btn" data-on-click="handleStop">停止</button>
                  <button class="btn" data-on-click="handlePlay">播放</button>
                  <button class="btn" data-on-click="handleDelete">删除</button>
                  <button class="btn" data-on-click="handleInsert">插入</button>
                </div>
              </div>
            `,
          })
        })
      },
      handleStart() {
        console.log('开始录音')
      },
      handlePause() {
        console.log('暂停')
      },
      handleResume() {
        console.log('继续')
      },
      handleStop() {
        console.log('停止')
      },
      handlePlay() {
        console.log('播放')
      },
      handleDelete() {
        console.log('删除')
      },
      handleInsert() {
        console.log('插入')
      }
    };
  }

  logseq.provideModel(createModel());

  const iconName = "byp-logseq-audio-memo-icon";

  logseq.provideStyle(css`
  .${iconName} {
    display: flex;
    align-items: center;
    position: relative;
    top: 0px;
    opacity: 0.8;
  }
  .${iconName}:hover {
    opacity: 1;
  }

  .audio-memo {
  }
  .container {
    width: 100%;
    height: 100px;
    background-color: #fff;
  }
  .controls {
    display: flex;
  }
  .controls>.btn {
    height: 32px;
    margin-right: 16px;
    padding: 0 8px;
    background-color: #3875f6;
    border-radius: 4px;
    line-height: 32px;
  }
  .controls>.btn:hover {
    background-color: #5794f7;
  }
`);

  logseq.App.registerUIItem("toolbar", {
    key: iconName,
    template: `
      <div title="Record audio" data-on-click="handleRecord" class="button ${iconName}">
        <i>${ICON}</i>
      </div>
    `,
  });
}

logseq.ready(main).catch(console.error);
