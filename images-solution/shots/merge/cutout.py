# -*- coding: utf-8 -*-
"""用 GrabCut 抠出第二张图的 8 个人，贴到第一张双选会现场图"""
import cv2
import numpy as np
from PIL import Image

IMG1 = r"C:\Users\GGC\Desktop\page\images-solution\shots\merge\img1.png"
IMG2 = r"C:\Users\GGC\Desktop\page\images-solution\shots\merge\img2.png"

# ---------- 1. 读取第二张图并 GrabCut 抠人 ----------
img2 = cv2.imread(IMG2)
h2, w2 = img2.shape[:2]
print("img2 size:", w2, h2)

# 8 个人站在课桌后，大致占画面中部。矩形框住人物主体（排除最上白板/最下桌面）
rect = (int(w2*0.03), int(h2*0.10), int(w2*0.94), int(h2*0.62))
mask = np.zeros((h2, w2), np.uint8)
bgd = np.zeros((1, 65), np.float64)
fgd = np.zeros((1, 65), np.float64)
cv2.grabCut(img2, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
mask2 = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

# 形态学清理：闭运算去噪 + 保留最大连通域
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
mask2 = cv2.morphologyEx(mask2, cv2.MORPH_CLOSE, kernel, iterations=2)
mask2 = cv2.morphologyEx(mask2, cv2.MORPH_OPEN, kernel, iterations=1)

# 找到人物区域的包围盒
ys, xs = np.where(mask2 > 0)
if len(xs) == 0:
    print("NO FOREGROUND FOUND")
    raise SystemExit(1)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
print("person bbox:", x0, y0, x1, y1)

# 抠出人物 + alpha
person = img2[y0:y1+1, x0:x1+1]
alpha = mask2[y0:y1+1, x0:x1+1]
# alpha 边缘羽化
alpha = cv2.GaussianBlur(alpha, (5, 5), 0)
bgr = cv2.cvtColor(person, cv2.COLOR_BGR2BGRA)
bgr[:, :, 3] = alpha
person_pil = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGRA2RGBA))
person_pil.save(r"C:\Users\GGC\Desktop\page\images-solution\shots\merge\person_cut.png")
print("person saved:", person_pil.size)

# ---------- 2. 贴到第一张图 ----------
img1 = Image.open(IMG1).convert("RGBA")
w1, h1 = img1.size
print("img1 size:", w1, h1)

# 缩放人物到合适大小：约占图宽 55%
target_w = int(w1 * 0.55)
ratio = target_w / person_pil.width
target_h = int(person_pil.height * ratio)
person_resized = person_pil.resize((target_w, target_h), Image.LANCZOS)
print("resized person:", person_resized.size)

# 摆放位置：横向居中，纵向在拱门下方广场区域（约 62%-92% 高度）
pos_x = (w1 - target_w) // 2
pos_y = int(h1 * 0.60)
print("paste at:", pos_x, pos_y)

canvas = img1.copy()
canvas.alpha_composite(person_resized, (pos_x, pos_y))
canvas.convert("RGB").save(r"C:\Users\GGC\Desktop\page\images-solution\shots\merge\merged_grabcut.png")
print("merged saved")
