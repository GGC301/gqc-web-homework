// 关泉才  建立时间: 2026-11-04  使用大模型: codebuddy/auto  功能名称: 车主 APP 主页汽车 3D 模型展示
// 放置位置: DevEco Studio 项目 entry/src/main/ets/view/Car3DView.ets
// 功能: 使用 @kit.ArkGraphics3D（ArkGraphics 3D）加载 glTF 汽车模型，
//       支持自动旋转 + 手势拖拽旋转，放在主页"比亚迪SU7"卡片中间。
// 使用前提:
//   1. HarmonyOS NEXT（API 12 及以上），DevEco Studio 5.0+
//   2. 准备一个汽车 glTF/glb 模型（可从 Sketchfab / 华为开发者联盟示例获取），
//      解压放到 entry/src/main/resources/rawfile/car3d/ 目录下，
//      入口文件命名为 scene.gltf（或修改下方 Scene.load 的路径）。
//      注意 gltf 内引用的 bin/贴图也要一起放进去，保持相对路径不变。

import { Scene, SceneView, Node, Camera, Vec3 } from '@kit.ArkGraphics3D';

@Component
export struct Car3DView {
  @State scene: Scene | null = null;
  @State loadFailed: boolean = false;
  private modelNode?: Node;
  private carCamera?: Camera;
  private autoRotate: boolean = true;
  private timerId: number = -1;
  private modelAngle: number = 0;
  private lastOffsetX: number = 0;

  aboutToAppear(): void {
    // 加载 rawfile 中的 glTF 汽车模型
    Scene.load($rawfile('car3d/scene.gltf'))
      .then((value: Scene) => {
        this.scene = value;
        // 拿到模型根节点（旋转时用）
        this.modelNode = value.getRoot().getChild(0);
        // 相机位置：稍微俯视整车（可按模型尺寸微调）
        this.carCamera = value.getCamera(0);
        if (this.carCamera) {
          this.carCamera.position = { x: 0, y: 1.6, z: 5.5 } as Vec3;
        }
        this.startAutoRotate();
      })
      .catch((e: object) => {
        console.log('==>myTag 3D模型加载失败:' + JSON.stringify(e))
        this.loadFailed = true;
      });
  }

  aboutToDisappear(): void {
    this.stopAutoRotate();
  }

  // 自动旋转（约 30 帧/秒，每帧转 1 度）
  private startAutoRotate(): void {
    if (this.timerId !== -1) {
      return;
    }
    this.timerId = setInterval(() => {
      if (this.autoRotate && this.modelNode) {
        this.modelAngle = (this.modelAngle + 1) % 360;
        this.modelNode.rotation = { x: 0, y: this.modelAngle, z: 0 } as Vec3;
      }
    }, 33);
  }

  private stopAutoRotate(): void {
    if (this.timerId !== -1) {
      clearInterval(this.timerId);
      this.timerId = -1;
    }
  }

  build() {
    if (this.loadFailed) {
      // 模型加载失败时的兜底显示
      Text('3D 模型加载失败，请检查 rawfile/car3d/scene.gltf')
        .fontSize(12)
        .fontColor('#FFFFFF')
        .padding(10)
    } else if (this.scene) {
      SceneView({ scene: this.scene })
        .width('100%')
        .height('100%')
        .gesture(
          // 手势拖拽旋转模型
          PanGesture()
            .onActionStart(() => {
              this.lastOffsetX = 0;
              this.autoRotate = false;
            })
            .onActionUpdate((event: GestureEvent) => {
              const delta = event.offsetX - this.lastOffsetX;
              this.lastOffsetX = event.offsetX;
              this.modelAngle = (this.modelAngle + delta) % 360;
              if (this.modelNode) {
                this.modelNode.rotation = { x: 0, y: this.modelAngle, z: 0 } as Vec3;
              }
            })
            .onActionEnd(() => {
              this.autoRotate = true; // 松手后恢复自动旋转
            })
        )
    } else {
      // 模型加载中
      LoadingProgress()
        .width(40)
        .height(40)
        .color('#FFFFFF')
    }
  }
}
