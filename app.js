// ============================================================
// 1. RÉFÉRENCES DOM ET CONFIGURATION GÉNÉRALE
// ============================================================
const mindmap = document.getElementById('mindmap');
const svg = document.getElementById('connections');
const centre = document.getElementById('centre');
const centreInput = document.getElementById('centreInput');
const controlsLayer = document.getElementById('branchControlsLayer');
const editorLayer = document.getElementById('editorLayer');
const addBranchButton = document.getElementById('addBranch');
const resetButton = document.getElementById('resetMap');
let freeIconLayer = document.getElementById('freeIconLayer');
let freeIconFrontLayer = document.getElementById('freeIconFrontLayer');
const freeIconOverlayLayer = document.getElementById('freeIconOverlayLayer');
const freeIconResizePreview = document.getElementById('freeIconResizePreview');
function ensureFreeIconCanvas(){
  if(freeIconLayer && typeof freeIconLayer.getContext === 'function') return freeIconLayer;
  const old=freeIconLayer || document.getElementById('freeIconLayer');
  const canvas=document.createElement('canvas');
  canvas.id='freeIconLayer';
  canvas.setAttribute('aria-label','Icônes libres');
  if(old?.parentNode){
    old.parentNode.replaceChild(canvas,old);
  }else{
    mindmap.insertBefore(canvas,mindmap.firstChild);
  }
  freeIconLayer=canvas;
  return canvas;
}
const addFreeIconButton = document.getElementById('addFreeIcon');

function ensureFreeIconFrontCanvas(){
  if(freeIconFrontLayer && typeof freeIconFrontLayer.getContext === 'function') return freeIconFrontLayer;
  const old=freeIconFrontLayer || document.getElementById('freeIconFrontLayer');
  const canvas=document.createElement('canvas');
  canvas.id='freeIconFrontLayer';
  canvas.setAttribute('aria-label','Icônes libres premier plan');
  if(old?.parentNode){
    old.parentNode.replaceChild(canvas,old);
  }else if(svg?.parentNode){
    svg.parentNode.insertBefore(canvas,svg.nextSibling);
  }else{
    mindmap.appendChild(canvas);
  }
  freeIconFrontLayer=canvas;
  return canvas;
}


// ============================================================
// 2. SAUVEGARDE, LIMITES ET COULEURS
// ============================================================
const STORAGE_KEY = 'carteMentaleV9IconSelection';
const LEGACY_KEYS = [
  'carteMentaleIconBugFix3V1',
  'carteMentaleIconLayerStrictFixV1',
  'carteMentaleFixStrictV1',
  'carteMentaleV4RedimensionnementSansBugIconesFondV1',
  'carteMentaleBgIconsResizeFixV1',
  'carteMentaleBlueSelectionResizeFixV2',
  'carteMentaleSelectionBleueDefinitifV1',
  'carteMentaleIconesMegaMobileV1',
  'carteMentaleIconesMegaMobileV2',
  'carteMentaleReferencePhoto8V3',
  'carteMentaleReferencePhoto8V5',
  'carteMentaleReferencePhoto8V4',
  'carteMentaleReferencePhoto8V1',
  'carteMentaleReferencePhoto6V1',
  'carteMentaleReferenceV6',
  'carteMentaleFinaleV2',
  'carteMentaleFinaleV1',
];
const MAX_MAIN_BRANCHES = 8;
const MAX_IDEAS = 6;
const MAX_DEPTH = 2; // idée + sous-idée

const VISUAL_SIZES = {
  line: {
    main: 8.8,
    idea: 4.4,
    subIdea: 2.8
  },
  text: {
    main: { vw: 1.12, min: 15.5, max: 19.5 },
    idea: { vw: 0.90, min: 11.5, max: 14.0 },
    subIdea: { vw: 0.74, min: 9.5, max: 11.5 }
  },
  handleRadius: {
    main: 7.0,
    idea: 6.0,
    subIdea: 5.2
  },
  handleStroke: {
    main: 3.2,
    idea: 2.6,
    subIdea: 2.4
  }
};

const automaticColors = [
  '#c85f73', // 1 rose poudré
  '#5d8eaa', // 2 bleu doux
  '#7f9a72', // 3 vert sauge
  '#c88c67', // 4 terre cuite
  '#8f79a3', // 5 mauve
  '#5f9b98', // 6 turquoise grisé
  '#b79d59', // 7 ocre doux
  '#8b667f'  // 8 prune douce
];



const PRESET_COLOR_SWATCHES = [
  '#000000','#7f7f7f','#880015','#ed1c24','#ff7f27','#fff200','#22b14c','#00a2e8',
  '#3f48cc','#a349a4','#ffffff','#c3c3c3','#b97a57','#ffaec9','#ffc90e','#efe4b0',
  '#b5e61d','#99d9ea','#7092be','#c8bfe7','#404040','#bfbfbf','#5c2e00','#8b0000',
  '#d2691e','#d4af37','#2e8b57','#1e90ff','#483d8b','#800080','#f4f4f4','#e8d9c5'
];

function buildColorPaletteMarkup(selectedColor,label){
  const current=String(selectedColor||'#000000').toLowerCase();
  const swatches=PRESET_COLOR_SWATCHES.map(color=>`<button type="button" class="color-swatch${color.toLowerCase()===current?' active':''}" data-color="${color}" aria-label="${label} : ${color}" title="${color}" style="--swatch:${color}"></button>`).join('');
  return `
    <div class="color-wrap" title="${label}">
      <button type="button" class="color-palette-button" aria-label="${label}" style="--current-color:${current}">
        <span class="color-current-chip" aria-hidden="true"></span>
      </button>
      <div class="color-palette" role="listbox" aria-label="${label}">${swatches}</div>
    </div>`;
}

function bindColorPalette(wrap,onPick){
  if(!wrap) return;
  const toggle=wrap.querySelector('.color-palette-button');
  const panel=wrap.querySelector('.color-palette');
  if(!toggle || !panel) return;

  const close=()=>wrap.classList.remove('open');
  const open=()=>{
    document.querySelectorAll('.color-wrap.open').forEach(el=>{ if(el!==wrap) el.classList.remove('open'); });
    wrap.classList.add('open');
  };

  wrap.addEventListener('pointerdown',e=>e.stopPropagation());
  toggle.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    if(wrap.classList.contains('open')) close(); else open();
  });

  panel.querySelectorAll('.color-swatch').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      onPick(btn.dataset.color);
      close();
    });
  });
}

function deg(value) {
  return value * Math.PI / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function uid() {
  return nextId++;
}

function isTabletLike() {
  return window.innerWidth <= 1180 || window.innerHeight <= 820;
}

function isPhoneLike() {
  return window.innerWidth <= 820;
}


/*
  Huit emplacements fixes : les six positions actuelles restent inchangées,
  avec une branche supplémentaire en haut et une en bas.
  Les slots ne dépendent jamais du nombre de branches ouvertes.
*/
// ============================================================
// 3. POSITIONNEMENT DES BRANCHES PRINCIPALES
// ============================================================
const FIXED_SLOTS = [
  { angle:-43, fan: -5, x:.665, y:.185, band:[.045,.305], axis:'horizontal' }, // 1 haut droite
  { angle: -7, fan:  0, x:.685, y:.485, band:[.355,.615], axis:'horizontal' }, // 2 milieu droite
  { angle: 42, fan:  5, x:.655, y:.785, band:[.685,.945], axis:'horizontal' }, // 3 bas droite
  { angle:138, fan:175, x:.345, y:.785, band:[.685,.945], axis:'horizontal' }, // 4 bas gauche
  { angle:183, fan:180, x:.315, y:.485, band:[.355,.615], axis:'horizontal' }, // 5 milieu gauche
  { angle:222, fan:185, x:.335, y:.185, band:[.045,.305], axis:'horizontal' }, // 6 haut gauche
  { angle:-90, fan:-90, x:.500, y:.145, band:[.345,.655], axis:'vertical-top' }, // 7 haut
  { angle: 90, fan: 90, x:.500, y:.855, band:[.345,.655], axis:'vertical-bottom' } // 8 bas
] .map(s=>({...s,angle:deg(s.angle),fan:deg(s.fan)}));

// Ordre d'ouverture souhaité : en haut à droite, puis dans le sens des aiguilles d'une montre.
const OPENING_ORDER = [0, 1, 2, 7, 3, 4, 5, 6];
function firstFreeSlot(used){
  return OPENING_ORDER.find(slot => !used.has(slot));
}
function branchNumberFromSlot(slot){
  const index = OPENING_ORDER.indexOf(slot);
  return index >= 0 ? index + 1 : slot + 1;
}

let nextId = 1;
let state = { centre:'MON PROJET', branches:[], freeIcons:[] };
let hideTimer = null;
let activeGroup = null;
let branchMenuHandleHover=false;
let branchMenuSuppressUntil=0;
let dragState = null;
let activeBranchTouchId = null;
let textEditingActive = false;
let pendingRenderAfterEdit = false;
let reopenMenuKey = null;

// ============================================================
// 4. ÉTAT, SAUVEGARDE ET NORMALISATION
// ============================================================
function save() {
  state.centre = centreInput.value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({state,nextId}));
}

function normalizeNodeLengths(nodes) {
  for(const node of nodes || []){
    node.length = clamp(Number(node.length) || 1, .50, 1.55);
    node.textScale = clamp(Number(node.textScale) || 1, .55, 2.6);
    // Après un déplacement libre, on mémorise le vecteur de l'extrémité
    // relativement à son parent. Cela conserve la direction sur redimensionnement.
    if(Number.isFinite(Number(node.vectorX)) && Number.isFinite(Number(node.vectorY))){
      node.vectorX = clamp(Number(node.vectorX), -.48, .48);
      node.vectorY = clamp(Number(node.vectorY), -.48, .48);
    }else{
      delete node.vectorX;
      delete node.vectorY;
    }
    node.children = (node.children || []).slice(0, MAX_IDEAS);
    normalizeNodeLengths(node.children);
  }
}

function normalizeSlots() {
  state.branches = (state.branches || []).slice(0, MAX_MAIN_BRANCHES);
  const used = new Set();
  for(const branch of state.branches){
    if(!Number.isInteger(branch.slot) || branch.slot < 0 || branch.slot >= MAX_MAIN_BRANCHES || used.has(branch.slot)){
      branch.slot = firstFreeSlot(used);
    }
    if(branch.slot == null) branch.slot = 0;
    branch.length = clamp(Number(branch.length) || 1, .58, 1.28);
    branch.textScale = clamp(Number(branch.textScale) || 1, .55, 2.6);
    if(Number.isFinite(Number(branch.vectorX)) && Number.isFinite(Number(branch.vectorY))){
      branch.vectorX = clamp(Number(branch.vectorX), -.48, .48);
      branch.vectorY = clamp(Number(branch.vectorY), -.48, .48);
    }else{
      delete branch.vectorX;
      delete branch.vectorY;
    }
    branch.children = (branch.children || []).slice(0, MAX_IDEAS);
    normalizeNodeLengths(branch.children);
    used.add(branch.slot);
  }
}

function load() {
  try{
    let raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      for(const key of LEGACY_KEYS){
        raw = localStorage.getItem(key);
        if(raw) break;
      }
    }
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(parsed?.state?.branches){
      state = parsed.state;
      nextId = parsed.nextId || 1;
      state.freeIcons = Array.isArray(state.freeIcons) ? state.freeIcons : [];
      state.freeIcons = state.freeIcons.map(icon=>({
        id: icon.id || uid(),
        glyph: icon.glyph || (!icon.iconUrl ? '💡' : ''),
        iconUrl: icon.iconUrl || '',
        x: clamp(Number(icon.x)||.82,.03,.97),
        y: clamp(Number(icon.y)||.16,.04,.96),
        size: clamp(Number(icon.size)||72,28,300),
        rotation: ((Number(icon.rotation)||0)%360+360)%360,
        flipH: !!icon.flipH,
        flipV: !!icon.flipV,
        // Les anciennes images importées gardaient souvent un fond coloré.
        // On active donc désormais le détourage automatiquement pour toute image,
        // sauf si l'utilisateur a explicitement demandé de conserver le fond.
        keepBg: !!icon.keepBg,
        removeBg: icon.iconUrl ? !icon.keepBg : false,
        layer: icon.layer === 'front' ? 'front' : 'back'
      }));
      normalizeSlots();
    }
  }catch(_){ }
}

function findBranch(id) {
  return state.branches.find(branch => branch.id === id);
}
function findNode(nodes,id){
  for(const node of nodes || []){
    if(node.id===id) return node;
    const found = findNode(node.children || [], id);
    if(found) return found;
  }
  return null;
}

// ============================================================
// 5. CRÉATION ET GESTION DES BRANCHES
// ============================================================
function addMainBranch(){
  state.branches = Array.isArray(state.branches) ? state.branches : [];
  normalizeSlots();
  if(state.branches.length >= MAX_MAIN_BRANCHES) return;
  const used = new Set(state.branches.map(b=>b.slot));
  const slot = firstFreeSlot(used);
  if(slot == null) return;
  state.branches.push({
    id:uid(), slot,
    color:automaticColors[slot],
    text:`Branche ${branchNumberFromSlot(slot)}`,
    length:1,
    textScale:1,
    children:[]
  });
  save(); render();
}

// Le bouton principal est relié immédiatement, avant toute l'initialisation des icônes.
// Ainsi, une erreur dans le système d'icônes ne peut plus bloquer l'ajout de branches.
if(addBranchButton){
  addBranchButton.addEventListener('pointerdown',e=>{
    e.stopPropagation();
  },true);
  addBranchButton.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    try{
      addMainBranch();
    }catch(err){
      console.error('Erreur ajout branche',err);
      // secours minimal : ajoute quand même une branche si le rendu complet échoue
      state.branches = Array.isArray(state.branches) ? state.branches : [];
      const used=new Set(state.branches.map(b=>b.slot));
      const slot=firstFreeSlot(used);
      if(slot!=null && state.branches.length<MAX_MAIN_BRANCHES){
        state.branches.push({id:uid(),slot,color:automaticColors[slot],text:`Branche ${branchNumberFromSlot(slot)}`,length:1,textScale:1,children:[]});
        try{ save(); }catch(_){ }
        try{ render(); }catch(_){ }
      }
    }
  },true);
}

function setBranchLength(id,value){
  const b=findBranch(id); if(!b) return;
  b.length=clamp(Number(value)/100,.58,1.28);
  save(); render();
}

function addChild(branchId,parentId=null){
  const branch = findBranch(branchId);
  if(!branch) return;
  const parent = parentId == null ? branch : findNode(branch.children,parentId);
  if(!parent) return;
  parent.children = parent.children || [];
  if(parent.children.length >= MAX_IDEAS) return;
  parent.children.push({id:uid(),text:parentId==null?'Nouvelle idée':'Sous-idée',length:1,textScale:1,children:[]});
  save(); render();
}

function removeNode(nodes,id){
  return (nodes||[]).filter(n=>n.id!==id).map(n=>({...n,children:removeNode(n.children||[],id)}));
}
function deleteChild(branchId,nodeId){
  const branch=findBranch(branchId); if(!branch) return;
  branch.children=removeNode(branch.children,nodeId); save(); render();
}
function deleteBranch(id){
  if(!confirm('Supprimer cette branche et toutes ses idées ?')) return;
  state.branches=state.branches.filter(b=>b.id!==id); save(); render();
}
function changeColor(id,color){
  const b=findBranch(id); if(!b) return; b.color=color; save(); render();
}

function changeNodeColor(branchId,nodeId,color){
  const branch=findBranch(branchId); if(!branch) return;
  const node=findNode(branch.children,nodeId); if(!node) return;
  node.color=color;
  save(); render();
}

const MINDMAP_ICONS = [
  {group:'Carte mentale', items:[
    ['💡','Idée'],['🧠','Réflexion'],['✨','Inspiration'],['🎯','Objectif'],['🌱','Départ'],['🌿','Développement'],['🌳','Arborescence'],['🔀','Ramification'],
    ['🧩','Connexion'],['🔗','Lien'],['🪄','Créativité'],['🔍','Recherche'],['❓','Question'],['💭','Pensée'],['🗯️','Discussion'],['⭐','Important']
  ]},
  {group:'Projet', items:[
    ['🚀','Lancement'],['🎯','But'],['📌','Étape clé'],['🧭','Direction'],['🗺️','Feuille de route'],['📋','Plan'],['📝','Action'],['✅','Validé'],
    ['⏳','En cours'],['🏁','Terminé'],['📈','Progression'],['📊','Suivi'],['🛠️','Construction'],['⚙️','Réglage'],['🧪','Test'],['🏆','Réussite']
  ]},
  {group:'Travail', items:[
    ['💼','Travail'],['🏢','Entreprise'],['👔','Professionnel'],['👥','Équipe'],['🤝','Collaboration'],['🗣️','Réunion'],['📞','Appel'],['✉️','Message'],
    ['📄','Document'],['📁','Dossier'],['🗂️','Classement'],['📝','Note'],['📊','Analyse'],['📈','Résultat'],['🖊️','Signature'],['🖨️','Impression']
  ]},
  {group:'Organisation', items:[
    ['✅','Terminé'],['☑️','Tâche'],['📌','À retenir'],['📅','Calendrier'],['🗓️','Planning'],['⏰','Heure'],['⏱️','Durée'],['🔔','Rappel'],
    ['📍','Repère'],['🧷','Épingler'],['🔖','Marque-page'],['📚','Ressources'],['🗃️','Archive'],['📦','Stockage'],['🔢','Priorité'],['🔄','À refaire']
  ]},
  {group:'Santé', items:[
    ['❤️','Santé'],['🩺','Médecin'],['🏥','Hôpital'],['💊','Médicament'],['🩹','Soin'],['🧬','Biologie'],['🩸','Analyse'],['🦷','Dentaire'],
    ['👁️','Vue'],['🧘','Bien-être'],['🏃','Sport'],['🚶','Marche'],['💪','Force'],['🥗','Nutrition'],['💧','Hydratation'],['😴','Sommeil']
  ]},
  {group:'Amour & relations', items:[
    ['❤️','Amour'],['💕','Couple'],['💖','Affection'],['💘','Coup de cœur'],['💍','Engagement'],['👩‍❤️‍👨','Couple'],['👨‍👩‍👧‍👦','Famille'],['👫','Relation'],
    ['🤗','Soutien'],['💬','Échange'],['🎁','Cadeau'],['🎉','Célébration'],['🌹','Romance'],['💌','Message d’amour'],['🏡','Foyer'],['🤝','Confiance']
  ]},
  {group:'Voyage', items:[
    ['✈️','Avion'],['🚆','Train'],['🚗','Voiture'],['🚌','Bus'],['🚲','Vélo'],['🚢','Bateau'],['🧳','Bagage'],['🎒','Sac'],
    ['🗺️','Carte'],['📍','Destination'],['🧭','Orientation'],['🏨','Hôtel'],['🏕️','Camping'],['🏖️','Plage'],['⛰️','Montagne'],['🌍','Monde']
  ]},
  {group:'Finance', items:[
    ['💰','Argent'],['💶','Euro'],['💵','Espèces'],['💳','Carte bancaire'],['🏦','Banque'],['🧾','Facture'],['🪙','Épargne'],['🐷','Économies'],
    ['📈','Hausse'],['📉','Baisse'],['📊','Budget'],['🧮','Calcul'],['💸','Dépense'],['🛒','Achat'],['🏷️','Prix'],['🔐','Sécurité']
  ]},
  {group:'Maison & vie quotidienne', items:[
    ['🏠','Maison'],['🏡','Habitation'],['🔑','Clé'],['🛏️','Chambre'],['🍽️','Repas'],['🛋️','Salon'],['🧹','Ménage'],['🧺','Linge'],
    ['🛒','Courses'],['🍳','Cuisine'],['🔧','Réparation'],['🪴','Jardin'],['🐶','Chien'],['🐱','Chat'],['🚪','Porte'],['💡','Éclairage']
  ]},
  {group:'Numérique', items:[
    ['💻','Ordinateur'],['🖥️','Écran'],['📱','Téléphone'],['⌨️','Clavier'],['🖱️','Souris'],['🌐','Internet'],['📶','Réseau'],['☁️','Cloud'],
    ['💾','Sauvegarde'],['🔐','Sécurité'],['🔗','Lien'],['📧','E-mail'],['📸','Photo'],['🎥','Vidéo'],['🎧','Audio'],['⚙️','Paramètres']
  ]},
  {group:'Apprentissage', items:[
    ['📚','Études'],['📖','Lecture'],['✏️','Écriture'],['🎓','Formation'],['🧑‍🏫','Cours'],['🧠','Mémorisation'],['🔬','Science'],['🧪','Expérience'],
    ['📐','Mesure'],['🧮','Maths'],['🌐','Recherche'],['🔎','Explorer'],['💬','Langue'],['🏅','Compétence'],['📌','À retenir'],['✅','Acquis']
  ]},
  {group:'Communication', items:[
    ['💬','Message'],['🗨️','Conversation'],['📞','Téléphone'],['📧','E-mail'],['📣','Annonce'],['📢','Communication'],['🗣️','Parler'],['👂','Écouter'],
    ['🤝','Accord'],['👥','Groupe'],['🌐','Réseau'],['📱','Réseaux sociaux'],['📝','Écrire'],['🎙️','Micro'],['📹','Visio'],['🔔','Notification']
  ]},
  {group:'Créativité', items:[
    ['🎨','Création'],['🖌️','Peinture'],['✏️','Croquis'],['📷','Photo'],['🎬','Cinéma'],['🎵','Musique'],['🎭','Art'],['🧵','Fabrication'],
    ['✨','Inspiration'],['🌈','Idée créative'],['🪄','Imaginer'],['🧩','Assembler'],['🛠️','Fabriquer'],['📐','Design'],['💎','Concept'],['🔥','Énergie']
  ]},
  {group:'Émotions & état', items:[
    ['😊','Heureux'],['😃','Motivé'],['😌','Calme'],['🤔','Réflexion'],['😕','Doute'],['😟','Préoccupation'],['😡','Colère'],['😴','Fatigue'],
    ['❤️','Aimer'],['💪','Confiance'],['🙏','Gratitude'],['🌞','Positif'],['🌧️','Difficile'],['🔥','Motivation'],['⚡','Énergie'],['🕊️','Paix']
  ]},
  {group:'Signaux & priorités', items:[
    ['⚠️','Attention'],['❗','Priorité'],['‼️','Urgent'],['❓','Question'],['✅','OK'],['❌','Non'],['🚫','Interdit'],['⛔','Blocage'],
    ['🔔','Alerte'],['🔒','Privé'],['🔓','Ouvert'],['⭐','Favori'],['📌','Important'],['➡️','Suivant'],['⬆️','Augmenter'],['⬇️','Diminuer']
  ]}
];


// Catalogue complémentaire : thèmes plus détaillés pour cartes mentales.
MINDMAP_ICONS.push(
  {group:'Vote & décision',items:[
    ['🗳️','Vote'],['☑️','Choix'],['✅','Pour'],['❌','Contre'],['👍','Approuver'],['👎','Refuser'],['🤷','Indécis'],['🙋','Candidat'],
    ['📊','Sondage'],['📋','Questionnaire'],['🔘','Option'],['🎯','Décision'],['⚖️','Comparer'],['🤝','Consensus'],['🏆','Majorité'],['🔔','Résultat'],
    ['🟢','Feu vert'],['🟡','À discuter'],['🔴','Refus'],['❔','À décider'],['💬','Débat'],['🗣️','Avis'],['👥','Assemblée'],['📣','Annonce']
  ]},
  {group:'Stratégie & business',items:[
    ['♟️','Stratégie'],['🎯','Cible'],['🧭','Orientation'],['📌','Positionnement'],['🚀','Croissance'],['📈','Performance'],['📉','Risque'],['💹','Marché'],
    ['🏢','Société'],['🏭','Production'],['🛍️','Commerce'],['🤝','Partenariat'],['🧲','Acquisition'],['📣','Marketing'],['💎','Valeur'],['🪜','Étapes'],
    ['🔑','Facteur clé'],['🧱','Fondation'],['🛡️','Protection'],['🌐','Déploiement'],['🧪','Prototype'],['📦','Produit'],['🎁','Offre'],['🏁','Objectif final']
  ]},
  {group:'Gestion de projet',items:[
    ['🗓️','Jalon'],['📅','Date'],['⏱️','Délai'],['⌛','Attente'],['🔁','Cycle'],['🔄','Itération'],['🧩','Lot'],['📍','Point clé'],
    ['📝','Brief'],['📐','Conception'],['🛠️','Réalisation'],['🧪','Test'],['🐞','Bug'],['✅','Recette'],['🚀','Mise en ligne'],['📊','Reporting'],
    ['👤','Responsable'],['👥','Équipe'],['💬','Réunion'],['📎','Pièce jointe'],['🔗','Dépendance'],['⚠️','Risque'],['🧯','Blocage'],['🎉','Livraison']
  ]},
  {group:'Carrière & travail',items:[
    ['🧑‍💼','Manager'],['👩‍💻','Développeur'],['👨‍🎨','Créatif'],['👷','Technique'],['🧑‍🔬','Recherche'],['🧑‍🏫','Formation'],['🧑‍⚕️','Soins'],['🧑‍🍳','Cuisine'],
    ['🪪','Identité pro'],['📇','Contact'],['📄','CV'],['💼','Emploi'],['🪜','Évolution'],['🏅','Compétence'],['🎓','Diplôme'],['💬','Entretien'],
    ['💶','Salaire'],['⏰','Horaires'],['🏠','Télétravail'],['🏢','Bureau'],['🧳','Déplacement pro'],['📚','Formation'],['🤝','Réseau'],['⭐','Talent']
  ]},
  {group:'Santé détaillée',items:[
    ['🧠','Cerveau'],['🫀','Cœur'],['🫁','Poumons'],['🦴','Os'],['🦷','Dents'],['👁️','Yeux'],['👂','Audition'],['🩸','Sang'],
    ['🌡️','Température'],['🩺','Consultation'],['💉','Injection'],['💊','Traitement'],['🧴','Soin'],['🩹','Blessure'],['🚑','Urgence'],['🏥','Hôpital'],
    ['🥦','Nutrition'],['🍎','Alimentation'],['💧','Hydratation'],['😴','Sommeil'],['🧘','Relaxation'],['🏋️','Exercice'],['🚶','Activité'],['❤️‍🩹','Récupération']
  ]},
  {group:'Amour, famille & relations',items:[
    ['❤️','Amour'],['🧡','Affection'],['💛','Amitié'],['💚','Harmonie'],['💙','Confiance'],['💜','Tendresse'],['🤍','Paix'],['💕','Couple'],
    ['💍','Mariage'],['💌','Message'],['🌹','Romance'],['🥰','Tendresse'],['😘','Bisou'],['🤗','Câlin'],['👨‍👩‍👧‍👦','Famille'],['👶','Enfant'],
    ['🧑‍🤝‍🧑','Relation'],['🫶','Soutien'],['🤝','Confiance'],['💬','Dialogue'],['🏡','Foyer'],['🎂','Anniversaire'],['🎁','Cadeau'],['🎉','Moment heureux']
  ]},
  {group:'Voyage détaillé',items:[
    ['✈️','Avion'],['🛫','Départ'],['🛬','Arrivée'],['🚆','Train'],['🚇','Métro'],['🚗','Voiture'],['🏍️','Moto'],['🚲','Vélo'],
    ['🛳️','Croisière'],['⛵','Voilier'],['🏨','Hôtel'],['🛎️','Réservation'],['🧳','Valise'],['🎒','Sac à dos'],['🗺️','Itinéraire'],['🧭','Boussole'],
    ['📍','Lieu'],['🌍','International'],['🏖️','Plage'],['⛰️','Montagne'],['🏕️','Camping'],['🏛️','Monument'],['📸','Souvenir'],['🛂','Passeport']
  ]},
  {group:'Finance détaillée',items:[
    ['💶','Euro'],['💵','Billets'],['🪙','Pièces'],['💰','Capital'],['🏦','Banque'],['💳','Carte'],['🧾','Facture'],['📄','Contrat'],
    ['📊','Budget'],['🧮','Calcul'],['📈','Gain'],['📉','Perte'],['💸','Dépense'],['🐷','Épargne'],['🏠','Immobilier'],['🚗','Crédit auto'],
    ['📅','Échéance'],['🔒','Sécurité'],['🔐','Compte'],['💱','Change'],['📦','Actif'],['⚖️','Équilibre'],['🎯','Objectif financier'],['✅','Payé']
  ]},
  {group:'Personnes & rôles',items:[
    ['👤','Personne'],['👥','Groupe'],['🧑','Adulte'],['👩','Femme'],['👨','Homme'],['🧒','Enfant'],['👴','Senior'],['👵','Senior'],
    ['🧑‍💼','Responsable'],['🧑‍💻','Technicien'],['🧑‍🎓','Étudiant'],['🧑‍🏫','Professeur'],['🧑‍⚕️','Médecin'],['🧑‍🔧','Réparateur'],['🧑‍🚀','Explorateur'],['🧑‍🎨','Créateur'],
    ['🙋','Volontaire'],['🗣️','Intervenant'],['👂','Écoute'],['🤝','Partenaire'],['🫂','Soutien'],['👑','Leader'],['🕵️','Analyse'],['🧑‍⚖️','Décision']
  ]},
  {group:'Temps & calendrier',items:[
    ['🕐','Heure'],['⏰','Alarme'],['⏱️','Chrono'],['⌛','Temps restant'],['📅','Date'],['🗓️','Planning'],['🌅','Matin'],['☀️','Journée'],
    ['🌆','Soir'],['🌙','Nuit'],['📆','Mois'],['🔁','Récurrent'],['⏩','Plus tard'],['⏪','Avant'],['▶️','Démarrer'],['⏸️','Pause'],
    ['⏹️','Arrêter'],['🔔','Rappel'],['📌','Échéance'],['🕰️','Historique'],['⚡','Rapide'],['🐢','Lent'],['✅','À l’heure'],['⚠️','Retard']
  ]},
  {group:'Communication & réseaux',items:[
    ['📞','Appel'],['☎️','Téléphone'],['📱','Mobile'],['💬','Chat'],['🗨️','Discussion'],['📧','Email'],['✉️','Courrier'],['📨','Réception'],
    ['📣','Annonce'],['📢','Diffusion'],['🎙️','Podcast'],['🎥','Visio'],['📹','Vidéo'],['📸','Photo'],['🌐','Web'],['📡','Diffusion'],
    ['📶','Signal'],['🔗','Lien'],['👥','Communauté'],['🤳','Social'],['👍','Like'],['❤️','Favori'],['🔔','Notification'],['🔕','Silence']
  ]},
  {group:'Numérique & technologie',items:[
    ['💻','Portable'],['🖥️','Ordinateur'],['📱','Smartphone'],['⌨️','Clavier'],['🖱️','Souris'],['🖨️','Imprimante'],['💾','Disque'],['💿','Support'],
    ['☁️','Cloud'],['🌐','Internet'],['📡','Réseau'],['🔌','Connexion'],['🔋','Batterie'],['⚙️','Réglages'],['🛡️','Sécurité'],['🔐','Mot de passe'],
    ['🧑‍💻','Code'],['🐞','Bug'],['🧪','Test'],['🤖','IA'],['📊','Données'],['🗄️','Base de données'],['🔄','Synchronisation'],['⬇️','Téléchargement']
  ]},
  {group:'Maison & immobilier',items:[
    ['🏠','Maison'],['🏡','Villa'],['🏢','Appartement'],['🏗️','Construction'],['🧱','Mur'],['🚪','Porte'],['🪟','Fenêtre'],['🔑','Clé'],
    ['🛏️','Chambre'],['🛋️','Salon'],['🚿','Salle de bain'],['🍳','Cuisine'],['🪴','Jardin'],['🌳','Terrain'],['🏊','Piscine'],['🔧','Travaux'],
    ['🛠️','Bricolage'],['⚡','Électricité'],['💧','Eau'],['🔥','Chauffage'],['☀️','Solaire'],['📐','Plan'],['💶','Budget'],['📋','Dossier']
  ]},
  {group:'Nature & environnement',items:[
    ['🌱','Pousse'],['🌿','Plante'],['🌳','Arbre'],['🌲','Forêt'],['🌴','Palmier'],['🌸','Fleur'],['🌻','Soleil'],['🍂','Automne'],
    ['☀️','Soleil'],['🌤️','Éclaircies'],['🌧️','Pluie'],['⛈️','Orage'],['❄️','Neige'],['💨','Vent'],['💧','Eau'],['🔥','Feu'],
    ['🌍','Planète'],['♻️','Recycler'],['🔋','Énergie'],['☘️','Écologie'],['🐾','Animal'],['🐶','Chien'],['🐱','Chat'],['🐦','Oiseau']
  ]},
  {group:'Sport & activité',items:[
    ['🏃','Course'],['🚶','Marche'],['🏋️','Musculation'],['🤸','Fitness'],['🧘','Yoga'],['🚴','Vélo'],['🏊','Natation'],['⚽','Football'],
    ['🏀','Basket'],['🎾','Tennis'],['🏐','Volley'],['🏓','Ping-pong'],['🥊','Boxe'],['🥋','Arts martiaux'],['⛷️','Ski'],['🏄','Surf'],
    ['🥾','Randonnée'],['⛰️','Montagne'],['🏆','Victoire'],['🥇','Premier'],['🎯','Performance'],['💪','Force'],['❤️','Cardio'],['⏱️','Temps']
  ]},
  {group:'Alimentation & cuisine',items:[
    ['🍎','Fruit'],['🥦','Légume'],['🥗','Salade'],['🍞','Pain'],['🧀','Fromage'],['🥚','Œuf'],['🍗','Poulet'],['🐟','Poisson'],
    ['🍝','Pâtes'],['🍚','Riz'],['🍲','Plat'],['🥘','Cuisine'],['🍳','Cuisson'],['🔪','Préparation'],['🧂','Assaisonnement'],['🥤','Boisson'],
    ['☕','Café'],['💧','Eau'],['🍰','Dessert'],['🎂','Gâteau'],['🛒','Courses'],['📋','Recette'],['🔥','Chaud'],['❄️','Froid']
  ]},
  {group:'Documents & fichiers',items:[
    ['📄','Document'],['📃','Page'],['📑','Dossier'],['📁','Répertoire'],['🗂️','Archives'],['📎','Pièce jointe'],['📝','Note'],['✍️','Écriture'],
    ['📋','Liste'],['📊','Tableau'],['📈','Graphique'],['🧾','Reçu'],['🪪','Carte'],['📕','Livre rouge'],['📘','Livre bleu'],['📗','Livre vert'],
    ['🔖','Signet'],['🔍','Chercher'],['🖊️','Signer'],['✅','Validé'],['🔒','Confidentiel'],['📤','Envoyer'],['📥','Recevoir'],['🗑️','Supprimer']
  ]},
  {group:'Éducation & connaissances',items:[
    ['🎓','Diplôme'],['📚','Bibliothèque'],['📖','Lecture'],['✏️','Écrire'],['🧠','Comprendre'],['💡','Apprendre'],['🔬','Science'],['🧪','Expérience'],
    ['📐','Géométrie'],['🧮','Calcul'],['🌍','Géographie'],['🗣️','Langue'],['🎵','Musique'],['🎨','Arts'],['💻','Informatique'],['🏫','École'],
    ['🧑‍🏫','Cours'],['🧑‍🎓','Étudiant'],['✅','Acquis'],['❓','Question'],['🔎','Recherche'],['📌','Mémo'],['⭐','Important'],['🏅','Réussite']
  ]},
  {group:'Créativité & design',items:[
    ['🎨','Palette'],['🖌️','Pinceau'],['✏️','Crayon'],['🖍️','Couleur'],['📐','Design'],['🧵','Création'],['🪄','Magie'],['✨','Inspiration'],
    ['💡','Concept'],['🧩','Assembler'],['🎭','Expression'],['🎬','Vidéo'],['📷','Photo'],['🎵','Musique'],['🌈','Couleurs'],['💎','Idée forte'],
    ['🔥','Énergie'],['⚡','Éclair'],['🌟','Briller'],['🌀','Mouvement'],['🔺','Forme'],['🔵','Cercle'],['🟩','Bloc'],['🧿','Visuel']
  ]},
  {group:'Statuts & indicateurs',items:[
    ['🟢','OK'],['🟡','Attention'],['🔴','Urgent'],['⚪','Neutre'],['✅','Fait'],['☑️','Vérifié'],['❌','Erreur'],['⚠️','Alerte'],
    ['🚫','Bloqué'],['⏳','En attente'],['🔄','En cours'],['🆕','Nouveau'],['⭐','Prioritaire'],['🔥','Très important'],['💤','En pause'],['🏁','Terminé'],
    ['⬆️','Hausse'],['⬇️','Baisse'],['➡️','Stable'],['📈','Progrès'],['📉','Recul'],['➕','Ajouter'],['➖','Réduire'],['❗','Important']
  ]}
);

let iconPickerObject=null;

function closeIconPicker(){
  const panel=document.getElementById('iconPicker');
  if(panel) panel.classList.remove('open');
  iconPickerObject=null;
  freeIconPickerMode=false;
  requestAnimationFrame(renderFreeIcons);
}

function refreshFreeIconsImmediately(){
  // Safari peut différer le repaint quand le panneau d'icônes se ferme dans le même clic.
  // On force d'abord le rendu, puis un reflow et deux frames de repaint.
  renderFreeIcons();
  try{ void freeIconLayer?.offsetHeight; }catch(_){ }
  requestAnimationFrame(()=>{
    renderFreeIcons();
    try{ void freeIconLayer?.offsetHeight; }catch(_){ }
    requestAnimationFrame(()=>renderFreeIcons());
  });
}


const FRENCH_ICON_TERMS = {
  'idee':'idea lightbulb concept','idée':'idea lightbulb concept','idees':'ideas lightbulb concept','idées':'ideas lightbulb concept',
  'projet':'project planning roadmap','objectif':'target goal bullseye','but':'target goal bullseye','strategie':'strategy chess plan','stratégie':'strategy chess plan',
  'priorite':'priority star flag','priorité':'priority star flag','important':'important star alert','urgence':'urgent alert warning',
  'travail':'work briefcase business','bureau':'office desk work','entreprise':'business building company','equipe':'team users people','équipe':'team users people',
  'reunion':'meeting users calendar','réunion':'meeting users calendar','tache':'task checklist check','tâche':'task checklist check','planning':'calendar schedule planning',
  'organisation':'organization hierarchy network','organisationnel':'organization hierarchy','processus':'workflow process arrows','etape':'step route','étape':'step route',
  'sante':'health medical heart pulse','santé':'health medical heart pulse','medecin':'doctor medical stethoscope','médecin':'doctor medical stethoscope','hopital':'hospital medical','hôpital':'hospital medical',
  'coeur':'heart love favorite','cœur':'heart love favorite','amour':'love heart','famille':'family people home','couple':'couple love users','ami':'friends users people','amis':'friends users people',
  'voyage':'travel trip suitcase map','avion':'airplane plane travel','train':'train railway transport','voiture':'car transport','hotel':'hotel bed travel','hôtel':'hotel bed travel','vacances':'vacation beach travel',
  'argent':'money cash finance','finance':'finance chart money','budget':'budget wallet calculator','banque':'bank finance building','epargne':'savings piggy bank','épargne':'savings piggy bank','prix':'price tag money','achat':'shopping cart bag',
  'maison':'home house','appartement':'apartment building home','jardin':'garden plant leaf','bricolage':'tools hammer wrench','travaux':'construction tools hammer',
  'telephone':'phone smartphone mobile','téléphone':'phone smartphone mobile','ordinateur':'computer laptop monitor','internet':'internet globe wifi','wifi':'wifi network','mail':'email envelope mail','message':'message chat bubble','document':'document file text','dossier':'folder files',
  'calendrier':'calendar date','date':'calendar date','heure':'clock time','temps':'clock time hourglass','alerte':'warning alert bell','danger':'warning danger triangle','validation':'check approval verified','ok':'check circle',
  'vote':'vote ballot box','sondage':'poll chart vote','choix':'choice select arrows','decision':'decision choice signpost','décision':'decision choice signpost','pour':'thumbs up like','contre':'thumbs down dislike',
  'ecole':'school education graduation','école':'school education graduation','formation':'education learning graduation','livre':'book education reading','apprendre':'learning book brain','cerveau':'brain mind','memoire':'memory brain','mémoire':'memory brain',
  'sport':'sport fitness dumbbell','marche':'walking person','course':'running person','velo':'bicycle bike','vélo':'bicycle bike','natation':'swimming pool','musculation':'dumbbell fitness',
  'repas':'food meal utensils','restaurant':'restaurant food fork knife','cafe':'coffee cup','café':'coffee cup','musique':'music note','photo':'camera photo image','video':'video camera play','vidéo':'video camera play',
  'nature':'nature leaf tree','arbre':'tree nature','fleur':'flower nature','soleil':'sun weather','pluie':'rain cloud weather','mer':'sea waves water','montagne':'mountain hiking',
  'idee centrale':'mind map hub idea','carte mentale':'mind map hierarchy nodes','branche':'branch tree fork','lien':'link chain','connexion':'link network connection',
  'homme':'man person user','femme':'woman person user','personne':'person user account','enfant':'child kid person','groupe':'group users people',
  'emotion':'emotion face smile','émotion':'emotion face smile','joie':'smile happy face','triste':'sad face','colere':'angry face','colère':'angry face','peur':'fear face alert','stress':'stress brain alert',
  'amélioration':'improvement trending up','amelioration':'improvement trending up','croissance':'growth trending up chart','baisse':'trending down chart','résultat':'result chart check','resultat':'result chart check'
};

function normalizeFrenchIconQuery(value){
  const source=String(value||'').trim().toLowerCase();
  if(!source) return '';
  const ascii=source.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const exact=FRENCH_ICON_TERMS[source] || FRENCH_ICON_TERMS[ascii];
  const words=ascii.split(/[^a-z0-9]+/).filter(Boolean);
  const translated=[];
  if(exact) translated.push(exact);
  for(const word of words){
    const direct=FRENCH_ICON_TERMS[word];
    if(direct) translated.push(direct);
    else translated.push(word);
  }
  return [...new Set(translated.join(' ').split(/\s+/).filter(Boolean))].join(' ');
}

const ICON_QUERY_EXPANSIONS = {
  'sante':['health medical','doctor hospital','heart pulse medical','wellness care'],
  'santé':['health medical','doctor hospital','heart pulse medical','wellness care'],
  'objectif':['target goal','bullseye objective','goal success','target achievement'],
  'projet':['project roadmap','plan strategy','planning workflow'],
  'travail':['work business','office briefcase','team company'],
  'famille':['family people','home parenting','group users'],
  'amour':['love heart','romance affection','couple relationship'],
  'voyage':['travel trip','airplane suitcase','map vacation'],
  'maison':['home house','apartment building','interior property'],
  'argent':['money finance','cash wallet','budget bank'],
  'budget':['budget finance','wallet calculator','accounting money'],
  'sport':['sport fitness','dumbbell exercise','running health'],
  'idee':['idea lightbulb','brain concept','creative inspiration'],
  'idée':['idea lightbulb','brain concept','creative inspiration'],
  'temps':['time clock','calendar schedule','hour timer'],
  'calendrier':['calendar schedule','date planner'],
  'nature':['nature leaf','tree outdoor','flower eco'],
  'repas':['food meal','restaurant utensils','cooking kitchen'],
  'ecole':['school education','book learning','graduation study'],
  'école':['school education','book learning','graduation study'],
  'technologie':['technology laptop','computer digital','internet device'],
  'stress':['stress alert','mind worry','tension anxiety'],
  'securite':['security shield','protection lock','safety secure'],
  'sécurité':['security shield','protection lock','safety secure']
};

function collectExpandedQueryTerms(value){
  const baseTerms=[...new Set(iconSearchTerms(value))];
  const expanded=[];
  for(const term of baseTerms){
    if(ICON_QUERY_EXPANSIONS[term]) expanded.push(...ICON_QUERY_EXPANSIONS[term]);
  }
  return [...new Set(expanded.map(v=>String(v).trim()).filter(Boolean))];
}

function buildFrenchIconQueries(value){
  const source=String(value||'').trim().toLowerCase();
  if(!source) return [];
  const ascii=source.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const translated=normalizeFrenchIconQuery(source);
  const translatedTerms=iconSearchTerms(translated);
  const baseQueries=[];
  const add=q=>{
    const cleaned=String(q||'').replace(/\s+/g,' ').trim();
    if(cleaned && !baseQueries.includes(cleaned)) baseQueries.push(cleaned);
  };

  add(source);
  add(ascii);
  add(translated);
  add(translatedTerms.slice(0,2).join(' '));
  add(translatedTerms.slice(0,3).join(' '));

  for(const extra of collectExpandedQueryTerms(source)) add(extra);
  for(const extra of collectExpandedQueryTerms(translated)) add(extra);

  const styleBases=[translatedTerms.slice(0,2).join(' '), translatedTerms.slice(0,3).join(' '), ascii]
    .map(v=>String(v||'').trim())
    .filter(Boolean);
  for(const base of styleBases){
    add(`${base} icon`);
    add(`${base} outline`);
    add(`${base} rounded`);
    add(`${base} symbol`);
  }

  return baseQueries.slice(0,12);
}

function scoreIconifyResult(iconName, frenchQuery){
  const [prefix,name='']=String(iconName||'').split(':');
  const preferred=['material-symbols','material-symbols-outlined','lucide','tabler','mdi','ph','solar','heroicons','carbon','fluent','fa6-solid','fa6-regular'];
  let score=0;
  const prefIndex=preferred.indexOf(prefix);
  if(prefIndex>=0) score += (preferred.length-prefIndex)*3;
  const terms=[...new Set([
    ...iconSearchTerms(frenchQuery),
    ...iconSearchTerms(normalizeFrenchIconQuery(frenchQuery))
  ])];
  const clean=name.toLowerCase();
  for(const term of terms){
    if(clean===term) score+=48;
    else if(clean.startsWith(term)) score+=28;
    else if(clean.includes(term)) score+=14;
  }
  if(/logo|brand|payment|flag/.test(clean)) score-=6;
  if(/outline|rounded|circle|square/.test(clean)) score+=2;
  return score;
}

function commonsLabel(title){
  return String(title||'')
    .replace(/^File:/i,'')
    .replace(/\.(svg|png|jpe?g|webp)$/i,'')
    .replace(/[_-]+/g,' ')
    .trim();
}

function addFreeIconData({glyph='',iconUrl=''}){
  state.freeIcons = Array.isArray(state.freeIcons) ? state.freeIcons : [];
  const id=uid();
  state.freeIcons.push({id,glyph,iconUrl,x:.82,y:.18,size:72,rotation:0,flipH:false,flipV:false,keepBg:false,removeBg:!!iconUrl,layer:'back'});
  activeFreeIconId=id;
  save();
  closeIconPicker();
  render();
  renderFreeIcons();
  requestAnimationFrame(renderFreeIcons);
}

function usePickedImage(targetObject,dataUrl){
  if(targetObject){
    targetObject.iconUrl=dataUrl;
    delete targetObject.iconGlyph;
    if(!targetObject.iconMode) targetObject.iconMode='both';
    save(); closeIconPicker(); render();
  }else{
    addFreeIconData({iconUrl:dataUrl});
  }
}

function compressPersonalImage(file,callback){
  if(!file || !file.type.startsWith('image/')) return;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const max=640;
      const ratio=Math.min(1,max/Math.max(img.width||1,img.height||1));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.width*ratio));
      canvas.height=Math.max(1,Math.round(img.height*ratio));
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      let dataUrl;
      try{ dataUrl=canvas.toDataURL('image/png'); }
      catch(_){ dataUrl=reader.result; }
      callback(dataUrl);
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}



function normalizeIconSearchText(value){
  return String(value||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function iconSearchTerms(value){
  return normalizeIconSearchText(value).split(/\s+/).filter(Boolean);
}

function buildLocalIconIndex(){
  const entries=[];
  for(const section of MINDMAP_ICONS){
    const group=String(section.group||'').trim();
    for(const [glyph,label] of (section.items||[])){
      const labelText=String(label||'').trim();
      const haystackParts=[group,labelText,normalizeFrenchIconQuery(labelText),normalizeFrenchIconQuery(group)];
      const haystack=normalizeIconSearchText(haystackParts.join(' '));
      entries.push({glyph,label:labelText,group,haystack});
    }
  }
  return entries;
}

function scoreLocalIcon(entry,query){
  const raw=String(query||'').trim();
  if(!raw) return 0;
  const qNorm=normalizeIconSearchText(raw);
  if(!qNorm) return 0;
  const qTerms=iconSearchTerms(raw);
  const labelNorm=normalizeIconSearchText(entry.label);
  const groupNorm=normalizeIconSearchText(entry.group);
  let score=0;

  if(labelNorm===qNorm) score+=180;
  if(groupNorm===qNorm) score+=150;
  if(labelNorm.startsWith(qNorm)) score+=110;
  if(groupNorm.startsWith(qNorm)) score+=90;
  if(entry.haystack.includes(qNorm)) score+=70;

  for(const term of qTerms){
    if(labelNorm===term) score+=80;
    else if(labelNorm.startsWith(term)) score+=42;
    else if(labelNorm.includes(term)) score+=24;

    if(groupNorm===term) score+=60;
    else if(groupNorm.startsWith(term)) score+=26;
    else if(groupNorm.includes(term)) score+=14;

    if(entry.haystack.includes(term)) score+=9;
  }

  return score;
}

function createLocalIconButton(entry,targetObject){
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='icon-choice';
  btn.innerHTML=`<span class="icon-choice-glyph">${entry.glyph}</span><span>${entry.label}</span>`;
  btn.title=`${entry.label} · ${entry.group}`;
  if(targetObject.iconGlyph===entry.glyph) btn.classList.add('selected');
  btn.addEventListener('click',()=>{
    targetObject.iconGlyph=entry.glyph;
    delete targetObject.iconUrl;
    if(!targetObject.iconMode) targetObject.iconMode='both';
    save(); closeIconPicker(); render();
  });
  return btn;
}

function appendLocalIconSearch(grid,targetObject){
  const title=document.createElement('div');
  title.className='icon-picker-section-title local-icon-search-title';
  title.textContent='Recherche dans les icônes';
  grid.appendChild(title);

  const box=document.createElement('div');
  box.className='local-icon-search';
  box.innerHTML=`
    <div class="local-icon-search-row">
      <input type="search" class="local-icon-input" placeholder="Rechercher : santé, objectif, amour…" aria-label="Rechercher dans les icônes intégrées">
      <button type="button" class="local-icon-clear" aria-label="Effacer la recherche">×</button>
    </div>
    <div class="local-icon-status">La recherche fonctionne aussi avec les mots français.</div>
    <div class="local-icon-results"></div>`;
  grid.appendChild(box);

  const input=box.querySelector('.local-icon-input');
  const clearBtn=box.querySelector('.local-icon-clear');
  const status=box.querySelector('.local-icon-status');
  const results=box.querySelector('.local-icon-results');
  const localIndex=buildLocalIconIndex();

  const renderMatches=()=>{
    const q=input.value.trim();
    results.innerHTML='';
    if(!q){
      box.classList.remove('has-results');
      status.textContent='La recherche fonctionne aussi avec les mots français.';
      clearBtn.disabled=true;
      return;
    }
    clearBtn.disabled=false;
    const matches=localIndex
      .map(entry=>({entry,score:scoreLocalIcon(entry,q)}))
      .filter(item=>item.score>0)
      .sort((a,b)=>b.score-a.score || a.entry.label.localeCompare(b.entry.label,'fr'))
      .slice(0,20);

    if(!matches.length){
      box.classList.remove('has-results');
      status.textContent=`Aucune icône intégrée trouvée pour « ${q} ». Tu peux essayer la recherche Internet juste en dessous.`;
      return;
    }

    box.classList.add('has-results');
    status.textContent=`${matches.length} icône${matches.length>1?'s':''} intégrée${matches.length>1?'s':''} trouvée${matches.length>1?'s':''} pour « ${q} »`;
    for(const item of matches){
      results.appendChild(createLocalIconButton(item.entry,targetObject));
    }
  };

  input.addEventListener('input',renderMatches);
  input.addEventListener('search',renderMatches);
  input.addEventListener('keydown',e=>{ if(e.key==='Escape'){ input.value=''; renderMatches(); } });
  clearBtn.addEventListener('click',()=>{ input.value=''; renderMatches(); input.focus(); });
  renderMatches();
}

function appendExternalIconTools(grid,targetObject=null){
  const title=document.createElement('div');
  title.className='icon-picker-section-title external-icon-title';
  title.textContent='Mes images & recherche Internet';
  grid.appendChild(title);

  const tools=document.createElement('div');
  tools.className='external-icon-tools';

  const upload=document.createElement('button');
  upload.type='button'; upload.className='external-icon-upload';
  upload.innerHTML='<span>🖼️</span><strong>Image perso</strong><small>Depuis votre appareil</small>';
  const input=document.createElement('input');
  input.type='file'; input.accept='image/*'; input.hidden=true;
  upload.addEventListener('click',()=>input.click());
  input.addEventListener('change',()=>{
    const file=input.files?.[0];
    if(file) compressPersonalImage(file,data=>usePickedImage(targetObject,data));
  });
  tools.append(upload,input);

  const searchBox=document.createElement('div');
  searchBox.className='internet-icon-search';
  searchBox.innerHTML=`
    <div class="internet-icon-search-row">
      <input type="search" class="internet-icon-input" placeholder="Rechercher en français : santé, maison, voyage…" aria-label="Rechercher des icônes en français sur Internet">
      <button type="button" class="internet-icon-button">Rechercher</button>
    </div>
    <small>Recherche en français · icônes SVG transparentes</small>
    <div class="internet-icon-status"></div>
    <div class="internet-icon-results"></div>`;
  tools.appendChild(searchBox);
  grid.appendChild(tools);

  const searchInput=searchBox.querySelector('.internet-icon-input');
  const searchBtn=searchBox.querySelector('.internet-icon-button');
  const status=searchBox.querySelector('.internet-icon-status');
  const results=searchBox.querySelector('.internet-icon-results');

  const runSearch=async()=>{
    const q=searchInput.value.trim();
    if(!q) return;
    const queries=buildFrenchIconQueries(q);
    searchBtn.disabled=true;
    status.textContent=`Recherche d’icônes pour « ${q} » dans une base élargie…`;
    results.innerHTML='';
    try{
      const found=[];
      for(const query of queries){
        const params=new URLSearchParams({query,limit:'96'});
        const response=await fetch(`https://api.iconify.design/search?${params.toString()}`);
        if(!response.ok) continue;
        const data=await response.json();
        for(const icon of (data?.icons||[])) if(!found.includes(icon)) found.push(icon);
        if(found.length>=240) break;
      }

      const icons=found
        .sort((a,b)=>scoreIconifyResult(b,q)-scoreIconifyResult(a,q))
        .slice(0,72);

      status.textContent=icons.length
        ? `${icons.length} icônes trouvées pour « ${q} » · base étendue et recherche interprétée en français`
        : `Aucune icône Internet trouvée pour « ${q} ». Essaie un synonyme ou regarde les icônes intégrées juste au-dessus.`;

      for(const iconName of icons){
        const [prefix,name]=String(iconName).split(':');
        if(!prefix||!name) continue;
        const url=`https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg?height=128`;
        const b=document.createElement('button');
        b.type='button';
        b.className='internet-icon-result';
        b.title=`${q} · ${name.replace(/[-_]+/g,' ')} · ${prefix}`;
        const img=document.createElement('img');
        img.src=url;
        img.alt='';
        img.loading='lazy';
        img.draggable=false;
        const label=document.createElement('span');
        label.textContent=name.replace(/[-_]+/g,' ');
        const meta=document.createElement('small');
        meta.textContent=prefix;
        b.append(img,label,meta);
        b.addEventListener('click',()=>usePickedImage(targetObject,url));
        results.appendChild(b);
      }
    }catch(_){
      status.textContent='Recherche indisponible. Vérifiez la connexion Internet.';
    }finally{
      searchBtn.disabled=false;
    }
  };
  searchBtn.addEventListener('click',runSearch);
  searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runSearch();}});
}

function chooseIcon(object){
  iconPickerObject=object;
  const panel=document.getElementById('iconPicker');
  const grid=document.getElementById('iconPickerGrid');
  if(!panel||!grid) return;
  grid.innerHTML='';

  const modeTitle=document.createElement('div');
  modeTitle.className='icon-picker-section-title icon-mode-title';
  modeTitle.textContent='Affichage';
  grid.appendChild(modeTitle);

  const textBtn=document.createElement('button');
  textBtn.type='button';
  textBtn.className='icon-choice icon-choice-text';
  if(!object.iconGlyph && !object.iconUrl) textBtn.classList.add('selected');
  textBtn.innerHTML='<span class="icon-choice-glyph">T</span><span>Texte seul</span>';
  textBtn.title='Afficher uniquement le texte';
  textBtn.addEventListener('click',()=>{
    delete object.iconGlyph;
    delete object.iconUrl;
    delete object.iconMode;
    save(); closeIconPicker(); render();
  });
  grid.appendChild(textBtn);

  const iconOnlyBtn=document.createElement('button');
  iconOnlyBtn.type='button';
  iconOnlyBtn.className='icon-choice icon-mode-choice';
  if((object.iconGlyph||object.iconUrl) && object.iconMode==='icon') iconOnlyBtn.classList.add('selected');
  iconOnlyBtn.innerHTML='<span class="icon-choice-glyph">◉</span><span>Icône seule</span>';
  iconOnlyBtn.title='Afficher uniquement l’icône choisie';
  iconOnlyBtn.addEventListener('click',()=>{
    object.iconMode='icon';
    save(); closeIconPicker(); render();
  });
  grid.appendChild(iconOnlyBtn);

  const bothBtn=document.createElement('button');
  bothBtn.type='button';
  bothBtn.className='icon-choice icon-mode-choice';
  if((object.iconGlyph||object.iconUrl) && object.iconMode!=='icon') bothBtn.classList.add('selected');
  bothBtn.innerHTML='<span class="icon-choice-glyph">◉T</span><span>Icône + texte</span>';
  bothBtn.title='Afficher l’icône à côté du texte';
  bothBtn.addEventListener('click',()=>{
    object.iconMode='both';
    save(); closeIconPicker(); render();
  });
  grid.appendChild(bothBtn);

  appendLocalIconSearch(grid,object);
  appendExternalIconTools(grid,object);

  for(const section of MINDMAP_ICONS){
    const title=document.createElement('div');
    title.className='icon-picker-section-title';
    title.textContent=section.group;
    grid.appendChild(title);
    for(const [glyph,label] of section.items){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='icon-choice';
      if(object.iconGlyph===glyph) btn.classList.add('selected');
      btn.innerHTML=`<span class="icon-choice-glyph">${glyph}</span><span>${label}</span>`;
      btn.title=label;
      btn.addEventListener('click',()=>{
        object.iconGlyph=glyph;
        delete object.iconUrl;
        // Par défaut, une nouvelle icône apparaît à côté du texte.
        if(!object.iconMode) object.iconMode='both';
        save(); closeIconPicker(); render();
      });
      grid.appendChild(btn);
    }
  }

  panel.classList.add('open');
}


let freeIconPickerMode=false;
let freeIconDrag=null;
let freeIconResizePreviewId=null;
let activeFreeIconId=null;
const freeIconImageCache=new Map();

function showResizePreview(icon,size){
  if(!freeIconResizePreview) return;
  const rect=mindmap.getBoundingClientRect();
  freeIconResizePreview.style.left=`${clamp(icon.x,.03,.97)*rect.width}px`;
  freeIconResizePreview.style.top=`${clamp(icon.y,.04,.96)*rect.height}px`;
  freeIconResizePreview.style.width=`${size}px`;
  freeIconResizePreview.style.height=`${size}px`;
  freeIconResizePreview.classList.add('visible');
}
function hideResizePreview(){
  freeIconResizePreview?.classList.remove('visible');
}
function markFreeIconResizing(id,active){
  freeIconResizePreviewId = active ? id : null;
}
function positionFreeIconElement(el, icon, rect){
  el.style.left=`${clamp(icon.x,.03,.97)*rect.width}px`;
  el.style.top=`${clamp(icon.y,.04,.96)*rect.height}px`;
  el.style.width=`${icon.size}px`;
  el.style.height=`${icon.size}px`;
}
function setActiveFreeIcon(id){
  activeFreeIconId = id;
}

function clearBrowserSelection(){
  try{ window.getSelection()?.removeAllRanges(); }catch(_){ }
  try{ document.getSelection?.()?.removeAllRanges?.(); }catch(_){ }
  try{ if(window.getSelection && window.getSelection().empty) window.getSelection().empty(); }catch(_){ }
  try{
    const active=document.activeElement;
    if(active && typeof active.blur==='function' && active!==document.body) active.blur();
  }catch(_){ }
}

function beginFreeIconManipulation(){
  document.documentElement.classList.add('free-icon-manipulation');
  clearBrowserSelection();
  try{ document.activeElement?.blur?.(); }catch(_){ }
}
function endFreeIconManipulation(){
  document.documentElement.classList.remove('free-icon-manipulation');
  clearBrowserSelection();
  try{ document.activeElement?.blur?.(); }catch(_){ }
  requestAnimationFrame(()=>{
    clearBrowserSelection();
    requestAnimationFrame(clearBrowserSelection);
  });
}

// Empêche Safari/Chrome de transformer un redimensionnement d'icône en sélection de contenu.
document.addEventListener('selectionchange',()=>{
  if(document.documentElement.classList.contains('free-icon-manipulation') || document.body.classList.contains('image-manipulation-active') || document.body.classList.contains('dragging-free-icon') || document.body.classList.contains('preview-resize-active')){
    clearBrowserSelection();
  }
});
window.addEventListener('mousemove',()=>{ if(document.documentElement.classList.contains('free-icon-manipulation')) clearBrowserSelection(); }, true);
window.addEventListener('touchmove',()=>{ if(document.documentElement.classList.contains('free-icon-manipulation')) clearBrowserSelection(); }, {passive:false, capture:true});
try{ freeIconLayer=ensureFreeIconCanvas(); freeIconFrontLayer=ensureFreeIconFrontCanvas(); }catch(err){ console.error('Initialisation icônes',err); }
if(freeIconOverlayLayer){
  freeIconOverlayLayer.addEventListener('selectstart',e=>e.preventDefault());
  freeIconOverlayLayer.addEventListener('dragstart',e=>e.preventDefault());
}
function clearFreeIconHighlight(){
  clearBrowserSelection();
  document.querySelectorAll('.free-icon-item.active').forEach(el=>el.classList.remove('active'));
  // Safari/iOS peut conserver une surbrillance pendant une frame après le pointerup.
  requestAnimationFrame(()=>clearBrowserSelection());
  setTimeout(clearBrowserSelection,0);
  setTimeout(clearBrowserSelection,80);
}


function openFreeIconPicker(){
  freeIconPickerMode=true;
  iconPickerObject=null;
  const panel=document.getElementById('iconPicker');
  const grid=document.getElementById('iconPickerGrid');
  if(!panel||!grid) return;
  grid.innerHTML='';

  const title=document.createElement('div');
  title.className='icon-picker-section-title icon-mode-title';
  title.textContent='Ajouter une icône libre';
  grid.appendChild(title);

  appendExternalIconTools(grid,null);

  for(const section of MINDMAP_ICONS){
    const sectionTitle=document.createElement('div');
    sectionTitle.className='icon-picker-section-title';
    sectionTitle.textContent=section.group;
    grid.appendChild(sectionTitle);
    for(const [glyph,label] of section.items){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='icon-choice';
      btn.innerHTML=`<span class="icon-choice-glyph">${glyph}</span><span>${label}</span>`;
      btn.title=`Ajouter : ${label}`;
      btn.addEventListener('click',()=>{
        state.freeIcons = Array.isArray(state.freeIcons) ? state.freeIcons : [];
        const id=uid();
        state.freeIcons.push({id,glyph,iconUrl:'',x:.82,y:.18,size:72,rotation:0,flipH:false,flipV:false,keepBg:false,removeBg:false,layer:'back'});
        activeFreeIconId=id;
        save();
        closeIconPicker();
        render();
        refreshFreeIconsImmediately();
      });
      grid.appendChild(btn);
    }
  }
  panel.classList.add('open');
}

// ============================================================
// 7. ICÔNES LIBRES : DESSIN, DÉTOURAGE ET INTERACTIONS
// ============================================================
function drawIconImageToCanvas(img, visual, icon){
  const ctx=visual.getContext('2d', {willReadFrequently:true});
  if(!ctx) return;
  const px=visual.width, py=visual.height;
  ctx.clearRect(0,0,px,py);
  const iw=img.naturalWidth||img.width||1;
  const ih=img.naturalHeight||img.height||1;
  const ratio=Math.min(px/iw,py/ih);
  const dw=iw*ratio, dh=ih*ratio;
  const ox=(px-dw)/2, oy=(py-dh)/2;
  ctx.drawImage(img,ox,oy,dw,dh);

  if(icon.removeBg===false) return;
  try{
    let data=ctx.getImageData(0,0,px,py);
    let arr=data.data;

    const border=[];
    const step=Math.max(1,Math.round(Math.min(px,py)/40));
    const add=(x,y)=>{
      const i=(y*px+x)*4;
      if(arr[i+3]>80) border.push([arr[i],arr[i+1],arr[i+2]]);
    };
    for(let x=0;x<px;x+=step){ add(x,0); add(x,py-1); }
    for(let y=0;y<py;y+=step){ add(0,y); add(px-1,y); }
    if(!border.length) return;
    const bg=border.reduce((a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]],[0,0,0]).map(v=>v/border.length);
    const hard=58, soft=138;
    const seen=new Uint8Array(px*py);
    const qx=new Int32Array(px*py);
    const qy=new Int32Array(px*py);
    let head=0, tail=0;
    const distAt=(x,y)=>{
      const i=(y*px+x)*4;
      return Math.hypot(arr[i]-bg[0],arr[i+1]-bg[1],arr[i+2]-bg[2]);
    };
    const enqueue=(x,y)=>{
      const idx=y*px+x;
      if(seen[idx]) return;
      const i=idx*4;
      if(arr[i+3]===0) return;
      if(distAt(x,y)>soft) return;
      seen[idx]=1;
      qx[tail]=x; qy[tail]=y; tail++;
    };
    for(let x=0;x<px;x++){ enqueue(x,0); enqueue(x,py-1); }
    for(let y=0;y<py;y++){ enqueue(0,y); enqueue(px-1,y); }
    while(head<tail){
      const x=qx[head], y=qy[head]; head++;
      const idx=y*px+x, i=idx*4;
      const d=distAt(x,y);
      if(d<=hard) arr[i+3]=0;
      else arr[i+3]=Math.round(arr[i+3]*((d-hard)/(soft-hard)));
      if(x>0) enqueue(x-1,y);
      if(x<px-1) enqueue(x+1,y);
      if(y>0) enqueue(x,y-1);
      if(y<py-1) enqueue(x,y+1);
    }
    ctx.putImageData(data,0,0);

    // recadrage pour enlever le rectangle résiduel
    data=ctx.getImageData(0,0,px,py);
    arr=data.data;
    let minX=px, minY=py, maxX=-1, maxY=-1;
    for(let y=0;y<py;y++){
      for(let x=0;x<px;x++){
        const a=arr[(y*px+x)*4+3];
        if(a>16){
          if(x<minX) minX=x;
          if(y<minY) minY=y;
          if(x>maxX) maxX=x;
          if(y>maxY) maxY=y;
        }
      }
    }
    if(maxX<0 || maxY<0) return;
    const bw=maxX-minX+1, bh=maxY-minY+1;
    if(bw<px || bh<py){
      const off=document.createElement('canvas');
      off.width=bw; off.height=bh;
      off.getContext('2d').putImageData(ctx.getImageData(minX,minY,bw,bh),0,0);
      ctx.clearRect(0,0,px,py);
      const margin=Math.round(Math.min(px,py)*0.04);
      const fit=Math.min((px-margin*2)/bw,(py-margin*2)/bh);
      const fw=bw*fit, fh=bh*fit;
      ctx.drawImage(off,(px-fw)/2,(py-fh)/2,fw,fh);
    }
  }catch(_){
    // si la source empêche la lecture (CORS), on garde simplement l'image d'origine.
  }
}

function drawFreeIconGlyph(ctx, icon, x, y, size){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate((Number(icon.rotation)||0)*Math.PI/180);
  ctx.scale(icon.flipH?-1:1,icon.flipV?-1:1);
  ctx.font=`${Math.max(18,size*.82)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(icon.glyph||'💡',0,0);
  ctx.restore();
}

function drawFreeIconImage(ctx, icon, img, x, y, size, dpr){
  const temp=document.createElement('canvas');
  const px=Math.max(32,Math.round(size*dpr));
  temp.width=px; temp.height=px;
  drawIconImageToCanvas(img,temp,icon);
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate((Number(icon.rotation)||0)*Math.PI/180);
  ctx.scale(icon.flipH?-1:1,icon.flipV?-1:1);
  ctx.drawImage(temp,-size/2,-size/2,size,size);
  ctx.restore();
}

function ensureFreeIconImage(icon){
  if(!icon.iconUrl) return null;
  const cached=freeIconImageCache.get(icon.iconUrl);
  if(cached?.status==='loaded') return cached.img;
  if(cached?.status==='loading') return null;
  const img=new Image();
  img.decoding='async';
  img.crossOrigin='anonymous';
  freeIconImageCache.set(icon.iconUrl,{status:'loading',img});
  img.onload=()=>{
    freeIconImageCache.set(icon.iconUrl,{status:'loaded',img});
    renderFreeIcons();
  };
  img.onerror=()=>{
    const fallback=new Image();
    fallback.onload=()=>{
      freeIconImageCache.set(icon.iconUrl,{status:'loaded',img:fallback});
      renderFreeIcons();
    };
    fallback.onerror=()=>freeIconImageCache.set(icon.iconUrl,{status:'error',img:null});
    fallback.src=icon.iconUrl;
  };
  img.src=icon.iconUrl;
  return null;
}

function prepareFreeIconCanvas(canvas, rect, dpr){
  if(!canvas) return null;
  const targetW=Math.max(1,Math.round(rect.width*dpr));
  const targetH=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==targetW) canvas.width=targetW;
  if(canvas.height!==targetH) canvas.height=targetH;
  canvas.style.width=`${rect.width}px`;
  canvas.style.height=`${rect.height}px`;
  const ctx=canvas.getContext('2d');
  if(!ctx) return null;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,rect.width,rect.height);
  return ctx;
}

function drawFreeIconOnContext(ctx, icon, rect, dpr){
  if(!ctx) return;
  const x=clamp(icon.x,.03,.97)*rect.width;
  const y=clamp(icon.y,.04,.96)*rect.height;
  const size=icon.size;
  if(icon.iconUrl){
    const img=ensureFreeIconImage(icon);
    if(img) drawFreeIconImage(ctx,icon,img,x,y,size,dpr);
  }else{
    drawFreeIconGlyph(ctx,icon,x,y,size);
  }
}

function redrawFreeIconCanvas(){
  freeIconLayer=ensureFreeIconCanvas();
  freeIconFrontLayer=ensureFreeIconFrontCanvas();
  if(!freeIconLayer || !freeIconFrontLayer) return;
  const rect=mindmap.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const backCtx=prepareFreeIconCanvas(freeIconLayer,rect,dpr);
  const frontCtx=prepareFreeIconCanvas(freeIconFrontLayer,rect,dpr);
  for(const icon of (state.freeIcons||[])){
    const ctx=icon.layer==='front' ? frontCtx : backCtx;
    drawFreeIconOnContext(ctx,icon,rect,dpr);
  }
}
function nearestBranchColorForIcon(icon, rect){
  // Le bouton de calque reprend la couleur de la branche la plus proche de
  // l'icone. S'il n'y en a pas a proximite, on garde le turquoise central.
  const x=clamp(icon.x,.03,.97)*rect.width;
  const y=clamp(icon.y,.04,.96)*rect.height;
  let bestColor='#24b8c7';
  let bestDistance=Infinity;
  const paths=[...svg.querySelectorAll('path[id^=\"main-\"],path[id^=\"child-\"]')]
    .filter(path=>!path.id.endsWith('-text') && path.getAttribute('stroke') && path.getAttribute('stroke')!=='none');
  for(const path of paths){
    let len=0;
    try{ len=path.getTotalLength(); }catch(_){ continue; }
    const steps=Math.max(8,Math.min(42,Math.ceil(len/12)));
    for(let i=0;i<=steps;i++){
      let p;
      try{ p=path.getPointAtLength(len*i/steps); }catch(_){ continue; }
      const d=Math.hypot(p.x-x,p.y-y);
      if(d<bestDistance){
        bestDistance=d;
        bestColor=path.getAttribute('stroke') || bestColor;
      }
    }
  }
  const maxDistance=Math.max(64,(Number(icon.size)||72)*.82);
  return bestDistance<=maxDistance ? bestColor : '#24b8c7';
}

function renderFreeIcons(){
  freeIconLayer=ensureFreeIconCanvas();
  freeIconFrontLayer=ensureFreeIconFrontCanvas();
  if(!freeIconLayer || !freeIconFrontLayer || !freeIconOverlayLayer) return;
  redrawFreeIconCanvas();
  const rect=mindmap.getBoundingClientRect();
  freeIconOverlayLayer.innerHTML='';

  for(const icon of (state.freeIcons||[])){
    const overlay=document.createElement('div');
    overlay.className='free-icon-overlay' + (activeFreeIconId===icon.id ? ' active' : '');
    overlay.dataset.id=icon.id;
    positionFreeIconElement(overlay,icon,rect);
    overlay.style.setProperty('--icon-accent',nearestBranchColorForIcon(icon,rect));

    const frame=document.createElement('div');
    frame.className='free-icon-select-frame';
    overlay.appendChild(frame);

    const hit=document.createElement('div');
    hit.className='free-icon-hit';
    hit.title='Cliquer et glisser pour déplacer cette icône';
    hit.addEventListener('pointerdown',e=>{
      if(e.button!==undefined && e.button!==0) return;
      e.preventDefault(); e.stopPropagation();
      beginFreeIconManipulation();
      setActiveFreeIcon(icon.id);
      overlay.classList.add('active');
      const mapRect=mindmap.getBoundingClientRect();
      freeIconDrag={
        type:'move',id:icon.id,
        offsetX:e.clientX-(mapRect.left+clamp(icon.x,.03,.97)*mapRect.width),
        offsetY:e.clientY-(mapRect.top+clamp(icon.y,.04,.96)*mapRect.height)
      };
      try{hit.setPointerCapture(e.pointerId)}catch(_){ }
    });
    overlay.appendChild(hit);

    const move=document.createElement('button');
    move.type='button'; move.className='free-icon-handle free-icon-move'; move.textContent='✥'; move.title='Déplacer';
    move.addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();beginFreeIconManipulation();setActiveFreeIcon(icon.id);
      const mapRect=mindmap.getBoundingClientRect();
      freeIconDrag={type:'move',id:icon.id,offsetX:e.clientX-(mapRect.left+clamp(icon.x,.03,.97)*mapRect.width),offsetY:e.clientY-(mapRect.top+clamp(icon.y,.04,.96)*mapRect.height)};
      overlay.classList.add('active');
      try{move.setPointerCapture(e.pointerId)}catch(_){ }
    });
    overlay.appendChild(move);

    const del=document.createElement('button');
    del.type='button';del.className='free-icon-delete';del.textContent='×';del.title='Supprimer cette icône';
    del.addEventListener('pointerdown',e=>e.stopPropagation());
    del.addEventListener('click',e=>{e.stopPropagation();state.freeIcons=state.freeIcons.filter(x=>x.id!==icon.id);if(activeFreeIconId===icon.id)activeFreeIconId=null;save();renderFreeIcons();});
    overlay.appendChild(del);

    const rotate=document.createElement('div');
    rotate.className='free-icon-rotate';rotate.title='Faire pivoter librement à 360°';rotate.textContent='↻';
    rotate.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();beginFreeIconManipulation();setActiveFreeIcon(icon.id);overlay.classList.add('active');const box=overlay.getBoundingClientRect();freeIconDrag={type:'rotate',id:icon.id,centerX:box.left+box.width/2,centerY:box.top+box.height/2};try{rotate.setPointerCapture(e.pointerId)}catch(_){ }});
    overlay.appendChild(rotate);

    const flipH=document.createElement('button');
    flipH.type='button';flipH.className='free-icon-flip free-icon-flip-h';flipH.textContent='↔';flipH.title='Miroir horizontal';
    flipH.addEventListener('pointerdown',e=>e.stopPropagation());
    flipH.addEventListener('click',e=>{e.stopPropagation();icon.flipH=!icon.flipH;setActiveFreeIcon(icon.id);save();renderFreeIcons();});
    overlay.appendChild(flipH);

    const flipV=document.createElement('button');
    flipV.type='button';flipV.className='free-icon-flip free-icon-flip-v';flipV.textContent='↕';flipV.title='Miroir vertical';
    flipV.addEventListener('pointerdown',e=>e.stopPropagation());
    flipV.addEventListener('click',e=>{e.stopPropagation();icon.flipV=!icon.flipV;setActiveFreeIcon(icon.id);save();renderFreeIcons();});
    overlay.appendChild(flipV);

    if(icon.iconUrl){
      const cut=document.createElement('button');
      cut.type='button';cut.className='free-icon-bg-toggle';cut.textContent='✂';cut.title=icon.removeBg===false?'Supprimer le fond de l’image':'Afficher le fond original';cut.classList.toggle('active',icon.removeBg!==false);
      cut.addEventListener('pointerdown',e=>e.stopPropagation());
      cut.addEventListener('click',e=>{e.stopPropagation();icon.keepBg=!icon.keepBg;icon.removeBg=!icon.keepBg;setActiveFreeIcon(icon.id);save();renderFreeIcons();});
      overlay.appendChild(cut);
    }

    const layerToggle=document.createElement('button');
    layerToggle.type='button';
    layerToggle.className='free-icon-layer-toggle';
    layerToggle.textContent=icon.layer==='front'?'↓':'↑';
    layerToggle.title=icon.layer==='front'?'Placer cette icône derrière les branches':'Placer cette icône devant les branches';
    layerToggle.setAttribute('aria-label',layerToggle.title);
    layerToggle.addEventListener('pointerdown',e=>e.stopPropagation());
    layerToggle.addEventListener('click',e=>{
      e.stopPropagation();
      icon.layer=icon.layer==='front'?'back':'front';
      setActiveFreeIcon(icon.id);
      save();
      renderFreeIcons();
    });
    overlay.appendChild(layerToggle);

    const resize=document.createElement('div');
    resize.className='free-icon-resize';resize.title='Redimensionner (maximum 300 × 300)';
    resize.addEventListener('mousedown',e=>e.preventDefault());
    resize.addEventListener('touchstart',e=>{if(e.cancelable)e.preventDefault();},{passive:false});
    resize.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();beginFreeIconManipulation();setActiveFreeIcon(icon.id);markFreeIconResizing(icon.id,true);freeIconDrag={type:'resize',id:icon.id,startClientX:e.clientX,startClientY:e.clientY,startSize:icon.size,previewSize:icon.size};overlay.classList.add('active');showResizePreview(icon,icon.size);try{resize.setPointerCapture(e.pointerId)}catch(_){ }});
    overlay.appendChild(resize);

    freeIconOverlayLayer.appendChild(overlay);
  }
}

function findFreeIconAt(clientX,clientY){
  const rect=mindmap.getBoundingClientRect();
  const x=clientX-rect.left,y=clientY-rect.top;
  const icons=[...(state.freeIcons||[])].reverse();
  return icons.find(icon=>{
    const cx=clamp(icon.x,.03,.97)*rect.width;
    const cy=clamp(icon.y,.04,.96)*rect.height;
    const h=icon.size/2;
    return x>=cx-h&&x<=cx+h&&y>=cy-h&&y<=cy+h;
  })||null;
}

function updateFreeIconDrag(e){
  if(!freeIconDrag) return;
  if(e.cancelable)e.preventDefault();
  clearBrowserSelection();
  const icon=(state.freeIcons||[]).find(x=>x.id===freeIconDrag.id);
  if(!icon)return;
  const rect=mindmap.getBoundingClientRect();
  if(freeIconDrag.type==='move'){
    const x=e.clientX-rect.left-freeIconDrag.offsetX;
    const y=e.clientY-rect.top-freeIconDrag.offsetY;
    const half=icon.size/2;
    icon.x=clamp(x,half,rect.width-half)/rect.width;
    icon.y=clamp(y,half,rect.height-half)/rect.height;
    redrawFreeIconCanvas();
    const overlayEl=freeIconOverlayLayer?.querySelector(`.free-icon-overlay[data-id="${icon.id}"]`);
    if(overlayEl) positionFreeIconElement(overlayEl,icon,rect);
  }else if(freeIconDrag.type==='resize'){
    const dx=e.clientX-freeIconDrag.startClientX,dy=e.clientY-freeIconDrag.startClientY;
    freeIconDrag.previewSize=clamp(freeIconDrag.startSize+Math.max(dx,dy),28,300);
    showResizePreview(icon,freeIconDrag.previewSize);
  }else if(freeIconDrag.type==='rotate'){
    const angle=Math.atan2(e.clientY-freeIconDrag.centerY,e.clientX-freeIconDrag.centerX)*180/Math.PI;
    icon.rotation=((angle+90)%360+360)%360;
    redrawFreeIconCanvas();
  }
}

function finishFreeIconDrag(){
  if(!freeIconDrag)return;
  const finished={...freeIconDrag};
  if(finished.type==='resize'){
    const icon=(state.freeIcons||[]).find(x=>x.id===finished.id);
    if(icon)icon.size=clamp(Number(finished.previewSize)||finished.startSize,28,300);
  }
  freeIconDrag=null;
  markFreeIconResizing(null,false);
  hideResizePreview();
  endFreeIconManipulation();
  renderFreeIcons();
  save();
}

function editTextFromMenu(object,color){
  const map=mindmap.getBoundingClientRect();
  editObjectText(object,map.width/2,map.height/2,color);
}

function svgEl(name,attrs={}){
  const el=document.createElementNS('http://www.w3.org/2000/svg',name);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
}

function getLayout(){
  const rect=mindmap.getBoundingClientRect();
  const cRect=centre.getBoundingClientRect();
  const points=Array(MAX_MAIN_BRANCHES).fill(null);
  const tablet=isTabletLike();
  const phone=isPhoneLike();

  // Répartition dynamique et équilibrée : la première branche part du haut-droite,
  // puis toutes les branches ouvertes se répartissent régulièrement dans le sens horaire.
  const active=[...state.branches].sort((a,b)=>OPENING_ORDER.indexOf(a.slot)-OPENING_ORDER.indexOf(b.slot));
  const n=Math.max(1,active.length);
  const startAngle=deg(-43);
  const step=(Math.PI*2)/n;
  const radiusX=phone ? clamp(rect.width*.29, 88, 165) : tablet ? clamp(rect.width*.24, 110, 215) : clamp(rect.width*.19,155,285);
  const radiusY=phone ? clamp(rect.height*.28, 82, 150) : tablet ? clamp(rect.height*.30, 100, 190) : clamp(rect.height*.31,150,260);
  const sideMargin=phone ? 54 : tablet ? 76 : 110;
  const topMargin=phone ? 42 : tablet ? 56 : 70;

  active.forEach((branch,rank)=>{
    const angle=startAngle+rank*step;
    const x=clamp(rect.width/2+Math.cos(angle)*radiusX,sideMargin,rect.width-sideMargin);
    const y=clamp(rect.height/2+Math.sin(angle)*radiusY,topMargin,rect.height-topMargin);
    const c=Math.cos(angle), s=Math.sin(angle);
    let side,axis,band;
    if(Math.abs(c)<.34){
      side=s<0?'top':'bottom';
      axis=s<0?'vertical-top':'vertical-bottom';
      const bandSpread=phone ? .19 : tablet ? .17 : .16;
      const centerX=x/rect.width;
      band=[clamp(centerX-bandSpread,.04,.76),clamp(centerX+bandSpread,.24,.96)];
    }else{
      side=c>=0?'right':'left';
      axis='horizontal';
      const bandSpread=phone ? .16 : tablet ? .145 : .13;
      const centerY=y/rect.height;
      band=[clamp(centerY-bandSpread,.035,.72),clamp(centerY+bandSpread,.28,.965)];
    }
    points[branch.slot]={
      index:branch.slot,
      rank,
      angle,
      fanAngle:angle,
      band,
      axis,
      side,
      x,y
    };
  });

  return {rect,cRect,points,tablet,phone};
}

function makeBezier(startX,startY,endX,endY,startAngle,endAngle,h1,h2){
  const c1x=startX+Math.cos(startAngle)*h1;
  const c1y=startY+Math.sin(startAngle)*h1;
  const c2x=endX-Math.cos(endAngle)*h2;
  const c2y=endY-Math.sin(endAngle)*h2;
  return {
    d:`M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`,
    reverse:`M ${endX} ${endY} C ${c2x} ${c2y}, ${c1x} ${c1y}, ${startX} ${startY}`
  };
}

function drawBranchPath({startX,startY,endX,endY,startAngle,endAngle,color,width,id,main=false,side='right',curveBias=0}){
  const dist=Math.hypot(endX-startX,endY-startY)||1;
  // Les ramifications secondaires suivent plus longtemps la direction du parent.
  // Les branches principales reçoivent en plus un décalage latéral progressif :
  // elles quittent la bulle en douceur puis s'incurvent comme une vraie branche d'arbre.
  const h1=main?dist*.52:dist*.56;
  const h2=main?dist*.30:dist*.18;
  let bez;
  if(main || Math.abs(curveBias) > 0.0001){
    // Même principe pour tous les niveaux : la courbe suit d'abord la direction
    // du parent, puis se déporte progressivement avant de rejoindre son extrémité.
    // C'est ce qui donne l'ouverture arborescente plutôt qu'un éventail trop raide.
    const bend=dist*curveBias;
    const n1x=-Math.sin(startAngle), n1y=Math.cos(startAngle);
    const n2x=-Math.sin(endAngle), n2y=Math.cos(endAngle);
    const c1x=startX+Math.cos(startAngle)*h1+n1x*bend;
    const c1y=startY+Math.sin(startAngle)*h1+n1y*bend;
    const c2x=endX-Math.cos(endAngle)*h2+n2x*bend*(main?.58:.72);
    const c2y=endY-Math.sin(endAngle)*h2+n2y*bend*(main?.58:.72);
    bez={
      d:`M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`,
      reverse:`M ${endX} ${endY} C ${c2x} ${c2y}, ${c1x} ${c1y}, ${startX} ${startY}`
    };
  }else{
    bez=makeBezier(startX,startY,endX,endY,startAngle,endAngle,h1,h2);
  }
  const hit=svgEl('path',{d:bez.d,class:'branch-hit','stroke-width':Math.max(30,width+22)});
  svg.appendChild(hit);
  if(main){
    svg.appendChild(svgEl('path',{d:bez.d,fill:'none',stroke:color,'stroke-width':width+3,'stroke-linecap':'round','stroke-linejoin':'round',opacity:'.10'}));
  }
  const visiblePath=svgEl('path',{id,d:bez.d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',class:main?'main-line':''});
  svg.appendChild(visiblePath);
  const textPathId=`${id}-text`;
  // Oriente automatiquement le chemin du texte selon la tangente REELLE de la
  // courbe a l'endroit ou le libelle est lu. C'est plus fiable qu'un simple
  // test gauche/droite quand une branche change fortement de direction.
  let reverseText = side==='left';
  try{
    const len=visiblePath.getTotalLength();
    const mid=main?.34:.50;
    const a=visiblePath.getPointAtLength(len*clamp(mid-.035,.02,.96));
    const b=visiblePath.getPointAtLength(len*clamp(mid+.035,.04,.98));
    const dx=b.x-a.x, dy=b.y-a.y;
    if(Math.abs(dx)>1.2) reverseText=dx<0;
    else reverseText=dy<0; // quasi vertical : lecture de haut en bas
  }catch(_){ }
  svg.appendChild(svgEl('path',{id:textPathId,d:reverseText?bez.reverse:bez.d,fill:'none',stroke:'none'}));
  return {hit,textPathId,path:visiblePath};
}

function baseTextSize(level){
  const vw=window.innerWidth/100;
  if(level===0) return clamp(VISUAL_SIZES.text.main.vw*vw,VISUAL_SIZES.text.main.min,VISUAL_SIZES.text.main.max);
  if(level===1) return clamp(VISUAL_SIZES.text.idea.vw*vw,VISUAL_SIZES.text.idea.min,VISUAL_SIZES.text.idea.max);
  return clamp(VISUAL_SIZES.text.subIdea.vw*vw,VISUAL_SIZES.text.subIdea.min,VISUAL_SIZES.text.subIdea.max);
}

function changeTextScale(object,delta,menuKey){
  object.textScale=clamp(Number(((Number(object.textScale)||1)+delta).toFixed(2)),.50,3.0);
  // Le rendu recrée le menu. On mémorise donc celui qui était ouvert afin de
  // le rouvrir immédiatement après le changement de taille.
  reopenMenuKey=menuKey || null;
  save();
  render();
}

function normalizeAngleDelta(angle){
  while(angle>Math.PI) angle-=Math.PI*2;
  while(angle<-Math.PI) angle+=Math.PI*2;
  return angle;
}

function computeAdaptiveLetterSpacing(pathEl,text,level,textScale=1){
  const content=String(text||'').replace(/\s+/g,' ').trim();
  const glyphCount=[...content].length;
  if(!pathEl || glyphCount<3) return null;
  try{
    const len=Number(pathEl.getTotalLength())||0;
    if(!Number.isFinite(len) || len<=0) return null;

    const samples=Math.max(5,Math.min(16,glyphCount));
    let totalTurn=0;
    let prevAngle=null;
    const spanStart=.12, spanEnd=.88;
    for(let i=0;i<samples;i++){
      const t=spanStart+((spanEnd-spanStart)*i)/Math.max(1,samples-1);
      const a=pathEl.getPointAtLength(len*Math.max(0,Math.min(.995,t-.018)));
      const b=pathEl.getPointAtLength(len*Math.max(.005,Math.min(1,t+.018)));
      const angle=Math.atan2(b.y-a.y,b.x-a.x);
      if(prevAngle!=null) totalTurn+=Math.abs(normalizeAngleDelta(angle-prevAngle));
      prevAngle=angle;
    }

    const turnDeg=totalTurn*180/Math.PI;
    const perGlyph=len/Math.max(glyphCount,1);
    const openness=clamp((perGlyph-9)/12,0,1);
    const scale=clamp(Number(textScale)||1,.55,2.6);

    const base=level===0 ? .18 : level===1 ? .14 : .10;
    const curveBoostRaw=level===0 ? .95 : level===1 ? .72 : .58;
    const curveBoost=clamp(turnDeg/95,0,1.15)*curveBoostRaw*(.55+.45*openness);
    const scaleBoost=(scale-1)*.10;
    const spacing=clamp(base+curveBoost+scaleBoost, .06, level===0?1.28:level===1?.98:.78);
    return `${spacing.toFixed(2)}px`;
  }catch(_){
    return null;
  }
}

function drawText(pathId,text,color,level,side,onClick,offsetOverride=null,textScale=1){
  const main=level===0;
  const cls=main?'main':level>=2?'grandchild':'child';
  const scale=clamp(Number(textScale)||1,.55,2.6);
  const txt=svgEl('text',{
    fill:color,
    class:`branch-text ${cls}`,
    dy:main?'-11':level>=2?'-5':'-7'
  });
  // La taille doit être appliquée en style inline : les classes CSS .main/.child/
  // .grandchild définissent aussi font-size et écrasaient auparavant l'attribut SVG.
  // Avec style.fontSize, les boutons A− / A+ agissent réellement à chaque rendu.
  txt.style.fontSize=`${(baseTextSize(level)*scale).toFixed(2)}px`;
  const pathEl=document.getElementById(pathId);
  const adaptiveLetterSpacing=computeAdaptiveLetterSpacing(pathEl,text,level,scale);
  if(adaptiveLetterSpacing) txt.style.letterSpacing=adaptiveLetterSpacing;

  // Les idées et sous-idées sont centrées sur la trajectoire de leur courbe.
  // text-anchor="middle" garantit le vrai centrage autour du point choisi.
  let offset=offsetOverride || (main?'23%':'50%');
  const tp=svgEl('textPath',{
    href:`#${pathId}`,
    startOffset:offset,
    'text-anchor':(!main || offsetOverride)?'middle':'start'
  });
  tp.textContent=text;
  txt.appendChild(tp);
  txt.addEventListener('click',onClick);
  svg.appendChild(txt);
  return txt;
}

function drawIcon(pathEl,iconValue,level,onClick,isLegacyUrl=false,ratioOverride=null){
  const size=level===0?30:level===1?25:21;
  const ratio=ratioOverride ?? (level===0?.54:level===1?.73:.78);
  let point={x:0,y:0};
  try{
    const len=pathEl.getTotalLength();
    point=pathEl.getPointAtLength(len*ratio);
  }catch(_){ }

  const group=svgEl('g',{class:`branch-icon level-${level}`});
  // Pas de fond blanc : la courbe reste continue. Pour les anciennes images URL,
  // l'icône est légèrement remontée au-dessus de la ligne.
  const iconY=point.y-(level===0?17:level===1?14:12);

  if(isLegacyUrl){
    const img=svgEl('image',{
      href:iconValue,x:point.x-size/2,y:iconY-size/2,
      width:size,height:size,preserveAspectRatio:'xMidYMid meet'
    });
    group.appendChild(img);
  }else{
    const glyph=svgEl('text',{
      x:point.x,y:iconY,'text-anchor':'middle','dominant-baseline':'central',
      class:'branch-icon-glyph','font-size':size
    });
    glyph.textContent=iconValue;
    group.appendChild(glyph);
  }

  group.addEventListener('click',onClick);
  svg.appendChild(group);
  return group;
}

function drawNodeLabel(object,curve,color,level,side,onEdit){
  const iconValue=object.iconGlyph || object.iconUrl;
  if(!iconValue){
    return drawText(curve.textPathId,object.text,color,level,side,onEdit,null,object.textScale);
  }

  // Les icônes du panneau intégré sont des glyphes : on les place directement
  // dans le même textPath que le libellé. L'icône et le texte occupent donc
  // exactement la même zone centrale et aucun fond ne vient masquer la courbe.
  if(object.iconGlyph){
    if(object.iconMode==='icon'){
      return drawText(curve.textPathId,object.iconGlyph,color,level,side,()=>chooseIcon(object),'50%',object.textScale);
    }
    return drawText(curve.textPathId,`${object.iconGlyph}  ${object.text}`,color,level,side,onEdit,'50%',object.textScale);
  }

  // Compatibilité avec les anciennes icônes par URL : elles sont affichées sans
  // pastille blanche, légèrement au-dessus de la trajectoire pour laisser la ligne continue.
  if(object.iconMode==='icon'){
    return drawIcon(curve.path,iconValue,level,()=>chooseIcon(object),true,.50);
  }
  const icon=drawIcon(curve.path,iconValue,level,()=>chooseIcon(object),true,.50);
  const text=drawText(curve.textPathId,object.text,color,level,side,onEdit,'50%',object.textScale);
  const group={
    addEventListener(type,fn){ icon.addEventListener(type,fn); text.addEventListener(type,fn); },
    matches(sel){ return icon.matches(sel)||text.matches(sel); }
  };
  return group;
}

function showControls(group){
  if(branchMenuHandleHover || Date.now()<branchMenuSuppressUntil || document.body.classList.contains('dragging-branch')) return;
  if(hideTimer) clearTimeout(hideTimer);
  if(activeGroup&&activeGroup!==group) activeGroup.classList.remove('visible');
  activeGroup=group; group.classList.add('visible');
}
function scheduleHide(group){
  if(hideTimer) clearTimeout(hideTimer);
  hideTimer=setTimeout(()=>{
    if(group.matches(':hover')) return;
    group.classList.remove('visible');
    if(activeGroup===group) activeGroup=null;
  },700);
}
function attachHover(hit,textEl,group){
  const enter=e=>{
    if(e?.target?.closest?.('.main-drag-handle,.node-drag-handle')) return;
    showControls(group);
  };
  const leave=()=>scheduleHide(group);
  [hit,textEl,group].forEach(el=>{
    el.addEventListener('pointerenter',enter);
    el.addEventListener('pointerleave',leave);
    el.addEventListener('pointerdown',e=>{
      if(e.target?.closest?.('.main-drag-handle,.node-drag-handle')) return;
      if(e.pointerType==='touch' || e.pointerType==='pen'){
        showControls(group);
        e.stopPropagation();
      }
    });
  });
}

function createMainControls(branch,x,y,side,startX,startY){
  const g=document.createElement('div');
  g.className='control-group main-controls';
  const menuKey=`branch-${branch.id}`;
  g.dataset.menuKey=menuKey;

  // Placement géométrique du menu : on l'éloigne de la poignée dans une direction
  // perpendiculaire à la branche. Cela corrige notamment les branches 4 et 8 et reste
  // fiable même après un déplacement manuel ou une redistribution automatique.
  const dx=x-startX, dy=y-startY;
  const dist=Math.hypot(dx,dy)||1;
  const ux=dx/dist, uy=dy/dist;
  const nx=-uy, ny=ux;
  const mapRect=mindmap.getBoundingClientRect();
  const sideOffset=82;
  const backOffset=24;
  const candidates=[1,-1].map(sign=>({
    x:x-ux*backOffset+nx*sideOffset*sign,
    y:y-uy*backOffset+ny*sideOffset*sign
  }));
  const marginX=72, marginY=46;
  const score=p=>{
    const overflow=Math.max(0,marginX-p.x)+Math.max(0,p.x-(mapRect.width-marginX))+
                   Math.max(0,marginY-p.y)+Math.max(0,p.y-(mapRect.height-marginY));
    const cx=mapRect.width/2, cy=mapRect.height/2;
    return overflow*10000-Math.hypot(p.x-cx,p.y-cy);
  };
  let pos=score(candidates[0])<=score(candidates[1])?candidates[0]:candidates[1];
  pos.x=clamp(pos.x,marginX,mapRect.width-marginX);
  pos.y=clamp(pos.y,marginY,mapRect.height-marginY);
  g.style.left=`${pos.x}px`;
  g.style.top=`${pos.y}px`;
  g.style.setProperty('--branch-color',branch.color);
  g.innerHTML=`
    <button class="dot-button add-button" title="Ajouter une idée" aria-label="Ajouter une idée">＋</button>
    <button class="dot-button text-button" title="Modifier le texte">T</button>
    <button class="dot-button font-down-button" title="Réduire la taille du texte de 25 %">A−</button>
    <button class="dot-button font-up-button" title="Agrandir la taille du texte de 25 %">A+</button>
    <button class="dot-button icon-button" title="Choisir une icône">▣</button>
    ${buildColorPaletteMarkup(branch.color,'Changer la couleur')}
    <button class="dot-button delete-button" title="Supprimer">×</button>`;
  controlsLayer.appendChild(g);
  const add=g.querySelector('.add-button');
  const full=(branch.children||[]).length>=MAX_IDEAS;
  add.disabled=full; add.title=full?'6 idées maximum':'Ajouter une idée';
  if(!full) add.addEventListener('click',()=>addChild(branch.id));
  g.querySelector('.text-button').addEventListener('click',()=>editTextFromMenu(branch,branch.color));
  g.querySelector('.font-down-button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();changeTextScale(branch,-.25,menuKey);});
  g.querySelector('.font-up-button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();changeTextScale(branch,.25,menuKey);});
  g.querySelector('.icon-button').addEventListener('click',()=>chooseIcon(branch));
  g.querySelector('.delete-button').addEventListener('click',()=>deleteBranch(branch.id));
  bindColorPalette(g.querySelector('.color-wrap'),color=>changeColor(branch.id,color));
  return g;
}

function createChildControls(branch,node,x,y,parentX,parentY,color,side,level){
  const g=document.createElement('div');
  g.className='child-control-group';
  const menuKey=`node-${node.id}`;
  g.dataset.menuKey=menuKey;

  // Positionnement géométrique du menu : il ne dépend plus seulement de "gauche/droite".
  // On calcule la direction réelle de la courbe, puis on place le menu sur le côté,
  // perpendiculairement à celle-ci. Cela laisse toujours la poignée d'extrémité libre,
  // même après avoir déplacé une idée ou une sous-idée en diagonale.
  const dx=x-parentX, dy=y-parentY;
  const dist=Math.hypot(dx,dy)||1;
  const ux=dx/dist, uy=dy/dist;
  const nx=-uy, ny=ux;
  const mapRect=mindmap.getBoundingClientRect();
  const menuSide=level>=2?76:82;
  const inward=level>=2?18:22;

  const candidates=[1,-1].map(sign=>({
    x:x-ux*inward+nx*menuSide*sign,
    y:y-uy*inward+ny*menuSide*sign
  }));

  // Choisit la position qui reste le mieux dans l'écran. En cas d'égalité,
  // on préfère celle qui s'éloigne du centre de la carte.
  const marginX=58, marginY=36;
  const score=p=>{
    const overflow=Math.max(0,marginX-p.x)+Math.max(0,p.x-(mapRect.width-marginX))+
                   Math.max(0,marginY-p.y)+Math.max(0,p.y-(mapRect.height-marginY));
    const cx=mapRect.width/2, cy=mapRect.height/2;
    const outward=Math.hypot(p.x-cx,p.y-cy);
    return overflow*10000-outward;
  };
  let pos=score(candidates[0])<=score(candidates[1])?candidates[0]:candidates[1];
  pos.x=clamp(pos.x,marginX,mapRect.width-marginX);
  pos.y=clamp(pos.y,marginY,mapRect.height-marginY);

  g.style.left=`${pos.x}px`;
  g.style.top=`${pos.y}px`;
  g.style.setProperty('--branch-color',color);
  g.innerHTML=`
    <button class="dot-button add-button" title="Ajouter une sous-idée" aria-label="Ajouter une sous-idée">＋</button>
    <button class="dot-button text-button" title="Modifier le texte">T</button>
    <button class="dot-button font-down-button" title="Réduire la taille du texte de 25 %">A−</button>
    <button class="dot-button font-up-button" title="Agrandir la taille du texte de 25 %">A+</button>
    <button class="dot-button icon-button" title="Choisir une icône">▣</button>
    ${buildColorPaletteMarkup(color,'Changer la couleur de cette idée')}
    <button class="dot-button delete-button" title="Supprimer">×</button>`;
  controlsLayer.appendChild(g);
  const add=g.querySelector('.add-button');
  const full=(node.children||[]).length>=MAX_IDEAS;
  const blocked=level>=MAX_DEPTH;
  add.disabled=full||blocked;
  add.title=blocked?'Niveau maximal atteint':full?'6 sous-idées maximum':'Ajouter une sous-idée';
  if(!full&&!blocked) add.addEventListener('click',()=>addChild(branch.id,node.id));
  g.querySelector('.text-button').addEventListener('click',()=>editTextFromMenu(node,color));
  g.querySelector('.font-down-button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();changeTextScale(node,-.25,menuKey);});
  g.querySelector('.font-up-button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();changeTextScale(node,.25,menuKey);});
  g.querySelector('.icon-button').addEventListener('click',()=>chooseIcon(node));
  bindColorPalette(g.querySelector('.color-wrap'),picked=>changeNodeColor(branch.id,node.id,picked));
  g.querySelector('.delete-button').addEventListener('click',()=>deleteChild(branch.id,node.id));
  return g;
}

function editObjectText(object,x,y,color){
  editorLayer.innerHTML='';
  textEditingActive=true;
  pendingRenderAfterEdit=false;
  document.body.classList.add('editing-branch-text');

  const input=document.createElement('input');
  input.className='branch-editor';
  input.type='text';
  input.value=object.text;
  input.setAttribute('autocomplete','off');
  input.setAttribute('autocapitalize','sentences');
  input.style.left=`${clamp(x,135,innerWidth-135)}px`;
  input.style.top=`${clamp(y-28,55,innerHeight-50)}px`;
  input.style.setProperty('--editor-color',color);
  editorLayer.appendChild(input);

  // Sur Android/Samsung, attendre la fin du cycle tactile avant de demander
  // le focus évite que le clavier soit refermé par le même geste qui ouvre l'éditeur.
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      if(!input.isConnected) return;
      try{ input.focus({preventScroll:true}); }catch(_){ input.focus(); }
      // La sélection automatique est utile à la souris mais peut perturber certains
      // claviers Android. Sur tactile on place simplement le curseur à la fin.
      const coarse=window.matchMedia?.('(pointer: coarse)')?.matches;
      if(coarse){
        try{ input.setSelectionRange(input.value.length,input.value.length); }catch(_){ }
      }else{
        try{ input.select(); }catch(_){ }
      }
    },35);
  });

  let done=false;
  const finish=commit=>{
    if(done) return;
    done=true;
    if(commit){
      const v=input.value.trim();
      if(v)object.text=v;
      save();
    }
    textEditingActive=false;
    document.body.classList.remove('editing-branch-text');
    input.remove();
    pendingRenderAfterEdit=false;
    render();
  };

  input.addEventListener('pointerdown',e=>e.stopPropagation());
  input.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter') finish(true);
    if(e.key==='Escape') finish(false);
  });
  input.addEventListener('blur',()=>{
    // Ignore un blur très précoce provoqué par l'ouverture du clavier Android.
    // Le prochain cycle rend le focus si le champ existe encore.
    if(textEditingActive && input.isConnected && document.visibilityState==='visible'){
      const elapsed=performance.now()-(input._editOpenedAt||0);
      if(elapsed<500){
        setTimeout(()=>{
          if(textEditingActive && input.isConnected){
            try{ input.focus({preventScroll:true}); }catch(_){ input.focus(); }
          }
        },60);
        return;
      }
    }
    finish(true);
  });
  input._editOpenedAt=performance.now();
}

function fanTargets(parentX,parentY,baseAngle,count,level,layout,slotIndex){
  const W=layout.rect.width, H=layout.rect.height;
  const slot=layout.points[slotIndex] || FIXED_SLOTS[slotIndex] || FIXED_SLOTS[0];
  const center=(count-1)/2;
  const primaryLevel=level===1;
  const spread=deg(primaryLevel ? (count<=2?18:count<=4?28:34) : (count<=2?16:22));
  const baseDistance=primaryLevel
    ? clamp(Math.min(W,H)*0.135, 94, 140)
    : clamp(Math.min(W,H)*0.092, 62, 96);

  return Array.from({length:count},(_,i)=>{
    const lane=i-center;
    const t=center===0 ? 0 : lane/center;

    // Ouverture en éventail arborescent : la branche garde la direction du parent,
    // puis chaque idée s'écarte progressivement avec une courbure naturelle.
    // Dans le repère écran (Y vers le bas), augmenter l’angle fait tourner dans le
    // sens des aiguilles d’une montre. L’ordre i=0 → i=n suit donc ce sens.
    const clockwiseStart=baseAngle-spread;
    const angle=count===1 ? baseAngle : clockwiseStart + (i/(count-1))*(spread*2);
    const distance=baseDistance*(1 - Math.abs(t)*0.06);
    let x=parentX + Math.cos(angle)*distance;
    let y=parentY + Math.sin(angle)*distance;

    if(primaryLevel){
      if(slot.axis==='vertical-top'){
        const left=W*slot.band[0] + 14;
        const right=W*slot.band[1] - 14;
        x=clamp(x,left,right);
        y=clamp(y,24,H*.26);
      }else if(slot.axis==='vertical-bottom'){
        const left=W*slot.band[0] + 14;
        const right=W*slot.band[1] - 14;
        x=clamp(x,left,right);
        y=clamp(y,H*.74,H-24);
      }else{
        const top=H*slot.band[0] + 8;
        const bottom=H*slot.band[1] - 8;
        y=clamp(y,top,bottom);
        if(slotIndex<=2){
          x=clamp(x,Math.max(parentX+42,W*.60),W*.88);
        }else if(slotIndex<=5){
          x=clamp(x,W*.12,Math.min(parentX-42,W*.40));
        }else{
          x=clamp(x,36,W-36);
        }
      }
    }else{
      x=clamp(x,34,W-34);
      y=clamp(y,28,H-28);
    }

    const actualAngle=Math.atan2(y-parentY,x-parentX);
    const side=Math.abs(Math.cos(actualAngle))<.30
      ? (Math.sin(actualAngle)<0?'top':'bottom')
      : (Math.cos(actualAngle)>=0?'right':'left');

    return {x,y,angle:actualAngle,lane,side};
  });
}

function scaledNodeTarget(node,parentX,parentY,target,layout){
  const W=layout.rect.width, H=layout.rect.height;
  const dx=target.x-parentX, dy=target.y-parentY;
  let x, y;

  // Si l'utilisateur a déjà déplacé cette idée librement, son vecteur manuel
  // devient prioritaire : droite, gauche, haut, bas ou diagonale sont possibles.
  if(Number.isFinite(Number(node.vectorX)) && Number.isFinite(Number(node.vectorY))){
    x=parentX+Number(node.vectorX)*W;
    y=parentY+Number(node.vectorY)*H;
  }else{
    const factor=clamp(Number(node.length)||1,.50,1.55);
    x=parentX+dx*factor;
    y=parentY+dy*factor;
  }

  x=clamp(x,34,W-34);
  y=clamp(y,28,H-28);

  // L'angle terminal suit la direction réellement choisie afin que la courbe
  // reste naturelle après un déplacement diagonal ou un retour vers la gauche.
  const actualAngle=Math.atan2(y-parentY,x-parentX);
  const actualSide=Math.abs(Math.cos(actualAngle))<.30
    ? (Math.sin(actualAngle)<0?'top':'bottom')
    : (Math.cos(actualAngle)>=0?'right':'left');
  return {...target,x,y,angle:actualAngle,side:actualSide,baseDistance:Math.hypot(dx,dy)||1};
}

function bindDragHandleMenuExclusion(handle){
  const hideNow=()=>{
    branchMenuHandleHover=true;
    branchMenuSuppressUntil=Date.now()+350;
    if(hideTimer) clearTimeout(hideTimer);
    if(activeGroup){ activeGroup.classList.remove('visible'); activeGroup=null; }
  };
  handle.addEventListener('pointerenter',hideNow);
  handle.addEventListener('pointermove',hideNow);
  handle.addEventListener('pointerdown',hideNow);
  handle.addEventListener('pointerleave',()=>{
    branchMenuHandleHover=false;
    branchMenuSuppressUntil=Date.now()+220;
  });
}

function beginBranchDrag(payload,{pointerId=null,captureTarget=null,touchId=null}={}){
  if(hideTimer) clearTimeout(hideTimer);
  if(activeGroup){ activeGroup.classList.remove('visible'); activeGroup=null; }
  const dx=payload.defaultX-payload.startX;
  const dy=payload.defaultY-payload.startY;
  const dist=Math.hypot(dx,dy)||1;
  dragState={
    ...payload,
    ux:dx/dist,
    uy:dy/dist,
    baseDistance:dist,
    pointerId,
    captureTarget,
    touchId
  };
  activeBranchTouchId = touchId;
  document.body.classList.add('dragging-branch');
}

function startDragHandle(e, payload){
  if(textEditingActive || e.target?.closest?.('.branch-editor')) return;
  e.preventDefault();
  e.stopPropagation();
  const captureTarget=e.currentTarget;
  if(captureTarget?.setPointerCapture){
    try{ captureTarget.setPointerCapture(e.pointerId); }catch(_){ }
  }
  beginBranchDrag(payload,{pointerId:e.pointerId,captureTarget,touchId:null});
}

function startTouchDragHandle(e,payload){
  if(textEditingActive || e.target?.closest?.('.branch-editor')) return;
  const touch=e.changedTouches?.[0];
  if(!touch) return;
  if(e.cancelable) e.preventDefault();
  e.stopPropagation();
  beginBranchDrag(payload,{pointerId:null,captureTarget:null,touchId:touch.identifier});
}

function makeTouchDragZone(x,y,r,payload){
  const zone=svgEl('circle',{
    cx:x,cy:y,r,
    fill:'transparent',
    class:'drag-touch-zone'
  });
  bindDragHandleMenuExclusion(zone);
  zone.addEventListener('pointerdown',e=>startDragHandle(e,payload));
  zone.addEventListener('touchstart',e=>startTouchDragHandle(e,payload),{passive:false});
  svg.appendChild(zone);
  return zone;
}

function drawNodeDragHandle(branch,node,x,y,parentX,parentY,defaultTarget,color,level){
  const payload={
    type:'node',branchId:branch.id,nodeId:node.id,
    startX:parentX,startY:parentY,defaultX:defaultTarget.x,defaultY:defaultTarget.y
  };
  makeTouchDragZone(x,y,level===1?20:18,payload);
  const handle=svgEl('circle',{
    cx:x,cy:y,
    r:level===1?VISUAL_SIZES.handleRadius.idea:VISUAL_SIZES.handleRadius.subIdea,
    fill:'#fff',
    stroke:color,
    'stroke-width':level===1?VISUAL_SIZES.handleStroke.idea:VISUAL_SIZES.handleStroke.subIdea,
    class:'node-drag-handle'
  });
  bindDragHandleMenuExclusion(handle);
  handle.addEventListener('pointerdown',e=>startDragHandle(e,payload));
  handle.addEventListener('touchstart',e=>startTouchDragHandle(e,payload),{passive:false});
  const title=svgEl('title');
  title.textContent='Maintenir et faire glisser pour régler la longueur et la direction';
  handle.appendChild(title);
  svg.appendChild(handle);
  return handle;
}

function renderChildren(branch,nodes,parentX,parentY,color,level,baseAngle,layout,slotIndex){
  if(!nodes?.length) return;
  const targets=fanTargets(parentX,parentY,baseAngle,nodes.length,level,layout,slotIndex);
  nodes.forEach((node,i)=>{
    const defaultTarget=targets[i];
    const t=scaledNodeTarget(node,parentX,parentY,defaultTarget,layout);
    const side=t.side || (Math.cos(t.angle)>=0?'right':'left');
    const id=`child-${node.id}`;
    const nodeColor=node.color || color;
    // Courbure arborescente des idées et sous-idées. Les ramifications centrales
    // restent plus douces ; les ramifications extérieures s'incurvent davantage.
    const siblingCenter=(nodes.length-1)/2;
    const normalizedLane=siblingCenter===0 ? 0 : (i-siblingCenter)/siblingCenter;
    const singleDirection=Math.sin(baseAngle)>=0 ? 1 : -1;
    const curveBias=nodes.length===1
      ? (level===1?.055:.035)*singleDirection
      : normalizedLane*(level===1?.16:.105);
    const curve=drawBranchPath({
      startX:parentX,startY:parentY,endX:t.x,endY:t.y,
      startAngle:baseAngle,endAngle:t.angle,
      color:nodeColor,width:level===1?VISUAL_SIZES.line.idea:VISUAL_SIZES.line.subIdea,id,main:false,side,curveBias
    });
    const labelEl=drawNodeLabel(
      node,curve,nodeColor,level,side,
      ()=>editObjectText(node,t.x,t.y,nodeColor)
    );
    const controls=createChildControls(branch,node,t.x,t.y,parentX,parentY,nodeColor,side,level);
    attachHover(curve.hit,labelEl,controls);
    drawNodeDragHandle(branch,node,t.x,t.y,parentX,parentY,defaultTarget,nodeColor,level);
    renderChildren(branch,node.children||[],t.x,t.y,nodeColor,level+1,t.angle,layout,slotIndex);
  });
}

function drawMainDragHandle(branch,x,y,geometry){
  const payload={
    type:'main',branchId:branch.id,
    startX:geometry.startX,startY:geometry.startY,
    defaultX:geometry.point.x,defaultY:geometry.point.y
  };
  makeTouchDragZone(x,y,24,payload);
  const handle=svgEl('circle',{
    cx:x,cy:y,
    r:VISUAL_SIZES.handleRadius.main,
    fill:'#fff',
    stroke:branch.color,
    'stroke-width':VISUAL_SIZES.handleStroke.main,
    class:'main-drag-handle'
  });
  bindDragHandleMenuExclusion(handle);
  handle.addEventListener('pointerdown',e=>startDragHandle(e,payload));
  handle.addEventListener('touchstart',e=>startTouchDragHandle(e,payload),{passive:false});
  const title=svgEl('title');
  title.textContent='Maintenir et faire glisser pour régler librement la longueur et la direction';
  handle.appendChild(title);
  svg.appendChild(handle);
  return handle;
}

function mainBranchGeometry(branch,layout){
  const point=layout.points[branch.slot]; if(!point) return null;
  const r=layout.cRect,map=layout.rect;
  const cx=r.left-map.left+r.width/2, cy=r.top-map.top+r.height/2;
  const dx=Math.cos(point.angle),dy=Math.sin(point.angle);
  const rx=r.width*.48,ry=r.height*.46;
  const scale=1/Math.sqrt((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry));
  const startX=cx+dx*scale, startY=cy+dy*scale;
  const baseDx=point.x-startX, baseDy=point.y-startY;
  const baseDistance=Math.hypot(baseDx,baseDy)||1;
  const baseUx=baseDx/baseDistance, baseUy=baseDy/baseDistance;
  const baseNx=-baseUy, baseNy=baseUx;
  const diag=Math.hypot(map.width,map.height)||1;

  let endX,endY;
  // Les grandes branches peuvent être ajustées manuellement, mais leur décalage
  // reste désormais ancré au point d'implantation de leur slot. Ainsi, si la
  // répartition change après l'ajout d'une branche, la branche déplacée suit bien
  // la nouvelle implantation au lieu de rester figée dans l'ancien repère écran.
  if(Number.isFinite(Number(branch.localParallel)) && Number.isFinite(Number(branch.localPerp))){
    endX=point.x+baseUx*Number(branch.localParallel)*diag+baseNx*Number(branch.localPerp)*diag;
    endY=point.y+baseUy*Number(branch.localParallel)*diag+baseNy*Number(branch.localPerp)*diag;
  }else if(Number.isFinite(Number(branch.vectorX)) && Number.isFinite(Number(branch.vectorY))){
    // Compatibilité avec les anciennes versions déjà enregistrées.
    endX=startX+Number(branch.vectorX)*map.width;
    endY=startY+Number(branch.vectorY)*map.height;
  }else{
    const factor=clamp(Number(branch.length)||1,.52,1.42);
    endX=startX+(point.x-startX)*factor;
    endY=startY+(point.y-startY)*factor;
  }

  endX=clamp(endX,72,map.width-72);
  endY=clamp(endY,52,map.height-52);
  const actualAngle=Math.atan2(endY-startY,endX-startX);
  const side=Math.abs(Math.cos(actualAngle))<.30 ? (Math.sin(actualAngle)<0?'top':'bottom') : (Math.cos(actualAngle)>=0?'right':'left');
  return {
    point,startX,startY,endX,endY,actualAngle,side,
    baseDistance,baseUx,baseUy,baseNx,baseNy,diag
  };
}

// ============================================================
// 8. RENDU DES BRANCHES, IDÉES ET SOUS-IDÉES
// ============================================================
function renderBranch(branch,layout){
  const g=mainBranchGeometry(branch,layout); if(!g) return;
  const {point,startX,startY,endX,endY,actualAngle,side}=g;
  const id=`main-${branch.id}`;
  // Alternance douce du sens de courbure pour retrouver un aspect arborescent :
  // les branches ne jaillissent plus du centre comme des rayons droits.
  const visualRank=Number.isInteger(point.rank)?point.rank:OPENING_ORDER.indexOf(branch.slot);
  const curveSign=visualRank%2===0?-1:1;
  const curveBias=curveSign*(visualRank===0?.18:.15);
  const curve=drawBranchPath({
    startX,startY,endX,endY,
    // Le départ garde l'esprit de son emplacement d'origine, mais l'arrivée
    // suit réellement la direction choisie par l'utilisateur.
    startAngle:point.angle,endAngle:actualAngle,
    color:branch.color,width:VISUAL_SIZES.line.main,id,main:true,side,curveBias
  });
  const labelEl=drawNodeLabel(
    branch,curve,branch.color,0,side,
    ()=>editObjectText(branch,(startX+endX)/2,(startY+endY)/2,branch.color)
  );
  const controls=createMainControls(branch,endX,endY,side,startX,startY);
  attachHover(curve.hit,labelEl,controls);
  drawMainDragHandle(branch,endX,endY,g);
  // Les idées se développent désormais à partir de la direction réelle de la branche.
  renderChildren(branch,branch.children||[],endX,endY,branch.color,1,actualAngle,layout,branch.slot);
}

function fitCentreTitle(){
  // Le bloc de titre reste centré sur les deux axes. Sa hauteur augmente
  // symétriquement lorsqu'il passe sur plusieurs lignes.
  const max=isPhoneLike()?14:(isTabletLike()?17:20);
  const min=isPhoneLike()?9:11;
  const maxHeight=Math.max(58,centre.clientHeight-46);
  centreInput.style.height='auto';
  let size=max;
  centreInput.style.fontSize=`${size}px`;
  centreInput.style.lineHeight='1.04';
  centreInput.style.height=`${Math.min(centreInput.scrollHeight,maxHeight)}px`;
  while(size>min && centreInput.scrollHeight>maxHeight){
    size-=1;
    centreInput.style.fontSize=`${size}px`;
    centreInput.style.height='auto';
    centreInput.style.height=`${Math.min(centreInput.scrollHeight,maxHeight)}px`;
  }
  const natural=Math.max(size*1.15,Math.min(centreInput.scrollHeight,maxHeight));
  centreInput.style.height=`${natural}px`;
}


// ============================================================
// 9. RENDU GLOBAL ET ÉVÉNEMENTS
// ============================================================
function render(){
  fitCentreTitle(); svg.innerHTML=''; controlsLayer.innerHTML=''; editorLayer.innerHTML=''; activeGroup=null;
  const layout=getLayout();
  state.branches.forEach(branch=>renderBranch(branch,layout));
  renderFreeIcons();
  const full=state.branches.length>=MAX_MAIN_BRANCHES;
  addBranchButton.disabled=full;
  addBranchButton.textContent=full?'8 branches maximum':'+ Ajouter une branche';

  // Après A− / A+, garder le même menu visible pour permettre plusieurs clics
  // successifs sans devoir repasser la souris sur la branche.
  if(reopenMenuKey){
    const key=reopenMenuKey;
    reopenMenuKey=null;
    const group=[...controlsLayer.querySelectorAll('[data-menu-key]')]
      .find(el=>el.dataset.menuKey===key);
    if(group) showControls(group);
  }
}

document.addEventListener('dragstart',e=>{ if(e.target.closest?.('.free-icon-item, .free-icon-visual, .free-icon-overlay')) e.preventDefault(); },true);
document.addEventListener('selectstart',e=>{ if(e.target.closest?.('.free-icon-item, .free-icon-visual, .free-icon-overlay') || freeIconDrag) e.preventDefault(); },true);

function updateBranchDragPosition(clientX,clientY){
  if(!dragState) return;
  const rect=mindmap.getBoundingClientRect();
  const px=clientX-rect.left, py=clientY-rect.top;
  if(dragState.type==='main'){
    const branch=findBranch(dragState.branchId);
    if(!branch) return;
    // Déplacement libre des grandes branches : on mémorise maintenant le décalage
    // dans un repère local lié à la branche par défaut (parallèle/perpendiculaire).
    // Ainsi, quand la répartition automatique change, la branche suit le nouveau slot.
    const W=rect.width || 1, H=rect.height || 1;
    const safeX=clamp(px,72,W-72);
    const safeY=clamp(py,52,H-52);
    const baseDx=dragState.defaultX-dragState.startX;
    const baseDy=dragState.defaultY-dragState.startY;
    const baseDist=Math.hypot(baseDx,baseDy)||1;
    const ux=baseDx/baseDist, uy=baseDy/baseDist;
    const nx=-uy, ny=ux;
    const diag=Math.hypot(W,H)||1;
    const deltaX=safeX-dragState.defaultX;
    const deltaY=safeY-dragState.defaultY;
    branch.localParallel=Number(((deltaX*ux+deltaY*uy)/diag).toFixed(4));
    branch.localPerp=Number(((deltaX*nx+deltaY*ny)/diag).toFixed(4));
    delete branch.vectorX;
    delete branch.vectorY;
  }else{
    const branch=findBranch(dragState.branchId);
    if(!branch) return;
    const node=findNode(branch.children,dragState.nodeId);
    if(!node) return;

    // Idées et sous-idées : déplacement libre en 2D. Le vecteur est mémorisé
    // relativement au parent, donc on peut choisir longueur + direction en un geste.
    const W=rect.width || 1, H=rect.height || 1;
    const safeX=clamp(px,34,W-34);
    const safeY=clamp(py,28,H-28);
    node.vectorX=clamp((safeX-dragState.startX)/W,-.48,.48);
    node.vectorY=clamp((safeY-dragState.startY)/H,-.48,.48);
  }
  render();
}

window.addEventListener('pointermove',e=>{
  if(!dragState) return;
  if(dragState.pointerId!=null && e.pointerId!==dragState.pointerId) return;
  if(e.cancelable) e.preventDefault();
  updateBranchDragPosition(e.clientX,e.clientY);
},{passive:false});

window.addEventListener('touchmove',e=>{
  if(!dragState || dragState.touchId==null) return;
  const touch=[...(e.changedTouches||[])].find(t=>t.identifier===dragState.touchId)
    || [...(e.touches||[])].find(t=>t.identifier===dragState.touchId);
  if(!touch) return;
  if(e.cancelable) e.preventDefault();
  updateBranchDragPosition(touch.clientX,touch.clientY);
},{passive:false, capture:true});

function finishDrag(e){
  if(!dragState) return;
  if(e?.pointerId!=null && dragState.pointerId!=null && e.pointerId!==dragState.pointerId) return;
  const finishedDrag=dragState;
  dragState=null;
  if(finishedDrag.captureTarget?.releasePointerCapture && finishedDrag.pointerId!=null){
    try{
      if(finishedDrag.captureTarget.hasPointerCapture?.(finishedDrag.pointerId)){
        finishedDrag.captureTarget.releasePointerCapture(finishedDrag.pointerId);
      }
    }catch(_){ }
  }
  branchMenuHandleHover=false;
  branchMenuSuppressUntil=Date.now()+300;
  activeBranchTouchId = null;
  document.body.classList.remove('dragging-branch');
  save();
}
window.addEventListener('pointerup',finishDrag);
window.addEventListener('pointercancel',finishDrag);
window.addEventListener('touchend',e=>{
  if(!dragState || dragState.touchId==null) return;
  const touch=[...(e.changedTouches||[])].find(t=>t.identifier===dragState.touchId);
  if(!touch) return;
  finishDrag({});
},{passive:false, capture:true});
window.addEventListener('touchcancel',e=>{
  if(!dragState || dragState.touchId==null) return;
  const touch=[...(e.changedTouches||[])].find(t=>t.identifier===dragState.touchId);
  if(!touch) return;
  finishDrag({});
},{passive:false, capture:true});

window.addEventListener('pointermove',updateFreeIconDrag,{passive:false});
window.addEventListener('mousemove',e=>{ if(freeIconDrag) { try{ e.preventDefault(); }catch(_){ } clearBrowserSelection(); } }, true);
window.addEventListener('pointerup',finishFreeIconDrag);
window.addEventListener('pointercancel',finishFreeIconDrag);

// Empêche définitivement la sélection/traînée native de Safari sur les icônes libres.
document.addEventListener('selectstart',e=>{
  if(freeIconDrag || e.target.closest?.('.free-icon-item, .free-icon-visual, .free-icon-overlay')) e.preventDefault();
});
document.addEventListener('dragstart',e=>{
  if(e.target.closest?.('.free-icon-item, .free-icon-visual, .free-icon-overlay')) e.preventDefault();
});
document.addEventListener('pointerdown',e=>{
  if(freeIconDrag) return;
  if(e.target.closest?.('.free-icon-visual, .free-icon-overlay, #iconPicker, #addFreeIcon')) return;
  if(activeFreeIconId!==null){ activeFreeIconId=null; renderFreeIcons(); }
});
addFreeIconButton?.addEventListener('click',openFreeIconPicker);

document.addEventListener('pointerdown',e=>{
  if(e.target.closest?.('.branch-editor')) return;
  if(!activeGroup) return;
  if(document.body.classList.contains('dragging-branch') || document.body.classList.contains('dragging-free-icon')) return;
  if(activeGroup.contains(e.target)) return;
  if(e.target.closest && (e.target.closest('.branch-text') || e.target.closest('.branch-icon') || e.target.closest('.branch-hit'))) return;
  activeGroup.classList.remove('visible');
  activeGroup=null;
});

centreInput.addEventListener('input',()=>{fitCentreTitle();state.centre=centreInput.value;save();});
resetButton.addEventListener('click',()=>{
  if(!confirm('Effacer toute la carte mentale ?')) return;
  state={centre:'MON PROJET',branches:[],freeIcons:[]}; nextId=1; activeFreeIconId=null; freeIconDrag=null; centreInput.value=state.centre; save(); render(); renderFreeIcons(); requestAnimationFrame(renderFreeIcons);
});
let resizeRenderTimer=null;
window.addEventListener('resize',()=>{
  // L'ouverture/fermeture du clavier virtuel Android déclenche resize.
  // Ne jamais recréer la carte pendant l'édition, sinon le champ disparaît.
  if(textEditingActive || document.activeElement?.classList?.contains('branch-editor')){
    pendingRenderAfterEdit=true;
    return;
  }
  clearTimeout(resizeRenderTimer);
  resizeRenderTimer=setTimeout(()=>render(),80);
});

document.getElementById('iconPickerClose')?.addEventListener('click',closeIconPicker);
document.getElementById('iconPickerBackdrop')?.addEventListener('click',closeIconPicker);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeIconPicker(); });

try{ ensureFreeIconCanvas(); }catch(err){ console.error('Canvas icônes',err); }
load();
centreInput.value=state.centre||'MON PROJET';
try{ render(); }catch(err){
  console.error('Rendu initial',err);
  // au minimum, garder la bulle centrale et le bouton fonctionnels
  try{ fitCentreTitle(); }catch(_){ }
}

