// 1. Open your Google Sheet, click Extensions > Apps Script.
// 2. Paste this entire file into Code.gs (replacing everything there).
// 3. Save, click Deploy > New Deployment.
// 4. Select Type: "Web app"
// 5. Execute as: "Me"
// 6. Who has access: "Anyone"
// 7. Click Deploy, copy the "Web app URL" and put it in your Vercel Environment Variables as GOOGLE_SCRIPT_URL.

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Add headers if sheet is completely empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'orderId', 'orderNumber', 'itemsCount', 'subtotal', 'total', 
        'customerName', 'customerEmail', 'customerPhone', 'customerAddress', 
        'status', 'placedAt', 'itemsJSON'
      ]);
    }
    
    // Append the new order
    sheet.appendRow([
      data.orderId,
      data.orderNumber,
      data.itemsCount,
      data.subtotal,
      data.total,
      data.customerName,
      data.customerEmail,
      data.customerPhone || '',
      data.customerAddress,
      data.status,
      data.placedAt,
      data.itemsJSON
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ "success": true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "success": false, "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
