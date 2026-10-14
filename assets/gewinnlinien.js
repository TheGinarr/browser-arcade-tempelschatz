/* ============================================================
   gewinnlinien.js · Gewinnlinien-Tabs und Linien-Vorschau für die 5x3-Slots
   ------------------------------------------------------------
   Echte Automaten haben links und rechts vom Walzenfenster kleine farbige
   Nummern-Tabs (1 bis 10), eine pro Gewinnlinie. Dieses Modul baut sie nach:
     - TABS:     5 links (Linien 1 bis 5), 5 rechts (Linien 6 bis 10), jede Linie
                 mit ihrer festen Farbe aus LINIEN_FARBEN.
     - VORSCHAU: Hover (Maus) oder Tippen (Touch, 2 Sekunden) auf einen Tab zeichnet
                 den Verlauf der Linie als farbige Polylinie über die Walzen. Per
                 Tastatur zeigt der Fokus auf dem Tab die Vorschau.
     - GEWINN:   Das Spiel ruft leuchten() / markieren() auf, wenn eine Linie gewinnt.
                 Tab und Polylinie leuchten dann in derselben Linienfarbe.
   Die Verläufe kommen NICHT aus einer Kopie, sondern aus dem Array, das das Spiel
   übergibt (GEWINNLINIEN bzw. LINIEN): Ändert man dort eine Linie, ändern sich
   Vorschau und Tabs mit. Reine Anzeige: Auszahlung, RTP und Konto bleiben unberührt.
   Die Styles stehen in assets/gewinnlinien.css.
   ============================================================ */

import { bewegungReduziert } from "./ui.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Feste Farbe je Linie (Index 0 = Linie 1). Zehn gut unterscheidbare Neon-Töne, die zur
 * Palette der Seite passen und auf der dunklen Bühne mindestens Kontrast 5:1 haben.
 * Die Reihenfolge ist so gemischt, dass Nachbarlinien (1/2, 2/3 …) nie ähnliche Farben bekommen.
 * Die Zahl auf dem Tab bleibt das eigentliche Erkennungszeichen (Farbe allein trägt nichts).
 */
export const LINIEN_FARBEN = [
  "#ff4545", //  1 Rot
  "#a6ff1a", //  2 Limette
  "#3d7bff", //  3 Blau
  "#ff4f98", //  4 Pink
  "#ffd23f", //  5 Gelb
  "#19e3ff", //  6 Cyan
  "#e85cff", //  7 Magenta
  "#ff8a1f", //  8 Orange
  "#25e88a", //  9 Grün
  "#b88cff", // 10 Violett
];

/** So lange bleibt die Vorschau nach einem Tippen (Touch) sichtbar. */
export const VORSCHAU_MS = 2000;

/** Farbe der Linie mit dem 0-basierten Index `nr` (bei mehr Linien als Farben beginnt die Palette von vorn). */
export function linienFarbe(nr) {
  return LINIEN_FARBEN[nr % LINIEN_FARBEN.length];
}

/**
 * Pixelpunkte einer Linie: durch die Mitte jedes Feldes, links und rechts bis zum Rand des
 * Rahmens verlängert (wie die Linienpfeile echter Automaten). `reihen` ist ein Eintrag aus
 * GEWINNLINIEN (eine Reihe je Walze), `mitte(walze, reihe)` liefert {x, y} in Pixeln.
 * Reine Funktion ohne DOM, deshalb in Node testbar.
 */
export function linienPunkte(reihen, mitte, breite) {
  const punkte = reihen.map((reihe, walze) => mitte(walze, reihe));
  punkte.unshift({ x: 0, y: punkte[0].y });
  punkte.push({ x: breite, y: punkte[punkte.length - 1].y });
  return punkte;
}

/** Punkte als SVG-Text: "x1,y1 x2,y2 …" (eine Nachkommastelle reicht für Pixel). */
function punkteText(punkte) {
  return punkte.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** Ein SVG-Element mit Klasse (SVG braucht createElementNS, siehe symbolElement in den Spielen). */
function svgElement(name, klasse) {
  const element = document.createElementNS(SVG_NS, name);
  element.setAttribute("class", klasse);
  return element;
}

/**
 * Baut Tabs und Vorschau auf und gibt die Steuerung für die Gewinn-Anzeige zurück.
 *   linien      das Linien-Array des Spiels (GEWINNLINIEN bzw. LINIEN): je Linie eine Reihe pro Walze
 *   namen       optional: Anzeigenamen je Linie (nur für die Beschriftung der Tabs)
 *   rahmen      Element direkt um die Walzen (position:relative), enthält die .walze-Elemente
 *   tabsLinks   leerer Container links vom Fenster, tabsRechts der rechte
 *   reihenAnzahl  sichtbare Reihen je Walze (Standard 3)
 * Rückgabe:
 *   farbe(nr)                       Linienfarbe
 *   leuchten(nr, an, verzoegerung)  Tab leuchtet auf (an = true) oder wird wieder ruhig (false)
 *   markieren(nr)                   Tab bleibt dezent als "gewonnen" markiert (nach dem Aufleuchten)
 *   zuruecksetzen()                 alle Gewinn-Markierungen weg (vor dem nächsten Dreh)
 */
export function linienAnzeigeBauen({
  linien,
  namen = [],
  rahmen,
  tabsLinks,
  tabsRechts,
  reihenAnzahl = 3,
}) {
  const walzen = [...rahmen.querySelectorAll(":scope > .walze")];
  const tabs = [];

  // ---------- Vorschau-Ebene: eigenes SVG über den Walzen (getrennt von der Gewinn-Ebene des Spiels) ----------
  const vorschau = document.createElementNS(SVG_NS, "svg");
  vorschau.setAttribute("class", "linien-vorschau");
  vorschau.setAttribute("aria-hidden", "true");
  vorschau.setAttribute("focusable", "false");
  rahmen.append(vorschau);

  /** Pixelmitte eines Feldes relativ zum Rahmen (gleiche Messung wie bei den Gewinnlinien der Spiele). */
  function feldMitte(walze, reihe) {
    const r0 = rahmen.getBoundingClientRect();
    const r = walzen[walze].getBoundingClientRect();
    return {
      x: r.left - r0.left + r.width / 2,
      y: r.top - r0.top + ((reihe + 0.5) * r.height) / reihenAnzahl,
    };
  }

  /**
   * Zeichnet die Linie `nr` in die Vorschau-Ebene (viewBox = echte Pixelgröße, 1 Einheit = 1 Pixel).
   * `animiert`: die Linie wächst von links nach rechts (nur ohne "Bewegung reduzieren"). Beim bloßen
   * Neumessen nach einer Größenänderung bleibt sie stehen, sonst würde sie dabei neu loslaufen.
   */
  function vorschauZeichnen(nr, animiert = true) {
    const r0 = rahmen.getBoundingClientRect();
    vorschau.setAttribute("viewBox", `0 0 ${r0.width} ${r0.height}`);
    vorschau.style.setProperty("--lc", linienFarbe(nr));
    vorschau.dataset.linie = String(nr + 1);
    const punkte = linienPunkte(linien[nr], feldMitte, r0.width);
    const text = punkteText(punkte);
    // dunkler Rand unter der Linie: hält sie auch über hellen Symbolen lesbar
    const rand = svgElement("polyline", "vorschau-rand");
    rand.setAttribute("points", text);
    const linie = svgElement(
      "polyline",
      animiert && !bewegungReduziert() ? "vorschau-linie zeichnet" : "vorschau-linie",
    );
    linie.setAttribute("points", text);
    linie.setAttribute("pathLength", "1");
    vorschau.replaceChildren(rand, linie);
    // Punkte in den Feldmitten zeigen, welche Felder die Linie berührt (ohne die Verlängerung zum Rand)
    for (const p of punkte.slice(1, -1)) {
      const punkt = svgElement("circle", "vorschau-punkt");
      punkt.setAttribute("cx", p.x.toFixed(1));
      punkt.setAttribute("cy", p.y.toFixed(1));
      punkt.setAttribute("r", "4");
      vorschau.append(punkt);
    }
  }

  // ---------- Zustand der Vorschau: höchstens eine Linie gleichzeitig ----------
  // quelle: "hover" (Maus), "tipp" (Touch, 2 s) oder "fokus" (Tastatur)
  let aktiv = null; // { nr, quelle, timer } oder null

  function verbergen(nr = null, quelle = null) {
    if (!aktiv || (nr !== null && aktiv.nr !== nr) || (quelle !== null && aktiv.quelle !== quelle))
      return;
    clearTimeout(aktiv.timer);
    tabs[aktiv.nr].setAttribute("aria-pressed", "false");
    vorschau.replaceChildren();
    delete vorschau.dataset.linie;
    aktiv = null;
  }

  function zeigen(nr, quelle) {
    verbergen();
    vorschauZeichnen(nr);
    tabs[nr].setAttribute("aria-pressed", "true");
    aktiv = { nr, quelle, timer: 0 };
    if (quelle === "tipp") aktiv.timer = setTimeout(() => verbergen(nr, "tipp"), VORSCHAU_MS);
  }

  // Ändert sich die Fenstergröße (Handy drehen, Adressleiste ein-/ausblenden), solange eine Vorschau steht: neu messen.
  window.addEventListener("resize", () => {
    if (aktiv) vorschauZeichnen(aktiv.nr, false);
  });

  // ---------- Tabs ----------
  function tabBauen(nr, seite) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `linien-tab ${seite}`;
    tab.textContent = String(nr + 1);
    tab.dataset.linie = String(nr + 1);
    tab.style.setProperty("--lc", linienFarbe(nr));
    tab.setAttribute(
      "aria-label",
      `Gewinnlinie ${nr + 1}${namen[nr] ? `, ${namen[nr]}` : ""}: Verlauf anzeigen`,
    );
    tab.setAttribute("aria-pressed", "false");

    // Welche Eingabe war es? Maus zeigt per Hover, Finger und Stift per Tippen (Hover gibt es dort nicht).
    let eingabe = "mouse";
    tab.addEventListener("pointerdown", (e) => {
      eingabe = e.pointerType;
    });
    tab.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") zeigen(nr, "hover");
    });
    tab.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") verbergen(nr, "hover");
    });
    // Tastatur: Solange der Tab den sichtbaren Fokus hat, steht die Vorschau (ein Mausklick löst das nicht aus).
    tab.addEventListener("focus", () => {
      if (tab.matches(":focus-visible")) zeigen(nr, "fokus");
    });
    tab.addEventListener("blur", () => verbergen(nr, "fokus"));
    tab.addEventListener("click", (e) => {
      if (eingabe !== "mouse" && e.detail > 0) {
        // Tippen: erneutes Tippen auf dieselbe Linie blendet aus, sonst 2 Sekunden zeigen
        if (aktiv && aktiv.nr === nr && aktiv.quelle === "tipp") verbergen(nr);
        else zeigen(nr, "tipp");
      }
      // Fokus loslassen, damit die Leertaste danach wieder dreht (wie bei den Einsatz-Chips)
      if (e.detail > 0) tab.blur();
    });
    return tab;
  }

  const haelfte = Math.ceil(linien.length / 2);
  linien.forEach((_, nr) => {
    const links = nr < haelfte;
    const tab = tabBauen(nr, links ? "links" : "rechts");
    tabs.push(tab);
    (links ? tabsLinks : tabsRechts).append(tab);
  });
  tabsLinks.setAttribute("role", "group");
  tabsLinks.setAttribute("aria-label", `Gewinnlinien 1 bis ${haelfte}`);
  tabsRechts.setAttribute("role", "group");
  tabsRechts.setAttribute("aria-label", `Gewinnlinien ${haelfte + 1} bis ${linien.length}`);

  return {
    farbe: linienFarbe,

    /**
     * Tab leuchtet in der Linienfarbe auf. Der Puls läuft nur ohne "Bewegung reduzieren"; sonst bleibt
     * das statische Leuchten. `verzoegerung` (Sekunden) versetzt den Puls, damit mehrere Tabs nicht im Gleichtakt blinken.
     */
    leuchten(nr, an = true, verzoegerung = 0) {
      const tab = tabs[nr];
      if (!tab) return;
      tab.classList.toggle("an", an);
      tab.classList.toggle("puls", an && !bewegungReduziert());
      tab.style.animationDelay = an && verzoegerung > 0 ? `${verzoegerung}s` : "";
    },

    /** Dezente, ruhige Markierung "diese Linie hat gewonnen" (bleibt bis zum nächsten Dreh). */
    markieren(nr) {
      tabs[nr]?.classList.add("gewonnen");
    },

    /** Alle Gewinn-Zustände der Tabs entfernen. Die Vorschau bleibt davon unberührt. */
    zuruecksetzen() {
      for (const tab of tabs) {
        tab.classList.remove("an", "puls", "gewonnen");
        tab.style.animationDelay = "";
      }
    },
  };
}
