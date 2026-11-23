// 关泉才  建立时间: 2026-11-04  使用大模型: codebuddy/auto  功能名称: 主页卡片中嵌入汽车展示（占位版：车图 + 旋转动画）
// 修改位置: 你的主页（比亚迪SU7 卡片所在的 HomeComp）

// 1. 顶部导入占位组件（后续有 glTF 模型时改成 Car3DView）：
import { Car3DPlaceholder } from '../view/Car3DPlaceholder';
// import { Car3DView } from '../view/Car3DView'; // 真 3D 版本，准备好模型后启用

// 2. 在车架号下方的空白卡片区域放入占位组件：
/*
Column() {
  Row() {
    Column({ space: 6 }) {
      Text('比亚迪SU7')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor('#FFFFFF')
      Text('车架号：00767484311')
        .fontSize(13)
        .fontColor('#E6FFFFFF')
    }
    .alignItems(HorizontalAlign.Start)

    Blank()

    Button('信息轨迹')
      .backgroundColor('#66FFFFFF')
      .fontColor('#FFFFFF')
      .fontSize(14)
  }
  .width('100%')
  .padding(16)

  // 车图 + 旋转动画，占满卡片剩余空间
  Car3DPlaceholder()
    .width('100%')
    .layoutWeight(1)
}
.width('92%')
.layoutWeight(1)
.borderRadius(16)
.backgroundImage(...)  // 保留你原来的渐变背景
*/
