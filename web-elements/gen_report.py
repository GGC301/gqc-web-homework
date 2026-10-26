from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os

doc = Document()
title = doc.add_heading('《高级网页设计I》  网页元素设计 项目报告', level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

info = doc.add_paragraph()
info.add_run('学  号：').bold = True
info.add_run('24001010301\n')
info.add_run('姓  名：').bold = True
info.add_run('关泉才\n')
info.add_run('班  级：').bold = True
info.add_run('24001班')

doc.add_heading('项目选题名称', level=1)
doc.add_paragraph('参考菜鸟教程官网（www.runoob.com），选取三个典型网页元素进行复刻设计：'
                  '①顶部导航栏；②课程卡片列表（上图下文）；③左侧目录+右侧内容区布局。')

doc.add_heading('实施过程 - 项目需求与实现', level=1)
doc.add_paragraph('根据菜鸟教程官网设计图，使用HTML语义化标签和CSS Flex/Grid布局完成三个典型网页元素的复刻。'
                  '至少两处包含图片，图标用渐变色块代替，使用flex和grid布局，不使用float。')

shots = r'C:\Users\GGC\Desktop\page\web-elements\shots'

# 元素1：导航栏
doc.add_heading('网页元素1：顶部导航栏', level=2)
doc.add_paragraph('原图（菜鸟官网绿色导航栏）：')
doc.add_picture(os.path.join(shots, 'orig-home.png'), width=Inches(6))
doc.add_paragraph('实现图（复刻的深色导航栏）：')
doc.add_picture(os.path.join(shots, 'impl-nav.png'), width=Inches(6))

# 元素2：卡片
doc.add_heading('网页元素2：课程卡片列表（上图下文）', level=2)
doc.add_paragraph('原图（菜鸟官网卡片网格）：')
doc.add_picture(os.path.join(shots, 'orig-cards.png'), width=Inches(6))
doc.add_paragraph('实现图（复刻的四色卡片）：')
doc.add_picture(os.path.join(shots, 'impl-cards.png'), width=Inches(6))

# 元素3：左右布局
doc.add_heading('网页元素3：左侧目录 + 右侧内容区', level=2)
doc.add_paragraph('原图（菜鸟官网教程页布局）：')
doc.add_picture(os.path.join(shots, 'orig-home.png'), width=Inches(6))
doc.add_paragraph('实现图（复刻的左右布局）：')
doc.add_picture(os.path.join(shots, 'impl-layout.png'), width=Inches(6))

doc.add_heading('项目核心代码', level=1)
doc.add_paragraph('代码中类名统一使用 gqc- 前缀（guanquancai 缩写），包含学号 24001010301 和姓名信息，'
                  '使用class选择器，设计全局CSS。')

doc.add_heading('网页元素1核心代码（顶部导航栏）', level=2)
doc.add_paragraph('''<nav class="gqc-navbar">
  <div class="gqc-navbar__logo">
    <div class="gqc-navbar__logo-mark">run</div>
    <span>菜鸟教程</span>
  </div>
  <div class="gqc-navbar__menu">
    <a href="#">首页</a><a href="#">HTML教程</a><a href="#">CSS教程</a>
    <a href="#">JavaScript</a><a href="#">Python</a><a href="#">SQL</a>
  </div>
  <div class="gqc-navbar__search">
    <input type="text" placeholder="输入教程关键字"><button>搜索</button>
  </div>
</nav>

.gqc-navbar { background:#222f3e; display:flex; justify-content:space-between;
  align-items:center; padding:0 40px; height:60px; color:#fff; }
.gqc-navbar__menu { display:flex; gap:28px; }''')

doc.add_heading('网页元素2核心代码（课程卡片）', level=2)
doc.add_paragraph('''<div class="gqc-card-list">
  <div class="gqc-card">
    <div class="gqc-card__thumb gqc-card__thumb--green">HTML</div>
    <div class="gqc-card__body">
      <div class="gqc-card__title">HTML 教程</div>
      <div class="gqc-card__desc">超文本标记语言...</div>
    </div>
  </div>
</div>

.gqc-card-list { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
.gqc-card { background:#fff; border-radius:8px; overflow:hidden;
  box-shadow:0 2px 8px rgba(0,0,0,.08); transition:transform .2s; }
.gqc-card:hover { transform:translateY(-4px); }''')

doc.add_heading('网页元素3核心代码（左侧目录+右侧内容）', level=2)
doc.add_paragraph('''<section class="gqc-layout">
  <aside class="gqc-sidebar">
    <div class="gqc-sidebar__item gqc-sidebar__item--active">HTML 简介</div>
    <div class="gqc-sidebar__item">HTML 编辑器</div>
    <div class="gqc-sidebar__item">HTML 基础</div>
  </aside>
  <div class="gqc-content">
    <h2>HTML 简介</h2>
    <p>关泉才 24001010301 - 高级网页设计I 实验作业</p>
  </div>
</section>

.gqc-layout { display:flex; gap:24px; max-width:1200px; margin:40px auto; }
.gqc-sidebar { flex:0 0 220px; background:#fff; border-radius:8px; }
.gqc-content { flex:1; background:#fff; border-radius:8px; padding:24px; }''')

doc.add_heading('测试与发布', level=1)
doc.add_paragraph('在 Microsoft Edge 浏览器中打开 index.html，三个网页元素均正常显示。')
doc.add_paragraph('网页元素一测试图：')
doc.add_picture(os.path.join(shots, 'impl-full.png'), width=Inches(6))

doc.add_heading('项目总结', level=1)
doc.add_paragraph(
    '本次实验通过复刻菜鸟教程官网的三个典型网页元素，巩固了HTML语义化标签和CSS布局知识。'
    '主要收获：①掌握了Flex布局实现导航栏的横向排列和两端对齐；②学会使用Grid布局做响应式卡片网格；'
    '③理解了BEM命名规范和class选择器复用；④通过测量真实网站获取颜色值和间距，培养了视觉还原能力。'
    '使用的AI方法：使用豆包AI辅助生成HTML结构和CSS样式，参考菜鸟教程官网设计稿进行人工调整。'
    '学号24001010301 关泉才。'
)

out = r'C:\Users\GGC\Downloads\24001010301-关泉才-网页元素设计.docx'
doc.save(out)
print('saved', out)
