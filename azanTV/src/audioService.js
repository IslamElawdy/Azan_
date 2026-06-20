var AudioService = (function () {
    'use strict';

    var playerObject = null;
    var isPlaying = false;

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

    function getAppBasePath() {
        try {
            return tizen.application.getCurrentApplication().appInfo.path;
        } catch (e) {
            return '';
        }
    }

    function resolveAudioPath(variant) {
        var fileName = variant + '.mp3';
        var base = getAppBasePath();
        if (base) {
            if (base.charAt(base.length - 1) !== '/') {
                base += '/';
            }
            return base + 'assets/azan/' + fileName;
        }
        return 'assets/azan/' + fileName;
    }

    function getAudioVariantForPrayer(settings, prayerKey) {
        if (prayerKey === 'fajr' && settings.fajrAudio === 'fajr') {
            return 'fajr';
        }
        return settings.audioVariant || 'makkah';
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

    function playAzan(prayerKey, settings) {
        var variant = getAudioVariantForPrayer(settings, prayerKey);
        var path = resolveAudioPath(variant);
        var volume = settings.volume != null ? settings.volume : 80;

        return new Promise(function (resolve, reject) {
            if (!isAvPlayAvailable()) {
                console.warn('AVPlay not available, simulating playback for:', path);
                setTimeout(function () {
                    resolve({ simulated: true, path: path });
                }, 2000);
                return;
            }

            ensurePlayerObject();
            stop();

            var completed = false;

            function finishOk() {
                if (completed) {
                    return;
                }
                completed = true;
                isPlaying = false;
                resolve({ path: path });
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

                webapis.avplay.open(path);
                webapis.avplay.setVolume(volume);
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

    return {
        isAvPlayAvailable: isAvPlayAvailable,
        playAzan: playAzan,
        stop: stop,
        getAudioVariantForPrayer: getAudioVariantForPrayer,
        resolveAudioPath: resolveAudioPath
    };
}());
