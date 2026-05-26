import CtxMenu from '../ui/ctx-menu.js';

export default function bindCtxMenusToMenuOptions() {

    /*const app = document.getElementById('menu-app')
    app.addEventListener('click', (event) => {
        const menu = new CtxMenu(app, [
                { label: 'Settings', iconClass: 'ti ti-settings', onClick: () => {} },
            ],
        );
    });*/

    
    const file = document.getElementById('menu-file')
    file.addEventListener('click', (event) => {
        const menu = new CtxMenu(file, [
                { label: 'Save Project', iconClass: 'ti ti-device-floppy', onClick: () => {
                    window.sequence.saveProjectToLocalStorage();
                } },
                { label: 'New Project', iconClass: 'ti ti-file-plus', onClick: () => {
                    if (confirm('Start new project? If you have not exported your project first, all progress will be lost.')) {
                        localStorage.setItem('rendr-animate-project', '');
                        window.doNotSaveToLocalStorage = true;
                        window.location.reload();
                    }
                } },
                { spacer: true },
                { label: 'Export Project', iconClass: 'ti ti-download', onClick: () => {
                    window.sequence.exportProject();
                } },
                { label: 'Import Project', iconClass: 'ti ti-upload', onClick: () => {
                    window.sequence.askImportProject();
                } },
                { spacer: true },
                { label: 'Render Animation', iconClass: 'ti ti-video', onClick: () => {} },
            ],
        );
    });

    /*
    const edit = document.getElementById('menu-edit')
    edit.addEventListener('click', (event) => {
        const menu = new CtxMenu(edit, [
                { label: 'Undo', iconClass: 'ti ti-arrow-back-up' },
                { label: 'Redo', iconClass: 'ti ti-arrow-forward-up' },
                { label: 'Cut', iconClass: 'ti ti-scissors' },
                { label: 'Copy', iconClass: 'ti ti-copy' },
                { label: 'Paste', iconClass: 'ti ti-clipboard' },
            ],
        );
    });

    const view = document.getElementById('menu-view')
    view.addEventListener('click', (event) => {
        const menu = new CtxMenu(view, [
                { label: 'Zoom In', iconClass: 'ti ti-zoom-in' },
                { label: 'Zoom Out', iconClass: 'ti ti-zoom-out' },
                { label: 'Reset Zoom', iconClass: 'ti ti-zoom-reset' },
            ],
        );
    });*/

    const help = document.getElementById('menu-help')
    help.addEventListener('click', (event) => {
        const menu = new CtxMenu(help, [
                { label: 'Source Code', iconClass: 'ti ti-code', onClick: () => window.open('https://github.com/tgranz/rendr-animate', '_blank') },
                { label: 'Report an Issue', iconClass: 'ti ti-bug', onClick: () => window.open('https://github.com/tgranz/rendr-animate/issues', '_blank') },
            ],
        );
    });
}