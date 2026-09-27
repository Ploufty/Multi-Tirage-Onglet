(function() {
    var HISTORY_LIMIT = 10;
    var DICE_MIN = 1;
    var DICE_MAX = 6;

    var nameList = document.getElementById('nameList');
    var countBadge = document.getElementById('countBadge');
    var drawButton = document.getElementById('drawButton');
    var resultName = document.getElementById('resultName');
    var statusText = document.getElementById('statusText');
    var durationRange = document.getElementById('durationRange');
    var durationValue = document.getElementById('durationValue');
    var btnImport = document.getElementById('btnImport');
    var fileImport = document.getElementById('fileImport');
    var btnClear = document.getElementById('btnClear');
    var confettiLayer = document.getElementById('confettiLayer');
    var removeDrawnToggle = document.getElementById('removeDrawnToggle');
    var showHistoryToggle = document.getElementById('showHistoryToggle');
    var confettiToggle = document.getElementById('confettiToggle');
    var historyPanel = document.getElementById('historyPanel');
    var layout = document.getElementById('layout');
    var historyList = document.getElementById('historyList');
    var btnClearHistory = document.getElementById('btnClearHistory');
    var tabButtons = document.querySelectorAll('.tabButton');
    var tabPanels = document.querySelectorAll('.tabPanel');
    var notifBanner = document.getElementById('notifBanner');
    var btnFullscreen = document.getElementById('btnFullscreen');
    var appEl = document.getElementById('app');
    var notifTimer = null;
    var confettiTimer = null;

    var diceCountRow = document.getElementById('diceCountRow');
    var diceSidesRow = document.getElementById('diceSidesRow');
    var diceStyleButtons = document.querySelectorAll('.pillBtn.iconPill[data-style]');
    var diceRollButton = document.getElementById('diceRollButton');
    var diceFaces = document.getElementById('diceFaces');
    var diceStatusText = document.getElementById('diceStatusText');
    var diceTotal = document.getElementById('diceTotal');
    var diceTotalValue = document.getElementById('diceTotalValue');

    var imageStage = document.getElementById('imageStage');
    var imageStatusText = document.getElementById('imageStatusText');
    var imageCaption = document.getElementById('imageCaption');
    var imageResultCard = document.getElementById('imageResultCard');
    var imageDrawButton = document.getElementById('imageDrawButton');
    var imageDurationRange = document.getElementById('imageDurationRange');
    var imageDurationValue = document.getElementById('imageDurationValue');
    var imageCountBadge = document.getElementById('imageCountBadge');
    var imageReport = document.getElementById('imageReport');
    var imageThumbs = document.getElementById('imageThumbs');
    var btnImageFolder = document.getElementById('btnImageFolder');
    var btnImageFiles = document.getElementById('btnImageFiles');
    var btnImageReset = document.getElementById('btnImageReset');
    var btnImageClear = document.getElementById('btnImageClear');
    var imageFolderInput = document.getElementById('imageFolderInput');
    var imageFilesInput = document.getElementById('imageFilesInput');
    var removeImageToggle = document.getElementById('removeImageToggle');
    var showImageNameToggle = document.getElementById('showImageNameToggle');

    var IMAGE_LIMIT = 300;
    var THUMB_MAX = 480;
    var IMAGE_EXTENSIONS = /\.(jpe?g|jfif|pjpeg|pjp|png|apng|gif|webp|avif|svg|bmp|ico|heic|heif|tiff?)$/i;

    var DICE_SIDES_OPTIONS = {
        pips: [2, 3, 4, 5, 6],
        hands: [2, 3, 4, 5, 6],
        digits: [4, 6, 8, 10, 12, 20]
    };

    var isRolling = false;
    var isDiceRolling = false;
    var diceCount = 2;
    var diceStyle = 'pips';
    var diceSidesValue = 6;
    var history = [];
    var images = [];
    var isImageRolling = false;
    var isImageLoading = false;
    var imageMode = 'empty'; // empty | idle | final
    var lastImage = null;

    function bindAction(element, action) {
        var el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) { return; }
        // Native click covers mouse, touch and Enter/Space on buttons.
        el.addEventListener('click', function(e) {
            e.preventDefault();
            action.call(el, e);
        }, false);
    }

    // ---- Tabs ----

    function switchTab(tabName) {
        var i, btn, panel;
        for (i = 0; i < tabButtons.length; i++) {
            btn = tabButtons[i];
            var active = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        }
        for (i = 0; i < tabPanels.length; i++) {
            panel = tabPanels[i];
            panel.hidden = panel.id !== 'tabPanel-' + tabName;
        }
        if (tabName === 'dice' && !isDiceRolling) {
            sizeDiceTiles(diceCount);
        }
        if (tabName === 'images' && !isImageRolling) {
            renderImageStage();
        }
        try { localStorage.setItem('randomizer_active_tab', tabName); } catch (e) {}
    }

    for (var t = 0; t < tabButtons.length; t++) {
        bindAction(tabButtons[t], function() {
            switchTab(this.getAttribute('data-tab'));
        });
    }

    // ---- Notifications ----

    function notify(message, type) {
        clearTimeout(notifTimer);
        notifBanner.textContent = message;
        notifBanner.className = 'notifBanner visible' + (type ? ' ' + type : '');
        notifTimer = setTimeout(function() {
            notifBanner.classList.remove('visible');
        }, 2600);
    }

    // ---- Fullscreen ----

    function isFullscreenActive() {
        return !!document.fullscreenElement || appEl.classList.contains('fakeFullscreen');
    }

    function updateFullscreenIcon() {
        var active = isFullscreenActive();
        btnFullscreen.querySelector('.iconExpand').hidden = active;
        btnFullscreen.querySelector('.iconCompress').hidden = !active;
        btnFullscreen.title = active ? 'Quitter le plein écran (F)' : 'Plein écran (F)';
        btnFullscreen.setAttribute('aria-label', btnFullscreen.title);
        refreshSizes();
    }

    function refreshSizes() {
        if (!isDiceRolling) { sizeDiceTiles(diceCount); }
        if (!isImageRolling && imageMode === 'idle') { renderImageStage(); }
    }

    function toggleFullscreen() {
        if (isFullscreenActive()) {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
            } else {
                appEl.classList.remove('fakeFullscreen');
                updateFullscreenIcon();
            }
            return;
        }
        if (appEl.requestFullscreen) {
            appEl.requestFullscreen().catch(function() {
                appEl.classList.add('fakeFullscreen');
                updateFullscreenIcon();
            });
        } else {
            appEl.classList.add('fakeFullscreen');
            updateFullscreenIcon();
        }
    }

    bindAction(btnFullscreen, toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenIcon, false);
    window.addEventListener('resize', refreshSizes, false);

    // ---- Keyboard shortcuts ----

    document.addEventListener('keydown', function(e) {
        var tag = document.activeElement ? document.activeElement.tagName : '';
        var isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        if (e.key === 'Escape' && isFullscreenActive()) {
            toggleFullscreen();
            return;
        }

        if (isTyping) { return; }

        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
            // A focused button handles Space/Enter itself.
            if (tag === 'BUTTON' || tag === 'A') { return; }
            var activeTabBtn = document.querySelector('.tabButton.active');
            var activeTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'names';
            e.preventDefault();
            if (activeTab === 'dice') {
                startDiceRoll();
            } else if (activeTab === 'images') {
                startImageDraw();
            } else {
                startDraw();
            }
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            toggleFullscreen();
        }
    }, false);

    // ---- Names ----

    function parseNames() {
        var raw = nameList.value || '';
        var parts = raw.split(/[\n;,]+/);
        var names = [];
        var seen = {};
        var i, n, key;
        for (i = 0; i < parts.length; i++) {
            n = parts[i].replace(/^\s+|\s+$/g, '');
            key = n.toLowerCase();
            if (n && !seen[key]) {
                seen[key] = true;
                names.push(n);
            }
        }
        return names;
    }

    function removeNameFromList(name) {
        var names = parseNames();
        var key = name.toLowerCase();
        var i;
        for (i = 0; i < names.length; i++) {
            if (names[i].toLowerCase() === key) {
                names.splice(i, 1);
                break;
            }
        }
        nameList.value = names.join('\n');
        updateCount();
    }

    function updateCount() {
        var names = parseNames();
        countBadge.textContent = names.length + (names.length > 1 ? ' noms' : ' nom');
        try { localStorage.setItem('randomizer_names', nameList.value); } catch (e) {}
    }

    function updateDuration() {
        durationValue.textContent = durationRange.value;
    }

    function chooseRandom(names) {
        return names[Math.floor(Math.random() * names.length)];
    }

    function startDraw() {
        if (isRolling) { return; }
        var names = parseNames();
        if (!names.length) {
            resultName.className = '';
            resultName.textContent = '—';
            statusText.textContent = 'Colle ou importe une liste avant de lancer.';
            return;
        }

        isRolling = true;
        drawButton.disabled = true;
        resultName.className = 'rolling';
        statusText.textContent = 'Tirage en cours…';

        var duration = parseInt(durationRange.value, 10) * 1000;
        var start = new Date().getTime();
        var finalName = chooseRandom(names);

        function tick() {
            var now = new Date().getTime();
            var elapsed = now - start;
            var progress = elapsed / duration;
            if (progress >= 1) {
                finishDraw(finalName);
                return;
            }
            resultName.textContent = chooseRandom(names);
            var delay = 38 + Math.pow(progress, 2.4) * 190;
            setTimeout(tick, delay);
        }
        tick();
    }

    function finishDraw(name) {
        resultName.textContent = name;
        resultName.className = 'winner';
        statusText.textContent = 'Résultat du tirage';
        isRolling = false;
        drawButton.disabled = false;
        if (confettiToggle.checked) {
            launchConfetti(document.getElementById('resultCard'));
        }

        addHistoryEntry(name, 'names');

        if (removeDrawnToggle.checked) {
            removeNameFromList(name);
        }

        setTimeout(function() {
            resultName.className = '';
        }, 600);
    }

    // ---- Dice ----

    function buildPipMarkup(value) {
        var slots = {
            1: ['c'],
            2: ['tl', 'br'],
            3: ['tl', 'c', 'br'],
            4: ['tl', 'tr', 'bl', 'br'],
            5: ['tl', 'tr', 'c', 'bl', 'br'],
            6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br']
        };
        var active = slots[value] || [];
        var html = '<span class="pipGrid">';
        var i;
        for (i = 0; i < active.length; i++) {
            html += '<span class="pip pip-' + active[i] + '"></span>';
        }
        html += '</span>';
        return html;
    }

    function buildHandMarkup(value) {
        if (!value) { return ''; }
        var clamped = Math.min(6, Math.max(1, value));
        return '<img class="handImg" src="assets/dice-hands/' + clamped + '.png" alt="' + clamped + '" width="600" height="600" draggable="false">';
    }

    // Load the six hands as soon as the style is chosen, so the first roll never shows empty dice.
    var handsPreloaded = false;
    function preloadHands() {
        if (handsPreloaded) { return; }
        handsPreloaded = true;
        var n;
        for (n = 1; n <= 6; n++) {
            new Image().src = 'assets/dice-hands/' + n + '.png';
        }
    }

    function buildFaceInner(value, style) {
        if (value === '?') { return value; }
        if (style === 'pips') { return buildPipMarkup(value); }
        if (style === 'hands') { return buildHandMarkup(value); }
        return String(value);
    }

    // Largest square tile that fits `count` dice in the dice area, trying every
    // number of dice per row (e.g. 4 dice: one row on a wide screen, 2×2 on a phone).
    function sizeDiceTiles(count) {
        var width = diceFaces.clientWidth;
        var height = diceFaces.clientHeight;
        if (!width || !height) { return; } // hidden tab: sized again when shown
        var gap = parseFloat(getComputedStyle(diceFaces).columnGap) || 0;
        var best = 0;
        var bestPerRow = count;
        var perRow, rows, size;
        for (perRow = 1; perRow <= count; perRow++) {
            rows = Math.ceil(count / perRow);
            size = Math.min((width - gap * (perRow - 1)) / perRow, (height - gap * (rows - 1)) / rows);
            if (size > best) { best = size; bestPerRow = perRow; }
        }
        size = Math.floor(Math.min(best, 300));
        diceFaces.style.setProperty('--dieSize', size + 'px');
        // Side padding so the row wraps after exactly bestPerRow dice (2×2 rather than 3+1).
        var line = bestPerRow * size + (bestPerRow - 1) * gap;
        diceFaces.style.paddingLeft = diceFaces.style.paddingRight = Math.max(0, Math.floor((width - line) / 2) - 1) + 'px';
    }

    function renderDiceFaces(values, rolling) {
        diceFaces.innerHTML = '';
        var i, face;
        for (i = 0; i < values.length; i++) {
            face = document.createElement('div');
            face.className = 'dieFace style-' + diceStyle + (rolling ? ' rolling' : '');
            face.innerHTML = buildFaceInner(values[i], diceStyle);
            diceFaces.appendChild(face);
        }
    }

    function createDroppingTiles(count) {
        sizeDiceTiles(count);
        diceFaces.innerHTML = '';
        var tiles = [];
        var i, tile;
        for (i = 0; i < count; i++) {
            tile = document.createElement('div');
            tile.className = 'dieFace style-' + diceStyle + ' dropping';
            tile.style.animationDelay = (i * 70) + 'ms';
            diceFaces.appendChild(tile);
            tiles.push(tile);
        }
        return tiles;
    }

    function updateTiles(tiles, values) {
        var i;
        for (i = 0; i < tiles.length; i++) {
            tiles[i].innerHTML = buildFaceInner(values[i], diceStyle);
        }
    }

    function renderDicePlaceholders(count) {
        sizeDiceTiles(count);
        var values = [];
        var i;
        for (i = 0; i < count; i++) {
            values.push('?');
        }
        renderDiceFaces(values, false);
        for (i = 0; i < diceFaces.children.length; i++) {
            diceFaces.children[i].classList.add('waiting');
        }
        diceTotal.hidden = true;
        diceStatusText.textContent = 'Prêt à lancer les dés.';
    }

    function rollValues(count, sides) {
        var values = [];
        var i;
        for (i = 0; i < count; i++) {
            values.push(1 + Math.floor(Math.random() * sides));
        }
        return values;
    }

    function buildCountRow() {
        diceCountRow.innerHTML = '';
        var i, btn;
        for (i = DICE_MIN; i <= DICE_MAX; i++) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pillBtn' + (i === diceCount ? ' active' : '');
            btn.textContent = i;
            btn.setAttribute('data-count', i);
            bindAction(btn, makeCountHandler(i));
            diceCountRow.appendChild(btn);
        }
    }

    function makeCountHandler(value) {
        return function() {
            diceCount = value;
            updateCountActive();
            if (!isDiceRolling) { renderDicePlaceholders(diceCount); }
            persistDiceOptions();
        };
    }

    function updateCountActive() {
        var buttons = diceCountRow.querySelectorAll('.pillBtn');
        var i;
        for (i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle('active', parseInt(buttons[i].getAttribute('data-count'), 10) === diceCount);
        }
    }

    function buildSidesRow() {
        var options = DICE_SIDES_OPTIONS[diceStyle] || DICE_SIDES_OPTIONS.digits;
        if (options.indexOf(diceSidesValue) === -1) {
            diceSidesValue = options[options.length - 1];
        }
        diceSidesRow.innerHTML = '';
        var i, btn;
        for (i = 0; i < options.length; i++) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pillBtn' + (options[i] === diceSidesValue ? ' active' : '');
            btn.textContent = options[i];
            btn.setAttribute('data-sides', options[i]);
            bindAction(btn, makeSidesHandler(options[i]));
            diceSidesRow.appendChild(btn);
        }
    }

    function makeSidesHandler(value) {
        return function() {
            diceSidesValue = value;
            updateSidesActive();
            persistDiceOptions();
        };
    }

    function updateSidesActive() {
        var buttons = diceSidesRow.querySelectorAll('.pillBtn');
        var i;
        for (i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle('active', parseInt(buttons[i].getAttribute('data-sides'), 10) === diceSidesValue);
        }
    }

    function setDiceStyle(style) {
        diceStyle = style;
        if (style === 'hands') { preloadHands(); }
        var i, btn, isActive;
        for (i = 0; i < diceStyleButtons.length; i++) {
            btn = diceStyleButtons[i];
            isActive = btn.getAttribute('data-style') === style;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
        buildSidesRow();
        if (!isDiceRolling) { renderDicePlaceholders(diceCount); }
        persistDiceOptions();
    }

    function persistDiceOptions() {
        try {
            localStorage.setItem('randomizer_dice_style', diceStyle);
            localStorage.setItem('randomizer_dice_count', String(diceCount));
            localStorage.setItem('randomizer_dice_sides', String(diceSidesValue));
        } catch (e) {}
    }

    function startDiceRoll() {
        if (isDiceRolling) { return; }
        isDiceRolling = true;
        diceRollButton.disabled = true;
        diceTotal.hidden = true;
        diceStatusText.textContent = 'Lancer en cours…';

        var sides = diceSidesValue;
        var count = diceCount;
        var finalValues = rollValues(count, sides);
        var tiles = createDroppingTiles(count);
        updateTiles(tiles, rollValues(count, sides));
        var duration = 700;
        var start = new Date().getTime();

        function tick() {
            var now = new Date().getTime();
            var elapsed = now - start;
            var progress = elapsed / duration;
            if (progress >= 1) {
                finishDiceRoll(finalValues, sides, tiles);
                return;
            }
            updateTiles(tiles, rollValues(count, sides));
            var delay = 40 + Math.pow(progress, 2) * 110;
            setTimeout(tick, delay);
        }
        setTimeout(tick, 90);
    }

    function finishDiceRoll(values, sides, tiles) {
        updateTiles(tiles, values);
        var i;
        for (i = 0; i < tiles.length; i++) {
            tiles[i].classList.remove('dropping');
            tiles[i].classList.add('landed');
        }
        isDiceRolling = false;
        diceRollButton.disabled = false;

        var total = 0;
        for (i = 0; i < values.length; i++) {
            total += values[i];
        }

        if (values.length > 1) {
            diceTotal.hidden = false;
            diceTotalValue.textContent = total;
        }
        diceStatusText.textContent = 'Résultat du lancer';

        if (confettiToggle.checked) {
            launchConfetti(document.getElementById('diceResultCard'));
        }

        var label = values.length + '×D' + sides + ' → ' + values.join(', ') +
            (values.length > 1 ? ' (total ' + total + ')' : '');
        addHistoryEntry(label, 'dice');
    }

    // ---- Images ----

    // Images are held in memory only (object URLs): they must be chosen again after a reload.
    function isImageCandidate(file) {
        return /^image\//.test(file.type || '') || IMAGE_EXTENSIONS.test(file.name);
    }

    function fileExtension(name) {
        var m = /\.([^.]+)$/.exec(name);
        return m ? m[1].toLowerCase() : '';
    }

    function imageDisplayName(name) {
        return name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').replace(/^\s+|\s+$/g, '') || name;
    }

    function rejectReason(name) {
        var ext = fileExtension(name);
        if (ext === 'heic' || ext === 'heif') { return 'photo iPhone HEIC, lisible seulement dans Safari : à convertir en JPG'; }
        if (ext === 'tif' || ext === 'tiff') { return 'TIFF, lisible seulement dans Safari : à convertir en JPG ou PNG'; }
        return 'fichier illisible ou format non pris en charge';
    }

    // Downscaled copy for the carousel: dozens of full-size phone photos would make it stutter.
    function makeThumb(img, file, done) {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        // SVG stays vector; images without intrinsic size cannot be drawn on a canvas.
        if (!w || !h || /svg/i.test(file.type) || fileExtension(file.name) === 'svg') { done(null); return; }
        var scale = Math.min(1, THUMB_MAX / Math.max(w, h));
        if (scale === 1 && file.size < 300000) { done(null); return; }
        try {
            var canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(w * scale));
            canvas.height = Math.max(1, Math.round(h * scale));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            var type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
            canvas.toBlob(function(blob) {
                done(blob ? URL.createObjectURL(blob) : null);
            }, type, 0.85);
        } catch (e) {
            done(null);
        }
    }

    function loadImageFile(file, done) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function() {
            var w = img.naturalWidth;
            var h = img.naturalHeight;
            makeThumb(img, file, function(thumbUrl) {
                done({
                    name: imageDisplayName(file.name),
                    url: url,
                    thumb: thumbUrl || url,
                    ratio: w && h ? w / h : 1,
                    drawn: false
                });
            });
        };
        img.onerror = function() {
            URL.revokeObjectURL(url);
            done(null);
        };
        img.src = url;
    }

    function releaseImages() {
        var i;
        for (i = 0; i < images.length; i++) {
            if (images[i].thumb !== images[i].url) { URL.revokeObjectURL(images[i].thumb); }
            URL.revokeObjectURL(images[i].url);
        }
        images = [];
    }

    function availableImages() {
        var pool = [];
        var i;
        for (i = 0; i < images.length; i++) {
            if (!images[i].drawn) { pool.push(images[i]); }
        }
        return pool;
    }

    function setImageButtonsDisabled(disabled) {
        btnImageFolder.disabled = disabled;
        btnImageFiles.disabled = disabled;
        btnImageReset.disabled = disabled;
        btnImageClear.disabled = disabled;
        imageDrawButton.disabled = disabled;
    }

    function importImageFiles(fileList) {
        if (isImageRolling || isImageLoading) { return; }
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) { return; }
        var candidates = [];
        var ignored = 0;
        var i;
        for (i = 0; i < files.length; i++) {
            // Hidden system files (.DS_Store, ._photo.jpg from macOS) are skipped.
            if (files[i].name.charAt(0) !== '.' && isImageCandidate(files[i])) {
                candidates.push(files[i]);
            } else {
                ignored++;
            }
        }
        candidates.sort(function(a, b) {
            return (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, 'fr', { numeric: true });
        });
        var overLimit = Math.max(0, candidates.length - IMAGE_LIMIT);
        candidates = candidates.slice(0, IMAGE_LIMIT);

        if (!candidates.length) {
            showImageReport('alert-error', 'Aucune image trouvée' + (ignored ? ' (' + ignored + ' fichier' + (ignored > 1 ? 's' : '') + ' d’un autre type).' : '.'), []);
            notify('Aucune image trouvée.', 'error');
            return;
        }

        releaseImages();
        isImageLoading = true;
        setImageButtonsDisabled(true);
        imageMode = 'empty';
        renderImageStage();
        imageCaption.hidden = true;

        var total = candidates.length;
        var loaded = new Array(total);
        var rejected = [];
        var next = 0;
        var finished = 0;
        imageStatusText.textContent = 'Chargement des images… 0 / ' + total;

        function launch() {
            if (next >= total) { return; }
            var index = next++;
            var file = candidates[index];
            loadImageFile(file, function(entry) {
                if (entry) {
                    loaded[index] = entry;
                } else {
                    rejected.push({ name: file.name, reason: rejectReason(file.name) });
                }
                finished++;
                imageStatusText.textContent = 'Chargement des images… ' + finished + ' / ' + total;
                if (finished === total) {
                    finishImport(loaded, rejected, ignored, overLimit);
                } else {
                    launch();
                }
            });
        }
        for (i = 0; i < 4; i++) { launch(); }
    }

    function finishImport(loaded, rejected, ignored, overLimit) {
        var i;
        images = [];
        for (i = 0; i < loaded.length; i++) {
            if (loaded[i]) { images.push(loaded[i]); }
        }
        isImageLoading = false;
        setImageButtonsDisabled(false);

        var lines = [];
        if (ignored) { lines.push(ignored + ' fichier' + (ignored > 1 ? 's' : '') + ' d’un autre type ignoré' + (ignored > 1 ? 's' : '') + '.'); }
        if (overLimit) { lines.push('Limite de ' + IMAGE_LIMIT + ' images atteinte : ' + overLimit + ' non chargée' + (overLimit > 1 ? 's' : '') + '.'); }
        var head = images.length + ' image' + (images.length > 1 ? 's' : '') + ' prête' + (images.length > 1 ? 's' : '') + '.';
        if (rejected.length) {
            head += ' ' + rejected.length + ' écartée' + (rejected.length > 1 ? 's' : '') + ' :';
        }
        rejected.sort(function(a, b) { return a.name.localeCompare(b.name, 'fr', { numeric: true }); });
        var details = [];
        for (i = 0; i < rejected.length && i < 6; i++) {
            details.push(rejected[i].name + ' — ' + rejected[i].reason);
        }
        if (rejected.length > 6) { details.push('… et ' + (rejected.length - 6) + ' autre(s).'); }
        showImageReport(rejected.length || overLimit ? 'alert-warning' : 'alert-info', head, details, lines);

        renderImageThumbs();
        updateImageCount();
        imageMode = images.length ? 'idle' : 'empty';
        renderImageStage();
        if (images.length) {
            imageStatusText.textContent = 'Prêt pour le tirage.';
            notify(images.length + ' image' + (images.length > 1 ? 's' : '') + ' chargée' + (images.length > 1 ? 's' : '') + '.', rejected.length ? 'info' : 'success');
        } else {
            imageStatusText.textContent = 'Aucune image lisible. Consulte les formats acceptés.';
            notify('Aucune image lisible.', 'error');
        }
    }

    function showImageReport(kind, head, details, lines) {
        imageReport.className = 'alert importReport ' + kind;
        imageReport.innerHTML = '';
        var p = document.createElement('p');
        p.textContent = head;
        imageReport.appendChild(p);
        var i, li;
        if (details.length) {
            var ul = document.createElement('ul');
            for (i = 0; i < details.length; i++) {
                li = document.createElement('li');
                li.textContent = details[i];
                ul.appendChild(li);
            }
            imageReport.appendChild(ul);
        }
        for (i = 0; lines && i < lines.length; i++) {
            p = document.createElement('p');
            p.textContent = lines[i];
            imageReport.appendChild(p);
        }
        imageReport.hidden = false;
    }

    function renderImageThumbs() {
        imageThumbs.innerHTML = '';
        imageThumbs.hidden = !images.length;
        var i, li, img;
        for (i = 0; i < images.length; i++) {
            li = document.createElement('li');
            li.className = images[i].drawn ? 'drawn' : '';
            li.title = images[i].name;
            img = document.createElement('img');
            img.src = images[i].thumb;
            img.alt = images[i].name;
            img.loading = 'lazy';
            li.appendChild(img);
            imageThumbs.appendChild(li);
        }
    }

    function updateImageCount() {
        var remaining = availableImages().length;
        var total = images.length;
        imageCountBadge.textContent = remaining === total
            ? total + (total > 1 ? ' images' : ' image')
            : remaining + ' / ' + total + ' images';
    }

    function updateImageDuration() {
        imageDurationValue.textContent = imageDurationRange.value;
    }

    // Square tiles sized from the stage height, leaving neighbours visible on narrow screens.
    function sizeImageStage() {
        var w = imageStage.clientWidth;
        var h = imageStage.clientHeight;
        if (!w || !h) { return null; } // hidden tab: sized again when shown
        var size = Math.floor(Math.min(h * 0.8, w * 0.55, 380));
        var gap = Math.max(8, Math.round(size * 0.08));
        imageStage.style.setProperty('--tileSize', size + 'px');
        imageStage.style.setProperty('--tileGap', gap + 'px');
        return { size: size, gap: gap, width: w };
    }

    function randomImageSequence(pool, length) {
        var seq = [];
        var i, pick;
        for (i = 0; i < length; i++) {
            pick = pool[Math.floor(Math.random() * pool.length)];
            if (pool.length > 1 && i > 0 && pick === seq[i - 1]) {
                pick = pool[(pool.indexOf(pick) + 1) % pool.length];
            }
            seq.push(pick);
        }
        return seq;
    }

    function buildImageStrip(sequence) {
        var strip = document.createElement('div');
        strip.className = 'imageStrip';
        var i, tile, img;
        for (i = 0; i < sequence.length; i++) {
            tile = document.createElement('div');
            tile.className = 'imageTile';
            img = document.createElement('img');
            img.src = sequence[i].thumb;
            img.alt = '';
            img.draggable = false;
            tile.appendChild(img);
            strip.appendChild(tile);
        }
        return strip;
    }

    function stripOffset(index, dims) {
        return index * (dims.size + dims.gap) + dims.size / 2 - dims.width / 2;
    }

    function renderImageStage() {
        imageStage.innerHTML = '';
        imageStage.classList.remove('carousel');
        if (imageMode === 'idle') {
            var pool = availableImages();
            var dims = sizeImageStage();
            if (!dims || !pool.length) { return; }
            var visible = Math.ceil(dims.width / (dims.size + dims.gap)) + 2;
            var strip = buildImageStrip(randomImageSequence(pool, visible));
            imageStage.classList.add('carousel');
            imageStage.appendChild(strip);
            strip.style.transform = 'translate3d(' + (-stripOffset(Math.floor(visible / 2), dims)) + 'px,0,0)';
        } else if (imageMode === 'final' && lastImage) {
            showFinalImage(lastImage, false);
        }
    }

    function showFinalImage(entry, animate) {
        imageStage.innerHTML = '';
        imageStage.classList.remove('carousel');
        var frame = document.createElement('div');
        frame.className = 'imageFinal' + (animate ? ' winner' : '');
        frame.style.aspectRatio = String(entry.ratio);
        var img = document.createElement('img');
        img.src = entry.url;
        img.alt = entry.name;
        frame.appendChild(img);
        imageStage.appendChild(frame);
        imageCaption.textContent = entry.name;
        imageCaption.hidden = !showImageNameToggle.checked;
    }

    function startImageDraw() {
        if (isImageRolling || isImageLoading) { return; }
        if (!images.length) {
            imageStatusText.textContent = 'Choisis d’abord un dossier d’images.';
            return;
        }
        var pool = availableImages();
        if (!pool.length) {
            imageStatusText.textContent = 'Toutes les images ont été tirées. Clique sur « Réinitialiser ».';
            return;
        }

        var winner = pool[Math.floor(Math.random() * pool.length)];
        var reduced = document.documentElement.getAttribute('data-motion') === 'reduce';
        var dims = sizeImageStage();
        if (reduced || !dims) {
            finishImageDraw(winner);
            return;
        }

        isImageRolling = true;
        setImageButtonsDisabled(true);
        imageCaption.hidden = true;
        imageStatusText.textContent = 'Tirage en cours…';

        var duration = parseInt(imageDurationRange.value, 10) * 1000;
        var half = Math.ceil(dims.width / (dims.size + dims.gap) / 2) + 1;
        var winnerIndex = half + Math.round(duration / 1000 * 9);
        var sequence = randomImageSequence(pool, winnerIndex + half + 1);
        sequence[winnerIndex] = winner;
        // Neighbours differ from the winner so the stop is unambiguous.
        if (pool.length > 1) {
            var others = pool.filter(function(p) { return p !== winner; });
            if (sequence[winnerIndex - 1] === winner) { sequence[winnerIndex - 1] = others[0]; }
            if (sequence[winnerIndex + 1] === winner) { sequence[winnerIndex + 1] = others[others.length - 1]; }
        }

        imageStage.innerHTML = '';
        imageStage.classList.add('carousel');
        var strip = buildImageStrip(sequence);
        imageStage.appendChild(strip);

        var from = stripOffset(half, dims);
        var to = stripOffset(winnerIndex, dims);
        var start = null;

        function frame(now) {
            if (start === null) { start = now; }
            var progress = Math.min(1, (now - start) / duration);
            var eased = 1 - Math.pow(1 - progress, 4);
            strip.style.transform = 'translate3d(' + (-(from + (to - from) * eased)) + 'px,0,0)';
            if (progress < 1) {
                requestAnimationFrame(frame);
                return;
            }
            strip.children[winnerIndex].classList.add('selected');
            setTimeout(function() { finishImageDraw(winner); }, 550);
        }
        requestAnimationFrame(frame);
    }

    function finishImageDraw(winner) {
        isImageRolling = false;
        setImageButtonsDisabled(false);
        lastImage = winner;
        imageMode = 'final';
        showFinalImage(winner, true);
        imageStatusText.textContent = 'Image tirée';
        if (confettiToggle.checked) {
            launchConfetti(imageResultCard);
        }
        addHistoryEntry(winner.name, 'images');
        if (removeImageToggle.checked) {
            winner.drawn = true;
            renderImageThumbs();
            updateImageCount();
        }
    }

    function resetImages() {
        if (isImageRolling || isImageLoading) { return; }
        var i;
        for (i = 0; i < images.length; i++) { images[i].drawn = false; }
        lastImage = null;
        imageCaption.hidden = true;
        imageMode = images.length ? 'idle' : 'empty';
        renderImageThumbs();
        updateImageCount();
        renderImageStage();
        imageStatusText.textContent = images.length ? 'Prêt pour le tirage.' : 'Choisis un dossier d’images pour commencer.';
        notify(images.length ? 'Toutes les images sont remises en jeu.' : 'Rien à réinitialiser.', 'info');
    }

    function clearImages() {
        if (isImageRolling || isImageLoading) { return; }
        releaseImages();
        lastImage = null;
        imageMode = 'empty';
        imageCaption.hidden = true;
        imageReport.hidden = true;
        renderImageThumbs();
        updateImageCount();
        renderImageStage();
        imageStatusText.textContent = 'Choisis un dossier d’images pour commencer.';
        notify('Images retirées.', 'info');
    }

    function persistImageOptions() {
        try {
            localStorage.setItem('randomizer_image_remove', removeImageToggle.checked ? '1' : '0');
            localStorage.setItem('randomizer_image_show_name', showImageNameToggle.checked ? '1' : '0');
            localStorage.setItem('randomizer_image_duration', imageDurationRange.value);
        } catch (e) {}
    }

    // ---- Shared: confetti ----

    function launchConfetti(anchorEl) {
        var colors = ['#2563eb', '#34c768', '#f5a623', '#f46274', '#9c7bff', '#f170b0'];
        var layerRect = confettiLayer.getBoundingClientRect();
        var cardRect = anchorEl ? anchorEl.getBoundingClientRect() : layerRect;
        var centerX = (cardRect.left - layerRect.left) + cardRect.width / 2;
        var centerY = (cardRect.top - layerRect.top) + cardRect.height / 2;
        var count = 60;
        var i, c, angle, peakDistance, peakX, peakY, dx, dy, rot, size, duration, delay;
        confettiLayer.innerHTML = '';
        for (i = 0; i < count; i++) {
            c = document.createElement('div');
            c.className = 'confetti ' + (Math.random() < 0.5 ? 'round' : 'square');

            // Upward burst that then falls, like a firework arc.
            angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
            peakDistance = 55 + Math.random() * 95;
            peakX = Math.cos(angle) * peakDistance;
            peakY = Math.sin(angle) * peakDistance;
            dx = peakX + (Math.random() - 0.5) * 70;
            dy = peakY + 170 + Math.random() * 150;
            rot = (Math.random() * 620 - 310) + 'deg';
            size = 7 + Math.random() * 7;
            duration = 1200 + Math.random() * 500;
            delay = Math.random() * 160;

            c.style.left = centerX + 'px';
            c.style.top = centerY + 'px';
            c.style.width = size + 'px';
            c.style.height = (size * 1.4) + 'px';
            c.style.background = colors[i % colors.length];
            c.style.setProperty('--peakX', peakX + 'px');
            c.style.setProperty('--peakY', peakY + 'px');
            c.style.setProperty('--dx', dx + 'px');
            c.style.setProperty('--dy', dy + 'px');
            c.style.setProperty('--rot', rot);
            c.style.animationDuration = duration + 'ms';
            c.style.animationDelay = delay + 'ms';
            confettiLayer.appendChild(c);
        }
        clearTimeout(confettiTimer);
        confettiTimer = setTimeout(function() {
            confettiLayer.innerHTML = '';
        }, 2100);
    }

    // ---- Shared: history ----

    function persistOptions() {
        try {
            localStorage.setItem('randomizer_remove_drawn', removeDrawnToggle.checked ? '1' : '0');
            localStorage.setItem('randomizer_show_history', showHistoryToggle.checked ? '1' : '0');
            localStorage.setItem('randomizer_confetti_enabled', confettiToggle.checked ? '1' : '0');
        } catch (e) {}
    }

    function persistHistory() {
        try { localStorage.setItem('randomizer_history', JSON.stringify(history)); } catch (e) {}
    }

    function formatTime(timestamp) {
        var d = new Date(timestamp);
        var h = d.getHours();
        var m = d.getMinutes();
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (!history.length) {
            var empty = document.createElement('li');
            empty.className = 'historyEmpty';
            empty.textContent = "Aucun tirage pour l'instant.";
            historyList.appendChild(empty);
            return;
        }
        var i, item, entry, nameEl, timeEl;
        for (i = 0; i < history.length; i++) {
            entry = history[i];
            item = document.createElement('li');
            item.setAttribute('data-kind', entry.kind || 'names');
            nameEl = document.createElement('span');
            nameEl.className = 'historyName';
            nameEl.textContent = entry.label !== undefined ? entry.label : entry.name;
            nameEl.title = nameEl.textContent;
            timeEl = document.createElement('span');
            timeEl.className = 'historyTime';
            timeEl.textContent = formatTime(entry.time);
            item.appendChild(nameEl);
            item.appendChild(timeEl);
            historyList.appendChild(item);
        }
    }

    function addHistoryEntry(label, kind) {
        history.unshift({ label: label, kind: kind, time: new Date().getTime() });
        if (history.length > HISTORY_LIMIT) {
            history.length = HISTORY_LIMIT;
        }
        persistHistory();
        renderHistory();
    }

    function updateHistoryVisibility() {
        historyPanel.hidden = !showHistoryToggle.checked;
        layout.classList.toggle('noHistory', historyPanel.hidden);
        refreshSizes();
    }

    // ---- Wiring ----

    bindAction(drawButton, startDraw);
    bindAction(diceRollButton, startDiceRoll);
    bindAction(imageDrawButton, startImageDraw);
    bindAction(btnImageFolder, function() { imageFolderInput.click(); });
    bindAction(btnImageFiles, function() { imageFilesInput.click(); });
    bindAction(btnImageReset, resetImages);
    bindAction(btnImageClear, clearImages);

    imageFolderInput.addEventListener('change', function() {
        importImageFiles(imageFolderInput.files);
        imageFolderInput.value = '';
    }, false);
    imageFilesInput.addEventListener('change', function() {
        importImageFiles(imageFilesInput.files);
        imageFilesInput.value = '';
    }, false);
    imageDurationRange.addEventListener('input', function() {
        updateImageDuration();
        persistImageOptions();
    }, false);
    removeImageToggle.addEventListener('change', persistImageOptions, false);
    showImageNameToggle.addEventListener('change', function() {
        persistImageOptions();
        if (imageMode === 'final' && !isImageRolling) { imageCaption.hidden = !showImageNameToggle.checked; }
    }, false);

    for (var s = 0; s < diceStyleButtons.length; s++) {
        bindAction(diceStyleButtons[s], function() {
            setDiceStyle(this.getAttribute('data-style'));
        });
    }

    var miniPipPreview = document.querySelector('.miniPipFace');
    if (miniPipPreview) { miniPipPreview.innerHTML = buildPipMarkup(5); }

    bindAction(btnClear, function() {
        if (isRolling) { return; }
        nameList.value = '';
        updateCount();
        resultName.textContent = '—';
        statusText.textContent = 'Ajoute une liste, puis lance le tirage.';
        try { localStorage.removeItem('randomizer_names'); } catch (e) {}
        notify('Liste vidée.', 'info');
    });
    bindAction(btnImport, function() {
        if (fileImport && fileImport.click) { fileImport.click(); }
    });
    bindAction(btnClearHistory, function() {
        history = [];
        persistHistory();
        renderHistory();
        notify('Historique effacé.', 'info');
    });

    if (nameList.addEventListener) {
        nameList.addEventListener('input', updateCount, false);
        nameList.addEventListener('keyup', updateCount, false);
    }

    if (durationRange.addEventListener) {
        durationRange.addEventListener('input', updateDuration, false);
        durationRange.addEventListener('change', updateDuration, false);
    }

    if (removeDrawnToggle.addEventListener) {
        removeDrawnToggle.addEventListener('change', persistOptions, false);
    }

    if (showHistoryToggle.addEventListener) {
        showHistoryToggle.addEventListener('change', function() {
            persistOptions();
            updateHistoryVisibility();
        }, false);
    }

    if (confettiToggle.addEventListener) {
        confettiToggle.addEventListener('change', persistOptions, false);
    }

    if (fileImport.addEventListener) {
        fileImport.addEventListener('change', function() {
            var file = fileImport.files && fileImport.files[0];
            if (!file) { return; }
            var reader = new FileReader();
            var encoding = 'UTF-8';
            reader.onload = function(evt) {
                var text = evt.target.result || '';
                // Files saved by Excel/Notepad on Windows are often Windows-1252:
                // decoding them as UTF-8 yields U+FFFD in place of accented letters.
                if (encoding === 'UTF-8' && text.indexOf('\uFFFD') !== -1) {
                    encoding = 'windows-1252';
                    reader.readAsText(file, encoding);
                    return;
                }
                nameList.value = text;
                updateCount();
                statusText.textContent = 'Liste importée. Prêt pour le tirage.';
                resultName.textContent = '—';
                notify('Liste importée avec succès.', 'success');
            };
            reader.readAsText(file, 'UTF-8');
            fileImport.value = '';
        }, false);
    }

    try {
        var saved = localStorage.getItem('randomizer_names');
        if (saved) {
            nameList.value = saved;
        }
        removeDrawnToggle.checked = localStorage.getItem('randomizer_remove_drawn') === '1';
        var savedShowHistory = localStorage.getItem('randomizer_show_history');
        showHistoryToggle.checked = savedShowHistory === null ? true : savedShowHistory === '1';
        var savedConfetti = localStorage.getItem('randomizer_confetti_enabled');
        confettiToggle.checked = savedConfetti === null ? true : savedConfetti === '1';
        var savedHistory = localStorage.getItem('randomizer_history');
        if (savedHistory) {
            history = JSON.parse(savedHistory) || [];
        }
        var savedDiceStyle = localStorage.getItem('randomizer_dice_style');
        if (savedDiceStyle === 'pips' || savedDiceStyle === 'digits' || savedDiceStyle === 'hands') {
            diceStyle = savedDiceStyle;
        }
        var savedDiceCount = parseInt(localStorage.getItem('randomizer_dice_count'), 10);
        if (savedDiceCount >= DICE_MIN && savedDiceCount <= DICE_MAX) {
            diceCount = savedDiceCount;
        }
        var savedDiceSides = parseInt(localStorage.getItem('randomizer_dice_sides'), 10);
        if (savedDiceSides) {
            diceSidesValue = savedDiceSides;
        }
        removeImageToggle.checked = localStorage.getItem('randomizer_image_remove') === '1';
        showImageNameToggle.checked = localStorage.getItem('randomizer_image_show_name') !== '0';
        var savedImageDuration = parseInt(localStorage.getItem('randomizer_image_duration'), 10);
        if (savedImageDuration >= 3 && savedImageDuration <= 7) {
            imageDurationRange.value = savedImageDuration;
        }
    } catch (e) {}

    var initialTab = 'names';
    try {
        var savedTab = localStorage.getItem('randomizer_active_tab');
        if (savedTab === 'names' || savedTab === 'dice' || savedTab === 'images') {
            initialTab = savedTab;
        }
    } catch (e) {}

    updateCount();
    updateDuration();
    updateImageDuration();
    updateImageCount();
    updateHistoryVisibility();
    renderHistory();
    setDiceStyle(diceStyle);
    buildCountRow();
    renderDicePlaceholders(diceCount);
    switchTab(initialTab);
    updateFullscreenIcon();
})();
