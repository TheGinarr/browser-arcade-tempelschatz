/* ============================================================
   Tempelschatz · game.js
   ------------------------------------------------------------
   SO FUNKTIONIERT DIESES SPIEL
   Ein klassischer Ägypten-Slot mit Freispiel-Feature. Spielgeld,
   kein Echtgeld. Alle Symbole sind eigene Inline-SVGs (siehe index.html).

   1. SICHTFELD: 5 Walzen mit je 3 sichtbaren Reihen (5 x 3 = 15 Felder).
      Jede Walze ist ein festes "Walzenband" mit 30 Feldern. Pro Dreh wird
      je Walze ein Stopp-Index gewürfelt; das Symbol dort liegt in der
      MITTLEREN Reihe, die beiden Nachbarn davor/danach oben und unten
      (das Band ist ringförmig).

   2. 10 FESTE GEWINNLINIEN (Konstante GEWINNLINIEN): Jede Linie ist ein
      Array mit 5 Reihen-Indizes (0 = oben, 1 = Mitte, 2 = unten), einer
      je Walze. Gewertet wird von LINKS nach rechts: Wie viele gleiche
      Symbole liegen ab Walze 1 hintereinander auf der Linie? 3, 4 oder 5
      zahlen (die Pharao-Maske schon ab 2).

   3. EINSATZ: Die Chips (10/25/50/100) sind der GESAMTEINSATZ für alle 10
      Linien. Ein Linien-Gewinn ist  Quote x Einsatz / 10,  auf eine ganze
      Zahl gerundet (Math.round). Alle Linien-Quoten sind GERADE Zahlen:
      Bei Einsatz 25 sind das 2,5 pro Linie, und gerade Quoten ergeben dann
      immer eine ganze Zahl. Gerundet werden muss mit den vier festen
      Einsätzen deshalb nie, die Rundung schützt nur vor Kommazahlen,
      falls später ein anderer Einsatz dazukommt.

   4. SCATTER "TEMPELTOR": zählt unabhängig von Linien und Position.
      3 oder mehr Tempeltore irgendwo im Sichtfeld zahlen den doppelten
      Gesamteinsatz UND lösen 10 FREISPIELE aus.

   5. FREISPIELE (das Herzstück): Beim Start wird zufällig ein Spezial-
      symbol gezogen. Freispiele kosten nichts (gleicher Einsatz wie der
      auslösende Dreh). Jedes Freispiel läuft in DREI Schritten ab:
        a) normale Linienauswertung (wie im Grundspiel),
        b) EXPANSION: Liegt das Spezialsymbol mindestens 2x irgendwo im
           Sichtfeld, füllt es jede Walze, auf der es vorkommt, komplett,
        c) Zusatzauswertung: Die voll ausgefüllten Walzen zahlen
           positionsunabhängig auf allen 10 Linien (EXPANSIONSQUOTEN,
           angegeben als Vielfaches des Gesamteinsatzes).
      Erneut 3 Tempeltore in den Freispielen geben +10 Freispiele.

   6. ERST ENTSCHEIDEN, DANN ANIMIEREN: Das Ergebnis eines Spielzugs steht
      fest, bevor sich eine Walze dreht. Die Animation ist nur Show. Alle
      Regeln stecken in reinen Funktionen (kein DOM, in Node testbar).

   7. GEWINNFEIER: Große Gewinne werden eskalierend gefeiert (assets/gewinnfeier.js, Stufen ab
      x5 / x15 / x40 vom Gesamteinsatz). Gefeiert wird jeder Spielzug einzeln, am Ende einer
      Freispiel-Serie zusätzlich der Seriengesamtgewinn, aber nur bei höherer Stufe als zuvor.
      Reine Anzeige NACH der Auswertung: Auszahlung, RTP und Konto bleiben unberührt.

   8. TON UND SPANNUNG: assets/klang.js liefert synthetisierte Klänge (Dreh-Surren, Stopp-Tick je Walze,
      Gewinn-Jingle je Feier-Stufe, Münz-Ticks). Dazu kommen Scatter-Spannung, "So knapp!" und ein
      Lauflicht-Rahmen ums Fenster (siehe Block SPANNUNG weiter unten). Der Ton lässt sich oben rechts abschalten.

   9. GEWINNLINIEN-TABS: Links und rechts vom Walzenfenster sitzen die farbigen Nummern-Tabs der 10 Linien
      (assets/gewinnlinien.js). Hover oder Tippen zeigt den Verlauf der Linie als Polylinie, aus GEWINNLINIEN
      gezeichnet. Gewinnt eine Linie, leuchten Tab und Linie in derselben Farbe, im Takt des Lichtlaufs.
      Reine Anzeige: Auszahlung, RTP und Freispiele bleiben unberührt.

  10. GELD: NUR über ../assets/wallet.js (gemeinsames Konto). Eine "Runde"
      ist ein bezahlter Dreh INKLUSIVE aller Freispiele daraus. Der Einsatz
      wird einmal abgebucht, die Gesamtauszahlung am Rundenende gutgeschrieben.
      Laufende Freispiele werden im localStorage gesichert (Schlüssel
      "freispiele") und beim nächsten Laden fortgesetzt. Die Topliste (Schlüssel
      "tempelschatz") sammelt die höchsten NETTO-Gewinne einer Runde und wird
      STILL gefüllt, es gibt keinen Gewinn-Dialog.

   STAND 2026-10-23: FREISPIEL-MULTIPLIKATOR (die Zahlen weiter unten sind der Stand VORHER)
   Freispiele starten mit ×1, jede Expansion mit Auszahlung erhöht den Multiplikator für die
   FOLGENDEN Freispiele um 1 (MULTI_MAX = 5, multiNachFreispiel). Er gilt für Linien und Expansion,
   nicht für den Scatter, und überlebt Wiederauslösung und Neuladen (Rundenstand "multi").
   Damit die RTP nicht explodiert, sind die Expansionsquoten etwa halbiert (EXPANSIONSQUOTEN,
   Falke 30/150/600, Pharao 2: 10, 3: 150, 4: 600, 5: 2500). Linienquoten und Bänder unverändert.
     Grundspiel exakt (rtpExaktBerechnen, unverändert)  52,57 %
     Ø Expansion je Freispiel bei ×1                   1,87 x Einsatz (vorher 4,02)
     rtpExaktBerechnen().rtp rechnet die Freispiele OHNE Multiplikator (22,4 %) und ist damit
     für die Gesamt-RTP nicht mehr gültig, nur noch für das Grundspiel.
   Simulation (scratchpad sim_tempel.mjs, rundeSimulieren, mulberry32, Einsatz 10):
     48.000.000 Runden          RTP 98,71 %   davon Freispiele 46,12 %
     Einzelläufe                97,86 % bis 100,48 %, Einsatz 25 / 100 ebenfalls rund 98,5 %
     höchste Runden-Auszahlung  5.072 Einsätze

   AUSZAHLUNGSQUOTE (RTP) – EXAKT UND SIMULIERT (Stand bis 2026-10-22, ohne Multiplikator)
   Zahlen für GENAU diese Bänder und Quoten (Gesamteinsatz = 1). Die Abstimmung zielt auf eine
   RTP von 95,0 % (Korridor 94,5 bis 95,5 %), also leicht über den üblichen Werten echter Geräte,
   und auf eine spürbar höhere Trefferquote im Grundspiel (rund 30 % statt vorher 24 %). Erreicht wurde
   das über MEHR NIEDRIGE SYMBOLE im Band (kleine Drei-Gleiche-Treffer fallen öfter) und kleinere
   Quoten bei 4 und 5 gleichen Niedrigsymbolen, nicht über seltene Jackpots.

   Walzenbänder: je Walze 30 Felder, gleiche Zusammensetzung, andere Reihenfolge
     7x Zehn, 7x Bube, 4x Dame, 4x König, 2x Ass, 2x Skarabäus, 2x Falke,
     1x Pharao, 1x Tempeltor (Scatter).
   Linien-Quoten (x Einsatz/10) für 3 / 4 / 5 gleiche Symbole von links:
     Zehn, Bube  8 / 18 / 100     Dame  10 / 40 / 160      König  10 / 50 / 250
     Ass        16 / 80 / 400     Skarabäus 30 / 150 / 750 Falke  40 / 200 / 1000
     Pharao     2: 10, 3: 100, 4: 500, 5: 2500
   Expansions-Quoten (x Gesamteinsatz) für 3 / 4 / 5 ausgefüllte Walzen:
     Zehn, Bube 1 / 2 / 8    Dame 4 / 16 / 60   König 5 / 20 / 80   Ass 46 / 200 / 700
     Skarabäus 60 / 280 / 1000   Falke 70 / 350 / 1500   Pharao 2: 30, 3: 350, 4: 1500, 5: 6000
   Scatter: 3 oder mehr Tempeltore = 2 x Gesamteinsatz + 10 Freispiele.

   EXAKTE RECHNUNG (rtpExaktBerechnen: alle 30^5 = 24.300.000 Stopp-Kombinationen,
   in Node rund eine Minute):
     Linien im Grundspiel                       50,86 %
     Scatter-Gewinn (2 x Einsatz)                1,71 %
     Grundspiel gesamt                          52,57 %
     Freispiele (inkl. Wiederauslösung)         42,51 %   (= 44,7 % der gesamten RTP)
     RTP gesamt                                 95,08 %   (Hausvorteil 4,92 %)
     Trefferquote Grundspiel                    30,42 %   (irgendeine Auszahlung im auslösenden Dreh)
       davon unter dem Einsatz                  56,3 %    (Gewinn-Optik, aber Netto-Verlust)
     Auslösung (3+ Tempeltore): p = 0,856 %  = 1 von 116,8 Drehs
     Ø Freispiele je Auslösung: 10 / (1 - 10 p) = 10,94 (Wiederauslösung als geometrische Reihe)
     Ø Expansion je Freispiel, gemittelt über die 8 Spezialsymbole: 4,02 x Gesamteinsatz
       (Zehn/Bube 2,37 | Dame 2,76 | König 3,51 | Ass 3,86 | Skarabäus 5,18 | Falke 6,30 | Pharao 5,76)
     Freispiel-Anteil = p x 10,94 x (Grundspiel 0,5257 + Expansion 4,0154) = 0,4251
   Die Expansions-Mittel lassen sich auch geschlossen rechnen: Da gleiche Symbole im Band mindestens
   drei Felder auseinanderstehen, zeigt eine Walze ein Symbol mit der Chance Anzahl / 10, und die Walzen
   sind unabhängig (Binomialverteilung der ausgefüllten Walzen, dann Quote einsetzen).

   SIMULATION (Node, tests/tempelschatz-sim.mjs, die echten Funktionen dieses Moduls:
   rundeSimulieren -> spielzugDurchfuehren, also inklusive kompletter Freispiel-Abwicklung
   mit Wiederauslösung; Zufall mulberry32 mit Seeds 1 bis 24, Einsatz 10):
     24 Läufe x 5.000.000 Runden = 120.000.000 Runden (131.226.090 Spielzüge)
     RTP gesamt                      95,11 %
       davon Grundspiel              52,58 %
       davon Freispiele              42,53 %   (Freispiel-Anteil 44,7 % der RTP)
     Auslösung                       1 von 116,9 Drehs, Ø 10,93 Freispiele je Auslösung
     Trefferquote Grundspiel         30,42 % (irgendein Gewinn im auslösenden Dreh)
     Einzelläufe (je 5 Mio. Runden)  93,54 % bis 96,01 %, Standardfehler des Gesamtwerts 0,11 Prozentpunkte
     Höchste einzelne Runden-Auszahlung: 6.386 Einsätze
   Simulation (95,11 %) und exakte Rechnung (95,08 %) liegen innerhalb des Standardfehlers beieinander.
   Beide Werte sind im Zielkorridor 94,5 bis 95,5 %. Die Streuung der Einzelläufe kommt von den
   seltenen Riesengewinnen (Pharao auf allen Walzen). Mit Einsatz 25 oder 100 und gleichem Seed kommt
   exakt dieselbe RTP heraus, weil alle Quoten ganzzahlig mit dem Einsatz mitwachsen.

   SPANNUNG, KNAPP DANEBEN UND TON (Anzeige und Klang, nie das Ergebnis)
   Wie echte Automaten arbeitet das Spiel mit Spannung (Anticipation), Beinahe-Treffern und Ton:
   Liegen nach den ersten Walzen schon 2 Tempeltore, drehen die übrigen Walzen 0,8 bis 1,5 Sekunden
   länger (steigend) und bremsen langsamer aus, die Tore pulsieren golden, der Spannungs-Ton läuft.
   Genau 2 Tore am Ende oder 4 gleiche hohe Symbole mit dem fünften direkt daneben ergeben ein
   "So knapp!". Jeder Liniengewinn feiert mit Lichtlauf und Mini-Jingle, auch unter dem Einsatz.
   GRENZE: Alles wird NUR aus dem längst feststehenden Ergebnis gelesen (spannungErmitteln,
   fastGewinnErmitteln). ECHTE AUTOMATEN manipulieren hier: Sie stoppen Scatter auffällig oft knapp
   über oder unter dem Fenster und gewichten ihre Walzen virtuell so, dass das dritte Symbol seltener
   fällt, als es aussieht. Das tun wir bewusst NICHT. Und die Netto-Anzeige bleibt ehrlich:
   Sie nennt immer Auszahlung minus Einsatz, auch bei einem Gewinn unter dem Einsatz.
   ============================================================ */

import { bewegungReduziert, toplisteAnzeigen, stillEintragen } from "./assets/ui.js";
import { gewinnFeiern, stufeBestimmen, STUFEN } from "./assets/gewinnfeier.js";
import {
  tonKnopf,
  klangSpinStart,
  klangWalzenStopp,
  klangSpannung,
  klangFastGewinn,
  klangGewinn,
  klangMuenzTick,
} from "./assets/klang.js";
import { linienAnzeigeBauen, linienFarbe } from "./assets/gewinnlinien.js";
import { lade, speichere, entferne } from "./assets/storage.js";
import { autoDrehEinrichten } from "./assets/autodreh.js";
import {
  STARTGELD,
  kontostand,
  statistik,
  einsatzAbbuchen,
  rundeAbschliessen,
  istPleite,
  pleiteNeustart,
  walletHud,
  walletHudAktualisieren,
} from "./assets/wallet.js";

const SPIEL = "tempelschatz"; // Schlüssel für storage.js (Topliste, Einsatz, Freispiel-Stand)
const MINDEST_NETTO_FUER_TOPLISTE = 100; // kleinere Runden-Gewinne füllen die Topliste nicht

/* ============================================================
   TEIL 1: REINE SPIELLOGIK (ohne DOM)
   "export" steht nur da, damit Tests in Node die Funktionen
   importieren können. Im Browser wird es nicht gebraucht.
   ============================================================ */

/** Die wählbaren Gesamteinsätze (passend zu den Chip-Knöpfen in index.html). */
export const EINSATZSTUFEN = [10, 25, 50, 100];

export const ANZAHL_WALZEN = 5;
export const ANZAHL_REIHEN = 3;
export const ANZAHL_LINIEN = 10;

/* Kurznamen, damit Bänder und Tabellen unten lesbar bleiben. */
const ZEH = "zehn",
  BUB = "bube",
  DAM = "dame",
  KOE = "koenig",
  ASS = "ass";
const SKA = "skarabaeus",
  FAL = "falke",
  PHA = "pharao",
  TOR = "tor";

/** Alle Linien-Symbole von niedrig nach hoch (der Scatter "tor" gehört NICHT dazu). */
export const SYMBOLE = [ZEH, BUB, DAM, KOE, ASS, SKA, FAL, PHA];
export const SCATTER = TOR;

/** Anzeigenamen (für Screenreader, Tabellen und Meldungen). */
export const SYMBOL_NAMEN = {
  zehn: "Zehn",
  bube: "Bube",
  dame: "Dame",
  koenig: "König",
  ass: "Ass",
  skarabaeus: "Skarabäus",
  falke: "Horusfalke",
  pharao: "Pharao-Maske",
  tor: "Tempeltor",
};

/**
 * Die 10 Gewinnlinien. Jeder Eintrag hat 5 Zahlen, eine je Walze:
 * 0 = obere Reihe, 1 = mittlere Reihe, 2 = untere Reihe.
 * Beispiel Linie 4 = [0, 1, 2, 1, 0]: Walze 1 oben, Walze 2 Mitte, Walze 3
 * unten, Walze 4 Mitte, Walze 5 oben – ein "V".
 */
export const GEWINNLINIEN = [
  [1, 1, 1, 1, 1], //  1  Mitte (Gerade)
  [0, 0, 0, 0, 0], //  2  oben (Gerade)
  [2, 2, 2, 2, 2], //  3  unten (Gerade)
  [0, 1, 2, 1, 0], //  4  V
  [1, 2, 2, 2, 1], //  5  flaches V (Schale)
  [2, 1, 0, 1, 2], //  6  umgekehrtes V (Dach)
  [1, 0, 0, 0, 1], //  7  flaches umgekehrtes V
  [0, 1, 0, 1, 0], //  8  Zickzack oben
  [2, 1, 2, 1, 2], //  9  Zickzack unten
  [1, 0, 1, 2, 1], // 10  Zickzack-Welle
];
export const LINIEN_NAMEN = [
  "Mitte",
  "Oben",
  "Unten",
  "V",
  "Schale",
  "Dach",
  "Flaches Dach",
  "Zickzack oben",
  "Zickzack unten",
  "Welle",
];

/**
 * Die fünf Walzenbänder (je 30 Felder, ringförmig: nach dem letzten Feld kommt
 * wieder das erste). Steht eine Walze auf Index 5, liegt Feld 5 in der Mitte,
 * Feld 4 oben und Feld 6 unten.
 *
 * Zusammensetzung je Walze (identisch, nur die Reihenfolge ist anders, damit
 * die Walzen nicht wie Kopien aussehen):
 *   7x Zehn, 7x Bube, 4x Dame, 4x König, 2x Ass, 2x Skarabäus, 2x Falke,
 *   1x Pharao, 1x Tempeltor  =  30 Felder.
 * Warum so? Die Niedrigsymbole Zehn und Bube stehen häufig im Band (7 von 30
 * statt früher 6). Dadurch fallen kleine Drei-Gleiche-Treffer öfter, und die
 * Trefferquote steigt spürbar. Die Gewinne dieser Treffer sind dafür klein.
 * Die Reihenfolge ist so gemischt, dass GLEICHE SYMBOLE IMMER MINDESTENS DREI
 * FELDER AUSEINANDER stehen (auch über den Ring-Umbruch hinweg). Damit liegt
 * jedes Symbol pro Walze höchstens einmal im Fenster, und die Chance, dass eine
 * Walze das Symbol zeigt, ist genau Anzahl / 10 (z. B. Zehn 70 %, Tempeltor 10 %).
 * Darauf beruht die geschlossene Rechnung der Expansions-Anteile unten.
 */
export const WALZENBAENDER = [
  [
    ASS,
    BUB,
    ZEH,
    KOE,
    ASS,
    ZEH,
    SKA,
    DAM,
    BUB,
    ZEH,
    SKA,
    BUB,
    DAM,
    ZEH,
    BUB,
    KOE,
    ZEH,
    BUB,
    DAM,
    ZEH,
    PHA,
    FAL,
    BUB,
    ZEH,
    TOR,
    DAM,
    KOE,
    FAL,
    BUB,
    KOE,
  ],
  [
    KOE,
    DAM,
    ZEH,
    ASS,
    BUB,
    SKA,
    DAM,
    ZEH,
    KOE,
    BUB,
    PHA,
    ZEH,
    TOR,
    BUB,
    DAM,
    ZEH,
    BUB,
    KOE,
    FAL,
    ZEH,
    ASS,
    BUB,
    FAL,
    DAM,
    BUB,
    SKA,
    ZEH,
    KOE,
    BUB,
    ZEH,
  ],
  [
    DAM,
    ZEH,
    ASS,
    BUB,
    SKA,
    ZEH,
    BUB,
    ASS,
    FAL,
    ZEH,
    BUB,
    PHA,
    ZEH,
    KOE,
    DAM,
    ZEH,
    BUB,
    DAM,
    KOE,
    BUB,
    ZEH,
    KOE,
    FAL,
    BUB,
    SKA,
    DAM,
    BUB,
    ZEH,
    TOR,
    KOE,
  ],
  [
    KOE,
    BUB,
    ZEH,
    KOE,
    PHA,
    ASS,
    BUB,
    KOE,
    DAM,
    ZEH,
    BUB,
    TOR,
    DAM,
    ZEH,
    ASS,
    BUB,
    DAM,
    ZEH,
    BUB,
    FAL,
    KOE,
    SKA,
    ZEH,
    BUB,
    SKA,
    ZEH,
    FAL,
    BUB,
    ZEH,
    DAM,
  ],
  [
    ASS,
    BUB,
    ZEH,
    KOE,
    TOR,
    BUB,
    DAM,
    KOE,
    ZEH,
    BUB,
    KOE,
    ZEH,
    SKA,
    BUB,
    ZEH,
    DAM,
    BUB,
    FAL,
    ZEH,
    SKA,
    ASS,
    BUB,
    DAM,
    ZEH,
    FAL,
    DAM,
    KOE,
    PHA,
    BUB,
    ZEH,
  ],
];

/**
 * Linien-Quoten: Auszahlung einer Linie = Quote x Einsatz / 10 (siehe
 * liniengewinnBetrag). Der Schlüssel ist die Anzahl gleicher Symbole ab
 * Walze 1. Alle Quoten sind gerade Zahlen (siehe Kommentar oben).
 */
export const LINIENQUOTEN = {
  [ZEH]: { 3: 8, 4: 18, 5: 100 },
  [BUB]: { 3: 8, 4: 18, 5: 100 },
  [DAM]: { 3: 10, 4: 40, 5: 160 },
  [KOE]: { 3: 10, 4: 50, 5: 250 },
  [ASS]: { 3: 16, 4: 80, 5: 400 },
  [SKA]: { 3: 30, 4: 150, 5: 750 },
  [FAL]: { 3: 40, 4: 200, 5: 1000 },
  [PHA]: { 2: 10, 3: 100, 4: 500, 5: 2500 }, // die Pharao-Maske zahlt schon ab 2
};

/**
 * Expansions-Quoten (nur in den Freispielen): Vielfaches des GESAMTEINSATZES
 * für die Anzahl der Walzen, die das expandierte Spezialsymbol ausfüllt.
 * Gedacht als "auf allen 10 Linien": Jede der 10 Linien läuft durch jede
 * Walze, also liegt das Symbol auf jeder Linie auf allen ausgefüllten
 * Walzen. Pro Linie zahlt das Quote x Einsatz/10, zusammen Quote x Einsatz.
 * Das Produkt ist immer ganzzahlig, hier muss nichts gerundet werden.
 * Fehlt ein Eintrag (z. B. nur 2 Walzen bei einem Niedrigsymbol), zahlt die
 * Expansion nichts – das Symbol expandiert trotzdem, nur ohne Gewinn.
 */
// Seit 2026-10-23 halbiert (vorher Zehn/Bube 1/2/8, Dame 4/16/60, König 5/20/80, Ass 46/200/700,
// Skarabäus 60/280/1000, Falke 70/350/1500, Pharao 30/350/1500/6000), weil der Freispiel-Multiplikator
// (bis ×5) dazukam. Halbe Quoten ergeben bei Einsatz 25 krumme Beträge -> expansionAuswerten rundet.
export const EXPANSIONSQUOTEN = {
  [ZEH]: { 3: 0.5, 4: 1, 5: 4 },
  [BUB]: { 3: 0.5, 4: 1, 5: 4 },
  [DAM]: { 3: 2, 4: 8, 5: 30 },
  [KOE]: { 3: 2.5, 4: 10, 5: 40 },
  [ASS]: { 3: 23, 4: 100, 5: 350 },
  [SKA]: { 3: 30, 4: 140, 5: 500 },
  [FAL]: { 3: 30, 4: 150, 5: 600 }, // Falke und Pharao etwas stärker gesenkt (Ziel-RTP knapp 99 %)
  [PHA]: { 2: 10, 3: 150, 4: 600, 5: 2500 },
};

export const SCATTER_MINDESTANZAHL = 3; // so viele Tempeltore braucht der Scatter-Gewinn + Freispiele
export const SCATTER_QUOTE = 2; // Vielfaches des Gesamteinsatzes
export const FREISPIELE_PRO_AUSLOESUNG = 10;
export const EXPANSION_MINDESTVORKOMMEN = 2; // so oft muss das Spezialsymbol im Sichtfeld liegen

/* Freispiel-Multiplikator (seit 2026-10-23): startet in jeder Serie bei ×1. Jedes Freispiel, in dem
   die EXPANSION etwas zahlt, hebt ihn für die FOLGENDEN Freispiele um 1, höchstens MULTI_MAX.
   Er vervielfacht Linien- und Expansionsgewinne der Freispiele, nicht den Scatter-Gewinn. */
export const MULTI_MAX = 5;

/** Nächster Multiplikator nach einem Freispiel (`gewonnen` = die Expansion zahlte). */
export function multiNachFreispiel(multi, gewonnen) {
  return gewonnen ? Math.min(MULTI_MAX, multi + 1) : multi;
}

/** Ab wie vielen gleichen Symbolen von links zahlt eine Linie? Pharao ab 2, alle anderen ab 3. */
export function mindestAnzahl(symbol) {
  return symbol === PHA ? 2 : 3;
}

/**
 * Würfelt für jede Walze einen Stopp-Index (0 … Bandlänge-1), alle gleich
 * wahrscheinlich. `zufall` ist austauschbar (Standard Math.random) – für Tests
 * und die Simulation. Math.random reicht: Es geht um Spielgeld, niemand muss
 * Ergebnisse "unvorhersagbar" machen, damit echtes Geld sicher bleibt.
 */
export function zufallsStopps(baender = WALZENBAENDER, zufall = Math.random) {
  return baender.map((band) => Math.floor(zufall() * band.length));
}

/**
 * Baut aus den Stopp-Indizes das Sichtfeld: feld[walze][reihe] mit
 * reihe 0 = oben, 1 = Mitte, 2 = unten. Das Modulo (%) macht das Band zum Ring;
 * "+ n" davor verhindert negative Indizes bei Stopp 0.
 */
export function sichtfeldAusStopps(stopps, baender = WALZENBAENDER) {
  return baender.map((band, i) => {
    const n = band.length;
    const s = stopps[i];
    return [band[(s - 1 + n) % n], band[s], band[(s + 1) % n]];
  });
}

/**
 * Gewinn EINER Linie: Quote x Einsatz / 10, auf eine ganze Zahl gerundet.
 * Der Einsatz ist der Gesamteinsatz für alle 10 Linien, pro Linie sind das
 * Einsatz/10 (bei Einsatz 25 also 2,5). Math.round rundet .5 auf.
 */
export function liniengewinnBetrag(quote, einsatz) {
  return Math.round((quote * einsatz) / ANZAHL_LINIEN);
}

/**
 * Wertet alle 10 Gewinnlinien aus. `feld` ist das Sichtfeld (feld[walze][reihe]).
 * Rückgabe: Liste der gewinnenden Linien, je
 *   { linie, symbol, anzahl, quote, betrag, positionen }
 *   linie       0-basierter Index in GEWINNLINIEN
 *   anzahl      gleiche Symbole ab Walze 1 (2 bis 5)
 *   positionen  Felder des Gewinns als [walze, reihe]
 *
 * Ablauf je Linie: Das Symbol auf Walze 1 ist der Kandidat. Dann geht es nach
 * rechts, solange dasselbe Symbol folgt. Ein Scatter zählt nie als Linien-
 * Symbol. Erst wenn die Mindestanzahl erreicht ist (Pharao 2, sonst 3), zahlt
 * die Linie. Es zählt immer nur die Folge von links, ein späteres Paar
 * (z. B. Walze 3 bis 5) zahlt nichts.
 */
export function liniengewinneAuswerten(feld, einsatz) {
  const gewinne = [];
  GEWINNLINIEN.forEach((reihen, liniennr) => {
    const erstes = feld[0][reihen[0]];
    if (erstes === SCATTER) return;
    let anzahl = 1;
    while (anzahl < ANZAHL_WALZEN && feld[anzahl][reihen[anzahl]] === erstes) anzahl++;
    if (anzahl < mindestAnzahl(erstes)) return;
    const quote = LINIENQUOTEN[erstes][anzahl];
    gewinne.push({
      linie: liniennr,
      symbol: erstes,
      anzahl,
      quote,
      betrag: liniengewinnBetrag(quote, einsatz),
      positionen: reihen.slice(0, anzahl).map((reihe, walze) => [walze, reihe]),
    });
  });
  return gewinne;
}

/** Scatter: zählt alle Tempeltore im Sichtfeld, egal wo sie liegen. */
export function scatterAuswerten(feld, einsatz) {
  const positionen = [];
  feld.forEach((spalte, walze) =>
    spalte.forEach((symbol, reihe) => {
      if (symbol === SCATTER) positionen.push([walze, reihe]);
    }),
  );
  const ausgeloest = positionen.length >= SCATTER_MINDESTANZAHL;
  return {
    anzahl: positionen.length,
    positionen,
    ausgeloest,
    betrag: ausgeloest ? einsatz * SCATTER_QUOTE : 0,
    freispiele: ausgeloest ? FREISPIELE_PRO_AUSLOESUNG : 0,
  };
}

/**
 * Expansion des Spezialsymbols (nur in Freispielen, sonst symbol = null).
 * Liegt das Symbol mindestens 2x im Sichtfeld, expandiert es: Jede Walze, auf der
 * es vorkommt, wird komplett damit gefüllt. Gezahlt wird nach der Zahl dieser
 * Walzen (siehe EXPANSIONSQUOTEN).
 * Rückgabe: null (kein Spezialsymbol) oder
 *   { symbol, ausgeloest, vorkommen, walzen, anzahl, quote, betrag }
 *   ausgeloest  true = es expandiert (auch wenn es dann 0 zahlt)
 *   walzen      0-basierte Indizes der ausgefüllten Walzen
 */
export function expansionAuswerten(feld, symbol, einsatz) {
  if (!symbol) return null;
  let vorkommen = 0;
  const walzen = [];
  feld.forEach((spalte, walze) => {
    const treffer = spalte.filter((s) => s === symbol).length;
    vorkommen += treffer;
    if (treffer > 0) walzen.push(walze);
  });
  if (vorkommen < EXPANSION_MINDESTVORKOMMEN) {
    return { symbol, ausgeloest: false, vorkommen, walzen: [], anzahl: 0, quote: 0, betrag: 0 };
  }
  const quote = EXPANSIONSQUOTEN[symbol][walzen.length] ?? 0;
  return {
    symbol,
    ausgeloest: true,
    vorkommen,
    walzen,
    anzahl: walzen.length,
    quote,
    betrag: Math.round(quote * einsatz),
  };
}

/**
 * Wertet einen kompletten Spielzug aus (Grundspiel ODER Freispiel):
 *   1. normale Linienauswertung
 *   2. Scatter
 *   3. Expansion (nur wenn ein Spezialsymbol übergeben wird)
 * Die Summe ist die Brutto-Auszahlung dieses einen Zugs.
 */
export function spielzugAuswerten(feld, einsatz, spezialSymbol = null, multi = 1) {
  const liniengewinne = liniengewinneAuswerten(feld, einsatz);
  const linienBasis = liniengewinne.reduce((summe, g) => summe + g.betrag, 0);
  const scatter = scatterAuswerten(feld, einsatz);
  const expansion = expansionAuswerten(feld, spezialSymbol, einsatz);
  const expansionBasis = expansion ? expansion.betrag : 0;
  // Multiplikator (nur Freispiele, sonst 1): auf Linien und Expansion, nicht auf den Scatter
  const liniensumme = linienBasis * multi;
  const summe = liniensumme + scatter.betrag + expansionBasis * multi;
  const gewonnen = expansionBasis > 0; // nur Expansions-Gewinne heben den Multiplikator
  return { feld, liniengewinne, liniensumme, scatter, expansion, summe, multi, gewonnen };
}

/**
 * "Knapp daneben" (Near Miss): Ein ECHTER Beinahe-Gewinn, der sich ohne jede Nachhilfe ergibt.
 * Zwei Fälle zählen:
 *   a) GENAU 2 Tempeltore liegen im Fenster, das dritte fehlt (die Freispiele sind knapp verpasst).
 *   b) Vier gleiche HOHE Symbole liegen auf einer Linie, und das fünfte steht sichtbar daneben,
 *      also in der letzten Walze, aber in einer anderen Reihe als die Linie (der 5er-Gewinn
 *      fehlt eine Reihe).
 * Rückgabe: null oder { art: "scatter" | "linie", symbol, positionen }, wobei positionen die
 * Felder sind, die im Spiel wackeln sollen ([walze, reihe]). Fall a) hat Vorrang.
 *
 * EHRLICHKEIT: Die Funktion liest nur das fertige Ergebnis. ECHTE AUTOMATEN gehen anders vor: Sie
 * stellen solche Beinahe-Treffer gezielt und weit häufiger her, als der Zufall sie liefern würde
 * (virtuelle Walzen mit mehr "Fast-Treffer"-Stopps). Hier wird nichts hergestellt, nur gezeigt,
 * was zufällig vorkommt. Bei diesen Bändern ist "genau 2 Tore" etwa jeder 14. Dreh (7,3 %).
 */
export const HOHE_SYMBOLE = [ASS, SKA, FAL, PHA];
export function fastGewinnErmitteln(feld, liniengewinne, scatter) {
  if (scatter.anzahl === 2)
    return { art: "scatter", symbol: SCATTER, positionen: scatter.positionen };
  const kandidaten = liniengewinne
    .filter((g) => g.anzahl === 4 && HOHE_SYMBOLE.includes(g.symbol))
    .sort((a, b) => b.quote - a.quote);
  for (const g of kandidaten) {
    const positionen = [];
    for (let reihe = 0; reihe < ANZAHL_REIHEN; reihe++) {
      if (
        reihe !== GEWINNLINIEN[g.linie][ANZAHL_WALZEN - 1] &&
        feld[ANZAHL_WALZEN - 1][reihe] === g.symbol
      ) {
        positionen.push([ANZAHL_WALZEN - 1, reihe]);
      }
    }
    if (positionen.length > 0) return { art: "linie", symbol: g.symbol, positionen };
  }
  return null;
}

/** Zieht das Spezialsymbol der Freispiele: eines der 8 Linien-Symbole, alle gleich wahrscheinlich. */
export function zufallsSpezialSymbol(zufall = Math.random) {
  return SYMBOLE[Math.floor(zufall() * SYMBOLE.length)];
}

/* ------------------------------------------------------------
   Die Runde: ein bezahlter Dreh inklusive aller Freispiele
   ------------------------------------------------------------
   Das Rundenobjekt ist der komplette Spielstand:
     einsatz   Gesamteinsatz (bei Freispielen derselbe wie beim auslösenden Dreh)
     bisher    bisherige Brutto-Auszahlung der Runde
     uebrig    noch offene Freispiele (0 = Grundspiel / Runde vorbei)
     symbol    Spezialsymbol der Freispiele (null, solange keine ausgelöst wurden)
     gespielt  bereits gespielte Freispiele
   Browser UND Simulation benutzen dieselbe Funktion spielzugDurchfuehren,
   damit die simulierte RTP wirklich zum echten Spiel gehört. */

export function neueRunde(einsatz) {
  return { einsatz, bisher: 0, uebrig: 0, symbol: null, gespielt: 0, multi: 1 };
}

/**
 * Führt EINEN Spielzug der Runde aus und schreibt das Ergebnis sofort in die
 * Runde (bisher, uebrig, symbol, gespielt). Ist uebrig > 0, ist es ein Freispiel.
 * Rückgabe: { stopps, ergebnis, istFreispiel, neueFreispiele }.
 */
export function spielzugDurchfuehren(runde, zufall = Math.random, baender = WALZENBAENDER) {
  const istFreispiel = runde.uebrig > 0;
  const stopps = zufallsStopps(baender, zufall);
  const feld = sichtfeldAusStopps(stopps, baender);
  const ergebnis = spielzugAuswerten(
    feld,
    runde.einsatz,
    istFreispiel ? runde.symbol : null,
    istFreispiel ? runde.multi : 1,
  );

  runde.bisher += ergebnis.summe;
  if (istFreispiel) {
    runde.uebrig -= 1;
    runde.gespielt += 1;
    runde.multi = multiNachFreispiel(runde.multi, ergebnis.gewonnen);
  }
  const neueFreispiele = ergebnis.scatter.freispiele;
  if (neueFreispiele > 0) {
    runde.uebrig += neueFreispiele;
    // Das Spezialsymbol wird nur bei der ERSTEN Auslösung gezogen,
    // bei weiteren Auslösungen in den Freispielen bleibt es dasselbe.
    if (!runde.symbol) runde.symbol = zufallsSpezialSymbol(zufall);
  }
  return { stopps, ergebnis, istFreispiel, neueFreispiele };
}

/**
 * Spielt eine komplette Runde (Grundspiel + alle Freispiele) ohne Animation durch.
 * Für Tests und die RTP-Simulation. Rückgabe: Auszahlung gesamt, aufgeteilt in
 * Grundspiel und Freispiele, plus Zähler.
 */
export function rundeSimulieren(einsatz = 10, zufall = Math.random, baender = WALZENBAENDER) {
  const runde = neueRunde(einsatz);
  const grund = spielzugDurchfuehren(runde, zufall, baender);
  const grundAuszahlung = grund.ergebnis.summe;
  const ausgeloest = grund.neueFreispiele > 0;
  let nachladen = 0; // Wiederauslösungen in den Freispielen
  while (runde.uebrig > 0) {
    const zug = spielzugDurchfuehren(runde, zufall, baender);
    if (zug.neueFreispiele > 0) nachladen++;
  }
  return {
    auszahlung: runde.bisher,
    grundAuszahlung,
    freispielAuszahlung: runde.bisher - grundAuszahlung,
    freispiele: runde.gespielt,
    ausgeloest,
    nachladen,
    symbol: runde.symbol,
    multi: runde.multi,
  };
}

/**
 * Prüft einen aus dem localStorage gelesenen Freispiel-Stand. Gespeicherte
 * Daten sind NIE vertrauenswürdig (der Nutzer kann sie von Hand ändern):
 * Alles wird auf erlaubte Werte geprüft, sonst gibt es null (= kein Stand).
 */
export function freispielStandPruefen(roh) {
  if (!roh || typeof roh !== "object") return null;
  const { einsatz, bisher, uebrig, symbol, gespielt } = roh;
  if (!EINSATZSTUFEN.includes(einsatz)) return null;
  if (!SYMBOLE.includes(symbol)) return null;
  if (!Number.isInteger(uebrig) || uebrig < 1 || uebrig > 500) return null;
  if (!Number.isInteger(bisher) || bisher < 0 || bisher > 1e9) return null;
  const gespieltSauber =
    Number.isInteger(gespielt) && gespielt >= 0 && gespielt <= 1e6 ? gespielt : 0;
  // Stände von vor 2026-10-23 haben keinen Multiplikator -> ×1
  const multi =
    Number.isInteger(roh.multi) && roh.multi >= 1 && roh.multi <= MULTI_MAX ? roh.multi : 1;
  return { einsatz, bisher, uebrig, symbol, gespielt: gespieltSauber, multi };
}

/**
 * Exakte RTP durch Durchzählen ALLER 30^5 = 24.300.000 Stopp-Kombinationen
 * (dauert in Node eine Weile, im Browser wird sie nie aufgerufen). Zählt mit
 * Einsatz 10 (= 1 pro Linie, daher keine Rundung) und leitet daraus her:
 *   rBasis        Grundspiel-Anteil (Linien + Scatter-Gewinn)
 *   rFreispiele   Anteil der Freispiele (inkl. Wiederauslösungen)
 *   rtp           Summe
 *   trefferquote  Anteil der Grundspiel-Drehs mit IRGENDEINER Auszahlung (Linie oder Scatter)
 *   anteilUnterEinsatz  Anteil der Treffer-Drehs, die weniger auszahlen als der Einsatz
 *                       (Gewinn-Optik bei Netto-Verlust, auf Fachdeutsch "Losses disguised as wins")
 * Die Freispiel-Rechnung: Ein Freispiel bringt im Mittel  a = Linien + Scatter
 * + Expansion  (Expansion gemittelt über die 8 möglichen Spezialsymbole). Mit
 * der Scatter-Chance p kommen im Schnitt  10 / (1 - 10 p)  Freispiele pro Auslösung
 * zusammen (Wiederauslösungen als geometrische Reihe).
 */
export function rtpExaktBerechnen(baender = WALZENBAENDER) {
  const einsatz = 10;
  const stopps = [0, 0, 0, 0, 0];
  const laengen = baender.map((b) => b.length);
  let kombinationen = 0,
    linienSumme = 0,
    scatterSumme = 0,
    scatterAnzahl = 0,
    treffer = 0,
    trefferUnterEinsatz = 0;
  const expansionSumme = Object.fromEntries(SYMBOLE.map((s) => [s, 0]));

  for (stopps[0] = 0; stopps[0] < laengen[0]; stopps[0]++)
    for (stopps[1] = 0; stopps[1] < laengen[1]; stopps[1]++)
      for (stopps[2] = 0; stopps[2] < laengen[2]; stopps[2]++)
        for (stopps[3] = 0; stopps[3] < laengen[3]; stopps[3]++)
          for (stopps[4] = 0; stopps[4] < laengen[4]; stopps[4]++) {
            const feld = sichtfeldAusStopps(stopps, baender);
            kombinationen++;
            let linien = 0;
            for (const g of liniengewinneAuswerten(feld, einsatz)) linien += g.betrag;
            linienSumme += linien;
            const sc = scatterAuswerten(feld, einsatz);
            scatterSumme += sc.betrag;
            if (sc.ausgeloest) scatterAnzahl++;
            if (linien + sc.betrag > 0) {
              treffer++;
              if (linien + sc.betrag < einsatz) trefferUnterEinsatz++;
            }
            for (const s of SYMBOLE)
              expansionSumme[s] += expansionAuswerten(feld, s, einsatz).betrag;
          }

  const linienAnteil = linienSumme / kombinationen / einsatz;
  const scatterAnteil = scatterSumme / kombinationen / einsatz;
  const p = scatterAnzahl / kombinationen;
  const expansionJeSymbol = SYMBOLE.map((s) => expansionSumme[s] / kombinationen / einsatz);
  const expansionMittel = expansionJeSymbol.reduce((summe, x) => summe + x, 0) / SYMBOLE.length;
  const rBasis = linienAnteil + scatterAnteil;
  const freispieleProAusloesung = FREISPIELE_PRO_AUSLOESUNG / (1 - FREISPIELE_PRO_AUSLOESUNG * p);
  const rFreispiele = p * freispieleProAusloesung * (rBasis + expansionMittel);
  return {
    kombinationen,
    linienAnteil,
    scatterAnteil,
    ausloesewahrscheinlichkeit: p,
    expansionMittel,
    expansionJeSymbol,
    freispieleProAusloesung,
    rBasis,
    rFreispiele,
    rtp: rBasis + rFreispiele,
    trefferquote: treffer / kombinationen,
    anteilUnterEinsatz: trefferUnterEinsatz / treffer,
  };
}

/* ------------------------------------------------------------
   Animationsplanung (auch rein rechnerisch, ohne DOM)
   ------------------------------------------------------------
   Gedreht wird NICHT das echte Band im Kreis, sondern ein "Laufband":
   ein langer Streifen aus Zufalls-Symbolen, an dessen oberem Ende die
   Ergebnis-Symbole stehen und an dessen unterem Ende die Symbole, die vorher
   zu sehen waren. Der Streifen läuft nach unten, bis das Ergebnis sichtbar ist.
   Vorteil: Wie lange eine Walze läuft, hängt nur von der Streifenlänge ab und
   nicht davon, wo im 30er-Band das Ziel liegt. So stoppen die fünf Walzen
   gleichmäßig nacheinander. Positionen werden in FELDERN gerechnet
   (1,0 = ein Symbol weiter). */

const BREMS_WEG = 2.5; // so viele Felder legt die Walze in der Bremsphase zurück
const BREMS_ZEIT = 0.5; // Sekunden für die Bremsphase
const BOUNCE = 1.3; // Stärke des Überschwingens (0 = gar nicht, 1,7 = deutlich)
/* Ableitung (= Anfangsgeschwindigkeit) von easeOutBack bei x=0 ist BOUNCE+3.
   Rollt die Walze genau so schnell, geht sie ohne Ruck in die Bremsphase über. */
const LAUF_TEMPO = (BREMS_WEG * (BOUNCE + 3)) / BREMS_ZEIT; // Felder pro Sekunde (hier 21,5)
const ERSTE_WALZE_LAUFZEIT = 0.45; // Sekunden Rollen, bevor die erste Walze bremst
const WALZEN_ABSTAND = 0.22; // jede weitere Walze rollt so viel länger
const EXTRA_OBEN = 2; // Zusatzfelder über dem Ziel (sichtbar beim Überschwingen)

/* ---- Spannung ("Anticipation") ----
   Das Herzstück echter 5-Walzen-Automaten: Liegen nach den ersten Walzen schon
   SPANNUNG_AB Tempeltore im Fenster, drehen die VERBLEIBENDEN Walzen länger und
   bremsen langsamer aus. Jede betroffene Walze wartet SPANNUNG_EXTRA Sekunden länger als
   normal (1., 2., 3. betroffene Walze: steigend), und ihre Bremsphase dauert doppelt so lang.
   Das Tempo der Rollphase bleibt gleich: Mit BREMS_ZEIT_SPANNUNG = 1,0 und gleichem Anfangstempo
   ergibt sich der Bremsweg wieder aus der Ableitung von easeOutBack (hier 5,0 Felder). */
export const SPANNUNG_AB = 2; // so viele Scatter müssen schon liegen
const SPANNUNG_EXTRA = [0.8, 1.15, 1.5]; // Zusatz-Sekunden je betroffener Walze (steigend)
const BREMS_ZEIT_SPANNUNG = 1.0; // langsames Ausdrehen
const BREMS_WEG_SPANNUNG = (LAUF_TEMPO * BREMS_ZEIT_SPANNUNG) / (BOUNCE + 3);

/**
 * Bestimmt, ob und ab welcher Walze die Spannung läuft. `feld` ist das fertige Ergebnis (feld[walze][reihe]).
 * Rückgabe { ab, scatter }:
 *   ab       Index der ersten Walze, die länger dreht (0-basiert), oder -1 (keine Spannung)
 *   scatter  die Tempeltore, die zu diesem Zeitpunkt schon liegen, als [walze, reihe]
 *
 * EHRLICHKEIT: Diese Funktion LIEST nur das längst feststehende Ergebnis. Sie verändert keinen
 * Stopp. Dramatisiert wird, was der Zufall ohnehin geliefert hat: Sind nach Walze 2, 3 oder 4 zwei
 * Tore da, steigt die Spannung für ALLE übrigen Walzen, egal ob später ein drittes Tor fällt
 * oder nicht. ECHTE AUTOMATEN gehen hier weiter und manipulieren: Sie lassen Scatter auffällig
 * oft "knapp" über oder unter dem Fenster stoppen und gewichten die Walzenbänder virtuell so,
 * dass das dritte Symbol seltener fällt, als es aussieht. Das tun wir bewusst NICHT: Jede
 * Walze stoppt auf einem gleichverteilt gewürfelten Index, auch wenn die Spannung läuft.
 */
export function spannungErmitteln(feld) {
  const scatter = [];
  for (let walze = 0; walze < ANZAHL_WALZEN - 1; walze++) {
    feld[walze].forEach((symbol, reihe) => {
      if (symbol === SCATTER) scatter.push([walze, reihe]);
    });
    if (scatter.length >= SPANNUNG_AB) return { ab: walze + 1, scatter };
  }
  return { ab: -1, scatter: [] };
}

/** easeOutBack: läuft von 0 nach 1, überschwingt kurz über 1 und federt zurück. */
function easeOutBack(x) {
  const c = BOUNCE + 1;
  return 1 + c * Math.pow(x - 1, 3) + BOUNCE * Math.pow(x - 1, 2);
}

/**
 * Plant den Lauf aller Walzen. Je Walze:
 *   distanz     Weg in ganzen Feldern (so lang ist der Streifen)
 *   laufzeit    Sekunden Rollen, danach beginnt die Bremsphase
 *   bremsZeit   Dauer der Bremsphase (normal 0,5 s, bei Spannung 1,0 s)
 *   bremsWeg    Felder, die in der Bremsphase zurückgelegt werden
 *   ende        Sekunde, in der die Walze ruht
 *   spannung    true, wenn die Walze zu den länger drehenden gehört
 *   spannungStart  Sekunde, in der die Spannung für diese Walze beginnt (= Stopp der Walze davor), sonst null
 * Jede Walze rollt WALZEN_ABSTAND länger als die davor: Sie stoppen von links
 * nach rechts. Ab `spannungAb` (siehe spannungErmitteln, -1 = nie) kommt für jede
 * Walze der Spannungs-Zuschlag dazu. Die Distanz wird auf ganze Felder gerundet,
 * damit der Streifen exakt aufs Ziel passt; die Laufzeit wird daraus neu berechnet.
 */
export function laufPlanErstellen(anzahlWalzen = ANZAHL_WALZEN, spannungAb = -1) {
  const plaene = [];
  let vorherEnde = 0;
  for (let i = 0; i < anzahlWalzen; i++) {
    const spannung = spannungAb >= 0 && i >= spannungAb;
    const bremsZeit = spannung ? BREMS_ZEIT_SPANNUNG : BREMS_ZEIT;
    const bremsWeg = spannung ? BREMS_WEG_SPANNUNG : BREMS_WEG;
    const wunschEnde = spannung
      ? vorherEnde +
        WALZEN_ABSTAND +
        SPANNUNG_EXTRA[Math.min(i - spannungAb, SPANNUNG_EXTRA.length - 1)]
      : ERSTE_WALZE_LAUFZEIT + i * WALZEN_ABSTAND + BREMS_ZEIT;
    const distanz = Math.round(LAUF_TEMPO * (wunschEnde - bremsZeit) + bremsWeg);
    const laufzeit = (distanz - bremsWeg) / LAUF_TEMPO;
    plaene.push({
      distanz,
      laufzeit,
      bremsZeit,
      bremsWeg,
      ende: laufzeit + bremsZeit,
      spannung,
      spannungStart: spannung ? vorherEnde : null,
    });
    vorherEnde = laufzeit + bremsZeit;
  }
  return plaene;
}

/** Zurückgelegte Strecke (in Feldern) einer Walze zum Zeitpunkt t (Sekunden seit Start). */
export function vorschubZurZeit(plan, t) {
  if (t <= plan.laufzeit) return LAUF_TEMPO * Math.max(t, 0); // Phase 1: gleichmäßig rollen
  const x = Math.min((t - plan.laufzeit) / plan.bremsZeit, 1); // Phase 2: Fortschritt 0 … 1
  return plan.distanz - plan.bremsWeg + plan.bremsWeg * easeOutBack(x);
}

/**
 * Baut die Symbolfolge des Laufbands (von OBEN nach UNTEN):
 *   2 Zusatzfelder (echte Band-Nachbarn) | 3 Ergebnis-Felder | Füllfelder | 3 Start-Felder
 * Die Länge ist distanz + 3 + EXTRA_OBEN. Die Füllfelder sind zufällige
 * Symbole des Bandes. Weil der Streifen schnell läuft, fällt es nicht auf,
 * dass sie nicht in Bandreihenfolge stehen.
 */
export function laufbandSymbole(band, startStopp, zielStopp, distanz, zufall = Math.random) {
  const n = band.length;
  const an = (i) => band[((i % n) + n) % n];
  const streifen = [];
  for (let j = EXTRA_OBEN; j >= 1; j--) streifen.push(an(zielStopp - 1 - j));
  streifen.push(an(zielStopp - 1), an(zielStopp), an(zielStopp + 1));
  const fuellfelder = distanz - 3; // gesamt = EXTRA_OBEN + 3 + Füllfelder + 3 = distanz + 3 + EXTRA_OBEN
  for (let i = 0; i < fuellfelder; i++) streifen.push(band[Math.floor(zufall() * n)]);
  streifen.push(an(startStopp - 1), an(startStopp), an(startStopp + 1));
  return streifen;
}

/** Zahl mit Tausenderpunkt: 1250 -> "1.250". */
function zahlText(n) {
  return n.toLocaleString("de-DE");
}

/* ============================================================
   TEIL 2: DOM-HELFER
   ============================================================ */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Baut ein Symbol als <svg><use href="#sym-…"/></svg>. Die eigentliche Zeichnung
 * liegt einmal als <symbol> im Sprite in index.html; hier wird sie nur
 * "eingesetzt". SVG-Elemente brauchen createElementNS (mit Namensraum),
 * normales createElement würde sie nicht als Grafik erkennen.
 */
function symbolElement(id) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#sym-${id}`);
  svg.append(use);
  return svg;
}

/** Ein Walzenfeld (quadratische Zelle) mit dem Symbol darin. */
function zelleBauen(symbolId) {
  const zelle = document.createElement("div");
  zelle.className = "zelle";
  zelle.append(symbolElement(symbolId));
  return zelle;
}

/** Wartet `ms` Millisekunden – als Promise, damit man "await warte(…)" schreiben kann. */
function warte(ms) {
  return new Promise((fertig) => setTimeout(fertig, ms));
}

/**
 * Spielt einen Klang aus klang.js, aber erst NACH der ersten Nutzer-Geste (Klick, Tippen, Taste).
 * Browser erlauben Ton vorher nicht ("Autoplay-Policy"); ohne diese Prüfung würde ein automatisch
 * fortgesetztes Spiel (z. B. nach dem Neuladen) eine Konsolen-Warnung erzeugen.
 */
function klang(funktion, ...argumente) {
  if (
    typeof navigator !== "undefined" &&
    navigator.userActivation &&
    !navigator.userActivation.hasBeenActive
  )
    return;
  funktion(...argumente);
}

/**
 * Münz-Ticks während der Betrag in der Gewinnfeier hochzählt. Bewusst GEDROSSELT: Zwischen zwei
 * Ticks liegen anfangs 55 ms, am Ende 140 ms (der Zähler läuft ja zum Schluss langsamer aus).
 * Rückgabe: Funktion, die die Ticks sofort beendet (wenn die Feier endet oder übersprungen wird).
 * Bei "Bewegung reduzieren" gibt es keinen hochzählenden Betrag und damit auch keine Ticks.
 */
function muenzTicksStarten(dauerMs) {
  if (bewegungReduziert()) return () => {};
  const start = performance.now();
  let timer = 0;
  const tick = () => {
    const t = (performance.now() - start) / dauerMs;
    if (t >= 1) return;
    klang(klangMuenzTick);
    timer = setTimeout(tick, 55 + 85 * t * t);
  };
  tick();
  return () => clearTimeout(timer);
}

/** Startet eine CSS-Animation (über eine Klasse) garantiert NEU (Klasse weg, Reflow, Klasse dran). */
function animationNeuStarten(element, klasse) {
  element.classList.remove(klasse);
  void element.offsetWidth;
  element.classList.add(klasse);
}

/**
 * Zeichnet kleine Vorschaubilder aller Gewinnlinien in einen Container
 * (für die Lernbox). Die Bilder entstehen direkt aus der Konstante
 * GEWINNLINIEN: ändert man dort eine Linie, ändert sich die Grafik mit.
 */
function liniengrafikenBauen(container) {
  GEWINNLINIEN.forEach((reihen, nr) => {
    const figur = document.createElement("figure");
    figur.style.setProperty("--lc", linienFarbe(nr)); // dieselbe Farbe wie der Tab dieser Linie
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 60 36");
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      `Linie ${nr + 1}: ${LINIEN_NAMEN[nr]}, Reihen ${reihen.join(", ")}`,
    );
    // Raster: 5 Spalten x 3 Reihen kleine Felder
    for (let w = 0; w < ANZAHL_WALZEN; w++) {
      for (let r = 0; r < ANZAHL_REIHEN; r++) {
        const feld = document.createElementNS(SVG_NS, "rect");
        feld.setAttribute("x", String(2 + w * 11.2));
        feld.setAttribute("y", String(2 + r * 11.2));
        feld.setAttribute("width", "9.6");
        feld.setAttribute("height", "9.6");
        feld.setAttribute("rx", "2");
        feld.setAttribute("class", reihen[w] === r ? "feld an" : "feld");
        svg.append(feld);
      }
    }
    // Die Linie selbst: durch die Mitte der markierten Felder
    const punkte = reihen
      .map((reihe, w) => `${2 + w * 11.2 + 4.8},${2 + reihe * 11.2 + 4.8}`)
      .join(" ");
    const linie = document.createElementNS(SVG_NS, "polyline");
    linie.setAttribute("points", punkte);
    linie.setAttribute("class", "linie");
    svg.append(linie);
    const beschriftung = document.createElement("figcaption");
    beschriftung.textContent = `${nr + 1} · ${LINIEN_NAMEN[nr]}`;
    figur.append(svg, beschriftung);
    container.append(figur);
  });
}

/* ============================================================
   TEIL 3: DAS SPIEL IM BROWSER
   ============================================================ */

function starteSpiel() {
  // ----- Elemente einmal suchen und merken -----
  const buehneElement = document.getElementById("buehne");
  const fensterElement = document.getElementById("fenster");
  const walzenRahmen = document.getElementById("walzen");
  const walzenElemente = [...walzenRahmen.querySelectorAll(".walze")];
  const linienEbene = document.getElementById("linien-ebene");
  // Nummern-Tabs links/rechts vom Fenster samt Linien-Vorschau (siehe assets/gewinnlinien.js)
  const linienAnzeige = linienAnzeigeBauen({
    linien: GEWINNLINIEN,
    namen: LINIEN_NAMEN,
    rahmen: walzenRahmen,
    tabsLinks: document.getElementById("tabs-links"),
    tabsRechts: document.getElementById("tabs-rechts"),
  });
  const bannerElement = document.getElementById("freispiel-banner");
  const bannerSymbol = document.getElementById("banner-symbol");
  const bannerName = document.getElementById("banner-name");
  const bannerUebrig = document.getElementById("banner-uebrig");
  const bannerGewinn = document.getElementById("banner-gewinn");
  const bannerMulti = document.getElementById("banner-multi");
  let gezeigterMulti = 1;
  const gewinnAnzeige = document.getElementById("gewinn-anzeige");
  const drehInfo = document.getElementById("dreh-info");
  const hudLetzter = document.getElementById("hud-letzter");
  const hudFreispiele = document.getElementById("hud-freispiele");
  const drehKnopf = document.getElementById("dreh-knopf");
  const chipKnoepfe = [...document.querySelectorAll(".chip")];
  const linienEinsatzInfo = document.getElementById("linien-einsatz");
  const linienTabelle = document.getElementById("tabelle-linien");
  const expansionsTabelle = document.getElementById("tabelle-expansion");
  const scatterBetrag = document.getElementById("scatter-betrag");
  const tabelleHinweis = document.getElementById("tabelle-hinweis");
  const toplisteElement = document.getElementById("topliste");
  const resetKnopf = document.getElementById("reset");
  const kontoResetKnopf = document.getElementById("konto-reset");
  const kontoInfo = document.getElementById("konto-info");

  const laengen = WALZENBAENDER.map((band) => band.length);

  // ----- Spielzustand -----
  let laeuft = false; // true, solange gedreht wird (auch durch alle Freispiele): alles gesperrt
  let autoDreh = null; // Auto-Drehen (assets/autodreh.js), wird beim Start eingerichtet
  let stopps = zufallsStopps(); // aktuelle Stopp-Indizes (Startbild: zufällig, hat keinen Einfluss aufs Geld)
  /* runde = die aktuelle Runde (siehe neueRunde) oder null. Zusätzlich merkt sie sich
     "abgerechnet", damit das Geld nie doppelt gutgeschrieben wird. Ist runde gesetzt
     und laeuft === false, warten gesicherte Freispiele darauf, fortgesetzt zu werden. */
  let runde = null;
  /* Das Ergebnis eines Spielzugs steht fest (und steckt in runde.bisher), bevor die Animation es
     zeigt. Damit Banner und Anzeige nichts vorwegnehmen, merkt sich dieser Wert den Rundengewinn,
     der gerade auf dem Bildschirm STEHEN darf. */
  let gezeigterGewinn = 0;
  /* Höchste Feier-Stufe (0 bis 3), die in dieser Runde schon gezeigt wurde. Am Ende der Freispiele wird
     der Seriengewinn nur gefeiert, wenn er eine HÖHERE Stufe erreicht. Sonst würde dieselbe Stufe doppelt kommen. */
  let hoechsteStufe = 0;
  const gespeicherterEinsatz = lade(SPIEL, "einsatz", EINSATZSTUFEN[0]);
  let gewaehlterEinsatz = EINSATZSTUFEN.includes(gespeicherterEinsatz)
    ? gespeicherterEinsatz
    : EINSATZSTUFEN[0];

  // ---------------------------------------------------------
  // Walzen aufbauen und positionieren
  // ---------------------------------------------------------

  /**
   * Füllt jedes feste Band mit den Symbolen. Das Band steht DREIMAL hintereinander
   * im DOM (Kopie 0, 1, 2). So kann die sichtbare Position in der mittleren
   * Kopie liegen und die Nachbarn oben/unten sind immer vorhanden, auch bei
   * Stopp-Index 0 oder 29. Insgesamt 3 x 30 = 90 Felder je Walze.
   */
  function baenderAufbauen() {
    walzenElemente.forEach((walze, i) => {
      const band = walze.querySelector(".band");
      band.replaceChildren();
      for (let kopie = 0; kopie < 3; kopie++) {
        for (const symbolId of WALZENBAENDER[i]) band.append(zelleBauen(symbolId));
      }
    });
  }

  /**
   * Setzt die Position des festen Bandes. `position` ist der Index des Symbols
   * in der Mitte. Die mittlere Kopie beginnt bei Feld n; das OBERE sichtbare Feld
   * ist eins vor der Mitte: n + position - 1. translateY in PROZENT bezieht sich
   * auf die Höhe des Bandes selbst (3n Felder), also: Verschiebung / (3n).
   */
  function positionSetzen(walzenNr, position) {
    const n = laengen[walzenNr];
    const prozent = ((position + n - 1) / (3 * n)) * 100;
    walzenElemente[walzenNr].querySelector(".band").style.transform =
      `translate3d(0, ${-prozent}%, 0)`;
  }

  function alleWalzenSetzen() {
    stopps.forEach((s, i) => positionSetzen(i, s));
    fensterBeschriften();
  }

  /** Screenreader-Beschriftung des Fensters: nennt alle 15 sichtbaren Symbole Walze für Walze. */
  function fensterBeschriften() {
    const feld = sichtfeldAusStopps(stopps);
    const text = feld
      .map((spalte, i) => `Walze ${i + 1}: ${spalte.map((id) => SYMBOL_NAMEN[id]).join(", ")}`)
      .join("; ");
    fensterElement.setAttribute("aria-label", text);
  }

  /** Das obere/mittlere/untere Feld einer Walze im festen Band (mittlere Kopie). */
  function zelleAn(walzenNr, reihe) {
    const band = walzenElemente[walzenNr].querySelector(".band");
    return band.children[laengen[walzenNr] + stopps[walzenNr] - 1 + reihe];
  }

  // ---------------------------------------------------------
  // Einsatz und Chips
  // ---------------------------------------------------------

  /**
   * Der Einsatz, der wirklich gespielt wird: der gewählte, solange das Konto
   * reicht. Sonst der größte Chip, den man sich noch leisten kann (0 = pleite).
   * Bei gesicherten Freispielen gilt immer deren Einsatz.
   */
  function wirksamerEinsatz() {
    if (runde) return runde.einsatz;
    const stand = kontostand();
    if (gewaehlterEinsatz <= stand) return gewaehlterEinsatz;
    const leistbar = EINSATZSTUFEN.filter((stufe) => stufe <= stand);
    return leistbar.length ? Math.max(...leistbar) : 0;
  }

  function steuerungAktualisieren() {
    const stand = kontostand();
    const wirksam = wirksamerEinsatz();
    const wartetAufFortsetzung = runde !== null && !laeuft;
    chipKnoepfe.forEach((chip) => {
      const wert = Number(chip.dataset.einsatz);
      chip.setAttribute("aria-pressed", String(wert === wirksam));
      chip.disabled = laeuft || Boolean(autoDreh?.aktiv()) || runde !== null || wert > stand; // gesperrt beim Drehen, in Freispielen oder wenn zu teuer
    });
    drehKnopf.textContent = wartetAufFortsetzung ? "FREISPIELE FORTSETZEN" : "DREHEN";
    drehKnopf.disabled = laeuft || Boolean(autoDreh?.aktiv()) || (runde === null && wirksam === 0);
    resetKnopf.disabled = laeuft || Boolean(autoDreh?.aktiv());
    kontoResetKnopf.disabled = laeuft || Boolean(autoDreh?.aktiv());
    const proLinie = (wirksam || gewaehlterEinsatz) / ANZAHL_LINIEN;
    linienEinsatzInfo.textContent = `Gesamteinsatz für alle 10 Linien, das sind ${proLinie.toLocaleString("de-DE")} pro Linie.`;
    tabelleBetraegeAktualisieren();
    autoDreh?.aktualisieren();
  }

  function einsatzWaehlen(wert) {
    if (
      laeuft ||
      autoDreh?.aktiv() ||
      runde ||
      !EINSATZSTUFEN.includes(wert) ||
      wert > kontostand()
    )
      return;
    gewaehlterEinsatz = wert;
    speichere(SPIEL, "einsatz", wert);
    steuerungAktualisieren();
  }

  // ---------------------------------------------------------
  // Gewinntabellen (aus den Konstanten gebaut: eine Quelle der Wahrheit)
  // ---------------------------------------------------------
  const linienZellen = {}; // symbol -> { zeile, 2: <td>, 3: <td>, … }
  const betragsZellen = []; // { zelle, quote, art } zum späteren Aktualisieren

  function symbolZelleBauen(symbolId) {
    const th = document.createElement("th");
    th.scope = "row";
    const halter = document.createElement("span");
    halter.className = "symbol-name";
    const bild = symbolElement(symbolId);
    const name = document.createElement("span");
    name.textContent = SYMBOL_NAMEN[symbolId];
    halter.append(bild, name);
    th.append(halter);
    return th;
  }

  /** Eine Zelle mit großem Betrag und kleiner Quote darunter. */
  function betragsZelleBauen(quote, art) {
    const td = document.createElement("td");
    if (quote === undefined) {
      td.textContent = "–";
      td.className = "leer";
      return td;
    }
    const betrag = document.createElement("span");
    betrag.className = "betrag";
    const q = document.createElement("span");
    q.className = "quote";
    q.textContent = `×${zahlText(quote)}`;
    td.append(betrag, q);
    betragsZellen.push({ betrag, quote, art });
    return td;
  }

  function tabellenAufbauen() {
    // Absteigend (höchstes Symbol oben) – so liest man Gewinntabellen gewohnt
    for (const symbolId of [...SYMBOLE].reverse()) {
      const zeile = document.createElement("tr");
      zeile.append(symbolZelleBauen(symbolId));
      linienZellen[symbolId] = { zeile };
      for (const anzahl of [2, 3, 4, 5]) {
        const td = betragsZelleBauen(LINIENQUOTEN[symbolId][anzahl], "linie");
        linienZellen[symbolId][anzahl] = td;
        zeile.append(td);
      }
      linienTabelle.append(zeile);

      const ez = document.createElement("tr");
      ez.append(symbolZelleBauen(symbolId));
      for (const anzahl of [2, 3, 4, 5])
        ez.append(betragsZelleBauen(EXPANSIONSQUOTEN[symbolId][anzahl], "expansion"));
      expansionsTabelle.append(ez);
    }
  }

  /** Beträge der Tabellen für den aktuell wirksamen Einsatz. */
  function tabelleBetraegeAktualisieren() {
    const einsatz = wirksamerEinsatz() || gewaehlterEinsatz;
    tabelleHinweis.textContent =
      `Beträge für deinen Einsatz von ${zahlText(einsatz)}. Linien-Gewinn = Quote × Einsatz ÷ 10 ` +
      `(Netto-Gewinn = Auszahlung minus Einsatz).`;
    for (const { betrag, quote, art } of betragsZellen) {
      betrag.textContent = zahlText(
        art === "linie" ? liniengewinnBetrag(quote, einsatz) : quote * einsatz,
      );
    }
    scatterBetrag.textContent = zahlText(einsatz * SCATTER_QUOTE);
  }

  // ---------------------------------------------------------
  // Anzeigen
  // ---------------------------------------------------------

  function seiteAktualisieren() {
    toplisteAnzeigen(toplisteElement, SPIEL, (p) => `+${zahlText(p)}`);
    const pleiten = statistik().pleiten;
    kontoInfo.textContent =
      `Pleiten bisher: ${pleiten}. „Konto zurücksetzen“ setzt das gemeinsame Spielgeld-Konto auf ${zahlText(STARTGELD)}. ` +
      `Rekorde bleiben erhalten, der Pleiten-Zähler zählt dabei mit.`;
  }

  /** Setzt Text und Farbe (plus/minus) von Gewinn-Anzeige und HUD-Feld. */
  function ergebnisAnzeigen(netto) {
    const text = netto > 0 ? `+${zahlText(netto)}` : `−${zahlText(Math.abs(netto))}`; // echtes Minuszeichen
    const art = netto > 0 ? "plus" : "minus";
    gewinnAnzeige.textContent = text;
    gewinnAnzeige.className = `gewinn-anzeige ${art}`;
    hudLetzter.textContent = text;
    hudLetzter.className = `wert ${art}`;
    if (netto > 0 && !bewegungReduziert()) animationNeuStarten(gewinnAnzeige, "rekord-puls");
  }

  /** Während der Freispiele: laufender Brutto-Gewinn der Runde (inkl. auslösendem Dreh) über dem Spielfeld. */
  function freispielGewinnAnzeigen() {
    gewinnAnzeige.textContent = `Rundengewinn: ${zahlText(gezeigterGewinn)}`;
    gewinnAnzeige.className = gezeigterGewinn > 0 ? "gewinn-anzeige plus" : "gewinn-anzeige";
  }

  /**
   * Zahlen im Banner und im HUD. `verborgen` = Freispiele, die der laufende Zug gerade
   * erst gewonnen hat (Wiederauslösung): Sie werden erst nach der Animation mitgezählt.
   */
  function bannerAktualisieren(verborgen = 0, multi = runde.multi ?? 1) {
    const sichtbar = runde.uebrig - verborgen;
    bannerUebrig.textContent = String(sichtbar);
    bannerGewinn.textContent = zahlText(gezeigterGewinn);
    hudFreispiele.textContent = String(sichtbar);
    // Multiplikator: `multi` gilt für das NÄCHSTE Freispiel (während eines Zugs: für diesen Zug)
    bannerMulti.textContent = `×${multi}`;
    bannerMulti.classList.toggle("aktiv", multi > 1);
    if (multi > gezeigterMulti) {
      bannerMulti.classList.remove("hoch");
      void bannerMulti.offsetWidth; // Animation neu starten
      bannerMulti.classList.add("hoch");
    }
    gezeigterMulti = multi;
  }

  /** Setzt das Spezialsymbol im Banner (Grafik + Name). */
  function bannerSymbolSetzen(symbolId) {
    bannerSymbol.replaceChildren(symbolElement(symbolId));
    bannerName.textContent = SYMBOL_NAMEN[symbolId];
  }

  /** Schaltet Banner, Bühnen-Farbverschiebung und HUD-Anzeige der Freispiele ein oder aus. */
  function freispielModusSetzen(an) {
    bannerElement.hidden = !an;
    buehneElement.classList.toggle("freispiel", an);
    if (an) {
      bannerSymbolSetzen(runde.symbol);
      bannerAktualisieren();
    } else {
      hudFreispiele.textContent = "–";
    }
  }

  /** Entfernt alle Gewinn-Effekte des letzten Zugs. */
  function effekteLoeschen() {
    fensterElement
      .querySelectorAll(
        ".gewinn-blinken, .gewinn-dauer, .scatter-treffer, .scatter-spannung, .knapp",
      )
      .forEach((z) => {
        z.classList.remove(
          "gewinn-blinken",
          "gewinn-dauer",
          "scatter-treffer",
          "scatter-spannung",
          "knapp",
        );
      });
    // Lauflicht-Rahmen zurück in den Leerlauf (siehe spiel.css: .dreht = schnell, .gewinn = golden)
    fensterElement.classList.remove("dreht", "gewinn", "spannung");
    buehneElement.classList.remove("spannung");
    for (const w of walzenElemente) {
      w.classList.remove("expandiert", "spannung-walze");
      const ex = w.querySelector(".expansion");
      ex.classList.remove("aktiv");
      ex.replaceChildren();
    }
    linienEbene.replaceChildren();
    linienAnzeige.zuruecksetzen();
    linienTabelle.querySelectorAll(".treffer").forEach((z) => z.classList.remove("treffer"));
  }

  // ---------------------------------------------------------
  // Walzen-Animation
  // ---------------------------------------------------------

  /**
   * Schaltet die Spannungs-Optik ein oder aus: Spannungs-Glow auf der Bühne, schneller
   * Lauflicht-Rahmen, und die Tempeltore, die schon liegen, pulsieren golden. Rein optisch;
   * das Ergebnis steht längst fest (siehe spannungErmitteln).
   */
  function spannungSetzen(an, spannung = null) {
    buehneElement.classList.toggle("spannung", an);
    fensterElement.classList.toggle("spannung", an);
    if (an && spannung) felderMarkieren(spannung.scatter, "scatter-spannung");
  }

  /**
   * Lässt die Walzen von `stopps` zu `ziel` laufen und liefert ein Promise,
   * das erst erfüllt wird, wenn die letzte Walze ruht. Mit requestAnimationFrame
   * wird in jedem Bildschirm-Frame die Position aus der verstrichenen Zeit
   * berechnet (nicht aus "Frames zählen"): So ist der Ablauf auf 60-Hz- und
   * 144-Hz-Bildschirmen gleich lang.
   *
   * Dazu kommen Ton und Spannung: Beim Start surrt der Dreh-Klang, jede Walze stoppt mit einem
   * Tick. Liegen nach den ersten Walzen schon 2 Tempeltore (spannungErmitteln), drehen die übrigen
   * Walzen länger und bremsen langsamer, die Tore pulsieren golden, und pro betroffener Walze
   * läuft der Spannungs-Ton. Das Ergebnis ändert das nicht: Wo die Walzen stoppen, steht vorher fest.
   */
  function walzenLaufenLassen(ziel) {
    const zielFeld = sichtfeldAusStopps(ziel);
    const spannung = spannungErmitteln(zielFeld);
    klang(klangSpinStart); // läuft noch synchron im Klick: erlaubt dem Browser den Ton zu starten

    // Reduzierte Bewegung: kein Lauf, Ergebnis fast sofort. Die Spannung schrumpft auf höchstens 0,3 s Wartezeit.
    if (bewegungReduziert()) {
      stopps = [...ziel];
      alleWalzenSetzen();
      klang(klangWalzenStopp, ANZAHL_WALZEN - 1);
      if (spannung.ab < 0) return warte(150);
      return (async () => {
        await warte(150);
        spannungSetzen(true, spannung);
        klang(klangSpannung);
        await warte(300);
        spannungSetzen(false);
      })();
    }

    const plaene = laufPlanErstellen(ANZAHL_WALZEN, spannung.ab);
    const streifenLaengen = plaene.map((p) => p.distanz + 3 + EXTRA_OBEN);
    const ruht = plaene.map(() => false);
    const spannungLaeuft = plaene.map(() => false);
    fensterElement.classList.add("dreht");

    /* Laufbänder aufbauen. Das Laufband liegt als eigenes Element neben dem festen
       Band; die Klasse "laeuft" tauscht beide aus (siehe spiel.css). */
    walzenElemente.forEach((walze, i) => {
      const laufband = walze.querySelector(".laufband");
      laufband.replaceChildren(
        ...laufbandSymbole(WALZENBAENDER[i], stopps[i], ziel[i], plaene[i].distanz).map(zelleBauen),
      );
      laufband.style.transform = laufbandVerschiebung(streifenLaengen[i], 0);
      walze.classList.add("laeuft");
    });

    return new Promise((fertig) => {
      const startZeit = performance.now();
      function bild(jetzt) {
        const t = (jetzt - startZeit) / 1000;
        let nochAktiv = 0;
        plaene.forEach((plan, i) => {
          if (ruht[i]) return;
          // Die Spannung einer Walze beginnt in dem Moment, in dem die Walze davor ruht.
          if (plan.spannung && !spannungLaeuft[i] && t >= plan.spannungStart) {
            spannungLaeuft[i] = true;
            if (i === spannung.ab) spannungSetzen(true, spannung);
            walzenElemente[i].classList.add("spannung-walze");
            klang(klangSpannung);
          }
          if (t >= plan.ende) {
            // Walze ruht: festes Band exakt aufs Ziel setzen, Laufband wegräumen
            stopps[i] = ziel[i];
            positionSetzen(i, ziel[i]);
            walzenElemente[i].classList.remove("laeuft", "spannung-walze");
            walzenElemente[i].querySelector(".laufband").replaceChildren();
            ruht[i] = true;
            klang(klangWalzenStopp, i);
            // Fällt auf einer Walze mit Spannung ein Tempeltor, leuchtet es sofort golden mit.
            if (plan.spannung) {
              zielFeld[i].forEach((symbol, reihe) => {
                if (symbol === SCATTER) felderMarkieren([[i, reihe]], "scatter-spannung");
              });
            }
            return;
          }
          walzenElemente[i].querySelector(".laufband").style.transform = laufbandVerschiebung(
            streifenLaengen[i],
            vorschubZurZeit(plan, t),
          );
          nochAktiv++;
        });
        if (nochAktiv > 0) {
          requestAnimationFrame(bild);
        } else {
          alleWalzenSetzen();
          fensterElement.classList.remove("dreht");
          spannungSetzen(false);
          fertig();
        }
      }
      requestAnimationFrame(bild);
    });
  }

  /**
   * translateY für das Laufband. Das oberste sichtbare Feld ist am Start das
   * Feld (länge - 3) und läuft mit dem Vorschub nach oben im Streifen:
   * Index = (länge - 3) - vorschub. Prozent beziehen sich auf die Streifenhöhe.
   */
  function laufbandVerschiebung(laenge, vorschub) {
    const obersteSichtbare = laenge - 3 - vorschub;
    return `translate3d(0, ${-(obersteSichtbare / laenge) * 100}%, 0)`;
  }

  // ---------------------------------------------------------
  // Gewinn-Darstellung: Linien, Scatter, Expansion
  // ---------------------------------------------------------

  /** Pixelmitte eines Walzenfeldes relativ zum Walzenrahmen. */
  function feldMitte(walzenNr, reihe) {
    const rahmen = walzenRahmen.getBoundingClientRect();
    const r = walzenElemente[walzenNr].getBoundingClientRect();
    return {
      x: r.left - rahmen.left + r.width / 2,
      y: r.top - rahmen.top + ((reihe + 0.5) * r.height) / ANZAHL_REIHEN,
    };
  }

  /**
   * Zeichnet eine Gewinnlinie als leuchtenden Linienzug über die Walzen. Der SVG-Layer
   * bekommt als viewBox die echte Pixelgröße des Rahmens, so entsprechen 1 SVG-Einheit
   * und 1 Pixel einander, bei jeder Bildschirmbreite.
   */
  function linieZeichnen(liniennr) {
    const rahmen = walzenRahmen.getBoundingClientRect();
    linienEbene.setAttribute("viewBox", `0 0 ${rahmen.width} ${rahmen.height}`);
    const reihen = GEWINNLINIEN[liniennr];
    const punkte = reihen.map((reihe, w) => feldMitte(w, reihe));
    // links und rechts bis zum Rand verlängern (wie die Linienpfeile echter Automaten)
    punkte.unshift({ x: 0, y: punkte[0].y });
    punkte.push({ x: rahmen.width, y: punkte[punkte.length - 1].y });
    const linie = document.createElementNS(SVG_NS, "polyline");
    linie.setAttribute(
      "points",
      punkte.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
    );
    linie.setAttribute("class", "gewinn-linie");
    linie.style.setProperty("--lc", linienAnzeige.farbe(liniennr)); // Linienfarbe wie beim Tab (siehe spiel.css)
    linienEbene.append(linie);

    // LICHTLAUF: Ein helles Lichtpaket läuft die Linie entlang. Technik: Dieselbe Linie noch einmal als
    // <path> mit pathLength="1" (die Länge zählt dann als 1, egal wie lang die Linie in Pixeln ist) und
    // einem Strich-Muster aus "kurz an, lang aus". Die CSS-Animation schiebt das Muster per
    // stroke-dashoffset von 0 auf -1 entlang des Pfads (siehe spiel.css, @keyframes lichtlauf).
    const licht = document.createElementNS(SVG_NS, "path");
    licht.setAttribute(
      "d",
      "M" + punkte.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L"),
    );
    licht.setAttribute("pathLength", "1");
    licht.setAttribute("class", "gewinn-licht");
    linienEbene.append(licht);
  }

  /** Markiert Felder mit einer Klasse. positionen = Liste von [walze, reihe]. */
  function felderMarkieren(positionen, klasse, an = true) {
    for (const [walze, reihe] of positionen) zelleAn(walze, reihe)?.classList.toggle(klasse, an);
  }

  /** Hebt die Treffer einer Gewinnlinie in der Tabelle hervor. */
  function tabelleHervorheben(gewinn) {
    const z = linienZellen[gewinn.symbol];
    z.zeile.classList.add("treffer");
    z[gewinn.anzahl]?.classList.add("treffer");
  }

  function linienGewinnText(g) {
    return `Linie ${g.linie + 1} (${LINIEN_NAMEN[g.linie]}): ${g.anzahl} × ${SYMBOL_NAMEN[g.symbol]}, +${zahlText(g.betrag)}`;
  }

  /**
   * Lässt die gewinnenden Linien NACHEINANDER aufleuchten: Linie zeichnen, Gewinnfelder
   * pulsieren, Text nennen, kurz warten, weiter. Danach bleiben die Gewinnfelder dezent
   * umrandet. Bei reduzierter Bewegung gibt es keine Abfolge: alles steht sofort da.
   */
  async function linienZeigen(gewinne) {
    if (gewinne.length === 0) return;
    // JEDER Liniengewinn feiert, auch wenn die Auszahlung unter dem Einsatz liegt (das tun echte Geräte
    // genauso, siehe Lernbox "Die Psychologie echter Automaten"): Lichtlauf, Mini-Jingle, Münz-Tick je weiterer
    // Linie. Die Netto-Anzeige bleibt trotzdem ehrlich: Sie zeigt immer Auszahlung minus Einsatz.
    klang(klangGewinn, 0);
    if (bewegungReduziert()) {
      // Statisch: alle Linien auf einmal, ihre Tabs leuchten ohne Puls (siehe leuchten() in gewinnlinien.js)
      for (const g of gewinne) {
        linieZeichnen(g.linie);
        linienAnzeige.leuchten(g.linie);
        felderMarkieren(g.positionen, "gewinn-dauer");
        tabelleHervorheben(g);
      }
      await warte(150);
      return;
    }
    const dauer = Math.max(380, Math.min(850, 4200 / gewinne.length)); // viele Linien: pro Linie kürzer
    for (const [nr, g] of gewinne.entries()) {
      if (nr > 0) klang(klangMuenzTick);
      linienEbene.replaceChildren();
      linieZeichnen(g.linie);
      linienAnzeige.leuchten(g.linie); // der Tab dieser Linie leuchtet im Takt des Lichtlaufs
      felderMarkieren(g.positionen, "gewinn-blinken");
      tabelleHervorheben(g);
      drehInfo.textContent = linienGewinnText(g);
      await warte(dauer);
      felderMarkieren(g.positionen, "gewinn-blinken", false);
      felderMarkieren(g.positionen, "gewinn-dauer");
      linienAnzeige.leuchten(g.linie, false); // danach bleibt der Tab nur dezent als "gewonnen" markiert
      linienAnzeige.markieren(g.linie);
    }
    linienEbene.replaceChildren();
  }

  /**
   * Scatter-Treffer: Tempeltore leuchten auf (das goldene Pulsieren der Spannung wird zum türkisen Treffer).
   * Fällt das dritte Tor mitten in den Freispielen, klingt der Freispiel-Jingle noch einmal an.
   */
  async function scatterZeigen(scatter, istFreispiel) {
    if (!scatter.ausgeloest) return;
    felderMarkieren(scatter.positionen, "scatter-spannung", false);
    felderMarkieren(scatter.positionen, "scatter-treffer");
    if (istFreispiel) klang(klangGewinn, 2);
    await warte(bewegungReduziert() ? 150 : 900);
  }

  /**
   * "So knapp!": Feedback für einen echten Beinahe-Gewinn (siehe fastGewinnErmitteln). Die beteiligten
   * Felder wackeln, dazu klingt der "Ooh"-Ton. Gibt den Satz für die Statuszeile zurück (oder "").
   * Nichts davon beeinflusst das Ergebnis, es zeigt nur, was zufällig vorkam.
   */
  async function knappZeigen(fast) {
    if (!fast) return "";
    felderMarkieren(fast.positionen, "scatter-spannung", false);
    felderMarkieren(fast.positionen, "knapp");
    klang(klangFastGewinn);
    const text =
      fast.art === "scatter"
        ? "So knapp! Zwei Tempeltore liegen, für die Freispiele fehlt das dritte."
        : `So knapp! Das fünfte Symbol (${SYMBOL_NAMEN[fast.symbol]}) liegt direkt daneben.`;
    drehInfo.textContent = text;
    await warte(bewegungReduziert() ? 150 : 1000);
    return text;
  }

  /** Gewinnfeier mit Ton: Jingle passend zur Stufe, dazu Münz-Ticks, solange der Betrag hochzählt. */
  async function feiern(optionen) {
    const stufe = stufeBestimmen(optionen.betrag, optionen.einsatz);
    let ticksStoppen = () => {};
    if (stufe > 0) {
      klang(klangGewinn, stufe);
      ticksStoppen = muenzTicksStarten(STUFEN[stufe - 1].tickerMs);
    }
    try {
      return await gewinnFeiern({ buehne: buehneElement, ...optionen });
    } finally {
      ticksStoppen();
    }
  }

  /**
   * Expansion in drei Schritten: (1) die Spezialsymbole im Sichtfeld leuchten auf,
   * (2) von links nach rechts füllt das Symbol jede betroffene Walze komplett
   * (kurzes Aufdecken), (3) die ausgefüllten Walzen leuchten für den Zusatzgewinn.
   */
  async function expansionZeigen(expansion, multi = 1) {
    const reduziert = bewegungReduziert();
    const feld = sichtfeldAusStopps(stopps);
    const positionen = [];
    feld.forEach((spalte, w) =>
      spalte.forEach((s, r) => {
        if (s === expansion.symbol) positionen.push([w, r]);
      }),
    );
    // Das Blinken ist Deko: Bei reduzierter Bewegung markieren wir die Felder nur still (gewinn-dauer).
    felderMarkieren(positionen, reduziert ? "gewinn-dauer" : "gewinn-blinken");
    drehInfo.textContent = `Expansion! ${SYMBOL_NAMEN[expansion.symbol]} füllt ${expansion.walzen.length === 1 ? "eine Walze" : `${expansion.walzen.length} Walzen`} …`;
    await warte(reduziert ? 100 : 800);

    for (const w of expansion.walzen) {
      const ex = walzenElemente[w].querySelector(".expansion");
      ex.replaceChildren(...[0, 1, 2].map(() => zelleBauen(expansion.symbol)));
      ex.classList.add("aktiv"); // CSS-Animation "aufdecken" startet
      walzenElemente[w].classList.add("expandiert");
      await warte(reduziert ? 0 : 380);
    }
    felderMarkieren(positionen, "gewinn-blinken", false);
    await warte(reduziert ? 100 : 500);
    drehInfo.textContent =
      expansion.betrag > 0
        ? `${expansion.anzahl} × ${SYMBOL_NAMEN[expansion.symbol]} auf allen 10 Linien: +${zahlText(expansion.betrag * multi)}` +
          (multi > 1 ? ` (×${multi})` : "")
        : "Das Symbol expandiert, aber für eine Auszahlung reichen die Walzen nicht.";
    await warte(reduziert ? 150 : 1100);
  }

  /** Zusammenfassung eines Spielzugs als Text (für die Statuszeile). */
  function zugText(e) {
    const teile = [];
    if (e.liniengewinne.length > 0) {
      teile.push(
        `${e.liniengewinne.length} ${e.liniengewinne.length === 1 ? "Gewinnlinie" : "Gewinnlinien"}: +${zahlText(e.liniensumme)}` +
          (e.multi > 1 ? ` (×${e.multi})` : ""),
      );
    }
    if (e.scatter.ausgeloest)
      teile.push(`${e.scatter.anzahl} Tempeltore: +${zahlText(e.scatter.betrag)}`);
    if (e.expansion && e.expansion.betrag > 0)
      teile.push(
        `Expansion: +${zahlText(e.expansion.betrag * e.multi)}${e.multi > 1 ? ` (×${e.multi})` : ""}`,
      );
    if (e.gewonnen && e.multi < MULTI_MAX) teile.push(`Multiplikator steigt auf ×${e.multi + 1}`);
    return teile.length > 0 ? teile.join(" · ") : "Leider kein Treffer.";
  }

  // ---------------------------------------------------------
  // Abrechnung (Geld) und Sichern
  // ---------------------------------------------------------

  /**
   * Schreibt die Gesamtauszahlung der Runde gut (rundeAbschliessen) und löscht den
   * gesicherten Freispiel-Stand. Das Flag "abgerechnet" verhindert doppeltes Gutschreiben.
   */
  function rundeAbrechnen() {
    if (!runde || runde.abgerechnet) return;
    runde.abgerechnet = true;
    rundeAbschliessen(runde.einsatz, runde.bisher);
    entferne(SPIEL, "freispiele");
  }

  /** Sichert die laufenden Freispiele im localStorage (Einsatz, Spezialsymbol, Anzahl, bisheriger Gewinn). */
  function freispieleSichern() {
    if (!runde || runde.abgerechnet || runde.uebrig <= 0) return;
    speichere(SPIEL, "freispiele", {
      einsatz: runde.einsatz,
      bisher: runde.bisher,
      uebrig: runde.uebrig,
      symbol: runde.symbol,
      gespielt: runde.gespielt,
      multi: runde.multi ?? 1,
    });
  }

  /**
   * Wird beim Verlassen der Seite aufgerufen: Stehen noch Freispiele aus, werden sie
   * gesichert. Ist die Runde schon entschieden (keine Freispiele offen), wird der
   * Gewinn sofort gutgeschrieben, damit beim Wegklicken mitten in der Animation nichts verloren geht.
   */
  function beimVerlassen() {
    if (!runde || runde.abgerechnet) return;
    if (runde.uebrig > 0) freispieleSichern();
    else rundeAbrechnen();
  }
  window.addEventListener("pagehide", beimVerlassen);

  // ---------------------------------------------------------
  // Pleite-Dialog
  // ---------------------------------------------------------

  /**
   * Eigener Dialog in der Optik von .spiel-dialog (style.css). Es gibt nur
   * eine Möglichkeit: neues Startgeld. Deshalb löst auch das Schließen mit
   * Esc den Neustart aus (Ereignis "close"), niemand bleibt ohne Geld hängen.
   */
  function pleiteDialogZeigen() {
    if (document.getElementById("pleite-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.className = "spiel-dialog";
    dialog.id = "pleite-dialog";

    const titel = document.createElement("h2");
    titel.textContent = "Pleite!";
    const text = document.createElement("p");
    text.textContent = "Du bekommst neues Startgeld.";
    const betrag = document.createElement("p");
    betrag.className = "gross";
    betrag.textContent = zahlText(STARTGELD);
    const aktionen = document.createElement("div");
    aktionen.className = "aktionen";
    const weiter = document.createElement("button");
    weiter.type = "button";
    weiter.className = "knopf primaer";
    weiter.textContent = "Weiterspielen";
    weiter.addEventListener("click", () => dialog.close());
    aktionen.append(weiter);
    dialog.append(titel, text, betrag, aktionen);

    dialog.addEventListener("close", () => {
      pleiteNeustart(); // Konto zurück auf Startgeld, Pleiten-Zähler +1
      walletHudAktualisieren();
      dialog.remove();
      seiteAktualisieren();
      steuerungAktualisieren();
    });

    document.body.append(dialog);
    dialog.showModal();
  }

  // ---------------------------------------------------------
  // Ein Spielzug, die Freispiele und die ganze Runde
  // ---------------------------------------------------------

  /**
   * Ein Spielzug (Grundspiel oder Freispiel): Ergebnis auswürfeln und FESTSCHREIBEN,
   * dann erst animieren. Direkt nach dem Würfeln steht der Zug in der Runde und (bei
   * offenen Freispielen) im localStorage. Wer jetzt die Seite verlässt, verliert nichts.
   */
  async function spielzugAusfuehren() {
    effekteLoeschen();
    const zug = spielzugDurchfuehren(runde);
    const e = zug.ergebnis;
    freispieleSichern();
    if (zug.istFreispiel) {
      bannerAktualisieren(zug.neueFreispiele, e.multi);
      drehInfo.textContent = `Freispiel ${runde.gespielt} · die Walzen laufen …${e.multi > 1 ? ` (×${e.multi})` : ""}`;
    }

    await walzenLaufenLassen(zug.stopps);
    fensterBeschriften();

    // Gewinn: Der Lauflicht-Rahmen wird golden und bleibt es bis zum nächsten Dreh.
    if (e.summe > 0) fensterElement.classList.add("gewinn");
    // Beinahe-Gewinn? Nur lesen, nie verändern (Kommentar bei fastGewinnErmitteln).
    const fast = fastGewinnErmitteln(e.feld, e.liniengewinne, e.scatter);

    // Schritt a) normale Linienauswertung, dann Scatter
    await linienZeigen(e.liniengewinne);
    await scatterZeigen(e.scatter, zug.istFreispiel);
    const knappText = await knappZeigen(fast);
    // Schritt b) und c) Expansion mit Zusatzauswertung (nur Freispiele)
    if (e.expansion && e.expansion.ausgeloest) await expansionZeigen(e.expansion, e.multi);

    drehInfo.textContent =
      zugText(e) +
      (zug.neueFreispiele > 0 && zug.istFreispiel ? ` · +${zug.neueFreispiele} Freispiele!` : "") +
      (knappText ? ` ${knappText}` : "");
    gezeigterGewinn = runde.bisher; // jetzt darf der neue Stand sichtbar werden
    if (zug.istFreispiel) {
      bannerAktualisieren();
      freispielGewinnAnzeigen();
    }

    // Große Gewinne feiern (ab x5 vom Gesamteinsatz, siehe assets/gewinnfeier.js): pro Spielzug die
    // Auszahlung dieses Zugs inklusive Expansion. Ein Klick überspringt die Feier. Das Ergebnis steht
    // längst fest und steckt in der Runde, die Feier zeigt es nur an.
    const gezeigt = await feiern({ betrag: e.summe, einsatz: runde.einsatz });
    hoechsteStufe = Math.max(hoechsteStufe, gezeigt);
    return zug;
  }

  /** Das Ziehen des Spezialsymbols: kurzes "Durchmischen" im Banner, dann steht es fest. */
  async function spezialsymbolZiehen() {
    if (!bewegungReduziert()) {
      for (let i = 0; i < 12; i++) {
        bannerSymbolSetzen(SYMBOLE[Math.floor(Math.random() * SYMBOLE.length)]);
        await warte(80 + i * 14);
      }
    }
    bannerSymbolSetzen(runde.symbol);
    if (!bewegungReduziert()) animationNeuStarten(bannerSymbol, "blitz");
  }

  /** Einleitung nach dem auslösenden Dreh: Banner, Spezialsymbol ziehen, Hinweis. */
  async function freispieleEinleiten() {
    klang(klangGewinn, 2); // Freispiel-Start: der große Jingle (Stufe 2)
    hudFreispiele.textContent = String(runde.uebrig);
    bannerElement.hidden = false;
    buehneElement.classList.add("freispiel");
    bannerUebrig.textContent = String(runde.uebrig);
    bannerGewinn.textContent = zahlText(gezeigterGewinn);
    drehInfo.textContent = `${runde.uebrig} Freispiele! Das Spezialsymbol wird gezogen …`;
    await warte(bewegungReduziert() ? 200 : 900);
    await spezialsymbolZiehen();
    drehInfo.textContent = `Spezialsymbol: ${SYMBOL_NAMEN[runde.symbol]}. Es expandiert, wenn es mindestens zweimal erscheint.`;
    freispielGewinnAnzeigen();
    await warte(bewegungReduziert() ? 400 : 1800);
  }

  /** Spielt alle offenen Freispiele automatisch hintereinander ab. */
  async function freispieleAbspielen() {
    while (runde.uebrig > 0) {
      await warte(bewegungReduziert() ? 300 : 700);
      await spielzugAusfuehren();
    }
  }

  /** Rundenende: Geld gutschreiben, Ergebnis anzeigen, Topliste pflegen, Pleite prüfen. */
  async function rundeBeenden() {
    const einsatz = runde.einsatz;
    const auszahlung = runde.bisher;
    const hatteFreispiele = runde.gespielt > 0;
    const netto = auszahlung - einsatz;

    // Ende einer Freispiel-Serie: den GESAMTgewinn feiern, aber nur, wenn er eine höhere Stufe erreicht
    // als alles, was in dieser Runde schon einzeln gefeiert wurde.
    if (hatteFreispiele && stufeBestimmen(auszahlung, einsatz) > hoechsteStufe) {
      await feiern({ betrag: auszahlung, einsatz, zusatz: "FREISPIELE GESAMT" });
    }

    rundeAbrechnen();
    walletHudAktualisieren();
    ergebnisAnzeigen(netto);
    if (hatteFreispiele) {
      drehInfo.textContent = `Freispiele beendet: ${zahlText(auszahlung)} Gesamtauszahlung bei ${zahlText(einsatz)} Einsatz (Netto ${netto >= 0 ? "+" : "−"}${zahlText(Math.abs(netto))}).`;
    }
    freispielModusSetzen(false);
    runde = null;

    // Topliste: Runden ab der Mindesthöhe werden STILL eingetragen (zuletzt benutzte
    // Initialen), kein Dialog, keine Aufforderung. Die Gewinn-Anzeige feiert genug.
    if (netto >= MINDEST_NETTO_FUER_TOPLISTE && stillEintragen(SPIEL, netto) !== null) {
      seiteAktualisieren();
    }
    return { auszahlung, netto, freispiele: hatteFreispiele }; // für das Auto-Drehen
  }

  /** Gibt nach einer Runde den Fokus an den Knopf zurück und prüft auf Pleite. */
  function nachRunde(fokusWar) {
    steuerungAktualisieren();
    // Der Knopf war beim Sperren fokussiert und hat den Fokus verloren: Tastatur-Nutzer zurück an die Stelle holen
    if (
      fokusWar instanceof HTMLButtonElement &&
      document.activeElement === document.body &&
      !fokusWar.disabled
    ) {
      fokusWar.focus({ preventScroll: true });
    }
    if (!runde && istPleite(EINSATZSTUFEN[0])) pleiteDialogZeigen();
  }

  /** Ein bezahlter Dreh samt allen Freispielen daraus. */
  async function drehen() {
    if (laeuft || runde) return;
    const einsatz = wirksamerEinsatz();
    if (einsatz === 0 || !einsatzAbbuchen(einsatz)) return; // Konto reicht nicht: Dreh startet nicht

    laeuft = true;
    const fokusWar = document.activeElement;
    runde = { ...neueRunde(einsatz), abgerechnet: false };
    gezeigterGewinn = 0;
    hoechsteStufe = 0;
    walletHudAktualisieren(); // der Einsatz verschwindet sofort vom Konto
    steuerungAktualisieren();
    gewinnAnzeige.textContent = "";
    gewinnAnzeige.className = "gewinn-anzeige";
    drehInfo.textContent = "Die Walzen laufen …";
    let ende = null;
    try {
      await spielzugAusfuehren();
      if (runde.uebrig > 0) {
        await freispieleEinleiten();
        await freispieleAbspielen();
      }
      ende = await rundeBeenden();
    } finally {
      laeuft = false;
      nachRunde(fokusWar);
    }
    return ende ? { einsatz, ...ende } : null; // für das Auto-Drehen
  }

  /** Gesicherte Freispiele (nach Seitenwechsel) fortsetzen. */
  async function fortsetzen() {
    if (laeuft || !runde) return;
    laeuft = true;
    const fokusWar = document.activeElement;
    steuerungAktualisieren();
    try {
      await freispieleAbspielen();
      await rundeBeenden();
    } finally {
      laeuft = false;
      nachRunde(fokusWar);
    }
  }

  /** Der Hauptknopf (und die Leertaste) dreht – oder setzt gesicherte Freispiele fort. */
  function knopfAktion() {
    if (runde) fortsetzen();
    else drehen();
  }

  // ---------------------------------------------------------
  // Eingabe
  // ---------------------------------------------------------
  drehKnopf.addEventListener("click", knopfAktion);
  chipKnoepfe.forEach((chip) => {
    chip.addEventListener("click", (e) => {
      einsatzWaehlen(Number(chip.dataset.einsatz));
      // Mit Maus/Finger angeklickt (detail > 0): Fokus loslassen, damit die Leertaste danach
      // dreht. Per Tastatur ausgelöst (detail = 0) bleibt der Fokus auf dem Chip.
      if (e.detail > 0) chip.blur();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; // Browser-Kürzel nicht stören, Dauerdruck ignorieren
    if (document.querySelector("dialog[open]")) return; // Dialog offen -> Tasten gehören ihm
    const tag = e.target instanceof Element ? e.target.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === " ") {
      // Auf einem fokussierten Knopf/Link/Aufklapper macht die Leertaste schon etwas
      // (anklicken). Dort NICHT zusätzlich drehen, sonst würde es doppelt ausgelöst.
      if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return;
      e.preventDefault(); // Seite nicht scrollen
      if (autoDreh?.aktiv()) autoDreh.stoppen();
      else knopfAktion();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= EINSATZSTUFEN.length) {
      einsatzWaehlen(EINSATZSTUFEN[Number(e.key) - 1]); // Taste 1 = erster Chip, 2 = zweiter …
    }
  });

  // Reset 1: NUR die Tempelschatz-Topliste. entferne() löscht gezielt den Schlüssel "topliste";
  // spielZuruecksetzen("tempelschatz") wäre zu grob, es würde auch Einsatz und Freispiel-Stand löschen.
  resetKnopf.addEventListener("click", () => {
    if (laeuft) return;
    entferne(SPIEL, "topliste");
    seiteAktualisieren();
  });

  // Reset 2: Konto zurücksetzen mit Rückfrage (zweiter Klick innerhalb von 4 Sekunden).
  // Technisch derselbe Weg wie nach einer Pleite: pleiteNeustart() setzt das Konto auf
  // Startgeld, lässt die Rekorde stehen und erhöht den Pleiten-Zähler.
  let kontoResetBereit = false;
  let kontoResetTimer = 0;
  function kontoResetEntschaerfen() {
    kontoResetBereit = false;
    clearTimeout(kontoResetTimer);
    kontoResetKnopf.textContent = "Konto zurücksetzen";
  }
  kontoResetKnopf.addEventListener("click", () => {
    if (laeuft) return;
    if (!kontoResetBereit) {
      kontoResetBereit = true;
      kontoResetKnopf.textContent = "Wirklich zurücksetzen?";
      kontoResetTimer = setTimeout(kontoResetEntschaerfen, 4000);
      return;
    }
    kontoResetEntschaerfen();
    pleiteNeustart();
    walletHudAktualisieren();
    seiteAktualisieren();
    steuerungAktualisieren();
    drehInfo.textContent = `Konto zurückgesetzt auf ${zahlText(STARTGELD)}.`;
  });

  // ----- Start -----
  const kopfElement = document.querySelector(".spiel-kopf");
  if (kopfElement) tonKnopf(kopfElement); // Ton an/aus, gilt für alle Casino-Spiele
  walletHud(document.getElementById("wallet-hud"));
  baenderAufbauen();
  alleWalzenSetzen();
  tabellenAufbauen();
  liniengrafikenBauen(document.getElementById("linien-grafik"));

  // Gesicherte Freispiele aus einer früheren Sitzung? Dann setzen wir die Runde wieder auf.
  const gesichert = freispielStandPruefen(lade(SPIEL, "freispiele", null));
  if (gesichert) {
    runde = { ...gesichert, abgerechnet: false };
    gezeigterGewinn = runde.bisher;
    freispielModusSetzen(true);
    freispielGewinnAnzeigen();
    gezeigterMulti = runde.multi;
    bannerAktualisieren();
    drehInfo.textContent = `Gesicherte Freispiele warten: ${runde.uebrig} übrig, Spezialsymbol ${SYMBOL_NAMEN[runde.symbol]}, Multiplikator ×${runde.multi}.`;
  } else {
    entferne(SPIEL, "freispiele"); // ungültigen Rest aufräumen
  }

  autoDreh = autoDrehEinrichten({
    spiel: SPIEL,
    drehKnopf,
    drehen,
    bereit: () =>
      !laeuft &&
      runde === null &&
      wirksamerEinsatz() > 0 &&
      !document.querySelector("dialog[open]"),
    hatFreispiele: true,
    melden: (text) => {
      drehInfo.textContent = text;
    },
    beiAenderung: steuerungAktualisieren,
  });
  steuerungAktualisieren();
  seiteAktualisieren();
  if (!runde && istPleite(EINSATZSTUFEN[0])) pleiteDialogZeigen(); // z. B. nach Seitenwechsel mit leerem Konto
}

// Nur im Browser starten. In Node (Tests/Simulation) gibt es kein "document" –
// dort werden nur die reinen Funktionen oben importiert.
if (typeof document !== "undefined") {
  starteSpiel();
}
