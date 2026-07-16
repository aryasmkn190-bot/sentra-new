import React from 'react';

// Jika database berisi emoji, fungsi ini akan me-map slug kategori ke gambar/image (placeholder atau SVG icon 2-tone yg relevan).
// Untuk request "misal kategori sayur segar maka akan menampilkan gambar kumpulan sayuran segar",
// kita akan buat mapping URL gambar spesifik atau fallback gradient jika tidak ada.

const CATEGORY_IMAGES: Record<string, string> = {
  "sayur-segar": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=200&h=200&auto=format&fit=crop", // sayur segar
  "buah": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=200&h=200&auto=format&fit=crop", // buah
  "daging": "https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=200&h=200&auto=format&fit=crop", // daging
  "minuman": "https://images.unsplash.com/photo-1527960471264-932f2efce5c2?q=80&w=200&h=200&auto=format&fit=crop", // minuman
  "snack": "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?q=80&w=200&h=200&auto=format&fit=crop", // snack
  "kebutuhan-dapur": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=200&h=200&auto=format&fit=crop", // kebutuhan dapur
  "perawatan-diri": "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=200&h=200&auto=format&fit=crop", // perawatan diri
  // fallback image generic:
  "default": "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200&h=200&auto=format&fit=crop"
};

export const CategoryImage = ({ slug, image_url, alt, className = "w-full h-full object-cover" }: { slug: string, image_url?: string | null, alt: string, className?: string }) => {
  const finalUrl = image_url || CATEGORY_IMAGES[slug] || CATEGORY_IMAGES["default"];
  return (
    <img src={finalUrl} alt={alt} className={className} loading="lazy" />
  );
};
