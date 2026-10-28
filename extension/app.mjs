import {GestureEngine} from './gesture-engine.mjs?v=0.1.1';
const $=id=>document.getElementById(id);
const extension=!!globalThis.chrome?.runtime?.id;
document.body.classList.toggle('is-extension',extension);
const pages=[
 ['把时间，留给一页书','屋子渐渐安静下来。灯光落在书页上，像一小块温暖的午后。','我们把枕头垫好，把今天的忙碌暂时放到一边。此刻没有待办事项，只有一个故事，在等着慢慢展开。','读到这里，闭上眼睛稍停，再轻轻睁开。下一页，会接住你的思绪。'],
 ['窗外的声音','风穿过树叶时，并不急着去往哪里。它停一停，绕一个弯，再把细碎的声音送到窗前。','读书也是这样。有时一段话需要来回走几遍，有时只一个句子，就足够陪伴很久。','你可以试试张嘴模式，找到更轻松的翻页方式。'],
 ['一个舒服的距离','书不必握在手里，故事也可以离我们很近。只要抬眼就能看见，只要一个小动作就能继续。','翻页之后，留一点停顿。让目光落在第一行，让呼吸回到自己的节奏。','如果姿势变了，重新校准一下。舒服，比读得快更要紧。'],
 ['慢慢读下去','这一小段试读就到这里。等你连接微信读书，可以继续自己喜欢的那本书。','也许是读过一半的小说，也许是一直想开始的散文。它们都不着急。','愿你在今天的故事里，找到一小块安静的地方。']
];
let page=0;
function render(){const [title,...paragraphs]=pages[page];$('page').replaceChildren();const h=document.createElement('h3');h.textContent=title;$('page').append(h);for(const text of paragraphs){const p=document.createElement('p');p.textContent=text;$('page').append(p);}$('pageCount').textContent=`${String(page+1).padStart(2,'0')} / 04`;$('demoPrev').disabled=page===0;$('demoNext').disabled=page===pages.length-1;}
render();
function feedback(text,error=false){$('feedback').textContent=text;$('feedback').classList.toggle('error',error);}
function demoTurn(direction){const next=page+direction;if(next<0||next>=pages.length)return false;page=next;render();return true;}
$('demoPrev').onclick=()=>demoTurn(-1);$('demoNext').onclick=()=>demoTurn(1);
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
let mode='eyes',engine=new GestureEngine(),stream=null,detector=null,raf=0,lastVideoTime=-1,lastInference=0,generation=0;
let ready=false,running=false,busy=false,turns=0,connectionVerified=false,connectedTab=null;
let baseline=null,calibrating=false,calibrationStart=null,calibrationFrames=[],lastFeedbackState='',lastDiagnostic=0,lastModelError='';
const message=async(type,extra={})=>{const result=await chrome.runtime.sendMessage({type,...extra});if(!result?.ok)throw new Error(result?.error||'连接失败，请刷新微信读书页面后重试。');return result;};
function paused(text){running=false;engine.reset();$('toggle').textContent='开始免手翻页';$('status').textContent=ready?'已暂停':'未开启';$('status').classList.remove('on');if(ready)$('recognitionState').textContent='识别已就绪 · 已暂停，不会翻页';if(text)feedback(text);}
function choose(next){mode=next;engine.mode=mode;engine.reset();for(const id of ['eyes','mouth']){$(id).classList.toggle('selected',id===mode);$(id).setAttribute('aria-pressed',String(id===mode));}$('gestureHint').textContent=mode==='eyes'?'忽略短促眨眼；睁开眼睛后翻页，避免闭眼时错过文字。':'轻轻张嘴，停一下再合上。说话、打哈欠时请先暂停。';$('threshold').value=String(engine.thresholds[mode]*100);$('thresholdValue').textContent=`${Math.round(engine.thresholds[mode]*100)}%`;if(running)feedback('动作已切换，保持自然表情后做翻页动作。');}
$('threshold').oninput=()=>{engine.thresholds[mode]=Number($('threshold').value)/100;engine.reset();$('thresholdValue').textContent=`${$('threshold').value}%`;};
$('eyes').onclick=()=>choose('eyes');$('mouth').onclick=()=>choose('mouth');
$('hold').oninput=()=>{engine.hold=Number($('hold').value);engine.reset();$('holdValue').textContent=`${(engine.hold/1000).toFixed(2)} 秒`;};
function beginCalibration(){if(!detector)return;paused();ready=false;baseline=null;calibrating=true;calibrationStart=null;calibrationFrames=[];$('toggle').disabled=true;$('status').textContent='校准中';feedback('请保持现在的姿势，睁眼、合嘴看向屏幕约 3 秒。');}
$('recalibrate').onclick=beginCalibration;
function normalise(s){return {left:Math.max(0,(s.left-baseline.left)/(1-baseline.left)),right:Math.max(0,(s.right-baseline.right)/(1-baseline.right)),mouth:Math.max(0,(s.mouth-baseline.mouth)/(1-baseline.mouth))};}
function scores(result){const list=result.faceBlendshapes?.[0]?.categories;if(!list)return null;const map=Object.fromEntries(list.map(x=>[x.categoryName,x.score]));return {left:map.eyeBlinkLeft??0,right:map.eyeBlinkRight??0,mouth:map.jawOpen??0};}
async function turn(direction=1,manual=false){
 if(busy)return;busy=true;
 try{
  let confirmed=true;
  if(extension){if(!connectedTab)throw new Error('请先选择一本已打开的微信读书。');
   const target=connectedTab;const response=await message('turn',{tabId:target,direction});if(target!==connectedTab)return;confirmed=response.confirmed===true;connectionVerified=true;
   $('connectionStatus').textContent=confirmed?'已检测到书页变化，可以开始免手翻页。':'已向微信读书发送翻页操作。请确认书页已变化，再点击开始。';
  }else if(!demoTurn(direction)){paused('这段试读已到结尾。可用箭头返回，或安装扩展继续读自己的书。');return;}
  turns++;$('turnCount').textContent=extension?`已发送 ${turns} 次翻页`:`已翻 ${turns} 页`;feedback(extension?(confirmed?'已检测到书页变化。放松一下，继续读。':manual?'翻页操作已发送。若书页已翻动，就可以点击「开始免手翻页」。':'动作已识别，翻页操作已发送。'):'试读已翻页。放松一下，继续读。');if(manual&&extension)$('status').textContent=running?'正在陪读':ready?'已就绪':'已连接';
 }catch(e){if(extension)connectionVerified=false;paused();feedback(e.message,true);if(extension)$('connectionStatus').textContent=e.message;
 }finally{busy=false;}
}
function tick(t){
 raf=requestAnimationFrame(tick);
 if(document.hidden||!detector||$('video').readyState<2||$('video').currentTime===lastVideoTime||t-lastInference<66)return;
 lastVideoTime=$('video').currentTime;lastInference=t;
 let face;try{face=scores(detector.detectForVideo($('video'),t));}catch(e){lastModelError=e.message;stopCamera();feedback(`识别中断：${lastModelError}。请重新开启摄像头。`,true);return;}
 if(!face){engine.reset();calibrationStart=null;calibrationFrames=[];$('faceLabel').textContent='没有看到脸';$('recognitionState').textContent='没看到脸 · 不会翻页';$('eyeScore').textContent='—';$('mouthScore').textContent='—';$('eyeMeter').value=0;$('mouthMeter').value=0;$('gestureProgress').style.width='0';if(lastFeedbackState!=='lost'){feedback('暂时没看到你的脸，翻页已挂起。请让摄像头看清脸部。');lastFeedbackState='lost';}return;}
 $('faceLabel').textContent='已看到你的脸';
 if(t-lastDiagnostic>150){const values=baseline?normalise(face):face;const eyes=Math.round(Math.min(values.left,values.right)*100),mouth=Math.round(values.mouth*100);$('eyeScore').textContent=`${eyes}%`;$('mouthScore').textContent=`${mouth}%`;$('eyeMeter').value=eyes;$('mouthMeter').value=mouth;$('recognitionState').textContent=calibrating?'校准中 · 不会翻页':running?'识别中 · 松开动作后发送翻页':'识别已就绪 · 点开始后才会翻页';lastDiagnostic=t;}
 if(calibrating){
  if(face.left>.4||face.right>.4||face.mouth>.35){calibrationStart=null;calibrationFrames=[];feedback('校准时请睁开眼睛、合上嘴巴，让脸部光线充足。');return;}
  calibrationStart??=t;calibrationFrames.push(face);const elapsed=t-calibrationStart;$('gestureProgress').style.width=`${Math.min(100,elapsed/25)}%`;
  if(elapsed>=2500&&calibrationFrames.length>=20){const median=key=>{const a=calibrationFrames.map(s=>s[key]).sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};baseline={left:median('left'),right:median('right'),mouth:median('mouth')};ready=true;calibrating=false;engine.reset();$('toggle').disabled=false;$('status').textContent='已就绪';$('recognitionState').textContent='校准完成 · 点开始后才会翻页';$('gestureProgress').style.width='0';feedback('校准好了。点击「开始免手翻页」，再做一个轻松的动作。');}
  return;
 }
 if(!running){if(lastFeedbackState==='lost'){feedback('又看到你了。准备好后点击开始。');lastFeedbackState='';}return;}
 const r=engine.update(normalise(face),t);$('gestureProgress').style.width=`${r.progress*100}%`;
 if(r.trigger){lastFeedbackState='trigger';void turn();}
 else if(r.state!==lastFeedbackState){lastFeedbackState=r.state;const lines={holding:mode==='eyes'?'保持一下，再睁眼就翻页。':'保持一下，再合嘴就翻页。','too-long':'动作太久，本次取消。恢复自然表情再试。',neutral:'放松表情，准备下一次翻页。',cooldown:'已收到动作，稍等一下再继续。',ready:'正在陪你读。准备好时，做一个翻页动作。'};if(lines[r.state])feedback(lines[r.state]);}
}
async function startCamera(){
 if(!navigator.mediaDevices?.getUserMedia){feedback('当前环境无法使用摄像头。请在桌面 Chrome / Edge 通过 HTTPS 或扩展打开。',true);return;}
 const current=++generation;$('cameraStart').disabled=true;$('cameraStart').textContent='正在打开…';
 try{
  const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
  if(current!==generation){media.getTracks().forEach(t=>t.stop());return;}
  stream=media;$('video').srcObject=stream;await $('video').play();
  $('video').hidden=false;$('placeholder').hidden=true;$('previewToggle').hidden=false;$('cameraStart').hidden=true;$('runningControls').hidden=false;$('calibrationRow').hidden=false;feedback('正在载入本机识别模型，首次需要几秒…');
  const {FaceLandmarker,FilesetResolver}=await import('./vendor/vision_bundle.mjs');
  const vision=await FilesetResolver.forVisionTasks(new URL('./vendor/',import.meta.url).href);
  const model=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:new URL('./vendor/face_landmarker.task',import.meta.url).href,delegate:'CPU'},runningMode:'VIDEO',outputFaceBlendshapes:true,numFaces:1,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.6,minTrackingConfidence:.6});
  if(current!==generation){model.close();return;}
  detector=model;lastVideoTime=-1;lastInference=0;lastFeedbackState='';beginCalibration();raf=requestAnimationFrame(tick);
  for(const track of stream.getVideoTracks())track.addEventListener('ended',()=>{stopCamera();feedback('摄像头已断开。请检查设备后重新开启。',true);});
 }catch(e){if(current!==generation)return;stopCamera();const messages={NotAllowedError:'摄像头权限未开启。请允许此页面使用摄像头后重试。',NotFoundError:'没有找到摄像头。请连接摄像头后重试。',NotReadableError:'摄像头可能正被其他应用使用。关闭占用它的应用后重试。'};feedback(messages[e.name]||'摄像头或识别模型未能启动。请使用最新版桌面 Chrome / Edge 后重试。',true);
 }finally{if(current===generation){$('cameraStart').disabled=false;$('cameraStart').innerHTML='开启摄像头 <span>↗</span>';}}
}
function stopCamera(){
 generation++;cancelAnimationFrame(raf);paused();ready=false;calibrating=false;baseline=null;
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}if(detector){detector.close();detector=null;}
 $('video').srcObject=null;$('video').hidden=true;$('placeholder').hidden=false;$('previewToggle').hidden=true;$('cameraStart').hidden=false;$('cameraStart').disabled=false;$('cameraStart').innerHTML='开启摄像头 <span>↗</span>';$('runningControls').hidden=true;$('calibrationRow').hidden=true;$('toggle').disabled=true;$('faceLabel').textContent='摄像头未开启';$('gestureProgress').style.width='0';$('status').textContent='未开启';$('recognitionState').textContent='摄像头未开启 · 不会翻页';$('eyeScore').textContent='—';$('mouthScore').textContent='—';$('eyeMeter').value=0;$('mouthMeter').value=0;feedback('摄像头已关闭。准备好时，再回来继续。');
}
function toggle(){if(!ready)return;if(running){paused('已暂停。舒服地调整一下姿势。');return;}if(extension&&!connectionVerified){feedback('先点「测试下一页」确认连接成功，再开始。',true);return;}running=true;engine.reset();lastFeedbackState='';$('toggle').textContent='暂停免手翻页';$('status').textContent='正在陪读';$('status').classList.add('on');$('recognitionState').textContent='识别中 · 松开动作后发送翻页';feedback('正在陪你读。保持自然表情，再做翻页动作。');}
$('cameraStart').onclick=startCamera;$('cameraStop').onclick=stopCamera;$('toggle').onclick=toggle;
$('previewToggle').onclick=()=>{const hide=!$('video').hidden;$('video').hidden=hide;$('placeholder').hidden=!hide;$('placeholder').querySelector('p').textContent=hide?'画面已隐藏，识别仍在本机进行':'在这里，找到你的舒服姿势';$('placeholder').querySelector('small').textContent=hide?'你可以安心看书':'开启后才会使用前置摄像头';$('previewToggle').textContent=hide?'显示画面':'隐藏画面';};
window.addEventListener('pagehide',stopCamera);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)paused('控制窗进入后台，已暂停。请保持小窗可见后重新开始。');if(document.hidden){engine.reset();if(calibrating){calibrationStart=null;calibrationFrames=[];}}});
document.addEventListener('keydown',e=>{if($('helpDialog').open)return;if(e.code==='Escape'){paused('已暂停。');return;}if(['INPUT','SELECT','BUTTON','TEXTAREA','A'].includes(document.activeElement?.tagName))return;if(e.code==='Space'){e.preventDefault();toggle();}});
async function refreshTabs(){
 paused();connectionVerified=false;connectedTab=null;
 try{const {tabs}=await message('readers');$('readerTabs').replaceChildren();if(!tabs.length){const o=new Option('请先打开微信读书里的一本书','');$('readerTabs').append(o);$('connectionStatus').textContent='还没找到书。请打开 weread.qq.com，进入阅读页面再刷新。';return;}
 for(const tab of tabs)$('readerTabs').append(new Option(tab.title||'微信读书',String(tab.id)));connectedTab=Number($('readerTabs').value);$('connectionStatus').textContent='已找到书。请先测试一次翻页。';
 }catch(e){$('connectionStatus').textContent=e.message;}
}
if(extension){$('readerConnection').hidden=false;$('platformNote').textContent='保留控制小窗可见。空格暂停 / 继续。';$('demoMode').textContent='电脑扩展';$('readerTabs').onchange=()=>{connectedTab=Number($('readerTabs').value)||null;connectionVerified=false;paused('已切换书籍。请重新测试翻页。');$('connectionStatus').textContent='请先测试一次翻页。';};$('refresh').onclick=refreshTabs;$('testPrev').onclick=()=>turn(-1,true);$('testNext').onclick=()=>turn(1,true);void refreshTabs();}
