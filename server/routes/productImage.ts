// server/routes/productImage.ts
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// GET /api/product-image?name=maggi&barcode=123456
router.get("/product-image", async (req, res) => {
  const { name, barcode } = req.query;
  // Try barcode first
  if (barcode) {
    try {
      const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
      const response = await fetch(url);
      if (response.ok) {
        const data: any = await response.json();
        if (data.product && data.product.image_front_url) {
          return res.json({ imageUrl: data.product.image_front_url });
        }
      }
    } catch (e) {}
  }
  // Fallback: search by name
  if (name) {
    try {
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        name as string
      )}&search_simple=1&action=process&json=1&page_size=1`;
      const response = await fetch(searchUrl);
      if (response.ok) {
        const data: any = await response.json();
        if (
          data.products &&
          data.products[0] &&
          data.products[0].image_front_url
        ) {
          return res.json({ imageUrl: data.products[0].image_front_url });
        }
      }
    } catch (e) {}
  }
  // Not found
  res.json({ imageUrl: null });
});

export default router;
