import bindCtxMenusToMenuOptions from "./app/menu-bar";
import bindHotkeyToCallback from "./app/hotkeys";
import initResizers from "./app/resizers";

import Panels from "./app/panels";
import Compose from "./backend/compose";
import Sequence from "./backend/sequence";
import TimelineUI from "./backend/timeline-ui";

window.addEventListener('DOMContentLoaded', () => {
    bindCtxMenusToMenuOptions();
    initResizers();

    window.composer = new Compose();
    window.panels = new Panels();
    window.sequence = new Sequence();
    window.timelineUI = new TimelineUI();

    bindHotkeyToCallback('arrowright', () => {
        window.sequence.nextFrame();
    });

    bindHotkeyToCallback('arrowleft', () => {
        window.sequence.previousFrame();
    });

    bindHotkeyToCallback('shift+n', () => {
        window.sequence.newFrame();
    });
});