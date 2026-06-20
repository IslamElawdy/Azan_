var AzanApp = (function () {
    'use strict';

    var settings = null;
    var focusables = [];
    var focusIndex = 0;
    var KEY_BACK = 10009;
    var KEY_EXIT = 10182;

    function init() {
        settings = StorageService.getSettings();
        PrayerTimeService.recalculateIfNewDay(settings);

        MainScreen.init();
        SettingsScreen.init();
        PrayerScreen.init();

        bindNavigation();
        bindRemoteKeys();
        refreshFocusables(document.getElementById('screen-main'));

        TvPowerService.registerVisibilityHandler(function () {
            MainScreen.render(settings);
        });

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
            MainScreen.setHeaderStatus(
                'Nächster Alarm: ' + next.label + ' um ' + PrayerTimeService.formatTime(next.time)
            );
        } else {
            MainScreen.setHeaderStatus('Bereit');
        }
    }

    function handlePrayerEvent(prayerKey) {
        MainScreen.stopTick();
        PrayerScreen.show(prayerKey);
        TvPowerService.disableScreenSaver();

        AudioService.playAzan(prayerKey, settings).then(function () {
            PrayerScreen.setStatus('Azan beendet. App wird geschlossen…');
            AlarmService.scheduleNextPrayer(settings);
            TvPowerService.exitApp(settings.exitDelaySeconds);
        }).catch(function (err) {
            console.error(err);
            PrayerScreen.setStatus('Audio-Fehler: ' + err.message + '. App wird geschlossen…');
            AlarmService.scheduleNextPrayer(settings);
            TvPowerService.exitApp(settings.exitDelaySeconds);
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
    }

    function openSettings() {
        SettingsScreen.load(settings);
        SettingsScreen.show();
        refreshFocusables(document.getElementById('screen-settings'));
        MainScreen.stopTick();
    }

    function openMain() {
        MainScreen.show();
        MainScreen.render(settings);
        MainScreen.startTick(function () {
            return settings;
        });
        refreshFocusables(document.getElementById('screen-main'));
    }

    function saveSettings() {
        settings = SettingsScreen.read();
        StorageService.saveSettings(settings);
        PrayerTimeService.recalculateIfNewDay(settings);
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
        PrayerScreen.show('dhuhr');
        TestModeService.playImmediateTest(settings, {
            onComplete: function () {
                PrayerScreen.setStatus('Test abgeschlossen');
                setTimeout(function () {
                    openMain();
                }, settings.exitDelaySeconds * 1000);
            },
            onError: function (err) {
                PrayerScreen.setStatus('Fehler: ' + err.message);
                setTimeout(openMain, 3000);
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
                } else if (el.tagName === 'LABEL' || el.tagName === 'SELECT' || el.tagName === 'INPUT') {
                    var input = el.querySelector('input, select') || el;
                    if (input.tagName === 'INPUT' && input.type === 'checkbox') {
                        input.checked = !input.checked;
                    } else if (input.focus) {
                        input.focus();
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
