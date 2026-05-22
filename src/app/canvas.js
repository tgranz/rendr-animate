export default function bindCanvas(container) {
    const shell = document.createElement('div');
    shell.className = 'canvas-shell';

    const stage = document.createElement('div');
    stage.className = 'canvas-stage';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'canvas-toolbar';

    const zoomGroup = document.createElement('label');
    zoomGroup.className = 'canvas-toolbar-group';
    zoomGroup.textContent = 'Zoom';

    const zoomRange = document.createElement('input');
    zoomRange.type = 'range';
    zoomRange.min = '1';
    zoomRange.max = '8';
    zoomRange.step = '0.01';
    zoomRange.value = '1';

    const zoomValue = document.createElement('span');
    zoomValue.className = 'canvas-toolbar-value mono';
    zoomValue.textContent = '100%';

    const rotationGroup = document.createElement('label');
    rotationGroup.className = 'canvas-toolbar-group';
    rotationGroup.textContent = 'Rotation';

    const rotationRange = document.createElement('input');
    rotationRange.type = 'range';
    rotationRange.min = '-180';
    rotationRange.max = '180';
    rotationRange.step = '1';
    rotationRange.value = '0';

    const rotationValue = document.createElement('span');
    rotationValue.className = 'canvas-toolbar-value mono';
    rotationValue.textContent = '0°';

    zoomGroup.appendChild(zoomRange);
    zoomGroup.appendChild(zoomValue);
    rotationGroup.appendChild(rotationRange);
    rotationGroup.appendChild(rotationValue);
    toolbar.appendChild(zoomGroup);
    toolbar.appendChild(rotationGroup);

    const DRAWING_WIDTH = 1920;
    const DRAWING_HEIGHT = 1080;
    const THUMBNAIL_WIDTH = 320;
    const THUMBNAIL_HEIGHT = 180;
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 8;
    const DRAW_THRESHOLD = 2;

    // Keep a fixed drawing space and scale the element to fit the panel.
    canvas.width = DRAWING_WIDTH;
    canvas.height = DRAWING_HEIGHT;
    canvas.style.touchAction = 'none';
    canvas.style.display = 'block';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    canvas.style.margin = '0 auto';

    const paths = [];
    const activePointers = new Map();

    let zoom = 1;
    let rotation = 0;
    let cameraX = DRAWING_WIDTH / 2;
    let cameraY = DRAWING_HEIGHT / 2;

    let drawingPointerId = null;
    let drawCandidate = null;
    let activePathIndex = -1;
    let gesture = null;
    let activeSequenceFrameIndex = -1;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function resizeCanvasToContainer() {
        const containerWidth = container.clientWidth;
        const toolbarHeight = toolbar.offsetHeight;
        const containerHeight = Math.max(0, container.clientHeight - toolbarHeight - 8);

        const targetWidth = Math.min(containerWidth, (containerHeight * 16) / 9);
        const targetHeight = targetWidth > 0 ? targetWidth * (9 / 16) : 0;

        canvas.style.width = `${Math.floor(targetWidth)}px`;
        canvas.style.height = `${Math.floor(targetHeight)}px`;
        render();
    }

    function clientToCanvasPoint(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * canvas.width;
        const y = ((clientY - rect.top) / rect.height) * canvas.height;
        return { x, y };
    }

    function rotatePoint(x, y, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos
        };
    }

    function screenToWorld(screenPoint) {
        const centerX = DRAWING_WIDTH / 2;
        const centerY = DRAWING_HEIGHT / 2;
        const normalizedX = (screenPoint.x - centerX) / zoom;
        const normalizedY = (screenPoint.y - centerY) / zoom;
        const unrotated = rotatePoint(normalizedX, normalizedY, -rotation);
        return {
            x: cameraX + unrotated.x,
            y: cameraY + unrotated.y
        };
    }

    function worldToScreen(worldPoint) {
        const centerX = DRAWING_WIDTH / 2;
        const centerY = DRAWING_HEIGHT / 2;
        const dx = worldPoint.x - cameraX;
        const dy = worldPoint.y - cameraY;
        const rotated = rotatePoint(dx, dy, rotation);
        return {
            x: centerX + rotated.x * zoom,
            y: centerY + rotated.y * zoom
        };
    }

    function drawPath(path) {
        const { points } = path;
        if (points.length === 0) return;

        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (points.length === 1) {
            ctx.beginPath();
            ctx.arc(points[0].x, points[0].y, path.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = path.color;
            ctx.fill();
            return;
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length - 1; i += 1) {
            const midX = (points[i].x + points[i + 1].x) / 2;
            const midY = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
        }

        const lastPoint = points[points.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
        ctx.stroke();
    }

    function clonePaths(sourcePaths) {
        if (!Array.isArray(sourcePaths)) return [];

        return sourcePaths.map(path => ({
            color: typeof path?.color === 'string' ? path.color : '#000',
            width: Number.isFinite(path?.width) ? path.width : 3,
            points: Array.isArray(path?.points)
                ? path.points
                    .filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))
                    .map(point => ({ x: point.x, y: point.y }))
                : []
        })).filter(path => path.points.length > 0);
    }

    function getSequence() {
        if (typeof window === 'undefined') return null;
        return window.sequence ?? null;
    }

    function getActiveSequenceFrame() {
        const sequence = getSequence();
        if (!sequence) return null;

        if (sequence.frames.length === 0) {
            sequence.newFrame();
            sequence.currentFrame = 0;
        }

        const frameIndex = sequence.currentFrame;
        const frame = sequence.getCurrentFrame();
        if (!frame) return null;

        return { sequence, frameIndex, frame };
    }

    function drawPathsToContext(targetCtx) {
        targetCtx.fillStyle = '#fff';
        targetCtx.fillRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);

        const scaleX = targetCtx.canvas.width / DRAWING_WIDTH;
        const scaleY = targetCtx.canvas.height / DRAWING_HEIGHT;
        targetCtx.save();
        targetCtx.scale(scaleX, scaleY);

        for (const path of paths) {
            const clonedPath = {
                color: path.color,
                width: path.width,
                points: path.points
            };

            targetCtx.strokeStyle = clonedPath.color;
            targetCtx.lineWidth = clonedPath.width;
            targetCtx.lineCap = 'round';
            targetCtx.lineJoin = 'round';

            if (clonedPath.points.length === 1) {
                targetCtx.beginPath();
                targetCtx.arc(clonedPath.points[0].x, clonedPath.points[0].y, clonedPath.width / 2, 0, Math.PI * 2);
                targetCtx.fillStyle = clonedPath.color;
                targetCtx.fill();
                continue;
            }

            targetCtx.beginPath();
            targetCtx.moveTo(clonedPath.points[0].x, clonedPath.points[0].y);
            for (let i = 1; i < clonedPath.points.length - 1; i += 1) {
                const midX = (clonedPath.points[i].x + clonedPath.points[i + 1].x) / 2;
                const midY = (clonedPath.points[i].y + clonedPath.points[i + 1].y) / 2;
                targetCtx.quadraticCurveTo(clonedPath.points[i].x, clonedPath.points[i].y, midX, midY);
            }

            const lastPoint = clonedPath.points[clonedPath.points.length - 1];
            targetCtx.lineTo(lastPoint.x, lastPoint.y);
            targetCtx.stroke();
        }

        targetCtx.restore();
    }

    function renderFrameImage() {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = DRAWING_WIDTH;
        exportCanvas.height = DRAWING_HEIGHT;

        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) return null;

        drawPathsToContext(exportCtx);

        return exportCanvas.toDataURL('image/png');
    }

    function renderFrameThumbnail() {
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = THUMBNAIL_WIDTH;
        thumbnailCanvas.height = THUMBNAIL_HEIGHT;

        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        if (!thumbnailCtx) return null;

        drawPathsToContext(thumbnailCtx);

        return thumbnailCanvas.toDataURL('image/jpeg', 0.72);
    }

    function persistActiveFrame(includeImage = false) {
        const sequenceFrame = getActiveSequenceFrame();
        if (!sequenceFrame) return;

        const { sequence, frameIndex, frame } = sequenceFrame;
        activeSequenceFrameIndex = frameIndex;

        const drawing = {
            version: 1,
            width: DRAWING_WIDTH,
            height: DRAWING_HEIGHT,
            paths: clonePaths(paths)
        };

        if (typeof sequence.setFrameDrawing === 'function') {
            sequence.setFrameDrawing(frameIndex, drawing);
        } else {
            frame.drawing = drawing;
        }

        if (includeImage) {
            const imageData = renderFrameImage();
            const thumbnailData = renderFrameThumbnail();

            if (typeof sequence.setFrameRender === 'function') {
                sequence.setFrameRender(frameIndex, imageData, thumbnailData);
            } else {
                if (imageData) {
                    if (typeof sequence.setFrameImage === 'function') {
                        sequence.setFrameImage(frameIndex, imageData);
                    } else {
                        frame.image = imageData;
                    }
                }

                if (thumbnailData) {
                    if (typeof sequence.setFrameThumbnail === 'function') {
                        sequence.setFrameThumbnail(frameIndex, thumbnailData);
                    } else {
                        frame.thumbnail = thumbnailData;
                    }
                }
            }
        }
    }

    function loadActiveFrameIntoCanvas() {
        const sequenceFrame = getActiveSequenceFrame();
        if (!sequenceFrame) {
            paths.splice(0, paths.length);
            render();
            return;
        }

        const { frameIndex, frame } = sequenceFrame;
        activeSequenceFrameIndex = frameIndex;

        const loadedPaths = clonePaths(frame?.drawing?.paths);
        paths.splice(0, paths.length, ...loadedPaths);
        drawingPointerId = null;
        drawCandidate = null;
        activePathIndex = -1;
        gesture = null;
        render();

        if (!frame?.drawing) {
            persistActiveFrame(true);
        }
    }

    function render() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.translate(DRAWING_WIDTH / 2, DRAWING_HEIGHT / 2);
        ctx.scale(zoom, zoom);
        ctx.rotate(rotation);
        ctx.translate(-cameraX, -cameraY);
        for (const path of paths) {
            drawPath(path);
        }
        ctx.restore();
    }

    function syncToolbar() {
        zoomRange.value = zoom.toFixed(2);
        zoomValue.textContent = `${Math.round(zoom * 100)}%`;
        rotationRange.value = String(Math.round((rotation * 180) / Math.PI));
        rotationValue.textContent = `${Math.round((rotation * 180) / Math.PI)}°`;
    }

    function zoomAtClientPoint(clientX, clientY, desiredZoom) {
        const nextZoom = clamp(desiredZoom, MIN_ZOOM, MAX_ZOOM);
        if (Math.abs(nextZoom - zoom) < 0.0001) return;

        const screenPoint = clientToCanvasPoint(clientX, clientY);
        const worldPoint = screenToWorld(screenPoint);
        const centerX = DRAWING_WIDTH / 2;
        const centerY = DRAWING_HEIGHT / 2;

        zoom = nextZoom;
        const normalizedX = (screenPoint.x - centerX) / zoom;
        const normalizedY = (screenPoint.y - centerY) / zoom;
        const unrotated = rotatePoint(normalizedX, normalizedY, -rotation);
        cameraX = worldPoint.x - unrotated.x;
        cameraY = worldPoint.y - unrotated.y;
        syncToolbar();
    }

    function removeLastPathIfDot() {
        if (activePathIndex < 0) return;
        const path = paths[activePathIndex];
        if (!path || path.points.length > 1) return;
        paths.splice(activePathIndex, 1);
        activePathIndex = -1;
    }

    function beginCandidateDraw(pointerId, clientX, clientY) {
        drawingPointerId = pointerId;
        drawCandidate = { clientX, clientY };
        activePathIndex = -1;
    }

    function materializePathFromCandidate(clientX, clientY) {
        if (!drawCandidate) return;
        const startPoint = screenToWorld(clientToCanvasPoint(drawCandidate.clientX, drawCandidate.clientY));
        const currentPoint = screenToWorld(clientToCanvasPoint(clientX, clientY));
        paths.push({
            color: '#000',
            width: 3,
            points: [startPoint, currentPoint]
        });
        activePathIndex = paths.length - 1;
    }

    function addDrawingPoint(clientX, clientY) {
        if (drawingPointerId === null || !drawCandidate) return false;

        const dx = clientX - drawCandidate.clientX;
        const dy = clientY - drawCandidate.clientY;
        const movedEnough = Math.hypot(dx, dy) >= DRAW_THRESHOLD;

        if (activePathIndex < 0) {
            if (!movedEnough) return false;
            materializePathFromCandidate(clientX, clientY);
            render();
            return true;
        }

        const path = paths[activePathIndex];
        if (!path) return false;
        path.points.push(screenToWorld(clientToCanvasPoint(clientX, clientY)));
        render();
        return true;
    }

    function endDrawing(pointerId, keepDot = true) {
        if (drawingPointerId !== pointerId) return;
        if (!keepDot) {
            removeLastPathIfDot();
            render();
            persistActiveFrame(true);
        }
        drawingPointerId = null;
        drawCandidate = null;
        activePathIndex = -1;
    }

    function getTouchPointers() {
        const touches = [];
        for (const pointer of activePointers.values()) {
            if (pointer.pointerType === 'touch') {
                touches.push(pointer);
            }
        }
        return touches;
    }

    function getTouchCenterAndDistance() {
        const touches = getTouchPointers();
        if (touches.length < 2) return null;

        const first = touches[0];
        const second = touches[1];
        const centerX = (first.clientX + second.clientX) / 2;
        const centerY = (first.clientY + second.clientY) / 2;
        const dx = second.clientX - first.clientX;
        const dy = second.clientY - first.clientY;
        return {
            centerX,
            centerY,
            distance: Math.hypot(dx, dy)
        };
    }

    function handleTouchGesture() {
        const current = getTouchCenterAndDistance();
        if (!current || !gesture) return;

        const previousScreen = clientToCanvasPoint(gesture.centerX, gesture.centerY);
        const currentScreen = clientToCanvasPoint(current.centerX, current.centerY);
        const deltaScreenX = currentScreen.x - previousScreen.x;
        const deltaScreenY = currentScreen.y - previousScreen.y;
        const deltaWorld = rotatePoint(deltaScreenX / zoom, deltaScreenY / zoom, -rotation);
        cameraX -= deltaWorld.x;
        cameraY -= deltaWorld.y;

        if (gesture.distance > 0 && current.distance > 0) {
            const zoomFactor = current.distance / gesture.distance;
            zoomAtClientPoint(current.centerX, current.centerY, zoom * zoomFactor);
        }

        gesture = {
            centerX: current.centerX,
            centerY: current.centerY,
            distance: current.distance
        };
        render();
    }

    function handlePointerDown(event) {
        canvas.setPointerCapture(event.pointerId);
        activePointers.set(event.pointerId, {
            pointerType: event.pointerType,
            clientX: event.clientX,
            clientY: event.clientY
        });

        const touchPointers = getTouchPointers();
        if (touchPointers.length >= 2) {
            endDrawing(drawingPointerId, false);
            const start = getTouchCenterAndDistance();
            if (start) {
                gesture = {
                    centerX: start.centerX,
                    centerY: start.centerY,
                    distance: start.distance
                };
            }
            return;
        }

        beginCandidateDraw(event.pointerId, event.clientX, event.clientY);
    }

    function handlePointerMove(event) {
        if (!activePointers.has(event.pointerId)) return;

        activePointers.set(event.pointerId, {
            pointerType: event.pointerType,
            clientX: event.clientX,
            clientY: event.clientY
        });

        if (getTouchPointers().length >= 2) {
            handleTouchGesture();
            return;
        }

        if (drawingPointerId === event.pointerId) {
            const didChangeDrawing = addDrawingPoint(event.clientX, event.clientY);
            if (didChangeDrawing) {
                persistActiveFrame(true);
            }
        }
    }

    function handlePointerUpOrCancel(event) {
        endDrawing(event.pointerId, false);
        activePointers.delete(event.pointerId);

        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }

        if (getTouchPointers().length < 2) {
            gesture = null;
        }
    }

    function handleWheel(event) {
        event.preventDefault();
        const zoomFactor = Math.exp(-event.deltaY * 0.0015);
        zoomAtClientPoint(event.clientX, event.clientY, zoom * zoomFactor);
        render();
    }

    function setRotationDegrees(value) {
        rotation = (value * Math.PI) / 180;
        syncToolbar();
        render();
    }

    function setZoom(value) {
        zoom = clamp(value, MIN_ZOOM, MAX_ZOOM);
        syncToolbar();
        render();
    }

    function handleCurrentFrameChanged(event) {
        const nextFrameIndex = event?.detail?.frameIndex;
        if (!Number.isInteger(nextFrameIndex)) {
            loadActiveFrameIntoCanvas();
            return;
        }

        if (nextFrameIndex === activeSequenceFrameIndex) {
            return;
        }

        loadActiveFrameIntoCanvas();
    }

    const resizeObserver = new ResizeObserver(() => {
        resizeCanvasToContainer();
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', resizeCanvasToContainer);
    window.addEventListener('sequence:current-frame-changed', handleCurrentFrameChanged);

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUpOrCancel);
    canvas.addEventListener('pointercancel', handlePointerUpOrCancel);
    canvas.addEventListener('pointerleave', handlePointerUpOrCancel);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    zoomRange.addEventListener('input', () => {
        setZoom(Number(zoomRange.value));
    });

    rotationRange.addEventListener('input', () => {
        setRotationDegrees(Number(rotationRange.value));
    });

    stage.appendChild(canvas);
    shell.appendChild(stage);
    shell.appendChild(toolbar);
    container.appendChild(shell);
    resizeCanvasToContainer();
    syncToolbar();
    loadActiveFrameIntoCanvas();
    render();
}