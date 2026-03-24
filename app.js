document.addEventListener("DOMContentLoaded", () => {
    // DOM 요소
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
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
    const finalResultBox = document.getElementById("final-result-box");
    const realDlLink = document.getElementById("real-dl-link");

    const cloudArea = document.querySelector(".cloud-export-v2");
    const gDriveBtn = document.getElementById("cloud-gdrive");
    const dropboxBtn = document.getElementById("cloud-dropbox");
    const myboxBtn = document.getElementById("cloud-mybox");

    const btnKo = document.getElementById("lang-ko");
    const btnEn = document.getElementById("lang-en");
    let currentLang = "ko";

    // FFmpeg v0.11 라이브러리 (mac compatibility)
    const { createFFmpeg, fetchFile } = FFmpeg;
    let ffmpeg = createFFmpeg({
        log: true,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    });
    let ffmpegLoaded = false;
    let finalVideoBlob = null;

    const i18n = {
        ko: {
            "slogan": "PRO VIDEO COMPRESSION ENGINE",
            "import-title": "마스터 파일 임포트",
            "import-sub": "파일을 어디든 던지세요 (최대 2GB)",
            "select-btn": "파일 선택 ▲",
            "guide-text": "엔진 최적화 중...",
            "guide-ready": "엔진이 준비되었습니다! 영상을 던져주세요.",
            "label-quality": "화질 설정 / 압축률",
            "btn-accel": "JET 가속 시작 🚀",
            "status-title": "가속 인코딩 중...",
            "status-log": "엔진 연산 구동 중...",
            "dl-finish": "DOWNLOAD FINAL VIDEO ⬇️"
        },
        en: {
            "slogan": "PRO VIDEO COMPRESSION ENGINE",
            "import-title": "Import Master File",
            "import-sub": "Drop your video anywhere (Max 2GB)",
            "select-btn": "SELECT FILE ▲",
            "guide-text": "Engine Optimizing...",
            "guide-ready": "Engine Ready! Please drop your video.",
            "label-quality": "JET_SPEED / QUALITY",
            "btn-accel": "JET_ACCELERATE 🚀",
            "status-title": "ACCELERATING...",
            "status-log": "Core processing...",
            "dl-finish": "DOWNLOAD FINAL VIDEO ⬇️"
        }
    };

    // 엔진 시동
    async function initEngine() {
        try {
            ffmpeg.setProgress(({ ratio }) => {
                const percent = Math.floor(ratio * 100);
                progressBar.style.width = `${percent}%`;
                statusText.textContent = `Rendering Engine: ${percent}% Complete`;
            });
            await ffmpeg.load();
            ffmpegLoaded = true;
            guideBox.querySelector('p').textContent = i18n[currentLang]["guide-ready"];
        } catch (e) {
            console.error(e);
        }
    }

    // 파일 처리
    function handleFile(file) {
        if (!file || !file.type.startsWith("video/")) return alert("Only video files allowed.");
        currentFile = file;
        guideBox.classList.add("hidden");
        controlsPanel.classList.remove("hidden");
        displayStatus.textContent = `SOURCE: ${formatBytes(file.size)}`;
        displayFilename.textContent = file.name;
        updateEstimate();
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes','KB','MB','GB','TB'][i];
    }

    let currentFile = null;
    function updateEstimate() {
        if (!currentFile) return;
        const crf = parseInt(compressionSlider.value);
        const qNames = currentLang === "ko" ? ["원본 무손실", "유튜브 고화질", "시안 확인용", "모바일 초압축"] : ["Lossless Master", "Premium Quality", "Quick Review", "Lite Jet"];
        const qDescs = currentLang === "ko" ? [
            "마스터 보관용 / 4K 화질 100% 보존",
            "4K·FHD 전송용 / 눈에 띄는 손실 없음",
            "빠른 피드백용 / 단톡방·슬랙 공유 추천",
            "폰에서 빨리 보기용 / 데이터 절약 모드"
        ] : [
            "Archival Grade / 100% Original Quality",
            "Best for 4K Review / Pro Export",
            "Reduced for Instant Team Messaging",
            "Smallest Format / Mobile Only"
        ];
        
        let qIdx = crf <= 22 ? 0 : crf <= 28 ? 1 : crf <= 34 ? 2 : 3;
        qualityBadge.textContent = qNames[qIdx];
        qualityDesc.textContent = qDescs[qIdx]; // 사라졌던 설명 문구 업데이트 복구!
        
        originalSizeDisplay.textContent = formatBytes(currentFile.size);
        const ratio = (100 - ((crf - 18) * 3)) / 100;
        estimatedSize.textContent = formatBytes(currentFile.size * Math.max(0.1, ratio));
    }

    // 인코딩 가동
    startBtn.addEventListener("click", async () => {
        if (!ffmpegLoaded) return alert("엔진 로딩 중입니다.");
        controlsPanel.classList.add("hidden");
        statusPanel.classList.remove("hidden");
        const crf = Math.max(18, Math.min(51, 58 - compressionSlider.value));
        try {
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(currentFile));
            await ffmpeg.run('-i', 'input.mp4', '-vcodec', 'libx264', '-crf', crf.toString(), '-preset', 'ultrafast', 'output.mp4');
            const data = ffmpeg.FS('readFile', 'output.mp4');
            finalVideoBlob = new Blob([data.buffer], { type: 'video/mp4' });
            realDlLink.href = URL.createObjectURL(finalVideoBlob);
            realDlLink.setAttribute("download", `RenderJet_${currentFile.name}`);
            realDlLink.textContent = i18n[currentLang]["dl-finish"];
            progressBar.style.width = "100%";
            statusText.textContent = "가공 완료! ✨";
            finalResultBox.classList.remove("hidden");
            if(cloudArea) cloudArea.style.opacity = "1";
        } catch (e) {
            console.error(e);
            statusText.textContent = "에러: 브라우저가 연산을 중단했습니다.";
        }
    });

    // 클라우드 (선택적 바인딩 - null 방지)
    if (gDriveBtn) gDriveBtn.addEventListener("click", () => { if (finalVideoBlob) window.open('https://drive.google.com/drive/my-drive', '_blank'); });
    if (dropboxBtn) dropboxBtn.addEventListener("click", () => { if (finalVideoBlob) window.open('https://www.dropbox.com/home', '_blank'); });
    if (myboxBtn) myboxBtn.addEventListener("click", () => { if (finalVideoBlob) window.open('https://mybox.naver.com/', '_blank'); });

    // 1. 드래그 오버/바탕 (시각적 피드백)
    window.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);

    window.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 화면 전역에서 처리
        const files = e.dataTransfer.files;
        if (files && files.length > 0) handleFile(files[0]);
    }, false);

    // 2. 판넬 내부 (Drop Zone 액션 및 시각 효과 유지)
    ["dragenter", "dragover"].forEach(name => {
        dropZone.addEventListener(name, (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            dropZone.style.background = "rgba(168, 85, 247, 0.05)";
            dropZone.style.borderColor = "var(--neon-purple)";
        });
    });

    ["dragleave", "drop"].forEach(name => {
        dropZone.addEventListener(name, (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            dropZone.style.background = "transparent";
            dropZone.style.borderColor = "rgba(255, 255, 255, 0.1)";
            
            // 🐛 여기에 파일 처리 기능이 누락되어 있었습니다! 🐛
            if (name === "drop") {
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    handleFile(files[0]);
                }
            }
        });
    });

    const triggerInput = () => fileInput.click();
    dropZone.querySelector('.select-btn').addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        triggerInput();
    });
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    // 🐛 게이지 움직임 감지 센서 복구!
    compressionSlider.addEventListener("input", updateEstimate);

    // 언어 및 초기화
    btnKo.addEventListener("click", () => setLanguage("ko"));
    btnEn.addEventListener("click", () => setLanguage("en"));
    initEngine();
    setLanguage("ko");
});
