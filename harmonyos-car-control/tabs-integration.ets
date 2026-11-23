// 关泉才  建立时间: 2026-11-04  使用大模型: codebuddy/auto  功能名称: 实验指导书《车门控制功能实现》- 主页 Tabs 集成示例（步骤 9）
// 参考位置: 你项目主页（含 Navigation + Tabs 的页面）中对应位置

// 1. 在主页文件顶部导入车控页面：
import { ControlView } from '../view/ControlView';

// 2. build() 中的 Tabs 部分参考如下（index === 1 分支渲染车控页面）：
/*
build() {
  Navigation(this.pathStack) {
    Column() {
      Tabs({ barPosition: BarPosition.End }) {
        ForEach(this.navList, (item: INavItem, index) => {
          TabContent() {
            if (index === 0) {
              HomeComp()
            } else if (index === 1) {
              ControlView()
            } else if (index === 2) {

            } else if (index === 3) {

            }
          }.tabBar(this.TabBuilder(item, index))
        })
      }.onChange((index: number) => {
        this.currentIndex = index
      })
      .scrollable(false)
    }
  }
  .navDestination(this.pageMap)
  .hideTitleBar(true)
}
*/

// 3. token / carVin / carId 的传递（登录成功后写入 AppStorage，ControlView 用 @StorageProp 读取）：
/*
// 例如在登录成功跳转主页之前：
AppStorage.setOrCreate('token', this.token)
AppStorage.setOrCreate('carVin', 'LFV3A23C8K3123456') // TODO: 换成实际车架号
AppStorage.setOrCreate('carId', '1')                  // TODO: 换成实际车辆 ID
*/
