import { Request, Response, NextFunction, Router } from "express";
import QRCode from "qrcode";
import { productService } from "../services";
import { isAuthenticated } from "../auth";
import { requireOrgId } from "../middleware/tenantContext";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * Generate QR code for a product
 * POST /api/products/:id/generate-qr
 */
router.post(
  "/api/products/:id/generate-qr",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const orgId = requireOrgId(req);

    // Get the product scoped to org
    const product = await productService.getProduct(id, orgId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Generate QR code from product ID or existing qr_code field
    const qrData = product.qr_code || product.id;

    // Generate QR code as base64 image
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Update product with QR code image
    const updatedProduct = await productService.updateProduct(
      id,
      { qr_code_image: qrCodeImage },
      orgId
    );

    res.json({
      success: true,
      qr_code: qrData,
      qr_code_image: qrCodeImage,
      product: updatedProduct,
    });
  })
);

export default router;
