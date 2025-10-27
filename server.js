// 1. เรียกใช้โปรแกรมที่จำเป็น
const express = require('express');
const cors = require('cors');
const path =require('path'); 
const xlsx = require('xlsx'); 

// 2. สร้างเซิร์ฟเวอร์
const app = express();
const PORT = 3000;

// 3. ตั้งค่าให้เซิร์ฟเวอร์
app.use(cors()); 
app.use(express.json());

// 4. ฟังก์ชันสำหรับอ่านข้อมูลจาก Excel
function loadProductsFromExcel() {
    try {
        const filePath = path.join(__dirname, 'products.xlsx');
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        
        console.log(`✅ โหลดข้อมูลสินค้า ${data.length} รายการ จาก Excel สำเร็จ`);
        return data;

    } catch (error) {
        console.error(`❌ เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ${error.message}`);
        console.error('กรุณาตรวจสอบว่ามีไฟล์ products.xlsx และรูปแบบถูกต้องหรือไม่');
        return []; 
    }
}

// 5. "ฐานข้อมูล" (อ่านจาก Excel ตอนเริ่มเซิร์ฟเวอร์)
const DB_PRODUCTS = loadProductsFromExcel();

// 6. สร้าง API Endpoint
// API สำหรับ "ค้นหาด้วยชื่อ" (เช่น /api/search?name=เลย์)
app.get('/api/search', (req, res) => {
    const searchTerm = req.query.name.toLowerCase();
    const results = DB_PRODUCTS.filter(product => 
        String(product.name).toLowerCase().includes(searchTerm)
    );
    res.json(results); 
});

// API สำหรับ "ค้นหาด้วยบาร์โค้ด" (เช่น /api/barcode/8850006300010)
app.get('/api/barcode/:code', (req, res) => {
    const barcode = req.params.code;
    
    const product = DB_PRODUCTS.find(p => String(p.barcode) === barcode);

    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'ไม่พบสินค้า' });
    }
});

// 7. สั่งให้เซิร์ฟเวอร์เริ่มทำงาน
app.listen(PORT, () => {
    console.log(`🚀 เซิร์ฟเวอร์หลังบ้านทำงานแล้วที่ http://localhost:${PORT}`);
});
