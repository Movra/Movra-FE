import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ChangeEvent,
  type FormEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Navigate } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.png";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import { getHomeToday } from "../features/core-loop/api";
import type { FriendAccountability, HomeToday } from "../features/core-loop/types";
import {
  createFutureVision,
  updateWeeklyFutureVision,
  updateYearlyFutureVision,
} from "../features/planning-support/api";
import { ApiClientError } from "../shared/api/client";
import styles from "./FutureVisionPage.module.css";

type VisionTab = "yearly" | "weekly";
type DrawTool = "pen" | "eraser";
type VisionImages = Record<VisionTab, string | null>;
type VisionDirtyState = Record<VisionTab, boolean>;
type VisionHistory = Record<VisionTab, string[]>;

const homeTodayKey = ["home-today"] as const;
const canvasWidth = 960;
const canvasHeight = 540;
const visionTabs: Array<{ helper: string; label: string; value: VisionTab }> = [
  {
    helper: "내가 이루고 싶은 한 해의 모습을 그립니다.",
    label: "연간 목표",
    value: "yearly",
  },
  {
    helper: "이번 주에 집중할 한 걸음을 그립니다.",
    label: "주간 목표",
    value: "weekly",
  },
];
const colorOptions = ["#1f4a30", "#2f9e5b", "#4f83cc", "#d95c51", "#f1a53a"];

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "요청 처리에 실패했습니다.";
}

function formatExamDistance(daysUntil: number) {
  if (daysUntil === 0) {
    return "D-Day";
  }

  return daysUntil > 0 ? `D-${daysUntil}` : `D+${Math.abs(daysUntil)}`;
}

function getNextExamLabel(home: HomeToday) {
  return home.nextExamSchedule
    ? `${home.nextExamSchedule.title} ${formatExamDistance(
        home.nextExamSchedule.daysUntil,
      )}`
    : "목표 설정 전";
}

function getFriendAccountabilityText(
  friendAccountability: FriendAccountability | null,
) {
  if (!friendAccountability?.relationCreated) {
    return "연결된 친구 없음";
  }

  if (friendAccountability.watchedByFriend && friendAccountability.watchingFriend) {
    return "서로 진행 상황 공유 중";
  }

  if (friendAccountability.watchedByFriend) {
    return "친구가 나를 지켜보는 중";
  }

  if (friendAccountability.watchingFriend) {
    return "내가 친구를 지켜보는 중";
  }

  return friendAccountability.inviteCodeStatus ?? "친구 연결 대기 중";
}

function fillCanvasBackground(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*);base64/.exec(header)?.[1] ?? "image/png";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mime });
}

function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / (rect.width || canvas.width);
  const scaleY = canvas.height / (rect.height || canvas.height);

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export function FutureVisionPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<VisionTab>("yearly");
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState(colorOptions[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [yearlyVisionDescription, setYearlyVisionDescription] = useState("");
  const [visionImages, setVisionImages] = useState<VisionImages>({
    weekly: null,
    yearly: null,
  });
  const [dirtyState, setDirtyState] = useState<VisionDirtyState>({
    weekly: false,
    yearly: false,
  });
  const [history, setHistory] = useState<VisionHistory>({
    weekly: [],
    yearly: [],
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getHomeToday({ token }),
    queryKey: homeTodayKey,
  });

  const futureVision = homeQuery.data?.futureVision ?? null;
  const home = homeQuery.data;

  useEffect(() => {
    if (futureVision?.yearlyVisionDescription) {
      setYearlyVisionDescription(futureVision.yearlyVisionDescription);
    }
  }, [futureVision?.futureVisionId, futureVision?.yearlyVisionDescription]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    fillCanvasBackground(canvas);

    const dataUrl = visionImages[activeTab];
    if (!dataUrl) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = dataUrl;
  }, [activeTab, visionImages]);

  const loadingState = homeQuery.isLoading ? (
      <section className={styles.centerState} aria-live="polite">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <p>Future Vision을 불러오는 중입니다.</p>
      </section>
  ) : null;

  const errorState = homeQuery.isError ? (
      <section className={styles.centerState} aria-live="assertive">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <h1>Future Vision을 불러오지 못했습니다.</h1>
        <p>{getErrorMessage(homeQuery.error)}</p>
        <button onClick={() => homeQuery.refetch()} type="button">
          다시 시도
        </button>
      </section>
  ) : null;

  function commitCanvasImage(tab: VisionTab) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return visionImages[tab];
    }

    const dataUrl = canvas.toDataURL("image/png");
    setVisionImages((current) => ({ ...current, [tab]: dataUrl }));
    return dataUrl;
  }

  function setTab(nextTab: VisionTab) {
    commitCanvasImage(activeTab);
    setActiveTab(nextTab);
  }

  function saveHistorySnapshot(tab: VisionTab) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const snapshot = canvas.toDataURL("image/png");
    setHistory((current) => ({
      ...current,
      [tab]: [...current[tab].slice(-9), snapshot],
    }));
  }

  function markDirty(tab: VisionTab) {
    const dataUrl = commitCanvasImage(tab);

    if (!dataUrl) {
      return;
    }

    setDirtyState((current) => ({ ...current, [tab]: true }));
  }

  function drawLine(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    const context = canvasRef.current?.getContext("2d");

    if (!context) {
      return;
    }

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushSize;
    context.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.globalCompositeOperation = "source-over";
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    saveHistorySnapshot(activeTab);
    const point = getCanvasPoint(event);
    drawingRef.current = true;
    lastPointRef.current = point;
    drawLine(point, point);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) {
      return;
    }

    const point = getCanvasPoint(event);
    drawLine(lastPointRef.current, point);
    lastPointRef.current = point;
  }

  function finishDrawing() {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;
    lastPointRef.current = null;
    markDirty(activeTab);
  }

  function handleClearCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    saveHistorySnapshot(activeTab);
    fillCanvasBackground(canvas);
    markDirty(activeTab);
  }

  function handleUndo() {
    const snapshots = history[activeTab];
    const previousSnapshot = snapshots[snapshots.length - 1];

    if (!previousSnapshot) {
      return;
    }

    setHistory((current) => ({
      ...current,
      [activeTab]: current[activeTab].slice(0, -1),
    }));
    setVisionImages((current) => ({ ...current, [activeTab]: previousSnapshot }));
    setDirtyState((current) => ({ ...current, [activeTab]: true }));
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setVisionImages((current) => ({ ...current, [activeTab]: dataUrl }));
      setDirtyState((current) => ({ ...current, [activeTab]: true }));
    };
    reader.readAsDataURL(file);
  }

  function getVisionFiles() {
    const activeDataUrl = commitCanvasImage(activeTab);
    const nextImages = {
      ...visionImages,
      [activeTab]: activeDataUrl ?? visionImages[activeTab],
    };

    if (!nextImages.weekly || !nextImages.yearly) {
      throw new Error("연간 목표와 주간 목표 그림을 모두 완성해주세요.");
    }

    return {
      weeklyVisionImage: dataUrlToFile(
        nextImages.weekly,
        "weekly-future-vision.png",
      ),
      yearlyVisionImage: dataUrlToFile(
        nextImages.yearly,
        "yearly-future-vision.png",
      ),
    };
  }

  function getActiveFile() {
    const dataUrl = commitCanvasImage(activeTab) ?? visionImages[activeTab];

    if (!dataUrl) {
      throw new Error("저장할 그림을 먼저 그려주세요.");
    }

    return dataUrlToFile(dataUrl, `${activeTab}-future-vision.png`);
  }

  async function refreshHome() {
    await queryClient.invalidateQueries({ queryKey: homeTodayKey });
  }

  const createVisionMutation = useMutation({
    mutationFn: () => {
      const files = getVisionFiles();
      return createFutureVision({
        token,
        values: {
          ...files,
          yearlyVisionDescription: yearlyVisionDescription.trim(),
        },
      });
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("Future Vision을 저장했습니다.");
      setDirtyState({ weekly: false, yearly: false });
      await refreshHome();
    },
  });

  const updateWeeklyMutation = useMutation({
    mutationFn: () =>
      updateWeeklyFutureVision({
        token,
        weeklyVisionImage: getActiveFile(),
      }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("주간 Future Vision을 수정했습니다.");
      setDirtyState((current) => ({ ...current, weekly: false }));
      await refreshHome();
    },
  });

  const updateYearlyMutation = useMutation({
    mutationFn: () =>
      updateYearlyFutureVision({
        token,
        yearlyVisionDescription: yearlyVisionDescription.trim(),
        yearlyVisionImage: getActiveFile(),
      }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("연간 Future Vision을 수정했습니다.");
      setDirtyState((current) => ({ ...current, yearly: false }));
      await refreshHome();
    },
  });

  if (loadingState) {
    return loadingState;
  }

  if (errorState) {
    return errorState;
  }

  if (!home) {
    return null;
  }

  if (home.behaviorProfile === null) {
    return <Navigate to="/onboarding" replace />;
  }

  function handleCreateVision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!yearlyVisionDescription.trim()) {
      setActionError("연간 목표 설명을 입력해주세요.");
      return;
    }

    createVisionMutation.mutate();
  }

  function handleUpdateActiveVision() {
    if (activeTab === "weekly") {
      updateWeeklyMutation.mutate();
      return;
    }

    if (!yearlyVisionDescription.trim()) {
      setActionError("연간 목표 설명을 입력해주세요.");
      return;
    }

    updateYearlyMutation.mutate();
  }

  const activeTabInfo =
    visionTabs.find((tab) => tab.value === activeTab) ?? visionTabs[0];
  const friendText = getFriendAccountabilityText(home.friendAccountability);
  const profileSubtitle = getNextExamLabel(home);
  const canCreateVision =
    dirtyState.weekly &&
    dirtyState.yearly &&
    Boolean(yearlyVisionDescription.trim()) &&
    !createVisionMutation.isPending;
  const canUpdateActive =
    dirtyState[activeTab] &&
    (activeTab === "weekly" || Boolean(yearlyVisionDescription.trim())) &&
    !updateWeeklyMutation.isPending &&
    !updateYearlyMutation.isPending;

  return (
    <section className={styles.page} aria-labelledby="future-vision-title">
      <AppSidebar
        friendText={friendText}
        onLogout={logout}
        profileSubtitle={profileSubtitle}
      />

      <div className={styles.contentShell}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.kicker}>Future Vision</p>
            <h1 id="future-vision-title">내가 꿈꾸는 미래를 그려보세요.</h1>
            <p>생각하는 미래는 방향이 되고, 기록하는 순간 현실이 되기 시작해요.</p>
          </div>
          {futureVision ? (
            <span className={styles.savedBadge}>저장된 Vision 있음</span>
          ) : (
            <span className={styles.savedBadge}>첫 Vision 작성 중</span>
          )}
        </header>

        {actionError ? (
          <p className={styles.error} role="alert">
            {actionError}
          </p>
        ) : null}
        {actionNotice ? (
          <p className={styles.success} role="status">
            {actionNotice}
          </p>
        ) : null}

        <main className={styles.visionGrid}>
          <section className={styles.editorPanel} aria-labelledby="canvas-title">
            <div className={styles.tabList} role="tablist" aria-label="Vision 종류">
              {visionTabs.map((tab) => (
                <button
                  aria-selected={activeTab === tab.value}
                  className={
                    activeTab === tab.value ? styles.activeTab : styles.tabButton
                  }
                  key={tab.value}
                  onClick={() => setTab(tab.value)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={styles.canvasHeader}>
              <div>
                <h2 id="canvas-title">{activeTabInfo.label}</h2>
                <p>{activeTabInfo.helper}</p>
              </div>
              <div className={styles.toolGroup} aria-label="그림 도구">
                <button
                  aria-pressed={tool === "pen"}
                  className={tool === "pen" ? styles.activeTool : styles.toolButton}
                  onClick={() => setTool("pen")}
                  type="button"
                >
                  펜
                </button>
                <button
                  aria-pressed={tool === "eraser"}
                  className={
                    tool === "eraser" ? styles.activeTool : styles.toolButton
                  }
                  onClick={() => setTool("eraser")}
                  type="button"
                >
                  지우개
                </button>
              </div>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.swatches} aria-label="색상 선택">
                {colorOptions.map((option) => (
                  <button
                    aria-label={`${option} 색상`}
                    aria-pressed={color === option}
                    className={color === option ? styles.activeSwatch : styles.swatch}
                    key={option}
                    onClick={() => setColor(option)}
                    style={{ backgroundColor: option }}
                    type="button"
                  />
                ))}
              </div>
              <label className={styles.brushSlider}>
                굵기
                <input
                  max={28}
                  min={2}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                  type="range"
                  value={brushSize}
                />
                <span>{brushSize}px</span>
              </label>
              <label className={styles.uploadButton}>
                이미지 불러오기
                <input accept="image/*" onChange={handleImageUpload} type="file" />
              </label>
              <button
                className={styles.secondaryButton}
                disabled={history[activeTab].length === 0}
                onClick={handleUndo}
                type="button"
              >
                되돌리기
              </button>
              <button
                className={styles.secondaryButton}
                onClick={handleClearCanvas}
                type="button"
              >
                전체 지우기
              </button>
            </div>

            <div className={styles.canvasFrame}>
              <canvas
                aria-label={`${activeTabInfo.label} 그림판`}
                className={styles.canvas}
                height={canvasHeight}
                onPointerCancel={finishDrawing}
                onPointerDown={handlePointerDown}
                onPointerLeave={finishDrawing}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrawing}
                ref={canvasRef}
                width={canvasWidth}
              />
            </div>
          </section>

          <aside className={styles.sidePanel} aria-label="Vision 저장 정보">
            {futureVision ? (
              <section className={styles.previewCard}>
                <h2>저장된 Future Vision</h2>
                <div className={styles.previewImages}>
                  <figure>
                    <img
                      alt="저장된 연간 Future Vision"
                      src={futureVision.yearlyVisionImageUrl}
                    />
                    <figcaption>연간 목표</figcaption>
                  </figure>
                  <figure>
                    <img
                      alt="저장된 주간 Future Vision"
                      src={futureVision.weeklyVisionImageUrl}
                    />
                    <figcaption>주간 목표</figcaption>
                  </figure>
                </div>
                <p>{futureVision.yearlyVisionDescription}</p>
              </section>
            ) : (
              <section className={styles.previewCard}>
                <h2>아직 저장된 Vision이 없습니다.</h2>
                <p>연간 목표와 주간 목표를 모두 그린 뒤 저장하면 홈에서도 볼 수 있어요.</p>
              </section>
            )}

            <form className={styles.savePanel} onSubmit={handleCreateVision}>
              <label>
                연간 목표 설명
                <textarea
                  maxLength={100}
                  onChange={(event) =>
                    setYearlyVisionDescription(event.target.value)
                  }
                  placeholder="예: 원하는 대학에 합격하고 단단하게 성장하는 한 해"
                  value={yearlyVisionDescription}
                />
              </label>
              <small>{yearlyVisionDescription.length}/100</small>

              {futureVision ? (
                <button
                  className={styles.primaryButton}
                  disabled={!canUpdateActive}
                  onClick={handleUpdateActiveVision}
                  type="button"
                >
                  {activeTab === "weekly" ? "주간 저장" : "연간 저장"}
                </button>
              ) : (
                <button
                  className={styles.primaryButton}
                  disabled={!canCreateVision}
                  type="submit"
                >
                  Future Vision 저장
                </button>
              )}
            </form>
          </aside>
        </main>
      </div>
    </section>
  );
}
