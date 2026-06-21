/*global StorageService, PrayerTimeService, AlarmService */
/* exported RemoteSettingsService */
var RemoteSettingsService = (function () {
    'use strict';

    var pollTimer = null;
    var lastRemoteVersion = 0;

    function normalizeUrl(url) {
        if (!url) {
            return '';
        }
        var trimmed = String(url).trim().replace(/\/$/, '');
        if (!trimmed) {
            return '';
        }
        if (trimmed.indexOf('http://') !== 0 && trimmed.indexOf('https://') !== 0) {
            trimmed = 'http://' + trimmed;
        }
        return trimmed;
    }

    function fetchJson(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.timeout = 8000;
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) {
                    return;
                }
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error('HTTP ' + xhr.status));
                }
            };
            xhr.onerror = function () {
                reject(new Error('Netzwerkfehler'));
            };
            xhr.ontimeout = function () {
                reject(new Error('Timeout'));
            };
            xhr.send();
        });
    }

    function mergeRemoteSettings(local, remote) {
        var merged = StorageService.getSettings();
        var keys = [
            'city', 'latitude', 'longitude', 'timezone', 'calculationMethod', 'madhab',
            'audioVariant', 'fajrAudio', 'volume', 'exitDelaySeconds', 'tryStandbyAfterAzan',
            'enabledPrayers', 'offsets', 'companionUrl'
        ];
        keys.forEach(function (key) {
            if (remote[key] !== undefined && remote[key] !== null) {
                merged[key] = remote[key];
            }
        });
        if (local.companionUrl) {
            merged.companionUrl = local.companionUrl;
        }
        merged.settingsVersion = remote.settingsVersion || merged.settingsVersion;
        merged.remoteUpdatedAt = remote.updatedAt || null;
        return merged;
    }

    function syncOnce(localSettings) {
        var base = normalizeUrl(localSettings.companionUrl);
        if (!base) {
            return Promise.resolve({ synced: false, reason: 'no-url' });
        }

        return fetchJson(base + '/api/settings').then(function (remote) {
            var remoteVersion = remote.settingsVersion || 0;
            if (remoteVersion <= lastRemoteVersion && remoteVersion > 0) {
                return { synced: false, reason: 'unchanged' };
            }
            lastRemoteVersion = remoteVersion;
            var merged = mergeRemoteSettings(localSettings, remote);
            StorageService.saveSettings(merged);
            PrayerTimeService.recalculateIfNewDay();
            AlarmService.scheduleNextPrayer(merged);
            return { synced: true, settings: merged, remoteVersion: remoteVersion };
        });
    }

    function startPolling(settingsProvider, onSync, intervalMs) {
        stopPolling();
        var interval = intervalMs || 60000;
        pollTimer = setInterval(function () {
            var settings = settingsProvider();
            syncOnce(settings).then(function (result) {
                if (result.synced && onSync) {
                    onSync(result.settings, result);
                }
            }).catch(function (err) {
                console.warn('Remote sync failed:', err.message);
            });
        }, interval);
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function getMobileUrl(companionUrl) {
        var base = normalizeUrl(companionUrl);
        return base ? base + '/mobile' : '';
    }

    return {
        normalizeUrl: normalizeUrl,
        syncOnce: syncOnce,
        startPolling: startPolling,
        stopPolling: stopPolling,
        getMobileUrl: getMobileUrl
    };
}());
