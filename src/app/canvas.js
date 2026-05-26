export default class Canvas {
    constructor() {
        this.canvases = [];

        window.addEventListener('mouseup', this.endStroke.bind(this));
        this.renderCanvas();
    }

    renderCanvas() {
        const frame = window.sequence.ensureFrame();
        if (this.canvases.length > 0) {
            window.drawEngine.drawFrame(frame);
        }
    }

    destroyAllCanvases() {
        this.canvases.forEach(({ canvas }) => {
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        });

        this.canvases = [];
        window.drawEngine.unlinkAllCanvases();
    }

    bindCanvas(container) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        canvas.className = 'drawing-canvas';
        canvas.width = window.sequence.width;
        canvas.height = window.sequence.height;

        window.drawEngine.setCtxProps(ctx, window.drawEngine.getDrawProps());
        this.attachPenListeners(canvas);

        container.appendChild(canvas);
        this.canvases.push({ canvas, ctx });
        window.drawEngine.linkCanvas({ canvas, ctx });
        window.drawEngine.drawFrame(window.sequence.ensureFrame(window.sequence.getCurrentFrameIndex()));
    }

    getCanvasPoint(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const isFullscreen = canvas.matches(':fullscreen');

        if (!isFullscreen) {
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            return {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY
            };
        }

        const canvasAspect = canvas.width / canvas.height;
        const rectAspect = rect.width / rect.height;
        let renderWidth = rect.width;
        let renderHeight = rect.height;
        let offsetX = 0;
        let offsetY = 0;

        if (rectAspect > canvasAspect) {
            renderWidth = rect.height * canvasAspect;
            offsetX = (rect.width - renderWidth) / 2;
        } else {
            renderHeight = rect.width / canvasAspect;
            offsetY = (rect.height - renderHeight) / 2;
        }

        const localX = event.clientX - rect.left - offsetX;
        const localY = event.clientY - rect.top - offsetY;

        if (localX < 0 || localY < 0 || localX > renderWidth || localY > renderHeight) {
            return null;
        }

        return {
            x: (localX / renderWidth) * canvas.width,
            y: (localY / renderHeight) * canvas.height
        };
    }

    getCanvasCtx() {
        if (this.canvases.length === 0) {
            return null;
        }

        return this.canvases[0].ctx;
    }

    setDrawProps(props) {
        window.drawEngine.setDrawProps(props);
    }

    setCtxProps(ctx, props) {
        window.drawEngine.setCtxProps(ctx, props);
    }

    setTool(tool) {
        window.drawEngine.setTool(tool);

        window.panels.reRender('Toolbox');
    }

    getActiveTool() {
        return window.drawEngine.getActiveTool();
    }

    attachPenListeners(canvas) {
        canvas.addEventListener('mousedown', (event) => {
            const point = this.getCanvasPoint(event, canvas);
            if (!point) {
                return;
            }

            window.drawEngine.beginStroke(point, canvas);
        });

        canvas.addEventListener('mousemove', (event) => {
            if (window.drawEngine.getActiveTool() === 'fill') {
                return;
            }

            const point = this.getCanvasPoint(event, canvas);
            if (!point) {
                return;
            }

            window.drawEngine.stroke(point, canvas);
        });

        canvas.addEventListener('mouseup', () => {
            this.endStroke();
        });
    }

    endStroke() {
        window.drawEngine.endStroke();
    }

    undo() {
        window.drawEngine.undo();
    }

    toggleFullscreen(enabled) {
        if (!enabled) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            return;
        }

        const primaryCanvas = this.canvases.length > 0 ? this.canvases[0].canvas : null;
        if (
            primaryCanvas &&
            primaryCanvas.requestFullscreen &&
            document.body.contains(primaryCanvas)
        ) {
            primaryCanvas.requestFullscreen().catch((err) => {
                // Optionally log or handle the error
                // console.warn('Fullscreen request failed:', err);
            });
        }
    }

    getThumbnail() {
        const primaryCanvasItem = this.canvases[0];
        if (!primaryCanvasItem) {
            return null;
        }

        const { canvas } = primaryCanvasItem;
        
        // Downscale to 240x135 for thumbnail
        const thumbWidth = 240;
        const thumbHeight = 135;
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = thumbWidth;
        tmpCanvas.height = thumbHeight;
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, thumbWidth, thumbHeight);
        return tmpCanvas.toDataURL('image/png');
    }

    getImage() {
        const primaryCanvasItem = this.canvases[0];
        if (!primaryCanvasItem) {
            return null;
        }

        const { canvas } = primaryCanvasItem;

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = canvas.width;
        tmpCanvas.height = canvas.height;
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        return tmpCanvas.toDataURL('image/png');
    }

    resizeCanvases(width, height) {
        this.canvases.forEach(({ canvas }) => {
            canvas.width = width;
            canvas.height = height;
        });
        
        window.drawEngine.drawFrame(window.sequence.ensureFrame(window.sequence.getCurrentFrameIndex()));
    }
}
