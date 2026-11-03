// Combate em tempo real: ataques, cooldowns, dano e progressão.
'use strict';
const $=id=>document.getElementById(id);
const hero={level:1,xp:0,gold:0,potions:3,points:0,str:5,int:5,dex:5,con:5,maxHp:100,hp:100,attack:14,defense:3,mp:40,maxMp:40};
let characterOpen=false;
const randomInt=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
function recalcHero(){const old=hero.maxHp;const profile=CLASS_COMBAT[hero.classId]||CLASS_COMBAT.warrior;hero.maxHp=Math.round((75+hero.con*profile.conHp)*(hero.classId==='warrior'?GAME_RULES.combat.warriorHpMultiplier:1)*(1+totalBonus('hp')/100));hero.maxMp=Math.round((25+hero.int*3)*(1+totalBonus('mana')/100));hero.hp=Math.min(hero.maxHp,hero.hp+Math.max(0,hero.maxHp-old));hero.mp=Math.min(hero.mp,hero.maxMp);}
function physicalPower(){const profile=CLASS_COMBAT[hero.classId]||CLASS_COMBAT.warrior;const dexBowBonus=hero.classId==='archer'?hero.dex*GAME_RULES.combat.archerDexDamage:0;const base=getAttack(hero)+hero.str*profile.strAttack+dexBowBonus;return Math.round(base*profile.physicalMult);}
function magicPower(){const profile=CLASS_COMBAT[hero.classId]||CLASS_COMBAT.warrior;return Math.round((8+hero.int*profile.intMagic)*(1+getMagic(hero)/100)*(1+totalBonus('spell')/100));}
function attackSpeed(){const cfg=CLASS_COMBAT[hero.classId]||CLASS_COMBAT.warrior;return cfg.speedBase*(1+hero.dex*cfg.dexSpeed)*(1+totalBonus('haste')/100);}
// Perfis de classe: velocidade e escalonamento de DEX independentes.
const CLASS_COMBAT=GAME_RULES.classes;
function dodgeChance(){return Math.min(.40,.025+hero.dex*.0035);}
function equippedStaff(){return typeof equipment!=='undefined'&&equipment.weapon&&weaponClass(equipment.weapon)==='mage';}
function equippedBow(){return typeof equipment!=='undefined'&&isBow(equipment.weapon);}
const XP_RATE=GAME_RULES.progression.xpRate;
function xpNeeded(){return Math.round(GAME_RULES.progression.xpBase*Math.pow(hero.level,GAME_RULES.progression.xpExponent));}
function updateHud(){ $('level').textContent='Nv '+hero.level;const cl=document.getElementById('hud-class');if(cl)cl.textContent=hero.className||'Guerreiro';const em=document.getElementById('class-emblem');if(em)em.textContent=({warrior:'⚔',archer:'🏹',mage:'✦'})[hero.classId]||'⚔';$('hp-text').textContent=`${Math.floor(hero.hp)} / ${hero.maxHp} HP`;$('hp-bar').style.width=`${100*hero.hp/hero.maxHp}%`;$('xp-text').textContent=`XP ${hero.xp} / ${xpNeeded()}`;$('xp-bar').style.width=`${100*hero.xp/xpNeeded()}%`;$('mp-text').textContent=`${Math.floor(hero.mp)} / ${hero.maxMp} MP`;$('mp-bar').style.width=`${100*hero.mp/hero.maxMp}%`;$('gold').textContent=hero.gold;$('potions').textContent=hero.potions;}
function toggleCharacter(force){characterOpen=typeof force==='boolean'?force:!characterOpen;$('character').classList.toggle('hidden',!characterOpen);renderCharacter();}
function spendPoint(stat){if(characterOpen&&hero.points>0&&['str','int','dex','con'].includes(stat)){if(typeof Online!=='undefined')return Online.spendPoint(stat);}}
function characterStatRows(rows){return rows.map(([label,value])=>`<div class="wyd-stat-row"><span>${label}</span><strong>${value}</strong></div>`).join('');}
function renderCharacter(){
 if(!$('stat-points'))return;
 $('stat-points').textContent=hero.points;
 for(const stat of ['str','int','dex','con']){$('stat-'+stat).textContent=hero[stat];$('add-'+stat).disabled=hero.points===0;}
 const name=$('hero-name')?.textContent||'Aventureiro';
 const cls=typeof chosenClass!=='undefined'&&typeof CLASS_START!=='undefined'?CLASS_START[chosenClass]?.label||'Aventureiro':'Aventureiro';
 $('basic-identity').innerHTML=characterStatRows([['Nome',name],['Classe',cls],['Nível',hero.level],['EXP',hero.xp+' / '+xpNeeded()]]);
 $('basic-stats').innerHTML=characterStatRows([['HP',Math.floor(hero.hp)+' / '+hero.maxHp],['MP',Math.floor(hero.mp)+' / '+hero.maxMp],['Ataque físico',physicalPower()],['Poder mágico',magicPower()],['Defesa',getDefense(hero)],['Velocidade de ataque',attackSpeed().toFixed(2)+'x'],['FOR → Ataque físico',CLASS_COMBAT[hero.classId||'warrior'].strAttack.toFixed(2)+' / ponto'],['DES → Velocidade',(CLASS_COMBAT[hero.classId||'warrior'].dexSpeed*100).toFixed(1)+'% / ponto'],['Crítico',(8+hero.dex*.5+totalBonus('crit')).toFixed(1)+'%'],['Ouro',hero.gold]]);
 $('derived-stats').innerHTML=characterStatRows([['Ataque PvP','0%'],['Defesa PvP','0%'],['Crítico',(8+hero.dex*.5+totalBonus('crit')).toFixed(1)+'%'],['Dano crítico',totalBonus('critDamage')+'%'],['Ataque mágico',magicPower()],['Bônus da arma mágica',getMagic(hero)+'%'],['Esquiva',(dodgeChance()*100).toFixed(1)+'%'],['Regeneração de HP',hpRegenRate().toFixed(2)+'/s'],['Regeneração de MP',mpRegenRate().toFixed(2)+'/s'],['Bônus de XP',totalBonus('xp')+'%'],['Bônus de drop',totalBonus('drop')+'%'],['Bônus de ouro',totalBonus('gold')+'%'],['Roubo de vida',totalBonus('lifesteal')+'%'],['Resistência',totalBonus('resist')+'%'],['Velocidade de movimento',totalBonus('move')+'%'],['Alcance do ataque',equippedBow()?'265 px':equippedStaff()?'190 px':'75 px'],['Dano em área',totalBonus('aoe')+'%'+(hero.classId==='mage'?' · Básico: 34% / 46px':'')],['Redução de recarga',totalBonus('cooldown')+'%']]);
}
function showCharacterTab(tab){for(const key of ['basic','advanced']){$('character-'+key).classList.toggle('hidden',key!==tab);$('tab-'+key).classList.toggle('active',key===tab);$('tab-'+key).setAttribute('aria-selected',String(key===tab));}}
$('tab-basic').addEventListener('click',()=>showCharacterTab('basic'));
$('tab-advanced').addEventListener('click',()=>showCharacterTab('advanced'));

for(const stat of ['str','int','dex','con'])$('add-'+stat).addEventListener('click',()=>spendPoint(stat));
$('character-toggle').addEventListener('click',()=>toggleCharacter());$('character-close').addEventListener('click',()=>toggleCharacter(false));
let nextAttack=0,nextMagic=0,nextPotion=0,attackFlash=0,combatText=[];const projectiles=[];
// Projéteis teleguiados com colisão por segmento: não atravessam o alvo entre frames.
function launchProjectile(type,target,power,now,magic=false){
 const speed=type==='arrow'?550:370;
 projectiles.push({type,x:player.x,y:player.y,target,power,magic,speed,until:now+2200,angle:0});
}
function updateProjectiles(now,dt){
 for(let i=projectiles.length-1;i>=0;i--){
  const p=projectiles[i];if(now>p.until||p.target.defeated){projectiles.splice(i,1);continue;}
  const dx=p.target.x-p.x,dy=p.target.y-p.y,d=Math.hypot(dx,dy);
  p.angle=Math.atan2(dy,dx);
  const step=p.speed*dt;
  if(d<=step+17){
   const impactX=p.target.x,impactY=p.target.y;
   attackMob(p.target,p.power,now,p.magic);
   if(p.type==='fire'&&hero.classId==='mage'){
    // Explosão pequena: só monstros vivos da mesma zona, sem dano duplo no alvo principal.
    const radius=GAME_RULES.combat.mageSplashRadius,zone=p.target.zone;
    for(const other of monsters){
     if(other===p.target||other.defeated||other.zone!==zone)continue;
     if(Math.hypot(other.x-impactX,other.y-impactY)<=radius){attackMob(other,Math.round(p.power*GAME_RULES.combat.mageSplashDamage),now,true);}
    }
    addEffect('ring',impactX,impactY,radius,'#ff9b42',290);
   }
   addEffect('beam',impactX,impactY,p.type==='arrow'?19:30,p.type==='arrow'?'#f4d28d':'#ff842f',350);projectiles.splice(i,1);continue;}
  p.x+=dx/d*step;p.y+=dy/d*step;
 }
}
function drawProjectiles(){
 for(const p of projectiles){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
  if(p.type==='arrow'){
   ctx.strokeStyle='#f9e1a1';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(10,0);ctx.stroke();
   ctx.fillStyle='#e8ece7';ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(5,-5);ctx.lineTo(5,5);ctx.fill();
   ctx.fillStyle='#ab784b';ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-19,-5);ctx.lineTo(-16,0);ctx.lineTo(-19,5);ctx.fill();
  }else{
   ctx.globalCompositeOperation='lighter';ctx.shadowColor='#ff4a0d';ctx.shadowBlur=20;
   ctx.fillStyle='#ff521c';ctx.beginPath();ctx.ellipse(-3,0,16,9,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#ffc342';ctx.beginPath();ctx.ellipse(4,0,10,6,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fff5b0';ctx.beginPath();ctx.arc(8,0,3.5,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#ff9b26';ctx.beginPath();ctx.moveTo(-11,-7);ctx.lineTo(-25,0);ctx.lineTo(-11,7);ctx.fill();
  }ctx.restore();}
}
let regenAccumulator=0;const effects=[];function addEffect(kind,x,y,radius,color,duration=550){effects.push({kind,x,y,radius,color,start:performance.now(),duration});}function hpRegenRate(){return .35+hero.con*.035+totalBonus('hpRegen')*.045;}function mpRegenRate(){return .28+hero.int*.025+totalBonus('mpRegen')*.045;}function updateRegen(dt){if(hero.hp<=0)return;regenAccumulator+=dt;if(regenAccumulator<.2)return;const tick=regenAccumulator;regenAccumulator=0;hero.hp=Math.min(hero.maxHp,Math.round((hero.hp+hpRegenRate()*tick)*100)/100);hero.mp=Math.min(hero.maxMp,Math.round((hero.mp+mpRegenRate()*tick)*100)/100);updateHud();}
function floatText(x,y,text,color='#fff'){
 const now=performance.now(), reward=/XP|ouro|Drop|Pedra/.test(String(text));
 combatText.push({x,y,text:String(text),color,start:now,duration:reward?760:560,drift:(Math.random()-.5)*16,reward});
 if(combatText.length>55)combatText.splice(0,combatText.length-55);
}
function mobMaxHp(m){return Math.round((GAME_RULES.monsters.hpBase+GAME_RULES.monsters.hpPerLevel*m.level+GAME_RULES.monsters.hpPower*Math.pow(m.level,GAME_RULES.monsters.hpExponent))*(1+Math.max(0,m.zone)*GAME_RULES.monsters.hpZoneScale));}
function mobStats(m){const mult=1+Math.max(0,m.zone)*GAME_RULES.monsters.attackZoneScale;return {attack:Math.round((GAME_RULES.monsters.attackBase+m.level*GAME_RULES.monsters.attackPerLevel+Math.pow(m.level,GAME_RULES.monsters.attackExponent)*GAME_RULES.monsters.attackPower)*mult),defense:Math.floor((GAME_RULES.monsters.defenseBase+m.level*GAME_RULES.monsters.defensePerLevel+Math.pow(m.level,GAME_RULES.monsters.defenseExponent)*GAME_RULES.monsters.defensePower)*(1+Math.max(0,m.zone)*GAME_RULES.monsters.defenseZoneScale))};}
function damage(attack,defense){return Math.max(1,attack-defense+randomInt(-2,3));}
function gainXp(amount){hero.xp+=amount;while(hero.xp>=xpNeeded()){hero.xp-=xpNeeded();hero.level++;hero.points+=GAME_RULES.progression.pointsPerLevel;hero.attack+=1;hero.hp=hero.maxHp;hero.mp=hero.maxMp;show(`✨ Nível ${hero.level}! +${GAME_RULES.progression.pointsPerLevel} pontos (C)`);}updateHud();renderCharacter();renderInventory();}
// XP fixa por nível de monstro, independente do nível do jogador.
function mobFixedXp(level){return Math.round((GAME_RULES.progression.monsterXpBase+GAME_RULES.progression.monsterXpFactor*Math.pow(level,GAME_RULES.progression.monsterXpExponent))*XP_RATE);}
function killMob(m,now){m.defeated=true;m.respawnAt=now+GAME_RULES.monsters.respawnMs;m.targetX=m.spawnX;m.targetY=m.spawnY;const baseXp=mobFixedXp(m.level),baseGold=randomInt(GAME_RULES.economy.goldMin,GAME_RULES.economy.goldMax)+Math.round(m.level*GAME_RULES.economy.goldPerLevel);const xp=Math.round(baseXp*(1+totalBonus('xp')/100)),gold=Math.round(baseGold*(1+totalBonus('gold')/100));hero.gold+=gold;gainXp(xp);floatText(m.x,m.y-30,`+${xp} XP · +${gold} ouro`,'#f7d777');const stoneChance=Math.min(GAME_RULES.economy.stoneChanceCap,GAME_RULES.economy.stoneChanceBase+m.level*GAME_RULES.economy.stoneChancePerLevel);if(Math.random()<stoneChance){evolutionStones++;floatText(m.x,m.y-48,'💎 Pedra de evolução','#9fe9ff');show('💎 Pedra de evolução encontrada!');}const lootRegion=regionAt(m.spawnX,m.spawnY).id;const loot=rollLoot(m.level,lootRegion);if(loot){if(addItem(loot))show(`🎁 ${loot.name} [${RARITIES[loot.rarity].label}]`);else show('Bolsa cheia: drop perdido!');}updateHud();renderInventory();}
function targetMob(range=68,cone=true){const playerZone=zoneIndex(player.x,player.y);if(playerZone<0)return undefined;const fx=player.face==='left'?-1:player.face==='right'?1:0,fy=player.face==='up'?-1:player.face==='down'?1:0;return monsters.filter(m=>!m.defeated&&m.zone===playerZone&&Math.hypot(m.x-player.x,m.y-player.y)<=range).filter(m=>{const dx=m.x-player.x,dy=m.y-player.y;return !cone||dx*fx+dy*fy>=-4}).sort((a,b)=>{const da=Math.hypot(a.x-player.x,a.y-player.y),db=Math.hypot(b.x-player.x,b.y-player.y);const band=35;if(Math.abs(da-db)>band)return da-db;return (a.level??a.lv??0)-(b.level??b.lv??0)||da-db;})[0];}
function attackMob(m,power,now,magic=false){if(Online.shared()){Online.attack(m,magic);return;}if(zoneIndex(player.x,player.y)<0||zoneIndex(player.x,player.y)!==m.zone||m.defeated)return;const defense=mobStats(m).defense;const crit=Math.random()<Math.min(.7,.08+hero.dex*.005+totalBonus('crit')/100);const hit=Math.round(damage(power,magic?Math.floor(defense/2):defense)*(crit?(2+totalBonus('critDamage')/100):1));m.hp=Math.max(0,m.hp-hit);m.aggro=true;if(totalBonus('lifesteal'))hero.hp=Math.min(hero.maxHp,hero.hp+Math.floor(hit*totalBonus('lifesteal')/100));floatText(m.x,m.y-24,`${crit?'CRÍTICO ':''}-${hit}`,crit?'#ffcb5b':'#fff');if(m.hp<=0)killMob(m,now);}
function playerAttack(now){
 if(now<nextAttack||hero.hp<=0)return;
 if(zoneIndex(player.x,player.y)<0){show('A estrada é segura: entre em uma região para atacar.');return;}
 const bow=equippedBow(),staff=equippedStaff(),range=bow?265:staff?190:75;
 const m=targetMob(range,!(bow||staff));
 // Cajados lançam magia como ataque básico, sem tecla especial e sem custo de MP.
 const delay=staff?GAME_RULES.combat.mageAttackDelay:bow?GAME_RULES.combat.archerAttackDelay:GAME_RULES.combat.warriorAttackDelay;
 nextAttack=now+Math.max(staff?680:bow?520:630,delay/attackSpeed());attackFlash=now+230;
 if(m){
  player.face=Math.abs(m.x-player.x)>Math.abs(m.y-player.y)?(m.x>player.x?'right':'left'):(m.y>player.y?'down':'up');
  if(staff)launchProjectile('fire',m,magicPower(),now,true);
  else if(bow)launchProjectile('arrow',m,physicalPower(),now,false);
  else{attackMob(m,physicalPower(),now);addEffect('slash',m.x,m.y,37,'#fff2bc',260);}
 }else if(!bow&&!staff){addEffect('slash',player.x+(player.face==='right'?32:player.face==='left'?-32:0),player.y+(player.face==='down'?32:player.face==='up'?-32:0),34,'#fff2bc',230);}
}
// Compatibilidade com controles antigos: F não é mais um ataque independente.
function playerMagic(now){playerAttack(now);}

function usePotion(now){if(now<nextPotion)return;if(hero.potions<=0||hero.hp>=hero.maxHp){show('Sem poções ou HP já cheio.');return;}hero.potions--;hero.hp=Math.min(hero.maxHp,hero.hp+35);nextPotion=now+1200;floatText(player.x,player.y-25,'+35 HP','#a0f4a0');updateHud();}
function mobAttack(m,now){if(Math.random()<dodgeChance()){floatText(player.x,player.y-28,'ESQUIVOU!','#94f7dc');addEffect('ring',player.x,player.y,22,'#94f7dc',250);return;}const hit=Math.max(1,Math.round(damage(mobStats(m).attack,getDefense(hero))*(1-totalBonus('resist')/100)));hero.hp=Math.max(0,hero.hp-hit);floatText(player.x,player.y-28,`-${hit}`,'#ff8585');updateHud();if(hero.hp<=0){const loss=Math.min(hero.gold,Math.ceil(hero.gold*.1));hero.gold-=loss;hero.hp=hero.maxHp;hero.mp=hero.maxMp;resetPlayerPosition();for(const other of monsters){other.aggro=false;other.nextHit=now+1000;other.x=other.spawnX;other.y=other.spawnY;}show(`💀 Você caiu! Perdeu ${loss} ouro e voltou ao refúgio.`);updateHud();}}
function updateCombat(now,dt){
 updateRegen(dt);updateProjectiles(now,dt);
 const playerZone=zoneIndex(player.x,player.y);
 for(const m of monsters){
  if(m.defeated)continue;
  // A estrada é totalmente segura; mobs só perseguem dentro de sua própria zona.
  if(playerZone<0||playerZone!==m.zone){m.aggro=false;}
  // Patrulha autônoma: monstros caminham mesmo sem aggro, mas nunca saem do bioma.
  // Atualiza alvos poucas vezes por segundo para manter o FPS.
  if(!m.aggro){
   if(!m.wanderUntil||now>=m.wanderUntil||Math.hypot((m.wanderX??m.x)-m.x,(m.wanderY??m.y)-m.y)<9){
    m.wanderUntil=now+1600+Math.random()*3300;
    const angle=Math.random()*Math.PI*2,dist=22+Math.random()*75;
    m.wanderX=m.x+Math.cos(angle)*dist;m.wanderY=m.y+Math.sin(angle)*dist;
    if(zoneIndex(m.wanderX,m.wanderY)!==m.zone||blocked(m.wanderX,m.wanderY)){m.wanderX=m.spawnX;m.wanderY=m.spawnY;}
   }
   const vx=m.wanderX-m.x,vy=m.wanderY-m.y,len=Math.hypot(vx,vy);
   if(len>3){const step=Math.min(len,(9+Math.min(7,m.level*.07))*dt);const nx=m.x+vx/len*step,ny=m.y+vy/len*step;
    if(zoneIndex(nx,m.y)===m.zone&&!blocked(nx-9,m.y-9)&&!blocked(nx+9,m.y+9))m.x=nx;
    if(zoneIndex(m.x,ny)===m.zone&&!blocked(m.x-9,ny-9)&&!blocked(m.x+9,ny+9))m.y=ny;
   }
  }
  if(playerZone<0||playerZone!==m.zone)continue;
  const distance=Math.hypot(player.x-m.x,player.y-m.y);
  if(distance<205)m.aggro=true;
  if(distance>310)m.aggro=false;
  if(m.aggro&&distance>34){
   const dx=(player.x-m.x)/distance,dy=(player.y-m.y)/distance,speed=24+Math.min(20,m.level*.5);
   const nx=m.x+dx*speed*dt,ny=m.y+dy*speed*dt;
   if(zoneIndex(nx,m.y)===m.zone&&!blocked(nx-9,m.y-9)&&!blocked(nx+9,m.y+9))m.x=nx;
   if(zoneIndex(m.x,ny)===m.zone&&!blocked(m.x-9,ny-9)&&!blocked(m.x+9,ny+9))m.y=ny;
  }
  if(m.aggro&&distance<43&&now>=m.nextHit){
   m.nextHit=now+Math.max(850,1750-m.level*13);mobAttack(m,now);
   if(zoneIndex(player.x,player.y)<0)break;
  }
 }
 combatText=combatText.filter(f=>now-f.start<f.duration);
}
function drawCombatEffects(now){drawProjectiles();for(let i=effects.length-1;i>=0;i--){const e=effects[i],p=(now-e.start)/e.duration;if(p>=1){effects.splice(i,1);continue;}ctx.save();ctx.globalAlpha=(1-p)*.85;ctx.strokeStyle=e.color;ctx.lineWidth=4+3*(1-p);ctx.beginPath();if(e.kind==='slash'){ctx.lineWidth=7*(1-p)+2;ctx.arc(e.x,e.y,e.radius,Math.PI*(.95+p*.3),Math.PI*(1.95+p*.3));}else ctx.arc(e.x,e.y,e.radius*(e.kind==='ring'?.35+p*.75:.2+p*.8),0,Math.PI*2);ctx.stroke();if(e.kind==='beam'){ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,12*(1-p)+4,0,Math.PI*2);ctx.fill();}ctx.restore();}for(const m of monsters){if(m.defeated||Math.abs(m.x-player.x)>canvas.width/2+140||Math.abs(m.y-player.y)>canvas.height/2+140)continue;const hp=m.hp/mobMaxHp(m);ctx.fillStyle='#261f20';ctx.fillRect(m.x-17,m.y-36,34,5);ctx.fillStyle='#e77769';ctx.fillRect(m.x-17,m.y-36,34*Math.max(0,hp),5);}ctx.textAlign='center';for(const f of combatText){
 const t=Math.min(1,Math.max(0,(now-f.start)/f.duration));
 const alpha=Math.min(1,(1-t)*3);
 ctx.save();ctx.globalAlpha=alpha;ctx.font=f.reward?'bold 12px sans-serif':'900 17px sans-serif';
 ctx.lineJoin='round';ctx.lineWidth=3.5;ctx.strokeStyle='rgba(20,18,25,.88)';
 const x=f.x+f.drift*t,y=f.y-20*t-9*Math.sin(t*Math.PI);
 ctx.strokeText(f.text,x,y);ctx.fillStyle=f.color;ctx.fillText(f.text,x,y);ctx.restore();
}ctx.textAlign='start';}
updateHud();renderInventory();renderCharacter();

// Loja de habilidades: desbloqueio por nível e compra com ouro.
// Três habilidades próprias de cada classe, desbloqueadas em 5, 20 e 30.
const SKILLS=GAME_RULES.skills;
const skillReady={},ownedSkills=new Set();
let autoSkillEnabled=false,nextAutoSkillCheck=0;
const classSkills=()=>SKILLS.filter(s=>s.classId===hero.classId);
function castSkill(id,now=performance.now(),silent=false){
 const s=SKILLS.find(x=>x.id===id&&x.classId===hero.classId);
 if(!s||hero.hp<=0||!ownedSkills.has(id)||hero.level<s.unlock||now<(skillReady[id]||0)||hero.mp<s.cost)return false;
 const zone=zoneIndex(player.x,player.y);if(zone<0)return false;
 const base=s.kind==='magic'?magicPower():physicalPower();
 let targets=[],center={x:player.x,y:player.y};
 const targeted=['arc5','arc20','mag5','mag20'].includes(id);
 if(targeted){const m=targetMob(s.radius,false);if(m){center={x:m.x,y:m.y};targets=[m];if(s.aoe)targets=monsters.filter(x=>!x.defeated&&x.zone===zone&&Math.hypot(x.x-m.x,x.y-m.y)<=s.aoe);}}
 else targets=monsters.filter(m=>!m.defeated&&m.zone===zone&&Math.hypot(m.x-player.x,m.y-player.y)<=s.radius);
 if(!targets.length){if(!silent)show('Nenhum inimigo no alcance.');return false;}
 hero.mp-=s.cost;skillReady[id]=now+s.cooldown*Math.max(.4,1-totalBonus('cooldown')/100);
 addEffect('ring',center.x,center.y,s.aoe||s.radius,s.color,550);
 let totalDamage=0;
 for(const m of targets){
  const before=m.hp;const strikes=s.shots||1;
  for(let i=0;i<strikes&&!m.defeated;i++)attackMob(m,base*s.factor*(1+totalBonus('aoe')/100)*(s.aoe&&m!==targets[0]?.72:1),now,s.kind==='magic');
  totalDamage+=Math.max(0,before-m.hp);
 }
 if(s.leech){const healed=Math.min(hero.maxHp-hero.hp,Math.round(totalDamage*s.leech));hero.hp+=healed;if(healed>0)floatText(player.x,player.y-36,'+'+healed+' HP','#8cff9e');}
 updateHud();renderSkills();return true;
}
function renderSkills(){const panel=document.getElementById('skill-bar');if(!panel)return;panel.replaceChildren();for(const s of classSkills()){
 const b=document.createElement('button');b.className='skill-cell';const left=Math.ceil(Math.max(0,(skillReady[s.id]||0)-performance.now())/1000);
 b.innerHTML='<span class="skill-icon">'+s.icon+'</span><small>'+s.key+' · '+s.name+'</small>'+(left?'<em>'+left+'s</em>':'');
 b.title=s.desc+' · '+s.cost+' MP · Nível '+s.unlock+(!ownedSkills.has(s.id)?' · NÃO COMPRADA':'');
 b.disabled=!ownedSkills.has(s.id)||hero.level<s.unlock||left>0;b.onclick=()=>castSkill(s.id);panel.append(b);
 }}
function toggleSkillShop(force){const el=document.getElementById('skill-shop');if(force&&Math.hypot(player.x-SKILL_VENDOR.x,player.y-SKILL_VENDOR.y)>SKILL_VENDOR.radius){show('Aproxime-se do Mestre de Habilidades.');return;}const open=typeof force==='boolean'?force:el.classList.contains('hidden');el.classList.toggle('hidden',!open);if(open){keys.clear();renderSkillShop();}}
function renderSkillShop(){const el=document.getElementById('skill-shop-items');el.replaceChildren();document.getElementById('skill-shop-gold').textContent=hero.gold.toLocaleString('pt-BR');for(const s of classSkills()){
 const row=document.createElement('div');row.className='shop-item skill-offer';const info=document.createElement('div');
 const title=document.createElement('strong');title.textContent=s.icon+' '+s.name;
 const detail=document.createElement('small');detail.textContent=s.desc;
 const req=document.createElement('small');req.textContent='Nível '+s.unlock+' · '+s.cost+' MP · Recarga '+(s.cooldown/1000)+'s';info.append(title,detail,req);
 const b=document.createElement('button');const owned=ownedSkills.has(s.id);b.textContent=owned?'✓ Aprendida':hero.level<s.unlock?'🔒 Nv '+s.unlock:'🪙 '+s.price.toLocaleString('pt-BR');b.disabled=owned||hero.gold<s.price||hero.level<s.unlock;
 b.onclick=()=>{if(hero.level<s.unlock||hero.gold<s.price||ownedSkills.has(s.id))return;hero.gold-=s.price;ownedSkills.add(s.id);show('Aprendeu '+s.name+'!');renderSkillShop();renderSkills();updateHud();};row.append(info,b);el.append(row);
 }}
function tickAutoSkills(now){if(!autoSkillEnabled||now<nextAutoSkillCheck||hero.hp<=0)return;nextAutoSkillCheck=now+320;for(const s of [...classSkills()].reverse())if(castSkill(s.id,now,true))break;}
function toggleAutoSkills(){autoSkillEnabled=!autoSkillEnabled;const b=document.getElementById('auto-skill-toggle');if(b){b.classList.toggle('enabled',autoSkillEnabled);b.setAttribute('aria-pressed',String(autoSkillEnabled));b.querySelector('small').textContent=autoSkillEnabled?'Auto Skill ON':'Auto Skill OFF';}show(autoSkillEnabled?'✨ Habilidades automáticas ligadas':'Habilidades automáticas desligadas');}
document.getElementById('skill-shop-close').onclick=()=>toggleSkillShop(false);
document.getElementById('auto-skill-toggle').onclick=toggleAutoSkills;
renderSkills();setInterval(renderSkills,500);

// Combate automático permanente: o jogador só precisa se movimentar.
let nextAutoTick=0;
function tickAutoAttack(now){
 if(zoneIndex(player.x,player.y)<0||now<nextAutoTick||hero.hp<=0)return;
 nextAutoTick=now+120;
 const range=equippedBow()?265:equippedStaff()?190:75;
 const m=targetMob(range,false);
 if(m){
  player.face=Math.abs(m.x-player.x)>Math.abs(m.y-player.y)?(m.x>player.x?'right':'left'):(m.y>player.y?'down':'up');
  playerAttack(now);
 }
}
