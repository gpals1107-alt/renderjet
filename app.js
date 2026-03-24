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

    // 클라우드 버튼들
    const gDriveBtn = document.querySelector(".cloud-tile:nth-child(1)");
    const dropboxBtn = document.querySelector(".cloud-tile:nth-child(2)");
    const myboxBtn = document.querySelector(".cloud-tile:nth-child(3)");
    const cloudArea = document.querySelector(".cloud-export-v2");

    const btnKo = document.getElementById("lang-ko");
    const btnEn = document.getElementById("lang-en");
    let currentLang = "ko";

    // 💣 🔥 맥북/사파리 호환 FFmpeg v0.11 객체
    const { createFFmpeg, fetchFile } = FFmpeg;
    let ffmpeg = createFFmpeg({
        log: true,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    });
    let ffmpegLoaded = false;
    let finalVideoBlob = null; // 클라우드 전송용 실제 데이터

    const i18n = {
        ko: {
            "slogan": "PRO VIDEO COMPRESSION ENGINE",
            "import-title": "마스터 파일 임포트",
            "import-sub": "4K 영상 파일을 드래그하세요 (최대 2GB)",
            "select-btn": "파일 선택 ▲",
            "guide-text": "엔진 활성화 중...",
            "guide-ready": "파일을 올리면 인코딩 설정을 시작할 수 있습니다.",
            "label-quality": "화질 설정 / 압축률",
            "btn-accel": "JET 가속 시작 🚀",
            "status-title": "가속 인코딩 중...",
            "status-log": "엔진 데이터 로딩 중...",
            "q-names": ["원본 무손실", "유튜브 고화질", "시안 확인용", "모바일 초압축"],
            "q-descs": [
                "마스터 보관용 / 4K 화질 100% 보존",
                "4K·FHD 전송용 / 눈에 띄는 손실 없음",
                "빠른 피드백용 / 단톡방·슬랙 공유 추천",
                "폰에서 빨리 보기용 / 데이터 절약 모드"
            ],
            "dl-finish": "DOWNLOAD FINAL VIDEO ⬇️ (압축 완료)"
        },
        en: {
            "slogan": "PRO VIDEO COMPRESSION ENGINE",
            "import-title": "Import Master File",
            "import-sub": "Drag your 4K master (Max 2GB)",
            "select-btn": "SELECT FILE ▲",
            "guide-text": "Activating Engine...",
            "guide-ready": "Engine Ready! Please drop your video.",
            "label-quality": "JET_SPEED / QUALITY",
            "btn-accel": "JET_ACCELERATE 🚀",
            "status-title": "ACCELERATING...",
            "status-log": "Processing core engine...",
            "q-names": ["Lossless Master", "Premium Quality", "Quick Review", "Lite Jet"],
            "q-descs": [
                "Archival Grade / 100% Original Quality",
                "Best for 4K Review / Pro Export",
                "Reduced for Instant Team Messaging",
                "Smallest Format / Mobile Only"
            ],
            "dl-finish": "DOWNLOAD FINAL VIDEO ⬇️ (SONIC SUCCESS)"
        }
    };

    // 🧬 엔진 시동 (맥북 필살기 버전)
    async function initEngine() {
        try {
            ffmpeg.setProgress(({ ratio }) => {
                const percent = Math.floor(ratio * 100);
                progressBar.style.width = `${percent}%`;
                statusText.textContent = `Rendering Engine: ${percent}% Complete`;
                if (percent > 0) statusText.style.color = "var(--neon-green)";
            });

            await ffmpeg.load();
            ffmpegLoaded = true;
            guideBox.querySelector('p').textContent = i18n[currentLang]["guide-ready"];
        } catch (e) {
            console.error(e);
            guideBox.querySelector('p').innerHTML = "엔진 시동 지연 중... <br>새로고침(F5)을 시도해 보세요!";
        }
    }

    function setLanguage(lang) {
        currentLang = lang;
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (i18n[lang][key]) el.textContent = i18n[lang][key];
        });
        btnKo.classList.toggle("active", lang === "ko");
        btnEn.classList.toggle("active", lang === "en");
        if (currentFile) updateEstimate();
    }

    btnKo.addEventListener("click", () => setLanguage("ko"));
    btnEn.addEventListener("click", () => setLanguage("en"));

    let currentFile = null;

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + ['Bytes','KB','MB','GB','TB'][i];
    }

    function handleFile(file) {
        if (!file.type.startsWith("video/")) return alert("Only video files.");
        currentFile = file;
        guideBox.classList.add("hidden");
        controlsPanel.classList.remove("hidden");
        displayStatus.textContent = `SOURCE: ${formatBytes(file.size)}`;
        displayFilename.textContent = file.name;
        updateEstimate();
    }

    function updateEstimate() {
        if (!currentFile) return;
        const crfValue = parseInt(compressionSlider.value);
        let qIdx = 0;
        if (crfValue <= 22) qIdx = 0;
        else if (crfValue <= 28) qIdx = 1;
        else if (crfValue <= 34) qIdx = 2;
        else qIdx = 3;

        qualityBadge.textContent = i18n[currentLang]["q-names"][qIdx];
        qualityDesc.textContent = i18n[currentLang]["q-descs"][qIdx];
        originalSizeDisplay.textContent = formatBytes(currentFile.size);
        const ratio = (100 - ((crfValue - 18) * 3)) / 100;
        estimatedSize.textContent = formatBytes(currentFile.size * Math.max(0.1, ratio));
    }

    // 🚀 인코딩 시작 (가공 방식 최적화)
    startBtn.addEventListener("click", async () => {
        if (!ffmpegLoaded) return alert("엔진 시동 중...");
        
        controlsPanel.classList.add("hidden");
        statusPanel.classList.remove("hidden");
        finalResultBox.classList.add("hidden"); 
        progressBar.style.width = "2%";
        statusText.textContent = "데이터 주입 중 (Buffer Fetching)...";

        const crfParam = Math.max(18, Math.min(51, 58 - compressionSlider.value));

        try {
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(currentFile));
            statusText.textContent = "엔진 가속 개시 (Processing Core)...";
            
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-vcodec', 'libx264',
                '-crf', crfParam.toString(),
                '-preset', 'ultrafast',
                'output.mp4'
            );

            const data = ffmpeg.FS('readFile', 'output.mp4');
            finalVideoBlob = new Blob([data.buffer], { type: 'video/mp4' });
            const resultUrl = URL.createObjectURL(finalVideoBlob);
            
            progressBar.style.width = "100%";
            statusText.textContent = "JET 가공 성공! ✨";
            
            realDlLink.href = resultUrl;
            realDlLink.setAttribute("download", `RenderJet_Result_${currentFile.name}`);
            realDlLink.textContent = i18n[currentLang]["dl-finish"];
            
            finalResultBox.classList.remove("hidden");

            // 🌟 클라우드 영역 '활성화' (희미했던 영역이 밝아짐!)
            cloudArea.style.opacity = "1";
            cloudArea.querySelectorAll(".cloud-tile").forEach(btn => btn.style.cursor = "pointer");

        } catch (e) {
            console.error(e);
            statusText.textContent = "가공 실패: 리소스 재확인이 필요합니다.";
            statusText.style.color = "red";
        }
    });

    // ☁️ [클라우드 전송] 하이라이트 기능 구현
    gDriveBtn.addEventListener("click", () => {
        if (!finalVideoBlob) return;
        alert("구글 드라이브 업로더를 실행합니다.\n(현재 데모 버전: 수동 업로드 창이 열립니다!)");
        window.open('https://drive.google.com/drive/my-drive', '_blank');
    });

    dropboxBtn.addEventListener("click", () => {
        if (!finalVideoBlob) return;
        alert("드롭박스 업로더를 실행합니다.");
        window.open('https://www.dropbox.com/home', '_blank');
    });

    myboxBtn.addEventListener("click", () => {
        if (!finalVideoBlob) return;
        alert("마이박스(네이버) 업로더를 실행합니다.");
        window.open('https://mybox.naver.com/', '_blank');
    });

    // 이벤트 리스너들
    ["dragenter", "dragover", "dragleave", "drop"].forEach(name => {
        dropZone.addEventListener(name, e => { e.preventDefault(); e.stopPropagation(); });
    });
    dropZone.addEventListener("drop", (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });
    dropZone.querySelector('.select-btn').addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
    compressionSlider.addEventListener("input", updateEstimate);

    initEngine();
    setLanguage("ko");
});
