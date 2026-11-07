// EnvShield Site JavaScript — Zero dependencies
(function () {
  'use strict';

  // Mobile menu
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      var open = menu.hasAttribute('data-open');
      if (open) {
        menu.removeAttribute('data-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      } else {
        menu.setAttribute('data-open', '');
        menuBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (text) {
        navigator.clipboard.writeText(text).then(function () {
          var orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = orig; }, 2000);
        });
      }
    });
  });

  // Client-side simulator
  var simInput = document.getElementById('sim-input');
  var simOutput = document.getElementById('sim-output');
  var simBadge = document.getElementById('sim-badge');
  var loadSampleBtn = document.getElementById('load-sample-btn');
  var scanBtn = document.getElementById('scan-btn');
  var genBtn = document.getElementById('gen-btn');

  var SAMPLE_LEAKY_ENV = `# Application Config
PORT=3000
NODE_ENV=production
DEBUG=false

# Database Connection (Credential Leaked!)
DATABASE_URL=postgres://root:p@ssw0rd123@db.internal:5432/main_db

# Third Party API Keys & High Entropy Secrets Leaked!
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
SESSION_SECRET=c9f8e7d6c5b4a39281726354453627182930415263748596a7b8c9d0e1f2
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c9f8e7d6c5b4a39281726354453627182930415263748596
OPENAI_API_KEY=sk-proj-abc1234567890abcdef1234567890abcdef1234567890`;

  if (loadSampleBtn && simInput) {
    loadSampleBtn.addEventListener('click', function () {
      simInput.value = SAMPLE_LEAKY_ENV;
      if (simBadge) simBadge.textContent = 'Sample Loaded';
    });
  }

  // Client-side scanner implementation
  function runClientScan(content) {
    var rules = [
      { id: 'aws.access-key', name: 'AWS Access Key ID', regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g },
      { id: 'jwt.token', name: 'JSON Web Token (JWT)', regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
      { id: 'openai.api-key', name: 'OpenAI API Key', regex: /\bsk-(?:proj-)?[a-zA-Z0-9_-]{32,80}\b/g },
      { id: 'entropy.hex-secret', name: 'High-Entropy Secret Key', regex: /\b[a-f0-9]{40,64}\b/gi },
      { id: 'db.credentials', name: 'Database Password in URI', regex: /\b(?:postgres|postgresql|mysql|mongodb):\/\/[a-zA-Z0-9_.-]+:[^@\s/]+@[a-zA-Z0-9_.-]+/gi }
    ];

    var lines = content.split('\n');
    var leaks = [];

    lines.forEach(function (line, idx) {
      rules.forEach(function (r) {
        var match = line.match(r.regex);
        if (match) {
          leaks.push({
            line: idx + 1,
            name: r.name,
            matched: match[0].slice(0, 4) + '****' + match[0].slice(-3)
          });
        }
      });
    });
    return leaks;
  }

  if (scanBtn && simInput && simOutput) {
    scanBtn.addEventListener('click', function () {
      var val = simInput.value.trim();
      if (!val) {
        simOutput.innerHTML = '<span class="c-dim">Please enter .env content or load sample.</span>';
        return;
      }
      var leaks = runClientScan(val);
      if (leaks.length === 0) {
        if (simBadge) { simBadge.textContent = 'Clean · Pass'; simBadge.style.color = '#34D399'; }
        simOutput.innerHTML = '<span class="c-green">✔ No credential leaks or secret patterns detected!</span>\n\nAll variables look safe.';
      } else {
        if (simBadge) { simBadge.textContent = leaks.length + ' Leak(s) Detected'; simBadge.style.color = '#EF4444'; }
        var out = '<span class="c-red">✖ FOUND ' + leaks.length + ' CREDENTIAL LEAK(S):</span>\n\n';
        leaks.forEach(function (l) {
          out += '<span class="c-red">[LEAK]</span> Line ' + l.line + ': ' + l.name + ' (' + l.matched + ')\n';
        });
        out += '\n<span class="c-amber">Recommendation:</span> Sanitize these variables immediately with `envshield generate`.';
        simOutput.innerHTML = out;
      }
    });
  }

  if (genBtn && simInput && simOutput) {
    genBtn.addEventListener('click', function () {
      var val = simInput.value.trim();
      if (!val) {
        simOutput.innerHTML = '<span class="c-dim">Please enter .env content or load sample.</span>';
        return;
      }
      var lines = val.split('\n');
      var sanitized = [];

      lines.forEach(function (line) {
        var trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          sanitized.push(line);
          return;
        }
        var eq = line.indexOf('=');
        if (eq === -1) {
          sanitized.push(line);
          return;
        }
        var key = line.slice(0, eq).trim();
        var kUpper = key.toUpperCase();

        var safeVal = 'your_' + key.toLowerCase() + '_here';
        if (kUpper === 'PORT') safeVal = '3000 # type: port';
        else if (kUpper === 'NODE_ENV') safeVal = 'development';
        else if (kUpper === 'DEBUG') safeVal = 'false # type: boolean';
        else if (kUpper.includes('DATABASE_URL') || kUpper.includes('DB_URI')) safeVal = 'postgres://user:password@localhost:5432/dbname';

        sanitized.push(key + '=' + safeVal);
      });

      if (simBadge) { simBadge.textContent = 'Sanitized Template'; simBadge.style.color = '#34D399'; }
      simOutput.textContent = sanitized.join('\n');
    });
  }

  // Form handling
  var form = document.querySelector('.lead-form');
  if (form) {
    var status = form.querySelector('.form-status');
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) return;

      var email = (form.querySelector('#f-email') || {}).value || '';
      var message = (form.querySelector('#f-msg') || {}).value || '';

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (status) { status.textContent = 'Please enter a valid email address.'; status.className = 'form-status err'; }
        return;
      }
      if (message.length < 10) {
        if (status) { status.textContent = 'Please provide at least 10 characters.'; status.className = 'form-status err'; }
        return;
      }

      var payload = {
        email: email,
        message: message,
        request_type: 'EnvShield inquiry',
        page: 'envshield',
        date: new Date().toISOString(),
        _subject: '[EnvShield] Inquiry or feedback',
        _template: 'table',
        _captcha: 'false'
      };

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      if (status) { status.textContent = 'Sending…'; status.className = 'form-status'; }

      fetch('https://formsubmit.co/ajax/meetcode99@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, j: j }; });
      }).then(function (res) {
        if (res.ok && String(res.j.success) === 'true') {
          if (status) { status.textContent = 'Thanks! A human will reply within a day.'; status.className = 'form-status ok'; }
          form.reset();
        } else {
          if (status) { status.textContent = 'Submission failed. Please email meetcode99@gmail.com directly.'; status.className = 'form-status err'; }
        }
      }).catch(function () {
        if (status) { status.textContent = 'Network error. Please email meetcode99@gmail.com directly.'; status.className = 'form-status err'; }
      }).finally(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }
      });
    });
  }
})();
