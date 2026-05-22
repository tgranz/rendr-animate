import CtxMenu from '../ui/ctx-menu.js';
import bindCanvas from './canvas.js';

class Panels {
    constructor() {
        this.panel1 = document.getElementById('panel-1');
        this.panel2 = document.getElementById('panel-2');
        this.panel3 = document.getElementById('panel-3');

        this.panel1Selector = this.panel1.querySelector('.panel-selection');
        this.panel2Selector = this.panel2.querySelector('.panel-selection');
        this.panel3Selector = this.panel3.querySelector('.panel-selection');

        this.panel1Selector.addEventListener('click', () => this.selectPanel(this.panel1, this.panel1Selector));
        this.panel2Selector.addEventListener('click', () => this.selectPanel(this.panel2, this.panel2Selector));
        this.panel3Selector.addEventListener('click', () => this.selectPanel(this.panel3, this.panel3Selector));

        // Initial render
        this.renderPanel(this.panel1, this.panel1Selector, "Toolbox");
        this.renderPanel(this.panel2, this.panel2Selector, "Canvas");
        this.renderPanel(this.panel3, this.panel3Selector, "Preview");
    }

    selectPanel(panel, panelSelector) {
        const callBackFunct = (panel, selector, panelName) => this.renderPanel(panel, selector, panelName);

        new CtxMenu(panelSelector, [
            { label: 'Toolbox', iconClass: 'ti ti-pencil', onClick: () => callBackFunct(panel, panelSelector, "Toolbox") },
            { label: 'Canvas', iconClass: 'ti ti-rectangle', onClick: () => callBackFunct(panel, panelSelector, "Canvas") },
            { label: 'Layers', iconClass: 'ti ti-squares', onClick: () => callBackFunct(panel, panelSelector, "Layers") },
            { label: 'Frame Settings', iconClass: 'ti ti-settings-2', onClick: () => callBackFunct(panel, panelSelector, "Frame Settings") },
            { label: 'Preview', iconClass: 'ti ti-video', onClick: () => callBackFunct(panel, panelSelector, "Preview") },
        ]);
    }

    setPanelActions(panel, actions) {
        const actionContainer = panel.querySelector('.panel-actions');

        actionContainer.innerHTML = '';

        actions.forEach(action => {
            const button = document.createElement('button');
            button.innerHTML = `<i class="${action.iconClass}"></i>`;
            button.addEventListener('click', action.onClick);
            button.title = action.label;
            actionContainer.appendChild(button);
        });
    }

    renderPanel(panel, panelSelector, toRender, object = {}){
        const panelContentElement = panel.querySelector('.panel-content');
        const panelTitleElement = panelSelector.querySelector('.panel-title');

        if (panelTitleElement) {
            panelTitleElement.textContent = toRender;
        }

        switch(toRender) {
            case "Toolbox":
                panelContentElement.innerHTML = `
                    <div class="toolbox-wrapper">
                        <div class="tool">
                            <i class="ti ti-eraser"></i>
                            <p>Eraser</p>
                        </div>
                        <div class="tool selected">
                            <i class="ti ti-pencil"></i>
                            <p>Pen</p>
                        </div>
                    </div>
                `;
                break;
            case "Canvas":
                panelContentElement.innerHTML = ``;
                bindCanvas(panelContentElement);
                break;
            case "Layers":
                panelContentElement.innerHTML = `<h2>Coming soon</h2>`;
                break;
            case "Frame Settings":
                panelContentElement.innerHTML = ``;

                const holdFrames = window.sequence.getCurrentFrame()['holdFrames'];

                panelContentElement.innerHTML = `
                    <div style="display: flex; flex-direction: row; align-items: center; gap: 5px;">
                        <p>Hold for </p><input style="display: inline-block; color: black; width: 50px;" type="number" id="holdFrames" name="holdFrames" min="1" value="${holdFrames}"><p> frames</p>
                    </div>
                `;
                break;
            case "Preview":
                panelContentElement.innerHTML = `<div class="preview-container"><img class="preview"></div>`;
                const previewElement = panelContentElement.querySelector('.preview');
                window.composer.bindPreview(previewElement);
                break;
            default:
                panelContentElement.innerHTML = `<h2>${toRender}</h2><p>Content for ${toRender} goes here.</p>`;
        }
    }

    reRender(targetPanels, object = {}) {
        const panels = [this.panel1, this.panel2, this.panel3];
        const panelSelectors = [this.panel1Selector, this.panel2Selector, this.panel3Selector];
        let didRunARender = false;

        panelSelectors.forEach((selector, index) => {
            const titleElement = selector.querySelector('.panel-title');
            const currentPanelName = titleElement ? titleElement.textContent.trim() : '';

            if (currentPanelName === targetPanels) {
                this.renderPanel(panels[index], selector, targetPanels, object);
                didRunARender = true;
            }
        });

        if (!didRunARender) {
            window.setMessage(
                `No ${targetPanels} panel open.`,
                'exclamation-circle',
                '#ffaa00',
                5000
            );
        }
    }
}

export default Panels;