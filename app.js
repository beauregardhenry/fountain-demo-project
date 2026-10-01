// The tour shell: loads content/tour.json, renders one chapter at a time from
// its Markdown file, and plays the chapter's recording in the stage panel.
//
// Live mode (driving a real Fountain conversation) is not built yet; see
// docs/OPEN-QUESTIONS.md. Every chapter currently plays from a recording.

(function () {
  var MD = window.TourMarkdown;
  var $ = function (id) { return document.getElementById(id); };

  // ?speed=4 plays recordings four times faster (for rehearsal and tests).
  var SPEED = Math.max(0.1, Number(new URLSearchParams(location.search).get("speed")) || 1);

  var tour = null;
  var index = 0;
  var cache = {};

  function fetchText(path) {
    if (!cache[path]) {
      cache[path] = fetch(path).then(function (r) {
        if (!r.ok) throw new Error(path + ": " + r.status);
        return r.text();
      });
    }
    return cache[path];
  }

  // ---- Replay player --------------------------------------------------------

  var player = {
    events: [],
    next: 0,
    clock: 0,
    timer: null,

    load: function (recording) {
      this.stop();
      this.events = (recording && recording.events) || [];
      this.next = 0;
      this.clock = 0;
      $("log").innerHTML = "";
      setState("idle");
      $("play").textContent = "Play";
      $("play").disabled = !this.events.length;
      $("restart").disabled = !this.events.length;
    },

    play: function () {
      if (this.timer || !this.events.length) return;
      if (this.next >= this.events.length) this.restart();
      var self = this;
      var last = performance.now();
      this.timer = setInterval(function () {
        var now = performance.now();
        self.clock += (now - last) * SPEED;
        last = now;
        while (self.next < self.events.length && self.events[self.next].at <= self.clock) {
          show(self.events[self.next++]);
        }
        if (self.next >= self.events.length) {
          self.stop();
          $("play").textContent = "Play again";
        }
      }, 50);
      $("play").textContent = "Pause";
    },

    stop: function () {
      clearInterval(this.timer);
      this.timer = null;
      $("play").textContent = "Play";
    },

    toggle: function () { this.timer ? this.stop() : this.play(); },

    restart: function () {
      this.stop();
      this.next = 0;
      this.clock = 0;
      $("log").innerHTML = "";
      setState("idle");
    }
  };

  function show(ev) {
    if (ev.state) setState(ev.state);
    var li = document.createElement("li");
    li.className = "ev ev-" + ev.kind;
    li.innerHTML = '<span class="ev-kind">' + label(ev.kind) + '</span><span class="ev-data"></span>';
    li.querySelector(".ev-data").textContent = ev.data;
    $("log").appendChild(li);
    li.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function label(kind) {
    return {
      prompt: "You", status: "Machine", command: "Runs", output: "Sees",
      file: "Changes", message: "Agent", note: "—"
    }[kind] || kind;
  }

  function setState(state) {
    var el = $("machine-state");
    el.dataset.state = state;
    el.textContent = state;
  }

  // ---- Chapters --------------------------------------------------------------

  function render(i) {
    index = Math.max(0, Math.min(i, tour.chapters.length - 1));
    var ch = tour.chapters[index];
    if (location.hash.slice(1) !== ch.id) history.replaceState(null, "", "#" + ch.id);

    renderProgress();
    $("prev").disabled = index === 0;
    $("next").disabled = index === tour.chapters.length - 1;
    $("eyebrow").textContent = index === 0 || index === tour.chapters.length - 1
      ? "" : "Chapter " + index + " of " + (tour.chapters.length - 2);

    // Ignore a slow load if the presenter has already moved on.
    var current = function () { return tour.chapters[index] === ch; };

    fetchText(ch.file).then(function (md) {
      if (!current()) return;
      var parsed = MD.parseChapter(md);
      var notes = [];
      function section(name) {
        var r = MD.render(parsed.sections[name] || "");
        notes = notes.concat(r.notes);
        return r.html;
      }

      $("chapter-title").textContent = parsed.title;
      document.title = parsed.title + " · " + tour.title;
      $("story").innerHTML = section("story");
      $("takeaway").innerHTML = section("takeaway").replace(/^<p>|<\/p>$/g, "");
      var hood = section("under the hood");
      $("hood").hidden = !hood;
      $("hood").open = false;
      $("hood-body").innerHTML = hood;
      renderNotes(notes);
    }).catch(showError);

    var stage = $("stage");
    if (!ch.recording) {
      stage.hidden = true;
      $("chapter").classList.add("no-stage");
      player.load(null);
      return;
    }
    stage.hidden = false;
    $("chapter").classList.remove("no-stage");
    fetchText(ch.recording).then(function (text) {
      if (!current()) return;
      var rec = JSON.parse(text);
      $("stage-title").textContent = rec.title || "";
      $("placeholder-flag").hidden = !rec.placeholder;
      player.load(rec);
    }).catch(showError);
  }

  function renderNotes(notes) {
    var box = $("draft-notes");
    if (box) box.remove();
    if (!tour.draft || !notes.length) return;
    box = document.createElement("aside");
    box.id = "draft-notes";
    box.className = "draft-notes";
    box.innerHTML = "<strong>To verify before presenting</strong><ul></ul>";
    notes.forEach(function (n) {
      var li = document.createElement("li");
      li.innerHTML = MD.inline(n);
      box.querySelector("ul").appendChild(li);
    });
    document.querySelector(".story").appendChild(box);
  }

  function renderProgress() {
    var nav = $("progress");
    nav.innerHTML = "";
    tour.chapters.forEach(function (ch, i) {
      var a = document.createElement("a");
      a.href = "#" + ch.id;
      a.className = "dot" + (i === index ? " current" : "") + (i < index ? " done" : "");
      a.setAttribute("aria-label", "Go to " + ch.id);
      if (i === index) a.setAttribute("aria-current", "step");
      nav.appendChild(a);
    });
  }

  function showError(err) {
    $("story").innerHTML = '<p class="error">Couldn’t load this chapter. If you opened ' +
      "index.html straight from your files, run it through a local web server instead " +
      "(see README). Details: " + String(err.message || err) + "</p>";
  }

  function indexForHash() {
    var id = location.hash.slice(1);
    var i = tour.chapters.findIndex(function (c) { return c.id === id; });
    return i < 0 ? 0 : i;
  }

  // ---- Wiring ------------------------------------------------------------------

  $("prev").addEventListener("click", function () { render(index - 1); });
  $("next").addEventListener("click", function () { render(index + 1); });
  $("play").addEventListener("click", function () { player.toggle(); });
  $("restart").addEventListener("click", function () { player.restart(); player.play(); });
  window.addEventListener("hashchange", function () { render(indexForHash()); });
  document.addEventListener("keydown", function (e) {
    if (e.target.closest("input, textarea, summary, button")) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    }
    if (e.key === "ArrowRight") render(index + 1);
    else if (e.key === "ArrowLeft") render(index - 1);
    else if (e.key === " " && !$("stage").hidden) { e.preventDefault(); player.toggle(); }
  });

  fetch("content/tour.json")
    .then(function (r) { return r.json(); })
    .then(function (t) {
      tour = t;
      $("tour-title").textContent = t.title;
      $("draft-flag").hidden = !t.draft;
      render(indexForHash());
    })
    .catch(showError);
})();
