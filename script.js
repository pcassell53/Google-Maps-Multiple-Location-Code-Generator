(function () {
    'use strict';

    let locationCount = 0;

    const els = {
        locationsWrap: document.getElementById('gmgenLocations'),
        addLocation: document.getElementById('gmgenAddLocation'),
        loadSample: document.getElementById('gmgenLoadSample'),
        generate: document.getElementById('gmgenGenerate'),
        output: document.getElementById('gmgenOutput'),
        copyTop: document.getElementById('gmgenCopy'),
        copyBottom: document.getElementById('gmgenCopyBottom'),
        clear: document.getElementById('gmgenClear'),
        formStatus: document.getElementById('gmgenFormStatus'),
        copyStatus: document.getElementById('gmgenCopyStatus'),
        refreshPreview: document.getElementById('gmgenRefreshPreview'),
        preview: document.getElementById('gmgenPreview'),
        widgetTitle: document.getElementById('gmgenWidgetTitle'),
        widgetIntro: document.getElementById('gmgenWidgetIntro'),
        kickerText: document.getElementById('gmgenKickerText'),
        placeholderTitle: document.getElementById('gmgenPlaceholderTitle'),
        placeholderCopy: document.getElementById('gmgenPlaceholderCopy'),
        mapHeight: document.getElementById('gmgenMapHeight'),
        autoLoadFirst: document.getElementById('gmgenAutoLoadFirst')
    };

    function setStatus(target, message) {
        if (!target) {
            return;
        }

        target.textContent = message;

        window.setTimeout(function () {
            if (target.textContent === message) {
                target.textContent = '';
            }
        }, 3500);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safeScriptJson(value) {
        return JSON.stringify(value)
            .replace(/<\//g, '<\\/')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
    }

    function normalizeUrl(url) {
        let cleanUrl = String(url || '').trim();

        if (!cleanUrl) {
            return '';
        }

        if (!/^https?:\/\//i.test(cleanUrl)) {
            cleanUrl = 'https://' + cleanUrl;
        }

        return cleanUrl;
    }

    function buildMapUrl(name, address) {
        const query = `${name} ${address}`.trim();
        return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    }

    function buildDirectionsUrl(name, address) {
        const query = `${name} ${address}`.trim();
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }

    function createLocationCard(data) {
        locationCount += 1;

        const card = document.createElement('div');
        const removeButton = document.createElement('button');
        const heading = document.createElement('h4');

        card.className = 'gmgen-location-card';
        card.setAttribute('data-gmgen-location-card', 'true');

        removeButton.className = 'gmgen-location-remove';
        removeButton.type = 'button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', function () {
            card.remove();
            updateLocationHeadings();
            renderPreviewFromForm(false);
        });

        heading.textContent = `Location ${locationCount}`;

        card.innerHTML = `
            <div class="gmgen-field">
                <label>Dealership Name</label>
                <input type="text" data-gmgen-name placeholder="Example: Koons Ford of Baltimore">
            </div>
            <div class="gmgen-field">
                <label>Full Address</label>
                <input type="text" data-gmgen-address placeholder="Example: 6970 Security Blvd, Baltimore, MD 21244">
                <span class="gmgen-note">The generated widget uses this address to create the Google Maps embed and directions links.</span>
            </div>
            <div class="gmgen-field">
                <label>Website URL, optional</label>
                <input type="url" data-gmgen-website placeholder="Example: https://www.exampledealer.com/">
            </div>
        `;

        card.prepend(heading);
        card.prepend(removeButton);
        els.locationsWrap.appendChild(card);

        if (data) {
            card.querySelector('[data-gmgen-name]').value = data.name || '';
            card.querySelector('[data-gmgen-address]').value = data.address || '';
            card.querySelector('[data-gmgen-website]').value = data.website || '';
        }

        card.addEventListener('input', function () {
            renderPreviewFromForm(false);
        });

        updateLocationHeadings();
    }

    function updateLocationHeadings() {
        const cards = els.locationsWrap.querySelectorAll('[data-gmgen-location-card]');

        cards.forEach(function (card, index) {
            const heading = card.querySelector('h4');

            if (heading) {
                heading.textContent = `Location ${index + 1}`;
            }
        });
    }

    function getMapHeight() {
        let height = parseInt(els.mapHeight.value, 10);

        if (Number.isNaN(height) || height < 280) {
            height = 560;
        }

        if (height > 900) {
            height = 900;
        }

        return height;
    }

    function getSettings() {
        return {
            title: els.widgetTitle.value.trim() || 'Map your visit to a dealership.',
            intro: els.widgetIntro.value.trim() || 'Select a dealership to view its location, visit the website, and plan your next stop.',
            kicker: els.kickerText.value.trim() || 'Find a Location',
            placeholderTitle: els.placeholderTitle.value.trim() || 'Select a dealership to view the map.',
            placeholderCopy: els.placeholderCopy.value.trim() || 'Choose a dealership from the list to load directions and start planning your visit.',
            mapHeight: getMapHeight(),
            autoLoadFirst: els.autoLoadFirst.checked
        };
    }

    function getLocations() {
        const cards = els.locationsWrap.querySelectorAll('[data-gmgen-location-card]');
        const locations = [];

        for (let i = 0; i < cards.length; i += 1) {
            const name = cards[i].querySelector('[data-gmgen-name]').value.trim();
            const address = cards[i].querySelector('[data-gmgen-address]').value.trim();
            const website = normalizeUrl(cards[i].querySelector('[data-gmgen-website]').value);

            if (name || address || website) {
                if (!name || !address) {
                    return {
                        error: 'Each location needs at least a dealership name and full address.'
                    };
                }

                locations.push({
                    name,
                    address,
                    website,
                    mapUrl: buildMapUrl(name, address),
                    directionsUrl: buildDirectionsUrl(name, address)
                });
            }
        }

        if (!locations.length) {
            return {
                error: 'Add at least one location before generating the widget.'
            };
        }

        return { locations };
    }

    function renderPreview(settings, locations) {
        if (!locations || !locations.length) {
            els.preview.innerHTML = '<p class="gmgen-preview-empty">Add locations or load the sample, then generate or refresh the preview.</p>';
            return;
        }

        const listMarkup = locations.map(function (location, index) {
            return `
                <div class="preview-map-card">
                    <strong>${escapeHtml(location.name)}</strong>
                    <span>${escapeHtml(location.address)}</span>
                    <button type="button" data-preview-map-index="${index}">Preview Map</button>
                </div>
            `;
        }).join('');

        els.preview.innerHTML = `
            <div class="gmgen-preview-widget">
                <div class="preview-map-heading">
                    <span>${escapeHtml(settings.kicker)}</span>
                    <h4>${escapeHtml(settings.title)}</h4>
                    <p>${escapeHtml(settings.intro)}</p>
                </div>
                <div class="preview-map-layout">
                    <div class="preview-map-list">${listMarkup}</div>
                    <div class="preview-map-stage" data-preview-map-stage>
                        <div>
                            <h4>${escapeHtml(settings.placeholderTitle)}</h4>
                            <p>${escapeHtml(settings.placeholderCopy)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const buttons = els.preview.querySelectorAll('[data-preview-map-index]');
        const stage = els.preview.querySelector('[data-preview-map-stage]');

        buttons.forEach(function (button) {
            button.addEventListener('click', function () {
                const index = parseInt(button.getAttribute('data-preview-map-index'), 10);
                const location = locations[index];

                if (!location || !stage) {
                    return;
                }

                stage.innerHTML = `<div><h4>${escapeHtml(location.name)}</h4><p>${escapeHtml(location.address)}</p><p>This is a lightweight preview. The generated widget will load the Google Maps iframe when the Load Map button is clicked.</p></div>`;
            });
        });

        if (settings.autoLoadFirst && buttons[0]) {
            buttons[0].click();
        }
    }

    function renderPreviewFromForm(showStatus) {
        const result = getLocations();

        if (result.error) {
            if (showStatus) {
                setStatus(els.formStatus, result.error);
            }
            renderPreview(null, []);
            return;
        }

        renderPreview(getSettings(), result.locations);

        if (showStatus) {
            setStatus(els.formStatus, 'Preview refreshed.');
        }
    }

    function buildLocationHtml(location) {
        let html = '';

        html += '                            <li>\n';
        html += '                                <div class="do-multi-map-location-card">\n';
        html += '                                    <strong>' + escapeHtml(location.name) + '</strong>\n';
        html += '                                    <span>' + escapeHtml(location.address) + '</span>\n';
        html += '                                    <div class="do-multi-map-location-actions">\n';
        html += '                                        <button class="do-multi-map-mini-btn do-multi-map-load-btn" type="button">Load Map</button>\n';
        html += '                                        <a class="do-multi-map-mini-link" href="' + escapeHtml(location.directionsUrl) + '" target="_blank" rel="noopener">Open in Maps</a>\n';

        if (location.website) {
            html += '                                        <a class="do-multi-map-mini-link" href="' + escapeHtml(location.website) + '" target="_blank" rel="noopener">Visit Website</a>\n';
        }

        html += '                                    </div>\n';
        html += '                                </div>\n';
        html += '                            </li>\n';

        return html;
    }

    function buildWidgetCode(settings, locations) {
        const widgetId = 'doMultiMap_' + Date.now().toString(36);
        const height = settings.mapHeight;
        const locationsJson = safeScriptJson(locations);
        const autoLoadFirst = settings.autoLoadFirst ? 'true' : 'false';
        let code = '';

        code += '<style>\n';
        code += '#' + widgetId + ' {\n';
        code += '    color: var(--main-color, #1f2937);\n';
        code += '}\n\n';
        code += '#' + widgetId + ' * {\n';
        code += '    box-sizing: border-box;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-section {\n';
        code += '    padding: 60px 0;\n';
        code += '    background: linear-gradient(180deg, #fff 0%, #eef4f8 100%);\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-heading-wrap {\n';
        code += '    display: flex;\n';
        code += '    align-items: flex-end;\n';
        code += '    justify-content: space-between;\n';
        code += '    gap: 24px;\n';
        code += '    margin-bottom: 30px;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-kicker {\n';
        code += '    display: inline-block;\n';
        code += '    padding: 8px 14px;\n';
        code += '    margin-bottom: 14px;\n';
        code += '    border-radius: 999px;\n';
        code += '    background: rgba(37,99,235,0.10);\n';
        code += '    border: 1px solid rgba(37,99,235,0.18);\n';
        code += '    color: var(--cta-background-color, #2563eb);\n';
        code += '    font-size: 12px;\n';
        code += '    letter-spacing: 1.4px;\n';
        code += '    text-transform: uppercase;\n';
        code += '    font-weight: 700;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-heading h2 {\n';
        code += '    margin-top: 0;\n';
        code += '    margin-bottom: 10px;\n';
        code += '    font-size: 36px;\n';
        code += '    line-height: 1.15;\n';
        code += '    font-weight: 800;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-heading p {\n';
        code += '    max-width: 760px;\n';
        code += '    margin-bottom: 0;\n';
        code += '    color: #60707d;\n';
        code += '    font-size: 16px;\n';
        code += '    line-height: 1.7;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-count {\n';
        code += '    flex: 0 0 auto;\n';
        code += '    padding: 16px 20px;\n';
        code += '    border-radius: 24px;\n';
        code += '    background: var(--main-color, #1f2937);\n';
        code += '    color: #fff;\n';
        code += '    box-shadow: 0 14px 36px rgba(31,41,55,0.16);\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-count strong {\n';
        code += '    display: block;\n';
        code += '    font-size: 28px;\n';
        code += '    line-height: 1;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-count span {\n';
        code += '    color: rgba(255,255,255,0.76);\n';
        code += '    font-size: 13px;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-widget {\n';
        code += '    padding: 24px;\n';
        code += '    border-radius: 32px;\n';
        code += '    background: #fff;\n';
        code += '    box-shadow: 0 20px 60px rgba(31,41,55,0.14);\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-layout {\n';
        code += '    display: flex;\n';
        code += '    gap: 22px;\n';
        code += '    align-items: stretch;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-list-panel {\n';
        code += '    flex: 0 0 36%;\n';
        code += '    max-width: 36%;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-list-title {\n';
        code += '    margin: 0 0 14px;\n';
        code += '    font-size: 18px;\n';
        code += '    font-weight: 800;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-stage-panel {\n';
        code += '    flex: 1 1 auto;\n';
        code += '    min-width: 0;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-location-list {\n';
        code += '    height: ' + height + 'px;\n';
        code += '    overflow-y: auto;\n';
        code += '    margin: 0;\n';
        code += '    padding: 0;\n';
        code += '    list-style: none;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-location-list li {\n';
        code += '    padding-bottom: 18px;\n';
        code += '    margin-bottom: 18px;\n';
        code += '    border-bottom: 1px solid rgba(31,41,55,0.16);\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-location-list li:last-child {\n';
        code += '    border-bottom: 0;\n';
        code += '    margin-bottom: 0;\n';
        code += '    padding-bottom: 0;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-location-card {\n';
        code += '    padding: 18px;\n';
        code += '    border: 1px solid rgba(31,41,55,0.12);\n';
        code += '    background: #f7fafc;\n';
        code += '    border-radius: 22px;\n';
        code += '    transition: all 0.2s ease;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-location-card.do-multi-map-active-location {\n';
        code += '    background: var(--main-color, #1f2937);\n';
        code += '    color: #fff;\n';
        code += '    border-color: var(--main-color, #1f2937);\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-location-card strong {\n';
        code += '    display: block;\n';
        code += '    margin-bottom: 5px;\n';
        code += '    font-size: 16px;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-location-card span {\n';
        code += '    display: block;\n';
        code += '    color: inherit;\n';
        code += '    opacity: 0.78;\n';
        code += '    font-size: 13px;\n';
        code += '    line-height: 1.45;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-location-actions {\n';
        code += '    display: flex;\n';
        code += '    flex-wrap: wrap;\n';
        code += '    gap: 8px;\n';
        code += '    margin-top: 14px;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-mini-btn,\n';
        code += '#' + widgetId + ' .do-multi-map-mini-link {\n';
        code += '    display: inline-block;\n';
        code += '    padding: 8px 11px;\n';
        code += '    border-radius: 999px;\n';
        code += '    background: rgba(37,99,235,0.10);\n';
        code += '    color: var(--cta-background-color, #2563eb);\n';
        code += '    border: 0;\n';
        code += '    font-size: 12px;\n';
        code += '    font-weight: 800;\n';
        code += '    text-decoration: none;\n';
        code += '    transition: all 0.2s ease;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-mini-btn:hover,\n';
        code += '#' + widgetId + ' .do-multi-map-mini-btn:focus,\n';
        code += '#' + widgetId + ' .do-multi-map-mini-link:hover,\n';
        code += '#' + widgetId + ' .do-multi-map-mini-link:focus {\n';
        code += '    background: var(--cta-hover-color, #1d4ed8);\n';
        code += '    color: var(--cta-font-color, #fff);\n';
        code += '    text-decoration: none;\n';
        code += '    outline: none;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-active-location .do-multi-map-mini-btn,\n';
        code += '#' + widgetId + ' .do-multi-map-active-location .do-multi-map-mini-link {\n';
        code += '    background: rgba(255,255,255,0.14);\n';
        code += '    color: #fff;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-active-location .do-multi-map-mini-btn:hover,\n';
        code += '#' + widgetId + ' .do-multi-map-active-location .do-multi-map-mini-btn:focus,\n';
        code += '#' + widgetId + ' .do-multi-map-active-location .do-multi-map-mini-link:hover,\n';
        code += '#' + widgetId + ' .do-multi-map-active-location .do-multi-map-mini-link:focus {\n';
        code += '    background: #fff;\n';
        code += '    color: var(--main-color, #1f2937);\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-stage {\n';
        code += '    position: relative;\n';
        code += '    min-height: ' + height + 'px;\n';
        code += '    border-radius: 26px;\n';
        code += '    overflow: hidden;\n';
        code += '    background: linear-gradient(135deg, rgba(31,41,55,0.92), rgba(37,99,235,0.50));\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-placeholder {\n';
        code += '    position: absolute;\n';
        code += '    top: 0;\n';
        code += '    right: 0;\n';
        code += '    bottom: 0;\n';
        code += '    left: 0;\n';
        code += '    display: flex;\n';
        code += '    align-items: center;\n';
        code += '    padding: 42px;\n';
        code += '    color: #fff;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-placeholder-inner {\n';
        code += '    max-width: 560px;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-placeholder h3 {\n';
        code += '    margin-top: 0;\n';
        code += '    font-size: 38px;\n';
        code += '    line-height: 1.1;\n';
        code += '    font-weight: 800;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-placeholder p {\n';
        code += '    color: rgba(255,255,255,0.86);\n';
        code += '    line-height: 1.7;\n';
        code += '    font-size: 16px;\n';
        code += '}\n\n';
        code += '#' + widgetId + ' .do-multi-map-stage iframe {\n';
        code += '    display: block;\n';
        code += '    width: 100%;\n';
        code += '    height: ' + height + 'px;\n';
        code += '    border: 0;\n';
        code += '}\n\n';
        code += '@media (max-width: 991px) {\n';
        code += '    #' + widgetId + ' .do-multi-map-heading-wrap,\n';
        code += '    #' + widgetId + ' .do-multi-map-layout {\n';
        code += '        display: block;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-count {\n';
        code += '        display: inline-block;\n';
        code += '        margin-top: 18px;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-list-panel,\n';
        code += '    #' + widgetId + ' .do-multi-map-stage-panel {\n';
        code += '        max-width: none;\n';
        code += '        width: 100%;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-location-list {\n';
        code += '        display: flex;\n';
        code += '        gap: 14px;\n';
        code += '        height: auto;\n';
        code += '        overflow-x: auto;\n';
        code += '        overflow-y: hidden;\n';
        code += '        padding-bottom: 14px;\n';
        code += '        margin-bottom: 18px;\n';
        code += '        -webkit-overflow-scrolling: touch;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-location-list li {\n';
        code += '        flex: 0 0 300px;\n';
        code += '        padding-right: 14px;\n';
        code += '        padding-bottom: 0;\n';
        code += '        margin-bottom: 0;\n';
        code += '        border-bottom: 0;\n';
        code += '        border-right: 1px solid rgba(31,41,55,0.16);\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-location-list li:last-child {\n';
        code += '        border-right: 0;\n';
        code += '    }\n';
        code += '}\n\n';
        code += '@media (max-width: 767px) {\n';
        code += '    #' + widgetId + ' .do-multi-map-section {\n';
        code += '        padding: 42px 0;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-heading h2 {\n';
        code += '        font-size: 30px;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-widget {\n';
        code += '        padding: 16px;\n';
        code += '        border-radius: 24px;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-location-list {\n';
        code += '        display: block;\n';
        code += '        overflow: visible;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-location-list li {\n';
        code += '        width: 100%;\n';
        code += '        padding-right: 0;\n';
        code += '        padding-bottom: 18px;\n';
        code += '        margin-bottom: 18px;\n';
        code += '        border-right: 0;\n';
        code += '        border-bottom: 1px solid rgba(31,41,55,0.16);\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-location-list li:last-child {\n';
        code += '        border-bottom: 0;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-stage,\n';
        code += '    #' + widgetId + ' .do-multi-map-stage iframe {\n';
        code += '        min-height: 360px;\n';
        code += '        height: 360px;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-placeholder {\n';
        code += '        padding: 25px;\n';
        code += '    }\n\n';
        code += '    #' + widgetId + ' .do-multi-map-placeholder h3 {\n';
        code += '        font-size: 28px;\n';
        code += '    }\n';
        code += '}\n';
        code += '</style>\n\n';

        code += '<div id="' + widgetId + '">\n';
        code += '    <section class="do-multi-map-section">\n';
        code += '        <div class="container">\n';
        code += '            <div class="do-multi-map-heading-wrap">\n';
        code += '                <div class="do-multi-map-heading">\n';
        code += '                    <span class="do-multi-map-kicker">' + escapeHtml(settings.kicker) + '</span>\n';
        code += '                    <h2>' + escapeHtml(settings.title) + '</h2>\n';
        code += '                    <p>' + escapeHtml(settings.intro) + '</p>\n';
        code += '                </div>\n';
        code += '                <div class="do-multi-map-count">\n';
        code += '                    <strong>' + locations.length + '</strong>\n';
        code += '                    <span>' + (locations.length === 1 ? 'Location' : 'Locations') + '</span>\n';
        code += '                </div>\n';
        code += '            </div>\n';
        code += '            <div class="do-multi-map-widget">\n';
        code += '                <div class="do-multi-map-layout">\n';
        code += '                    <div class="do-multi-map-list-panel">\n';
        code += '                        <h3 class="do-multi-map-list-title">Select a Location</h3>\n';
        code += '                        <ul class="do-multi-map-location-list">\n';

        locations.forEach(function (location) {
            code += buildLocationHtml(location);
        });

        code += '                        </ul>\n';
        code += '                    </div>\n';
        code += '                    <div class="do-multi-map-stage-panel">\n';
        code += '                        <div class="do-multi-map-stage">\n';
        code += '                            <div class="do-multi-map-placeholder">\n';
        code += '                                <div class="do-multi-map-placeholder-inner">\n';
        code += '                                    <h3>' + escapeHtml(settings.placeholderTitle) + '</h3>\n';
        code += '                                    <p>' + escapeHtml(settings.placeholderCopy) + '</p>\n';
        code += '                                </div>\n';
        code += '                            </div>\n';
        code += '                        </div>\n';
        code += '                    </div>\n';
        code += '                </div>\n';
        code += '            </div>\n';
        code += '        </div>\n';
        code += '    </section>\n';
        code += '</div>\n\n';

        code += '<script>\n';
        code += '(function () {\n';
        code += '    var widgetId = "' + widgetId + '";\n';
        code += '    var locations = ' + locationsJson + ';\n';
        code += '    var autoLoadFirst = ' + autoLoadFirst + ';\n\n';
        code += '    function initMultiMap() {\n';
        code += '        var wrapper = document.getElementById(widgetId);\n\n';
        code += '        if (!wrapper) {\n';
        code += '            window.setTimeout(initMultiMap, 50);\n';
        code += '            return;\n';
        code += '        }\n\n';
        code += '        var mapStage = wrapper.querySelector(".do-multi-map-stage");\n';
        code += '        var cards = wrapper.querySelectorAll(".do-multi-map-location-card");\n';
        code += '        var buttons = wrapper.querySelectorAll(".do-multi-map-load-btn");\n\n';
        code += '        if (!mapStage || !cards.length || !buttons.length) {\n';
        code += '            return;\n';
        code += '        }\n\n';
        code += '        function clearActiveCards() {\n';
        code += '            for (var i = 0; i < cards.length; i++) {\n';
        code += '                cards[i].classList.remove("do-multi-map-active-location");\n';
        code += '            }\n';
        code += '        }\n\n';
        code += '        function loadMap(index) {\n';
        code += '            var location = locations[index];\n';
        code += '            var card = cards[index];\n\n';
        code += '            if (!location || !card) {\n';
        code += '                return;\n';
        code += '            }\n\n';
        code += '            clearActiveCards();\n';
        code += '            card.classList.add("do-multi-map-active-location");\n';
        code += '            mapStage.innerHTML = \'<iframe title="Map for \' + location.name.replace(/"/g, "") + \'" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="\' + location.mapUrl + \'"></iframe>\';\n';
        code += '        }\n\n';
        code += '        for (var i = 0; i < buttons.length; i++) {\n';
        code += '            (function (index) {\n';
        code += '                buttons[index].addEventListener("click", function () {\n';
        code += '                    loadMap(index);\n';
        code += '                });\n';
        code += '            })(i);\n';
        code += '        }\n\n';
        code += '        if (autoLoadFirst) {\n';
        code += '            loadMap(0);\n';
        code += '        }\n';
        code += '    }\n\n';
        code += '    if (document.readyState === "loading") {\n';
        code += '        document.addEventListener("DOMContentLoaded", initMultiMap);\n';
        code += '    } else {\n';
        code += '        initMultiMap();\n';
        code += '    }\n';
        code += '})();\n';
        code += '<\/script>';

        return code;
    }

    function generateCode() {
        const result = getLocations();

        if (result.error) {
            setStatus(els.formStatus, result.error);
            return;
        }

        const settings = getSettings();
        els.output.value = buildWidgetCode(settings, result.locations);
        renderPreview(settings, result.locations);
        setStatus(els.formStatus, 'Widget code generated.');
    }

    function copyCode() {
        const code = els.output.value;

        if (!code) {
            setStatus(els.copyStatus, 'Generate code before copying.');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(function () {
                setStatus(els.copyStatus, 'Code copied.');
            }).catch(function () {
                fallbackCopy();
            });
        } else {
            fallbackCopy();
        }
    }

    function fallbackCopy() {
        els.output.focus();
        els.output.select();

        try {
            document.execCommand('copy');
            setStatus(els.copyStatus, 'Code copied.');
        } catch (error) {
            setStatus(els.copyStatus, 'Copy failed. Select the code and copy it manually.');
        }
    }

    function loadSampleLocations() {
        els.locationsWrap.innerHTML = '';
        locationCount = 0;

        createLocationCard({
            name: 'Koons Ford of Baltimore',
            address: '6970 Security Blvd, Baltimore, MD 21244',
            website: 'https://www.koonsfordbaltimore.com/'
        });

        createLocationCard({
            name: 'Koons Sterling Ford',
            address: '46869 Harry Byrd Highway, Sterling, VA 20164',
            website: 'https://www.koonssterlingford.com/'
        });

        createLocationCard({
            name: 'Tyrone Ford',
            address: '4548 East Pleasant Valley Boulevard, Tyrone, PA 16686',
            website: 'https://www.tyroneford.com/'
        });

        createLocationCard({
            name: 'Nick Mayer Ford West',
            address: '33450 Lake Road, Avon Lake, OH 44012',
            website: 'https://www.nickmayerfordwest.com/'
        });

        renderPreviewFromForm(false);
        setStatus(els.formStatus, 'Sample locations loaded.');
    }

    els.addLocation.addEventListener('click', function () {
        createLocationCard();
    });

    els.loadSample.addEventListener('click', function () {
        loadSampleLocations();
    });

    els.generate.addEventListener('click', function () {
        generateCode();
    });

    els.copyTop.addEventListener('click', copyCode);
    els.copyBottom.addEventListener('click', copyCode);

    els.clear.addEventListener('click', function () {
        els.output.value = '';
        setStatus(els.copyStatus, 'Output cleared.');
    });

    els.refreshPreview.addEventListener('click', function () {
        renderPreviewFromForm(true);
    });

    [
        els.widgetTitle,
        els.widgetIntro,
        els.kickerText,
        els.placeholderTitle,
        els.placeholderCopy,
        els.mapHeight,
        els.autoLoadFirst
    ].forEach(function (input) {
        input.addEventListener('input', function () {
            renderPreviewFromForm(false);
        });
        input.addEventListener('change', function () {
            renderPreviewFromForm(false);
        });
    });

    createLocationCard();
})();
