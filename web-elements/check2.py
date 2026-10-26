from docx import Document
import os

doc = Document(r'C:\Users\GGC\Desktop\page\web-elements\template.docx')

print("=== TABLES ===")
for ti, t in enumerate(doc.tables):
    for ri, row in enumerate(t.rows):
        for ci, cell in enumerate(row.cells):
            print(ti, ri, ci, repr(cell.text))
