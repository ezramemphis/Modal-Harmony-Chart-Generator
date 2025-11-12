// script.js — updated: correct #4, diatonic spellings, show "Root Mode" in each card

const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const ENHARMONIC_MAP = {
  'E#':'F','B#':'C','Cb':'B','Fb':'E'
};

// normalize input and map simple enharmonic aliases
function normalizeInput(note){
  if(!note) return null;
  note = note.trim();
  const m = note.match(/^([A-Ga-g])([#b])?$/);
  if(!m) return null;
  const base = m[1].toUpperCase() + (m[2] || '');
  return ENHARMONIC_MAP[base] || base;
}

// get chromatic index
function pcIndex(name){
  let i = SHARP.indexOf(name);
  if(i !== -1) return i;
  i = FLAT.indexOf(name);
  return i;
}

// all possible spellings for each semitone index (prefer common enharmonics)
const NAMES_BY_INDEX = [
  ['C'],
  ['C#','Db'],
  ['D'],
  ['D#','Eb'],
  ['E'],
  ['F'],
  ['F#','Gb'],
  ['G'],
  ['G#','Ab'],
  ['A'],
  ['A#','Bb'],
  ['B']
];

// helper: advance semitones
function addSemis(i,s){ return (i + s + 120) % 12; }

// produce expected letter sequence from root letter (diatonic letters)
function expectedLettersFrom(rootLetter){
  const letters = ['A','B','C','D','E','F','G'];
  const start = letters.indexOf(rootLetter);
  if(start === -1) return ['C','D','E','F','G','A','B'];
  const seq = [];
  for(let i=0;i<7;i++) seq.push(letters[(start + i) % 7]);
  return seq;
}

// pick a spelled name for a pitch index that matches expected letter when possible.
// rules:
// - if requestedAccidental === 'b' always return the flat form if available
// - if requestedAccidental === '#' always return the sharp form if available
// - if expectedLetter available choose that enharmonic (so we don't skip letters)
// - fallback to preferFlat if root is flat or mode tends to flats
function pickNameForIndex(index, expectedLetter=null, preferFlat=false, requestedAccidental=null){
  index = (index+12)%12;
  const candidates = NAMES_BY_INDEX[index]; // e.g. ['C#','Db']
  // if exact accidental requested
  if(requestedAccidental === 'b'){
    for(const c of candidates) if(c.includes('b')) return c;
  }
  if(requestedAccidental === '#'){
    for(const c of candidates) if(c.includes('#')) return c;
  }
  // match expected letter
  if(expectedLetter){
    for(const c of candidates){
      if(c[0] === expectedLetter) return c;
    }
  }
  // prefer flat or sharp
  if(preferFlat){
    for(const c of candidates) if(c.includes('b')) return c;
  } else {
    for(const c of candidates) if(c.includes('#')) return c;
  }
  // fallback to first candidate
  return candidates[0];
}

// build diatonic spelled scale: uses expected letter sequence to avoid skipping letters
function buildSpelledScale(rootIdx, steps, preferFlatForScale, modeChar){
  // root name letter
  const rootName = preferFlatForScale ? FLAT[rootIdx] : SHARP[rootIdx];
  const rootLetter = rootName[0];
  const expectedLetters = expectedLettersFrom(rootLetter); // e.g. ['C','D','E','F','G','A','B']
  const scale = [];
  for(let i=0;i<7;i++){
    const semis = addSemis(rootIdx, steps[i]);
    const expectedLetter = expectedLetters[i];
    // determine if this degree is a flat or sharp in modal descriptor context
    // if modeChar is like 'b2' and we're computing degree 2, requestedAccidental='b'
    // but buildSpelledScale is used for whole scale: only natural degrees should be no accidental
    // so requestedAccidental only applied for characteristic when needed — here we try to choose natural spell.
    const name = pickNameForIndex(semis, expectedLetter, preferFlatForScale, null);
    scale.push(name);
  }
  return scale;
}

// modes and metadata
const modes = {
  Dorian:     { steps:[0,2,3,5,7,9,10], char:'6',  preferFlat:true },
  Phrygian:   { steps:[0,1,3,5,7,8,10], char:'b2', preferFlat:true },
  Lydian:     { steps:[0,2,4,6,7,9,11], char:'#4', preferFlat:false },
  Mixolydian: { steps:[0,2,4,5,7,9,10], char:'b7', preferFlat:false },
  Aeolian:    { steps:[0,2,3,5,7,8,10], char:'b6', preferFlat:true }
};

const tonicQualityForced = {
  Dorian:'-7',
  Phrygian:'-7',
  Lydian:'Maj7',
  Mixolydian:'7',
  Aeolian:'-7'
};

// characteristic chords as specified (deg symbols)
const characteristicMap = {
  Dorian: [
    {deg:'II', quality:'-7'},
    {deg:'IV', quality:'7'},
    {deg:'♭VII', quality:'Maj7', asterisk:true}
  ],
  Phrygian: [
    {deg:'♭II', quality:'Maj7'},
    {deg:'♭III', quality:'7', asterisk:true},
    {deg:'♭VII', quality:'-7'}
  ],
  Lydian: [
    {deg:'II', quality:'7', asterisk:true},
    {deg:'V', quality:'Maj7'},
    {deg:'III', quality:'-7'}
  ],
  Mixolydian: [
    {deg:'I', quality:'7', asterisk:true},
    {deg:'V', quality:'-7'},
    {deg:'♭VII', quality:'Maj7'}
  ],
  Aeolian: [
    {deg:'IV', quality:'-7'},
    {deg:'♭VI', quality:'Maj7'},
    {deg:'♭VII', quality:'7', asterisk:true}
  ]
};

// roman semitone map (relative to tonic)
const romanSemis = {
  'I':0,'II':2,'III':4,'IV':5,'V':7,'VI':9,'VII':11,
  '♭II':1,'♭III':3,'♭VI':8,'♭VII':10,'#IV':6
};

// helper to get note by roman numeral spelled properly for a given root index
function getNoteByRoman(rootIdx, symbol, preferFlatForScale){
  if(!(symbol in romanSemis)) return '?';
  const targetIdx = addSemis(rootIdx, romanSemis[symbol]);
  // choose requested accidental if symbol contains b or #
  const requestedAcc = symbol.includes('b') ? 'b' : (symbol.includes('#') ? '#' : null);
  // expected letter is determined by roman degree (I -> root letter, II -> next letter, etc.)
  const degreeOrder = {'I':0,'II':1,'III':2,'IV':3,'V':4,'VI':5,'VII':6,'♭II':1,'♭III':2,'♭VI':5,'♭VII':6,'#IV':3};
  const expectedDeg = degreeOrder[symbol];
  // compute expected letter sequence from root letter
  const rootLetter = (preferFlatForScale ? FLAT[rootIdx] : SHARP[rootIdx])[0];
  const expectedLetters = expectedLettersFrom(rootLetter);
  const expectedLetter = expectedLetters[expectedDeg % 7];
  return pickNameForIndex(targetIdx, expectedLetter, preferFlatForScale, requestedAcc);
}

// pickNameForIndex reused from above for roman mapping
function pickNameForIndex(index, expectedLetter=null, preferFlat=false, requestedAccidental=null){
  index = (index+12)%12;
  const candidates = NAMES_BY_INDEX[index];
  if(requestedAccidental === 'b'){
    for(const c of candidates) if(c.includes('b')) return c;
  }
  if(requestedAccidental === '#'){
    for(const c of candidates) if(c.includes('#')) return c;
  }
  if(expectedLetter){
    for(const c of candidates) if(c[0] === expectedLetter) return c;
  }
  if(preferFlat){
    for(const c of candidates) if(c.includes('b')) return c;
  } else {
    for(const c of candidates) if(c.includes('#')) return c;
  }
  return candidates[0];
}

// compute characteristic note specially (apply b/# correctly)
function resolveCharacteristic(rootIdx, modeMeta){
  const char = modeMeta.char; // ex '#4' or 'b2' or '6'
  if(char.startsWith('#')){
    const degree = parseInt(char.slice(1),10);
    const semis = modeMeta.steps[degree-1] + 1;
    const idx = addSemis(rootIdx, semis);
    // prefer sharp when # used
    return pickNameForIndex(idx, null, false, '#');
  }
  if(char.startsWith('b')){
    const degree = parseInt(char.slice(1),10);
    const semis = modeMeta.steps[degree-1] - 1;
    const idx = addSemis(rootIdx, semis);
    // prefer flat
    return pickNameForIndex(idx, null, true, 'b');
  }
  // natural degree (like 6)
  const degree = parseInt(char,10);
  const idx = addSemis(rootIdx, modeMeta.steps[degree-1]);
  // pick by expected letter
  const rootLetter = FLAT[rootIdx][0];
  const expectedLetters = expectedLettersFrom(rootLetter);
  const expected = expectedLetters[(degree-1)%7];
  return pickNameForIndex(idx, expected, modeMeta.preferFlat, null);
}

// render function — updates DOM
function render(rootInput){
  const root = normalizeInput(rootInput);
  if(!root){ alert('Please enter a note like C, F#, Bb'); return; }
  const rootIdx = pcIndex(root);
  if(rootIdx < 0){ alert('Unrecognized note'); return; }

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for(const [modeName, meta] of Object.entries(modes)){
    // decide if scale spelling should prefer flats
    const preferFlatForScale = meta.preferFlat || root.includes('b') || ['Bb','Eb','Ab','Db','Gb','Cb'].includes(root);

    // spelled diatonic scale
    const scale = buildSpelledScale(rootIdx, meta.steps, preferFlatForScale, meta.char);

    // characteristic note
    const charNote = resolveCharacteristic(rootIdx, meta);

    // avoid chord (root spelled properly) — avoid mapping from your requirements
    const avoidMapping = { Dorian:'VI', Phrygian:'V', Lydian:'#IV', Mixolydian:'III', Aeolian:'II' };
    const avoidSym = avoidMapping[modeName];
    const avoidRoot = getNoteByRoman(rootIdx, avoidSym, preferFlatForScale);
    const avoidLabel = `${avoidRoot} -7(b5)`;

    // characteristic chords block (use characteristicMap)
    const charList = characteristicMap[modeName].map(ch=>{
      const noteName = getNoteByRoman(rootIdx, ch.deg, preferFlatForScale);
      const asterisk = ch.asterisk ? '*' : '';
      return `<span class="chord"><span class="rnum">${ch.deg}${asterisk}</span><span class="name">${noteName} ${ch.quality}</span></span>`;
    }).join('');

    // header label: show "C Dorian" etc.
    const headerLabel = `${root} ${modeName}`;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="mode-head">
        <div>
          <div class="mode-title">${headerLabel}</div>
          <div class="small" style="margin-top:4px;color:var(--muted)">
            Scale (from ${root}): <span class="note">${scale.join(' • ')}</span>
          </div>
        </div>
        <div class="badge">${modeName}</div>
      </div>

      <div class="section">
        <div class="line"><div class="label">Mode:</div><div class="value">${modeName}</div></div>
        <div class="line"><div class="label">Characteristic note (${meta.char}):</div><div class="value">${charNote}</div></div>
        <div class="line"><div class="label">Tonic chord:</div><div class="value">${root} — <span class="small">${tonicQualityForced[modeName]}</span></div></div>
      </div>

      <div class="section">
        <div class="label">Characteristic chords</div>
        <div style="margin-top:8px;">${charList}</div>
      </div>

      <div class="section">
        <div class="line"><div class="label">Avoid chord:</div><div class="value">${avoidSym} — ${avoidLabel}</div></div>
        <div class="hint small" style="margin-top:8px;">Avoid these to preserve ${modeName} tonal focus.</div>
      </div>
    `;
    grid.appendChild(card);
  }
}

// wire UI
document.getElementById('go').addEventListener('click', ()=> render(document.getElementById('root').value || 'C'));
document.getElementById('root').addEventListener('keydown', e=> { if(e.key === 'Enter') render(document.getElementById('root').value || 'C'); });

// initial render
render(document.getElementById('root').value || 'C');
