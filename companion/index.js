'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const cron = require('node-cron');
const wol = require('wake_on_lan');

const CONFIG_PATH = process.env.AZANTV_CONFIG || path.join(__dirname, 'config.json');
const ADHAN_BUNDLE = path.join(__dirname, '..', 'src', 'vendor', 'adhan.min.js');
const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_LABELS = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha'
};

let adhan = null;
let config = loadConfig();
let scheduledJobs = [];
let lastStatus = { startedAt: new Date().toISOString(), events: [] };

function loadAdhan() {
  if (adhan) {
    return adhan;
  }
  const sandbox = {};
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  const code = fs.readFileSync(ADHAN_BUNDLE, 'utf8');
  vm.runInNewContext(code, sandbox, { filename: 'adhan.min.js' });
  adhan = sandbox.adhan;
  if (!adhan || !adhan.PrayerTimes) {
    throw new Error('Failed to load adhan UMD bundle');
  }
  return adhan;
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Missing config.json – copy config.example.json to config.json');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getMethod(methodName) {
  const lib = loadAdhan();
  const methods = lib.CalculationMethod;
  if (methods[methodName]) {
    return methods[methodName]();
  }
  return methods.MuslimWorldLeague();
}

function buildParams(cfg) {
  const lib = loadAdhan();
  const params = getMethod(cfg.calculationMethod);
  params.madhab = cfg.madhab === 'Hanafi' ? lib.Madhab.Hanafi : lib.Madhab.Shafi;
  params.adjustments = {
    fajr: (cfg.offsets && cfg.offsets.fajr) || 0,
    sunrise: 0,
    dhuhr: (cfg.offsets && cfg.offsets.dhuhr) || 0,
    asr: (cfg.offsets && cfg.offsets.asr) || 0,
    maghrib: (cfg.offsets && cfg.offsets.maghrib) || 0,
    isha: (cfg.offsets && cfg.offsets.isha) || 0
  };
  return params;
}

function prayerDateToLocal(baseDate, prayerUtcDate) {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  d.setHours(
    prayerUtcDate.getUTCHours(),
    prayerUtcDate.getUTCMinutes(),
    prayerUtcDate.getUTCSeconds(),
    0
  );
  return d;
}

function getTodayTimes(cfg, date) {
  date = date || new Date();
  const lib = loadAdhan();
  const coords = new lib.Coordinates(cfg.latitude, cfg.longitude);
  const params = buildParams(cfg);
  const calcDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const times = new lib.PrayerTimes(coords, calcDate, params);
  const result = {};
  PRAYER_KEYS.forEach(function (key) {
    result[key] = prayerDateToLocal(calcDate, times[key]);
  });
  return result;
}

function getEnabledPrayerEvents(cfg, date) {
  const today = getTodayTimes(cfg, date);
  return PRAYER_KEYS.filter(function (key) {
    return cfg.enabledPrayers && cfg.enabledPrayers[key] !== false;
  }).map(function (key) {
    return {
      key: key,
      label: PRAYER_LABELS[key],
      time: today[key]
    };
  });
}

function sendWoL(mac) {
  return new Promise(function (resolve, reject) {
    wol.wake(mac, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function launchApp(cfg) {
  if (!cfg.schedule.enableLaunch) {
    return Promise.resolve({ skipped: true, reason: 'launch disabled' });
  }
  const tv = cfg.tv;
  if (!tv.ip || !tv.appId) {
    return Promise.resolve({ skipped: true, reason: 'missing tv ip or appId' });
  }

  const port = tv.restPort || 8001;
  const url = 'http://' + tv.ip + ':' + port + '/api/v2/applications/' + tv.appId;
  const headers = { 'Content-Type': 'application/json' };
  if (tv.token) {
    headers.Authorization = 'Bearer ' + tv.token;
  }

  return fetch(url, { method: 'POST', headers: headers }).then(function (res) {
    if (!res.ok) {
      throw new Error('Launch failed HTTP ' + res.status);
    }
    return { launched: true };
  });
}

function scheduleEvent(cfg, event, kind, runAt) {
  const now = Date.now();
  const delay = runAt.getTime() - now;
  if (delay <= 0 || delay > 24 * 60 * 60 * 1000) {
    return null;
  }

  const timeout = setTimeout(function () {
    if (kind === 'wol') {
      sendWoL(cfg.tv.mac).then(function () {
        logEvent('WoL sent for ' + event.label + ' (' + cfg.tv.mac + ')');
      }).catch(function (err) {
        logEvent('Error (wol) for ' + event.label + ': ' + err.message);
      });
    } else if (kind === 'launch') {
      launchApp(cfg).then(function (result) {
        logEvent('Launch attempt for ' + event.label + ': ' + JSON.stringify(result));
      }).catch(function (err) {
        logEvent('Error (launch) for ' + event.label + ': ' + err.message);
      });
    }
  }, delay);

  scheduledJobs.push(timeout);
  return runAt.toISOString();
}

function clearJobs() {
  scheduledJobs.forEach(clearTimeout);
  scheduledJobs = [];
}

function planDay(cfg) {
  clearJobs();
  const events = getEnabledPrayerEvents(cfg);
  const planned = [];

  events.forEach(function (event) {
    const wolSec = (cfg.schedule && cfg.schedule.wolSecondsBefore) || 60;
    const launchSec = (cfg.schedule && cfg.schedule.launchSecondsBefore) || 30;
    const wolAt = new Date(event.time.getTime() - wolSec * 1000);
    const launchAt = new Date(event.time.getTime() - launchSec * 1000);

    planned.push({
      prayer: event.label,
      prayerTime: event.time.toISOString(),
      wolAt: scheduleEvent(cfg, event, 'wol', wolAt),
      launchAt: scheduleEvent(cfg, event, 'launch', launchAt)
    });
  });

  lastStatus.planned = planned;
  lastStatus.replannedAt = new Date().toISOString();
  console.log('Companion planned', planned.length, 'prayer events for today');
  return planned;
}

function logEvent(message) {
  const entry = { at: new Date().toISOString(), message: message };
  lastStatus.events.unshift(entry);
  lastStatus.events = lastStatus.events.slice(0, 50);
  console.log('[AzanTV Companion]', message);
}

function startHttpServer(cfg) {
  const port = (cfg.http && cfg.http.port) || 8787;
  const host = (cfg.http && cfg.http.host) || '0.0.0.0';

  const server = http.createServer(function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url === '/status') {
      res.end(JSON.stringify(lastStatus, null, 2));
      return;
    }

    if (req.method === 'GET' && req.url === '/plan') {
      res.end(JSON.stringify(planDay(cfg), null, 2));
      return;
    }

    if (req.method === 'POST' && req.url === '/trigger-test') {
      sendWoL(cfg.tv.mac).then(function () {
        if (cfg.schedule.enableLaunch) {
          return launchApp(cfg);
        }
        return null;
      }).then(function (launchResult) {
        logEvent('Manual test trigger executed');
        res.end(JSON.stringify({ ok: true, wol: true, launch: launchResult }));
      }).catch(function (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, error: err.message }));
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/reload') {
      config = loadConfig();
      cfg = config;
      res.end(JSON.stringify({ ok: true, planned: planDay(cfg) }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, host, function () {
    console.log('HTTP API on http://' + host + ':' + port);
  });
}

function scheduleDailyReplan(cfg) {
  cron.schedule('0 0 * * *', function () {
    config = loadConfig();
    planDay(config);
  });
}

function main() {
  loadAdhan();

  if (process.argv.indexOf('--test-wol') !== -1) {
    sendWoL(config.tv.mac).then(function () {
      console.log('WoL packet sent to', config.tv.mac);
    }).catch(function (err) {
      console.error(err);
      process.exit(1);
    });
    return;
  }

  if (!config.tv || !config.tv.mac) {
    console.error('config.tv.mac is required');
    process.exit(1);
  }

  planDay(config);
  scheduleDailyReplan(config);
  startHttpServer(config);

  console.log('AzanTV Companion running');
  console.log('TV IP:', config.tv.ip, 'MAC:', config.tv.mac);
}

main();
