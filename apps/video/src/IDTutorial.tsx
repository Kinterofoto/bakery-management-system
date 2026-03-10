import { Sequence } from "remotion";
import { IDIntro } from "./scenes/IDIntro";
import { IDCrearProyecto } from "./scenes/IDCrearProyecto";
import { IDMateriales } from "./scenes/IDMateriales";
import { IDOperaciones } from "./scenes/IDOperaciones";
import { IDCalidad } from "./scenes/IDCalidad";
import { IDPanelSensorial } from "./scenes/IDPanelSensorial";
import { IDCostos } from "./scenes/IDCostos";
import { IDOutro } from "./scenes/IDOutro";

// 30 fps, each scene duration in frames
const SCENES = [
  { component: IDIntro, duration: 150, name: "ID-Intro" },                    // 5s
  { component: IDCrearProyecto, duration: 240, name: "ID-CrearProyecto" },     // 8s
  { component: IDMateriales, duration: 270, name: "ID-Materiales" },           // 9s
  { component: IDOperaciones, duration: 270, name: "ID-Operaciones" },         // 9s
  { component: IDCalidad, duration: 240, name: "ID-Calidad" },                // 8s
  { component: IDPanelSensorial, duration: 300, name: "ID-PanelSensorial" },  // 10s
  { component: IDCostos, duration: 270, name: "ID-Costos" },                  // 9s
  { component: IDOutro, duration: 210, name: "ID-Outro" },                    // 7s
];

// Total: ~65s at 30fps = 1950 frames

export const IDTutorial: React.FC = () => {
  let currentFrame = 0;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {SCENES.map((scene) => {
        const from = currentFrame;
        currentFrame += scene.duration;
        const Component = scene.component;

        return (
          <Sequence
            key={scene.name}
            from={from}
            durationInFrames={scene.duration}
            name={scene.name}
          >
            <Component />
          </Sequence>
        );
      })}
    </div>
  );
};
