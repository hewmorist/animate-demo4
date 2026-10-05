import {tapBpm} from './timing.js';
const $=id=>document.getElementById(id);
let ready=false,running=false,bpm=100,audio=null,epoch=0,nextBeat=0,taps=[],pointer=null,timer=null;
const scheduled=new Set();
function fail(message){$('loading').hidden=false;$('loading').textContent=message;}
window.addEventListener('error',e=>fail(`Metronome error: ${e.message}`));
window.addEventListener('unhandledrejection',e=>fail(`Metronome error: ${e.reason}`));
window.miniquad_add_plugin({name:'object_bridge',version:'0.1',register_plugin(imports){imports.env.object_ready=()=>{ready=true;$('loading').hidden=true;$('start').disabled=false;$('tap').disabled=false;};}});
function engine(name,...args){if(ready)window.wasm_exports[name](...args);}
function clock(){return audio?audio.currentTime:performance.now()/1000;}
function cancelAudio(){for(const node of scheduled){try{node.stop();}catch{}}scheduled.clear();}
function click(at){if(!$('sound').checked||!audio||audio.state!=='running')return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(1600,at);osc.frequency.exponentialRampToValueAtTime(500,at+.025);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.28,at+.002);gain.gain.exponentialRampToValueAtTime(.0001,at+.04);osc.connect(gain);gain.connect(audio.destination);scheduled.add(osc);osc.onended=()=>scheduled.delete(osc);osc.start(at);osc.stop(at+.045);}
function schedule(){if(!running)return;const now=clock(),interval=60/bpm;if(nextBeat<now-.02)nextBeat=epoch+Math.ceil((now-epoch)/interval)*interval;while(nextBeat<now+.12){click(Math.max(nextBeat,now));nextBeat+=interval;}}
function stop(){running=false;cancelAudio();clearInterval(timer);timer=null;engine('object_clock',0,0);$('start').textContent='Start';$('start').setAttribute('aria-pressed','false');}
async function start(){if(running||$('start').disabled)return;$('start').disabled=true;try{audio??=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();if(audio.state!=='running')throw Error('Tap Start again to enable audio.');try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}running=true;epoch=clock()+.06;nextBeat=epoch;$('start').textContent='Stop';$('start').setAttribute('aria-pressed','true');schedule();timer=setInterval(schedule,25);}catch(e){$('tapStatus').textContent=e.message;}finally{$('start').disabled=false;}}
function setTempo(value){bpm=Math.min(240,Math.max(30,Math.round(value)));$('tempo').value=bpm;$('bpm').value=bpm;if(running){cancelAudio();epoch=clock()+.06;nextBeat=epoch;schedule();}}
$('start').onclick=()=>running?stop():start();
$('tempo').oninput=e=>{taps=[];setTempo(Number(e.target.value));$('tapStatus').textContent='Tap four times at your preferred pace.';};
$('tap').addEventListener('pointerdown',e=>{e.preventDefault();recordTap();});
$('tap').addEventListener('click',e=>{if(e.detail===0)recordTap();});
function recordTap(){const now=performance.now();if(taps.length&&now-taps.at(-1)>2500)taps=[];taps.push(now);$('tapStatus').textContent=`${taps.length} / 4 taps`;if(taps.length===4){const measured=tapBpm(taps);setTempo(measured);$('tapStatus').textContent=`Four taps: ${measured.toFixed(1)} BPM${measured<30||measured>240?' — limited to 30–240 BPM':''}`;taps=[];}}
$('sound').onchange=()=>{if(!$('sound').checked)cancelAudio();};
$('reset').onclick=()=>engine('object_reset_view');
const view=$('glcanvas');view.addEventListener('pointerdown',e=>{if(!ready||pointer)return;e.preventDefault();view.focus();view.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});view.addEventListener('pointermove',e=>{if(pointer?.id!==e.pointerId)return;engine('object_orbit',-(e.clientX-pointer.x)*.007,(e.clientY-pointer.y)*.006);pointer.x=e.clientX;pointer.y=e.clientY;});for(const event of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(event,()=>pointer=null);view.addEventListener('contextmenu',e=>e.preventDefault());view.addEventListener('keydown',e=>{const delta={ArrowLeft:[-.08,0],ArrowRight:[.08,0],ArrowUp:[0,.06],ArrowDown:[0,-.06]}[e.key];if(delta){e.preventDefault();engine('object_orbit',...delta);}});
window.addEventListener('blur',()=>pointer=null);document.addEventListener('visibilitychange',()=>{pointer=null;if(document.hidden)stop();});
function frame(){if(ready)engine('object_clock',running?Math.max(0,(clock()-epoch)*bpm/60):0,running?1:0);requestAnimationFrame(frame);}frame();
if(!window.WebAssembly)fail('WebAssembly is unavailable in this browser.');else window.load('object.wasm');setTimeout(()=>{if(!ready)fail('The engine has not started. Reload to try again.');},20000);
