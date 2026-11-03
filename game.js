'use strict';
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const TILE=32,COLS=80,ROWS=56,W=COLS*TILE,H=ROWS*TILE;
const ZONE_TIER_RANGES=[[0,1],[2,3],[4,6],[7,9],[10,12],[13,15],[16,17],[18,19]];
function resizeWorld(){const scale=Math.min(1, 1600/Math.max(1,canvas.clientWidth));canvas.width=Math.max(320,Math.round(canvas.clientWidth*scale));canvas.height=Math.max(240,Math.round(canvas.clientHeight*scale));ctx.imageSmoothingEnabled=false;}
window.addEventListener('resize',resizeWorld);requestAnimationFrame(resizeWorld);
const keys=new Set();let noticeUntil=0;let adventureStarted=false;
const toast=document.getElementById('toast');
const rand=(x,y)=>{let n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
// Oito quadrantes (4 colunas x 2 linhas) separados por estradas seguras.
const ROAD_X=[20,40,60],ROAD_Y=28,ROAD_HALF=1;
function roadTile(x,y){return Math.abs(y-ROAD_Y)<=ROAD_HALF||ROAD_X.some(rx=>Math.abs(x-rx)<=ROAD_HALF);}
const REGION_DEFS=GAME_RULES.regions;
const SAFE_REGION={id:'village',name:'Estrada Segura',min:0,max:0,color:'#b69c6d'};
function zoneIndex(x,y){const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);if(tx<1||ty<1||tx>=COLS-1||ty>=ROWS-1||roadTile(tx,ty))return -1;return (ty<ROAD_Y?0:4)+Math.min(3,Math.floor(tx/20));}
function regionAt(x,y){const idx=zoneIndex(x,y);return idx<0?SAFE_REGION:REGION_DEFS[idx];}
const tiles=Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},(_,x)=>{
 if(x===0||y===0||x===COLS-1||y===ROWS-1)return 'wall';
 if(roadTile(x,y))return 'path';
 const r=rand(x,y);return r<.065?'tree':r<.087?'rock':r<.104?'flowers':'grass';
}));
// Interseção central: mercador, mestre de habilidades e ferreiro.
const SHOP={x:40*TILE+16,y:28*TILE+16,radius:55};
const SKILL_VENDOR={x:40*TILE+16,y:25*TILE+16,radius:55};
const player={x:40*TILE+16,y:28*TILE+16,r:10,speed:155,face:'down',moving:false,walkPhase:0};
const MOB_TYPES={slime:{name:'Slime',icon:'🟢',color:'#66d5a0'},rat:{name:'Rato Selvagem',icon:'🐀',color:'#a78b68'},wolf:{name:'Lobo',icon:'🐺',color:'#adb8b7'},goblin:{name:'Goblin',icon:'👺',color:'#93c66e'},skeleton:{name:'Esqueleto',icon:'💀',color:'#d4d5c4'},orc:{name:'Orc',icon:'👹',color:'#ad866e'},king:{name:'Rei Goblin',icon:'👑',color:'#dfba5c'}};

// Cada zona tem seus próprios mobs, níveis, quantidades e tabela de drops (via regionAt).
const ZONE_POOLS=[['slime','rat'],['rat','wolf'],['wolf','goblin'],['goblin','orc'],['skeleton','orc'],['orc','king'],['skeleton','king','orc'],['king','orc','skeleton']];
const SPAWNS=[];
for(let z=0;z<8;z++){
 const col=z%4,row=Math.floor(z/4),def=REGION_DEFS[z];
 const minX=col*20+3,maxX=(col+1)*20-3;
 const minY=row===0?3:ROAD_Y+4,maxY=row===0?ROAD_Y-4:ROWS-4;
 const count=Math.max(0,Math.floor(GAME_RULES.monsters.populationBase+z*GAME_RULES.monsters.populationPerZone));
 for(let i=0;i<count;i++){
  const x=minX+Math.floor(Math.random()*(maxX-minX+1));
  const y=minY+Math.floor(Math.random()*(maxY-minY+1));
  const pool=ZONE_POOLS[z],type=pool[Math.floor(Math.random()*pool.length)];
  // Weighted regional levels: 60% low, 30% mid, 10% high.
  const span=def.max-def.min+1;
  const lowEnd=Math.max(1,Math.ceil(span*GAME_RULES.monsters.levelCuts[0]));
  const midEnd=Math.max(lowEnd+1,Math.ceil(span*GAME_RULES.monsters.levelCuts[1]));
  const roll=Math.random()*100,weights=GAME_RULES.monsters.levelWeights;
  const start=roll<weights[0]?0:roll<weights[0]+weights[1]?lowEnd:midEnd;
  const end=roll<weights[0]?lowEnd:roll<weights[0]+weights[1]?midEnd:span;
  const level=def.min+Math.min(span-1,start+Math.floor(Math.random()*Math.max(1,end-start)));
  SPAWNS.push([x,y,type,level,z]);
 }
}
const monsters=SPAWNS.map(([x,y,type,level,zone],i)=>({id:i,x:x*TILE+16,y:y*TILE+16,type,zone,level,baseLevel:level,xp:0,phase:i*1.7,defeated:false,respawnAt:0,aggro:false,nextHit:0,spawnX:x*TILE+16,spawnY:y*TILE+16,hp:Math.round(GAME_RULES.monsters.hpBase+GAME_RULES.monsters.hpPerLevel*level+GAME_RULES.monsters.hpPower*Math.pow(level,GAME_RULES.monsters.hpExponent))}));
for(const m of monsters){const cy=Math.floor(m.y/TILE),cx=Math.floor(m.x/TILE);for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++)if(tiles[y]?.[x]&&!['wall','path'].includes(tiles[y][x]))tiles[y][x]='grass';}
// Estradas sempre livres para caminhar.
for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(roadTile(x,y))tiles[y][x]='path';
// Monstros mantêm nível, HP, ataque e defesa definidos no nascimento.
function blocked(x,y){let tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);return !tiles[ty]||['tree','rock','wall'].includes(tiles[ty][tx]);}
function canMove(x,y){const r=player.r;return !blocked(x-r,y-r)&&!blocked(x+r,y-r)&&!blocked(x-r,y+r)&&!blocked(x+r,y+r);}
function move(dx,dy){if(canMove(player.x+dx,player.y))player.x+=dx;if(canMove(player.x,player.y+dy))player.y+=dy;}
function show(msg){toast.textContent=msg;toast.classList.add('show');noticeUntil=performance.now()+2200;}
function interact(){if(Math.hypot(player.x-SKILL_VENDOR.x,player.y-SKILL_VENDOR.y)<SKILL_VENDOR.radius)toggleSkillShop(true);else if(Math.hypot(player.x-SMITH.x,player.y-SMITH.y)<SMITH.radius)toggleSmith(true);else if(Math.hypot(player.x-SHOP.x,player.y-SHOP.y)<SHOP.radius)toggleShop(true);else show('Aproxime-se da loja ou do ferreiro (E).');}
function resetPlayerPosition(){player.x=40*TILE+16;player.y=28*TILE+16;}
window.addEventListener('keydown',e=>{if(!adventureStarted)return;if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','e','q'].includes(k))e.preventDefault();if(k==='i'&&!e.repeat&&true){toggleInventory();return;}if(k==='c'&&!e.repeat&&true){toggleCharacter();return;}if(k==='escape'&&!document.getElementById('skill-shop').classList.contains('hidden')){toggleSkillShop(false);return;}if(k==='escape'&&shopOpen){toggleShop(false);return;}if(k==='escape'&&smithOpen){toggleSmith(false);return;}if(k==='e'&&!e.repeat){interact();return;}keys.add(k);if(k==='q'&&!e.repeat)usePotion(performance.now());if('12345678'.includes(k)&&!e.repeat)(classSkills()[Number(k)-1]&&castSkill(classSkills()[Number(k)-1].id,performance.now()));});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
for(const b of document.querySelectorAll('[data-dir]')){const k={up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'}[b.dataset.dir];b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(k);b.setPointerCapture(e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(k));}
// Cenários SVG: cada bioma possui terreno próprio, além de árvores, rochas e caverna.
const MAP_SPRITES={};for(const name of ['tree','rock','flowers','cave','grass-0','grass-1','grass-2','grass-3','grass-4','grass-5','grass-6','grass-7','road']){const img=new Image();img.src='scenery/'+name+'.svg';MAP_SPRITES[name]=img;}
function mapSprite(name,x,y,w=TILE,h=TILE){const img=MAP_SPRITES[name];if(img?.complete&&img.naturalWidth){ctx.drawImage(img,x,y,w,h);return true;}return false;}
function drawTile(t,x,y){
 const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE),zi=zoneIndex(x+16,y+16);
 if(t==='path'){if(mapSprite('road',x,y))return;}
 else if(zi>=0){if(mapSprite('grass-'+zi,x,y)){if(t==='tree'||t==='rock'||t==='flowers')mapSprite(t,x,y);return;}}
const region=regionAt(x+16,y+16);ctx.fillStyle=t==='path'?'#b49b6d':region.color;ctx.fillRect(x,y,TILE,TILE);if(t==='path'){ctx.fillStyle='#c7ae7e';ctx.fillRect(x+3,y+4,10,5);ctx.fillRect(x+18,y+19,9,4)}else{ctx.fillStyle='#659961';ctx.fillRect(x+4,y+6,5,3);ctx.fillRect(x+22,y+25,4,3)}
 if(t==='flowers'){ctx.fillStyle='#f3d278';ctx.fillRect(x+9,y+11,4,4);ctx.fillStyle='#ef9eae';ctx.fillRect(x+22,y+21,4,4)}
 if(t==='tree'||t==='wall'){ctx.fillStyle='#293c28';ctx.fillRect(x+12,y+20,9,12);ctx.fillStyle='#2b5c3d';ctx.fillRect(x+4,y+8,26,18);ctx.fillStyle='#3f7d49';ctx.fillRect(x+7,y+3,20,18);ctx.fillStyle='#57985b';ctx.fillRect(x+11,y+5,9,7)}
 if(t==='rock'){ctx.fillStyle='#59645f';ctx.fillRect(x+6,y+13,24,17);ctx.fillStyle='#9da9a0';ctx.fillRect(x+10,y+8,17,17);ctx.fillStyle='#c1c6b8';ctx.fillRect(x+12,y+10,8,4)}}
// Cache de terreno por blocos: SVGs são rasterizados uma vez, não centenas de vezes por frame.
const CHUNK_TILES=10,CHUNK_PX=CHUNK_TILES*TILE;
const terrainChunks=new Map();let terrainVersion=0;
function makeTerrainChunk(cx,cy){
 const surface=document.createElement('canvas');surface.width=CHUNK_PX;surface.height=CHUNK_PX;
 const original=ctx;const off=surface.getContext('2d',{alpha:false});off.imageSmoothingEnabled=false;
 // drawTile usa o contexto global; desenhar os tiles no contexto secundário via função dedicada.
 for(let yy=0;yy<CHUNK_TILES;yy++)for(let xx=0;xx<CHUNK_TILES;xx++){
  const tx=cx*CHUNK_TILES+xx,ty=cy*CHUNK_TILES+yy;if(tx>=COLS||ty>=ROWS)continue;
  const type=tiles[ty][tx],zi=zoneIndex(tx*TILE+16,ty*TILE+16),x=xx*TILE,y=yy*TILE;
  const base=type==='path'?'road':zi>=0?'grass-'+zi:null;
  const image=base&&MAP_SPRITES[base];
  if(image?.complete&&image.naturalWidth)off.drawImage(image,x,y,TILE,TILE);
  else{off.fillStyle=type==='path'?'#b49b6d':regionAt(tx*TILE+16,ty*TILE+16).color;off.fillRect(x,y,TILE,TILE);}
  if(['tree','rock','flowers','wall'].includes(type)){
   const name=type==='wall'?'tree':type,img=MAP_SPRITES[name];
   if(img?.complete&&img.naturalWidth)off.drawImage(img,x,y,TILE,TILE);
   else{off.fillStyle=type==='tree'||type==='wall'?'#326d42':type==='rock'?'#8c9b94':'#e3c76b';off.fillRect(x+6,y+7,20,21);}
  }
 }
 return surface;
}
// Sinalização pintada no chão: da praça central até a primeira zona (Nv 1–9).
// Desenhada sobre o terreno, sem colisão ou sprites extras.
function drawNoviceRoadGuide(camX,camY){
 const y=ROAD_Y*TILE+TILE/2;
 const marks=[36,32,28,24,20,16,12,8,5];
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 for(const tx of marks){
  const x=tx*TILE+TILE/2;
  if(x<camX-70||x>camX+canvas.width+70||y<camY-70||y>camY+canvas.height+70)continue;
  ctx.fillStyle='#443823';ctx.fillRect(x-11,y-8,22,16);
  ctx.fillStyle='#f9dc92';ctx.font='bold 17px monospace';ctx.fillText('←',x,y);
 }
 // A saída norte da estrada leva ao mapa inicial.
 const x=5*TILE+TILE/2;
 for(const ty of [26,25]){
  const yy=ty*TILE+TILE/2;
  if(x>=camX-50&&x<=camX+canvas.width+50&&yy>=camY-50&&yy<=camY+canvas.height+50){
   ctx.fillStyle='#443823';ctx.fillRect(x-11,yy-8,22,16);
   ctx.fillStyle='#f9dc92';ctx.font='bold 16px monospace';ctx.fillText('↑',x,yy);
  }
 }
 const labelX=10*TILE,labelY=ROAD_Y*TILE+TILE/2;
 if(labelX>=camX-140&&labelX<=camX+canvas.width+140&&labelY>=camY-50&&labelY<=camY+canvas.height+50){
  ctx.font='bold 12px monospace';
  ctx.fillStyle='#40311c';ctx.fillRect(labelX-101,labelY-28,202,19);
  ctx.fillStyle='#ffe6a7';ctx.fillText('INICIANTES  ←  Nv 1–9',labelX,labelY-18);
 }
 ctx.restore();
}
function drawTerrain(camX,camY){
 const xStart=Math.max(0,Math.floor(camX/CHUNK_PX)),yStart=Math.max(0,Math.floor(camY/CHUNK_PX));
 const xEnd=Math.min(Math.ceil(COLS/CHUNK_TILES),Math.ceil((camX+canvas.width)/CHUNK_PX)+1);
 const yEnd=Math.min(Math.ceil(ROWS/CHUNK_TILES),Math.ceil((camY+canvas.height)/CHUNK_PX)+1);
 for(let cy=yStart;cy<yEnd;cy++)for(let cx=xStart;cx<xEnd;cx++){
  const key=cx+','+cy;let chunk=terrainChunks.get(key);
  if(!chunk){chunk=makeTerrainChunk(cx,cy);terrainChunks.set(key,chunk);}
  ctx.drawImage(chunk,cx*CHUNK_PX,cy*CHUNK_PX);
 }
}
let sceneryLoaded=0;
for(const img of Object.values(MAP_SPRITES)){
 const invalidate=()=>{sceneryLoaded++;terrainChunks.clear();};
 img.addEventListener('load',invalidate,{once:true});img.addEventListener('error',invalidate,{once:true});
}
function drawSkillVendor(){const x=SKILL_VENDOR.x,y=SKILL_VENDOR.y;if(drawActorSprite("skill",x,y,0)){ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillStyle="#ffe1a2";ctx.fillText("SKILLS [E]",x,y-35);ctx.textAlign="start";return;}ctx.fillStyle='#40365d';ctx.fillRect(x-13,y-13,26,31);ctx.fillStyle='#d5b8f4';ctx.fillRect(x-8,y-22,16,13);ctx.fillStyle='#c5a0ff';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('SKILLS [E]',x,y-33);ctx.textAlign='start';}function drawSmith(){const x=SMITH.x,y=SMITH.y;if(drawActorSprite("smith",x,y,0)){ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillStyle="#ffe1a2";ctx.fillText("FERREIRO [E]",x,y-35);ctx.textAlign="start";return;}ctx.fillStyle='#493c31';ctx.fillRect(x-22,y-12,44,34);ctx.fillStyle='#a3a6a0';ctx.fillRect(x-27,y-20,54,10);ctx.fillStyle='#d8ad64';ctx.fillRect(x-8,y-6,16,16);ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillStyle='#ffe1a2';ctx.fillText('FERREIRO [E]',x,y-30);ctx.textAlign='start';}
function drawShop(){const x=SHOP.x,y=SHOP.y;if(drawActorSprite("shop",x,y,0)){ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillStyle="#ffe1a2";ctx.fillText("LOJA [E]",x,y-35);ctx.textAlign="start";return;}ctx.fillStyle='#433126';ctx.fillRect(x-24,y-14,48,39);ctx.fillStyle='#bd7450';ctx.fillRect(x-30,y-23,60,13);ctx.fillStyle='#e4bf79';ctx.fillRect(x-26,y-29,52,9);ctx.fillStyle='#302820';ctx.fillRect(x-9,y+3,18,22);ctx.fillStyle='#f4e1a2';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('LOJA [E]',x,y-35);ctx.textAlign='start';}
// Sprites SVG locais; fallback em canvas enquanto carregam.
const ACTOR_SPRITES={};
for(const type of ['player','shop','smith','skill',...Object.keys(MOB_TYPES)]){const img=new Image();img.src=`sprites/${type}.svg`;ACTOR_SPRITES[type]=img;}
function drawActorSprite(type,x,y,bob=0){const img=ACTOR_SPRITES[type];if(!img?.complete||!img.naturalWidth)return false;ctx.drawImage(img,x-19,y-24+bob,38,42);return true;}
function drawPlayer(x,y){const walk=player.moving?Math.sin(player.walkPhase)*2.5:0;ctx.save();ctx.translate(x,y);if(player.face==='left')ctx.scale(-1,1);ctx.translate(-x,-y);if(drawActorSprite('player',x,y+walk)){ctx.restore();return;}ctx.restore();ctx.fillStyle='#263b64';ctx.fillRect(x-9,y-12,18,27);ctx.fillStyle='#e2b68c';ctx.fillRect(x-6,y-10,12,10);}
function drawMob(m,t){const x=m.x,y=m.y,bob=Math.sin(t*2.5)*1.8;
 if(!drawActorSprite(m.type,x,y,bob)){ctx.fillStyle=MOB_TYPES[m.type].color;ctx.fillRect(x-11,y-9+bob,22,23);ctx.fillStyle='#18241e';ctx.fillRect(x-6,y-3+bob,4,4);ctx.fillRect(x+4,y-3+bob,4,4);}
 ctx.fillStyle='#17241b';ctx.fillRect(x-23,y-32,46,12);ctx.fillStyle='#f4e9cb';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('Nv '+m.level,x,y-23);ctx.fillStyle='#e8e8e0';ctx.font='9px monospace';ctx.fillText(Math.ceil(m.hp)+' / '+mobMaxHp(m),x,y-44);ctx.textAlign='start';
}
let previousRegion='';function updateRegion(){const region=regionAt(player.x,player.y);if(previousRegion!==region.id){previousRegion=region.id;document.getElementById('location').textContent=(region.id==='village'?'🛤️ ':'⚔️ ')+region.name+(region.max?' · Nv '+region.min+'–'+region.max:' · Zona segura');}}

let last=performance.now();let lastPaint=0;function frame(now){if(!adventureStarted){last=now;requestAnimationFrame(frame);return;}if(document.hidden){last=now;requestAnimationFrame(frame);return;}if(now-lastPaint<1000/75){requestAnimationFrame(frame);return;}lastPaint=now;for(const m of (Online.shared()?[]:monsters))if(m.defeated&&now>=m.respawnAt){m.defeated=false;m.hp=mobMaxHp(m);m.aggro=false;m.wanderUntil=0;m.x=m.spawnX;m.y=m.spawnY;}const dt=Math.min((now-last)/1000,.05);last=now;let dx=0,dy=0;if(keys.has('a')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('arrowright'))dx++;if(keys.has('w')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('arrowdown'))dy++;player.moving=!!(dx||dy);if(player.moving)player.walkPhase+=dt*13;if(dx||dy){let len=Math.hypot(dx,dy);move(dx/len*player.speed*(1+totalBonus('move')/100)*dt,dy/len*player.speed*(1+totalBonus('move')/100)*dt);player.face=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');}
 Online.tick(now);updateRegion();if(Online.shared()){updateProjectiles(now,dt);}else updateCombat(now,dt);tickAutoAttack(now);tickAutoSkills(now);const camX=Math.max(0,Math.min(W-canvas.width,player.x-canvas.width/2)),camY=Math.max(0,Math.min(H-canvas.height,player.y-canvas.height/2));ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(-Math.floor(camX),-Math.floor(camY));
 drawTerrain(camX,camY);
 drawNoviceRoadGuide(camX,camY);
 // Caverna esculpida na borda oeste, ao lado da estrada central.
 mapSprite('cave',TILE*1,TILE*(ROAD_Y-3),TILE*5,TILE*5);
 ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillStyle='#f7dba7';ctx.fillText('Caverna de Lúmen',TILE*3.5,TILE*(ROAD_Y-3)-6);ctx.textAlign='start';
 // Placas visuais no topo de cada quadrante.
 ctx.textAlign='center';ctx.font='bold 16px monospace';
 for(let z=0;z<8;z++){const col=z%4,row=Math.floor(z/4),cx=(col*20+10)*TILE,cy=(row===0?5:ROAD_Y+6)*TILE;
 ctx.fillStyle='#101c18bb';ctx.fillRect(cx-112,cy-18,224,39);ctx.fillStyle='#fff4cc';ctx.fillText(REGION_DEFS[z].name,cx,cy-2);ctx.font='11px monospace';ctx.fillText('Nv '+REGION_DEFS[z].min+'–'+REGION_DEFS[z].max,cx,cy+13);ctx.font='bold 16px monospace';}
 ctx.textAlign='start';
 const visible=(x,y)=>x>=camX-65&&x<=camX+canvas.width+65&&y>=camY-65&&y<=camY+canvas.height+65;const entities=[...(visible(SHOP.x,SHOP.y)?[{y:SHOP.y,draw:drawShop}]:[]),...(visible(SKILL_VENDOR.x,SKILL_VENDOR.y)?[{y:SKILL_VENDOR.y,draw:drawSkillVendor}]:[]),...(visible(SMITH.x,SMITH.y)?[{y:SMITH.y,draw:drawSmith}]:[]),...monsters.filter(m=>!m.defeated&&visible(m.x,m.y)).map(m=>({y:m.y,draw:()=>drawMob(m,now/1000+m.phase)})),{y:player.y,draw:()=>drawPlayer(player.x,player.y)}];entities.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());Online.draw(ctx,visible);drawCombatEffects(now);ctx.restore();if(now>noticeUntil)toast.classList.remove('show');requestAnimationFrame(frame);}
requestAnimationFrame(frame);
// Tela inicial: escolha de classe e equipamentos exclusivos, fora das tabelas de drop.
const CLASS_START=GAME_RULES.starters;
let selectedClass='warrior';
for(const button of document.querySelectorAll('[data-class]'))button.addEventListener('click',()=>{selectedClass=button.dataset.class;document.querySelectorAll('[data-class]').forEach(b=>b.classList.toggle('active',b===button));});
function makeStarter(name,slot,stat,value,iconSrc,weaponKind){return {id:nextItemId++,name,slot,stat,value,iconSrc,icon:'🛡️',weaponKind,rarity:'common',refine:0,tier:0,requirements:{},affixes:{},starter:true};}
document.getElementById('begin-adventure').addEventListener('click',()=>{
 const name=document.getElementById('new-hero-name').value.trim();
 if(name.length<2){document.getElementById('creation-error').textContent='Digite pelo menos 2 caracteres.';return;}
 Online.createCharacter(name,selectedClass);
});
