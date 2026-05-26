export default class Draw {
    constructor() {
        this.isDrawing = false;
        this.activeCanvas = null;
        this.currentStroke = null;
        this.layers = this._createDefaultLayers();
        this.drawData = this.layers[0].data;
        this.tool = 'pen';
        this.drawProps = {
            color: '#000000',
            lineWidth: 5,
            lineCap: 'round',
            radius: 10
        };

        this.recentColors = ['#000000', '#000000', '#000000', '#000000', '#000000'];
        this.canvases = [];
        
        document.addEventListener('sequenceChanged', () => {
            if (!window.isPlaying) {
                this.drawFrame(window.sequence.getCurrentFrame());
            }
        });
    }

    _createDefaultLayers() {
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

    moveLayerUp(layerName) {
        const index = this.layers.findIndex(layer => layer.name === layerName);
        if (index > 0) {
            [this.layers[index - 1], this.layers[index]] = [this.layers[index], this.layers[index - 1]];
            window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
            this.drawFrame(window.sequence.getCurrentFrame());
            document.dispatchEvent(new CustomEvent('canvasChanged'));
            window.panels.reRender("Layers");
        }
    }

    moveLayerDown(layerName) {
        const index = this.layers.findIndex(layer => layer.name === layerName);
        if (index !== -1 && index < this.layers.length - 1) {
            [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
            window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
            this.drawFrame(window.sequence.getCurrentFrame());
            document.dispatchEvent(new CustomEvent('canvasChanged'));
            window.panels.reRender("Layers");
        }
    }

    getLayers() {
        return this.layers.map(layer => ({
            name: layer.name,
            active: layer.active,
            visible: layer.visible,
            opacity: layer.opacity,
            blur: layer.blur
        }));
    }

    addLayer() {
        const newLayerIndex = this.layers.length + 1;
        this.layers.push({
            name: `Layer ${newLayerIndex}`,
            visible: true,
            active: false,
            opacity: 1,
            blur: 0,
            data: []
        });

        window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());

        document.dispatchEvent(new CustomEvent('canvasChanged'));
        window.panels.reRender("Layers");
    }

    renameLayer(currentName, newName) {
        if (this.layers.find(layer => layer.name === newName)) {
            throw new Error(`Layer with name "${newName}" already exists.`);
        }

        const layer = this.layers.find(layer => layer.name === currentName);
        if (layer) {
            layer.name = newName;
            window.panels.reRender("Layers");
        }
    }

    toggleLayerVisibility(layerName) {
        const layer = this.layers.find(layer => layer.name === layerName);
        if (layer) {
            layer.visible = !layer.visible;
            window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
            this.drawFrame(window.sequence.getCurrentFrame());
            document.dispatchEvent(new CustomEvent('canvasChanged'));
            window.panels.reRender("Layers");
        }
    }

    setActiveLayer(layerName) {
        let found = false;
        this.layers.forEach(layer => {
            if (layer.name === layerName) {
                layer.active = true;
                found = true;
            } else {
                layer.active = false;
            }
        });

        if (found) {
            this.drawData = this._primaryLayerData();
            window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
            this.drawFrame(window.sequence.getCurrentFrame());
            document.dispatchEvent(new CustomEvent('canvasChanged'));
            window.panels.reRender("Layers");
        }
    }

    setLayerOpacity(layerName, opacity) {
        const layer = this.layers.find(item => item.name === layerName);
        if (!layer) {
            return;
        }

        const normalizedOpacity = Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 1));
        layer.opacity = normalizedOpacity;

        window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
        this.drawFrame(window.sequence.getCurrentFrame());
        document.dispatchEvent(new CustomEvent('canvasChanged'));
        window.panels.reRender('Layers');
    }

    setLayerBlur(layerName, blur) {
        const layer = this.layers.find(item => item.name === layerName);
        if (!layer) {
            return;
        }

        const normalizedBlur = Math.max(0, Number.isFinite(blur) ? blur : 0);
        layer.blur = normalizedBlur;

        window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
        document.dispatchEvent(new CustomEvent('canvasChanged'));
        window.panels.reRender('Layers');
    }

    getActiveLayer() {
        return this.layers.find(layer => layer.active);
    }

    deleteLayer(layerName) {
        const index = this.layers.findIndex(layer => layer.name === layerName);

        if (index !== -1) {
            const wasActive = this.layers[index].active;
            this.layers.splice(index, 1);
            if (wasActive && this.layers.length > 0) {
                this.layers[0].active = true;
            }
            window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
            this.drawFrame(window.sequence.getCurrentFrame());
            document.dispatchEvent(new CustomEvent('canvasChanged'));
            window.panels.reRender("Layers");
        }
    }

    _normalizeLayers(drawing) {
        if (!Array.isArray(drawing) || drawing.length === 0) {
            return this._createDefaultLayers();
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

        const normalizedLayers = drawing.map((layer, index) => ({
            name: typeof layer.name === 'string' && layer.name.length > 0 ? layer.name : `Layer ${index + 1}`,
            visible: typeof layer.visible === 'boolean' ? layer.visible : true,
            active: Boolean(layer.active),
            opacity: Math.max(0, Math.min(1, Number.isFinite(layer.opacity) ? layer.opacity : 1)),
            blur: Math.max(0, Number.isFinite(layer.blur) ? layer.blur : 0),
            data: Array.isArray(layer.data) ? [...layer.data] : []
        }));

        let firstActiveIndex = normalizedLayers.findIndex(layer => layer.active);
        if (firstActiveIndex === -1) {
            firstActiveIndex = 0;
        }

        return normalizedLayers.map((layer, index) => ({
            ...layer,
            active: index === firstActiveIndex
        }));
    }

    _cloneLayers() {
        return this.layers.map((layer, index) => ({
            name: typeof layer.name === 'string' && layer.name.length > 0 ? layer.name : `Layer ${index + 1}`,
            visible: typeof layer.visible === 'boolean' ? layer.visible : true,
            active: Boolean(layer.active),
            opacity: Math.max(0, Math.min(1, Number.isFinite(layer.opacity) ? layer.opacity : 1)),
            blur: Math.max(0, Number.isFinite(layer.blur) ? layer.blur : 0),
            data: Array.isArray(layer.data) ? [...layer.data] : []
        }));
    }

    _primaryLayerData() {
        if (!Array.isArray(this.layers) || this.layers.length === 0) {
            this.layers = this._createDefaultLayers();
        }

        let firstActiveIndex = this.layers.findIndex(layer => layer?.active);
        if (firstActiveIndex === -1) {
            firstActiveIndex = 0;
        }

        this.layers = this.layers.map((layer, index) => ({
            ...layer,
            visible: typeof layer.visible === 'boolean' ? layer.visible : true,
            active: index === firstActiveIndex,
            opacity: Math.max(0, Math.min(1, Number.isFinite(layer.opacity) ? layer.opacity : 1)),
            blur: Math.max(0, Number.isFinite(layer.blur) ? layer.blur : 0)
        }));

        const activeLayer = this.layers[firstActiveIndex] || this.layers[0];

        if (!Array.isArray(activeLayer.data)) {
            activeLayer.data = [];
        }

        return activeLayer.data;
    }

    linkCanvas(canvasItem) {
        this.canvases.push(canvasItem);
    }

    unlinkCanvas(canvasElement) {
        this.canvases = this.canvases.filter(({ canvas }) => canvas !== canvasElement);
    }

    unlinkAllCanvases() {
        this.canvases = [];
        this.activeCanvas = null;
        this.isDrawing = false;
    }

    getDrawProps() {
        return this.drawProps;
    }

    setCtxProps(ctx, props) {
        if (props.color) {
            ctx.strokeStyle = props.color;
        }

        if (props.lineCap) {
            ctx.lineCap = props.lineCap;
        }

        if (props.lineWidth) {
            ctx.lineWidth = props.lineWidth;
        }
    }

    _resetCanvases(dispatchCanvasChanged = true) {
        this.canvases.forEach(({ canvas, ctx }) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            this.setCtxProps(ctx, this.drawProps);
        });

        if (dispatchCanvasChanged) {
            document.dispatchEvent(new CustomEvent('canvasChanged'));
        }
    }

    setDrawProps(props, logRecentColor = true) {
        this.drawProps = {
            ...this.drawProps,
            ...props
        };

        if (logRecentColor && props.color && typeof props.color === 'string') {
            const normalizedColor = props.color.trim().toLowerCase();
            if (!this.recentColors.includes(normalizedColor)) {
                this.recentColors.unshift(normalizedColor);
                if (this.recentColors.length > 5) {
                    this.recentColors.pop();
                }
                window.panels.reRender("Toolbox");
            }
        }

        // Stroke width preview circle logic
        if (props.lineWidth && typeof props.lineWidth === 'number') {
            if (this._strokePreviewTimeout) {
                clearTimeout(this._strokePreviewTimeout);
                this._strokePreviewTimeout = null;
            }
            // Remove any existing preview
            this._clearStrokePreview();

            this.canvases.forEach(({ canvas, ctx }) => {
                // Calculate preview circle size (scaled to canvas)
                const previewRadius = Math.max(2, props.lineWidth / 2);
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                // Save state
                ctx.save();
                // Draw preview circle
                ctx.beginPath();
                ctx.arc(centerX, centerY, previewRadius, 0, 2 * Math.PI);
                ctx.fillStyle = props.color || this.drawProps.color || '#000';
                ctx.fill();
                ctx.strokeStyle = props.color || this.drawProps.color || '#000';
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.lineWidth = 0;
                ctx.restore();
            });

            // Set up removal after 1 second
            this._strokePreviewTimeout = setTimeout(() => {
                this._clearStrokePreview();
                this._strokePreviewTimeout = null;
            }, 1000);
        }

        this.canvases.forEach(({ ctx }) => {
            this.setCtxProps(ctx, this.drawProps);
        });
    }

    // Helper to clear the preview circle by redrawing the frame
    _clearStrokePreview() {
        if (!this.canvases || this.canvases.length === 0) return;
        // Redraw the current frame to clear overlays
        if (window.sequence && typeof window.sequence.getCurrentFrame === 'function') {
            this.drawFrame(window.sequence.getCurrentFrame());
        }
    }

    setTool(tool) {
        this.tool = tool;
        // Accept new tools
        switch (tool) {
            case 'pen':
            case 'fill':
            case 'rectangle':
            case 'circle':
                break;
            default:
                console.warn(`Unknown tool: ${tool}`);
        }
    }

    getRecentColors() {
        return this.recentColors;
    }

    getActiveTool() {
        return this.tool;
    }

    beginStroke(point, sourceCanvas) {
        if (this.tool === 'fill') {
            this.fillAt(point);
            return;
        }

        this.isDrawing = true;
        this.activeCanvas = sourceCanvas;
        if (this.tool === 'rectangle') {
            this.currentStroke = {
                type: 'rectangle',
                color: this.drawProps.color,
                lineWidth: this.drawProps.lineWidth,
                lineCap: this.drawProps.lineCap,
                start: { x: point.x, y: point.y },
                end: { x: point.x, y: point.y },
                radius: this.drawProps.radius
            };
        } else if (this.tool === 'circle') {
            this.currentStroke = {
                type: 'circle',
                color: this.drawProps.color,
                lineWidth: this.drawProps.lineWidth,
                lineCap: this.drawProps.lineCap,
                center: { x: point.x, y: point.y },
                radius: 0,
                edge: { x: point.x, y: point.y }
            };
        } else {
            this.currentStroke = {
                color: this.drawProps.color,
                lineWidth: this.drawProps.lineWidth,
                lineCap: this.drawProps.lineCap,
                points: [{ x: point.x, y: point.y }]
            };
        }

        this.canvases.forEach(({ ctx }) => {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
        });
    }

    stroke(point, sourceCanvas) {
        if (this.tool === 'fill') {
            return;
        }

        if (!this.isDrawing || this.activeCanvas !== sourceCanvas) {
            return;
        }

        if (this.tool === 'rectangle' && this.currentStroke) {
            this.currentStroke.end = { x: point.x, y: point.y };
            // Optionally, allow dynamic radius with shift/alt key or UI
        } else if (this.tool === 'circle' && this.currentStroke) {
            this.currentStroke.edge = { x: point.x, y: point.y };
            const dx = point.x - this.currentStroke.center.x;
            const dy = point.y - this.currentStroke.center.y;
            this.currentStroke.radius = Math.sqrt(dx * dx + dy * dy);
        } else if (this.currentStroke && Array.isArray(this.currentStroke.points)) {
            this.currentStroke.points.push({ x: point.x, y: point.y });
        }

        // Draw preview for rectangle/circle
        this.canvases.forEach(({ ctx }) => {
            // Redraw frame to clear previous preview
            if (this.tool === 'rectangle' || this.tool === 'circle') {
                if (window.sequence && typeof window.sequence.getCurrentFrame === 'function') {
                    this.drawFrame(window.sequence.getCurrentFrame());
                }
                ctx.save();
                ctx.strokeStyle = this.drawProps.color;
                ctx.lineWidth = this.drawProps.lineWidth;
                ctx.lineCap = this.drawProps.lineCap;
                ctx.globalAlpha = 0.7;
                if (this.tool === 'rectangle' && this.currentStroke) {
                    const { start, end, radius } = this.currentStroke;
                    const x = start.x;
                    const y = start.y;
                    const w = end.x - start.x;
                    const h = end.y - start.y;
                    this._drawRoundRect(ctx, x, y, w, h, radius || 0);
                } else if (this.tool === 'circle' && this.currentStroke) {
                    const { center, radius } = this.currentStroke;
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1.0;
                ctx.restore();
                return;
            }
            // ...existing code for pen smoothing...
            const pts = this.currentStroke.points;
            if (pts.length < 3) {
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
                return;
            }
            const len = pts.length;
            const p0 = pts[len - 3];
            const p1 = pts[len - 2];
            const p2 = pts[len - 1];
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = this.drawProps.lineWidth + 2;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
            ctx.restore();
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
            ctx.stroke();
        });
    }

    endStroke() {
        if (this.tool === 'fill') {
            return;
        }

        if (!this.isDrawing) {
            return;
        }

        this.isDrawing = false;
        this.activeCanvas = null;

        if (!this.currentStroke) {
            this.currentStroke = null;
            return;
        }

        const layerData = this._primaryLayerData();
        if (this.tool === 'rectangle') {
            const { color, lineWidth, lineCap, start, end, radius } = this.currentStroke;
            if (start && end && (start.x !== end.x || start.y !== end.y)) {
                layerData.push({
                    type: 'rectangle',
                    color,
                    lineWidth,
                    lineCap,
                    start: { ...start },
                    end: { ...end },
                    radius: typeof radius === 'number' ? radius : this.drawProps.radius
                });
            }
        } else if (this.tool === 'circle') {
            const { color, lineWidth, lineCap, center, radius } = this.currentStroke;
            if (center && radius > 0) {
                layerData.push({
                    type: 'circle',
                    color,
                    lineWidth,
                    lineCap,
                    center: { ...center },
                    radius
                });
            }
        } else if (Array.isArray(this.currentStroke.points) && this.currentStroke.points.length >= 2) {
            layerData.push({
                color: this.currentStroke.color,
                lineWidth: this.currentStroke.lineWidth,
                lineCap: this.currentStroke.lineCap,
                points: [...this.currentStroke.points]
            });
        }
        this.drawData = layerData;
        this.currentStroke = null;

        window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
        this.drawFrame(window.sequence.getCurrentFrame());

        document.dispatchEvent(new CustomEvent('canvasChanged'));
    }

    _hexToRgba(color) {
        if (typeof color !== 'string') {
            return [0, 0, 0, 255];
        }

        let hex = color.trim().replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        if (hex.length !== 6) {
            return [0, 0, 0, 255];
        }

        const value = parseInt(hex, 16);
        if (Number.isNaN(value)) {
            return [0, 0, 0, 255];
        }

        return [
            (value >> 16) & 255,
            (value >> 8) & 255,
            value & 255,
            255
        ];
    }

    _runFloodFill(ctx, x, y, color) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        const startX = Math.max(0, Math.min(width - 1, Math.floor(x)));
        const startY = Math.max(0, Math.min(height - 1, Math.floor(y)));

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const replacement = this._hexToRgba(color);

        const indexOf = (px, py) => ((py * width) + px) * 4;
        const startIndex = indexOf(startX, startY);
        const target = [
            data[startIndex],
            data[startIndex + 1],
            data[startIndex + 2],
            data[startIndex + 3]
        ];

        const sameColor = target[0] === replacement[0]
            && target[1] === replacement[1]
            && target[2] === replacement[2]
            && target[3] === replacement[3];

        if (sameColor) {
            return;
        }

        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            if (cx < 0 || cy < 0 || cx >= width || cy >= height) {
                continue;
            }

            const idx = indexOf(cx, cy);
            if (
                data[idx] !== target[0]
                || data[idx + 1] !== target[1]
                || data[idx + 2] !== target[2]
                || data[idx + 3] !== target[3]
            ) {
                continue;
            }

            data[idx] = replacement[0];
            data[idx + 1] = replacement[1];
            data[idx + 2] = replacement[2];
            data[idx + 3] = replacement[3];

            stack.push([cx + 1, cy]);
            stack.push([cx - 1, cy]);
            stack.push([cx, cy + 1]);
            stack.push([cx, cy - 1]);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    fillAt(point) {
        // Take a snapshot of the filled region as ImageData
        const layerData = this._primaryLayerData();
        // Find the first canvas/ctx to use for snapshot
        const canvasObj = this.canvases[0];
        if (!canvasObj) return;
        const { canvas, ctx } = canvasObj;

        // Draw the fill on a temp canvas to get the result
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = canvas.width;
        tmpCanvas.height = canvas.height;
        const tmpCtx = tmpCanvas.getContext('2d');
        // Copy current layer to temp
        tmpCtx.drawImage(canvas, 0, 0);
        // Run flood fill on temp
        this._runFloodFill(tmpCtx, point.x, point.y, this.drawProps.color);
        // Get the filled region as ImageData
        const imageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);

        layerData.push({
            type: 'fill-snapshot',
            imageData,
            width: tmpCanvas.width,
            height: tmpCanvas.height
        });

        this.drawData = layerData;
        window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
        this.drawFrame(window.sequence.getCurrentFrame());
        document.dispatchEvent(new CustomEvent('canvasChanged'));
    }

    _drawRoundRect(ctx, x, y, w, h, r) {
        r = Math.max(0, Math.min(Math.abs(r), Math.abs(w) / 2, Math.abs(h) / 2));
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            ctx.stroke();
            return;
        }
        ctx.beginPath();
        ctx.moveTo(x + r * Math.sign(w), y);
        ctx.lineTo(x + w - r * Math.sign(w), y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r * Math.sign(h));
        ctx.lineTo(x + w, y + h - r * Math.sign(h));
        ctx.quadraticCurveTo(x + w, y + h, x + w - r * Math.sign(w), y + h);
        ctx.lineTo(x + r * Math.sign(w), y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r * Math.sign(h));
        ctx.lineTo(x, y + r * Math.sign(h));
        ctx.quadraticCurveTo(x, y, x + r * Math.sign(w), y);
        ctx.closePath();
        ctx.stroke();
    }

    _buildLayerCanvas(layer, width, height) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = width;
        layerCanvas.height = height;
        const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });

        const layerData = Array.isArray(layer.data) ? layer.data : [];
        if (layerData.length === 0) {
            return layerCanvas;
        }

        const snapshot = layerData[layerData.length - 1];
        if (snapshot && typeof snapshot.width === 'number' && typeof snapshot.height === 'number' && snapshot.data) {
            layerCtx.putImageData(snapshot, 0, 0);
            return layerCanvas;
        }

        layerData.forEach(command => {
            if (!command) {
                return;
            }

            if (command.type === 'fill-snapshot' && command.imageData) {
                // Draw the stored filled region directly
                try {
                    layerCtx.putImageData(command.imageData, 0, 0);
                } catch (e) {
                    // Fallback: ignore if imageData is not valid
                }
                return;
            }
            if (command.type === 'fill') {
                // Legacy: still support old fill commands for compatibility
                this._runFloodFill(layerCtx, command.x, command.y, command.color);
                return;
            }

            if (command.type === 'rectangle') {
                layerCtx.save();
                layerCtx.strokeStyle = command.color;
                layerCtx.lineWidth = command.lineWidth;
                layerCtx.lineCap = command.lineCap;
                const { start, end, radius } = command;
                const x = start.x;
                const y = start.y;
                const w = end.x - start.x;
                const h = end.y - start.y;
                this._drawRoundRect(layerCtx, x, y, w, h, typeof radius === 'number' ? radius : this.drawProps.radius);
                layerCtx.restore();
                return;
            }

            if (command.type === 'circle') {
                layerCtx.save();
                layerCtx.strokeStyle = command.color;
                layerCtx.lineWidth = command.lineWidth;
                layerCtx.lineCap = command.lineCap;
                const { center, radius } = command;
                layerCtx.beginPath();
                layerCtx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
                layerCtx.stroke();
                layerCtx.restore();
                return;
            }

            if (!Array.isArray(command.points) || command.points.length === 0) {
                return;
            }

            layerCtx.strokeStyle = command.color;
            layerCtx.lineWidth = command.lineWidth;
            layerCtx.lineCap = command.lineCap;
            layerCtx.beginPath();
            layerCtx.moveTo(command.points[0].x, command.points[0].y);
            if (command.points.length < 3) {
                // Not enough points for curve, just line
                for (let i = 1; i < command.points.length; i++) {
                    layerCtx.lineTo(command.points[i].x, command.points[i].y);
                }
            } else {
                // Draw smooth quadratic curves between points
                for (let i = 1; i < command.points.length - 1; i++) {
                    const p0 = command.points[i - 1];
                    const p1 = command.points[i];
                    const p2 = command.points[i + 1];
                    const cpx = p1.x;
                    const cpy = p1.y;
                    const endx = (p1.x + p2.x) / 2;
                    const endy = (p1.y + p2.y) / 2;
                    layerCtx.quadraticCurveTo(cpx, cpy, endx, endy);
                }
                // Draw last segment
                const n = command.points.length;
                layerCtx.lineTo(command.points[n - 1].x, command.points[n - 1].y);
            }
            layerCtx.stroke();
        });

        return layerCanvas;
    }

    undo() {
        const layerData = this._primaryLayerData();

        if (layerData.length > 0) {
            layerData.pop();
        }

        this.drawData = layerData;

        window.sequence.setDrawData(window.sequence.getCurrentFrameIndex(), this._cloneLayers());
        this.drawFrame(window.sequence.getCurrentFrame());
        document.dispatchEvent(new CustomEvent('canvasChanged'));
    }

    drawFrame(frame) {
        if (!frame) {
            return;
        }

        this.layers = this._normalizeLayers(frame.drawing);
        this.drawData = this._primaryLayerData();
        this._resetCanvases(false);

        if (this.layers.length === 0) {
            return;
        }

        this.layers.forEach(layer => {
            if (layer.visible === false) {
                return;
            }

            const layerOpacity = Math.max(0, Math.min(1, Number.isFinite(layer.opacity) ? layer.opacity : 1));
            const baseCanvas = this.canvases[0]?.canvas;
            if (!baseCanvas) {
                return;
            }

            const layerCanvas = this._buildLayerCanvas(layer, baseCanvas.width, baseCanvas.height);

            this.canvases.forEach(({ ctx }) => {
                const previousGlobalAlpha = ctx.globalAlpha;
                ctx.globalAlpha = layerOpacity;

                ctx.drawImage(layerCanvas, 0, 0);
                ctx.globalAlpha = previousGlobalAlpha;
            });
        });

        // Do NOT update frame image here to avoid recursion
    }
}