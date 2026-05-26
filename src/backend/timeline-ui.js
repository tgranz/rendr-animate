export default class TimelineUI {
    constructor() {
        this.userIsScrollingFramebar = false;
        this.userScrollCooldownMs = 500;
        this.userScrollTimer = null;
        this.playingInterval = null;

        this.timeline = document.createElement('div');
        this.timeline.id = 'timeline';

        this.toolbar = document.createElement('div');
        this.toolbar.id = 'timeline-toolbar';
        this.timeline.appendChild(this.toolbar);
        this._renderToolbar();

        this.framebar = document.createElement('div');
        this.framebar.id = 'framebar';
        this.timeline.appendChild(this.framebar);

        this.overview = document.createElement('div');
        this.overview.id = 'overview';
        this.timeline.appendChild(this.overview);

        this.playbackControls = document.createElement('div');
        this.playbackControls.id = 'playback-controls';
        this.timeline.appendChild(this.playbackControls);
        this._renderPlaybackControls();

        document.getElementById('bottom-shell').appendChild(this.timeline);

        this._bindSequenceEvents();
        this._bindFramebarScrollEvents();

        if (window.sequence.frames.length === 0) {
            window.sequence.newFrame();
            window.sequence.setCurrentFrame(0);
        }

        this.renderFrames();

        document.addEventListener('sequenceChanged', () => {
            this.renderFrames();
        });
    }

    _renderToolbar() {
        const buttons = [
            {
                "title": "Add frame",
                "icon": "plus",
                "callback": () => {
                    window.sequence.newFrame();
                    const nextIndex = window.sequence.frames.length - 1;
                    window.sequence.setCurrentFrame(nextIndex);
                }
            },
            {
                "title": "Duplicate frame",
                "icon": "copy",
                "callback": () => {
                    const currentIndex = window.sequence.getCurrentFrameIndex();
                    window.sequence.duplicateFrame(currentIndex);
                    window.sequence.setCurrentFrame(currentIndex + 1);
                }
            },
            {
                "title": "spacer"
            },
            {
                "title": "Switch view",
                "icon": "layout-grid",
                "callback": () => {}
            },
            {
                "title": "spacer-fill"
            },
            {
                "title": "Settings",
                "icon": "settings-2",
                "callback": () => {}
            }
        ]

        buttons.forEach(btnInfo => {
            if (btnInfo.title === "spacer-fill") {
                const spacer = document.createElement('div');
                spacer.classList.add('spacer-fill');
                this.toolbar.appendChild(spacer);
                return;
            } else if (btnInfo.title === "spacer") {
                const spacer = document.createElement('div');
                spacer.classList.add('spacer');
                this.toolbar.appendChild(spacer);
                return;
            } else {
                const button = document.createElement('button');
                button.title = btnInfo.title;
                button.innerHTML = `<i class="ti ti-${btnInfo.icon}"></i>`;
                button.addEventListener('click', btnInfo.callback);
                this.toolbar.appendChild(button);
            }
        });
    }

    _renderPlaybackControls() {
        const buttons = [
            {
                "title": "Previous Frame",
                "icon": "caret-left",
                "callback": () => { window.sequence.previousFrame(); }
            },
            {
                "title": "Play",
                "icon": "player-play",
                "callback": () => { this.togglePlayPause(); },
                "class": "play-pause-btn"
            },
            {
                "title": "Next Frame",
                "icon": "caret-right",
                "callback": () => { window.sequence.nextFrame(); }
            },
            {
                "title": "spacer",
            },
            {
                "title": "Loop",
                "icon": "repeat",
                "id": "loop-toggle-btn",
                "callback": () => { document.getElementById('loop-toggle-btn').classList.toggle('on'); }
            },
        ]

        buttons.forEach(btnInfo => {
            if (btnInfo.title === "spacer") {
                const spacer = document.createElement('div');
                spacer.classList.add('spacer');
                this.playbackControls.appendChild(spacer);
                return;
            } else if (btnInfo.title === "spacer-fill") {
                const spacer = document.createElement('div');
                spacer.classList.add('spacer-fill');
                this.playbackControls.appendChild(spacer);
                return;
            } else {
                const button = document.createElement('button');
                button.title = btnInfo.title;
                button.id = btnInfo.id || '';
                button.innerHTML = `<i class="ti ti-${btnInfo.icon}"></i>`;
                if (btnInfo.class) button.classList.add(btnInfo.class);
                button.addEventListener('click', btnInfo.callback);
                this.playbackControls.appendChild(button);
            }
        });
    }

    _bindSequenceEvents() {
        document.addEventListener('canvasChanged', () => {
            this.renderFrames();
        });
    }

    _bindFramebarScrollEvents() {
        const markUserScroll = () => {
            this.userIsScrollingFramebar = true;

            if (this.userScrollTimer) {
                window.clearTimeout(this.userScrollTimer);
            }

            this.userScrollTimer = window.setTimeout(() => {
                this.userIsScrollingFramebar = false;
                this._centerCurrentFrameIfAllowed();
            }, this.userScrollCooldownMs);
        };

        this.framebar.addEventListener('wheel', markUserScroll, { passive: true });
        this.framebar.addEventListener('touchmove', markUserScroll, { passive: true });
        this.framebar.addEventListener('pointerdown', markUserScroll);
        this.framebar.addEventListener('scroll', markUserScroll, { passive: true });
    }

    _centerCurrentFrameIfAllowed() {
        if (this.userIsScrollingFramebar) {
            return;
        }

        const current = this.framebar.querySelector('.frame.current');
        if (!current) {
            return;
        }

        const currentLeft = current.offsetLeft;
        const currentWidth = current.offsetWidth;
        const viewportWidth = this.framebar.clientWidth;
        const targetLeft = currentLeft - (viewportWidth - currentWidth) / 2;

        this.framebar.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: 'smooth'
        });
    }

    renderFrames() {
        const frames = window.sequence.frames;
        const currentFrameIndex = window.sequence.getCurrentFrameIndex();

        this.framebar.innerHTML = '';

        frames.forEach((frame, index) => {
            const thisFrameElement = document.createElement('div');
            thisFrameElement.classList.add('frame');

            if (typeof frame?.thumbnail === 'string' && frame.thumbnail.length > 0) {
                thisFrameElement.style.backgroundImage = `url(${frame.thumbnail})`;
                thisFrameElement.style.backgroundSize = 'cover';
                thisFrameElement.style.backgroundPosition = 'center';
                thisFrameElement.style.backgroundRepeat = 'no-repeat';
            }

            thisFrameElement.innerHTML = `
                <div class="frame-info">
                    ${index + 1}
                    <div class="frame-icons">
                        ${frame.holdFrames > 1 ? `<i class="ti ti-clock"></i>` : ''}
                    </div>
                </div>
            `;

            if (index === currentFrameIndex) {
                thisFrameElement.classList.add('current');
            }

            thisFrameElement.addEventListener('click', () => {
                window.sequence.setCurrentFrame(index);
            });

            this.framebar.appendChild(thisFrameElement);
        });

        this._centerCurrentFrameIfAllowed();
    }

    _makePlaybackInterval() {
        document.querySelector('.play-pause-btn').innerHTML = `<i class="ti ti-player-pause"></i>`;
        const frameDuration = (1000 / window.sequence.frameRate) * (window.sequence.frames[window.sequence.getCurrentFrameIndex()]?.holdFrames || 1);
        
        const playInterval = () => {
            if (window.sequence.getCurrentFrameIndex() < window.sequence.frames.length - 1) {
                window.sequence.nextFrame();
            } else {
                // Loop back to the first frame, in enabled
                if (document.getElementById('loop-toggle-btn').classList.contains('on')) {
                    window.sequence.setCurrentFrame(0);
                } else {
                    this.togglePlayPause(false);
                    return;
                }
            }

            if (this.playingInterval) {
                window.clearTimeout(this.playingInterval);
                this.playingInterval = null;
            }

            this._makePlaybackInterval();
        };

        this.playingInterval = window.setTimeout(playInterval, frameDuration);
    }

    togglePlayPause(play = null) {
        const shouldPlay = play === null ? !this.playingInterval : Boolean(play);

        if (shouldPlay) {
            if (this.playingInterval) {
                return;
            }

            // Start playback
            this._makePlaybackInterval();
            window.isPlaying = true;
            window.panels.switchPanels('Canvas', 'Preview');
        } else {
            // Pause playback
            if (this.playingInterval) {
                window.clearTimeout(this.playingInterval);
                this.playingInterval = null;
            }
            window.isPlaying = false;
            window.panels.switchPanels('Preview', 'Canvas');
            document.querySelector('.play-pause-btn').innerHTML = `<i class="ti ti-player-play"></i>`;
        }
    }
}