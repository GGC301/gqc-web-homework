// 关泉才  建立时间: 2026-11-04  使用大模型: codebuddy/auto  功能名称: 主页汽车 3D 效果占位组件（车图 + 旋转动画）
// 放置位置: DevEco Studio 项目 entry/src/main/ets/view/Car3DPlaceholder.ets
// 功能: 在没有 glTF 模型的情况下，用一张汽车透明底图 + 360° 旋转动画 + 地面阴影，
//       模拟车模转台展示效果，后续可直接换成 Car3DView（真 3D）。
// 素材: 把一张汽车图片（建议 PNG 透明底、车头朝左）命名为 car_3d.png，
//       放入 entry/src/main/resources/base/media/ 目录，引用为 $r('app.media.car_3d')。

@Component
export struct Car3DPlaceholder {
  @State yuan_angle: number = 0

  build() {
    Stack({ alignContent: Alignment.Center }) {
      // 地面阴影（比车图略窄，增强立体感）
      Ellipse()
        .width('52%')
        .height(16)
        .fill('#33000000')
        .blur(6)
        .translate({ y: 88 })

      // 汽车图片：绕 Y 轴 360° 匀速旋转（视觉上模拟转台展示）
      Image($r('app.media.car_3d'))
        .width('88%')
        .objectFit(ImageFit.Contain)
        .rotate({ y: 1, angle: this.yuan_angle })
        .animation({
          duration: 8000,
          curve: Curve.Linear,
          iterations: -1, // 无限循环
          playMode: PlayMode.Normal
        })
        .onAppear(() => {
          this.yuan_angle = 360; // 触发一次 0->360 的属性动画并无限重复
        })

      // 右下角提示
      Text('3D 展示')
        .fontSize(10)
        .fontColor('#CCFFFFFF')
        .padding({ left: 8, right: 8, top: 3, bottom: 3 })
        .borderRadius(10)
        .backgroundColor('#33FFFFFF')
        .position({ x: '80%', y: '86%' })
    }
    .width('100%')
    .height('100%')
  }
}
