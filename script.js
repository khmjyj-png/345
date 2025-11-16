// 🔗 1) 여기 안에 "웹 앱 URL" 을 붙여 넣으세요.
// 예시: "https://script.google.com/macros/s/AKfycbw12345.../exec"
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwnVdSO-GlCGJOALNq1akmxTRjnGGfXUi2jtZAlVQf4GPBSb_PZWROvupyFXmytbujW/exec";

// DOM 요소들 가져오기
const levelButtons = document.querySelectorAll(".level-btn");
const submitBtn = document.getElementById("submit-btn");
const avgDisplay = document.getElementById("avg");
const countDisplay = document.getElementById("count");
const thermoFill = document.getElementById("thermo-fill");
const statusText = document.getElementById("status-text");
const missionText = document.getElementById("mission-text");
const emotionLog = document.getElementById("emotion-log");

let selectedLevel = null;

// 2) 레벨 버튼 클릭 시 선택 표시
levelButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    levelButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedLevel = Number(btn.dataset.level);
  });
});

// 3) 제출 버튼 클릭 시 실행
submitBtn.addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const keywords = document.getElementById("keywords").value.trim();

  if (!selectedLevel) {
    alert("기분 점수(1~5)를 선택해주세요!");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("name", name);
  formData.append("level", String(selectedLevel));
  formData.append("keywords", keywords);

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.result === "success") {
      showToast("✅ 제출 완료!");
      // 입력값 비우기
      // document.getElementById("name").value = "";
      document.getElementById("keywords").value = "";
      levelButtons.forEach((b) => b.classList.remove("selected"));
      selectedLevel = null;

      // 최신 데이터 다시 불러오기
      fetchAndDisplayData();
    } else {
      alert("저장 실패: " + (data.message || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
});

// 4) 오늘(KST) 데이터만 불러와서 표시
async function fetchAndDisplayData() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getAllData`);
    const allData = await res.json();

    // 구글 시트에서 온 데이터 형식 예시:
    // { timestamp: ..., name: ..., level: 3, keywords: "..." }

    // ✅ 한국 시간(KST) 기준 '오늘 날짜'만 필터링
    const todayKSTString = new Date().toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
    });

    const todaysData = allData.filter((entry) => {
      const d = new Date(entry.timestamp);
      const dKST = d.toLocaleDateString("ko-KR", {
        timeZone: "Asia/Seoul",
      });
      return dKST === todayKSTString;
    });

    updateDisplay(todaysData);
  } catch (err) {
    console.error("데이터 로딩 오류:", err);
    statusText.textContent = "데이터를 불러오는 데 문제가 발생했습니다.";
  }
}

// 5) 화면에 평균, 온도계, 상태 문구, 로그 업데이트
function updateDisplay(data) {
  if (!data || data.length === 0) {
    countDisplay.textContent = "0";
    avgDisplay.textContent = "0.0";
    thermoFill.style.height = "0%";
    statusText.textContent = "아직 오늘 기록이 없습니다.";
    missionText.textContent = "오늘의 첫 체크인을 남겨보세요!";
    emotionLog.innerHTML = "";
    return;
  }

  const count = data.length;
  const totalLevel = data.reduce((sum, entry) => sum + Number(entry.level || 0), 0);
  const avg = totalLevel / count;

  countDisplay.textContent = String(count);
  avgDisplay.textContent = avg.toFixed(1);

  // 1~5 점수를 0~100%로 변환 (1점 = 0%, 5점 = 100%)
  const fillPercent = ((avg - 1) / 4) * 100;
  const clamped = Math.max(0, Math.min(100, fillPercent));
  thermoFill.style.height = `${clamped}%`;

  // 평균에 따른 상태 문구
  let statusMsg = `오늘 ${count}명이 참여했어요. 평균 ${avg.toFixed(1)}점`;
  let missionMsg = "";

  if (avg >= 4) {
    statusMsg += " 😊 분위기가 아주 좋네요!";
    missionMsg = "✨ 미션: 옆 친구에게 칭찬 한 마디 건네보기";
  } else if (avg >= 2.5) {
    statusMsg += " 🙂 무난한 하루예요.";
    missionMsg = "🤝 미션: 오늘 나에게 고마웠던 일 한 가지 떠올려보기";
  } else {
    statusMsg += " 🫤 오늘 컨디션이 조금 내려가 있네요.";
    missionMsg = "🙏 미션: 깊게 숨 들이쉬고 10초 동안 눈을 감고 쉬어보기";
  }

  statusText.textContent = statusMsg;
  missionText.textContent = missionMsg;

  // 최근 5개의 오늘 응답만 로그에 표시 (최신이 위로 오게)
  const latest5 = data.slice(-5).reverse();
  emotionLog.innerHTML = latest5
    .map((entry) => {
      const timeStr = new Date(entry.timestamp).toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
      });
      const name = entry.name || "익명";
      const level = entry.level || "?";
      const keywords = entry.keywords || "";
      return `<li>[${timeStr}] ${name}: ${level}점${keywords ? ` (키워드: ${keywords})` : ""}</li>`;
    })
    .join("");
}

// 6) 토스트 메시지 (아래 초록박스 잠깐 뜨는 것)
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// 페이지 처음 열릴 때 오늘 데이터 한 번 불러오기
fetchAndDisplayData();
