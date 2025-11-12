// --- Constants and utilities --- //
const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Extended map for double accidentals and enharmonic normalization
const ENHARMONIC_MAP = {
  'B#':'C','E#':'F','Cb':'B','Fb':'E',
  'G##':'A','D##':'E','A##':'B','C##':'D','F##':'G','E##':'F##','B##':'C##',
  'Abb':'G','Dbb':'C','Gbb':'F','Cbb':'Bb','Fbb':'Eb','Ebb':'D','Bbb':'A'
};

// Normalize input note (e.g., 'bb', 'C#', etc.)
function normalizeInput(note){
  if(!note) return null;
  note = note.trim();
  const m = note.match(/^([A-Ga-g])([#b]{0,2})$/);
  if(!m) return null;
  const base = m[1].toUpperCase() + (m[2] || '');
  return ENHARMONIC_MAP[base] || base;
}

function pcIndex(name){
  name = ENHARMONIC_MAP[name] || name;
  let i = SHARP.indexOf(name);
  if(i !== -1) return i;
  return FLAT.indexOf(name);
}

// chromatic naming options
const NAMES_BY_INDEX = [
  ['C'], ['C#','Db'], ['D'], ['D#','Eb'], ['E','Fb'], ['F','E#'],
  ['F#','Gb'], ['G'], ['G#','Ab'], ['A'], ['A#','Bb'], ['B','Cb']
];

function addSemis(i,s){ return (i+s+12)%12; }

// get sequential letters from a root
function expectedLettersFrom(rootLetter){
  const letters = ['A','B','C','D','E','F','G'];
  const start = letters.indexOf(rootLetter);
  const seq = [];
  for(let i=0;i<7;i++) seq.push(letters[(start+i)%7]);
  return seq;
}

// Pick name based on diatonic logic
function pickNameForIndex(index, expectedLetter, preferFlat=false, forcedAcc=null){
  const candidates = NAMES_BY_INDEX[index];
  if(forcedAcc==='b') for(const c of candidates) if(c.includes('b')) return c;
  if(forcedAcc==='#') for(const c of candidates) if(c.includes('#')) return c;
  for(const c of candidates) if(c[0]===expectedLetter) return c;
  if(preferFlat) for(const c of candidates) if(c.includes('b')) return c;
  return candidates[0];
}

// --- Scale logic --- //
function buildSpelledScale(rootIdx, steps, preferFlat){
  const rootName = preferFlat ? FLAT[rootIdx] : SHARP[rootIdx];
  const rootLetter = rootName[0];
  const expected = expectedLettersFrom(rootLetter);
  const scale = [];
  for(let i=0;i<7;i++){
    const semis = addSemis(rootIdx, steps[i]);
    scale.push(pickNameForIndex(semis, expected[i], preferFlat));
  }
  return scale;
}

// --- Mode definitions --- //
const modes = {
  Dorian:     { steps:[0,2,3,5,7,9,10], char:'6',  preferFlat:true },
  Phrygian:   { steps:[0,1,3,5,7,8,10], char:'♭2', preferFlat:true },
  Lydian:     { steps:[0,2,4,6,7,9,11], char:'#4', preferFlat:false },
  Mixolydian: { steps:[0,2,4,5,7,9,10], char:'♭7', preferFlat:false },
  Aeolian:    { steps:[0,2,3,5,7,8,10], char:'♭6', preferFlat:true }
};

const tonicQuality = {
  Dorian:'-7', Phrygian:'-7', Lydian:'Maj7', Mixolydian:'7', Aeolian:'-7'
};

// --- Characteristic Chord Maps --- //
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
    {deg:'II', quality:'7'},
    {deg:'V', quality:'Maj7', asterisk:true},
    {deg:'VII', quality:'-7'}
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

// --- Avoid Progression Map --- //
const avoidProgressionMap = {
  Dorian: [
    {deg:'I', quality:'-7'},
    {deg:'IV', quality:'7'},
    {deg:'♭VII', quality:'Maj7', asterisk:true}
  ],
  Phrygian: [
    {deg:'♭VII', quality:'-7'},
    {deg:'♭III', quality:'7', asterisk:true},
    {deg:'♭VI', quality:'Maj7'}
  ],
  Lydian: [
    {deg:'VI', quality:'-7', asterisk:true},
    {deg:'II', quality:'7'},
    {deg:'V', quality:'Maj7'}
  ],
  Mixolydian: [
    {deg:'V', quality:'-7', asterisk:true},
    {deg:'I', quality:'7'},
    {deg:'IV', quality:'Maj7'}
  ],
  Aeolian: [
    {deg:'IV', quality:'-7'},
    {deg:'♭VII', quality:'7'},
    {deg:'♭III', quality:'Maj7', asterisk:true}
  ]
};

// roman numeral semitone map
const romanSemis = {
  'I':0,'II':2,'III':4,'IV':5,'V':7,'VI':9,'VII':11,
  '♭II':1,'♭III':3,'♭VI':8,'♭VII':10,'#IV':6
};

// diatonic letter index per degree
const lettersOrder = {'I':0,'II':1,'III':2,'IV':3,'V':4,'VI':5,'VII':6,
                      '♭II':1,'♭III':2,'♭VI':5,'♭VII':6,'#IV':3};

// get note by roman numeral
function getNoteByRoman(rootIdx, sym, preferFlat){
  const target = addSemis(rootIdx, romanSemis[sym]);
  const acc = sym.includes('b')?'b':sym.includes('#')?'#':null;
  const expectedLetter = expectedLettersFrom((preferFlat?FLAT[rootIdx]:SHARP[rootIdx])[0])[lettersOrder[sym]%7];
  return pickNameForIndex(target, expectedLetter, preferFlat, acc);
}

// --- Characteristic Note Logic (fixed for flat keys) ---
function resolveCharacteristic(rootIdx, meta, rootNote){
  const preferFlat = meta.preferFlat || rootNote.includes('b') || ['Bb','Eb','Ab','Db','Gb','Cb'].includes(rootNote);
  const idxMap = { Dorian:5, Phrygian:1, Lydian:3, Mixolydian:6, Aeolian:5 };
  const scaleDegree = idxMap[Object.keys(modes).find(k => modes[k] === meta)];
  
  const rootLetter = (preferFlat ? FLAT[rootIdx] : SHARP[rootIdx])[0];
  const expectedLetters = expectedLettersFrom(rootLetter);
  const expectedLetter = expectedLetters[scaleDegree];
  const semis = addSemis(rootIdx, meta.steps[scaleDegree]);
  
  return pickNameForIndex(semis, expectedLetter, preferFlat);
}

// --- Rendering --- //
function render(rootInput){
  const root = normalizeInput(rootInput);
  if(!root){ alert('Enter a note like C, F#, Bb'); return; }
  const rootIdx = pcIndex(root);
  if(rootIdx<0){ alert('Unrecognized note'); return; }

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const avoidMapping = {
    Dorian:'VI', Phrygian:'V', Lydian:'#IV', Mixolydian:'III', Aeolian:'II'
  };

  for(const [modeName, meta] of Object.entries(modes)){
    const preferFlat = meta.preferFlat || root.includes('b') || ['Bb','Eb','Ab','Db','Gb','Cb'].includes(root);
    const scale = buildSpelledScale(rootIdx, meta.steps, preferFlat);
    const charNote = resolveCharacteristic(rootIdx, meta, root);

    const avoidSym = avoidMapping[modeName];
    const avoidRoot = getNoteByRoman(rootIdx, avoidSym, preferFlat);
    const avoidLabel = `${avoidRoot} -7(♭5)`;

    const charList = characteristicMap[modeName].map(ch=>{
      const note = getNoteByRoman(rootIdx, ch.deg, preferFlat);
      const asterisk = ch.asterisk?'*':'';
      return `<span class="chord"><span class="rnum">${ch.deg}${asterisk}</span><span class="name">${note} ${ch.quality}</span></span>`;
    }).join('');

    const avoidProgList = avoidProgressionMap[modeName].map(ch=>{
      const note = getNoteByRoman(rootIdx, ch.deg, preferFlat);
      const asterisk = ch.asterisk?'*':'';
      return `<span class="chord"><span class="rnum">${ch.deg}${asterisk}</span><span class="name">${note} ${ch.quality}</span></span>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="mode-head">
        <div>
          <div class="mode-title">${root} ${modeName}</div>
          <div class="small" style="margin-top:4px;color:var(--muted)">
            Scale: <span class="note">${scale.join(' • ')}</span>
          </div>
        </div>
        <div class="badge">${modeName}</div>
      </div>

      <div class="section">
        <div class="line"><div class="label">Mode:</div><div class="value">${modeName}</div></div>
        <div class="line"><div class="label">Characteristic note (${meta.char}):</div><div class="value">${charNote}</div></div>
        <div class="line"><div class="label">Tonic chord:</div><div class="value">${root}${tonicQuality[modeName]}</div></div>
      </div>

      <div class="section">
        <div class="label">Characteristic chords</div>
        <div style="margin-top:8px;">${charList}</div>
      </div>

      <div class="section">
        <div class="line"><div class="label">Avoid chord:</div><div class="value">${avoidSym} — ${avoidLabel}</div></div>
      </div>

      <div class="section">
        <div class="label">Avoid progression</div>
        <div style="margin-top:8px;">${avoidProgList}</div>
      </div>
      <div class="hint small" style="margin-top:8px;">Avoid to preserve ${modeName} focus.</div>
    `;
    grid.appendChild(card);
  }
}

// --- UI --- //
document.getElementById('go').addEventListener('click', ()=> render(document.getElementById('root').value || 'C'));
document.getElementById('root').addEventListener('keydown', e=> { if(e.key==='Enter') render(document.getElementById('root').value || 'C'); });
render(document.getElementById('root').value || 'C');
