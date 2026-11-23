// 关泉才  建立时间: 2026-11-04  使用大模型: codebuddy/auto  功能名称: 实验指导书《车门控制功能实现》- 车控页面 ControlView
// 放置位置: DevEco Studio 项目 entry/src/main/ets/view/ControlView.ets
// 功能: 车控页面静态 UI + 车门控制（4.6 车辆状态详情 / 4.8.1 车门状态接口），
//       并仿照车门状态接口完成车灯状态、车辆移动功能（实验过程 第 3 条）。
// 注意: 需要准备 4 张车状态图片放到 resources/base/media/：
//       bg_owner_normal / bg_owner_open_door / bg_owner_open_light / bg_owner_all_open

import { CarVinInfo } from '../viewmodel/CarVinInfo';
import { http } from '@kit.NetworkKit';
import { promptAction } from '@kit.ArkUI';

// TODO: 替换为后端服务器的实际地址
const BASE_URL: string = 'http://192.168.1.100:8080';

@Component
export struct ControlView {
  @StorageProp('token') token: string = '';
  @StorageProp('carVin') carVin: string = '';
  @StorageProp('carId') carId: string = '';

  @State isDoorLocked: boolean = false;
  @State areLightsOn: boolean = false;

  // 根据车架号获取车辆状态详细接口（4.6）
  getCarFunction(): Promise<CarVinInfo> {
    return new Promise((resolve, reject) => {
      let url = BASE_URL + '/cockpit/state/' + this.carVin
      console.log(url)
      let httpRequest = http.createHttp();
      httpRequest.request(
        url,
        {
          method: http.RequestMethod.GET,
          header: {
            'Content-Type': 'application/json',
            'Authorization': this.token
          }
        }, (err, data) => {
        if (!err) {
          let resData: CarVinInfo = JSON.parse(data.result.toString())
          if (resData.code === 200) {
            resolve(resData as CarVinInfo)
          } else {
            reject(resData)
          }
        }
        else {
          console.log('error:' + JSON.stringify(err))
          reject({ error: err })
        }
      }
      )
    })
  }

  // 车门状态接口（4.8.1）
  controlDoor(state: boolean): Promise<CarVinInfo> {
    return new Promise((resolve, reject) => {
      let url = BASE_URL + '/cockpit/control/door'
      console.log(url)
      let httpRequest = http.createHttp();
      httpRequest.request(
        url,
        {
          method: http.RequestMethod.POST,
          header: {
            'Content-Type': 'application/json',
            'Authorization': this.token
          }, extraData: {
          carId: this.carId,
          door: state ? '1' : '0'
        }
        }, (err, data) => {
        if (!err) {
          let resData: CarVinInfo = JSON.parse(data.result.toString())
          if (resData.code === 200) {
            resolve(resData)
          }
          else {
            reject(resData)
          }
        }
        else {
          console.log('error:' + JSON.stringify(err))
          reject({ error: err })
        }
      }
      )
    })
  }

  // 车灯状态接口（仿照车门状态接口完成，接口路径请按《鸿蒙智能座舱系统接口文档 V1.3》4.8.x 修改）
  controlLight(state: boolean): Promise<CarVinInfo> {
    return new Promise((resolve, reject) => {
      let url = BASE_URL + '/cockpit/control/light'
      console.log(url)
      let httpRequest = http.createHttp();
      httpRequest.request(
        url,
        {
          method: http.RequestMethod.POST,
          header: {
            'Content-Type': 'application/json',
            'Authorization': this.token
          }, extraData: {
          carId: this.carId,
          light: state ? '1' : '0'
        }
        }, (err, data) => {
        if (!err) {
          let resData: CarVinInfo = JSON.parse(data.result.toString())
          if (resData.code === 200) {
            resolve(resData)
          }
          else {
            reject(resData)
          }
        }
        else {
          console.log('error:' + JSON.stringify(err))
          reject({ error: err })
        }
      }
      )
    })
  }

  // 车辆移动接口（仿照车门状态接口完成，接口路径与参数请按接口文档修改）
  controlCarMove(direction: string): Promise<CarVinInfo> {
    return new Promise((resolve, reject) => {
      let url = BASE_URL + '/cockpit/control/move'
      console.log(url)
      let httpRequest = http.createHttp();
      httpRequest.request(
        url,
        {
          method: http.RequestMethod.POST,
          header: {
            'Content-Type': 'application/json',
            'Authorization': this.token
          }, extraData: {
          carId: this.carId,
          move: direction // 'up' | 'down' | 'left' | 'right'
        }
        }, (err, data) => {
        if (!err) {
          let resData: CarVinInfo = JSON.parse(data.result.toString())
          if (resData.code === 200) {
            resolve(resData)
          }
          else {
            reject(resData)
          }
        }
        else {
          console.log('error:' + JSON.stringify(err))
          reject({ error: err })
        }
      }
      )
    })
  }

  // 车门状态切换函数
  toggleDoorState() {
    const newState = !this.isDoorLocked;
    this.controlDoor(newState)
      .then(() => {
        this.isDoorLocked = newState;
      })
      .catch(() => {
        promptAction.showToast({ message: '操作失败，请重试' });
      });
  }

  // 车灯状态切换函数
  toggleLightState() {
    const newState = !this.areLightsOn;
    this.controlLight(newState)
      .then(() => {
        this.areLightsOn = newState;
      })
      .catch(() => {
        promptAction.showToast({ message: '操作失败，请重试' });
      });
  }

  // 车辆移动函数
  moveCar(direction: string) {
    this.controlCarMove(direction)
      .catch(() => {
        promptAction.showToast({ message: '操作失败，请重试' });
      });
  }

  // 车辆状态图片切换函数
  private getBackgroundImage() {
    if (this.isDoorLocked && this.areLightsOn) {
      return $r('app.media.bg_owner_all_open');
    } else if (this.isDoorLocked) {
      return $r('app.media.bg_owner_open_door');
    } else if (this.areLightsOn) {
      return $r('app.media.bg_owner_open_light');
    } else {
      return $r('app.media.bg_owner_normal');
    }
  }

  // 页面刷新前更新车辆当前状态
  aboutToAppear() {
    this.getCarFunction()
      .then((res: CarVinInfo) => {
        if (res.code === 200) {
          this.isDoorLocked = res.data?.door === '1';
          this.areLightsOn = res.data?.light === '1';
        }
      })
  }

  build() {
    Column() {
      // 车控页面UI
      Row() {
        Text('车控')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
      }
      .width('100%')
      .height(96)
      .backgroundColor('#FFF')
      .justifyContent(FlexAlign.Center)
      .shadow({ radius: 8, color: '#1A000000', offsetX: 0, offsetY: 2 })

      Column() {
        // 车辆状态图片（步骤 8：根据车辆状态显示对应图片）
        Image(this.getBackgroundImage())
          .width(280)
          .height(400)
          .objectFit(ImageFit.Contain)
          .onClick(() => this.toggleDoorState()) // 步骤 7：开关车门图片按钮点击事件

        // 车灯开关
        Button(this.areLightsOn ? '关闭车灯' : '打开车灯')
          .width('60%')
          .backgroundColor(this.areLightsOn ? '#FFA726' : '#33C3CF')
          .margin({ top: 20 })
          .onClick(() => this.toggleLightState())

        // 车辆移动方向控制盘
        Column({ space: 8 }) {
          Button('↑')
            .width(56)
            .onClick(() => this.moveCar('up'))
          Row({ space: 8 }) {
            Button('←')
              .width(56)
              .onClick(() => this.moveCar('left'))
            Button('↓')
              .width(56)
              .onClick(() => this.moveCar('down'))
            Button('→')
              .width(56)
              .onClick(() => this.moveCar('right'))
          }
        }
        .margin({ top: 30 })
        .padding(20)
        .borderRadius(120)
        .backgroundColor('#FFFFFF')
        .shadow({ radius: 12, color: '#1A000000', offsetX: 0, offsetY: 4 })
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#F5F5F5')
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
