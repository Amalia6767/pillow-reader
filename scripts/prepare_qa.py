"""Generate a browser controller fixture with synthetic video and expression results."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'extension';target=ROOT/'.qa';target.mkdir(exist_ok=True)
html=(source/'index.html').read_text()
html=html.replace('href="style.css?v=0.1.1"','href="../extension/style.css?v=0.1.1"')
html=html.replace('href="icon.svg"','href="../extension/icon.svg"')
html=html.replace('src="app.mjs?v=0.1.1"','src="harness.mjs"')
html=html.replace('<body>','<body><aside style="padding:12px;background:#ffeda0;position:sticky;top:0;z-index:20">合成视频回归测试 · 不使用真实摄像头 <button id="neutralPose">自然表情</button> <button id="eyesPose">闭眼动作</button> <button id="mouthPose">张嘴动作</button> <output id="sentMessages">发出翻页 0 次</output></aside>')
(target/'index.html').write_text(html)
app=(source/'app.mjs').read_text()
app=app.replace("'./gesture-engine.mjs?v=0.1.1'","'../extension/gesture-engine.mjs?v=0.1.1'")
app=app.replace("'./vendor/vision_bundle.mjs'","'./fake-model.mjs'")
(target/'app.mjs').write_text(app)
for name in ['harness.mjs','fake-model.mjs']:
 shutil.copyfile(ROOT/'tests/browser'/name,target/name)
print('Prepared .qa/ with synthetic inputs; no real camera is used.')
