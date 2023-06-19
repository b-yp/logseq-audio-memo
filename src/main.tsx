import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";
import Recorder from "js-audio-recorder"
import throttle from 'lodash/throttle'

import App from "./App";
import { ICON, RECORDER_STATUS_TEXT, RecorderStatusEnum } from "./constants";
import { logseq as PL } from "../package.json";

import "./index.css";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import { formatFileSize, formatTime } from "./utils";

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

  let recorder: Recorder | null = null
  let recorderStatus = RecorderStatusEnum.Readied
  let currentBlock: BlockEntity | null = null
  let renderBlock: BlockEntity | null = null

  function createModel() {
    return {
      async handleRecord() {
        currentBlock = await logseq.Editor.getCurrentBlock()
        if (!currentBlock?.uuid) return

        if (recorder) {
          alert('⚠️ 你已经有一个录音实例, 请结束之后再开始新的')
          return
        }

        renderBlock = await logseq.Editor.insertBlock(
          currentBlock?.uuid,
          `{{renderer :audio_memo_renderer_container_id}}\n{{renderer :audio_memo_renderer_tools_id}}`
        )

        // TODO: 获取录音权限好像有点问题, 使用原生获取
        // const permission =  await Recorder()

        const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true })

        if (!audioPermission) {
          logseq.UI.showMsg('授权失败，请重新授权', 'error')
          return
        }

        recorder = new Recorder()
        logseq.UI.showMsg('initialization', 'success')

        let dataOption: { duration: number, fileSize: number, vol: number } | any = {}

        // 渲染录制信息
        logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
          // TODO: 这里面每次清除之后执行次数会累加
          const [type] = payload.arguments
          if (!type?.startsWith(':audio_memo_renderer_container')) {
            return
          }
          if (!recorder) return

          const setContainerUI = () => {
            const id = `audio_memo_renderer_container_id`
            logseq.provideUI({
              key: id,
              slot,
              template: `
              <div class="audio-memo">
                <div class="container">
                  <div class="status">${RECORDER_STATUS_TEXT[recorderStatus]}</div>
                  <div> 录音时长: ${formatTime(dataOption?.duration || 0)}</div>
                  <div> 录音大小: ${formatFileSize(dataOption?.fileSize || 0)}</div>
                  <div> 音量百分比: ${dataOption?.vol || 0}</div>
                </div>
              </div>
            `,
            })
          }

          // 没有点击录音之前执行的
          setContainerUI()

          // 监听获取录音数据
          recorder.onprogress = throttle((params) => {
            console.log('parse progress', params)
            dataOption = params

            setContainerUI()
            // const id = `audio_memo_renderer_container_id`
            // logseq.provideUI({
            //   key: id,
            //   slot,
            //   template: `
            //     <div class="audio-memo">
            //       <div class="container">
            //         <div>${RECORDER_STATUS_TEXT[recorderStatus]}</div>
            //         <div> 录音时长: ${formatTime(dataOption?.duration || 0)}</div>
            //         <div> 录音大小: ${formatFileSize(dataOption?.fileSize || 0)}</div>
            //         <div> 音量百分比: ${dataOption?.vol || 0}</div>
            //       </div>
            //     </div>
            //   `,
            // })
          }, 100)

          // 监听播放回调
          recorder.onplay = () => {
            recorderStatus = RecorderStatusEnum.Playing
            setContainerUI()
          }

          // 监听播放暂停回调
          recorder.onpauseplay = () => {
            recorderStatus = RecorderStatusEnum.PausedPlay
            setContainerUI()
          }

          // 监听播放恢复回调
          recorder.onresumeplay = () => {
            recorderStatus = RecorderStatusEnum.Playing
            setContainerUI()
          }

          // 监听播放停止回调
          recorder.onstopplay = () => {
            recorderStatus = RecorderStatusEnum.StoppedPlay
            setContainerUI()
          }

          // 监听播放完成回调
          recorder.onplayend = () => {
            recorderStatus = RecorderStatusEnum.CompletedPlay
            setContainerUI()
          }
        })

        // 渲染按钮组
        logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
          const [type] = payload.arguments
          if (!type?.startsWith(':audio_memo_renderer_tools')) {
            return
          }

          const id = `audio_memo_renderer_tools_id`
          logseq.provideUI({
            key: id,
            slot,
            template: `
              <div class="controls">
                <button class="btn" data-on-click="handleStart">录音</button>
                <button class="btn" data-on-click="handlePause">暂停</button>
                <button class="btn" data-on-click="handleResume">继续</button>
                <button class="btn btn-warning" data-on-click="handleStop">停止</button>
                <button class="btn btn-info" data-on-click="handlePlay">播放</button>
                <button class="btn" data-on-click="handlePausePlay">暂停播放</button>
                <button class="btn" data-on-click="handleResumePlay">继续播放</button>
                <button class="btn" data-on-click="handleStopPlay">停止播放</button>
                <button class="btn btn-danger" data-render_block_uuid="${renderBlock?.uuid}" data-on-click="handleDelete">删除</button>
                <button class="btn btn-success" data-on-click="handleInsert">插入</button>
                <button class="btn btn-success" data-on-click="handleDownload">下载</button>
              </div>
            `,
          })

        })
      },
      async handleStart() {
        if (!recorder) return
        if (recorderStatus === RecorderStatusEnum.Running) {
          logseq.UI.showMsg('有一个录音正在录制', 'warning')
          return
        }
        if (recorderStatus === RecorderStatusEnum.Paused) {
          logseq.UI.showMsg('有一个录音已暂停', 'warning')
          return
        }
        recorder.start().then(() => {
          // 开始录音
          recorderStatus = RecorderStatusEnum.Running
          logseq.UI.showMsg('🎉 开始录制', 'success')
        }, (error) => {
          // 出错了
          console.log(`${error.name} : 🐛 ${error.message}`)
        })
      },
      handlePause() {
        if (!recorder) return
        recorder.pause()
        recorderStatus = RecorderStatusEnum.Paused
        logseq.UI.showMsg('⏸ 暂停录制', 'success')
      },
      handleResume() {
        if (!recorder) return
        recorder.resume()
        recorderStatus = RecorderStatusEnum.Running
        logseq.UI.showMsg('▶ 恢复录制', 'success')
      },
      async handleStop() {
        if (!recorder) return
        recorder.stop()
        recorderStatus = RecorderStatusEnum.Stopped
        logseq.UI.showMsg('⏹ 结束录制', 'success')
      },
      handlePlay() {
        if (!recorder) return
        recorder.play()
        recorderStatus = RecorderStatusEnum.Playing
        const dataArray = recorder.getPlayAnalyseData();
        console.log('play-dataArray', dataArray)
      },
      handlePausePlay() {
        if (!recorder) return
        recorder.pausePlay()
        recorderStatus = RecorderStatusEnum.PausedPlay
      },
      handleResumePlay() {
        if (!recorder) return
        recorder.resumePlay()
        recorderStatus = RecorderStatusEnum.Playing
      },
      handleStopPlay() {
        if (!recorder) return
        recorder.stopPlay()
        recorderStatus = RecorderStatusEnum.StoppedPlay
      },

      handleDelete(e: any) {
        if (!recorder) return
        const flag = confirm('⚠ 删除操作不可恢复，确认继续吗？')
        if (!flag) return
        // 销毁录音实例，置为null释放资源，fn为回调函数，
        recorder.destroy().then(function () {
          recorder = null
          logseq.UI.showMsg('⬅ 已删除', 'warning')
          // 删除之后需要清除 render 的 block
          logseq.Editor.removeBlock(e.dataset.render_block_uuid)
          recorderStatus = RecorderStatusEnum.Readied
        })
      },
      async handleInsert() {
        if (!recorder) return
        const blob = recorder.getWAVBlob() as Blob
        const buffer = await blob.arrayBuffer()
        const storage = logseq.Assets.makeSandboxStorage()
        storage.setItem(`audio_memo_${Date.now()}.wav`, buffer as any).then(one => {
          logseq.UI.showMsg(`Write DONE 🎉 - ${one}`, 'success')
          const path = (one as unknown as string).match(/\/assets\/(.*)/ig)
          if (path) {
            const name = (/([^/]+)\.(wav)/ig).exec(path[0])
            const video = `![${name || '🤡'}](..${path})`
            logseq.Editor.updateBlock(renderBlock?.uuid as string, video || '🤡')

            if (!recorder) return
            // 销毁录音实例，置为null释放资源，fn为回调函数，
            recorder.destroy().then(function () {
              recorder = null
              recorderStatus = RecorderStatusEnum.Readied
            })
          }
        }).catch(error => {
          logseq.UI.showMsg(JSON.stringify(Object.keys(error).length !== 0 ? (error.message || error) : '写入失败'), 'error')
        })
      },
      handleDownload() {
        if (!recorder) return
        recorder.downloadWAV(`audio_memo_${Date.now()}`)
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
    width: 576px;
    padding: 8px 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background-color: #fff;
    border-radius: 4px;
    color: #333;
  }
  .container>div {
    line-height: 32px;
  }
  .container>div.status {
    font-weight: bold;
  }
  .controls {
    display: flex;
  }
  .controls>.btn {
    height: 24px;
    margin-right: 16px;
    padding: 0 6px;
    background-color: #0064f7;
    border-radius: 4px;
    line-height: 24px;
    font-size: 12px;
  }
  .controls>.btn:hover {
    background-color: #0054cd;
  }
  .controls>.btn.btn-warning {
    background-color: #ffb92e;
  }
  .controls>.btn.btn-warning:hover {
    background-color: #ffc33c;
  }
  .controls>.btn.btn-info {
    background-color: #00c3eb;
  }
  .controls>.btn.btn-info:hover {
    background-color: #00cced;
  }
  .controls>.btn.btn-danger {
    background-color: #e22f40;
  }
  .controls>.btn.btn-danger:hover {
    background-color: #bb2837; 
  }
  .controls>.btn.btn-success {
    background-color: #007b4c;
  }
  .controls>.btn.btn-success:hover {
    background-color: #006840;
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
