import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const params = new URLSearchParams(location.search);
const initialId = params.get('fileId') || '';
const configuredClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
document.querySelector('#app').innerHTML = `
<div class="layout">
  <aside class="panel">
    <h1>JKAI GLB Viewer</h1>
    <p class="sub">Google Drive GLB · Individual animation clips</p>
    <div class="field"><label for="client">Google OAuth Client ID</label><input id="client" placeholder="xxxx.apps.googleusercontent.com" autocomplete="off"/></div>
    <div class="row"><button id="signin">Google Drive 연결</button><button id="signout">연결 해제</button></div>
    <div class="field" style="margin-top:20px"><label for="fileId">Google Drive File ID</label><input id="fileId" placeholder="Drive file ID"/></div>
    <div class="row"><button id="load">Drive에서 열기</button><button id="share">현재 주소 복사</button></div>
    <div class="field" style="margin-top:20px"><label for="local">또는 로컬 GLB / glTF 파일</label><input id="local" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json"/></div>
    <div class="field"><label for="clips">Animation</label><select id="clips"><option value="">모델을 불러오세요</option></select></div>
    <div class="row"><button id="play">재생</button><button id="pause">일시정지</button><button id="reset">처음부터</button></div>
    <div class="field" style="margin-top:14px"><label><input type="checkbox" id="loop" checked/> 반복 재생</label></div>
    <div id="status" class="status" role="status" aria-live="polite">준비됨</div>
    <p class="hint">비공개 Drive 파일은 Google 로그인과 파일 읽기 권한이 필요합니다. Client ID는 Google Cloud에서 만든 웹 애플리케이션 OAuth ID를 사용하세요. 파일 내용이나 토큰은 이 앱 서버로 전송하지 않습니다.</p>
  </aside>
  <main class="stage" id="stage"><div class="overlay">Drag: 회전 · Wheel: 확대 · Right drag: 이동</div></main>
</div>`;
const el = (id) => document.getElementById(id);
el('client').value = configuredClientId || localStorage.getItem('jkai_google_client_id') || '';
el('fileId').value = initialId;
const status = (message) => { el('status').textContent = message; };
const stage = el('stage');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45,1,0.01,10000);
camera.position.set(3,2,5);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.prepend(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff,0x667799,2.5));
const sun = new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(4,8,5);scene.add(sun);
const grid = new THREE.GridHelper(20,20,0x475569,0x334155);scene.add(grid);
let model=null,mixer=null,animations=[],activeAction=null,accessToken=null,tokenClient=null,loadGeneration=0;
const clock=new THREE.Clock();
const loader=new GLTFLoader();
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
new ResizeObserver(resize).observe(stage);resize();
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),0.1);mixer?.update(dt);controls.update();renderer.render(scene,camera);});
function clearModel(){if(activeAction)activeAction.stop();mixer?.stopAllAction();if(model){scene.remove(model);model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});}model=null;mixer=null;activeAction=null;animations=[];}
function chooseClip(index){if(!mixer||!animations[index])return;activeAction?.stop();mixer.setTime(0);activeAction=mixer.clipAction(animations[index]);activeAction.reset();activeAction.setLoop(el('loop').checked?THREE.LoopRepeat:THREE.LoopOnce,Infinity);activeAction.clampWhenFinished=true;activeAction.play();status(`애니메이션: ${animations[index].name}`);}
function displayGLTF(gltf){clearModel();model=gltf.scene;scene.add(model);animations=gltf.animations||[];if(animations.length)mixer=new THREE.AnimationMixer(model);
const box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const radius=Math.max(size.length()*0.7,0.5);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(radius*0.9,radius*0.55,radius*1.5));camera.near=Math.max(radius/1000,0.001);camera.far=radius*1000;camera.updateProjectionMatrix();controls.update();grid.position.y=box.min.y;grid.scale.setScalar(Math.max(size.length()/10,0.1));
el('clips').replaceChildren();if(!animations.length)el('clips').add(new Option('애니메이션 없음',''));animations.forEach((a,i)=>el('clips').add(new Option(a.name||`Animation ${i+1}`,String(i))));if(animations.length)chooseClip(0);else status('모델 로딩 완료 (애니메이션 없음)');}
function parseBuffer(buffer){return new Promise((resolve,reject)=>loader.parse(buffer,'',resolve,reject));}
async function openBuffer(buffer){const generation=++loadGeneration;status('GLB 로딩 중...');try{const gltf=await parseBuffer(buffer);if(generation!==loadGeneration)return;displayGLTF(gltf);}catch(e){status(`모델 오류: ${e.message}`);}}
function gisReady(){return !!window.google?.accounts?.oauth2;}
async function waitForGIS(){if(gisReady())return;await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error('Google 인증 스크립트를 불러오지 못했습니다.'));document.head.append(script);});if(!gisReady())throw new Error('Google Identity Services를 사용할 수 없습니다.');}
async function connect(){const clientId=el('client').value.trim();if(!clientId)throw new Error('Google OAuth Client ID를 입력하세요.');localStorage.setItem('jkai_google_client_id',clientId);await waitForGIS();return new Promise((resolve,reject)=>{tokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/drive.readonly',callback:(r)=>{if(r.error){reject(new Error(r.error));return;}accessToken=r.access_token;status('Google Drive 연결됨');resolve();},error_callback:(e)=>reject(new Error(e.message||e.type||'인증 실패'))});tokenClient.requestAccessToken({prompt:accessToken?'':'consent'});});}
async function loadDrive(){const id=el('fileId').value.trim();if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new Error('올바른 Google Drive 파일 ID를 입력하세요.');if(!accessToken)await connect();status('Google Drive에서 다운로드 중...');let response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${accessToken}`}});if(response.status===401){accessToken=null;await connect();response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${accessToken}`}});}if(!response.ok){let detail='';try{detail=(await response.json()).error?.message||'';}catch{}throw new Error(`Drive HTTP ${response.status}: ${detail||response.statusText}`);}const buffer=await response.arrayBuffer();const url=new URL(location.href);url.searchParams.set('fileId',id);history.replaceState(null,'',url);await openBuffer(buffer);}
el('signin').onclick=async()=>{try{await connect();}catch(e){status(`연결 오류: ${e.message}`);}};
el('signout').onclick=()=>{if(accessToken&&gisReady())google.accounts.oauth2.revoke(accessToken,()=>{});accessToken=null;status('Google 연결 해제됨');};
el('load').onclick=async()=>{try{await loadDrive();}catch(e){status(`열기 실패: ${e.message}`);}};
el('share').onclick=async()=>{const id=el('fileId').value.trim();const url=new URL(location.href);if(id)url.searchParams.set('fileId',id);try{await navigator.clipboard.writeText(url.href);status('주소 복사됨');}catch{status(url.href);}};
el('local').onchange=async(e)=>{const file=e.target.files?.[0];if(!file)return;if(file.name.toLowerCase().endsWith('.gltf')){status('외부 리소스가 있는 .gltf는 GLB로 변환해서 열어주세요.');return;}await openBuffer(await file.arrayBuffer());};
el('clips').onchange=()=>chooseClip(Number(el('clips').value));
el('play').onclick=()=>{if(!activeAction&&animations.length)chooseClip(Number(el('clips').value));else if(activeAction){activeAction.paused=false;activeAction.play();}};
el('pause').onclick=()=>{if(activeAction)activeAction.paused=true;};
el('reset').onclick=()=>chooseClip(Number(el('clips').value));
el('loop').onchange=()=>{if(activeAction)activeAction.setLoop(el('loop').checked?THREE.LoopRepeat:THREE.LoopOnce,Infinity);};
if(initialId)status('Drive 파일 ID를 감지했습니다. Google Drive 연결 후 “Drive에서 열기”를 누르세요.');
