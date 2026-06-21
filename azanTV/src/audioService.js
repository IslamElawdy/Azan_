/*global tizen, webapis, document, window, StorageService */
/* exported AudioService */
var AudioService = (function () {
    'use strict';

    var playerObject = null;
    var isPlaying = false;
    var pathCache = {};

    function isAvPlayAvailable() {
        return typeof webapis !== 'undefined' && webapis.avplay;
    }

    function ensurePlayerObject() {
        if (playerObject) {
            return playerObject;
        }
        playerObject = document.createElement('object');
        playerObject.type = 'application/avplayer';
        playerObject.style.position = 'absolute';
        playerObject.style.width = '0';
        playerObject.style.height = '0';
        playerObject.style.opacity = '0';
        document.body.appendChild(playerObject);
        return playerObject;
    }

    function normalizeSlashes(path) {
        return String(path).replace(/\\/g, '/');
    }

    function toAvPlayUri(path) {
        path = normalizeSlashes(path);
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        if (path.indexOf('file://') === 0) {
            return path;
        }
        if (path.charAt(0) !== '/') {
            path = '/' + path;
        }
        return 'file://' + path;
    }

    function getAppBasePath() {
        try {
            return normalizeSlashes(tizen.application.getCurrentApplication().appInfo.path || '');
        } catch (e) {
            return '';
        }
    }

    function buildUriCandidates(relativePath) {
        var candidates = [];
        var rel = normalizeSlashes(relativePath);
        var base = getAppBasePath();

        if (base) {
            var root = base.charAt(base.length - 1) === '/' ? base : base + '/';
            if (root.indexOf('file://') === 0) {
                candidates.push(root + rel);
            } else {
                candidates.push(toAvPlayUri(root + rel));
            }
        }

        try {
            var href = normalizeSlashes(window.location.href.split('#')[0].split('?')[0]);
            var idx = href.lastIndexOf('/');
            if (idx !== -1) {
                var dir = href.substring(0, idx + 1);
                candidates.push(dir + rel);
                if (dir.indexOf('file://') === 0) {
                    candidates.push(toAvPlayUri(dir.replace(/^file:\/\//, '') + rel));
                }
            }
        } catch (locErr) {
            console.warn('location URI fallback failed:', locErr);
        }

        candidates.push(toAvPlayUri(rel));
        return candidates.filter(function (uri, index, list) {
            return uri && list.indexOf(uri) === index;
        });
    }

    function resolveWithFilesystem(relativePath) {
        return new Promise(function (resolve, reject) {
            if (typeof tizen === 'undefined' || !tizen.filesystem || !tizen.filesystem.resolve) {
                reject(new Error('Filesystem API unavailable'));
                return;
            }

            var attempts = [
                relativePath,
                'wgt-package/' + relativePath
            ];
            var index = 0;

            function tryNext() {
                if (index >= attempts.length) {
                    reject(new Error('Filesystem resolve failed for ' + relativePath));
                    return;
                }

                var target = attempts[index];
                index += 1;

                try {
                    tizen.filesystem.resolve(target, function (file) {
                        var uri = '';
                        try {
                            uri = file.toURI();
                        } catch (uriErr) {
                            uri = file.fullPath ? toAvPlayUri(file.fullPath) : '';
                        }
                        if (uri) {
                            resolve(uri);
                        } else {
                            tryNext();
                        }
                    }, function () {
                        tryNext();
                    }, 'r');
                } catch (e) {
                    tryNext();
                }
            }

            tryNext();
        });
    }

    function getAudioFileName(variant) {
        var variants = StorageService.AUDIO_VARIANTS || {};
        if (variants[variant] && variants[variant].file) {
            return variants[variant].file;
        }
        return variant + '.mp3';
    }

    function resolveAudioUri(variant) {
        var relativePath = 'assets/azan/' + getAudioFileName(variant);

        if (pathCache[variant]) {
            return Promise.resolve(pathCache[variant]);
        }

        return resolveWithFilesystem(relativePath).catch(function () {
            var candidates = buildUriCandidates(relativePath);
            if (!candidates.length) {
                throw new Error('No audio URI candidates for ' + relativePath);
            }
            return candidates[0];
        }).then(function (uri) {
            pathCache[variant] = uri;
            console.log('Azan audio URI:', uri);
            return uri;
        });
    }

    function getAudioVariantForPrayer(settings, prayerKey) {
        if (prayerKey === 'fajr' && settings.fajrAudio && settings.fajrAudio !== 'same') {
            return settings.fajrAudio;
        }
        return settings.audioVariant || 'abdulbasit';
    }

    function stop() {
        if (!isAvPlayAvailable()) {
            isPlaying = false;
            return;
        }
        try {
            webapis.avplay.stop();
            webapis.avplay.close();
        } catch (e) {
            console.warn('AVPlay stop failed:', e);
        }
        isPlaying = false;
    }

    function setVolumeSafe(volume) {
        if (typeof webapis.avplay.setVolume !== 'function') {
            return;
        }
        try {
            webapis.avplay.setVolume(String(volume));
        } catch (volErr) {
            console.warn('AVPlay setVolume failed:', volErr);
        }
    }

    function openAndPlay(uri, volume) {
        return new Promise(function (resolve, reject) {
            var completed = false;

            function finishOk() {
                if (completed) {
                    return;
                }
                completed = true;
                isPlaying = false;
                resolve({ path: uri });
            }

            function finishErr(err) {
                if (completed) {
                    return;
                }
                completed = true;
                isPlaying = false;
                reject(err);
            }

            try {
                webapis.avplay.setListener({
                    oncurrentplaytime: function () {},
                    onstreamcompleted: function () {
                        finishOk();
                    },
                    onerror: function (e) {
                        finishErr(new Error('AVPlay error: ' + e));
                    }
                });

                webapis.avplay.open(uri);
                setVolumeSafe(volume);
                webapis.avplay.prepareAsync(function () {
                    try {
                        webapis.avplay.play();
                        isPlaying = true;
                    } catch (playErr) {
                        finishErr(playErr);
                    }
                }, function (prepErr) {
                    finishErr(new Error('Prepare failed: ' + prepErr));
                });
            } catch (e) {
                finishErr(e);
            }
        });
    }

    function tryOpenCandidates(candidates, volume, index) {
        if (index >= candidates.length) {
            return Promise.reject(new Error('All audio URI candidates failed'));
        }

        stop();
        return openAndPlay(candidates[index], volume).catch(function (err) {
            console.warn('Audio open failed for', candidates[index], err.message);
            return tryOpenCandidates(candidates, volume, index + 1);
        });
    }

    function playAzan(prayerKey, settings) {
        var variant = getAudioVariantForPrayer(settings, prayerKey);
        var fileName = getAudioFileName(variant);
        var relativePath = 'assets/azan/' + fileName;
        var volume = settings.volume !== null && settings.volume !== undefined ? settings.volume : 80;

        return new Promise(function (resolve, reject) {
            if (!isAvPlayAvailable()) {
                console.warn('AVPlay not available, simulating playback for:', relativePath);
                setTimeout(function () {
                    resolve({ simulated: true, path: relativePath });
                }, 2000);
                return;
            }

            ensurePlayerObject();

            resolveAudioUri(variant).then(function (primaryUri) {
                var candidates = buildUriCandidates(relativePath);
                if (candidates.indexOf(primaryUri) === -1) {
                    candidates.unshift(primaryUri);
                }
                return tryOpenCandidates(candidates, volume, 0);
            }).then(resolve).catch(reject);
        });
    }

    function resolveAudioPath(variant) {
        return 'assets/azan/' + getAudioFileName(variant);
    }

    return {
        isAvPlayAvailable: isAvPlayAvailable,
        playAzan: playAzan,
        stop: stop,
        getAudioVariantForPrayer: getAudioVariantForPrayer,
        resolveAudioPath: resolveAudioPath,
        resolveAudioUri: resolveAudioUri
    };
}());
