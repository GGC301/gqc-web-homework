# -*- coding: utf-8 -*-
import zipfile
z = zipfile.ZipFile(r'C:\Users\GGC\Downloads\24001010301-关泉才-图像解决方案.docx')
t = z.read('word/theme/theme1.xml').decode('utf-8')
i = t.find('themeFontLang')
print('themeFontLang at', i)
print(t[i-20:i+120])
j = t.find('fontScheme')
print('---fontScheme---')
print(t[j:j+400])
