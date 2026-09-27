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
    var removeDrawnOption = document.getElementById('removeDrawnOption');
    var namesTopActions = document.getElementById('namesTopActions');
    var showHistoryToggle = document.getElementById('showHistoryToggle');
    var confettiToggle = document.getElementById('confettiToggle');
    var historyPanel = document.getElementById('historyPanel');
    var historyList = document.getElementById('historyList');
    var btnClearHistory = document.getElementById('btnClearHistory');
    var tabButtons = document.querySelectorAll('.tabButton');
    var tabPanels = document.querySelectorAll('.tabPanel');
    var notifBanner = document.getElementById('notifBanner');
    var btnFullscreen = document.getElementById('btnFullscreen');
    var appEl = document.getElementById('app');
    var notifTimer = null;

    var diceCountRow = document.getElementById('diceCountRow');
    var diceSidesRow = document.getElementById('diceSidesRow');
    var diceStyleButtons = document.querySelectorAll('.pillBtn.iconPill[data-style]');
    var diceRollButton = document.getElementById('diceRollButton');
    var diceFaces = document.getElementById('diceFaces');
    var diceStatusText = document.getElementById('diceStatusText');
    var diceTotal = document.getElementById('diceTotal');
    var diceTotalValue = document.getElementById('diceTotalValue');

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

    function bindAction(element, action) {
        var el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) { return; }
        function handler(e) {
            e = e || window.event;
            if (e.type === 'keydown') {
                var key = e.which || e.keyCode;
                if (key !== 13 && key !== 32) { return; }
            }
            if (e.type === 'touchstart') {
                el._touchDone = true;
            } else if (e.type === 'click' && el._touchDone) {
                el._touchDone = false;
                if (e.preventDefault) { e.preventDefault(); }
                return false;
            }
            if (e.preventDefault) { e.preventDefault(); }
            action.call(el, e);
            return false;
        }
        el.addEventListener('click', handler, false);
        el.addEventListener('touchstart', handler, false);
        el.addEventListener('keydown', handler, false);
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
        var isNames = tabName === 'names';
        removeDrawnOption.hidden = !isNames;
        namesTopActions.hidden = !isNames;
        if (!isNames && !isDiceRolling) {
            sizeDiceTiles(diceCount);
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

    // ---- Keyboard shortcuts ----

    document.addEventListener('keydown', function(e) {
        var tag = document.activeElement ? document.activeElement.tagName : '';
        var isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        if (e.key === 'Escape' && isFullscreenActive()) {
            toggleFullscreen();
            return;
        }

        if (isTyping || tag === 'BUTTON') { return; }

        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
            var activeTabBtn = document.querySelector('.tabButton.active');
            var activeTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'names';
            e.preventDefault();
            if (activeTab === 'dice') {
                startDiceRoll();
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
        countBadge.innerHTML = names.length + (names.length > 1 ? ' noms' : ' nom');
        try { localStorage.setItem('randomizer_names', nameList.value); } catch (e) {}
    }

    function updateDuration() {
        durationValue.innerHTML = durationRange.value;
    }

    function chooseRandom(names) {
        return names[Math.floor(Math.random() * names.length)];
    }

    function startDraw() {
        if (isRolling) { return; }
        var names = parseNames();
        if (!names.length) {
            resultName.className = '';
            resultName.innerHTML = '—';
            statusText.innerHTML = 'Colle ou importe une liste avant de lancer.';
            return;
        }

        isRolling = true;
        drawButton.disabled = true;
        resultName.className = 'rolling';
        statusText.innerHTML = 'Tirage en cours…';

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
            resultName.innerHTML = chooseRandom(names);
            var delay = 38 + Math.pow(progress, 2.4) * 190;
            setTimeout(tick, delay);
        }
        tick();
    }

    function finishDraw(name) {
        resultName.innerHTML = name;
        resultName.className = 'winner';
        statusText.innerHTML = 'Résultat du tirage';
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
        return '<img class="handImg" src="assets/dice-hands/' + clamped + '.png" alt="' + clamped + '">';
    }

    function buildFaceInner(value, style) {
        if (style === 'pips') { return buildPipMarkup(value); }
        if (style === 'hands') { return buildHandMarkup(value); }
        return String(value);
    }

    function sizeDiceTiles(count) {
        var containerWidth = diceFaces.clientWidth || 300;
        var containerHeight = diceFaces.clientHeight || 160;
        var gap = 14;
        var perRow = count;
        var maxRows = Math.ceil(count / perRow);
        var byWidth = (containerWidth - gap * (perRow - 1)) / perRow;
        var byHeight = (containerHeight - gap * (maxRows - 1)) / maxRows;
        var size = Math.max(56, Math.min(130, byWidth, byHeight));
        diceFaces.style.setProperty('--dieSize', size + 'px');
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
        var placeholderValue = diceStyle === 'digits' ? '–' : 0;
        var values = [];
        var i;
        for (i = 0; i < count; i++) {
            values.push(placeholderValue);
        }
        renderDiceFaces(values, false);
        diceTotal.hidden = true;
        diceStatusText.innerHTML = 'Prêt à lancer les dés.';
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
        diceStatusText.innerHTML = 'Lancer en cours…';

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
        var i;
        for (i = 0; i < values.length; i++) {
            total += values[i];
        }

        if (values.length > 1) {
            diceTotal.hidden = false;
            diceTotalValue.innerHTML = total;
        }
        diceStatusText.innerHTML = 'Résultat du lancer';

        if (confettiToggle.checked) {
            launchConfetti(document.getElementById('diceResultCard'));
        }

        var label = values.length + '×D' + sides + ' → ' + values.join(', ') +
            (values.length > 1 ? ' (total ' + total + ')' : '');
        addHistoryEntry(label, 'dice');
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
        setTimeout(function() {
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
    }

    // ---- Wiring ----

    bindAction(drawButton, startDraw);
    bindAction(diceRollButton, startDiceRoll);

    for (var s = 0; s < diceStyleButtons.length; s++) {
        bindAction(diceStyleButtons[s], function() {
            setDiceStyle(this.getAttribute('data-style'));
        });
    }

    var miniPipPreview = document.querySelector('.miniPipFace');
    if (miniPipPreview) { miniPipPreview.innerHTML = buildPipMarkup(5); }
    var miniHandPreview = document.querySelector('.miniHand');
    if (miniHandPreview) { miniHandPreview.innerHTML = buildHandMarkup(5); }

    bindAction(btnClear, function() {
        if (isRolling) { return; }
        nameList.value = '';
        updateCount();
        resultName.innerHTML = '—';
        statusText.innerHTML = 'Ajoute une liste, puis lance le tirage.';
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
            reader.onload = function(evt) {
                nameList.value = evt.target.result || '';
                updateCount();
                statusText.innerHTML = 'Liste importée. Prêt pour le tirage.';
                resultName.innerHTML = '—';
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
    } catch (e) {}

    var initialTab = 'names';
    try {
        var savedTab = localStorage.getItem('randomizer_active_tab');
        if (savedTab === 'names' || savedTab === 'dice') {
            initialTab = savedTab;
        }
    } catch (e) {}

    updateCount();
    updateDuration();
    updateHistoryVisibility();
    renderHistory();
    setDiceStyle(diceStyle);
    buildCountRow();
    renderDicePlaceholders(diceCount);
    switchTab(initialTab);
    updateFullscreenIcon();
})();
