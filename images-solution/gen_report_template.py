# -*- coding: utf-8 -*-
"""按老师原始模板结构生成：图像解决方案 项目报告
模板结构（来自 高级网页设计I 图像解决方案 项目报告.doc）：
- 标题 + 信息表格（学号/姓名/班级/项目选题名称）
- 实施过程
  一、项目需求与实现（iconfont全部图标截图 + 下导航原图 + 下导航实现图）
  二、项目代码（字体图标/SVG + 学号姓名/缩写类名 + 全局CSS）
  三、测试与发布（测试截图）
- 项目总结（心得 + AI方法）
"""
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import os

doc = Document()

# 设置中文字体
style = doc.styles['Normal']
style.font.name = 'Times New Roman'
style.font.size = Pt(10.5)
style.element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')

# ============ 标题 ============
t = doc.add_paragraph()
t.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = t.add_run('《高级网页设计I》')
r.bold = True
r.font.size = Pt(16)
t2 = doc.add_paragraph()
t2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = t2.add_run('图像解决方案 项目报告')
r2.bold = True
r2.font.size = Pt(16)

# ============ 信息表格 ============
table = doc.add_table(rows=3, cols=2)
table.style = 'Table Grid'
table.alignment = WD_TABLE_ALIGNMENT.CENTER

# 表头行
hdr = table.rows[0].cells
hdr[0].text = '学号：24001010301'
hdr[1].text = '姓名：关泉才'
row2 = table.rows[1].cells
row2[0].text = '班级'
row2[1].text = '计算机 24003'
row3 = table.rows[2].cells
row3[0].text = '项目选题名称'
row3[1].text = '菜鸟教程官网手机版（底部下导航：字体图标 + SVG 图像解决方案）'

shots = r'C:\Users\GGC\Desktop\page\images-solution\shots'

# ============ 实施过程 ============
doc.add_heading('实施过程', level=1)

doc.add_heading('一、项目需求与实现', level=2)
doc.add_paragraph(
    '三级项目为菜鸟教程官网（www.runoob.com）手机版。本实验复刻其底部下导航：'
    '从 iconfont.cn 在线项目（项目ID 5244718，项目名 gqc301）下载字体图标，'
    '采用字体图标 + 内联 SVG 两种图像解决方案，'
    '配合 CSS 实现自适应宽度的固定底部导航栏（5 项：首页 / 教程 / 论坛 / 收藏 / 我的）。')

doc.add_paragraph('（1）从 iconfont 获得的所有图标的截图：')
doc.add_picture(os.path.join(shots, 'iconfont-all.png'), width=Inches(6))

doc.add_paragraph('（2）下导航原图（菜鸟教程官网手机版下导航）：')
doc.add_picture(os.path.join(shots, 'impl-full.png'), width=Inches(6))

doc.add_paragraph('（3）下导航实现图（复刻实现，position:fixed 固定底部 + flex 自适应等宽）：')
doc.add_picture(os.path.join(shots, 'impl-nav.png'), width=Inches(6))

# ============ 项目代码 ============
doc.add_heading('二、项目代码', level=2)
doc.add_paragraph(
    '要求：使用字体图标或 SVG 的方式使用 iconfont 图标，代码中要包含学号或姓名，'
    '或者类名中包括姓名缩写，原则上不建议使用 id 选择器，原则上要设计全局 CSS。'
    '本实验类名统一使用 gqc- 前缀（guanquancai 缩写），包含学号 24001010301 和姓名信息。')

doc.add_paragraph('（1）iconfont 字体图标引入（使用 @font-face 字体，全局 CSS）：')
doc.add_paragraph('''<link rel="stylesheet" href="font/iconfont.css">

@font-face {
  font-family: "iconfont"; /* Project id 5244718 gqc301 */
  src: url('iconfont.woff2?t=...') format('woff2'),
       url('iconfont.woff?t=...') format('woff'),
       url('iconfont.ttf?t=...') format('truetype');
}
.iconfont { font-family: "iconfont" !important; font-style: normal; }''')

doc.add_paragraph('（2）下导航 HTML 结构（5 项 iconfont 字体图标）：')
doc.add_paragraph('''<nav class="gqc-m-tabbar">
  <a href="#" class="gqc-active">
    <i class="iconfont icon-shouye"></i><span>首页</span>
  </a>
  <a href="#">
    <i class="iconfont icon-gengduo"></i><span>教程</span>
  </a>
  <a href="#">
    <i class="iconfont icon-luntan"></i><span>论坛</span>
  </a>
  <a href="#">
    <i class="iconfont icon-xihuan"></i><span>收藏</span>
  </a>
  <a href="#">
    <i class="iconfont icon-gerenzhongxin-zhihui"></i><span>我的</span>
  </a>
</nav>''')

doc.add_paragraph('（3）下导航 CSS（全局 CSS：自适应宽度 + 固定底部 + 字体图标修饰）：')
doc.add_paragraph('''.gqc-m-tabbar { position:fixed; bottom:0; left:0; right:0; height:56px;
  background:#fff; border-top:1px solid #e8e8e8; display:flex; z-index:100; }
.gqc-m-tabbar a { flex:1; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:3px; color:#999; min-width:0; }
.gqc-m-tabbar .iconfont { font-size:22px; line-height:1; }
.gqc-m-tabbar a.gqc-active { color:#73a857; }
.gqc-m-tabbar a.gqc-active .iconfont { font-size:26px; }''')

doc.add_paragraph('（4）内联 SVG（搜索放大镜图标 + banner 渐变背景，第二种图像解决方案）：')
doc.add_paragraph('''<!-- 搜索放大镜 SVG -->
<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>

<!-- banner 线性渐变 SVG -->
<svg viewBox="0 0 400 120" preserveAspectRatio="none">
  <defs>
    <linearGradient id="gqcGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8bc34a"/>
      <stop offset="100%" stop-color="#3f7d20"/>
    </linearGradient>
  </defs>
  <rect width="400" height="120" fill="url(#gqcGrad)"/>
</svg>''')

# ============ 测试与发布 ============
doc.add_heading('三、测试与发布', level=2)
doc.add_paragraph(
    '给出不同视口、不同浏览器下的测试截图。本实验在 Microsoft Edge 浏览器（1920×1080 视口）'
    '和手机视口宽度下分别测试：页面完整渲染，下导航 position:fixed 固定在底部，'
    '滚动页面后仍固定显示；5 个导航项字体图标正常显示，首页为激活态（绿色 #73a857 + 图标放大）。')
doc.add_paragraph('测试图（Edge 浏览器，下导航固定显示在底部）：')
doc.add_picture(os.path.join(shots, 'impl-full.png'), width=Inches(6))
doc.add_paragraph('测试图（下导航细节放大）：')
doc.add_picture(os.path.join(shots, 'impl-nav.png'), width=Inches(6))

# ============ 项目总结 ============
doc.add_heading('项目总结', level=1)
doc.add_paragraph(
    '本次实验通过复刻菜鸟教程官网手机版，掌握了图像解决的两种方案：'
    '①iconfont 字体图标——从 iconfont.cn 获取在线图标项目（gqc301，20 个图标），'
    '通过 @font-face 引入 woff2/ttf 字体文件，用 <i class="iconfont icon-xxx"></i> 在页面中使用，'
    '加载快、可无限放大不失真、可通过 CSS 修改颜色大小；'
    '②内联 SVG——搜索放大镜图标与 banner 线性渐变背景直接用 SVG 代码绘制，无需图片文件。'
    '下导航使用 position:fixed + display:flex + flex:1 实现自适应宽度、固定底部的效果，'
    '并用 CSS 对字体图标进行修饰（颜色、大小、激活态）。'
    '主要收获：①掌握了字体图标的获取与引入完整流程；②理解 SVG 内联绘制与渐变定义；'
    '③学会 flex 实现自适应等宽导航栏；④巩固 fixed 定位实现固定底栏。'
    '教训：字体文件必须与 CSS 保持正确相对路径，否则图标无法显示。'
    '使用的 AI 方法：使用豆包 AI 辅助生成 HTML 结构和 CSS 样式，'
    '参考菜鸟教程官网设计稿进行人工调整。学号 24001010301 关泉才。'
)

out = r'C:\Users\GGC\Downloads\24001010301-关泉才-图像解决方案.docx'
doc.save(out)
print('saved', out)
