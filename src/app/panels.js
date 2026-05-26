import CtxMenu from '../ui/ctx-menu.js';

class Panels {
    constructor() {
        this.canvases = [];

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
        this.renderPanel(this.panel3, this.panel3Selector, "Project Settings");
    }

    selectPanel(panel, panelSelector) {
        const callBackFunct = (panel, selector, panelName) => this.renderPanel(panel, selector, panelName);

        new CtxMenu(panelSelector, [
            { label: 'Toolbox', iconClass: 'ti ti-pencil', onClick: () => callBackFunct(panel, panelSelector, "Toolbox") },
            { label: 'Canvas', iconClass: 'ti ti-rectangle', onClick: () => callBackFunct(panel, panelSelector, "Canvas") },
            { label: 'Layers', iconClass: 'ti ti-squares', onClick: () => callBackFunct(panel, panelSelector, "Layers") },
            { label: 'Frame Settings', iconClass: 'ti ti-settings-2', onClick: () => callBackFunct(panel, panelSelector, "Frame Settings") },
            { label: 'Project Settings', iconClass: 'ti ti-settings', onClick: () => callBackFunct(panel, panelSelector, "Project Settings") },
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
                const activeTool = window.canvasEngine.getActiveTool();

                panelContentElement.innerHTML = `
                    <div class="toolbox-wrapper">
                        <div class="tool ${activeTool === 'pen' ? 'selected' : ''}" id="penTool" onclick="window.canvasEngine.setTool('pen')">
                            <i class="ti ti-pencil"></i>
                            <p>Pen</p>
                        </div>
                        <div class="tool ${activeTool === 'fill' ? 'selected' : ''}" id="fillTool" onclick="window.canvasEngine.setTool('fill')">
                            <i class="ti ti-bucket-droplet"></i>
                            <p>Fill</p>
                        </div>
                        <div class="tool ${activeTool === 'rectangle' ? 'selected' : ''}" id="rectangleTool" onclick="window.canvasEngine.setTool('rectangle')">
                            <i class="ti ti-rectangle"></i>
                            <p>Rectangle Tool</p>
                        </div>
                        <div class="tool ${activeTool === 'circle' ? 'selected' : ''}" id="circleTool" onclick="window.canvasEngine.setTool('circle')">
                            <i class="ti ti-circle"></i>
                            <p>Circle Tool</p>
                        </div>
                    </div>

                    <div class="toolbox-properties">
                        <p style="margin-bottom: 4px; font-weight: bold; color: var(--text-dark); font-size: 14px; text-transform: uppercase;">${activeTool}</p>
                        <div class="color-pickers">
                            <div class="recent-colors-wrapper">
                                ${window.drawEngine.getRecentColors().map(color => `
                                    <div class="color-picker" style="background-color: ${color};" onclick="window.drawEngine.setDrawProps({ color: '${color}' })"></div>
                                `).join('')}
                            </div>
                            <input type="color" class="custom-color-picker" value="${window.drawEngine.getRecentColors()[0] || '#000000'}" onchange="window.drawEngine.setDrawProps({ color: this.value })">
                        </div>
                        <div class="line-width-wrapper" style="${activeTool === 'fill' ? 'display: none;' : ''}">
                            <p style="margin-bottom: 4px; font-weight: bold; color: var(--text-dark); font-size: 12px; text-transform: uppercase;">Line Width</p>
                            <input style="flex: 1;" type="range" min="1" max="100" value="${window.drawEngine.drawProps.lineWidth}" onchange="window.drawEngine.setDrawProps({ lineWidth: parseInt(this.value) })">
                        </div>
                        ${activeTool === 'rectangle' ? `
                            <div class="line-width-wrapper" style="${activeTool === 'fill' ? 'display: none;' : ''}">
                                <p style="margin-bottom: 4px; font-weight: bold; color: var(--text-dark); font-size: 12px; text-transform: uppercase;">Radius</p>
                                <input style="flex: 1;" type="range" min="1" max="100" value="${window.drawEngine.drawProps.radius}" onchange="window.drawEngine.setDrawProps({ radius: parseInt(this.value) })">
                            </div>`
                        : ''}
                    </div>
                `;
                break;
            case "Canvas":
                panelContentElement.innerHTML = ``;
                this.setPanelActions(panel, [
                    { label: 'Fullscreen', iconClass: 'ti ti-arrows-maximize', onClick: () => window.canvasEngine.toggleFullscreen(true) },
                ]);

                const canvasWrapper = document.createElement('div');
                canvasWrapper.classList.add('canvas-wrapper');
                panelContentElement.appendChild(canvasWrapper);
                window.canvasEngine.bindCanvas(canvasWrapper);
                break;
            case "Layers":
                panelContentElement.innerHTML = `<div class="layers-wrapper"></div><div class="layer-props"></div>`;
                this.setPanelActions(panel, [
                    { label: 'New Layer', iconClass: 'ti ti-plus', onClick: () => { window.drawEngine.addLayer() } },
                ]);

                window.drawEngine.getLayers().forEach((layer, index) => {
                    const layerElement = document.createElement('div');
                    layerElement.classList.add('layer-item');
                    if (layer.active) { layerElement.classList.add('active'); }
                    panelContentElement.querySelector('.layers-wrapper').appendChild(layerElement);

                    const layerName = document.createElement('p');
                    layerName.innerHTML = `${layer.active ? '<i class="ti ti-edit"></i>' : ''} ${layer.name}`;
                    layerElement.appendChild(layerName);
                    layerName.addEventListener('click', () => {
                        window.drawEngine.setActiveLayer(layer.name);
                    });

                    const layerToggles = document.createElement('div');
                    layerToggles.classList.add('layer-toggles');
                    layerElement.appendChild(layerToggles);

                    if (index !== 0) {
                        const moveUpButton = document.createElement('button');
                        moveUpButton.innerHTML = `<i class="ti ti-arrow-up"></i>`;
                        moveUpButton.title = 'Move Up';
                        moveUpButton.addEventListener('click', () => {
                            window.drawEngine.moveLayerUp(layer.name);
                        });
                        layerToggles.appendChild(moveUpButton);
                    }

                    if (index !== window.drawEngine.getLayers().length - 1) {
                        const moveDownButton = document.createElement('button');
                        moveDownButton.innerHTML = `<i class="ti ti-arrow-down"></i>`;
                        moveDownButton.title = 'Move Down';
                        moveDownButton.addEventListener('click', () => {
                            window.drawEngine.moveLayerDown(layer.name);
                        });
                        layerToggles.appendChild(moveDownButton);
                    }

                    const visibilityToggle = document.createElement('button');
                    visibilityToggle.innerHTML = `<i class="ti ti-eye${layer.visible ? '' : '-off'}"></i>`;
                    visibilityToggle.title = layer.visible ? 'Hide Layer' : 'Show Layer';
                    visibilityToggle.addEventListener('click', () => {
                        window.drawEngine.toggleLayerVisibility(layer.name);
                    });
                    layerToggles.appendChild(visibilityToggle);
                });

                const activeLayerObject = window.drawEngine.getActiveLayer();
                if (activeLayerObject) {
                    const layerPropsElement = panelContentElement.querySelector('.layer-props');
                    layerPropsElement.innerHTML = `
                        <div style="background: var(--background-color-1); padding: 8px; border-radius: var(--radius);">
                            <div style="display: flex; gap: 5px; flex-direction: row; justify-content: space-between; align-items: center;">
                                <p style="font-weight: bold;">${activeLayerObject.name}</p>
                                <div style="display: flex; gap: 5px; flex-direction: row;">
                                    <button id="renameLayerBtn"><i class="ti ti-pencil"></i></button>
                                    <button id="deleteLayerBtn"><i class="ti ti-trash"></i></button>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: row; gap: 10px; margin-top: 10px;">
                                <p style="font-weight: bold; color: var(--text-dark); font-size: 12px; text-transform: uppercase;">Opacity</p>
                                <input type="range" id="opacityRange" name="opacityRange" min="0" max="1" step="0.01" value="${activeLayerObject.opacity}" style="flex: 1;">
                            </div>
                            <div style="display: flex; flex-direction: row; gap: 10px; margin-top: 10px;">
                                <p style="font-weight: bold; color: var(--text-dark); font-size: 12px; text-transform: uppercase;">Blur</p>
                                <input type="range" id="blurRange" name="blurRange" min="0" max="1" step="0.01" value="${activeLayerObject.blur}" style="flex: 1;">
                            </div>
                        </div>
                    `;

                    const opacityRange = layerPropsElement.querySelector('#opacityRange');
                    opacityRange.addEventListener('input', () => {
                        window.drawEngine.setLayerOpacity(activeLayerObject.name, parseFloat(opacityRange.value));
                    });

                    const blurRange = layerPropsElement.querySelector('#blurRange');
                    blurRange.addEventListener('input', () => {
                        window.drawEngine.setLayerBlur(activeLayerObject.name, parseFloat(blurRange.value));
                    });

                    const renameButton = layerPropsElement.querySelector('#renameLayerBtn');
                    renameButton.addEventListener('click', () => {
                        const newName = prompt('Enter new layer name:', activeLayerObject.name);
                        if (newName) {
                            window.drawEngine.renameLayer(activeLayerObject.name, newName);
                        }
                    });

                    const deleteButton = layerPropsElement.querySelector('#deleteLayerBtn');
                    deleteButton.addEventListener('click', () => {
                        if (confirm(`Are you sure you want to delete the layer "${activeLayerObject.name}"?`)) {
                            window.drawEngine.deleteLayer(activeLayerObject.name);
                        }
                    });
                }

                break;
            case "Frame Settings":
                panelContentElement.innerHTML = ``;
                this.setPanelActions(panel, []);

                const holdFrames = window.sequence.getCurrentFrame()['holdFrames'];
                const currentFrameIndex = window.sequence.getCurrentFrameIndex();

                panelContentElement.innerHTML = `
                    <div style="display: flex; flex-direction: row; align-items: center; gap: 5px;">
                        <p>Hold for </p><input type="number" id="holdFrames" name="holdFrames" min="1" value="${holdFrames}" onchange="window.sequence.setFrameHold(${currentFrameIndex}, parseInt(this.value))"><p> frames</p>
                    </div>
                `;
                break;
            case "Preview":
                this.setPanelActions(panel, []);
                panelContentElement.innerHTML = `<div class="preview-container"><img class="preview"></div>`;
                const previewElement = panelContentElement.querySelector('.preview');
                window.composer.bindPreview(previewElement);
                break;
            case "Project Settings":
                this.setPanelActions(panel, []);
                panelContentElement.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 10px; padding: 8px;">
                        <div style="background: var(--background-color-1); padding: 8px; border-radius: var(--radius); border: 1px solid var(--primary-color); display: flex; flex-direction: column; gap: 10px;">
                            <p style="font-weight: bold;"><b style="color: var(--primary-color);">CHANGE THESE FIRST!</b> Changing these later will crop your drawings which may not achieve a desired effect.</p>
                            <div style="display: flex; flex-direction: row; align-items: center; gap: 5px;">
                                <p style="width: 100%;">Width:</p>
                                <input type="number" id="projectWidth" name="projectWidth" min="1" value="${window.sequence.width}" onchange="window.sequence.setProjectDimensions(parseInt(this.value), window.sequence.height)">
                                <p style="margin-left: 10px; font-size: 12px; color: var(--text-dark);">px</p>
                            </div>
                            <div style="display: flex; flex-direction: row; align-items: center; gap: 5px;">
                                <p style="width: 100%;">Height:</p>
                                <input type="number" id="projectHeight" name="projectHeight" min="1" value="${window.sequence.height}" onchange="window.sequence.setProjectDimensions(window.sequence.width, parseInt(this.value))">
                                <p style="margin-left: 10px; font-size: 12px; color: var(--text-dark);">px</p>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: row; align-items: center; gap: 5px;">
                            <p style="width: 100%;">Frame Rate:</p>
                            <input type="number" id="frameRate" name="frameRate" min="1" value="${window.sequence.frameRate}" onchange="window.sequence.setFrameRate(parseInt(this.value))">
                            <p style="margin-left: 10px; font-size: 12px; color: var(--text-dark);">fps</p>
                        </div>
                    </div>
                `;

                break;
            default:
                panelContentElement.innerHTML = `<h2>${toRender}</h2><p>Content for ${toRender} goes here.</p>`;
        }
    }

    reRender(targetPanels, object = {}) {
        if (targetPanels === 'Canvas') {
            window.canvasEngine.destroyAllCanvases();
        }

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
    }

    switchPanels(selects, replaceWith) {
        const panels = [this.panel1, this.panel2, this.panel3];
        const panelSelectors = [this.panel1Selector, this.panel2Selector, this.panel3Selector];

        panelSelectors.forEach((selector, index) => {
            const titleElement = selector.querySelector('.panel-title');
            const currentPanelName = titleElement ? titleElement.textContent.trim() : '';

            if (selects === currentPanelName) {
                this.renderPanel(panels[index], selector, replaceWith);
            }
        });
    }
}

export default Panels;