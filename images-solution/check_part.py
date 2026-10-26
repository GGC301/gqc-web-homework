# -*- coding: utf-8 -*-
from docx import Document
from docx.opc.part import XmlPart, Part

doc = Document()
for part in doc.part.package.iter_parts():
    pn = str(getattr(part, 'partname', ''))
    if 'theme1.xml' in pn or 'styles.xml' in pn:
        print(pn, type(part).__name__, isinstance(part, XmlPart))
