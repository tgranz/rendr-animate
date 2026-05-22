export default class Sequence {
    constructor() {
        this.frames = [];
        this.frameRate = 8;
        this.width = 800;
        this.height = 600;
        this.currentFrame = 0;
    }

    notify(eventName, detail = {}) {
        if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
            return;
        }

        window.dispatchEvent(new CustomEvent(eventName, { detail }));
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
            drawing: null,
            holdFrames: 1, // Number of frames this image appears on
        };

        // Add new frame to the sequence
        this.frames.push(newFrame);
        this.notify('sequence:frame-added', {
            frameIndex: this.frames.length - 1,
            frame: newFrame
        });
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
        this.notify('sequence:frame-updated', {
            frameIndex: index,
            frame
        });
    }

    setFrameThumbnail(index, thumbnail) {
        const frame = this.getFrame(index);
        frame.thumbnail = thumbnail;
        this.notify('sequence:frame-updated', {
            frameIndex: index,
            frame
        });
    }

    setFrameRender(index, image, thumbnail) {
        const frame = this.getFrame(index);
        frame.image = image;
        frame.thumbnail = thumbnail;
        this.notify('sequence:frame-updated', {
            frameIndex: index,
            frame
        });
    }

    setFrameDrawing(index, drawing) {
        const frame = this.getFrame(index);
        frame.drawing = drawing;
        this.notify('sequence:frame-updated', {
            frameIndex: index,
            frame
        });
    }

    setFrameHold(index, holdFrames) {
        const frame = this.getFrame(index);
        frame.holdFrames = holdFrames;
        this.notify('sequence:frame-updated', {
            frameIndex: index,
            frame
        });
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

        this.notify('sequence:frame-deleted', {
            frameIndex: index,
            currentFrame: this.currentFrame,
            frameCount: this.frames.length
        });
    }

    setFrameRate(frameRate) {
        if (frameRate <= 0 || frameRate > 60) {
            throw new Error('Frame rate out of bounds');
        }

        this.frameRate = frameRate;
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
        this.notify('sequence:current-frame-changed', {
            frameIndex: this.currentFrame,
            frame: this.getCurrentFrame()
        });

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
}