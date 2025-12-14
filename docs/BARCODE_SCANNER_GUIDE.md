# Barcode Scanner Integration Guide

## 🎯 Overview

PantryPal now includes a professional barcode scanner system designed for retail USB barcode scanners (keyboard wedge devices). This system provides real-time product lookup, stock management, and comprehensive diagnostics.

## ✨ Features Implemented

### 1. **Professional Scanner Interface**

- ✅ Auto-focus input field for seamless scanning
- ✅ Auto-submit on Enter key (scanner suffix)
- ✅ Debouncing (500ms) to prevent duplicate scans
- ✅ Continuous mode for multiple item scanning
- ✅ Visual feedback with scan history
- ✅ Audio beep on successful scan

### 2. **Settings Panel**

Configure scanner behavior:

- Auto-Submit toggle
- Continuous Mode toggle
- Auto-Focus control
- Scan Sound on/off
- Adjustable debounce time (0-1000ms)
- Configuration tips for hardware

### 3. **Diagnostics Tool**

Debug scanner issues:

- Raw input capture
- Character-by-character analysis
- Timestamp tracking
- Scan speed measurement
- Enter key detection

### 4. **Test Barcodes**

Ready-to-scan test codes:

- EAN-13: `5901234123457`
- UPC-A: `012345678905`
- Code-128: `TEST12345`
- Code-39: `SAMPLE123`
- Simple IDs: `PROD001`, `ABC123XYZ`

## 🔧 Setup Instructions

### Step 1: Configure Your Barcode Scanner

Most retail USB barcode scanners work in "keyboard wedge" mode - they type the barcode like a keyboard. Configure your scanner with these settings:

**Required Settings:**

```
Mode: Keyboard Wedge / HID
Suffix: Carriage Return (CR) or Enter Key - ENABLED
Prefix: None (disable)
Auto-Enter: ENABLED
```

**Recommended Symbologies (Enable These):**

- EAN-13 (European retail)
- UPC-A (North American retail)
- Code-128 (alphanumeric)
- Code-39 (industrial)
- Code-93
- QR Code (if supported)

**Optional Settings:**

```
Beep on Scan: ENABLED (user feedback)
LED Indicator: ENABLED
Scan Mode: Continuous or Auto-sense
```

### Step 2: Access the Barcode Scanner

1. Login to PantryPal
2. Navigate to **"Barcode Scanner"** in the sidebar
3. The input field will auto-focus

### Step 3: Test Your Scanner

**Method 1: Use Test Barcodes**

1. Go to the **"Test Barcodes"** tab
2. Click "Use This Code" on any sample barcode
3. Press Enter to search
4. Verify the search works

**Method 2: Use Diagnostics**

1. Go to the **"Diagnostics"** tab
2. Enable "Diagnostic Mode"
3. Scan a barcode with your device
4. Verify you see:
   - The barcode appears in raw input
   - Characters are captured correctly
   - Scanner is appending Enter key

**Method 3: Scan Real Products**

1. Add a product with barcode `5901234123457` in Inventory
2. Go to **"Scanner"** tab
3. Scan a test barcode (or type it manually)
4. Product should appear immediately

## 📱 Usage Workflow

### Single Item Scan

1. Focus on input field (auto-focused by default)
2. Scan barcode with scanner device
3. Product appears on right side
4. Use quick stock actions if needed
5. Click "Reset" for next scan

### Continuous Scanning Mode

1. Enable **"Continuous Mode"** in Settings
2. Scan first barcode → product appears
3. Input auto-clears after 500ms
4. Scan next barcode immediately
5. View scan history in left panel

### Quick Stock Updates

After product is found:

1. Enter quantity (default: 1)
2. Click **"Add"** to increase stock
3. Click **"Remove"** to decrease stock
4. Changes save automatically with inventory transaction log

## ⚙️ Configuration Options

### Scanner Settings Tab

| Setting             | Default | Description                                |
| ------------------- | ------- | ------------------------------------------ |
| **Auto-Submit**     | ON      | Automatically search when barcode detected |
| **Continuous Mode** | ON      | Clear input after scan for next item       |
| **Auto-Focus**      | ON      | Keep input focused for scanner             |
| **Scan Sound**      | ON      | Play beep on successful scan               |
| **Debounce Time**   | 500ms   | Minimum time between scans                 |

### When to Use Each Setting

**Auto-Submit: ON**

- Best for: USB barcode scanners with Enter suffix
- Behavior: Search triggers automatically when scanner sends data
- Use when: Using dedicated scanner hardware

**Auto-Submit: OFF**

- Best for: Manual keyboard entry or testing
- Behavior: Must press Enter to search
- Use when: Typing barcodes manually

**Continuous Mode: ON**

- Best for: Scanning multiple items in sequence
- Behavior: Input clears after each scan
- Use when: Receiving inventory, stock counts, bulk operations

**Continuous Mode: OFF**

- Best for: Single product lookups
- Behavior: Input stays filled after scan
- Use when: Detailed product inspection, stock adjustments

## 🐛 Troubleshooting

### Scanner Not Working

**Problem:** Scanner light works but nothing appears in input

- **Solution:** Check that scanner is in "Keyboard Wedge" or "HID" mode
- **Test:** Open Notepad and scan - if text appears, scanner works
- **Fix:** Reconfigure scanner using manufacturer's programming barcodes

**Problem:** Duplicate scans appear

- **Solution:** Increase debounce time to 800ms or 1000ms
- **Location:** Settings tab → Debounce Time slider
- **Reason:** Scanner sending data multiple times

**Problem:** Scanner types garbled characters

- **Solution:** Check scanner symbology settings
- **Fix:** Enable only the barcode types you use (EAN-13, UPC-A, etc.)
- **Test:** Use Diagnostics tab to see raw characters

### Product Not Found

**Problem:** Scanner works but "Product Not Found" error

- **Solution 1:** Verify product exists with that barcode in Inventory
- **Solution 2:** Check barcode field matches scanned code exactly
- **Test:** Go to Inventory → Edit Product → Copy barcode field → Compare

**Problem:** Some products found, others not

- **Solution:** Database search only checks `barcode`, `qr_code`, and `id` fields
- **Fix:** Ensure product has barcode in the correct field
- **Note:** Product names are NOT searched by barcode scanner

### Performance Issues

**Problem:** Slow search after scan

- **Check:** Network latency (API call to `/api/products/search/:code`)
- **Check:** Database performance (product table indexed on barcode)
- **Expected:** Search should complete in < 200ms

**Problem:** Input field loses focus

- **Solution:** Enable "Auto-Focus" in Settings
- **Alternative:** Click input field once before starting scans

## 📊 Diagnostics Tool Usage

### Reading Diagnostic Output

```
Scan #1
Time: 2:44:39 AM
Length: 13 characters
Characters: 5 9 0 1 2 3 4 1 2 3 4 5 7
```

**What to Check:**

1. **Length:** Should match your barcode format
   - EAN-13: 13 digits
   - UPC-A: 12 digits
   - Code-128: Variable
2. **Characters:** Should be clean digits/letters
   - ✅ Good: `5 9 0 1 2 3 4 1 2 3 4 5 7`
   - ❌ Bad: `5 9 0 1 � 2 3 4` (garbled)
3. **Timestamp:** Scans should be spaced out
   - ✅ Good: 500ms+ between scans
   - ❌ Bad: Multiple scans in 100ms (duplicates)

### Common Diagnostic Patterns

**Pattern 1: Extra Characters**

```
Input: "0012345678905\r\n"
Issue: Scanner adding carriage return AND line feed
Fix: Configure scanner to send only CR or only LF
```

**Pattern 2: Prefix Characters**

```
Input: "*012345678905"
Issue: Scanner adding prefix character
Fix: Disable prefix in scanner configuration
```

**Pattern 3: Incomplete Scans**

```
Input: "0012345"
Issue: Scanner not reading full barcode
Fix: Hold scanner steady, ensure good lighting, clean scanner lens
```

## 🎓 Best Practices

### For Retail Environment

1. **Mount Scanner Properly**

   - Fixed scanners: Stable mount at waist height
   - Handheld: Coiled USB cable for mobility
   - Position: Near monitor for visual confirmation

2. **Lighting Conditions**

   - Avoid direct sunlight on barcode
   - Use scanner LED for difficult barcodes
   - Keep scanner lens clean

3. **Product Barcode Quality**

   - Ensure barcodes are not damaged or faded
   - Print clear labels for custom products
   - Test new labels before mass printing

4. **Workflow Optimization**
   - Enable Continuous Mode for inventory receiving
   - Use Quick Stock actions for fast adjustments
   - Keep input field visible on screen

### For Testing/Development

1. **Use Test Barcodes First**

   - Verify basic functionality with test codes
   - Add test products to inventory
   - Practice scan workflow before going live

2. **Monitor Diagnostics**

   - Enable diagnostic mode periodically
   - Check for scanner configuration drift
   - Verify consistent scan quality

3. **Database Preparation**
   - Ensure all products have barcodes
   - Use standard formats (EAN-13, UPC-A)
   - Index barcode column for performance

## 🔗 Integration Points

### Backend API

- **Endpoint:** `GET /api/products/search/:code`
- **Search Fields:** `barcode`, `qr_code`, `id`
- **Response:** Product object or 404
- **Performance:** < 200ms typical response time

### Stock Updates

- **Endpoint:** `PATCH /api/products/:id/stock`
- **Operations:** `add`, `subtract`, `set`
- **Logging:** Automatic inventory transaction created
- **Validation:** Prevents negative stock

### Frontend State

- Debouncing: Prevents duplicate API calls
- Caching: React Query for product data
- Real-time: Immediate UI updates after scan

## 📈 Feature Roadmap

### Planned Enhancements

- [ ] Bluetooth scanner support
- [ ] Multi-item batch scanning
- [ ] Receipt printer integration
- [ ] Offline mode with sync
- [ ] Custom scan actions (billing, transfer, etc.)
- [ ] Barcode generation for products
- [ ] Export scan history to CSV
- [ ] Scanner configuration backup/restore

## 🆘 Support

### Scanner Not Listed in Guide?

Most USB barcode scanners work as keyboard wedge devices. If your model isn't specifically mentioned:

1. Check if it types barcodes in Notepad
2. If yes, it will work with PantryPal
3. Configure Enter key suffix if available
4. Test in Diagnostics tab

### Need More Help?

1. Check manufacturer documentation for "Keyboard Wedge" or "HID" mode
2. Use Diagnostics tab to verify scanner output
3. Test with sample barcodes first
4. Verify products exist in database with matching barcodes

## 📋 Quick Reference

### Scanner Configuration Checklist

- [ ] Mode: Keyboard Wedge / HID
- [ ] Suffix: Enter key (CR) enabled
- [ ] Prefix: Disabled
- [ ] Symbologies: EAN-13, UPC-A enabled
- [ ] Auto-enter: Enabled
- [ ] Beep: Enabled

### Testing Checklist

- [ ] Scanner types in Notepad
- [ ] Diagnostics shows clean input
- [ ] Test barcode finds product
- [ ] Real product barcode scans successfully
- [ ] Continuous mode works
- [ ] Quick stock actions work
- [ ] No duplicate scans

### Pre-Deployment Checklist

- [ ] All products have barcodes
- [ ] Barcode field indexed in database
- [ ] Test with 10+ products successfully
- [ ] Staff trained on scanner usage
- [ ] Backup scanner available
- [ ] Network latency < 200ms

---

**Version:** 1.0.0  
**Last Updated:** December 14, 2025  
**Compatibility:** All USB HID/Keyboard Wedge barcode scanners
