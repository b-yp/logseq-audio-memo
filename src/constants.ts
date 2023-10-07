export const ICON = `<svg t="1687091200563" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="9558" width="20" height="20"><path d="M842 454c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8 0 140.3-113.7 254-254 254S258 594.3 258 454c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8 0 168.7 126.6 307.9 290 327.6V884H326.7c-13.7 0-24.7 14.3-24.7 32v36c0 4.4 2.8 8 6.2 8h407.6c3.4 0 6.2-3.6 6.2-8v-36c0-17.7-11-32-24.7-32H548V782.1c165.3-18 294-158 294-328.1z" p-id="9559" data-spm-anchor-id="a313x.7781069.0.i12" class="selected" fill="#a8acb3"></path><path d="M512 624c93.9 0 170-75.2 170-168V232c0-92.8-76.1-168-170-168s-170 75.2-170 168v224c0 92.8 76.1 168 170 168z m-94-392c0-50.6 41.9-92 94-92s94 41.4 94 92v224c0 50.6-41.9 92-94 92s-94-41.4-94-92V232z" p-id="9560" data-spm-anchor-id="a313x.7781069.0.i13" class="selected" fill="#a8acb3"></path></svg>`

export enum RecorderStatusEnum {
  Readied = 'readied',
  Running = 'running',
  Paused = 'paused',
  Stopped = 'stopped',
  Playing = 'playing',
  PausedPlay = 'paused_play',
  StoppedPlay = 'stopped_play',
  CompletedPlay = 'completed_play',
}

export const getRecorderStatus = (status: RecorderStatusEnum, isChinese) => ({
  [RecorderStatusEnum.Readied]: isChinese ? '👌 待开始' : '👌 Waiting to start',
  [RecorderStatusEnum.Running]: isChinese ? '⏺ 录制中...' : '⏺ Recording...',
  [RecorderStatusEnum.Paused]: isChinese ? '⏸ 暂停录制' : '⏸ Paused Recording',
  [RecorderStatusEnum.Stopped]: isChinese ? '⏹ 停止录制' : '⏹ Stop Recording',
  [RecorderStatusEnum.Playing]: isChinese ? '🎧 播放中...' : '🎧 Playing...',
  [RecorderStatusEnum.PausedPlay]: isChinese ? '⏸ 暂停播放' : '⏸ Paused Playing',
  [RecorderStatusEnum.StoppedPlay]: isChinese ? '⏹ 停止播放' : '⏹ Stop Playing',
  [RecorderStatusEnum.CompletedPlay]: isChinese ? '💿 播放完毕' : '💿 Finished Playing',
})[status]
