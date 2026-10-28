chrome.action.onClicked.addListener(async()=>{
 const url=chrome.runtime.getURL('index.html');
 const windows=await chrome.windows.getAll({populate:true});
 const existing=windows.find(w=>w.tabs?.some(t=>t.url===url));
 if(existing){await chrome.windows.update(existing.id,{focused:true,state:'normal'});return;}
 await chrome.windows.create({url,type:'popup',width:470,height:960,focused:true});
});
// Executed only in the selected weread.qq.com reader. No book text leaves this function.
async function flipReader(direction){
 if(location.hostname!=='weread.qq.com'||!location.pathname.startsWith('/web/reader/'))return {ok:false,error:'当前标签页不是微信读书阅读页。请打开一本书后刷新连接。'};
 const visible=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';};
 const selector=direction===1?'.renderTarget_pager_button_right':'.renderTarget_pager_button:not(.renderTarget_pager_button_right)';
 let button=Array.from(document.querySelectorAll(selector)).find(visible);
 if(!button){const name=direction===1?'下一页':'上一页';button=Array.from(document.querySelectorAll('button')).find(e=>visible(e)&&e.textContent.trim()===name);}
 if(!button)return {ok:false,error:'未找到可用翻页按钮。请切换到微信读书的翻页模式，确认已登录并且没有弹窗。'};
 const signature=()=>{const el=document.querySelector('.renderTargetContent');return location.href+'|'+(el?.innerHTML||'')+'|'+Array.from(document.querySelectorAll('.renderTargetPageInfo')).map(e=>e.innerHTML).join('|');};
 const before=signature();button.click();
 // WeRead can repaint canvas without changing this DOM. A static DOM is not a failure.
 for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,100));if(signature()!==before)return {ok:true,confirmed:true};}
 return {ok:true,confirmed:false};
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('index.html'))return false;
 (async()=>{
  if(msg.type==='readers'){const tabs=await chrome.tabs.query({url:'https://weread.qq.com/web/reader/*'});return {ok:true,tabs:tabs.map(t=>({id:t.id,title:t.title}))};}
  if(msg.type==='turn'&&Number.isInteger(msg.tabId)&&[-1,1].includes(msg.direction)){
   const tab=await chrome.tabs.get(msg.tabId);
   if(!tab.url?.startsWith('https://weread.qq.com/web/reader/'))throw new Error('所选标签页已离开阅读页。请重新连接。');
   const result=await chrome.scripting.executeScript({target:{tabId:msg.tabId},func:flipReader,args:[msg.direction]});return result[0]?.result||{ok:false,error:'微信读书没有响应。请刷新书页后重试。'};
  }
  return {ok:false,error:'无法识别的操作。'};
 })().then(respond,e=>respond({ok:false,error:e.message||'连接失败。请刷新书页后重试。'}));
 return true;
});
