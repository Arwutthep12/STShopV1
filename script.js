document.addEventListener('DOMContentLoaded', () => {
    
    // ที่อยู่ของ API หลังบ้าน (server.js)
    const API_URL = 'https://stshopv1.onrender.com';

    // --- Elements สำหรับ Search ---
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResultsDiv = document.getElementById('search-results');

    // --- Elements สำหรับ Scan ---
    const scanBtn = document.getElementById('scan-btn');
    const stopScanBtn = document.getElementById('stop-scan-btn');
    const videoContainer = document.getElementById('video-container');
    const video = document.getElementById('video-feed');
    let codeReader; 
    let currentStream; 

    // --- Elements สำหรับ Pop-up ---
    const barcodeResultPopup = document.getElementById('barcode-result-popup');
    const popupProductName = document.getElementById('popup-product-name');
    const popupProductPrice = document.getElementById('popup-product-price');
    const closePopupBtn = document.querySelector('.close-popup-btn');

    
    // --- ฟังก์ชัน Search (ใช้ API) ---
    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        searchResultsDiv.innerHTML = ''; 

        if (searchTerm.length === 0) return;

        try {
            // 1. ยิงคำขอ (Fetch) ไปที่ API หลังบ้าน
            const response = await fetch(`${API_URL}/search?name=${encodeURIComponent(searchTerm)}`);
            const results = await response.json();

            // 2. แสดงผลลัพธ์
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

    // --- Event Listeners สำหรับ Search ---
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') performSearch();
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
        stopScanning(); // กลับไปหน้าค้นหา/สแกน
    });

    // --- ฟังก์ชันหยุดการสแกน ---
    function stopScanning() {
        if (codeReader) codeReader.reset(); 
        if (currentStream) currentStream.getTracks().forEach(track => track.stop()); 
        
        videoContainer.style.display = 'none'; 
        scanBtn.style.display = 'flex'; 
        document.querySelector('.search-container').style.display = 'flex'; 
        document.querySelector('.divider').style.display = 'flex'; 
        searchResultsDiv.style.display = 'block'; 
        searchResultsDiv.innerHTML = ''; 
        searchInput.value = ''; 
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
                    document.querySelector('.divider').style.display = 'none';
                    searchResultsDiv.style.display = 'none';

                    codeReader = new ZXing.BrowserMultiFormatReader();
                    
                    // --- ฟังก์ชัน Scan (ใช้ API) ---
                    codeReader.decodeFromVideoElement(video, 'video-feed', (result, err) => {
                        if (result) {
                            console.log('Scan Result:', result.text);
                            // หยุดสแกน
                            codeReader.reset(); 
                            currentStream.getTracks().forEach(track => track.stop());
                            videoContainer.style.display = 'none';
                            
                            // 1. ยิง API ไปถามหลังบ้าน
                            fetch(`${API_URL}/barcode/${result.text}`)
                                .then(response => {
                                    if (!response.ok) throw new Error('Product not found');
                                    return response.json();
                                })
                                .then(product => {
                                    // 2. ถ้าเจอ
                                    showScanResultPopup(product.name, product.price);
                                })
                                .catch(error => {
                                    // 3. ถ้าไม่เจอ
                                    console.error('Error fetching barcode:', error);
                                    showScanResultPopup(undefined, undefined); 
                                });
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
