/* Rendu du site à partir de window.DEVFEST (assets/js/data.js). */
(function () {
  "use strict";

  var D = window.DEVFEST;
  if (!D) return;

  /** Préfixe des liens : "" à la racine, "../" dans les sous-pages. */
  var BASE = document.documentElement.getAttribute("data-base") || "";

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function initials(name) {
    return name
      .split(/[\s'-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) {
        return w[0];
      })
      .join("")
      .toUpperCase();
  }

  function mount(id, builder) {
    var host = document.getElementById(id);
    if (host) builder(host);
  }

  /* ---------------------------------------------------------------- Nav --- */

  var NAV_LINKS = [
    { href: "schedule/", label: "Programme" },
    { href: "speakers/", label: "Speakers" },
    { href: "faqs/", label: "FAQ" },
    { href: "team/", label: "Équipe" },
  ];

  function buildNav() {
    var current = document.body.getAttribute("data-page") || "";

    var links = el("div", { class: "nav__links", id: "nav-links" });
    NAV_LINKS.forEach(function (l) {
      var slug = l.href.replace("/", "");
      links.appendChild(
        el("a", {
          href: BASE + l.href,
          text: l.label,
          "aria-current": current === slug ? "page" : null,
        })
      );
    });
    links.appendChild(
      el("a", {
        class: "btn btn--primary btn--sm",
        href: D.event.registerUrl,
        target: "_blank",
        rel: "noopener",
        text: "Je m'inscris",
      })
    );

    var toggle = el("button", {
      class: "nav__toggle",
      type: "button",
      "aria-label": "Ouvrir le menu",
      "aria-expanded": "false",
      "aria-controls": "nav-links",
    });
    toggle.appendChild(el("img", { src: BASE + "assets/img/hamburger.svg", alt: "" }));
    toggle.addEventListener("click", function () {
      var open = links.getAttribute("data-open") === "true";
      links.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", !open ? "Fermer le menu" : "Ouvrir le menu");
    });

    var brand = el("a", { class: "nav__brand", href: BASE + "index.html" }, [
      el("img", { src: BASE + "assets/img/devfest-logo.svg", alt: "" }),
      el("span", { text: "DevFest " + D.event.city }),
    ]);

    return el("nav", { class: "nav" }, [
      el("div", { class: "container nav__inner" }, [brand, links, toggle]),
    ]);
  }

  /* ------------------------------------------------------------- Footer --- */

  function buildFooter() {
    var brand = el("div", { class: "footer__brand" }, [
      el("h4", { class: "display-sm", text: D.community.name }),
      el("p", { text: D.community.description }),
      el("p", { text: D.community.disclaimer }),
    ]);

    var navCol = el("div", {}, [el("h4", { class: "display-sm", text: "Le DevFest" })]);
    var navList = el("ul");
    NAV_LINKS.forEach(function (l) {
      navList.appendChild(el("li", {}, [el("a", { href: BASE + l.href, text: l.label })]));
    });
    navList.appendChild(
      el("li", {}, [
        el("a", {
          href: D.event.registerUrl,
          target: "_blank",
          rel: "noopener",
          text: "S'inscrire (gratuit)",
        }),
      ])
    );
    navCol.appendChild(navList);

    var comCol = el("div", {}, [el("h4", { class: "display-sm", text: "La communauté" })]);
    var comList = el("ul");
    D.community.socials.forEach(function (s) {
      comList.appendChild(
        el("li", {}, [el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label })])
      );
    });
    comCol.appendChild(comList);

    var socials = el("div", { class: "footer__socials" });
    D.community.socials.forEach(function (s) {
      socials.appendChild(
        el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label })
      );
    });

    return el("footer", { class: "footer" }, [
      el("div", { class: "container" }, [
        el("div", { class: "footer__top" }, [brand, navCol, comCol]),
        el("div", { class: "footer__bottom" }, [
          el("p", {
            text:
              "© " +
              new Date().getFullYear() +
              " " +
              D.community.name +
              ". DevFest est une marque de la communauté Google Developer Groups.",
          }),
          socials,
        ]),
      ]),
    ]);
  }

  /* --------------------------------------------------------------- Hero --- */

  function buildHeroPattern() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "hero__pattern");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("viewBox", "0 0 100 100");
    var colors = ["#EA4335", "#4285F4", "#F9AB00", "#34A853"];
    for (var i = 0; i < 60; i++) {
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", ((i * 37) % 100).toFixed(1));
      c.setAttribute("cy", ((i * 61) % 100).toFixed(1));
      c.setAttribute("r", (0.6 + (i % 5) * 0.35).toFixed(2));
      c.setAttribute("fill", colors[i % 4]);
      c.setAttribute("opacity", "0.55");
      svg.appendChild(c);
    }
    return svg;
  }

  function buildHero() {
    var title = el("div", { class: "hero__title" }, [
      el("span", { text: "DEVFEST" }),
      el("span", { class: "hero__city" }, [
        el("img", { src: BASE + "assets/img/devfest-logo.svg", alt: "" }),
        el("span", { text: D.event.cityDisplay }),
      ]),
    ]);

    var stage = el("div", { class: "hero__stage" }, [
      buildHeroPattern(),
      title,
      el("div", { class: "hero__year", text: D.event.year }),
    ]);

    var cta = el("div", { class: "hero__cta" }, [
      el("a", {
        class: "btn btn--primary hero__cta-btn",
        href: D.event.registerHref || D.event.registerUrl,
        target: "_blank",
        rel: "noopener",
        text: "Je m'inscris",
      }),
      el("div", { class: "hero__meta" }, [
        el("span", { text: D.event.datesShort }),
        el("img", { src: BASE + "assets/img/arrow.svg", alt: "", width: "16" }),
        el("span", { text: D.event.venueShort }),
      ]),
    ]);

    return el("section", { class: "hero" }, [stage, cta]);
  }

  /* ------------------------------------------------------------ Marquee --- */

  function buildMarquee() {
    var words = [
      D.event.price,
      D.event.datesShort,
      D.community.members.toLocaleString("fr-FR") + " membres",
      D.event.rsvp + " participants annoncés",
      "DevFest " + D.event.city + " " + D.event.year,
      D.speakers.length + " speakers",
    ];
    var track = el("div", { class: "marquee__track" });
    for (var pass = 0; pass < 2; pass++) {
      words.forEach(function (w) {
        track.appendChild(el("span", { text: "★ " + w }));
      });
    }
    return el("div", { class: "marquee", "aria-hidden": "true" }, [track]);
  }

  /* ----------------------------------------------------------- Speakers --- */

  function speakerCard(s, i) {
    var links = el("div", { class: "speaker__links" });
    Object.keys(s.social || {}).forEach(function (k) {
      links.appendChild(
        el("a", {
          href: s.social[k],
          target: "_blank",
          rel: "noopener",
          title: s.name + " sur " + k,
          text: k === "x" ? "X" : k.slice(0, 2).toUpperCase(),
        })
      );
    });

    var tags = el("div", { class: "speaker__tags" });
    (s.tags || []).forEach(function (t) {
      tags.appendChild(el("span", { text: t }));
    });

    var info = el("div", { class: "speaker__info" }, [
      el("h3", { class: "speaker__name", text: s.name }),
      el("p", { class: "speaker__role", text: s.role }),
      el("p", { class: "speaker__bio", text: s.bio }),
      tags,
    ]);
    if (links.childNodes.length) info.appendChild(links);

    return el("article", { class: "speaker", "data-tags": (s.tags || []).join("|") }, [
      el("div", {
        class: "speaker__avatar",
        "data-tone": String(i % 4),
        "aria-hidden": "true",
        text: initials(s.name),
      }),
      info,
    ]);
  }

  function renderSpeakers(host, limit) {
    var list = limit ? D.speakers.slice(0, limit) : D.speakers;
    list.forEach(function (s, i) {
      host.appendChild(speakerCard(s, i));
    });
  }

  /** Filtres par thématique sur la page speakers. */
  function renderSpeakerFilters(host, grid) {
    var all = [];
    D.speakers.forEach(function (s) {
      (s.tags || []).forEach(function (t) {
        if (all.indexOf(t) === -1) all.push(t);
      });
    });
    all.sort();
    all.unshift("Tous");

    all.forEach(function (t, i) {
      var b = el("button", {
        class: "filter",
        type: "button",
        "aria-pressed": i === 0 ? "true" : "false",
        text: t,
      });
      b.addEventListener("click", function () {
        host.querySelectorAll(".filter").forEach(function (o) {
          o.setAttribute("aria-pressed", String(o === b));
        });
        grid.querySelectorAll(".speaker").forEach(function (card) {
          var tags = (card.getAttribute("data-tags") || "").split("|");
          card.hidden = t !== "Tous" && tags.indexOf(t) === -1;
        });
      });
      host.appendChild(b);
    });
  }

  /* ---------------------------------------------------------- Programme --- */

  function sessionCard(s, index) {
    var body = el("div", {}, [el("h3", { class: "session__title", text: s.title })]);
    if (s.speaker) body.appendChild(el("p", { class: "session__speaker", text: s.speaker }));

    return el("article", { class: "session", "data-type": s.type || "talk" }, [
      el("div", { class: "session__order", "aria-hidden": "true", text: String(index + 1).padStart(2, "0") }),
      body,
      el("div", { class: "session__room", text: s.room }),
    ]);
  }

  function dayPanel(day) {
    var sessions = el("div", { class: "sessions" });
    day.sessions.forEach(function (s, i) {
      sessions.appendChild(sessionCard(s, i));
    });

    return el("div", { class: "day-card", id: "panel-" + day.id, role: "tabpanel" }, [
      el("div", { class: "day-card__head" }, [
        el("div", {}, [
          el("span", { class: "day-card__badge", text: day.date + " · " + day.window }),
          el("h3", { class: "display-md", text: day.title }),
          el("p", { text: day.description }),
          el("p", { text: "📍 " + day.venue }),
        ]),
        el("a", {
          class: "btn btn--ghost-dark btn--sm",
          href: D.event.registerUrl,
          target: "_blank",
          rel: "noopener",
          text: "Réserver ma place",
        }),
      ]),
      sessions,
      el("p", {
        class: "note",
        text:
          "Les sessions sont présentées dans leur ordre de passage. Les horaires précis par session ne sont pas publiés : la journée se déroule de " +
          day.window +
          ".",
      }),
    ]);
  }

  function renderSchedule(tabsHost, panelsHost) {
    var panels = [];

    D.schedule.forEach(function (day, i) {
      var panel = dayPanel(day);
      panel.hidden = i !== 0;
      panelsHost.appendChild(panel);
      panels.push(panel);

      var tab = el(
        "button",
        {
          class: "day-tab",
          type: "button",
          role: "tab",
          "aria-selected": i === 0 ? "true" : "false",
          "aria-controls": "panel-" + day.id,
        },
        [el("strong", { text: day.tabDay }), el("span", { text: day.tabLabel })]
      );
      tab.addEventListener("click", function () {
        tabsHost.querySelectorAll(".day-tab").forEach(function (o, j) {
          o.setAttribute("aria-selected", String(o === tab));
          panels[j].hidden = o !== tab;
        });
      });
      tabsHost.appendChild(tab);
    });
  }

  /* ---------------------------------------------------------------- FAQ --- */

  function renderFaqs(host, limit) {
    var list = limit ? D.faqs.slice(0, limit) : D.faqs;
    list.forEach(function (f, i) {
      var answer = el("p", { class: "faq__a", id: "faq-a-" + i, text: f.a });
      answer.hidden = true;

      var btn = el(
        "button",
        {
          class: "faq__q",
          type: "button",
          "aria-expanded": "false",
          "aria-controls": "faq-a-" + i,
        },
        [
          el("span", { class: "idx", text: String(i + 1).padStart(2, "0") }),
          el("span", { style: "flex:1", text: f.q }),
          el("span", { class: "sign", "aria-hidden": "true", text: "+" }),
        ]
      );
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        answer.hidden = open;
      });

      host.appendChild(el("div", { class: "faq" }, [btn, answer]));
    });
  }

  /* ------------------------------------------------------- Blocs divers --- */

  function renderPasses(host) {
    D.passes.forEach(function (p) {
      var perks = el("ul", { class: "pass__perks" });
      p.perks.forEach(function (perk) {
        perks.appendChild(el("li", { text: perk }));
      });
      host.appendChild(
        el("article", { class: "pass pass--" + p.variant }, [
          el("h3", { class: "display-md", text: p.title }),
          el("p", { class: "pass__price", html: p.price + "<small>" + p.priceNote + "</small>" }),
          el("p", { text: p.description }),
          perks,
          el("a", {
            class: "btn btn--dark",
            href: D.event.registerUrl,
            target: "_blank",
            rel: "noopener",
            text: "Je réserve",
          }),
        ])
      );
    });
  }

  function renderPartners(host) {
    D.partners.current.forEach(function (p) {
      host.appendChild(el("div", { class: "partner", text: p.name }));
    });
    D.partners.past.forEach(function (p) {
      if (D.partners.current.some(function (c) { return c.name === p.name; })) return;
      host.appendChild(el("div", { class: "partner partner--muted", text: p.name }));
    });
  }

  function renderTracks(host) {
    D.tracks.forEach(function (t) {
      host.appendChild(el("div", { class: "track", text: t }));
    });
  }

  function renderTeam(host) {
    D.team.forEach(function (m, i) {
      host.appendChild(
        el("article", { class: "member" }, [
          el("div", {
            class: "member__avatar",
            "data-tone": String(i % 4),
            "aria-hidden": "true",
            text: initials(m.name),
          }),
          el("div", {}, [
            el("h3", { text: m.name }),
            el("p", { text: m.role + " · " + m.org }),
          ]),
        ])
      );
    });
  }

  function renderStats(host) {
    [
      { n: D.community.members.toLocaleString("fr-FR"), l: "membres GDG Yaoundé" },
      { n: String(D.event.rsvp), l: "participants annoncés" },
      { n: String(D.speakers.length), l: "speakers & experts" },
      { n: String(D.pastEditions.length + 1), l: "éditions du DevFest" },
    ].forEach(function (s) {
      host.appendChild(
        el("div", { class: "stat" }, [el("strong", { text: s.n }), el("span", { text: s.l })])
      );
    });
  }

  function renderOtherEvents(host) {
    D.otherEvents.forEach(function (e) {
      host.appendChild(
        el("li", {}, [el("strong", { text: e.name }), document.createTextNode(" — " + e.note)])
      );
    });
  }

  /* ------------------------------------------------------------- Montage -- */

  document.addEventListener("DOMContentLoaded", function () {
    var navSlot = document.getElementById("site-nav");
    if (navSlot) navSlot.replaceWith(buildNav());

    var footSlot = document.getElementById("site-footer");
    if (footSlot) footSlot.replaceWith(buildFooter());

    mount("hero", function (h) {
      h.replaceWith(buildHero());
    });
    mount("marquee", function (h) {
      h.replaceWith(buildMarquee());
    });

    mount("partners", renderPartners);
    mount("passes", renderPasses);
    mount("tracks", renderTracks);
    mount("team", renderTeam);
    mount("stats", renderStats);
    mount("other-events", renderOtherEvents);

    mount("speakers-preview", function (h) {
      renderSpeakers(h, 6);
    });
    mount("speakers-all", function (h) {
      renderSpeakers(h);
      var filters = document.getElementById("speaker-filters");
      if (filters) renderSpeakerFilters(filters, h);
    });

    mount("day-tabs", function (tabs) {
      var panels = document.getElementById("day-panels");
      if (panels) renderSchedule(tabs, panels);
    });

    mount("faqs-preview", function (h) {
      renderFaqs(h, 4);
    });
    mount("faqs-all", function (h) {
      renderFaqs(h);
    });

    // Textes pilotés par les données
    document.querySelectorAll("[data-field]").forEach(function (node) {
      var path = node.getAttribute("data-field").split(".");
      var val = path.reduce(function (acc, k) {
        return acc == null ? acc : acc[k];
      }, D);
      if (val != null) node.textContent = val;
    });
  });
})();
