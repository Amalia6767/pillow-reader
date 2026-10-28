import {setPose} from './fake-model.mjs';
let turns=0;
globalThis.chrome={runtime:{id:'regression-test',sendMessage:async message=>{if(message.type==='readers')return {ok:true,tabs:[{id:42,title:'合成微信读书 · Canvas 重绘回归测试'}]};if(message.type==='turn'){document.getElementById('sentMessages').textContent=`发出翻页 ${++turns} 次`;return {ok:true,confirmed:false};}return {ok:false};}}};
const canvas=document.createElement('canvas');canvas.width=160;canvas.height=120;const ctx=canvas.getContext('2d');let n=0;setInterval(()=>{ctx.fillStyle=`hsl(${n++%360},30%,30%)`;ctx.fillRect(0,0,160,120);},50);
Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>canvas.captureStream(15)},configurable:true});
for(const [id,pose] of [['neutralPose','neutral'],['eyesPose','eyes'],['mouthPose','mouth']])document.getElementById(id).onclick=()=>setPose(pose);
await import('./app.mjs?v=0.1.1');
for(const [id,text,pose] of [['timedEyes','模拟一次闭眼','eyes'],['timedMouth','模拟一次张嘴','mouth']]){const b=document.createElement('button');b.id=id;b.textContent=text;b.onclick=()=>{setPose('neutral');setTimeout(()=>setPose(pose),2600);setTimeout(()=>setPose('neutral'),3600);};document.querySelector('aside').append(b);}
