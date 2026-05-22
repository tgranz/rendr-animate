export default class Compose {
    constructor() {
        this.previews = [];

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('sequence:frame-updated', () => this.renderPreviews());
            window.addEventListener('sequence:current-frame-changed', () => this.renderPreviews());
            window.addEventListener('sequence:frame-added', () => this.renderPreviews());
            window.addEventListener('sequence:frame-deleted', () => this.renderPreviews());
        }
    }

    bindPreview(preview) {
        this.previews.push(preview);
        this.renderPreviews();
    }

    unbindPreview(preview) {
        this.previews = this.previews.filter(p => p !== preview);
    }

    renderPreviews() {
        if (!window?.sequence || typeof window.sequence.getCurrentFrame !== 'function') {
            return;
        }

        const currentFrame = window.sequence.getCurrentFrame();
        const imageSource = currentFrame?.image ?? '';

        this.previews.forEach(preview => {
            preview.src = imageSource;
        });
    }
}