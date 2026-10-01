// A deliberately small Markdown renderer, so the tour has no outside
// dependencies and runs offline during a pitch. It handles what the chapter
// files use: paragraphs, **bold**, *italics*, `code`, [links](url), lists,
// and [[verify: ...]] notes for unconfirmed claims.

(function () {
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function inline(text) {
    var codes = [];
    var out = escapeHtml(text).replace(/`([^`]+)`/g, function (_, c) {
      codes.push(c);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    out = out
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
        var safe = /^(https?:|#|\.{0,2}\/|[\w-]+\.)/.test(href) ? href : "#";
        return '<a href="' + safe + '" target="_blank" rel="noopener">' + label + "</a>";
      });
    return out.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return "<code>" + codes[Number(i)] + "</code>";
    });
  }

  function renderBlock(block) {
    var lines = block.split("\n");
    if (lines.every(function (l) { return /^\s*[-*] /.test(l) || /^\s{2,}\S/.test(l); }) && /^\s*[-*] /.test(lines[0])) {
      return "<ul>" + splitItems(lines, /^\s*[-*] /).map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</ul>";
    }
    if (/^\d+\. /.test(lines[0])) {
      return "<ol>" + splitItems(lines, /^\d+\. /).map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</ol>";
    }
    return "<p>" + inline(lines.join(" ")) + "</p>";
  }

  function splitItems(lines, marker) {
    var items = [];
    lines.forEach(function (l) {
      if (marker.test(l)) items.push(l.replace(marker, ""));
      else items[items.length - 1] += " " + l.trim();
    });
    return items;
  }

  // Returns { html, notes } where notes are the [[verify: ...]] texts.
  function render(md) {
    var notes = [];
    var body = md.replace(/\[\[verify:\s*([\s\S]*?)\]\]/g, function (_, note) {
      notes.push(note.replace(/\s+/g, " ").trim());
      return "";
    });
    var html = body
      .split(/\n\s*\n/)
      .map(function (b) { return b.trim(); })
      .filter(Boolean)
      .map(renderBlock)
      .join("\n");
    return { html: html, notes: notes };
  }

  // Splits a chapter file into its title and "## " sections, keyed by
  // lower-cased heading ("story", "takeaway", "under the hood").
  function parseChapter(md) {
    var title = (md.match(/^# (.+)$/m) || [, ""])[1].trim();
    var sections = {};
    var parts = md.split(/^## /m).slice(1);
    parts.forEach(function (p) {
      var nl = p.indexOf("\n");
      if (nl < 0) nl = p.length;
      var name = p.slice(0, nl).trim().toLowerCase();
      sections[name] = p.slice(nl + 1).trim();
    });
    return { title: title, sections: sections };
  }

  var api = { render: render, parseChapter: parseChapter, inline: inline };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.TourMarkdown = api;
})();
