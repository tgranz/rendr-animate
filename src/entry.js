import bindCtxMenusToMenuOptions from "./app/menu-bar";
import bindHotkeyToCallback from "./app/hotkeys";
import initResizers from "./app/resizers";

import Panels from "./app/panels";
import Compose from "./backend/compose";
import Sequence from "./backend/sequence";
import TimelineUI from "./backend/timeline-ui";
import Canvas from "./app/canvas";
import Draw from "./backend/draw";

window.addEventListener('DOMContentLoaded', () => {
    bindCtxMenusToMenuOptions();
    initResizers();

    window.composer = new Compose();
    window.sequence = new Sequence();
    window.drawEngine = new Draw();
    window.canvasEngine = new Canvas();
    window.panels = new Panels();
    window.timelineUI = new TimelineUI();

    bindHotkeyToCallback('space', () => {
        window.timelineUI.togglePlayPause();
    });

    bindHotkeyToCallback('arrowright', () => {
        window.sequence.nextFrame();
    });

    bindHotkeyToCallback('arrowleft', () => {
        window.sequence.previousFrame();
    });

    bindHotkeyToCallback('shift+n', () => {
        window.sequence.newFrame();
    });

    bindHotkeyToCallback('shift+d', () => {
        window.sequence.duplicateFrame(window.sequence.getCurrentFrameIndex());
    });

    bindHotkeyToCallback('shift+z', () => {
        window.canvasEngine.undo();
    });
});