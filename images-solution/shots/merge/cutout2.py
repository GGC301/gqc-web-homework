# -*- coding: utf-8 -*-
"""亮度阈值抠图：白墙背景亮，人物衣服暗"""
import cv2
import numpy as np
from PIL import Image

IMG2 = r"C:\Users\GGC\Desktop\page\images-solution\shots\merge\img2.png"
IMG1 = r"C:\Users\GGC\Desktop\page\images-solution\shots\merge\img1.png"

img2 = cv2.imread(IMG2)
h2, w2 = img2.shape[:2]
hsv = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)
v = hsv[:, :, 2]

# 人物范围：y 6%-54% (避开下方黑色椅背)
y_lo, y_hi = int(h2*0.06), int(h2*0.54)
fg = np.zeros((h2, w2), np.uint8)
fg[y_lo:y_hi, :] = 255  # 只在此区域找前景

# 亮度阈值：暗 = 前景(人物)，亮 = 背景(白墙/白板)
dark = (v < 140).astype(np.uint8) * 255
mask = cv2.bitwise_and(fg, dark)

# 形态学清理
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

# 只保留最大连通域（8人连成一片）
n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, 8)
if n <= 1:
    print("no fg")
    raise SystemExit(1)
big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
mask = np.where(labels == big, 255, 0).astype(np.uint8)

# 再清理
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

ys, xs = np.where(mask > 0)
if len(xs) == 0:
    print("EMPTY")
    raise SystemExit(1)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
print("person bbox:", x0, y0, x1, y1, "size:", x1-x0, y1-y0)

# 生成 RGBA 人物图（先收紧左右空白）
pad = int((x1 - x0) * 0.02)
x0t, x1t = x0 + pad, x1 - pad
person = img2[y0:y1+1, x0t:x1t+1]
alpha = mask[y0:y1+1, x0t:x1t+1].copy()
# 边缘羽化
alpha = cv2.GaussianBlur(alpha, (5, 5), 0)
bgra = cv2.cvtColor(person, cv2.COLOR_BGR2BGRA)
bgra[:, :, 3] = alpha
person_pil = Image.fromarray(cv2.cvtColor(bgra, cv2.COLOR_BGRA2RGBA))
person_pil.save(r"C:\Users\GGC\Desktop\page\images-solution\shots\merge\person_cut.png")
print("person saved:", person_pil.size)

# ---------- 贴到第一张 ----------
img1 = Image.open(IMG1).convert("RGBA")
w1, h1 = img1.size

# 人物放大到占图宽 100%（全宽横排合影），高度随之
target_w = w1
ratio = target_w / person_pil.width
target_h = int(person_pil.height * ratio)
person_resized = person_pil.resize((target_w, target_h), Image.LANCZOS)
print("resized:", person_resized.size)

# 位置：横向居中，人物顶部在拱门下方约 52% 高度
pos_x = 0
pos_y = int(h1 * 0.52)
print("paste:", pos_x, pos_y)

canvas = img1.copy()
canvas.alpha_composite(person_resized, (pos_x, pos_y))
# 在人物脚下加一个椭圆柔和阴影，增强落地感
from PIL import ImageDraw, ImageFilter
shadow = Image.new("RGBA", (w1, h1), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sh_h = max(14, target_h // 12)
sd.ellipse((pos_x + target_w*0.06, pos_y + target_h - 4, pos_x + target_w*0.94, pos_y + target_h + sh_h), fill=(0, 0, 0, 80))
shadow = shadow.filter(ImageFilter.GaussianBlur(8))
canvas.alpha_composite(shadow, (0, 0))
canvas.convert("RGB").save(r"C:\Users\GGC\Desktop\page\images-solution\shots\merge\merged_v3.png")
print("merged v3 saved")
