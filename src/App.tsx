/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CostCardSpec,
  DifficultyId,
  GameState,
  GardenState,
  ModuleTypeId,
  PlanetId,
  ScenarioId,
} from './types/game';
import {
  createInitialState,
  simulateTick,
  placeModule,
  toggleModule,
  upgradeModuleRegolith,
  cleanSolarPanels,
  orderCrewStormShelter,
  unlockTechnology,
  updateTimeCompression,
  launchRoverExpedition,
  sendMissionControlMessage,
  resolveCrisisPuzzle,
  updateGardenSettings,
  submitPriorityBoard,
} from './game/simulation';
import { MODULE_CATALOG, SCENARIOS } from './game/modulesData';
import { TechId } from './game/researchData';
import { DONKI_CATALOG, DonkiFlareRecord, evaluateSolarFlareRisk } from './game/spaceWeatherData';
import {
  TUTORIAL_STEPS,
  TutorialState,
  advanceTutorialTick,
  createTutorialState,
  goToTutorialStep,
  hasCompletedFirstMissionTutorial,
  markFirstMissionTutorialCompleted,
  recordTutorialModulePlacement,
  restartTutorial,
  skipTutorial,
} from './game/tutorialData';
import { sound } from './game/audio';
import { OutpostScene } from './three/OutpostScene';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { GameOverModal, PauseModal, VictoryModal } from './components/Modals';
import { MissionDebrief } from './components/MissionDebrief';
import { TutorialOverlay } from './components/TutorialOverlay';
import { DataSourcesModal } from './components/DataSourcesModal';
import { CoopClassroomModal } from './components/CoopClassroomModal';
import { GlossaryModal } from './components/GlossaryPopover';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OutpostScene | null>(null);

  const initialScenario: ScenarioId = (() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('scenario') as ScenarioId | null;
      if (param && param in SCENARIOS) return param;
    }
    return 'lunar_night';
  })();

  const initialPlanet: PlanetId = (() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('site');
      if (p === 'moon' || p === 'mars') return p;
    }
    return SCENARIOS[initialScenario].planet;
  })();

  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>(initialScenario);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetId>(initialPlanet);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('astronaut');
  const [selectedDataMode, setSelectedDataMode] = useState<'ARCHIVED' | 'LIVE'>('ARCHIVED');
  const [selectedTargetSessionMinutes, setSelectedTargetSessionMinutes] = useState<number>(30);
  const [activePlacementType, setActivePlacementType] = useState<ModuleTypeId | null>(null);
  const [pendingCostCard, setPendingCostCard] = useState<CostCardSpec | null>(null);
  const [pendingAction, setPendingAction] = useState<
    { type: 'build'; moduleId: ModuleTypeId } | { type: 'rover' } | null
  >(null);

  const [isMissionLogOpen, setIsMissionLogOpen] = useState(false);
  const [isResearchTreeOpen, setIsResearchTreeOpen] = useState(false);
  const [isEndgameDebriefOpen, setIsEndgameDebriefOpen] = useState(false);
  const [titleModal, setTitleModal] = useState<'sources' | 'coop' | 'glossary' | null>(null);

  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(initialScenario, initialPlanet, {
      targetSessionMinutes: 30,
      difficulty: 'astronaut',
      dataMode: 'ARCHIVED',
    })
  );
  const [tutorialState, setTutorialState] = useState<TutorialState>(() =>
    createTutorialState(false)
  );

  const stateRef = useRef<GameState>(gameState);
  stateRef.current = gameState;
  const tutorialStateRef = useRef<TutorialState>(tutorialState);
  tutorialStateRef.current = tutorialState;
  const activePlacementTypeRef = useRef<ModuleTypeId | null>(activePlacementType);
  activePlacementTypeRef.current = activePlacementType;

  const toggleMissionLog = useCallback(() => {
    sound.playClick();
    setIsMissionLogOpen((prev) => !prev);
  }, []);

  const toggleResearchTree = useCallback(() => {
    sound.playClick();
    setIsResearchTreeOpen((prev) => !prev);
  }, []);

  const unlockTech = useCallback((techId: TechId) => {
    setGameState((prev) => {
      const res = unlockTechnology(prev, techId);
      if (res.success) {
        sound.playBuild();
        return res.state;
      }
      return prev;
    });
  }, []);

  const syncLiveDonkiIfSelected = useCallback(async (mode: 'ARCHIVED' | 'LIVE') => {
    if (mode !== 'LIVE') return;
    try {
      const resp = await fetch('/api/donki?live=1&endpoint=FLR');
      const data = await resp.json();
      const first = data?.events?.[0] as DonkiFlareRecord | undefined;
      if (first) {
        const badge = data.mode === 'LIVE' || data.source === 'LIVE' ? 'LIVE' : 'ARCHIVED';
        setGameState((prev) => ({
          ...prev,
          dataMode: badge,
          environment: {
            ...prev.environment,
            solarFlareTelemetry: evaluateSolarFlareRisk(
              prev.scenario,
              prev.environment.solNumber,
              prev.environment.solTime,
              prev.environment.solarFlareActive,
              prev.environment.solarFlareTimeRemainingSec,
              badge,
              first
            ),
          },
        }));
      }
    } catch {
      // Fallback safely to bundled ARCHIVED DONKI catalog
    }
  }, []);

  const startGame = useCallback(() => {
    sound.startAmbience();
    sound.playClick();
    setTitleModal(null);
    setGameState(() => ({
      ...createInitialState(selectedScenario, selectedPlanet, {
        targetSessionMinutes: selectedTargetSessionMinutes,
        difficulty: selectedDifficulty,
        dataMode: selectedDataMode,
      }),
      phase: 'playing',
      paused: false,
    }));
    syncLiveDonkiIfSelected(selectedDataMode);
    if (!hasCompletedFirstMissionTutorial()) {
      setTutorialState((prev) => restartTutorial(prev));
    }
  }, [
    selectedScenario,
    selectedPlanet,
    selectedTargetSessionMinutes,
    selectedDifficulty,
    selectedDataMode,
    syncLiveDonkiIfSelected,
  ]);

  const handleTutorialNext = useCallback(() => {
    sound.playClick();
    setTutorialState((prev) => {
      if (prev.currentStepIndex >= TUTORIAL_STEPS.length - 1) {
        markFirstMissionTutorialCompleted();
        return skipTutorial(prev);
      }
      return goToTutorialStep(prev, prev.currentStepIndex + 1);
    });
  }, []);

  const handleTutorialPrev = useCallback(() => {
    sound.playClick();
    setTutorialState((prev) => goToTutorialStep(prev, prev.currentStepIndex - 1));
  }, []);

  const handleTutorialSelectStep = useCallback((stepIndex: number) => {
    sound.playClick();
    setTutorialState((prev) => goToTutorialStep(prev, stepIndex));
  }, []);

  const handleTutorialSkip = useCallback(() => {
    sound.playClick();
    markFirstMissionTutorialCompleted();
    setTutorialState((prev) => skipTutorial(prev));
  }, []);

  const handleTutorialRestart = useCallback(() => {
    sound.playClick();
    setTutorialState((prev) => restartTutorial(prev));
  }, []);

  const togglePause = useCallback(() => {
    sound.playClick();
    setGameState((prev) => ({
      ...prev,
      paused: !prev.paused,
      phase: prev.paused ? 'playing' : 'paused',
    }));
  }, []);

  const setTimeSpeed = useCallback((speed: 1 | 2 | 5 | 10) => {
    sound.playClick();
    setGameState((prev) => ({
      ...prev,
      paused: false,
      phase: prev.phase === 'paused' ? 'playing' : prev.phase,
      timeSpeed: speed,
    }));
  }, []);

  const changeTimeCompression = useCallback((targetSessionMinutes: number, missionDaysOverride?: number) => {
    sound.playClick();
    setSelectedTargetSessionMinutes(targetSessionMinutes);
    setGameState((prev) => updateTimeCompression(prev, targetSessionMinutes, missionDaysOverride));
  }, []);

  const toggleAudio = useCallback(() => {
    const nextMuted = !sound.isMuted();
    sound.setMuted(nextMuted);
    setGameState((prev) => ({ ...prev, audioMuted: nextMuted }));
  }, []);

  const toggleAriaVoice = useCallback(() => {
    sound.playClick();
    setGameState((prev) => ({ ...prev, ariaVoiceEnabled: !prev.ariaVoiceEnabled }));
  }, []);

  const askMissionControl = useCallback(() => {
    sound.playClick();
    setGameState((prev) =>
      sendMissionControlMessage(prev, 'Mission Control, send latest orbital weather and power telemetry.')
    );
  }, []);

  const startPlacement = useCallback((typeId: ModuleTypeId | null) => {
    sound.playClick();
    setActivePlacementType(typeId);
    sceneRef.current?.setPlacementMode(typeId);
  }, []);

  const openModuleCostCard = useCallback((typeId: ModuleTypeId) => {
    sound.playClick();
    const def = MODULE_CATALOG[typeId];
    setPendingAction({ type: 'build', moduleId: typeId });
    setPendingCostCard({
      id: typeId,
      title: `Build ${def.name}`,
      subtitle: def.description,
      gain: def.gainSummary,
      pay: def.paySummary,
      risk: def.riskSummary,
      buildTimeSols: def.buildTimeSols,
      regolithCost: def.buildCost.regolithKg,
      metalCost: def.buildCost.metalKg,
    });
  }, []);

  const openRoverCostCard = useCallback(() => {
    sound.playClick();
    setPendingAction({ type: 'rover' });
    setPendingCostCard({
      id: 'rover_trip',
      title: 'Launch Rover Exploration Trip',
      subtitle: 'Drive the outpost rover to nearby craters for ice, metal, regolith, and science samples.',
      gain: '+95 kg Metal, +130 kg Regolith, +22 L Water Ice, +16 Science Points',
      pay: '-8 kg Oxygen (O₂), -18 kWh Battery',
      risk: 'Uses breathable Oxygen and Battery. Radiation exposure adds +14 mSv during High Solar Flare Risk.',
      oxygenCost: 8,
      batteryCost: 18,
    });
  }, []);

  const confirmCostCard = useCallback(() => {
    if (!pendingAction) return;
    if (pendingAction.type === 'build') {
      const modId = pendingAction.moduleId;
      setPendingCostCard(null);
      setPendingAction(null);
      startPlacement(modId);
      return;
    }

    if (pendingAction.type === 'rover') {
      setGameState((prev) => {
        const res = launchRoverExpedition(prev);
        if (res.success) {
          sound.playBuild();
          return res.state;
        }
        return { ...prev, ariaMessage: res.reason || prev.ariaMessage };
      });
      setPendingCostCard(null);
      setPendingAction(null);
    }
  }, [pendingAction, startPlacement]);

  const cancelCostCard = useCallback(() => {
    sound.playClick();
    setPendingCostCard(null);
    setPendingAction(null);
  }, []);

  const selectModule = useCallback((instanceId: string | null) => {
    setGameState((prev) => ({ ...prev, selectedModuleId: instanceId }));
  }, []);

  const toggleModuleActive = useCallback((instanceId: string) => {
    sound.playClick();
    setGameState((prev) => toggleModule(prev, instanceId));
  }, []);

  const upgradeRegolith = useCallback((instanceId: string) => {
    setGameState((prev) => {
      const res = upgradeModuleRegolith(prev, instanceId);
      if (res.success) {
        sound.playBuild();
        return res.state;
      }
      return prev;
    });
  }, []);

  const cleanPanels = useCallback(() => {
    sound.playWhoosh();
    setGameState((prev) => cleanSolarPanels(prev));
  }, []);

  const orderBunker = useCallback((inShelter: boolean) => {
    sound.playAlarm();
    setGameState((prev) => orderCrewStormShelter(prev, inShelter));
  }, []);

  const handleResolveCrisis = useCallback((crisisId: string, solved: boolean) => {
    sound.playBuild();
    setGameState((prev) => resolveCrisisPuzzle(prev, crisisId, solved));
  }, []);

  const handleUpdateGarden = useCallback((patch: Partial<GardenState>) => {
    sound.playClick();
    setGameState((prev) => updateGardenSettings(prev, patch));
  }, []);

  const handleSubmitPriority = useCallback((orderedIds: string[]) => {
    sound.playBuild();
    setGameState((prev) => submitPriorityBoard(prev, orderedIds));
  }, []);

  const handleApplyLiveDonki = useCallback(
    (rec: DonkiFlareRecord | null, sourceBadge: 'LIVE' | 'ARCHIVED') => {
      setGameState((prev) => ({
        ...prev,
        dataMode: sourceBadge,
        environment: {
          ...prev.environment,
          solarFlareTelemetry: evaluateSolarFlareRisk(
            prev.scenario,
            prev.environment.solNumber,
            prev.environment.solTime,
            prev.environment.solarFlareActive,
            prev.environment.solarFlareTimeRemainingSec,
            sourceBadge,
            rec
          ),
        },
      }));
    },
    []
  );

  const handleTriggerTeacherFlareDrill = useCallback(() => {
    sound.playAlarm();
    setGameState((prev) => ({
      ...prev,
      paused: true,
      activeCrisis: {
        id: `teacher_flare_${Date.now()}`,
        puzzleType: 'solar_flare',
        title: 'Classroom Solar Flare Drill (AR 3664)',
        triggerSol: prev.environment.solNumber,
        warningLeadSols: 0,
        donkiEventId: DONKI_CATALOG.high_ar3664.donkiEventId,
        donkiDate: DONKI_CATALOG.high_ar3664.date,
        donkiClass: DONKI_CATALOG.high_ar3664.flareClass,
        sourceBadge: prev.dataMode,
        resolved: false,
      },
    }));
  }, []);

  const restartCurrentMission = useCallback(() => {
    sound.playClick();
    setGameState((prev) => ({
      ...createInitialState(prev.scenario, prev.planet, {
        targetSessionMinutes: prev.timeCompression?.targetSessionMinutes || 30,
        missionDays: prev.targetSols,
        difficulty: prev.difficulty,
        dataMode: prev.dataMode,
      }),
      phase: 'playing',
      paused: false,
    }));
  }, []);

  const returnToTitle = useCallback(() => {
    sound.playClick();
    setGameState((prev) => ({ ...prev, phase: 'title', paused: false }));
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new OutpostScene(mountRef.current, {
      onSelectModule: (instanceId) => {
        sound.playClick();
        setGameState((prev) => ({ ...prev, selectedModuleId: instanceId }));
      },
      onPlaceAtGrid: (gridX, gridZ) => {
        const curPlacement = activePlacementTypeRef.current;
        if (!curPlacement) return;

        setGameState((prev) => {
          const res = placeModule(prev, curPlacement, gridX, gridZ, { useBuildTime: true });
          if (res.success) {
            sound.playBuild();
            setActivePlacementType(null);
            sceneRef.current?.setPlacementMode(null);
            if (tutorialStateRef.current.active) {
              setTutorialState((t) => recordTutorialModulePlacement(t));
            }
            return res.state;
          }
          return prev;
        });
      },
    });

    sceneRef.current = scene;
    scene.updateState(stateRef.current);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('autostart') === '1') {
        startGame();
      }
    }

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, [startGame]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateState(gameState);
    }
    document.body.dataset.state = gameState.phase;
  }, [gameState]);

  useEffect(() => {
    if (gameState.phase === 'victory' || gameState.phase === 'gameover') {
      setIsEndgameDebriefOpen(true);
    } else {
      setIsEndgameDebriefOpen(false);
    }
  }, [gameState.phase]);

  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (stateRef.current.phase === 'playing' && !stateRef.current.paused) {
        setGameState((prev) => simulateTick(prev, dt));
        if (tutorialStateRef.current.active) {
          setTutorialState((prev) => {
            const pauseTutorial =
              activePlacementTypeRef.current !== null && prev.currentStepIndex === 1;
            const next = advanceTutorialTick(prev, dt, pauseTutorial);
            if (!prev.completed && next.completed) {
              markFirstMissionTutorialCompleted();
            }
            return next;
          });
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (stateRef.current.phase === 'title') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          startGame();
        }
      } else if (stateRef.current.phase === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          togglePause();
        } else if (e.code === 'KeyM') {
          toggleAudio();
        } else if (e.code === 'KeyL') {
          e.preventDefault();
          toggleMissionLog();
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          toggleResearchTree();
        } else if (e.code === 'Digit1') {
          setTimeSpeed(1);
        } else if (e.code === 'Digit2') {
          setTimeSpeed(2);
        } else if (e.code === 'Digit5') {
          setTimeSpeed(5);
        } else if (e.code === 'Digit0') {
          setTimeSpeed(10);
        }
      } else if (stateRef.current.phase === 'paused') {
        if (e.code === 'Escape' || e.code === 'Space' || e.code === 'KeyP') {
          e.preventDefault();
          togglePause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame, togglePause, toggleAudio, toggleMissionLog, toggleResearchTree, setTimeSpeed]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07080d]">
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {gameState.phase === 'title' && (
        <>
          <TitleScreen
            selectedScenario={selectedScenario}
            selectedPlanet={selectedPlanet}
            selectedDifficulty={selectedDifficulty}
            selectedDataMode={selectedDataMode}
            selectedTargetSessionMinutes={selectedTargetSessionMinutes}
            onSelectScenario={(scen) => {
              setSelectedScenario(scen);
              setSelectedPlanet(SCENARIOS[scen].planet);
              sound.playClick();
            }}
            onSelectPlanet={(pl) => {
              setSelectedPlanet(pl);
              sound.playClick();
            }}
            onSelectDifficulty={(diff) => {
              setSelectedDifficulty(diff);
              sound.playClick();
            }}
            onSelectDataMode={(m) => {
              setSelectedDataMode(m);
              sound.playClick();
            }}
            onSelectTargetSessionMinutes={(mins) => {
              setSelectedTargetSessionMinutes(mins);
              sound.playClick();
            }}
            onOpenSources={() => setTitleModal('sources')}
            onOpenCoop={() => setTitleModal('coop')}
            onOpenGlossary={() => setTitleModal('glossary')}
            onStartGame={startGame}
          />
          <DataSourcesModal
            state={gameState}
            isOpen={titleModal === 'sources'}
            onClose={() => setTitleModal(null)}
            onApplyLiveDonki={handleApplyLiveDonki}
          />
          <CoopClassroomModal
            isOpen={titleModal === 'coop'}
            onClose={() => setTitleModal(null)}
          />
          <GlossaryModal
            isOpen={titleModal === 'glossary'}
            onClose={() => setTitleModal(null)}
          />
        </>
      )}

      {gameState.phase !== 'title' && (
        <HUD
          state={gameState}
          pendingCostCard={pendingCostCard}
          onConfirmCostCard={confirmCostCard}
          onCancelCostCard={cancelCostCard}
          onOpenModuleCostCard={openModuleCostCard}
          onOpenRoverCostCard={openRoverCostCard}
          onSetTimeSpeed={setTimeSpeed}
          onUpdateTimeCompression={changeTimeCompression}
          onTogglePause={togglePause}
          onToggleAudio={toggleAudio}
          onToggleAriaVoice={toggleAriaVoice}
          onAskMissionControl={askMissionControl}
          onStartPlacement={startPlacement}
          activePlacementType={activePlacementType}
          onSelectModule={selectModule}
          onToggleModuleActive={toggleModuleActive}
          onUpgradeRegolith={upgradeRegolith}
          onCleanPanels={cleanPanels}
          onOrderBunker={orderBunker}
          onResolveCrisis={handleResolveCrisis}
          onUpdateGarden={handleUpdateGarden}
          onSubmitPriority={handleSubmitPriority}
          onApplyLiveDonki={handleApplyLiveDonki}
          onTriggerTeacherFlareDrill={handleTriggerTeacherFlareDrill}
          isMissionLogOpen={isMissionLogOpen}
          onToggleMissionLog={toggleMissionLog}
          isResearchTreeOpen={isResearchTreeOpen}
          onToggleResearchTree={toggleResearchTree}
          onUnlockTech={unlockTech}
          tutorialActiveStepId={
            tutorialState.active
              ? TUTORIAL_STEPS[tutorialState.currentStepIndex]?.id ?? null
              : null
          }
          onRestartTutorial={handleTutorialRestart}
        />
      )}

      {gameState.phase === 'playing' && !gameState.activeCrisis && (
        <TutorialOverlay
          tutorialState={tutorialState}
          activePlacementType={activePlacementType}
          isPaused={gameState.paused}
          onNextStep={handleTutorialNext}
          onPrevStep={handleTutorialPrev}
          onSelectStep={handleTutorialSelectStep}
          onSkip={handleTutorialSkip}
        />
      )}

      {gameState.phase === 'paused' && !gameState.activeCrisis && (
        <PauseModal
          onResume={togglePause}
          onRestart={restartCurrentMission}
          onReturnToTitle={returnToTitle}
        />
      )}

      {gameState.phase === 'victory' && (
        <VictoryModal
          state={gameState}
          onPlayAgain={restartCurrentMission}
          onReturnToTitle={returnToTitle}
          onOpenDebrief={() => setIsEndgameDebriefOpen(true)}
        />
      )}

      {gameState.phase === 'gameover' && (
        <GameOverModal
          state={gameState}
          onPlayAgain={restartCurrentMission}
          onReturnToTitle={returnToTitle}
          onOpenDebrief={() => setIsEndgameDebriefOpen(true)}
        />
      )}

      {(gameState.phase === 'victory' || gameState.phase === 'gameover') && (
        <MissionDebrief
          state={gameState}
          mode="modal"
          isOpen={isEndgameDebriefOpen}
          onClose={() => setIsEndgameDebriefOpen(false)}
          realPlannerAnswerOverride={
            gameState.phase === 'victory'
              ? 'NASA mission planners balance backup nuclear power (Kilopower), closed-loop water recycling, and Storm Shelters so solar storms or dust storms do not threaten the crew.'
              : gameState.resources.oxygenKg <= 0.5
              ? 'When batteries hit 0%, water electrolysis shuts off and stops making O₂. Keep Power positive first.'
              : gameState.resources.waterLiters <= 0.5
              ? 'Even 95% water recycling needs ice refills or fewer heavy consumers when Greenhouse water demand grows.'
              : gameState.crew.radiationDoseMsv > 260
              ? 'Real NASA crews shelter behind water walls or sintered regolith domes as soon as DONKI detects a solar flare.'
              : 'Build backup Kilopower or Battery Banks early so Oxygen recycling stays steady during nights or dust storms.'
          }
          tryNextTipOverride={
            gameState.phase === 'victory'
              ? 'Try Mars or Commander difficulty next to manage 3 to 22 minute Earth radio delays and tighter resource buffers.'
              : gameState.resources.oxygenKg <= 0.5
              ? 'Add a Battery Bank or Kilopower Backup before expanding heavy modules.'
              : gameState.resources.waterLiters <= 0.5
              ? 'Use Aeroponic Mist in the Garden Guide (95% less water) and send Rover ice trips.'
              : gameState.crew.radiationDoseMsv > 260
              ? 'Select Bunker Crew as soon as the flare risk badge turns amber or red.'
              : 'Respond to Chain-Reaction warnings early and build a Greenhouse before rations run low.'
          }
        />
      )}
    </div>
  );
}
