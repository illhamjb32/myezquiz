/* ============================================================
   EZQuiz — quiz-data.js
   Template soal + storage + encode/decode link share.
   Plain script (tanpa module) supaya jalan via file:// juga.
   ============================================================ */
(function (global) {
  'use strict';

  var STORE_KEY = 'ezquiz_quizzes_v1';
  var SCORE_KEY = 'ezquiz_scores_v1';

  function uid(prefix) {
    return (prefix || 'q') + '_' +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- TEMPLATE SOAL (edit / tambah sesukamu) ---------- */
  var TEMPLATE_QUIZZES = [
    {
      id: 'tpl_matematika',
      title: 'Matematika Seru — Level 1',
      desc: 'Penjumlahan & pengurangan cepat. Cocok buat pemanasan.',
      timePerQ: 20,
      questions: [
        { q: '7 + 8 = ...', options: ['13', '14', '15', '16'], answer: 2, points: 100 },
        { q: '20 − 9 = ...', options: ['9', '10', '11', '12'], answer: 2, points: 100 },
        { q: '3 × 4 = ...', options: ['7', '10', '12', '14'], answer: 2, points: 150 },
        { q: '25 : 5 = ...', options: ['4', '5', '6', '7'], answer: 1, points: 150 },
        { q: '9 + 6 − 4 = ...', options: ['9', '10', '11', '12'], answer: 2, points: 200 }
      ]
    },
    {
      id: 'tpl_inggris',
      title: 'English Mini Quiz — Greetings',
      desc: 'Tipe Duolingo: pilih jawaban yang tepat.',
      timePerQ: 20,
      questions: [
        { q: '"Selamat pagi" dalam bahasa Inggris adalah...', options: ['Good night', 'Good morning', 'Good bye', 'Good evening'], answer: 1, points: 100 },
        { q: 'Lawan kata dari "big" adalah...', options: ['Large', 'Huge', 'Small', 'Tall'], answer: 2, points: 100 },
        { q: 'She ___ a student.', options: ['am', 'is', 'are', 'be'], answer: 1, points: 150 },
        { q: 'Bahasa Inggrisnya "kucing" adalah...', options: ['Dog', 'Bird', 'Fish', 'Cat'], answer: 3, points: 100 }
      ]
    }
  ];

  function blankQuiz() {
    return {
      id: uid('quiz'),
      title: 'Kuis Baru',
      desc: '',
      timePerQ: 20,
      questions: [
        { q: 'Contoh: Ibu kota Indonesia adalah...', options: ['Bandung', 'Jakarta', 'Surabaya', 'Medan'], answer: 1, points: 100 }
      ],
      updatedAt: new Date().toISOString()
    };
  }

  function blankQuestion() {
    return { q: '', options: ['', '', '', ''], answer: 0, points: 100 };
  }

  /* ---------- STORAGE (localStorage) ---------- */
  function loadAll() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        var seeded = TEMPLATE_QUIZZES.map(function (t) {
          return JSON.parse(JSON.stringify(t));
        });
        localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveAll(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list || []));
  }

  function getById(id) {
    var list = loadAll();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function upsert(quiz) {
    var list = loadAll();
    quiz.updatedAt = new Date().toISOString();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === quiz.id) { list[i] = quiz; found = true; break; }
    }
    if (!found) list.unshift(quiz);
    saveAll(list);
    return quiz;
  }

  function removeQuiz(id) {
    saveAll(loadAll().filter(function (q) { return q.id !== id; }));
  }

  /* ---------- SCOREBOARD (per quiz, browser lokal) ---------- */
  function getScores(quizId) {
    try {
      var all = JSON.parse(localStorage.getItem(SCORE_KEY) || '{}');
      return all[quizId] || [];
    } catch (e) { return []; }
  }

  function addScore(quizId, entry) {
    try {
      var all = JSON.parse(localStorage.getItem(SCORE_KEY) || '{}');
      if (!all[quizId]) all[quizId] = [];
      entry.at = new Date().toISOString();
      all[quizId].push(entry);
      all[quizId].sort(function (a, b) { return (b.xp || 0) - (a.xp || 0); });
      all[quizId] = all[quizId].slice(0, 20);
      localStorage.setItem(SCORE_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  /* ---------- SHARE LINK (kuis dikodekan ke URL hash) ---------- */
  function encodeQuiz(quiz) {
    var json = JSON.stringify(quiz);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeQuiz(str) {
    var b64 = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var json = decodeURIComponent(escape(atob(b64)));
    var quiz = JSON.parse(json);
    if (!quiz || !Array.isArray(quiz.questions)) throw new Error('bad quiz');
    return quiz;
  }

  function shareUrl(quiz, playerPage) {
    var page = playerPage || 'quiz.html';
    var base = location.href.split('#')[0].split('?')[0];
    base = base.substring(0, base.lastIndexOf('/') + 1) + page;
    return base + '#d=' + encodeQuiz(quiz);
  }

  function quizFromUrl() {
    // Prioritas 1: soal ter-encode di hash (#d=...)
    var m = location.hash.match(/#d=(.+)/);
    if (m) {
      try { return { quiz: decodeQuiz(m[1]), shared: true }; }
      catch (e) { return { error: 'Link kuis rusak / tidak valid.' }; }
    }
    // Prioritas 2: ?id= (kuis milik browser ini)
    var q = new URLSearchParams(location.search).get('id');
    if (q) {
      var found = getById(q);
      if (found) return { quiz: found, shared: false };
      return { error: 'Kuis tidak ditemukan di perangkat ini. Minta link baru (yang ada #d=) ke gurumu.' };
    }
    return { error: null, quiz: null };
  }

  global.EZQuiz = {
    TEMPLATE_QUIZZES: TEMPLATE_QUIZZES,
    blankQuiz: blankQuiz,
    blankQuestion: blankQuestion,
    loadAll: loadAll,
    saveAll: saveAll,
    getById: getById,
    upsert: upsert,
    removeQuiz: removeQuiz,
    getScores: getScores,
    addScore: addScore,
    encodeQuiz: encodeQuiz,
    decodeQuiz: decodeQuiz,
    shareUrl: shareUrl,
    quizFromUrl: quizFromUrl,
    uid: uid,
    escapeHtml: escapeHtml
  };
})(window);
