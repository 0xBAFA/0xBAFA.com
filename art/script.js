class ArtGallery {
    constructor() {
        this.images = [];
        this.currentSort = 'date';
        this.init();
    }

    async init() {
        await this.loadMetadata();
        this.renderGallery();
        this.setupEventListeners();
    }

    async loadMetadata() {
        try {
            const response = await fetch('../metadata.json');
            const metadata = await response.json();
            
            // Create image objects with metadata
            this.images = metadata.images.map(img => ({
                ...img,
                // Ensure we have the full path
                src: `../images/${img.filename}`,
                // Parse date for sorting
                dateObj: new Date(img.date)
            }));

            // Sort by date initially (newest first)
            this.sortImages('date');
            
        } catch (error) {
            console.error('Error loading metadata:', error);
            // Fallback: try to load images from directory (won't have metadata)
            this.loadImagesFromDirectory();
        }
    }

    async loadImagesFromDirectory() {
        // This won't work perfectly due to CORS, but provides a fallback
        console.log('Falling back to basic image loading');
        // You'd need to manually add images here or use a different approach
        this.images = []; // Placeholder
        this.renderGallery();
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
        modalDate.textContent = this.formatDate(img.dateObj);
        
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
