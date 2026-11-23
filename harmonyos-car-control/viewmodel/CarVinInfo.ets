// 关泉才  建立时间: 2026-11-04  使用大模型: codebuddy/auto  功能名称: 实验指导书《车门控制功能实现》- 车辆状态数据封装
// 放置位置: DevEco Studio 项目 entry/src/main/ets/viewmodel/CarVinInfo.ets
// 功能: 对网络请求返回信息的数据封装（实验过程 步骤 1）

export class CarVinInfo {
  msg?: string
  code?: number
  data?: Data
}

export class Data {
  searchValue?: object
  createBy?: object
  createTime?: object
  updateBy?: object
  updateTime?: object
  remark?: object
  params?: Params
  carId?: string
  door?: string
  light?: string
  temperature?: string
  windLevel?: string
  circulate?: string
  seatTemp?: string
  acBtn?: string
  clearFog?: string
  fanState?: string
  playMode?: string
  processMp3?: string
  mp3Playing?: string
  processMp4?: string
  mp4Playing?: string
}

export class Params {
}
