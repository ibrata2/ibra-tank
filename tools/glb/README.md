# أدوات تجهيز مجسمات GLB

المجسمات اللي تطلع من أدوات تحويل الصور لثريدي تكون ثقيلة (حوالي 1.5 مليون مثلث و 85 ميغا).
`rebake.py` يخففها لعدد مثلثات قليل، ويسوي لها خريطة UV جديدة، ويعيد رسم اللون عليها من المجسم الأصلي،
فتطلع خفيفة وبدون تشويه بالألوان.

```bash
pip install trimesh xatlas fast-simplification scipy pillow
python3 tools/glb/rebake.py raw.glb out.glb --tris 3500 --tex 1024 --ground 0.02
npx @gltf-transform/cli webp out.glb src/assets/name.glb --quality 88
```

خيارات مفيدة:

- `--tris N` عدد المثلثات المطلوب، و `--tex N` حجم النسيج.
- `--ground F` يشيل قرص الأرض اللي تحت المجسم (نسبة من الارتفاع).
- `--drop-floating F` يشيل القطع الطايرة بالهوا، و `--min-comp N` يشيل القطع الصغيرة بعد التخفيف.
- `--bake-mr` يرسم نسيج المعدن والخشونة وية اللون (للآليات).

بعدها يتسجل الملف في `GLB_FILES` داخل `src/glb.js`.
