/*global StorageService, PrayerTimeService, TvPowerService, RemoteSettingsService, document */
/* exported SettingsScreen */
var SettingsScreen = (function () {
    'use strict';

    var fields = {};

    function init() {
        fields.city = document.getElementById('setting-city');
        fields.latitude = document.getElementById('setting-latitude');
        fields.longitude = document.getElementById('setting-longitude');
        fields.timezone = document.getElementById('setting-timezone');
        fields.method = document.getElementById('setting-method');
        fields.madhab = document.getElementById('setting-madhab');
        fields.audio = document.getElementById('setting-audio');
        fields.fajrAudio = document.getElementById('setting-fajr-audio');
        fields.volume = document.getElementById('setting-volume');
        fields.exitDelay = document.getElementById('setting-exit-delay');
        fields.companionUrl = document.getElementById('setting-companion-url');
        fields.tryStandbyAfter = document.getElementById('toggle-standby-after');
        fields.powerHint = document.getElementById('setting-power-hint');
        fields.mobileHint = document.getElementById('setting-mobile-hint');
        fields.toggles = {
            fajr: document.getElementById('toggle-fajr'),
            dhuhr: document.getElementById('toggle-dhuhr'),
            asr: document.getElementById('toggle-asr'),
            maghrib: document.getElementById('toggle-maghrib'),
            isha: document.getElementById('toggle-isha')
        };
        fields.offsets = {
            fajr: document.getElementById('offset-fajr'),
            dhuhr: document.getElementById('offset-dhuhr'),
            asr: document.getElementById('offset-asr'),
            maghrib: document.getElementById('offset-maghrib'),
            isha: document.getElementById('offset-isha')
        };

        fields.city.addEventListener('change', function () {
            if (fields.city.value !== 'custom') {
                var preset = StorageService.CITY_PRESETS[fields.city.value];
                if (preset) {
                    fields.latitude.value = preset.latitude;
                    fields.longitude.value = preset.longitude;
                    fields.timezone.value = preset.timezone;
                }
            }
        });

        if (fields.powerHint && typeof TvPowerService !== 'undefined') {
            fields.powerHint.textContent = TvPowerService.getPowerCapabilityText();
        }

        if (fields.companionUrl) {
            fields.companionUrl.addEventListener('input', function () {
                updateMobileHint(fields.companionUrl.value);
            });
        }
    }

    function updateMobileHint(companionUrl) {
        if (!fields.mobileHint || typeof RemoteSettingsService === 'undefined') {
            return;
        }
        var mobile = RemoteSettingsService.getMobileUrl(companionUrl);
        if (mobile) {
            fields.mobileHint.textContent = 'Am Handy im Browser öffnen: ' + mobile;
        } else {
            fields.mobileHint.textContent = 'Companion auf PC/Raspberry starten (npm start), dann URL eintragen.';
        }
    }

    function show() {
        document.getElementById('screen-main').classList.remove('screen-active');
        document.getElementById('screen-settings').classList.add('screen-active');
        document.getElementById('screen-prayer').classList.remove('screen-active');
    }

    function load(settings) {
        fields.city.value = settings.city;
        fields.latitude.value = settings.latitude;
        fields.longitude.value = settings.longitude;
        fields.timezone.value = settings.timezone;
        fields.method.value = settings.calculationMethod;
        fields.madhab.value = settings.madhab;
        fields.audio.value = settings.audioVariant;
        fields.fajrAudio.value = settings.fajrAudio;
        fields.volume.value = settings.volume;
        fields.exitDelay.value = settings.exitDelaySeconds;
        if (fields.companionUrl) {
            fields.companionUrl.value = settings.companionUrl || '';
            updateMobileHint(settings.companionUrl);
        }
        if (fields.tryStandbyAfter) {
            fields.tryStandbyAfter.checked = !!settings.tryStandbyAfterAzan;
        }

        PrayerTimeService.PRAYER_KEYS.forEach(function (key) {
            fields.toggles[key].checked = settings.enabledPrayers[key] !== false;
            fields.offsets[key].value = settings.offsets[key] || 0;
        });
    }

    function read() {
        var settings = StorageService.getSettings();
        settings.city = fields.city.value;
        settings.latitude = parseFloat(fields.latitude.value, 10);
        settings.longitude = parseFloat(fields.longitude.value, 10);
        settings.timezone = fields.timezone.value.trim();
        settings.calculationMethod = fields.method.value;
        settings.madhab = fields.madhab.value;
        settings.audioVariant = fields.audio.value;
        settings.fajrAudio = fields.fajrAudio.value;
        settings.volume = parseInt(fields.volume.value, 10) || 80;
        settings.exitDelaySeconds = parseInt(fields.exitDelay.value, 10) || 10;
        settings.companionUrl = fields.companionUrl ? fields.companionUrl.value.trim() : '';
        settings.tryStandbyAfterAzan = fields.tryStandbyAfter ? fields.tryStandbyAfter.checked : false;

        PrayerTimeService.PRAYER_KEYS.forEach(function (key) {
            settings.enabledPrayers[key] = fields.toggles[key].checked;
            settings.offsets[key] = parseInt(fields.offsets[key].value, 10) || 0;
        });

        if (settings.city !== 'custom') {
            settings = StorageService.applyCityPreset(settings);
        }

        return settings;
    }

    return {
        init: init,
        show: show,
        load: load,
        read: read
    };
}());
