/* UI DE RÉFÉRENCE APPS1D76 — copie à l'identique du bloc <script> du fichier de référence (ne pas modifier).
   Si l'outil rejoint le dépôt Apps1D76, remplacer ce fichier par ../../accueil/outil.js. */
(() => {
  'use strict';
  const d = document, root = d.documentElement;

  /* ================= 1. RÉGLAGES D'AFFICHAGE (même stockage que l'accueil) ================= */
  const KEY = 'apps1d-prefs';
  const lire = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const mq = q => window.matchMedia && matchMedia(q).matches;
  const p = lire();
  root.dataset.theme = p.theme === 'dark' || (p.theme !== 'light' && mq('(prefers-color-scheme: dark)')) ? 'dark' : 'light';
  root.dataset.motion = p.motion === 'reduce' || (p.motion !== 'on' && mq('(prefers-reduced-motion: reduce)')) ? 'reduce' : 'full';
  root.dataset.contrast = p.contrast === true ? 'high' : 'normal';
  root.style.setProperty('--text-scale', ({ 115: 1.15, 130: 1.3 })[p.text] || 1);

  /* ================= 2. BOUTON DE THÈME ET ÉTAPES ================= */
  d.addEventListener('DOMContentLoaded', () => {
    const btn = d.getElementById('theme-toggle'), meta = d.querySelector('meta[name="theme-color"]');
    const maj = () => {
      const dark = root.dataset.theme === 'dark';
      btn?.setAttribute('aria-label', dark ? 'Activer le mode clair' : 'Activer le mode sombre');
      if (meta) meta.content = dark ? '#11111b' : '#000091';
    };
    btn?.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      const prefs = lire(); prefs.theme = root.dataset.theme;   // les autres réglages de l'accueil sont conservés
      try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* navigation privée */ }
      maj();
    });
    maj();
  });
  // Étape repliable : <button class="step-header" aria-expanded="true|false"> suivi de son .step-body
  d.addEventListener('click', e => {
    const h = e.target.closest?.('.step-header');
    if (h) h.setAttribute('aria-expanded', h.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  });

  /* ================= 3. OUTILS POUR LA PAGE ================= */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function telecharger(blob, nom) {
    const a = d.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nom;
    d.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Archive .zip sans compression (suffisant pour un .docx)
  function zip(fichiers) {
    const T = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
    const crc = o => { let c = -1; for (const b of o) c = T[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
    const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    const enc = new TextEncoder(), locaux = [], central = [];
    let pos = 0;
    for (const [nom, texte] of fichiers) {
      const n = enc.encode(nom), o = enc.encode(texte);
      const commun = [...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc(o)), ...u32(o.length), ...u32(o.length), ...u16(n.length), ...u16(0)];
      const entete = new Uint8Array([...u32(0x04034b50), ...u16(20), ...commun]);
      locaux.push(entete, n, o);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...commun, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), n);
      pos += entete.length + n.length + o.length;
    }
    const taille = central.reduce((s, b) => s + b.length, 0);
    const fin = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(fichiers.length), ...u16(fichiers.length), ...u32(taille), ...u32(pos), ...u16(0)]);
    return new Blob([...locaux, ...central, fin], { type: 'application/zip' });
  }

  /* Document Word (.docx) à partir de blocs :
       { titre: 'Texte' }                 grand titre bleu
       { texte: 'Texte', discret: true }   paragraphe (gris et petit si discret)
       { tableau: { entetes: ['A', 'B'], lignes: [[cellule, cellule]], largeurs: [1, 3] } }
     Une cellule est un texte ('\n' = retour à la ligne), un morceau { texte, gras, couleur, fond, taille },
     ou une liste de morceaux affichés à la suite. Couleurs en hexadécimal ('#1D4ED8').
     Options : { paysage: true }. Exemple : Outil.word('planning.docx', [{ titre: 'Planning' }], { paysage: true }) */
  function word(nom, blocs, { paysage = false } = {}) {
    const x = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const hex = c => String(c).replace('#', '').toUpperCase();
    const run = m => {
      m = typeof m === 'object' ? m : { texte: m };
      return `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${m.gras ? '<w:b/>' : ''}`
        + `${m.couleur ? `<w:color w:val="${hex(m.couleur)}"/>` : ''}<w:sz w:val="${(m.taille || 10) * 2}"/>`
        + `${m.fond ? `<w:shd w:val="clear" w:color="auto" w:fill="${hex(m.fond)}"/>` : ''}</w:rPr>`
        + `<w:t xml:space="preserve">${x(m.texte)}</w:t></w:r>`;
    };
    const para = (morceaux, apres = 0) => `<w:p><w:pPr><w:spacing w:before="0" w:after="${apres}"/></w:pPr>${morceaux.map(run).join(run(' '))}</w:p>`;
    const cellule = c => typeof c === 'string' ? c.split('\n').map(l => para([l])).join('')
      : para(Array.isArray(c) ? c : [c]);
    const [W, H] = paysage ? [16838, 11906] : [11906, 16838], marge = 850, utile = W - 2 * marge;
    const bord = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="C8C8D8"/>`).join('');

    const tableau = ({ entetes, lignes, largeurs }) => {
      const poids = largeurs || entetes.map(() => 1), total = poids.reduce((a, b) => a + b, 0);
      const w = poids.map(p => Math.floor(utile * p / total));
      const tc = (contenu, i, fond) => `<w:tc><w:tcPr><w:tcW w:w="${w[i]}" w:type="dxa"/>${fond ? `<w:shd w:val="clear" w:color="auto" w:fill="${fond}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>${contenu}</w:tc>`;
      return `<w:tbl><w:tblPr><w:tblW w:w="${utile}" w:type="dxa"/><w:tblBorders>${bord}</w:tblBorders>`
        + `<w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>`
        + `<w:tblGrid>${w.map(v => `<w:gridCol w:w="${v}"/>`).join('')}</w:tblGrid>`
        + `<w:tr><w:trPr><w:tblHeader/></w:trPr>${entetes.map((e, i) => tc(para([{ texte: e, gras: true, couleur: 'FFFFFF' }]), i, '000091')).join('')}</w:tr>`
        + lignes.map((l, r) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${l.map((c, i) => tc(cellule(c), i, r % 2 ? 'F6F6FB' : '')).join('')}</w:tr>`).join('')
        + `</w:tbl><w:p/>`;
    };

    const corps = blocs.map(b => b.titre != null ? para([{ texte: b.titre, gras: true, taille: 20, couleur: '000091' }], 60)
      : b.tableau ? tableau(b.tableau)
      : para([b.discret ? { texte: b.texte, couleur: '555566', taille: 9 } : { texte: b.texte }], 200)).join('');

    const docx = zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ['word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corps}`
        + `<w:sectPr><w:pgSz w:w="${W}" w:h="${H}"${paysage ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${marge}" w:right="${marge}" w:bottom="${marge}" w:left="${marge}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`]
    ]);
    telecharger(new Blob([docx], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), nom);
  }

  window.Outil = { esc, telecharger, word };
})();
