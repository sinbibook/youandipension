/**
 * Image Helpers
 * Utility functions for image handling and placeholder management
 */

var ImageHelpers = {
    // Empty image SVG placeholder (공백/따옴표까지 완전 인코딩 → img.src 와 CSS url() 양쪽 모두 안전)
    EMPTY_IMAGE_SVG: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22800%22%20height=%22600%22%3E%3Crect%20width=%22800%22%20height=%22600%22%20fill=%22%23f0f0f0%22/%3E%3Ctext%20x=%2250%25%22%20y=%2250%25%22%20dominant-baseline=%22middle%22%20text-anchor=%22middle%22%20font-family=%22sans-serif%22%20font-size=%2224%22%20fill=%22%23999%22%3ENo%20Image%3C/text%3E%3C/svg%3E',

    /**
     * Apply placeholder to an image element
     * @param {HTMLImageElement} imgElement - The image element to apply placeholder to
     */
    applyPlaceholder: function(imgElement) {
        if (!imgElement) return;
        imgElement.src = ImageHelpers.EMPTY_IMAGE_SVG;
        imgElement.alt = 'No Image Available';
        imgElement.classList.add('empty-image-placeholder');
    },

    /**
     * Apply placeholder background to a background-image element (div/p 등)
     * @param {HTMLElement} el - 배경이미지로 표시하는 요소
     */
    applyBackgroundPlaceholder: function(el) {
        if (!el) return;
        el.style.backgroundImage = 'url("' + ImageHelpers.EMPTY_IMAGE_SVG + '")';
        el.classList.add('empty-image-placeholder');
    }
};

// Ensure ImageHelpers is available globally
window.ImageHelpers = ImageHelpers;
