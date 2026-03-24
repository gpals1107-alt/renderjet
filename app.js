document.addEventListener("DOMContentLoaded", () => {
    // 1. 필요한 모든 DOM 요소
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

    // 다국어
    const btnKo = document.getElementById("lang-ko");
    const btnEn = document.getElementById("lang-en");
    let currentLang = "ko";

    // FFmpeg
    let ffmpeg = null;
    let ffmpegLoaded = false;
    let loadingRetryCount = 0;

    // 2. 다국어 딕셔너리
    const i18n = {
        ko: {
            "slogan": "PRO VIDEO COMPRESSION ENGINE",
            "import-title": "마스터 파일 임포트",
            "import-sub": "4K 영상 파일을 드래그하세요 (최대 2GB)",
            "select-btn": "파일 선택 ▲",
            "guide-text": "엔진 활성화 중... (약 10초 소요)",
            "guide-ready": "엔진이 준비되었습니다! 파일을 올려주세요.",
            "label-quality": "화질 설정 / 압축률",
            "btn-accel": "JET 가속 시작 🚀",
            "status-title": "가속 인코딩 중...",
            "status-log": "데이터 조각 최적화 중...",
            "q-names": ["원본 무손실", "유튜브 고화질", "시안 확인용", "모바일 초압축"],
            "q-descs": [
                "마스터 보관용 / 4K 화질 100% 보존",
                "4K·FHD 전송용 / 눈에 띄는 손실 없음",
                "빠른 피드백용 / 단톡방·슬랙 공유 추천",
                "폰에서 빨리 보기용 / 데이터 절약 모드"
            ],
            "dl-finish": "DOWNLOAD FINAL VIDEO ⬇️"
        },
        en: {
            "slogan": "PRO VIDEO COMPRESSION ENGINE",
            "import-title": "Import Master File",
            "import-sub": "Drag your 4K master (Max 2GB)",
            "select-btn": "SELECT FILE ▲",
            "guide-text": "Activating Engine... (Wait 10s)",
            "guide-ready": "Engine Ready! Please drop your video.",
            "label-quality": "JET_SPEED / QUALITY",
            "btn-accel": "JET_ACCELERATE 🚀",
            "status-title": "ACCELERATING...",
            "status-log": "Packet optimizing...",
            "q-names": ["Lossless Master", "Premium Quality", "Quick Review", "Lite Jet"],
            "q-descs": [
                "Archival Grade / 100% Original Quality",
                "Best for 4K Review / Pro Export",
                "Reduced for Instant Team Messaging",
                "Smallest Format / Mobile Only"
            ],
            "dl-finish": "DOWNLOAD FINAL VIDEO ⬇️"
        }
    };

    // 3. 엔진 시동 (울트라 안정화 버전)
    async function initEngine() {
        if (ffmpegLoaded) return;
        
        try {
            console.log("ENGINE_BOOT_START");
            ffmpeg = new FFmpeg.FFmpeg();
            
            ffmpeg.on('log', ({ message }) => {
                console.log("[FFMPEG]", message);
                if (message && message.includes('time=')) statusText.textContent = `Processing: ${message.substring(0, 30)}...`;
            });

            // 🚀 글로벌 초고속 CDN 채널로 변경! (jsdelivr 연동)
            const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
            
            await ffmpeg.load({
                coreURL: `${baseURL}/ffmpeg-core.js`,
                wasmURL: `${baseURL}/ffmpeg-core.wasm`
            });

            ffmpegLoaded = true;
            console.log("ENGINE_BOOT_SUCCESS!");
            if (guideBox && guideBox.querySelector('p')) {
                guideBox.querySelector('p').textContent = i18n[currentLang]["guide-ready"];
                guideBox.querySelector('p').style.color = "var(--neon-green)";
            }
        } catch (e) {
            console.error("ENGINE_BOOT_ERROR:", e);
            loadingRetryCount++;
            if (loadingRetryCount < 3) {
                console.log("Retrying engine load...");
                setTimeout(initEngine, 2000);
            } else {
                if (guideBox && guideBox.querySelector('p')) {
                    guideBox.querySelector('p').innerHTML = "보안 환경으로 인해 엔진 시동이 제한되었습니다. <br>시크릿 모드에서 다시 시도해 보세요!";
                    guideBox.querySelector('p').style.color = "#ff4444";
                }
            }
        }
    }

    // 4. 언어 전환
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

    // 5. 핵심 로직
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
        const crf = parseInt(compressionSlider.value);
        let qIdx = 0;
        if (crf <= 22) qIdx = 0;
        else if (crf <= 28) qIdx = 1;
        else if (crf <= 34) qIdx = 2;
        else qIdx = 3;

        qualityBadge.textContent = i18n[currentLang]["q-names"][qIdx];
        qualityDesc.textContent = i18n[currentLang]["q-descs"][qIdx];
        originalSizeDisplay.textContent = formatBytes(currentFile.size);
        const ratio = (100 - ((crf - 18) * 3)) / 100;
        estimatedSize.textContent = formatBytes(currentFile.size * Math.max(0.1, ratio));
    }

    // 6. 🚀 인코딩 가동!
    startBtn.addEventListener("click", async () => {
        if (!ffmpegLoaded) {
            alert("엔진 시동에 실패했거나 아직 로딩 중입니다. 새로고침 후 10초만 기다려 주세요!");
            return;
        }
        
        controlsPanel.classList.add("hidden");
        statusPanel.classList.remove("hidden");
        finalResultBox.classList.add("hidden"); 
        progressBar.style.width = "20%"; 
        
        const { fetchFile } = FFmpeg;
        const crfValue = Math.max(18, Math.min(51, 58 - compressionSlider.value));

        try {
            await ffmpeg.writeFile("input.mp4", await fetchFile(currentFile));
            statusText.textContent = "가속 인코딩 개시 (초광속 모드)...";

            await ffmpeg.exec([
                '-i', 'input.mp4',
                '-vcodec', 'libx264',
                '-crf', crfValue.toString(),
                '-preset', 'veryfast',
                'output.mp4'
            ]);

            const data = await ffmpeg.readFile('output.mp4');
            const resultUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
            
            progressBar.style.width = "100%";
            statusText.classList.add("hidden");
            
            realDlLink.href = resultUrl;
            realDlLink.setAttribute("download", `RenderJet_${currentFile.name}`);
            realDlLink.textContent = i18n[currentLang]["dl-finish"];
            
            finalResultBox.classList.remove("hidden"); // 대망의 버튼 등장!

        } catch (e) {
            console.error(e);
            statusText.textContent = "가공 실패: 브라우저가 연산을 중단했습니다.";
            statusText.style.color = "red";
        }
    });

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

    // 자동 시동!
    initEngine();
    setLanguage("ko");
});
