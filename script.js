document.addEventListener('DOMContentLoaded', () => {
    
    // (URL ที่ถูกต้อง ชี้ไป Render)
    const API_URL = 'https://stshopv1.onrender.com/api';

    // --- Elements สำหรับ Search (ชื่อ) ---
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResultsDiv = document.getElementById('search-results');

    // --- Elements สำหรับ Scan (กล้อง) ---
    const scanBtn = document.getElementById('scan-btn');
    const stopScanBtn = document.getElementById('stop-scan-btn');
    const videoContainer = document.getElementById('video-container');
    const video = document.getElementById('video-feed');
    let codeReader; 
    let currentStream; 

    // --- (ใหม่) Elements สำหรับพิมพ์บาร์โค้ด ---
    const manualBarcodeInput = document.getElementById('manual-barcode-input');
    const manualBarcodeBtn = document.getElementById('manual-barcode-btn');

    // --- Elements สำหรับ Pop-up ---
    const barcodeResultPopup = document.getElementById('barcode-result-popup');
    const popupProductName = document.getElementById('popup-product-name');
    const popupProductPrice = document.getElementById('popup-product-price');
    const closePopupBtn = document.querySelector('.close-popup-btn');

    
    // --- ฟังก์ชัน Search (ด้วยชื่อ) ---
    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        searchResultsDiv.innerHTML = ''; 
        if (searchTerm.length === 0) return;
        try {
            const response = await fetch(`${API_URL}/search?name=${encodeURIComponent(searchTerm)}`);
            const results = await response.json();
            if (results.length > 0) {
                results.forEach(product => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'result-item';
                    itemDiv.innerHTML = `
                        <span class="name">${product.name}</span>
                        <span class="price">${product.price} บาท</span>
                    `;
                    searchResultsDiv.appendChild(itemDiv);
                });
            } else {
                searchResultsDiv.innerHTML = '<p style="text-align:center; color: #888;">ไม่พบสินค้าที่ตรงกัน</p>';
            }
        } catch (error) {
            console.error('Error fetching search results:', error);
            searchResultsDiv.innerHTML = '<p style="text-align:center; color: red;">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</p>';
        }
    }
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') performSearch();
    });


    // --- (ใหม่) ฟังก์ชันกลางสำหรับ "จัดการผลลัพธ์บาร์โค้ด" ---
    function handleBarcodeResult(barcodeText) {
        if (codeReader) codeReader.reset(); 
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());
        videoContainer.style.display = 'none';
        scanBtn.style.display = 'flex';
        
        fetch(`${API_URL}/barcode/${barcodeText}`)
            .then(response => {
                if (!response.ok) throw new Error('Product not found');
                return response.json();
            })
            .then(product => {
                showScanResultPopup(product.name, product.price);
            })
            .catch(error => {
                console.error('Error fetching barcode:', error);
                showScanResultPopup(undefined, undefined); 
            });
    }

    // --- (ใหม่) Event Listener สำหรับปุ่ม "พิมพ์บาร์โค้ด" ---
    manualBarcodeBtn.addEventListener('click', () => {
        const barcodeText = manualBarcodeInput.value.trim();
        if (barcodeText.length > 0) {
            handleBarcodeResult(barcodeText);
        }
    });
    manualBarcodeInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const barcodeText = manualBarcodeInput.value.trim();
            if (barcodeText.length > 0) {
                handleBarcodeResult(barcodeText);
            }
        }
    });


    // --- ฟังก์ชันสำหรับแสดง Pop-up ---
    function showScanResultPopup(productName, price) {
        popupProductName.textContent = productName || 'ไม่พบข้อมูล'; 
        popupProductPrice.textContent = price ? `${price} บาท` : 'ไม่มีในฐานข้อมูล';
        barcodeResultPopup.style.display = 'flex';
    }

    // --- Event Listener สำหรับปิด Pop-up ---
    closePopupBtn.addEventListener('click', () => {
        barcodeResultPopup.style.display = 'none'; 
        stopScanning(); // เรียกใช้ฟังก์ชันหยุดสแกน (เพื่อคืนค่าหน้าจอ)
    });

    // --- ฟังก์ชันหยุดการสแกน ---
    function stopScanning() {
        if (codeReader) codeReader.reset(); 
        if (currentStream) currentStream.getTracks().forEach(track => track.stop()); 
        
        videoContainer.style.display = 'none'; 
        scanBtn.style.display = 'flex'; 
        document.querySelector('.search-container').style.display = 'flex'; 
        document.querySelector('.divider').style.display = 'flex'; 
        document.querySelector('.manual-entry-section').style.display = 'block';
        searchResultsDiv.style.display = 'block'; 
        searchResultsDiv.innerHTML = ''; 
        searchInput.value = ''; 
        manualBarcodeInput.value = '';
    }

    // --- Event Listener สำหรับปุ่มหยุดสแกน ---
    stopScanBtn.addEventListener('click', stopScanning);


    // --- Event Listener สำหรับปุ่มสแกน ---
    scanBtn.addEventListener('click', () => {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
                .then((stream) => {
                    currentStream = stream;
                    videoContainer.style.display = 'block';
                    video.srcObject = stream;
                    video.play();
                    
                    // ซ่อนส่วนอื่นๆ
                    scanBtn.style.display = 'none';
                    document.querySelector('.search-container').style.display = 'none';
                    searchResultsDiv.style.display = 'none';
                    document.querySelector('.manual-entry-section').style.display = 'none';
                    
                    codeReader = new ZXing.BrowserMultiFormatReader();
                    
                    codeReader.decodeFromVideoElement(video, 'video-feed', (result, err) => {
                        if (result) {
                            
                            // (Alert Debug ที่เราเพิ่มไว้)
                            alert('สแกนเจอ: ' + result.text); 

                            console.log('Scan Result:', result.text);
                            
                            handleBarcodeResult(result.text);
                        }
                        if (err && !(err instanceof ZXing.NotFoundException)) {
                            console.error(err);
                        }
                    });

                })
                .catch((err) => {
                    console.error('ไม่สามารถเข้าถึงกล้องได้:', err);
                    alert('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาต');
                    stopScanning();
                });

        } else {
            alert('เบราว์เซอร์ของคุณไม่รองรับการเข้าถึงกล้อง');
            stopScanning();
        }
    });

});
