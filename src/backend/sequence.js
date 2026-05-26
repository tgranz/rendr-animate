export default class Sequence {
    constructor() {
        this.frames = [];
        this.frameRate = 8;
        this.width = 1920;
        this.height = 1080;
        this.currentFrame = 0;
        this.projectName = "New Project";
        this.projectNameElement = document.getElementById('project-name');

        this.projectNameElement.addEventListener('click', (e) => {
            const newName = prompt('Name this project:', this.projectName);
            if (newName !== null) {
                this.changeProjectName(newName.trim() === '' ? 'Untitled Project' : newName.trim());
            }
        });

        this.changeProjectName(this.projectName);

        // See if there's a saved project in localStorage and load it
        const savedProject = localStorage.getItem('rendr-animate-project');
        if (savedProject) {
            try {
                const projectData = JSON.parse(savedProject);
                this.importProject(projectData);
                this.changeProjectName(projectData.projectName || "New Project");
                console.log('Loaded saved project from localStorage');
            } catch (e) {
                console.warn('Failed to load saved project:', e);
                this.newFrame(); // Start with a default frame if loading fails
            }
        } else {
            this.newFrame(); // Start with a default frame if no saved project
        }

        document.addEventListener('canvasChanged', () => {
            const thumbnail = window.canvasEngine?.getThumbnail?.() ?? null;
            if (this.frames.length > 0) {
                this.setFrameThumbnail(this.currentFrame, thumbnail);
            }

            const image = window.canvasEngine?.getImage?.() ?? null;
            if (this.frames.length > 0) {
                this.setFrameImage(this.currentFrame, image);
            }
        });

        // Save project to localStorage before the page unloads
        window.addEventListener('beforeunload', () => {
            if (!window.doNotSaveToLocalStorage) {
                this.saveProjectToLocalStorage();
            }
        });
    }

    changeProjectName(projectName) {
        this.projectName = projectName;
        if (this.projectNameElement) {
            this.projectNameElement.textContent = projectName;
        }
    }

    saveProjectToLocalStorage() {
        localStorage.setItem('rendr-animate-project', JSON.stringify(this.buildProjectData()));
        console.log('Project saved to localStorage');
    }

    setFrameThumbnail(index, thumbnail) {
        const frame = this.getFrame(index);
        frame.thumbnail = thumbnail;
        document.dispatchEvent(new CustomEvent('sequenceChanged'));
        this.saveProjectToLocalStorage();
    }

    ensureFrame(index = this.currentFrame) {
        if (index < 0) {
            throw new Error('Frame index out of bounds');
        }

        while (this.frames.length <= index) {
            this.newFrame();
        }

        return this.frames[index];
    }

    newFrame() {
        const newFrame = {
            image: null,
            thumbnail: null,
            drawing: [
                {
                    name: 'Layer 1',
                    visible: true,
                    active: true,
                    opacity: 1,
                    blur: 0,
                    data: []
                }
            ],
            holdFrames: 1, // Number of frames this image appears on
        };

        // Add new frame to the sequence after the current frame
        this.frames.splice(this.currentFrame + 1, 0, newFrame);
        document.dispatchEvent(new CustomEvent('sequenceChanged'));

        // Set this new frame as the current frame
        try { this.setCurrentFrame(this.getCurrentFrameIndex() + 1); } catch (e) {}
    }

    _cloneDrawingLayers(drawing) {
        if (!Array.isArray(drawing)) {
            return [
                {
                    name: 'Layer 1',
                    visible: true,
                    active: true,
                    opacity: 1,
                    blur: 0,
                    data: []
                }
            ];
        }

        const looksLikeLayerList = drawing.every(layer => layer && typeof layer === 'object' && 'data' in layer);
        if (!looksLikeLayerList) {
            return [
                {
                    name: 'Layer 1',
                    visible: true,
                    active: true,
                    opacity: 1,
                    blur: 0,
                    data: [...drawing]
                }
            ];
        }

        const clonedLayers = drawing.map((layer, index) => ({
            name: typeof layer.name === 'string' && layer.name.length > 0 ? layer.name : `Layer ${index + 1}`,
            visible: typeof layer.visible === 'boolean' ? layer.visible : true,
            active: Boolean(layer.active),
            opacity: Math.max(0, Math.min(1, Number.isFinite(layer.opacity) ? layer.opacity : 1)),
            blur: Math.max(0, Number.isFinite(layer.blur) ? layer.blur : 0),
            data: Array.isArray(layer.data) ? [...layer.data] : []
        }));

        let firstActiveIndex = clonedLayers.findIndex(layer => layer.active);
        if (firstActiveIndex === -1) {
            firstActiveIndex = 0;
        }

        return clonedLayers.map((layer, index) => ({
            ...layer,
            active: index === firstActiveIndex
        }));
    }

    setDrawData(frameIndex, drawingLayers) {
        const frame = this.getFrame(frameIndex);
        frame.drawing = this._cloneDrawingLayers(drawingLayers);
        document.dispatchEvent(new CustomEvent('sequenceChanged'));
    }

    duplicateFrame(index) {
        const frameToDuplicate = this.getFrame(index);
        const duplicatedFrame = {
            image: frameToDuplicate.image,
            thumbnail: frameToDuplicate.thumbnail,
            drawing: this._cloneDrawingLayers(frameToDuplicate.drawing),
            holdFrames: frameToDuplicate.holdFrames
        };

        this.frames.splice(index + 1, 0, duplicatedFrame);
        document.dispatchEvent(new CustomEvent('sequenceChanged'));

        this.setCurrentFrame(this.getCurrentFrameIndex() + 1);
    }

    getFrame(index) {
        if (index < 0 || index >= this.frames.length) {
            throw new Error('Frame index out of bounds');
        }

        return this.frames[index];
    }

    setFrameImage(index, image) {
        const frame = this.getFrame(index);
        frame.image = image;
        document.dispatchEvent(new CustomEvent('sequenceChanged'));
    }

    setFrameRender(index, image, thumbnail) {
        const frame = this.getFrame(index);
        frame.image = image;
        frame.thumbnail = thumbnail;
        document.dispatchEvent(new CustomEvent('sequenceChanged'));
    }

    setFrameDrawing(index, drawing) {
        const frame = this.getFrame(index);
        frame.drawing = this._cloneDrawingLayers(drawing);
        document.dispatchEvent(new CustomEvent('sequenceChanged'));
    }

    setFrameHold(index, holdFrames) {
        const frame = this.getFrame(index);
        frame.holdFrames = holdFrames;
        document.dispatchEvent(new CustomEvent('sequenceChanged'));
    }
    
    deleteFrame(index) {
        if (index < 0 || index >= this.frames.length) {
            throw new Error('Frame index out of bounds');
        }

        this.frames.splice(index, 1);

        if (this.frames.length === 0) {
            this.currentFrame = 0;
        } else if (this.currentFrame >= this.frames.length) {
            this.currentFrame = this.frames.length - 1;
        }

        document.dispatchEvent(new CustomEvent('sequenceChanged'));
    }

    setFrameRate(frameRate) {
        if (frameRate <= 0 || frameRate > 60) {
            throw new Error('Frame rate out of bounds');
        }

        this.frameRate = frameRate;
    }

    setProjectDimensions(width, height) {
        if (width <= 0 || height <= 0) {
            throw new Error('Invalid project dimensions');
        }

        this.width = width;
        this.height = height;
        document.dispatchEvent(new CustomEvent('sequenceChanged'));

        window.canvasEngine.resizeCanvases(width, height);
    }

    getCurrentFrame() {
        return this.frames[this.currentFrame];
    }

    getCurrentFrameIndex() {
        return this.currentFrame;
    }

    setCurrentFrame(index) {
        if (index < 0 || index >= this.frames.length) {
            throw new Error('Frame index out of bounds');
        }

        this.currentFrame = index;
        document.dispatchEvent(new CustomEvent('sequenceChanged'));
        window.panels.reRender('Frame Settings');
        window.panels.reRender('Layers');

        window.composer.renderPreviews();
    }

    nextFrame() {
        if (this.currentFrame < this.frames.length - 1) {
            this.setCurrentFrame(this.currentFrame + 1);
            window.composer.renderPreviews();
        }
    }

    previousFrame() {
        if (this.currentFrame > 0) {
            this.setCurrentFrame(this.currentFrame - 1);
            window.composer.renderPreviews();
        }
    }

    buildProjectData() {
        return {
            projectName: this.projectName,
            frames: this.frames,
            frameRate: this.frameRate,
            width: this.width,
            height: this.height
        };
    }

    exportProject() {
        const projectData = this.buildProjectData();
        projectData.projectName = this.projectName;

        const dl = document.createElement('a');
        dl.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(projectData)));
        dl.setAttribute('download', this.projectName + '.rap');
        dl.style.display = 'none';
        document.body.appendChild(dl);
        dl.click();
        document.body.removeChild(dl);
    }

    importProject(projectData) {
        if (!projectData || typeof projectData !== 'object') {
            throw new Error('Invalid project data');
        }

        this.frames = Array.isArray(projectData.frames) ? projectData.frames : [];
        this.frameRate = typeof projectData.frameRate === 'number' ? projectData.frameRate : 8;
        this.width = typeof projectData.width === 'number' ? projectData.width : 1920;
        this.height = typeof projectData.height === 'number' ? projectData.height : 1080;
        this.currentFrame = 0;
        this.changeProjectName(projectData.projectName || "New Project");
        document.dispatchEvent(new CustomEvent('sequenceChanged'));
    }

    askImportProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.rap';
        input.style.display = 'none';

        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const projectData = JSON.parse(e.target.result);
                    this.importProject(projectData);
                    this.saveProjectToLocalStorage();
                    console.log('Project imported from file successfully');
                } catch (error) {
                    console.error('Failed to import project:', error);
                }
            };
            reader.readAsText(file);
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
}