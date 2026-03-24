document.addEventListener("DOMContentLoaded", () => {
    // 1. 필요한 모든 DOM 요소
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const rightPanel = document.getElementById("right-panel");
    const guideBox = document.getElementById("guide-box");
    const controlsPanel = document.getElementById("controls-panel");
    const compressionSlider = document.getElementById("compression-slider");
    const qualityBadge = document.getElementById("quality-badge");
    const qualityDesc = document.getElementById("quality-desc");
    const originalSizeDisplay = document.getElementById("original-size-display");
    const estimatedSize = document.getElementById("estimated-size");
    const startBtn = document.getElementById("start-btn");
    const displayFilename = document.getElementById("display-filename");
    const displayStatus = document.getElementById("display-status");
    const statusPanel = document.getElementById("status-panel");
    const progressBar = document.getElementById("progress-bar");
    const statusText = document.getElementById("status-text");
    const resultLinkContainer = document.getElementById("result-link-container");
    const resultLink = document.getElementById("result-link");
    const copyBtn = document.getElementById("copy-btn");

    // 다국어 관련 요수
    const btnKo = document.getElementById("lang-ko");
    const btnEn = document.getElementById("lang-en");
    let currentLang = "ko";

    // 2. 다국어 딕셔너리
    const i18n = {
        ko: {
            "slogan": "초스피드 영상 압축 및 클라우드 즉시 전송 서비스",
            "import-title": "마스터 파일 임포트",
            "import-sub": "4K 영상 파일을 드래그하세요 (최대 2GB)",
            "select-btn": "파일 선택 ▲",
            "guide-text": "파일을 올리면 압축 설정을 시작할 수 있습니다.",
            "tab-basic": "기본 압축",
            "tab-adv": "고급 설정",
            "label-quality": "화질 설정 / 압축률",
            "label-source": "원본 용량",
            "label-target": "예상 용량",
            "btn-accel": "JET 가속 시작 🚀",
            "status-title": "가속 인코딩 중...",
            "status-log": "즉시 전송을 위한 패킷 최적화 중...",
            "btn-copy": "복사",
            "label-cloud": "클라우드 즉시 전송 (무료)",
            "q-names": ["원본 무손실", "유튜브 고화질", "시안 확인용", "모바일 초압축"],
            "q-descs": [
                "마스터 보관용 / 4K 화질 100% 보존",
                "4K·FHD 전송용 / 눈에 띄는 손실 없음",
                "빠른 피드백용 / 단톡방·슬랙 공유 추천",
                "폰에서 빨리 보기용 / 데이터 절약 모드"
            ]
        },
        en: {
            "slogan": "PRO VIDEO COMPRESSION & INSTANT CLOUD DELIVERY",
            "import-title": "Import Master File",
            "import-sub": "Drag your 4K master (Max 2GB)",
            "select-btn": "SELECT FILE ▲",
            "guide-text": "Analyzing engine... Drop your file to start.",
            "tab-basic": "JET_BASIC",
            "tab-adv": "ADVANCED",
            "label-quality": "JET_SPEED / QUALITY",
            "label-source": "SOURCE",
            "label-target": "JET_TARGET",
            "btn-accel": "JET_ACCELERATE 🚀",
            "status-title": "ACCELERATING...",
            "status-log": "Optimizing packets for delivery...",
            "btn-copy": "COPY",
            "label-cloud": "INSTANT CLOUD DELIVERY",
            "q-names": ["Lossless Master", "Premium Quality", "Quick Review", "Lite Jet"],
            "q-descs": [
                "Archival Grade / 100% Original Quality",
                "Best for 4K Review / Pro Export",
                "Reduced for Instant Team Messaging",
                "Smallest Format / Mobile Only"
            ]
        }
    };

    // 3. 언어 전환 함수
    function setLanguage(lang) {
        currentLang = lang;
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (i18n[lang][key]) {
                el.textContent = i18n[lang][key];
            }
        });
        
        // 버튼 활성화 상태
        btnKo.classList.toggle("active", lang === "ko");
        btnEn.classList.toggle("active", lang === "en");
        
        // 현재 로직상의 텍스트들도 갱신
        if (currentFile) updateEstimate();
    }

    btnKo.addEventListener("click", () => setLanguage("ko"));
    btnEn.addEventListener("click", () => setLanguage("en"));

    // 4. 유틸리티 및 핵심 로직
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function handleFile(file) {
        if (!file.type.startsWith("video/")) {
            alert("동영상 파일만 업로드 가능합니다.");
            return;
        }
        currentFile = file;
        guideBox.classList.add("hidden");
        controlsPanel.classList.remove("hidden");
        displayFilename.textContent = file.name;
        displayStatus.textContent = `SOURCE_READY :: ${formatBytes(file.size)}`;
        updateEstimate();
    }

    function updateEstimate() {
        if (!currentFile) return;
        const strength = parseInt(compressionSlider.value);
        let qIdx = 0;

        if (strength <= 20) qIdx = 0;
        else if (strength <= 50) qIdx = 1;
        else if (strength <= 80) qIdx = 2;
        else qIdx = 3;

        qualityBadge.textContent = i18n[currentLang]["q-names"][qIdx];
        qualityDesc.textContent = i18n[currentLang]["q-descs"][qIdx];
        originalSizeDisplay.textContent = formatBytes(currentFile.size);
        const ratio = (100 - (strength * 0.9)) / 100;
        estimatedSize.textContent = formatBytes(currentFile.size * ratio);
    }

    // 5. 이벤트 핸들링
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    dropZone.addEventListener("drop", (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });
    dropZone.querySelector('.select-btn').addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
    compressionSlider.addEventListener("input", updateEstimate);

    startBtn.addEventListener("click", () => {
        controlsPanel.classList.add("hidden");
        statusPanel.classList.remove("hidden");
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 12;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                statusText.textContent = currentLang === "ko" ? `가속 완료: ${estimatedSize.textContent}` : `JET_SUCCESS: ${estimatedSize.textContent}`;
                statusText.style.color = "var(--neon-green)";
                setTimeout(() => resultLinkContainer.classList.remove("hidden"), 400);
            }
            progressBar.style.width = progress + "%";
        }, 100);
    });

    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(resultLink.value).then(() => {
            const old = copyBtn.textContent;
            copyBtn.textContent = currentLang === "ko" ? "완료" : "DONE";
            setTimeout(() => copyBtn.textContent = old, 1500);
        });
    });

    document.querySelectorAll(".cloud-tile").forEach(tile => {
        tile.addEventListener("click", () => {
            const old = tile.textContent;
            tile.textContent = "...";
            setTimeout(() => {
                tile.textContent = currentLang === "ko" ? "성공! ✨" : "SUCCESS! ✨";
                tile.classList.add("success");
                setTimeout(() => {
                    tile.textContent = old;
                    tile.classList.remove("success");
                }, 2000);
            }, 1000);
        });
    });

    // 초기 언어 설정 (한국어 기본)
    setLanguage("ko");
});
