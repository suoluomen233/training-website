/* ============================================
   教练能力提升工作坊 · 交互脚本
   纯原生 JS，无依赖，可离线运行
   ============================================ */

(function () {
  "use strict";

  var content = document.getElementById("content");
  var nav = document.getElementById("nav");
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll(".nav-link"));
  var topTitle = document.getElementById("topTitle");
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("overlay");
  var menuBtn = document.getElementById("menuBtn");
  var themeBtn = document.getElementById("themeBtn");
  var search = document.getElementById("search");
  var progressFill = document.getElementById("progressFill");
  var progressText = document.getElementById("progressText");

  var TOTAL = navLinks.length;

  /* ---------------- 主题 ---------------- */
  var STORE_KEY = "coachhub.theme";
  try {
    var savedTheme = localStorage.getItem(STORE_KEY);
    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch (e) {}

  function syncThemeBtn() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    themeBtn.textContent = dark ? "切换浅色模式" : "切换深色模式";
  }
  syncThemeBtn();

  themeBtn.addEventListener("click", function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    try {
      localStorage.setItem(STORE_KEY, dark ? "light" : "dark");
    } catch (e) {}
    syncThemeBtn();
  });

  /* ---------------- 阅读进度 ---------------- */
  var VISIT_KEY = "coachhub.visited";
  var visited = {};
  try {
    visited = JSON.parse(localStorage.getItem(VISIT_KEY) || "{}");
  } catch (e) {
    visited = {};
  }

  function updateProgress() {
    var done = 0;
    navLinks.forEach(function (a) {
      if (visited[a.getAttribute("data-page")]) done++;
    });
    var pct = Math.round((done / TOTAL) * 100);
    progressFill.style.width = pct + "%";
    progressText.textContent = pct + "%";
  }
  updateProgress();

  /* ---------------- 移动端菜单 ---------------- */
  function closeMenu() {
    sidebar.classList.remove("open");
    overlay.classList.remove("on");
  }
  menuBtn.addEventListener("click", function () {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("on");
  });
  overlay.addEventListener("click", closeMenu);

  /* ---------------- 页面切换 ---------------- */
  function showPage(key, push) {
    var target = document.getElementById("page-" + key);
    if (!target) return;

    Array.prototype.forEach.call(document.querySelectorAll(".page"), function (p) {
      p.classList.remove("active");
    });
    target.classList.add("active");

    navLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-page") === key);
    });

    topTitle.textContent = navLinks.filter(function (a) {
      return a.getAttribute("data-page") === key;
    })[0].textContent.trim();

    if (!visited[key]) {
      visited[key] = 1;
      try {
        localStorage.setItem(VISIT_KEY, JSON.stringify(visited));
      } catch (e) {}
      updateProgress();
    }

    if (push) {
      try {
        history.replaceState(null, "", "#" + key);
      } catch (e) {}
    }

    window.scrollTo(0, 0);
    closeMenu();
    clearSearch();
  }

  navLinks.forEach(function (a) {
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      showPage(a.getAttribute("data-page"), true);
    });
  });

  function currentPage() {
    var p = document.querySelector(".page.active");
    return p ? p.id.replace("page-", "") : "home";
  }

  /* ---------------- 初始页面（支持 #锚点） ---------------- */
  (function initPage() {
    var hash = (location.hash || "").replace("#", "");
    if (hash && document.getElementById("page-" + hash)) {
      showPage(hash, false);
    } else {
      topTitle.textContent = "首页 / 使用说明";
      visited.home = 1;
      try {
        localStorage.setItem(VISIT_KEY, JSON.stringify(visited));
      } catch (e) {}
      updateProgress();
    }
  })();

  window.addEventListener("hashchange", function () {
    var hash = (location.hash || "").replace("#", "");
    if (hash) showPage(hash, false);
  });

  /* ---------------- 搜索 ---------------- */
  function clearSearch() {
    if (search && search.value) {
      search.value = "";
    }
  }

  function gotoPage(key) {
    showPage(key, true);
  }

  var timer = null;
  search.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(runSearch, 220);
  });

  search.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      clearTimeout(timer);
      runSearch();
    }
  });

  function runSearch() {
    var q = search.value.trim();
    if (q.length < 1) return;

    var lower = q.toLowerCase();
    var hits = [];

    Array.prototype.forEach.call(document.querySelectorAll(".page"), function (p) {
      var txt = p.textContent || "";
      if (txt.toLowerCase().indexOf(lower) !== -1) {
        hits.push({
          key: p.id.replace("page-", ""),
          title: p.querySelector("h1") ? p.querySelector("h1").textContent.trim() : p.id
        });
      }
    });

    if (hits.length === 0) {
      alert("没有找到「" + q + "」相关内容。\n可以换个更短的关键词试试，例如：骨龄、周期化、ACWR、选材、热身。");
      return;
    }

    if (hits.length === 1) {
      gotoPage(hits[0].key);
      highlight(q);
      return;
    }

    var list = hits.map(function (h, i) {
      return (i + 1) + ". " + h.title;
    }).join("\n");

    var ans = window.prompt(
      "找到 " + hits.length + " 个包含「" + q + "」的章节，请输入编号跳转：\n\n" + list,
      "1"
    );

    if (ans === null) return;
    var idx = parseInt(ans, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= hits.length) {
      gotoPage(hits[idx - 1].key);
      highlight(q);
    }
  }

  /* 简单高亮：在 active 页面中把命中词包进 <mark> */
  function highlight(q) {
    var page = document.querySelector(".page.active");
    if (!page || !q) return;

    // 先把上一次的高亮还原
    Array.prototype.forEach.call(page.querySelectorAll("mark.hit"), function (m) {
      var parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });

    var needle = q.toLowerCase();
    var walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var tag = node.parentNode ? node.parentNode.nodeName : "";
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "MARK") return NodeFilter.FILTER_REJECT;
        return node.nodeValue.toLowerCase().indexOf(needle) !== -1
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    }, false);

    var targets = [];
    var n;
    while ((n = walker.nextNode())) targets.push(n);

    targets.forEach(function (node) {
      var text = node.nodeValue;
      var low = text.toLowerCase();
      var frag = document.createDocumentFragment();
      var pos = 0;
      var at;
      while ((at = low.indexOf(needle, pos)) !== -1) {
        if (at > pos) frag.appendChild(document.createTextNode(text.slice(pos, at)));
        var mark = document.createElement("mark");
        mark.className = "hit";
        mark.textContent = text.slice(at, at + needle.length);
        frag.appendChild(mark);
        pos = at + needle.length;
      }
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });

    var first = page.querySelector("mark.hit");
    if (first && first.scrollIntoView) {
      first.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /* ---------------- 返回顶部 ---------------- */
  var toTop = document.createElement("button");
  toTop.id = "toTop";
  toTop.type = "button";
  toTop.textContent = "↑";
  toTop.title = "回到顶部";
  document.body.appendChild(toTop);

  window.addEventListener("scroll", function () {
    if (window.scrollY > 400) {
      toTop.classList.add("on");
    } else {
      toTop.classList.remove("on");
    }
  });

  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------------- 键盘快捷键 ---------------- */
  document.addEventListener("keydown", function (ev) {
    // Ctrl/Cmd + K 聚焦搜索
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
      ev.preventDefault();
      search.focus();
      search.select();
      return;
    }

    // 输入框里不触发左右翻页
    if (document.activeElement === search) return;
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;

    if (ev.key === "ArrowRight") {
      var idx = navLinks.findIndex(function (a) {
        return a.classList.contains("active");
      });
      if (idx < navLinks.length - 1) {
        showPage(navLinks[idx + 1].getAttribute("data-page"), true);
      }
    }

    if (ev.key === "ArrowLeft") {
      var i2 = navLinks.findIndex(function (a) {
        return a.classList.contains("active");
      });
      if (i2 > 0) {
        showPage(navLinks[i2 - 1].getAttribute("data-page"), true);
      }
    }
  });

  /* ---------------- 打印当前页 ---------------- */
  window.addEventListener("beforeprint", function () {
    // 确保只打印当前页面
    var active = document.querySelector(".page.active");
    if (active) active.dataset.printing = "1";
  });

  /* ---------------- 表单可填写（便于直接在浏览器里填） ---------------- */
  // 让 form 表格中的空单元格点击后可以输入内容（打印时保持排版）
  Array.prototype.forEach.call(document.querySelectorAll("table.form td"), function (td) {
    if (td.classList.contains("lbl")) return;
    if (td.textContent.trim() !== "") return;
    td.setAttribute("contenteditable", "true");
    td.style.outline = "none";
  });

})();