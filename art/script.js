class ArtGallery {
    constructor() {
        this.images = [];
        this.currentSort = 'date';
        this.init();
    }

    async init() {
        await this.loadImages();
        this.renderGallery();
        this.setupEventListeners();
    }

    async loadImages() {
        console.log('Loading images and reading embedded metadata...');
        await this.loadImagesFromGitHub();
        this.sortImages('date');
    }

    async loadImagesFromGitHub() {
        try {
            // Get current repository info from the URL
            const pathParts = window.location.pathname.split('/');
            let owner, repo;
            
            if (window.location.hostname.includes('github.io')) {
                owner = pathParts[1];
                repo = pathParts[2] || pathParts[1];
            } else {
                // Custom domain - try to detect from page or fallback
                owner = 'YOUR_GITHUB_USERNAME'; // You'll need to replace this
                repo = 'YOUR_REPO_NAME';
            }
            
            // GitHub API call to get images folder contents
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/images`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Could not access GitHub API');
            }
            
            const files = await response.json();
            
            // Filter for image files
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const imageFiles = files.filter(file => {
                const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                return imageExtensions.includes(ext);
            });

            // Load each image and extract metadata
            const imagePromises = imageFiles.map(file => this.loadImageWithMetadata(file));
            this.images = await Promise.all(imagePromises);
            
            // Filter out any failed loads
            this.images = this.images.filter(img => img !== null);
                
        } catch (error) {
            console.error('GitHub API failed, using fallback method:', error);
            await this.loadImagesFallback();
        }
    }

    async loadImageWithMetadata(file) {
        try {
            const src = `../images/${file.name}`;
            
            // Create image object and load it
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Try to enable CORS
            
            return new Promise(async (resolve) => {
                img.onload = async () => {
                    try {
                        // Extract EXIF data
                        const metadata = await this.extractImageMetadata(img, src);
                        
                        resolve({
                            filename: file.name,
                            title: metadata.title || this.generateTitle(file.name.replace(/\.[^/.]+$/, "")),
                            src: src,
                            dateObj: metadata.dateObj || new Date(file.sha || Date.now()),
                            description: metadata.description,
                            camera: metadata.camera,
                            software: metadata.software,
                            dimensions: `${img.naturalWidth} × ${img.naturalHeight}`,
                            ...metadata
                        });
                    } catch (e) {
                        // Fallback if metadata extraction fails
                        resolve({
                            filename: file.name,
                            title: this.generateTitle(file.name.replace(/\.[^/.]+$/, "")),
                            src: src,
                            dateObj: new Date(),
                            dimensions: `${img.naturalWidth} × ${img.naturalHeight}`
                        });
                    }
                };
                
                img.onerror = () => {
                    console.warn(`Failed to load image: ${file.name}`);
                    resolve(null);
                };
                
                img.src = src;
            });
            
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            return null;
        }
    }

    async extractImageMetadata(img, src) {
        // Load EXIF.js library dynamically
        if (!window.EXIF) {
            await this.loadExifLibrary();
        }

        return new Promise((resolve) => {
            if (!window.EXIF) {
                resolve({});
                return;
            }

            // Extract EXIF data
            window.EXIF.getData(img, function() {
                const allTags = window.EXIF.getAllTags(this);
                
                // Extract relevant metadata
                const metadata = {
                    dateObj: null,
                    title: null,
                    description: null,
                    camera: null,
                    software: null
                };

                // Date extraction (try multiple fields)
                const dateTaken = allTags.DateTimeOriginal || allTags.DateTime || allTags.DateTimeDigitized;
                if (dateTaken) {
                    // Convert EXIF date format (YYYY:MM:DD HH:MM:SS) to Date object
                    const dateStr = dateTaken.replace(/:/g, '-').replace(/-(\d{2}:\d{2}:\d{2})/, ' $1');
                    metadata.dateObj = new Date(dateStr);
                }

                // Title/Description from various fields
                metadata.title = allTags.ImageDescription || allTags.XPTitle || allTags.XPSubject;
                metadata.description = allTags.XPComment || allTags.UserComment || allTags.ImageDescription;
                
                // Camera info
                if (allTags.Make && allTags.Model) {
                    metadata.camera = `${allTags.Make} ${allTags.Model}`;
                }
                
                // Software info
                metadata.software = allTags.Software || allTags.ProcessingSoftware;

                // PNG specific metadata (tEXt chunks)
                if (src.toLowerCase().includes('.png')) {
                    // PNG metadata would need a different approach
                    // For now, try to extract from canvas if possible
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        ctx.drawImage(img, 0, 0);
                        
                        // PNG metadata extraction would go here
                        // This is more complex and might need a specialized library
                    } catch (e) {
                        console.log('PNG metadata extraction not available');
                    }
                }

                resolve(metadata);
            });
        });
    }

    async loadExifLibrary() {
        return new Promise((resolve, reject) => {
            if (window.EXIF) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exif-js/2.3.0/exif.js';
            script.onload = () => resolve();
            script.onerror = () => {
                console.warn('Could not load EXIF library');
                resolve(); // Don't reject, just continue without EXIF
            };
            document.head.appendChild(script);
        });
    }

    generateTitle(filename) {
        // Convert filename to readable title
        return filename
            .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
            .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
            .replace(/\d+/g, match => `#${match}`); // Add # before numbers
    }

    async loadImagesFallback() {
        // Try to load images by testing common patterns
        const commonPatterns = [
            'character1.jpg', 'character2.jpg', 'character3.jpg', 'character4.jpg', 'character5.jpg',
            'character1.png', 'character2.png', 'character3.png', 'character4.png', 'character5.png',
            'art1.jpg', 'art2.jpg', 'art3.jpg', 'art4.jpg', 'art5.jpg',
            'drawing1.jpg', 'drawing2.jpg', 'drawing3.jpg', 'drawing4.jpg', 'drawing5.jpg'
        ];

        const validImages = [];
        
        for (const pattern of commonPatterns) {
            try {
                const img = new Image();
                const src = `../images/${pattern}`;
                
                await new Promise((resolve, reject) => {
                    img.onload = async () => {
                        // Try to extract metadata even in fallback mode
                        const metadata = await this.extractImageMetadata(img, src);
                        
                        validImages.push({
                            filename: pattern,
                            title: metadata.title || this.generateTitle(pattern.replace(/\.[^/.]+$/, "")),
                            src: src,
                            dateObj: metadata.dateObj || new Date(),
                            dimensions: `${img.naturalWidth} × ${img.naturalHeight}`,
                            ...metadata
                        });
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = src;
                });
            } catch (e) {
                // Image doesn't exist, continue
            }
        }
        
        this.images = validImages;
        
        if (this.images.length === 0) {
            this.showInstructions();
        }
    }

    showInstructions() {
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; background: rgba(255,255,255,0.9); padding: 3rem; border-radius: 15px; color: #333;">
                <h2>🎨 Ready to Add Your Artwork!</h2>
                <p style="margin: 1rem 0; font-size: 1.1rem;">To get started:</p>
                <ol style="text-align: left; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                    <li><strong>Upload your images</strong> to the <code>/images/</code> folder in your repository</li>
                    <li><strong>Embed metadata</strong> in your images (title, date, description) using your art software</li>
                    <li><strong>Supported formats:</strong> JPG (with EXIF), PNG (with tEXt chunks), GIF, WebP</li>
                    <li><strong>That's it!</strong> The gallery will read the embedded metadata automatically</li>
                </ol>
                <div style="margin-top: 2rem; padding: 1rem; background: #e8f4fd; border-radius: 8px;">
                    <strong>💡 Pro Tip:</strong> Use Photoshop, GIMP, or other art software to add titles and dates to your image metadata before uploading!
                </div>
            </div>
        `;
    }

    sortImages(sortType) {
        this.currentSort = sortType;
        
        if (sortType === 'date') {
            this.images.sort((a, b) => b.dateObj - a.dateObj); // Newest first
        } else if (sortType === 'name') {
            this.images.sort((a, b) => a.title.localeCompare(b.title));
        }
    }

    renderGallery() {
        const gallery = document.getElementById('gallery');
        const loading = document.getElementById('loading');
        
        // Clear existing content
        gallery.innerHTML = '';
        
        if (this.images.length === 0) {
            loading.textContent = 'No artwork found. Please add images and metadata.json';
            return;
        }

        // Create image elements
        this.images.forEach((img, index) => {
            const artworkDiv = document.createElement('div');
            artworkDiv.className = 'artwork';
            artworkDiv.innerHTML = `
                <img src="${img.src}" alt="${img.title}" loading="lazy">
                <div class="artwork-info">
                    <h3>${img.title}</h3>
                    <div class="date">${this.formatDate(img.dateObj)}</div>
                    ${img.description ? `<div class="description">${img.description}</div>` : ''}
                    ${img.software ? `<div class="software">Created with: ${img.software}</div>` : ''}
                    <div class="dimensions">${img.dimensions}</div>
                </div>
            `;
            
            // Add click event for modal
            artworkDiv.addEventListener('click', () => this.openModal(img));
            
            gallery.appendChild(artworkDiv);
        });

        // Hide loading and show gallery
        loading.style.display = 'none';
        gallery.classList.add('loaded');
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    openModal(img) {
        const modal = document.getElementById('modal');
        const modalImg = document.getElementById('modalImg');
        const modalTitle = document.getElementById('modalTitle');
        const modalDate = document.getElementById('modalDate');
        
        modal.style.display = 'block';
        modalImg.src = img.src;
        modalTitle.textContent = img.title;
        modalDate.textContent = `${this.formatDate(img.dateObj)} • ${img.dimensions}`;
        
        // Add additional metadata to modal if available
        if (img.description || img.software || img.camera) {
            let extraInfo = [];
            if (img.description) extraInfo.push(img.description);
            if (img.software) extraInfo.push(`Created with: ${img.software}`);
            if (img.camera) extraInfo.push(`Camera: ${img.camera}`);
            
            modalDate.innerHTML = `
                ${this.formatDate(img.dateObj)} • ${img.dimensions}
                ${extraInfo.length ? '<br><small>' + extraInfo.join(' • ') + '</small>' : ''}
            `;
        }
        
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    setupEventListeners() {
        // Sort buttons
        document.getElementById('sortDate').addEventListener('click', () => {
            this.updateActiveButton('sortDate');
            this.sortImages('date');
            this.renderGallery();
        });

        document.getElementById('sortName').addEventListener('click', () => {
            this.updateActiveButton('sortName');
            this.sortImages('name');
            this.renderGallery();
        });

        // Modal close events
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.closeModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    updateActiveButton(activeId) {
        document.querySelectorAll('.controls button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(activeId).classList.add('active');
    }
}

// Initialize the gallery when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ArtGallery();
});
