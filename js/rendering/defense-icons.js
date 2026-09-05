"use strict";

// Small, dependency-free SVG emblems for the defense cards and inspect panel.
// Keeping these separate from the 3D renderer lets the battlefield use its
// original materials while the armory retains its newer illustrated icons.
const defenseIconPaths = {
  archer: '<path d="M12 5Q36 24 12 43L19 24Z"/><path d="M7 24H40M33 18L40 24 33 30"/>',
  mage: '<path d="M24 4 7 34H41ZM12 40H36M16 28 24 9 32 28"/><path d="m35 5 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"/>',
  ballista: '<path d="M7 12Q24 27 41 12M7 12 24 33 41 12M24 5V40M19 10 24 5 29 10M12 42 24 33 36 42"/>',
  barracks: '<path d="M8 40 37 6 42 6 42 11 13 44ZM7 31 20 42M7 6 12 6 41 40 36 44 7 11ZM28 42 41 31"/>',
  ogre: '<path d="m9 18 6-9 7 3 6-5 9 9 3 17-8 9H17L8 33ZM15 23 20 25M29 25 34 23M17 34H31M14 31 17 37M34 31 31 37"/>',
  ghost: '<path d="M8 42 11 18Q13 4 24 5T37 18L41 42 33 37 24 42 16 37ZM18 18V23M30 18V23M21 29Q24 26 27 29V34H21Z"/>',
  vampire: '<path d="M15 10 24 5 33 10 31 28 24 33 17 28ZM17 19H20M28 19H31M20 26 21 30M28 26 27 30M17 30 4 24 10 43H38L44 24 31 30"/>',
  ufo: '<ellipse cx="24" cy="28" rx="20" ry="8"/><path d="M13 24Q14 6 24 7T35 24M10 28H15M22 30H27M33 28H38M17 40 14 45M31 40 34 45"/>',
  castle: '<path d="M7 43V10H13V16H19V10H29V16H35V10H41V43ZM19 43V32Q24 24 29 32V43M14 23V27M34 23V27M24 10V3L34 6 24 9"/>',
  mine: '<path d="M5 40 11 15 24 6 37 15 43 40ZM16 40V26Q24 17 32 26V40M13 14 21 20M29 12 34 19"/><path d="m7 7 4 2-2 4-4-2Z"/>'
};

window.DefenseIcons = {
  icon(type) {
    return `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${defenseIconPaths[type] || ""}</svg>`;
  },
  apply() {
    document.querySelectorAll('.tower-card[data-tower]').forEach(card => {
      const icon = card.querySelector('.tower-emblem');
      if (icon && defenseIconPaths[card.dataset.tower]) icon.innerHTML = this.icon(card.dataset.tower);
    });
  }
};

window.DefenseIcons.apply();
