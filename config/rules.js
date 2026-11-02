// Configurações centralizadas. Sem dependências externas.
// Edições do painel são guardadas no localStorage deste navegador.
'use strict';
const GAME_DEFAULTS={
 classes:{
 warrior:{speedBase:.60,dexSpeed:.0045,strAttack:1.65,intMagic:.9,conHp:7.2,physicalMult:1.08},
 archer:{speedBase:.88,dexSpeed:.007,strAttack:.8,intMagic:1.3,conHp:3.6,physicalMult:.70},
 mage:{speedBase:.49,dexSpeed:.0015,strAttack:.3,intMagic:2.3,conHp:2.4,physicalMult:.68}
},
 regions:[
 {id:'zone1',name:'Bosque de Lúmen',min:1,max:9,color:'#438a54'},
 {id:'zone2',name:'Charcos de Nymora',min:10,max:19,color:'#42867d'},
 {id:'zone3',name:'Campinas de Grimhall',min:20,max:29,color:'#8c9650'},
 {id:'zone4',name:'Cordilheira de Varkun',min:30,max:44,color:'#818891'},
 {id:'zone5',name:'Necrópole de Morvath',min:45,max:59,color:'#687384'},
 {id:'zone6',name:'Ermos de Solkar',min:60,max:79,color:'#b17756'},
 {id:'zone7',name:'Ruínas de Aetheris',min:80,max:99,color:'#765b83'},
 {id:'zone8',name:'Fenda de Nocthar',min:100,max:140,color:'#563d69'}
],
 starters:{warrior:{label:'Guerreiro',stats:{str:8,int:3,dex:5,con:6},weapon:{name:'Espada de Treinamento',stat:'attack',base:5,icon:'⚔️',iconSrc:'icons/item-009.svg'}},archer:{label:'Arqueiro',stats:{str:5,int:3,dex:9,con:5},weapon:{name:'Arco de Treinamento',stat:'attack',base:5,weaponKind:'bow',icon:'🏹',iconSrc:'icons/bow-00.svg'}},mage:{label:'Mago',stats:{str:3,int:9,dex:5,con:5},weapon:{name:'Cajado de Treinamento',stat:'magic',base:7,icon:'🪄',iconSrc:'icons/item-020.svg'}}},
 skills:[
{id:'war5',classId:'warrior',name:'Investida de Ferro',key:'1',icon:'🛡️',cost:18,cooldown:6500,unlock:5,price:350,kind:'physical',radius:110,color:'#e7c58a',factor:1.45,desc:'Golpe pesado em todos os inimigos próximos.'},
{id:'war20',classId:'warrior',name:'Giro Sanguinário',key:'2',icon:'🩸',cost:42,cooldown:13000,unlock:20,price:5200,kind:'physical',radius:145,color:'#ff6476',factor:1.65,leech:.22,desc:'Gira causando dano em área e recupera 22% do dano causado.'},
{id:'war30',classId:'warrior',name:'Terremoto do Titã',key:'3',icon:'🌋',cost:70,cooldown:20000,unlock:30,price:14500,kind:'physical',radius:205,color:'#ffb45c',factor:2.35,desc:'Impacto brutal que atinge todos os inimigos próximos.'},
{id:'arc5',classId:'archer',name:'Disparo Duplo',key:'1',icon:'🏹',cost:16,cooldown:5000,unlock:5,price:350,kind:'physical',radius:280,color:'#a7ef9a',factor:1.1,shots:2,desc:'Duas flechas rápidas no inimigo mais próximo.'},
{id:'arc20',classId:'archer',name:'Flechas do Trovão',key:'2',icon:'⚡',cost:42,cooldown:11500,unlock:20,price:5200,kind:'physical',radius:280,color:'#a8dfff',factor:1.5,aoe:80,desc:'Flecha elétrica que atinge o alvo e inimigos ao redor.'},
{id:'arc30',classId:'archer',name:'Chuva de Mil Flechas',key:'3',icon:'🌧️',cost:72,cooldown:19000,unlock:30,price:14500,kind:'physical',radius:210,color:'#9beecb',factor:1.8,desc:'Chuva de flechas ao redor do arqueiro.'},
{id:'mag5',classId:'mage',name:'Orbe Flamejante',key:'1',icon:'🔥',cost:22,cooldown:7000,unlock:5,price:350,kind:'magic',radius:250,color:'#ff9d55',factor:1.65,aoe:48,desc:'Orbe de fogo que explode em pequena área.'},
{id:'mag20',classId:'mage',name:'Meteoro de Pégasus',key:'2',icon:'☄️',cost:55,cooldown:14500,unlock:20,price:5200,kind:'magic',radius:300,color:'#ffbe76',factor:2.15,aoe:115,desc:'Meteoro mágico que explode sobre o alvo e seus vizinhos.'},
{id:'mag30',classId:'mage',name:'Cataclismo Astral',key:'3',icon:'🌌',cost:90,cooldown:23000,unlock:30,price:14500,kind:'magic',radius:220,color:'#c8a4ff',factor:2.45,desc:'Explosão arcana que alcança todos os inimigos próximos.'}
],
 rarities:{common:{label:'Comum',weight:60,mult:1,improvement:0},uncommon:{label:'Incomum',weight:25,mult:1.15,improvement:15},rare:{label:'Raro',weight:10,mult:1.30,improvement:30},veryrare:{label:'Muito raro',weight:3.5,mult:1.50,improvement:50},epic:{label:'Épico',weight:1.3,mult:1.75,improvement:75},legendary:{label:'Legendário',weight:.2,mult:2,improvement:100}},
 progression:{xpRate:.84,xpBase:105,xpExponent:1.3,pointsPerLevel:5,monsterXpBase:20,monsterXpFactor:16,monsterXpExponent:1.5},
 monsters:{populationBase:30,populationPerZone:5,levelWeights:[60,30,10],levelCuts:[.4,.75],hpBase:24,hpPerLevel:8,hpPower:1.65,hpExponent:1.7,hpZoneScale:.20,attackBase:5,attackPerLevel:2,attackPower:.45,attackExponent:1.25,attackZoneScale:.16,defenseBase:1,defensePerLevel:.8,defensePower:.16,defenseExponent:1.2,defenseZoneScale:.13,respawnMs:10000},
 combat:{archerDexDamage:.55,mageSplashRadius:50,mageSplashDamage:.44,warriorHpMultiplier:1.20,warriorAttackDelay:900,archerAttackDelay:750,mageAttackDelay:950},
 economy:{goldMin:10,goldMax:15,goldPerLevel:3.2,stoneChanceBase:.065,stoneChancePerLevel:.0015,stoneChanceCap:.22},
 selling:{basePrice:12,levelFactor:2,tierFactor:4,refineFactor:8,rarityMultipliers:{common:1,uncommon:1.5,rare:2.5,veryrare:4,epic:7,legendary:12}}
};
const GAME_STORAGE_KEY='eldoria-rules-v1';
function mergeRules(base,patch){if(!patch||typeof patch!=='object'||Array.isArray(patch))return base;for(const [key,value] of Object.entries(patch)){if(!(key in base))continue;if(Array.isArray(base[key])){if(Array.isArray(value)&&value.length===base[key].length)base[key]=value;}else if(base[key]&&typeof base[key]==='object')mergeRules(base[key],value);else if(typeof value===typeof base[key])base[key]=value;}return base;}
function loadRules(){const data=JSON.parse(JSON.stringify(GAME_DEFAULTS));try{mergeRules(data,JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)||'{}'));}catch(e){console.warn('Configuração inválida, usando padrão',e);}return data;}
const GAME_RULES=loadRules();
