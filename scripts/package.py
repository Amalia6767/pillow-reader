"""Build a deterministic installable archive and a static demo (Python standard library only)."""
from pathlib import Path
import json, shutil, zipfile
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'extension'
version=json.loads((source/'manifest.json').read_text())['version']
build=ROOT/'build';build.mkdir(exist_ok=True)
archive=build/f'pillow-reader-extension-{version}.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as bundle:
 for path in sorted(source.rglob('*')):
  if not path.is_file() or path.name in {'.DS_Store','Thumbs.db'}:continue
  name='pillow-reader-extension/'+path.relative_to(source).as_posix()
  info=zipfile.ZipInfo(name,date_time=(2020,1,1,0,0,0))
  info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED
  bundle.writestr(info,path.read_bytes())
dist=ROOT/'dist'
if dist.exists():shutil.rmtree(dist)
shutil.copytree(source,dist)
shutil.copyfile(archive,dist/'pillow-reader-extension.zip')
print(f'Built build/{archive.name} and dist/')
