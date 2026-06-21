/*global StorageService, PrayerTimeService, AlarmService, AudioService, TvPowerService, TestModeService, RemoteSettingsService, MainScreen, SettingsScreen, PrayerScreen, BackgroundTheme, document */
/* exported AzanApp */
var AzanApp = (function () {
    'use strict';

    var settings = null;
    var focusables = [];
    var focusIndex = 0;
    var prayerEventActive = false;
    var KEY_BACK = 10009;
    var KEY_EXIT = 10182;

    function registerAppControlListener() {
        window.addEventListener('appcontrol', function () {
            var payload = AlarmService.parsePayloadFromLaunch();
            if (payload && payload.prayer) {
                handlePrayerEvent(payload.prayer);
            }
        });
    }

    function init() {
        settings = StorageService.getSettings();
        PrayerTimeService.recalculateIfNewDay();

        MainScreen.init();
        SettingsScreen.init();
        PrayerScreen.init();
        TestModeService.init(handlePrayerEvent);

        registerAppControlListener();
        bindNavigation();
        bindRemoteKeys();
        refreshFocusables(document.getElementById('screen-main'));

        TvPowerService.registerVisibilityHandler(function () {
            MainScreen.render(settings);
        });

        BackgroundTheme.applyForSettings(settings);
        BackgroundTheme.paintBackground(document.getElementById('bg-layer'));

        RemoteSettingsService.syncOnce(settings).then(function (result) {
            if (result.synced && result.settings) {
                settings = result.settings;
                MainScreen.setHeaderStatus('Einstellungen vom Handy synchronisiert');
            }
        }).catch(function (err) {
            console.warn('Initial remote sync:', err.message);
        });

        RemoteSettingsService.startPolling(function () {
            return settings;
        }, function (merged) {
            settings = merged;
            if (isScreenActive('screen-main')) {
                MainScreen.render(settings);
                MainScreen.setHeaderStatus('Aktualisiert vom Companion');
            }
        }, 60000);

        var launchPayload = AlarmService.parsePayloadFromLaunch();
        if (launchPayload && launchPayload.prayer) {
            handlePrayerEvent(launchPayload.prayer);
        } else {
            startMainScreen();
        }
    }

    function startMainScreen() {
        MainScreen.show();
        var next = AlarmService.syncOnStartup(settings);
        MainScreen.render(settings);
        MainScreen.startTick(function () {
            return settings;
        });
        if (next) {
            var prefix = next.isTest ? 'Test-Alarm' : 'Nächster Alarm';
            MainScreen.setHeaderStatus(
                prefix + ': ' + next.label + ' um ' + PrayerTimeService.formatTime(next.time, settings.timezone)
            );
        } else {
            MainScreen.setHeaderStatus('Bereit');
        }
    }

    function handlePrayerEvent(prayerKey) {
        if (prayerEventActive) {
            return;
        }
        prayerEventActive = true;
        TestModeService.setHandlingPrayer(true);
        AlarmService.markAlarmHandled();

        MainScreen.stopTick();
        BackgroundTheme.applyForPrayer();
        PrayerScreen.show(prayerKey, settings);
        TvPowerService.disableScreenSaver();

        AudioService.playAzan(prayerKey, settings).then(function () {
            PrayerScreen.setStatus('Azan beendet. App wird geschlossen…');
            AlarmService.scheduleNextPrayer(settings);
            TvPowerService.finishAfterAzan(settings);
        }).catch(function (err) {
            console.error(err);
            PrayerScreen.setStatus('Audio-Fehler: ' + err.message + '. App wird geschlossen…');
            AlarmService.scheduleNextPrayer(settings);
            TvPowerService.finishAfterAzan(settings);
        }).then(function () {
            prayerEventActive = false;
            TestModeService.setHandlingPrayer(false);
        });
    }

    function bindNavigation() {
        document.getElementById('btn-open-settings').addEventListener('click', openSettings);
        document.getElementById('btn-back-main').addEventListener('click', openMain);
        document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
        document.getElementById('btn-test-azan').addEventListener('click', testAzanNow);
        document.getElementById('btn-test-30s').addEventListener('click', function () {
            TestModeService.scheduleAzanIn30Seconds(settings, function (msg) {
                MainScreen.setHeaderStatus(msg);
                MainScreen.render(settings);
            });
        });
        document.getElementById('btn-test-1min').addEventListener('click', function () {
            TestModeService.scheduleFakePrayerIn1Minute(settings, function (msg) {
                MainScreen.setHeaderStatus(msg);
                MainScreen.render(settings);
            });
        });
        document.getElementById('btn-test-standby').addEventListener('click', function () {
            TestModeService.scheduleStandbyTest(settings, function (msg) {
                MainScreen.setHeaderStatus(msg);
                MainScreen.render(settings);
            });
        });
    }

    function openSettings() {
        SettingsScreen.load(settings);
        SettingsScreen.show();
        refreshFocusables(document.getElementById('screen-settings'));
        MainScreen.stopTick();
    }

    function openMain() {
        MainScreen.show();
        BackgroundTheme.clearPrayerMode();
        BackgroundTheme.applyForSettings(settings);
        MainScreen.render(settings);
        MainScreen.startTick(function () {
            return settings;
        });
        refreshFocusables(document.getElementById('screen-main'));
    }

    function saveSettings() {
        settings = SettingsScreen.read();
        StorageService.saveSettings(settings);
        PrayerTimeService.recalculateIfNewDay();
        var next = AlarmService.scheduleNextPrayer(settings);
        if (next) {
            MainScreen.setHeaderStatus('Einstellungen gespeichert – ' + next.label + ' geplant');
        } else {
            MainScreen.setHeaderStatus('Einstellungen gespeichert');
        }
        openMain();
    }

    function testAzanNow() {
        MainScreen.stopTick();
        BackgroundTheme.applyForPrayer();
        PrayerScreen.show('dhuhr', settings);
        TestModeService.playImmediateTest(settings, {
            onComplete: function () {
                PrayerScreen.setStatus('Test abgeschlossen');
                setTimeout(function () {
                    prayerEventActive = false;
                    openMain();
                }, settings.exitDelaySeconds * 1000);
            },
            onError: function (err) {
                PrayerScreen.setStatus('Fehler: ' + err.message);
                setTimeout(function () {
                    prayerEventActive = false;
                    openMain();
                }, 3000);
            }
        });
    }

    function isScreenActive(screenId) {
        return document.getElementById(screenId).classList.contains('screen-active');
    }

    function refreshFocusables(container) {
        focusables = Array.prototype.slice.call(container.querySelectorAll('.focusable'));
        focusIndex = 0;
        updateFocusVisual();
    }

    function updateFocusVisual() {
        document.querySelectorAll('.focused').forEach(function (el) {
            el.classList.remove('focused');
        });
        if (focusables.length > 0) {
            focusables[focusIndex].classList.add('focused');
            try {
                focusables[focusIndex].focus();
            } catch (e) {}
        }
    }

    function getSelectInRow(el) {
        if (!el || !el.querySelector) {
            return null;
        }
        return el.querySelector('select');
    }

    function cycleSelect(select, delta) {
        if (!select || !select.options || !select.options.length) {
            return;
        }
        var next = select.selectedIndex + delta;
        if (next < 0) {
            next = select.options.length - 1;
        }
        if (next >= select.options.length) {
            next = 0;
        }
        select.selectedIndex = next;
        try {
            var evt = document.createEvent('HTMLEvents');
            evt.initEvent('change', true, false);
            select.dispatchEvent(evt);
        } catch (err) {
            console.warn('select change event failed:', err);
        }
    }

    function handleSelectKey(key) {
        if (!isScreenActive('screen-settings') || focusables.length === 0) {
            return false;
        }
        var el = focusables[focusIndex];
        var select = getSelectInRow(el);
        if (!select) {
            return false;
        }
        if (key === 37) {
            cycleSelect(select, -1);
            return true;
        }
        if (key === 39 || key === 13) {
            cycleSelect(select, 1);
            return true;
        }
        return false;
    }

    function bindRemoteKeys() {
        document.addEventListener('keydown', function (e) {
            var key = e.keyCode;

            if (key === KEY_BACK) {
                e.preventDefault();
                if (isScreenActive('screen-settings')) {
                    openMain();
                }
                return;
            }

            if (key === KEY_EXIT) {
                e.preventDefault();
                if (!isScreenActive('screen-prayer')) {
                    TvPowerService.exitApp(0);
                }
                return;
            }

            if (focusables.length === 0) {
                return;
            }

            if (handleSelectKey(key)) {
                e.preventDefault();
                return;
            }

            if (key === 37 || key === 38) {
                focusIndex = (focusIndex - 1 + focusables.length) % focusables.length;
                updateFocusVisual();
                e.preventDefault();
            } else if (key === 39 || key === 40) {
                focusIndex = (focusIndex + 1) % focusables.length;
                updateFocusVisual();
                e.preventDefault();
            } else if (key === 13) {
                var el = focusables[focusIndex];
                if (el.tagName === 'BUTTON') {
                    el.click();
                } else if (getSelectInRow(el)) {
                    cycleSelect(getSelectInRow(el), 1);
                } else if (el.tagName === 'LABEL' || el.tagName === 'INPUT') {
                    var input = el.querySelector('input') || el;
                    if (input.tagName === 'INPUT' && input.type === 'checkbox') {
                        input.checked = !input.checked;
                    }
                }
                e.preventDefault();
            }
        });
    }

    return {
        init: init,
        handlePrayerEvent: handlePrayerEvent
    };
}());

document.addEventListener('DOMContentLoaded', function () {
    try {
        AzanApp.init();
    } catch (err) {
        console.error('AzanApp init failed:', err);
        document.getElementById('header-status').textContent = 'Fehler: ' + err.message;
    }
});
