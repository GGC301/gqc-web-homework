from docx import Document
from docx.shared import Inches
import os

doc = Document(r'C:\Users\GGC\Desktop\page\web-elements\template.docx')
shots = r'C:\Users\GGC\Desktop\page\web-elements\shots'

# 打印所有段落看结构
for i, p in enumerate(doc.paragraphs):
    print(i, repr(p.text[:80]))
